var http = require('http')
  , util = require('util')
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

  function nextTask() {

    var task = options.tasks[taskIndex ++]
    if(!task) {
      if(callback) callback()
      process.exit()
    }

    var startTime = Date.now();
    var intervalStart = startTime;
    var intervalDone = 0;
    var running = 0;
    var concurrent = task.concurrent || options.concurrent || 15;
    var done = 0;
    var repeat = task.repeat || options.repeat;
    var duration = task.duration || options.duration;
    if(!duration && !repeat) {
      duration = 10000
    }

    var left = typeof repeat == 'undefined' ? Number.MAX_VALUE : repeat;

    var min = Number.MAX_VALUE
    var max = 0;
    var avg = 0;
    var rps = 0;
    var errors = 0;
    var status = {};

    var sumTime = 0;

    var requestOptions = {
      url: task.url
    , method: task.method
    }

    if(options.sockpath) {
      requestOptions.socketPath = options.sockpath
    } else {
      requestOptions.port = options.port
      requestOptions.host = options.host || '127.0.0.1'
    }

    function sendRequest() {
      if(running > concurrent || left <=0) return;
      if(running ++ < concurrent) process.nextTick(sendRequest);

      var reqStartTime = Date.now();

      var req = http.request(requestOptions, function(res) {

          res.on('data', function(data) {
          })

          res.on('end', function() {
              var resEndTime = Date.now();
              var elapsed = resEndTime - reqStartTime;
              if(elapsed < min) min = elapsed;
              if(elapsed > max) max = elapsed;
              sumTime += elapsed;
              intervalDone ++;
              done ++;

              if(--left == 0) {
                endTask();
              }
              running --;
              process.nextTick(sendRequest);
          })

      });

      req.on('error', function(err){
          console.log(err.stack)
      })

      req.end();
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
          , task.url
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
          upLine(4)
        }
        out.write(
          util.format('\n\033[K%s:%s\n\033[K\tdone: %s\n\033[K\trps: %s\n\033[K\tresponse: %sms(min)\t%sms(max)\t%sms(avg)\033[K'
          , task.method
          , task.url
          , done
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

