# secure-webrtc-swarm

> Create a swarm of p2p connections with invited peers using WebRTC.

When connecting multiple peers via [webrtc-swarm](https://github.com/mafintosh/webrtc-swarm) personal information like available IP addresses are exchanged via a central thin server. This means there is the risk of information leakage and man-in-the-middle attacks. `secure-webrtc-swarm` encrypts this data stream using a word mnemonic like `scale-world-peace`.

## Install

```sh
npm install secure-webrtc-swarm
```

## Usage

```js
var signalhub = require('signalhub')
var swarm = require('secure-webrtc-swarm')
var wrtc = require('electron-webrtc')()

var hub1 = signalhub('appName', ['https://signalhub.perguth.de:65300/'])
var hub2 = signalhub('appName', ['https://signalhub.perguth.de:65300/'])

var mnemonic = swarm.createMnemonic() // eg. 'scale-world-peace'

var sw1 = swarm(hub1, {
  mnemonic,
  wrtc // not needed in the browser
})
var sw2 = swarm(hub2, {
  mnemonic,
  wrtc // not needed in the browser
})

sw1.on('peer', function (peer, id) {
  console.log('connected to a new peer:', id)
  console.log('total peers:', sw.peers.length)
})
```

## License

MIT
