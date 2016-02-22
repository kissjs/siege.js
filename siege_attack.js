var http = require('http')
  , https = require('https')
  , querystring = require('querystring')
  , util = require('util')
  , cookiejar = require('cookiejar')
  , CookieJar = cookiejar.CookieJar
  , out = process.stdout
  ;

// http://bluesock.org/~willg/dev/ansi.html

var HIDE_CURSOR = '\033[?25l'
var SHOW_CURSOR = '\033[?25h'
var CLEAR_SCREEN = '\033[2J'
var ERASE_LINE = '\033[K'
var RESET_STYLE = '\033[0m'

function clearScreen() {
  out.write(CLEAR_SCREEN)
}

function upLine(line) {
  out.write('\033[' + (line || 1) + 'A')
}

function gotoLine(line, col) {
  out.write('\033[' + (line | 0) + ';' + (col | 0) + 'H')
}

// 0-5
function background(r, g, b) {
  return '\033[48;5;' + rgb5(r, g, b) + 'm'
}

// 0-5
function forground(r, g, b) {
  var code = rgb5(r, g, b);
  return '\033[38;5;' + code + 'm'
}

/**
 * Translates a 255 RGB value to a 0-5 ANSI RGV value,
 * then returns the single ANSI color code to use.
 */

function rgb (r, g, b) {
  var red = r / 51 // /255 * 5
    , green = g / 51 // /255 * 5
    , blue = b / 51 // /255 * 5
  return rgb5(red, green, blue)
}

/**
 * Turns rgb 0-5 values into a single ANSI color code to use.
 */

function rgb5 (r, g, b) {
  var red = Math.round(r)
    , green = Math.round(g)
    , blue = Math.round(b)
  return 16 + (red*36) + (green*6) + blue
}

// red to green
gradeColors = [ 196, 202, 166, 172, 136, 142, 106, 112, 76, 46 ].map(function(color){
    return '\033[38;5;' + color + 'm'
})
// return grade color, big is better
function gradeColor(value, worst, best) {
  var score = (value - worst) / (best - worst)
  score = Math.min(Math.max(score, 0), 1)
  var index = Math.round(score * 9)
  return gradeColors[index]
}

