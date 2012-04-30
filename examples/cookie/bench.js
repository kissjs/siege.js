var siege = require('../../siege')

siege(__dirname + '/app.js')
  .on(4000)
  .withCookie
  .for(10000).times
  .concurrent(100)
  .get('/set-cookie')
  .get('/get-cookie')
  .get('/').withoutCookie
  .attack()
