# secure-webrtc-swarm

[![Greenkeeper badge](https://badges.greenkeeper.io/pguth/secure-webrtc-swarm.svg)](https://greenkeeper.io/)

> A wrapper around [webrtc-swarm](https://github.com/mafintosh/webrtc-swarm) that adds peer whitelisting and authenticated asymmetric encryption of the WebRTC signaling data using [TweetNaCl.js](https://github.com/dchest/tweetnacl-js
) (see [algorithm.md](algorithm.md)).

When connecting multiple peers via [webrtc-swarm](https://github.com/mafintosh/webrtc-swarm) personal information like available IP addresses are exchanged via a central thin server. `secure-webrtc-swarm` completely encrypts this data stream and prevents in-transit manipulation by signing data packages.

To achieve this additional data must be exchanged between the peers out-of-band before the connection initiation can happen. In the simplest case, this could be a shared secret or more granular an invite-acceptance procedure.

## Install

```sh
npm install secure-webrtc-swarm
```

## Usage

```js
var signalhub = require('signalhub')
var swarm = require('secure-webrtc-swarm')
var wrtc = require('electron-webrtc')()

var hub1 = signalhub('appName', ['https://signalhub-server.com'])
var hub2 = signalhub('appName', ['https://signalhub-server.com'])

var sharedSecret = swarm.createSecret()

var sw1 = swarm(hub1, {
  sharedSecret,
  wrtc // not needed in the browser
})
var sw2 = swarm(hub2, {
  sharedSecret,
  wrtc // not needed in the browser
})

sw1.on('peer', function (peer, id) {
  console.log('connected to a new peer:', id)
  console.log('total peers:', sw.peers.length)
})
```
See [test.js](test.js) for further reference.

## License

MIT
