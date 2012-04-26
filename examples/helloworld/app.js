function app(req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello World\n');
}

if(!module.parent) {
  require('http').createServer(app).listen(3000)
} else {
  module.exports = app
}
