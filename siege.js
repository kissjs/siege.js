var util = require('util')
  , child_process = require('child_process')
  , http = require('http')
  , path = require('path')
  , fs = require('fs')
  , siege_attack = require('./siege_attack')
  , __slice = Array.prototype.slice
  ;

var Siege = function(path, options) {
  if(!options) {
    if(typeof path == 'object') {
      options = path
      path = undefined
    } else {
      options = {}
    }
  }

  if(path) {
    options.serve = path
  }

  options.tasks = []

  this.tasks = []
  this.options = options
  this.current_task = null

  var self = this
  this.__defineGetter__('withCookie', function() {
      self.options.enableCookie = true
      return self
  })

  this.__defineGetter__('with304', function() {
      self.options.enable304 = true
      return self
  })

  this.__defineGetter__('withoutCookie', function() {
      self.options.enableCookie = false
      return self
  })

  this.__defineGetter__('without304', function() {
      self.options.enable304 = false
      return self
  })
}

var siege = Siege.prototype

siege.on = function(port) {
  if(/\d+/.test(port))
    this.options.port = port
  else
    this.options.sockpath = port
  return this
}

siege.host = function(host) {
  this.options.host = host
  return this
}

siege.concurrent = function(concurrent) {
  this.options.concurrent = concurrent
  return this
}

siege.describe = function(description) {
  var task = this.current_task
  if(!task || task.options.description) {
    task = this._newtask()
  }
  task.options.description = description
  return task
}

siege._newtask = function() {
  var task = new Task(this)
  this.tasks.push(task)
  this.current_task = task
  return task
}

siege.request = function(options) {
  var task = this.current_task
  if(!task || task.options.method) {
    task = this._newtask()
  }
  task.request(options)
  return task
}

siege.get = function(url, query) {
  return this.request({
      // FIXME
      path: url
    , method: 'GET'
    , query: query
  })
}

siege.post = function(url, body) {
  return this.request({
      url: url
    , method: 'POST'
    , body: body
  })
}

siege.for = function(num) {
  return new For(this, num)
}

siege.report = function(options) {
  this.options.report = options
  return this
}

siege.attack = function() {
  var options = this.options
  this.tasks.forEach(function(task){
      options.tasks.push(task.options)
  })
  if(!options.port && !options.sockpath) {
    options.sockpath = '/tmp/siege.sock'
  }
  startSiege(this.options)
}

function SiegeWrap(siege) {
  this.siege = siege
}

var wrap = SiegeWrap.prototype

// default wrap
;['request', 'get', 'post', 'attack', 'describe'].forEach(function(name){
  if(name[0] != '_') wrap[name] = function() {
    var args = __slice.call(arguments)
    return siege[name].apply(this.siege, args)
  }
})

function Task(siege) {
  this.siege = siege
  this.options = {}
  var self = this

  this.__defineGetter__('withCookie', function() {
      self.options.enableCookie = true
      return self
  })

  this.__defineGetter__('with304', function() {
      self.options.enable304 = true
      return self
  })

  this.__defineGetter__('withoutCookie', function() {
      self.options.enableCookie = false
      return self
  })

  this.__defineGetter__('without304', function() {
      self.options.enable304 = false
      return self
  })
}

util.inherits(Task, SiegeWrap)

var task = Task.prototype

task.for = function(num) {
  return new For(this, num)
}

task.request = function(options) {
  options.method = options.method || 'GET'
  merge(this.options, options)
}

task.concurrent = function(concurrent) {
  this.options.concurrent = concurrent
  return this
}

/**
 * options
 *    rps : true
 *    status: true
 *    timeout: true
 *    responseTime: ['max', 'min', 'max', 'most']
 *    weight: true
 *    graph: {
 *      dot: /path/to/dot.png
 *      line: /path/to/line.png // timebase
 *      c2mem: /path/to/c2mem.png // concurrent to memoryUsage
 *    }
 *    type: json | plain | color
 *
 */
task.report = function(options) {
  this.options.report = options
}

function For(main, num) {

  this.__defineGetter__('seconds', function() {
      main.options.duration = num * 1000
      return main
  })

  this.__defineGetter__('times', function() {
      main.options.repeat = num
      return main
  })

}

function merge(target, source) {
  for(var name in source) {
    target[name] = source[name]
  }
}


function startSiege(options) {
  startServe(options, function(child){
      options.taskIndex = -1
      var attack = siege_attack(options, endProgram)

      function endProgram(){
        if(child) child.kill()
        attack.halt()
        process.exit()
      }

      process.on('SIGINT', endProgram)

      process.on('uncaughtException', function(err) {
          console.log(err.stack)
          endProgram()
      })

  })
}

function startServe(options, callback) {
  var serve = options.serve;
  if(!serve) return callback();

  var cmd = serve
  var args = []
  try{
    require(serve)
    cmd = '/usr/local/bin/node'
    args = [__dirname + '/siege_server.js', '--port', options.sockpath || options.port || '/tmp/siege.sock', serve]
  } catch(e){
  }
  var child = child_process.spawn(cmd, args)
  var log = path.join(process.cwd(), options.serverlog || 'server.log')
  var errlog = path.join(process.cwd(), options.servererrlog || 'server.error.log')
  // child.stdout.pipe(fs.createWriteStream(log))
  // child.stderr.pipe(fs.createWriteStream(errlog))
  child.stdout.pipe(process.stdout)
  child.stderr.pipe(process.stderr)

  setTimeout(callback, 100, child);
}

var exports = module.exports = function(path, options) {
  return new Siege(path, options)
}
