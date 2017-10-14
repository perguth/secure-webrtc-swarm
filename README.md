# secure-webrtc-swarm

> Create a swarm of p2p connections with invited peers using WebRTC.

Usually when connecting multiple peers via WebRTC personal information like available IP addresses are exchanged via a central WebSocket server. This means that there is the risk of information leakage and man-in-the-middle attacks. `secure-webrtc-swarm` encrypts this data stream using a word mnemonic like `scale-world-peace`.

This word mnemonic should be shared out of band eg. by passing it along in the hash portion of a link (see eg. [Peertransfer](https://github.com/perguth/peertransfer/)).

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
