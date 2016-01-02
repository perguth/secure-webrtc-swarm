/* To run this locally do eg.:
```sh
npm install wzrd signalhub
signalhub listen -h localhost -p 7000
wzrd example.js -- -d
# now open http://localhost:9966
``` */
var signalhub = require('signalhub')
var swarm = require('./index.js')
// uncomment to see debugging information:
// window.localStorage.debug = 'secure-webrtc-swarm'

var hub = signalhub('swarm-example', ['http://localhost:7000'])

var instance = window.location.hash
var html = function (html) { document.body.innerHTML += '<br>' + html }
var sw, keyPair, opts

if (!instance) {
  html('I am peer #a - <a href=#b target=_blank>open tab for peer #b</a><br>')
  keyPair = {
    publicKey: 'HQpECMWIUaOIvdTLzmvfFN1CZMSFWAOmJ1pCEYCr5zA=',
    secretKey: '4oDfzsyer+vZg/SouHNiYov+OqzlcJoa1WNO+Zu+K+o='
  }
  opts = {
    issuedInvites: [
      '447aTPffUY0o9YKYGq9iHlooC9R4y2hCSv93b1/duIE=' // <- signPubKey(AB)
    ]
  }
  sw = swarm(hub, keyPair, opts)
}

if (instance === '#b') {
  html('I am peer #b')
  keyPair = {
    publicKey: 'wEXhh5BleF626PHXURkRxMD4jlBO9ohkuGVCPb9AaFU=',
    secretKey: 'V6j8zDQOZlRV/HtSNWxel708fe0IHXJWsvhAtgNwSeU='
  }
  opts = {
    receivedInvites: {
      'HQpECMWIUaOIvdTLzmvfFN1CZMSFWAOmJ1pCEYCr5zA=': // <- pubKey(A)
        'upA4zHBTedolBKZ6f5TRe+TZcSfPAW1KVfUB2xFjNmDjjtpM999RjSj1gpgar2IeWigL1HjLaEJK/3dvX924gQ==' // <- signPrivKey(AB)
    }
  }
  sw = swarm(hub, keyPair, opts)
}

sw.on('peer', function (peer, id) {
  html('connected to a new peer: ' + id)
  html('total peers: ' + sw.peers.length)
})
