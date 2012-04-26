var siege = require('../../siege')

siege('app.js')
  .on(4000)
  .concurrent(100)
  .for(10000).times
  .get('/')
  .post('/')
  .attack()
