var http = require('http');
var Cookie = require('cookiejar').Cookie;

var app = module.exports = function(req, res) {
  if(req.url == '/set-cookie') {

    res.writeHead(200, {
        'Set-Cookie': 'test.id=test.value'
    })
    res.end()
  } else {

    // validate cookie
    res.end('' + req.headers['cookie'])
  }
}

if(!module.parent) {
  http.createServer(app).listen(3000)
}
