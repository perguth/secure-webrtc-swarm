var debug = require('debug')('secure-webrtc-swarm')
var webrtcSwarm = require('./lib/mod-webrtc-swarm')
var signalhub = require('signalhub')
var nacl = require('tweetnacl')

module.exports = function (hub, keyPair, opts) {
  keyPair = keyPair || nacl.box.keyPair()
  opts = opts || {}
  opts.namespace = opts.namespace || 'secureWebrtcSwarm'
  var me = keyPair.publicKey
  Object.assign(opts, {
    uuid: keyPair.publicKey,
    privKey: keyPair.secretKey,
    wrap, unwrap
  })

  var swarm = webrtcSwarm(hub, opts)
  Object.assign(swarm, {
    whitelist: opts.whitelist || [],
    receivedInvites: opts.receivedInvites || {},
    issuedInvites: opts.issuedInvites || []
  })
  swarm.whitelist.push(me)

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

    if (swarm.whitelist.indexOf(data.from) === -1) {
      if (channel === 'all') {
        debug('skipping broadcast from unknown peer')
        return false
      }

      if (swarm.issuedInvites.indexOf(data.signPubKey) === -1) {
        debug('skipping direct message from unknown peer', data)
        return false
      }

      var valid = verify(data.from, data.signature, data.signPubKey)
      if (!valid) {
        debug('signature invalid - dropping offered pubKey', data)
        return false
      }

      debug('received and verified pubKey - closing invite')
      swarm.issuedInvites.splice(swarm.issuedInvites.indexOf(data.signPubKey), 1)
      swarm.whitelist.push(data.from)
    }

    if (channel === 'all') return data

    var theirPubKey = data.from
    var myPrivKey = opts.privKey
    var signal = decrypt(data.signal, data.nonce, theirPubKey, myPrivKey)
    if (!signal) {
      debug('decryption failed', data)
      return false
    }
    data.signal = JSON.parse(signal)

    if (swarm.receivedInvites[data.from]) {
      delete swarm.receivedInvites[data.from]
      debug('received properly encrypted packages - closing invite')
    }
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
