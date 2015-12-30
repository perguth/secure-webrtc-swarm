var debug = require('debug')('secure-webrtc-swarm')
var webrtcSwarm = require('./lib/mod-webrtc-swarm')
var signalhub = require('signalhub')
var nacl = require('tweetnacl')

/** Test using:

// Browser tab A
// privKey(A) = '4oDfzsyer+vZg/SouHNiYov+OqzlcJoa1WNO+Zu+K+o='
var a = s('localhost:7000', {
  uuid: 'HQpECMWIUaOIvdTLzmvfFN1CZMSFWAOmJ1pCEYCr5zA=',
  extendedInvites: {
    '447aTPffUY0o9YKYGq9iHlooC9R4y2hCSv93b1/duIE=': // <- signPubKey(AB)
    'upA4zHBTedolBKZ6f5TRe+TZcSfPAW1KVfUB2xFjNmDjjtpM999RjSj1gpgar2IeWigL1HjLaEJK/3dvX924gQ==' // <- signPrivKey(AB)
  }
})

// Browser tab B
// privKey(B) = 'V6j8zDQOZlRV/HtSNWxel708fe0IHXJWsvhAtgNwSeU='
var b = s('localhost:7000', {
  uuid: 'wEXhh5BleF626PHXURkRxMD4jlBO9ohkuGVCPb9AaFU=',
  whitelist: ['HQpECMWIUaOIvdTLzmvfFN1CZMSFWAOmJ1pCEYCr5zA='],
  receivedInvites: {
    'HQpECMWIUaOIvdTLzmvfFN1CZMSFWAOmJ1pCEYCr5zA=': // <- pubKey(A)
    'upA4zHBTedolBKZ6f5TRe+TZcSfPAW1KVfUB2xFjNmDjjtpM999RjSj1gpgar2IeWigL1HjLaEJK/3dvX924gQ==' // <- signPrivKey(AB)
  }
})

*/

window.nacl = nacl
window.s =
module.exports = function (hub, opts) {
  opts = opts || {}
  Object.assign(opts, {wrap, unwrap})

  var swarm = webrtcSwarm(signalhub('peermusic', hub), opts)
  Object.assign(swarm, {
    whitelist: opts.whitelist || [],
    receivedInvites: opts.receivedInvites || {},
    extendedInvites: opts.extendedInvites || {}
  })
  var me = opts.uuid
  if (me) swarm.whitelist.push(me)

  function wrap (data, channel) {
    if (channel === 'all') return data

    if (swarm.whitelist.indexOf(channel) === -1) {
      throw new Error('Trying to send signaling data to a peer that is neither known nor invited.')
    }

    if (swarm.receivedInvites[channel]) {
      debug('attaching ratcheting data')
      var signPrivKey = swarm.receivedInvites[channel]
      var signPubKey = deriveSignPubKey(signPrivKey)
      var signature = sign(me, signPrivKey)
      data.signPubKey = signPubKey
      data.signature = signature
    }

    var nonce = nacl.util.encodeBase64(nacl.randomBytes(24))
    var theirPubKey = channel
    var myPrivKey = opts.privKey
    var signal = JSON.stringify(data.signal)
    data.nonce = nonce
    data.signal = encrypt(signal, nonce, theirPubKey, myPrivKey)
    return data
  }

  function unwrap (data, channel) {
    if (!data || data.from === me) return data

    if (swarm.whitelist.indexOf(data.from) !== -1) {
      // decrypt/verify
      if (swarm.receivedInvites[channel]) {
        delete swarm.receivedInvites[channel]
      }
      return data
    }

    if (channel === 'all') {
      debug('skipping broadcast from unknown peer')
      return false
    }

    if (!swarm.extendedInvites[data.signPubKey]) {
      debug('skipping signaling data from unknown peer', data)
      return false
    }

    var verified = verify(data.from, data.signature, data.signPubKey)
    if (!verified) {
      debug('signature invalid - dropping offered pubKey', data)
      return false
    }

    var theirPubKey = data.from
    var myPrivKey = opts.privKey
    data.signal = decrypt(data.signal, data.nonce, theirPubKey, myPrivKey)

    if (!data.signal) {
      debug('verification while decrypting failed', data)
      return false
    }

    data.signal = JSON.parse(data.signal)
    debug('received and verified pubKey of invitee')

    delete swarm.extendedInvites[data.signPubKey]
    swarm.whitelist.push(data.from)

    return data
  }

  return swarm
}

function sign (data, signPrivKey) {
  signPrivKey = nacl.util.decodeBase64(signPrivKey)
  data = nacl.util.decodeUTF8(data)
  data = nacl.sign.detached(data, signPrivKey)
  data = nacl.util.encodeBase64(data)
  return data
}
function deriveSignPubKey (signPrivKey) {
  var signPubKey = nacl.sign.keyPair.fromSecretKey(
    nacl.util.decodeBase64(signPrivKey)
  ).publicKey
  signPubKey = nacl.util.encodeBase64(signPubKey)
  return signPubKey
}
function encrypt (data, nonce, theirPubKey, myPrivKey) {
  nonce = nacl.util.decodeBase64(nonce)
  theirPubKey = nacl.util.decodeBase64(theirPubKey)
  myPrivKey = nacl.util.decodeBase64(myPrivKey)
  data = nacl.util.decodeUTF8(data)
  data = nacl.box(data, nonce, theirPubKey, myPrivKey)
  data = nacl.util.encodeBase64(data)
  return data
}
function verify (data, signature, signPubKey) {
  signature = nacl.util.decodeBase64(signature)
  signPubKey = nacl.util.decodeBase64(signPubKey)
  data = nacl.util.decodeUTF8(data)
  var success = nacl.sign.detached.verify(data, signature, signPubKey)
  return success
}
function decrypt (data, nonce, theirPubKey, myPrivKey) {
  nonce = nacl.util.decodeBase64(nonce)
  theirPubKey = nacl.util.decodeBase64(theirPubKey)
  myPrivKey = nacl.util.decodeBase64(myPrivKey)
  data = nacl.util.decodeBase64(data)
  data = nacl.box.open(data, nonce, theirPubKey, myPrivKey)
  if (!data) return false
  data = nacl.util.encodeUTF8(data)
  return data
}
