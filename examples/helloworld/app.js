var querystring = require('querystring');
function app(req, res) {
  post = "";
  req.on('data', function(data) {
    post += data;
  });
  
  req.on('end', function() {
    if(req.method === 'GET') {
      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.end('Hello World\n');
    } else if(req.method === 'POST') {
      response = "Hello";
      name = " ";
      if(post.length > 0) {
        name += querystring.parse(post).name;
	res.writeHead(200, {'Content-Type': 'text/plain'});
      } else {
        res.writeHead(400, {'Content-Type': 'text/plain'});
      }
      res.end(response + name + "\n");
    }
  });
}

if(!module.parent) {
  require('http').createServer(app).listen(3000)
} else {
  module.exports = app
}