module.exports = function(options, callback) {

  var taskIndex = 0
    , globalJar
    ;

  out.write('\n')

  if(options.enableCookie) {
    globalJar = new CookieJar()
    out.write('\033[38;5;46mEnable cookie\033[0m\n')
  }

  function nextTask() {

    var task = options.tasks[taskIndex ++]
    if(!task) {
      if(callback) callback()
      process.exit()
    }

    var enableCookie = task.enableCookie || (task.enableCookie === undefined && options.enableCookie)
    var jar = enableCookie && (globalJar || new CookieJar())
    var startTime = Date.now();
    var intervalStart = startTime;
    var intervalDone = 0;
    var running = 0;
    var done = 0;
    var concurrent = options.concurrent || 15;
    var repeat = task.repeat || options.repeat;
    var duration = task.duration || options.duration;
    if(!duration && !repeat) {
      duration = 10000
    }
    if (options.sslProtocol && options.sslProtocol === true) {
      concurrent = https.globalAgent.maxSockets = task.concurrent || options.concurrent || 15;
    } else {
      concurrent = http.globalAgent.maxSockets = task.concurrent || options.concurrent || 15;
    }

    var left = typeof repeat == 'undefined' ? Number.MAX_VALUE : repeat;

    var min = Number.MAX_VALUE
    var max = 0;
    var avg = 0;
    var rps = 0;
    var errorsCount = 0;
    var errors = {};
    var status = {};

    var sumTime = 0;

    var headers = options.headers || {}

    var requestOptions = {
      path: task.path
    , method: task.method
    , headers: headers
    }

    if(options.sockpath) {
      requestOptions.socketPath = options.sockpath
    } else {
      requestOptions.port = options.port
      if (options.host) {
        requestOptions.host = options.host
      }
      if (options.hostname) {
        requestOptions.hostname = options.hostname
      }
    }
    if (options.rejectUnauthorized) {
      requestOptions.rejectUnauthorized = options.rejectUnauthorized;
    }
    if (options.requestCert) {
      requestOptions.requestCert = options.requestCert;
    }
    if (options.agent) {
      requestOptions.agent = options.agent;
    }

    var cookieAccessInfo = cookiejar.CookieAccessInfo(requestOptions.host, requestOptions.path)

    function sendRequest() {
      if(running > concurrent || left <=0) return;
      if(running ++ < concurrent) process.nextTick(sendRequest);

      if(enableCookie) {
        headers['Cookie'] = jar.getCookies(cookieAccessInfo).map(function(cookie) {return cookie.toValueString()}).join(';')
      }

      // Add POST Headers for POST Requests
      if(requestOptions.method === 'POST' && task.body) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded'
        headers['Content-Length'] = querystring.stringify(task.body).length
      }

      var reqStartTime = Date.now();
      var req;

      // Add QueryString to URL for GET Requests with Parameters
      if(requestOptions.method === 'GET' && task.query) {
          // Reset query string if present
          var hasQuery = requestOptions.path.indexOf('?')
          if(hasQuery > 0) {
            requestOptions.path = requestOptions.path.substring(0,hasQuery)
          }
          requestOptions.path = requestOptions.path + "?" + querystring.stringify(task.query)
      }

      if (options.sslProtocol && options.sslProtocol === true) {
        req = https.request(requestOptions,handleRequest);
      } else {
        req = http.request(requestOptions,handleRequest);
      }

      function handleRequest(res) {

          if(enableCookie) {
            var cookies = res.headers['set-cookie']
            if(cookies) jar.setCookies(cookies)
          }

          res.on('end', function() {
              var resEndTime = Date.now();
              var elapsed = resEndTime - reqStartTime;
              if(elapsed < min) min = elapsed;
              if(elapsed > max) max = elapsed;
              sumTime += elapsed;
              intervalDone ++;
              done ++;
              status[res.statusCode] = (status[res.statusCode] || 0) + 1

              endRequest();
          })

          res.resume()

      }

      req.on('error', function(err){
          var data = errors[err.message];
          if(!data) {
            data = errors[err.message] = {
              message: err.message
            , stack: err.stack
            , count: 1
            }
            if(!firstTime) {
              upLine(5)
              out.write('\033[K\n\033[K\n\033[K\n\033[K\n\033[K\n')
              upLine(5)
            }
            console.log(err.stack)
            firstTime = true
          }
          data.count ++
          errorsCount ++
          endRequest()
      })


      // Add POST Body for POST requests
      if(requestOptions.method === 'POST' && task.body) {
          req.write(querystring.stringify(task.body));
      }

      req.end();

      function endRequest() {
        if(--left == 0) {
          endTask();
        }
        running --;
        process.nextTick(sendRequest);
      }
    }


    function updateTaskData() {
      var now = Date.now()
      avg = sumTime / done;
      rps = done * 1000 / (now - startTime)
      realtime_rps = intervalDone * 1000 / (now - intervalStart)
      intervalStart = now
      intervalDone = 0
      reportData()
    }

    var firstTime = true;
    function reportData(type) {
      switch(type) {
        case 'csv':
        out.write(util.format('\r%s:%s\t%s(done)\t%s(rps)\t%s(curr rps)\t%sms(min)\t%sms(max)\t%sms(avg)'
          , task.method
          , task.path
          , done
          , gradeColor(rps, 1000, 5000) + parseInt(rps) //+ RESET_STYLE
          , gradeColor(realtime_rps, 1000, 5000) + parseInt(realtime_rps)// + RESET_STYLE
          , gradeColor(min, 50, 10) + parseInt(min) //+ RESET_STYLE
          , gradeColor(max, 50, 10) + parseInt(max) //+ RESET_STYLE
          , gradeColor(avg, 50, 10) + parseInt(avg) //+ RESET_STYLE
        ));
        break
        default:
        if(!firstTime) {
          upLine(5)
        }
        out.write('\n\033[K' + task.method + ':' + task.path)
        if(task.enableCookie !== undefined) {
          out.write(enableCookie ? (forground(0, 5, 0) + ' with cookie') : (forground(5, 5, 0) + ' without cookie'))
          out.write(RESET_STYLE)
        }
        out.write('\n\033[K\tdone:' + done + (errorsCount ? ('\terrors:' + forground(5,0,0) + errorsCount + RESET_STYLE) : '' ))
        out.write('\n\033[K')
        Object.keys(status).forEach(function(code){
            var score
            if(code >= 500) {
              score = 0
            } else if(code >= 400) {
              score = 3
            } else if (code >= 300) {
              score = 8
            } else if (code >= 200) {
              score = 10
            } else {
              score = 7
            }
            if (options.sslProtocol && options.sslProtocol === true) {
              out.write('\t' + gradeColor(score, 0, 10) + code + RESET_STYLE + ' ' + https.STATUS_CODES[code] + ': ' + status[code])
            } else {
              out.write('\t' + gradeColor(score, 0, 10) + code + RESET_STYLE + ' ' + http.STATUS_CODES[code] + ': ' + status[code])
            }
        })
        out.write(
          util.format('\n\033[K\trps: %s\n\033[K\tresponse: %sms(min)\t%sms(max)\t%sms(avg)\033[K'
          , gradeColor(rps, 2000, 7000) +  parseInt(rps)  + RESET_STYLE
          , gradeColor(min, 50, 10) +  parseInt(min)  + RESET_STYLE
          , gradeColor(max, 50, 10) +  parseInt(max)  + RESET_STYLE
          , gradeColor(avg, 50, 10) +  parseInt(avg)  + RESET_STYLE
        ))
        out.write(HIDE_CURSOR)
      }
      firstTime = false
    }

    function endTask () {
      var ending = Date.now();
      left = 0;
      updateTaskData()
      console.log('')
      clearInterval(timer)
      if(timeout) clearTimeout(timeout)
      process.nextTick(nextTask)
    }

    var timer = setInterval(updateTaskData, 100);

    var timeout = duration && setTimeout(endTask, duration)

    sendRequest();

  }

  nextTask()

  function halt() {
    out.write(SHOW_CURSOR)
  }

  return {
    halt: halt
  }

}

