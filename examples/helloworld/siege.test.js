var siege = require('../../siege')

siege(__dirname + '/app.js')
  .host('localhost')
  .on(3000)
  .concurrent(100)
  .for(10000).times
  .get('/')
  .post('/', {name: "world"})
  .attack()
