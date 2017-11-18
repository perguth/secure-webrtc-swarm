var Hub = require('signalhub')
var Server = require('signalhub/server')
var Swarm = require('.')
var test = require('flip-tape')
var wrtc = require('electron-webrtc')()
var server = new Server()

test.onFinish(function () {
  server.close()
  wrtc.close()
})
process.on('SIGINT', function () {
  server.close()
  wrtc.close()
  process.exit(1)
})

server.listen(9000, function () {
  'connect using key from after instantiation'.test(function (t) {
    t.plan(8)
    var hub1 = new Hub('test', 'localhost:9000')
    var hub2 = new Hub('test', 'localhost:9000')
    var key = Swarm.createKey()

    var swarm1 = new Swarm(hub1, {
      keys: [key],
      wrtc
    })
    var swarm2 = new Swarm(hub2, {
      wrtc
    })
    greetAndClose(swarm1, swarm2)

    setTimeout(x => {
      t.comment('Attaching shared key')
      swarm2.keys.push(swarm1.keys[0])
    }, 1000) // allow for a couple of failed tries
  })

  'connect using key discovery'.test(function (t) {
    t.plan(8)
    var hub1 = new Hub('test', 'localhost:9000')
    var hub2 = new Hub('test', 'localhost:9000')
    var key1 = Swarm.createKey()
    var key2 = Swarm.createKey()

    var swarm1 = new Swarm(hub1, {
      keys: [key1, key2],
      wrtc
    })
    var swarm2 = new Swarm(hub2, {
      keys: [key1],
      wrtc
    })

    greetAndClose(swarm1, swarm2)
  })

  'connect using a automatically created key'.test(function (t) {
    t.plan(8)
    var hub1 = new Hub('test', 'localhost:9000')
    var hub2 = new Hub('test', 'localhost:9000')

    var swarm1 = new Swarm(hub1, {
      wrtc
    })
    var swarm2 = new Swarm(hub2, {
      keys: [swarm1.keys[0]],
      wrtc
    })

    greetAndClose(swarm1, swarm2)
  })

  'connect using a manually created key'.test(function (t) {
    t.plan(8)
    var hub1 = new Hub('test', 'localhost:9000')
    var hub2 = new Hub('test', 'localhost:9000')
    var key = Swarm.createKey()

    var swarm1 = new Swarm(hub1, {
      keys: [key],
      wrtc
    })
    var swarm2 = new Swarm(hub2, {
      keys: [key],
      wrtc
    })

    greetAndClose(swarm1, swarm2)
  })

  'attach shared key to `simple-peer` instance'.test(function (t) {
    t.plan(1)

    var hub1 = new Hub('test', 'localhost:9000')
    var hub2 = new Hub('test', 'localhost:9000')
    var keys = [Swarm.createKey()]

    var swarm1 = new Swarm(hub1, {
      keys,
      wrtc
    })
    var swarm2 = new Swarm(hub2, {
      keys,
      wrtc
    })

    swarm1.on('peer', peer => {
      t.equal(peer.sharedKey, keys[0])
      swarm1.close()
      swarm2.close()
    })
  })
})

function greetAndClose (swarm1, swarm2) {
  // includes 8 tests
  var hello = 'hello'
  var goodbye = 'goodbye'

  var peerIds = {}

  swarm1.on('peer', function (peer, id) {
    'connected to peer from swarm2'.pass()
    peerIds.swarm2 = id
    peer.send(hello)
    peer.on('data', function (data) {
      'goodbye received'.equal(data.toString(), goodbye)
      swarm1.close(function () {
        'swarm1 closed'.pass()
      })
    })
  })

  swarm2.on('peer', function (peer, id) {
    'connected to peer from swarm1'.pass()
    peerIds.swarm1 = id
    peer.on('data', function (data) {
      'hello received'.equal(data.toString(), hello)
      peer.send(goodbye)
      swarm2.close(function () {
        'swarm2 closed'.pass()
      })
    })
  })

  swarm1.on('disconnect', function (peer, id) {
    if (id === peerIds.swarm2) {
      'connection to peer from swarm2 lost'.pass()
    }
  })

  swarm2.on('disconnect', function (peer, id) {
    if (id === peerIds.swarm1) {
      'connection to peer from swarm1 lost'.pass()
    }
  })
}
