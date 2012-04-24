var http = require('http')
  , util = require('util')
  ;

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
      if(running > concurrent) return;

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

      if(running ++ < concurrent && left > 0) process.nextTick(sendRequest);
    }


    function updateTaskData() {
      var now = Date.now()
      avg = sumTime / done;
      rps = done * 1000 / (now - startTime)
      realtime_rps = intervalDone * 1000 / (now - intervalStart)
      intervalStart = now
      intervalDone = 0

      var out = process.stdout
      out.write(util.format('\r%s(done)\t%d(rps)\t%d(curr rps)\t%dms(min)\t%dms(max)\t%dms(avg)'
        , done
        , parseInt(rps)
        , parseInt(realtime_rps)
        , parseInt(min)
        , parseInt(max)
        , parseInt(avg)))
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

  }

  return {
    halt: halt
  }

}

