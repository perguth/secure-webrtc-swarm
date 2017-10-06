# secure-webrtc-swarm

> A wrapper around [webrtc-swarm](https://github.com/mafintosh/webrtc-swarm) that adds peer whitelisting and authenticated asymmetric encryption of the WebRTC signaling data using [TweetNaCl.js](https://github.com/dchest/tweetnacl-js
) (see [algorithm.md](algorithm.md)).

When connecting multiple peers via [webrtc-swarm](https://github.com/mafintosh/webrtc-swarm) personal information like available IP addresses are exchanged via a central thin server. `secure-webrtc-swarm` completely enctypts this data stream and prevents in-transit manipulation by signing data packages.

## Install

```sh
npm install https://github.com/peermusic/secure-webrtc-swarm.git
```

## Usage

```js
var nacl = require('tweetnacl')
var signalhub = require('signalhub')
var swarm = require('secure-webrtc-swarm')

var hub = signalhub('swarm-example', ['http://yourdomain.com'])
var keyPair = nacl.box.keyPair()

var sw = swarm(hub, keyPair)

sw.on('peer', function (peer, id) {
  console.log('connected to a new peer:', id)
  console.log('total peers:', sw.peers.length)
})
```

Adding inviting peers works by modifying the `sw` object or already providing the relevant information while setting `sw` up. See the [tests](test.js) for reference.

## License

MIT
