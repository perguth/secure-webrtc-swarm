var cuid = require('cuid')
var debug = require('debug')('secure-webrtc-swarm')
var nacl = require('tweetnacl')
var webrtcSwarm = require('webrtc-swarm')

module.exports = Object.assign(function (hub, opts) {
  opts = opts || {}

  var keyPair = opts.keyPair || stringify(nacl.box.keyPair())
  var swarm = webrtcSwarm(hub, Object.assign(opts, {
    uuid: keyPair.publicKey,
    namespace: opts.namespace || cuid(),
    wrap,
    unwrap
  }))
  ;[
    'authenticatedPeers',
    'blacklist',
    'createInvite',
    'receivedInvites',
    'receiveInvite',
    'issuedInvites',
    'sharedSecret'
  ].forEach(function (attr) {
    swarm[attr] = opts[attr] || []
    delete opts[attr]
  })
  delete opts.keyPair
  if (!swarm.sharedSecret.length) swarm.sharedSecret = null
  swarm.publicKey = keyPair.publicKey
  swarm.privateKey = keyPair.secretKey
  swarm.authenticatedPeers.push(keyPair.publicKey)
  swarm.createInvite = createInvite
  swarm.receiveInvite = receiveInvite

  return swarm

  function wrap (data, channel) {
    if (isBlacklisted(swarm, data)) {
      debug('ignoring blacklisted peer', data.from)
      return
    }
    if (channel === 'all') return data

    if (swarm.authenticatedPeers.indexOf(channel) === -1) {
      var signPrivKey = swarm.receivedInvites[channel] || swarm.sharedSecret
      if (!signPrivKey) {
        throw new Error('Trying to send data to a peer that is either not known and not invited or should send us ratcheting data first.', data.from)
      }
      var signPubKey = deriveSignPubKey(signPrivKey)
      var signature = sign(swarm.publicKey, signPrivKey)

      debug('attaching crypto algorithm data')
      data.signPubKey = signPubKey
      data.signature = signature
    }

    var nonce = nacl.util.encodeBase64(nacl.randomBytes(24))
    var theirPubKey = channel
    var myPrivKey = swarm.privateKey
    var signal = JSON.stringify(data.signal)
    data.nonce = nonce
    data.signal = encrypt(signal, nonce, theirPubKey, myPrivKey)
    return data
  }

  function unwrap (data, channel) {
    if (!data || data.from === swarm.publicKey) return data
    if (isBlacklisted(swarm, data)) {
      debug('ignoring blacklisted peer', data.from)
      return
    }

    if (channel === 'all') {
      if (swarm.receivedInvites[data.from]) {
        debug('discovered broadcast from inviting peer', data.from)
        return data
      }
      if (
        swarm.authenticatedPeers.indexOf(data.from) !== -1 ||
        swarm.sharedSecret
      ) return data
      return false
    }

    debug('received direct message from peer', data.from)
    if (
      swarm.issuedInvites.indexOf(data.signPubKey) !== -1 ||
      data.signPubKey === swarm.sharedSecret
    ) {
      debug('trying to verify incoming pubKey', data.from, data.signature, data.signPubKey)
      var valid = verify(data.from, data.signature, data.signPubKey)
      if (!valid) {
        debug('signature invalid - ignoring authentication request', data)
        return false
      }
      debug('verified incoming pubKey - closing invite')
      swarm.issuedInvites.splice(swarm.issuedInvites.indexOf(data.signPubKey), 1)
      swarm.authenticatedPeers.push(data.from)
      debug('authenticatedPeers', swarm.authenticatedPeers)
      swarm.emit('accept', data.from, data.signPubKey)
    }

    var signal = decrypt(data.signal, data.nonce, data.from, swarm.privateKey)
    if (!signal) {
      debug('signal decryption/verification failed')
      return false
    } else debug('signal decryption/verification successfull')

    data.signal = JSON.parse(signal)

    if (swarm.authenticatedPeers.some(function (x) { return x === data.from })) {
      return data
    }
    if (swarm.receivedInvites[data.from] || swarm.sharedSecret) {
      debug('received properly encrypted packages - adding peer', data.from)
      delete swarm.receivedInvites[data.from]
      swarm.authenticatedPeers.push(data.from)
      swarm.emit('accept', data.from)
    }
    return data
  }

  function createInvite () {
    var sharedSignKey = stringify(nacl.sign.keyPair())
    swarm.issuedInvites.push(sharedSignKey.publicKey)
    return `${swarm.publicKey}:${sharedSignKey.secretKey}`
  }

  function receiveInvite (invite) {
    invite = invite.split(':')
    Object.assign(swarm.receivedInvites, { [invite[0]]: invite[1] })
  }
}, {
  createSecret: function () {
    return stringify(nacl.sign.keyPair()).secretKey
  }
})

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

function stringify (keyPair) {
  return {
    publicKey: nacl.util.encodeBase64(keyPair.publicKey),
    secretKey: nacl.util.encodeBase64(keyPair.secretKey)
  }
}

function isBlacklisted (swarm, data) {
  return swarm.blacklist.some(function (x) { return x === data.from })
}
