var http = require('http');

var app = module.exports = function(req, res) {
  if(req.url == '/set-cookie') {
    res.writeHead(200, {
        'Set-Cookie': 'test.id=test.value'
    })
    res.end()
  } else {
    res.end('' + req.headers['cookie'])
  }
}

if(!module.parent) {
  http.createServer(app).listen(3000)
}
