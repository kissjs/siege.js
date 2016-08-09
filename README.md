siege.js
========

![sigetest](http://guileen.github.io/img/siege.js/siegetest.gif)

# install
```
npm install siege --save
```

http benchmark

    siege()
      .on(3000)
      .for(10000).times
      .get('/')
      .attack()

save as `benchmark.js` and run

    node benchmark.js

## Use siege start/stop service

`siege(cmd)` can start service before benchmark, stop service after benchmark, for agile development.

    siege('node /path/to/app.js')
      .on(3000)
      .get('/')
      .attack()

You can also use `siege('/path/to/app.js')` to benchmark http handler of nodejs, `require('app.js')` must return a `function(req, res)`.

    siege(__dirname + '/app.js')
      .on(3000)
      .get('/')
      .attack()

Code above will start server listen at port 3000, benchmark module will connect to 3000. You can ignore `.on(3000)`, default is `.on('/tmp/siege.sock')`

Server maybe need a little while to prepare, use `.wait(ms)` let benchmark wait a moment to do benchmark.

    siege(__dirname + '/app.js')
      .wait(1000)
      .get('/')
      .attack()

## Define task

Use `method(url, params)` to define task, you can define multiple tasks, this will help you figure out which page is slow on your site.

    siege()
      .get('/')
      .post('/hello', {hello: 'world'})
      .attack()

Tasks will execute as define order one by one.

## Repeat times and duration

Use `.for(n).times` define repeate times, use `for(n).seconds` define duration, you can use on siege for all tasks,
or use it on single task.

    siege()
      .for(10000).times
      .get('/').for(2).seconds
      .get('/about').for(3000).times
      .get('/contact')
      .attack()

Code above, `/` will do benchmark for 2 seconds, `/about` will do for 3000 times, `/contact` will do for 10000 times.

## Concurrent

Use `.concurrent(n)` to control concurrent request. default is 15

    siege()
      .concurrent(100)
      .get('/')
      .attack()

## Cookie

Use `.withCookie` to enable cookie jar, so you can benchmark a page that requires login.

    siege()
      .withCookie
      .post('/login', {user: pass}).for(1).times
      .get('/')
      .attack()

## Start siege attack

Use `.attack()` to start siege attack.

## Multiple app

In theory Siege can benchmark multiple apps in a single script.

    siege('app1.js')
      .get('/')
      .attack()

    siege('app2.js')
      .get('/')
      .attack()

But for unknown reasons, after the first app is done, the second app will quit. You have two options,

1. Don't use this feature
2. send a pull request

## More features and improved reporting

Siege is open to adding more features. In particular, help is sought for improving the reporting interface. Also, we have `with304` options, but it is not implemented.



Everybody is welcome to send a pull request.
