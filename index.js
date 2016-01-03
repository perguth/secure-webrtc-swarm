var debug = require('debug')('secure-webrtc-swarm')
var nacl = require('tweetnacl')
var webrtcSwarm = require('webrtc-swarm')

module.exports = function (hub, keyPair, opts) {
  keyPair = keyPair || nacl.box.keyPair()
  opts = opts || {}
  opts.namespace = opts.namespace || 'secureWebrtcSwarm'
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
  var me = keyPair.publicKey
  swarm.whitelist.push(me)

  function wrap (data, channel) {
    if (channel === 'all') return data

    if (swarm.whitelist.indexOf(channel) === -1) {
      if (!swarm.receivedInvites[channel]) {
        throw new Error('Trying to send data to a peer that is either not known and not invited or should send us ratcheting data first.', data.from)
      }

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

    if (channel === 'all') {
      if (swarm.receivedInvites[data.from]) {
        debug('discovered broadcast from inviting peer')
        return data
      }
      if (swarm.whitelist.indexOf(data.from) !== -1) {
        return data
      }
      debug('skipping broadcast from unknown peer', data.from)
      return false
    }

    if (swarm.issuedInvites.indexOf(data.signPubKey) !== -1) {
      debug('trying to verify incoming pubKey')
      var valid = verify(data.from, data.signature, data.signPubKey)
      if (!valid) {
        debug('signature invalid - dropping offered pubKey', data)
        return false
      }
      debug('verified incoming pubKey - closing invite')
      swarm.issuedInvites.splice(swarm.issuedInvites.indexOf(data.signPubKey), 1)
      swarm.whitelist.push(data.from)
    }

    var signal = decrypt(data.signal, data.nonce, data.from, opts.privKey)
    if (!signal) {
      debug('signal decryption/verification failed')
      return false
    } else debug('signal decryption/verification successfull')
    data.signal = JSON.parse(signal)

    if (swarm.receivedInvites[data.from]) {
      debug('received properly encrypted packages - closing invite')
      delete swarm.receivedInvites[data.from]
      swarm.whitelist.push(data.from)
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
