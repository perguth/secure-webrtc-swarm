var test = require('flip-tape')
var nacl = require('tweetnacl')
var swarm = require('.')
var server = require('signalhub/server')()
var signalhub = require('signalhub')
var wrtc = require('electron-webrtc')()

test.onFinish(function () {
  server.close()
  wrtc.close()
})

server.listen(9000, function () {
  'greet and close'.test(function (t) {
    t.plan(8)

    var key1 = nacl.box.keyPair()
    key1 = {
      secretKey: nacl.util.encodeBase64(key1.secretKey),
      publicKey: nacl.util.encodeBase64(key1.publicKey)
    }
    var key2 = nacl.box.keyPair()
    key2 = {
      secretKey: nacl.util.encodeBase64(key2.secretKey),
      publicKey: nacl.util.encodeBase64(key2.publicKey)
    }

    var invite = nacl.sign.keyPair()
    invite = {
      secretKey: nacl.util.encodeBase64(invite.secretKey),
      publicKey: nacl.util.encodeBase64(invite.publicKey)
    }

    var hub1 = signalhub('app', 'localhost:9000')
    var hub2 = signalhub('app', 'localhost:9000')

    var sw1 = swarm(hub1, key1, {
      issuedInvites: [invite.publicKey],
      wrtc
    })
    var sw2 = swarm(hub2, key2, {
      receivedInvites: {
        [key1.publicKey]: invite.secretKey
      },
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
