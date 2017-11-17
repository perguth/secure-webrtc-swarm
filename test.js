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

server.listen(9000, function () {
  'connect using key discovery'.test(function (t) {
    t.plan(8)
    var hub1 = new Hub('test', 'localhost:9000')
    var hub2 = new Hub('test', 'localhost:9000')
    var secret1 = Swarm.createSecret()
    var secret2 = Swarm.createSecret()

    var swarm1 = new Swarm(hub1, {
      secrets: [secret1, secret2],
      wrtc
    })
    var swarm2 = new Swarm(hub2, {
      secret: secret1,
      wrtc
    })

    greetAndClose(swarm1, swarm2)
  })

  'connect using a automatically created secret'.test(function (t) {
    t.plan(8)
    var hub1 = new Hub('test', 'localhost:9000')
    var hub2 = new Hub('test', 'localhost:9000')

    var swarm1 = new Swarm(hub1, {
      wrtc
    })
    var swarm2 = new Swarm(hub2, {
      secret: swarm1.secret,
      wrtc
    })

    greetAndClose(swarm1, swarm2)
  })

  'connect using a manually created secret'.test(function (t) {
    t.plan(8)
    var hub1 = new Hub('test', 'localhost:9000')
    var hub2 = new Hub('test', 'localhost:9000')
    var secret = Swarm.createSecret()

    var swarm1 = new Swarm(hub1, {
      secret,
      wrtc
    })
    var swarm2 = new Swarm(hub2, {
      secret,
      wrtc
    })

    greetAndClose(swarm1, swarm2)
  })

  'connect using key from after instantiation'.test(function (t) {
    t.plan(8)
    var hub1 = new Hub('test', 'localhost:9000')
    var hub2 = new Hub('test', 'localhost:9000')
    var secret = Swarm.createSecret()

    var swarm1 = new Swarm(hub1, {
      secrets: [secret],
      wrtc
    })
    var swarm2 = new Swarm(hub2, {
      wrtc
    })

    setTimeout(x => {
      swarm2.secrets.push(swarm1.secrets[0])
      greetAndClose(swarm1, swarm2)
    }, 300)
  })

  'attach shared secret to `simple-peer` instance'.test(function (t) {
    t.plan(1)

    var hub1 = new Hub('test', 'localhost:9000')
    var hub2 = new Hub('test', 'localhost:9000')
    var secrets = [Swarm.createSecret()]

    var swarm1 = new Swarm(hub1, {
      secrets,
      wrtc
    })
    var swarm2 = new Swarm(hub2, {
      secrets,
      wrtc
    })

    swarm1.on('peer', peer => {
      t.equal(peer.sharedSecret, secrets[0])
      peer.destroy()
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
