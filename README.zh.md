siege.js
========

攻城!! http压力测试.

    siege()
      .on(3000)
      .for(10000).times
      .get('/')
      .attack()

save as `benchmark.js` and run

    node benchmark.js
      
## 使用siege启动/关闭服务

`siege(cmd)` 可以在开始测试前启动服务, 在测试结束后关闭服务, 传说中的敏捷开发.

    siege('node /path/to/app.js')
      .on(3000)
      .get('/')
      .attack()
      
也可以使用 `siege('/path/to/app.js')` 来测试 nodejs 的 http handler, `require('app.js')` 必须是一个 `function(req, res)` 函数.

    siege(__dirname + '/app.js')
      .on(3000)
      .get('/')
      .attack()
      
上面的代码将监听3000端口, 压测模块也会自动连接3000端口. 也可以省略 `.on(3000)`, 等价于 `.on('/tmp/siege.sock')`

在启动服务之后, 可能需要一些准备的时间, 使用`.wait(ms)`让压测模块等待一段时间后开始压测.

    siege(__dirname + '/app.js')
      .wait(1000)
      .get('/')
      .attack()
      
## 任务的定义

使用 `method(url, params)` 来定义任务, 可以定义多个任务, 方便全面了解不同controller的响应速度.

    siege()
      .get('/')
      .post('/hello', {hello: 'world'})
      .attack()
      
任务将按定义的顺序逐个执行.
      
## 压测时间和次数控制

使用 `.for(n).times` 来控制次数, 使用 `for(n).seconds`来控制时间, 此参数可以加在siege对象上作用于所有任务, 
也可以加在每个任务上对任务单独控制.

    siege()
      .for(10000).times
      .get('/').for(2).seconds
      .get('/about').for(3000).times
      .get('/contact')
      .attack()
      
上述代码, `/` 将执行2秒, `/about` 将执行3000次, `/contact` 将执行10000次.

## 并发数控制

使用 `.concurrent(n)` 来控制并发数量. 默认 15

    siege()
      .concurrent(100)
      .get('/')
      .attack()

## Cookie

使用 `.withCookie` 来开启cookie

    siege()
      .withCookie
      .post('/login', {user: pass}).for(1).times
      .get('/')
      .attack()

## 开始攻城

使用 `.attack()` 下达攻城命令.

## 测试多个 app

理论上 siege 可以对多个 app 进行测试

    siege('app1.js')
      .get('/')
      .attack()
      
    siege('app2.js')
      .get('/')
      .attack()
      
但目前由于不明原因, 第一个app测试结束后, 第二个app直接退出. 目前有两个选择, 

1. 不使用此功能
2. send a pull request

## 更多功能和报告?

siege 将根据实际需要增加新功能, 如`with304` 已在计划之中, 但尚不确定何时加入.

siege 有输出测试报告的计划, 该功能也尚未实现.

欢迎 send pull request.