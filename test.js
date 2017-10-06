var server = require('signalhub/server')()
var signalhub = require('signalhub')
var swarm = require('.')
var test = require('flip-tape')
var wrtc = require('electron-webrtc')()
var nacl = require('tweetnacl')

test.onFinish(function () {
  server.close()
  wrtc.close()
})

server.listen(9000, function () {
  // 'greet and close using a shared secret'.test(function (t) {
  //   t.plan(8)
  //
  //   var hub1 = signalhub('app', 'localhost:9000')
  //   var hub2 = signalhub('app', 'localhost:9000')
  //
  //   var sharedSecret = swarm.createSecret()
  //
  //   var sw1 = swarm(hub1, {
  //     sharedSecret,
  //     wrtc
  //   })
  //   var sw2 = swarm(hub2, {
  //     sharedSecret,
  //     wrtc
  //   })
  //
  //   var greeting = 'hello'
  //   var goodbye = 'goodbye'
  //
  //   var peerIds = {}
  //
  //   sw1.on('peer', function (peer, id) {
  //     'connected to peer from sw2'.pass()
  //     peerIds.sw2 = id
  //     peer.send(greeting)
  //     peer.on('data', function (data) {
  //       'goodbye received'.equal(data.toString(), goodbye)
  //       sw1.close(function () {
  //         'swarm sw1 closed'.pass()
  //       })
  //     })
  //   })
  //
  //   sw2.on('peer', function (peer, id) {
  //     'connected to peer from sw1'.pass()
  //     peerIds.sw1 = id
  //     peer.on('data', function (data) {
  //       'greeting received'.equal(data.toString(), greeting)
  //       peer.send(goodbye)
  //       sw2.close(function () {
  //         'swarm sw2 closed'.pass()
  //       })
  //     })
  //   })
  //
  //   sw1.on('disconnect', function (peer, id) {
  //     if (id === peerIds.sw2) {
  //       'connection to peer from sw2 lost'.pass()
  //     }
  //   })
  //
  //   sw2.on('disconnect', function (peer, id) {
  //     if (id === peerIds.sw1) {
  //       'connection to peer from sw1 lost'.pass()
  //     }
  //   })
  // })
  //
  // 'clean up'.test(function (t) {
  //   server.close()
  //   wrtc.close()
  //   t.end()
  // })

  'greet and close using invites'.test(function (t) {
    t.plan(8)

    var hub1 = signalhub('app', 'localhost:9000')
    var hub2 = signalhub('app', 'localhost:9000')

    // var sw1 = swarm(hub1, {wrtc})
    // var sw2 = swarm(hub2, {wrtc})

    // var invite = sw1.createInvite()
    // sw2.receiveInvite(invite)

    var invite = nacl.sign.keyPair()
    invite = {
      secretKey: nacl.util.encodeBase64(invite.secretKey),
      publicKey: nacl.util.encodeBase64(invite.publicKey)
    }

    var sw1 = swarm(hub1, {
      issuedInvites: [invite.publicKey],
      wrtc
    })
    var sw2 = swarm(hub2, {
      receivedInvites: {
        [sw1.pubKey]: invite.secretKey
      },
      wrtc
    })
    console.log('issuedInvites', [invite.publicKey])
    console.log('receivedInvites', {
      [sw1.pubKey]: invite.secretKey
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
