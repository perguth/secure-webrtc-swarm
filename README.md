# secure-webrtc-swarm

> A wrapper around [webrtc-swarm](https://github.com/mafintosh/webrtc-swarm) that adds peer whitelisting and authenticated asymmetric encryption of the WebRTC signaling data using that is passed among peers via [signalhub](https://github.com/mafintosh/signalhub) using [TweetNaCl.js](https://github.com/dchest/tweetnacl-js
) (see [crypto-ratchet.md](crypto-ratchet.md)).

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

Adding inviting peers works by modifying the `sw` object or already providing the relevant information while setting `sw` up. See the [example](example.js) for reference.

## License

MIT
