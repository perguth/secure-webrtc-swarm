# secure-webrtc-swarm

[![Greenkeeper badge](https://badges.greenkeeper.io/perguth/secure-webrtc-swarm.svg)](https://greenkeeper.io/)

> Create a swarm of p2p connections with invited peers using WebRTC.

Usually when connecting multiple peers via WebRTC personal information like available IP addresses are exchanged via a central WebSocket server. This means that there is the risk of information leakage and man-in-the-middle attacks. `secure-webrtc-swarm` encrypts this data stream using a word mnemonic like `scale-world-peace`.

This word mnemonic should be shared out of band eg. by passing it along in the hash portion of a link (see eg. [Peertransfer](https://github.com/perguth/peertransfer/)).

## Install

```sh
npm install secure-webrtc-swarm
```

## Usage

```js
var Hub = require('signalhub')
var Swarm = require('secure-webrtc-swarm')
var wrtc = require('electron-webrtc')() // not needed in the browser

var hub1 = Hub('myNamespace', ['https://signalhub.perguth.de:65300/'])
var hub2 = Hub('myNamespace', ['https://signalhub.perguth.de:65300/'])

var mnemonic = Swarm.createMnemonic(3) // default: 3
// eg. mnemonic ==='scale-world-peace'

var swarm1 = new Swarm(hub1, {
  mnemonic,
  wrtc // not needed in the browser
})
new Swarm(hub2, {
  mnemonic,
  wrtc
})

swarm1.on('peer', function (peer, id) {
  console.log('connected to a new peer:', id)
  console.log('total peers:', swarm1.peers.length)
})
```

## License

MIT
