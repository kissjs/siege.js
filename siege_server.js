var http = require('http')
  , path = require('path')
  , program = require('commander')

// jade options

var options = {};

// options

program
  .version('0.0.1')
  .usage('[options] [dir|file ...]')
  .option('-p, --port <str>', 'filename used to resolve includes')

program.on('--help', function(){
  console.log('');
});

program.parse(process.argv);

var APP = program.args[0]
var PORT = program.port
console.log('starting siege_server %s', APP)

if(!APP || !PORT) throw new Error('node siege_server.js --port port app.js')

var app = require(APP)

if(!app) throw new Error('app not found, ' + APP)

console.log('try to listen at %s', PORT);
http.createServer(app).listen(PORT)
console.log('server listen at %s', PORT)
