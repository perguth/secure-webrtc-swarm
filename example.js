/* To run this locally do eg.:
```sh
npm install wzrd signalhub
signalhub listen -h localhost -p 7000
wzrd example.js -- -d
# now open http://localhost:9966
``` */
var signalhub = require('signalhub')
var swarm = require('./index.js')
window.localStorage.debug = 'secure-webrtc-swarm'

var sw, keyPair, opts
var hash = window.location.hash

var hub = signalhub('secure-swarm-example', ['http://localhost:7000'])

if (!hash || hash === '#a') {
  html('<h1>I am peer #<b>a</b></h1>')
  html('<a href=#b target=_blank>open tab for peer #b</a><br>')

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

if (hash === '#b') {
  html('<h1>I am peer #<b>b</b></h1>')

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
sw.on('accept', function (peer, sharedSignPubKey) {
  html('peer accepted invite')
})

function html (html) { document.body.innerHTML += '<br>' + html }

window.sw = sw
