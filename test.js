var server = require('signalhub/server')()
var signalhub = require('signalhub')
var swarm = require('.')
var test = require('flip-tape')
var wrtc = require('electron-webrtc')()

test.onFinish(function () {
  server.close()
  wrtc.close()
})

server.listen(9000, function () {
  'greet and close using a shared secret'.test(function (t) {
    t.plan(8)

    var hub1 = signalhub('app', 'localhost:9000')
    var hub2 = signalhub('app', 'localhost:9000')

    var sharedSecret = swarm.createSecret()

    var sw1 = swarm(hub1, {
      // issuedInvites: [invite.publicKey],
      sharedSecret,
      wrtc
    })
    var sw2 = swarm(hub2, {
      // receivedInvites: {
      //   [key1.publicKey]: invite.secretKey
      // },
      sharedSecret,
      wrtc
    })

    var greeting = 'hello'
    var goodbye = 'goodbye'

    var peerIds = {}

    sw1.on('peer', function (peer, id) {
      'connected to peer from sw2'.pass()
      peerIds.sw2 = id
      peer.send(greeting)
      peer.on('data', function (data) {
        'goodbye received'.equal(data.toString(), goodbye)
        sw1.close(function () {
          'swarm sw1 closed'.pass()
        })
      })
    })

    sw2.on('peer', function (peer, id) {
      'connected to peer from sw1'.pass()
      peerIds.sw1 = id
      peer.on('data', function (data) {
        'greeting received'.equal(data.toString(), greeting)
        peer.send(goodbye)
        sw2.close(function () {
          'swarm sw2 closed'.pass()
        })
      })
    })

    sw1.on('disconnect', function (peer, id) {
      if (id === peerIds.sw2) {
        'connection to peer from sw2 lost'.pass()
      }
    })

    sw2.on('disconnect', function (peer, id) {
      if (id === peerIds.sw1) {
        'connection to peer from sw1 lost'.pass()
      }
    })
  })
})
