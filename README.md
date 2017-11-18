# secure-webrtc-swarm

[![Greenkeeper badge](https://badges.greenkeeper.io/perguth/secure-webrtc-swarm.svg)](https://greenkeeper.io/)

> Create a swarm of p2p connections with invited peers using WebRTC.

This module allows you to securely create a (fully) meshed network of WebRTC connections. To do this a shared secret is used. The secret should be shared out of band eg. by passing it along in the hash portion of a link.

While connecting via WebRTC personal information like available IP addresses is exchanged via a remote WebSocket server. This creates the risk of information leakage and man-in-the-middle attacks. `secure-webrtc-swarm` encrypts this data stream using the shared secret. The shared secret is also used to authenticate incoming WebRTC connection requests.

## Install

```sh
npm install secure-webrtc-swarm
```

## Usage

```js
var Hub = require('signalhub')
var Swarm = require('secure-webrtc-swarm')
var wrtc = require('electron-webrtc')() // not needed in the browser

var hub1 = new Hub('myNamespace', ['https://signalhub.perguth.de:65300/'])
var hub2 = new Hub('myNamespace', ['https://signalhub.perguth.de:65300/'])

var key1 = Swarm.createKey() // default key length: 16
var key2 = Swarm.createKey()

var swarm1 = new Swarm(hub1, {
  keys: [key1, key2],
  wrtc // not needed in the browser
})
var swarm2 = new Swarm(hub2, {
  wrtc
})
swarm2.keys.push(key1)

swarm1.on('peer', function (peer, id) {
  console.log('connected to a new peer:', id)
  console.log('total peers:', swarm1.peers.length)
})
```

## API

This module shares the **same API as [`webrtc-swarm`](https://github.com/mafintosh/webrtc-swarm#api)** with the addition of:

### Swarm.createKey([length])

Creates a random string containg alphanumeric characters. Default length: 16

### swarm.keys

Contains the keys that are shared within the swarm. Only peers with at least one matching key connect to each other.

### swarm.sharedKeys

Contains learned information about which peer accepts which key.

## License

MIT
