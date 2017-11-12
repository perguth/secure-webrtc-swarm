# secure-webrtc-swarm

[![Greenkeeper badge](https://badges.greenkeeper.io/perguth/secure-webrtc-swarm.svg)](https://greenkeeper.io/)

> Create a swarm of p2p connections with invited peers using WebRTC.

This module allows you to easily create a fully meshed network of WebRTC connections. To do this a shared secret is used. The secret should be shared out of band eg. by passing it along in the hash portion of a link.

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

var secret = Swarm.createSecret() // default: 16

var swarm1 = new Swarm(hub1, {
  secret,
  wrtc // not needed in the browser
})
new Swarm(hub2, {
  secret,
  wrtc
})

swarm1.on('peer', function (peer, id) {
  console.log('connected to a new peer:', id)
  console.log('total peers:', swarm1.peers.length)
})
```

## API

For the most part `secure-webrtc-swarm` shares the same API as [`webrtc-swarm`](https://github.com/mafintosh/webrtc-swarm#api).

### Swarm.createSecret(length)

Creates a random string containg alphanumeric characters.

### swarm.secret

Contains the secret that is shared by the swarm.

## License

MIT
