var debug = require('debug')('secure-webrtc-swarm')
var webrtcSwarm = require('./lib/mod-webrtc-swarm')
var signalhub = require('signalhub')

/** Test using:

// Browser tab A
var a = s('localhost:7000', {uuid: '03s55f2bdn79pciis2wqub000',
  extendedInvites: { signPubKey: 'signPrivKey' }
})

// Browser tab B
var b = s('localhost:7000', {uuid: 'ciis2wu1f00003s5560m3fzzc',
  receivedInvites: { '03s55f2bdn79pciis2wqub000': 'signPrivKey' }
})

*/

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
    if (channel === 'all' || channel === me) return data

    if (swarm.receivedInvites[channel]) {
      // # Key Exchange and Encryption
      // append auth information
      // encrypt
      debug('sending ratcheting data to', channel)
      var signPubKey = (swarm.receivedInvites[channel] === 'signPrivKey')
        ? 'signPubKey' : false
      data.signPubKey = signPubKey
      data.signature = 'signature'
      return data
    }
    // # Just Encryption/Signing
    // encrypt with pub key
    return data
  }

  function unwrap (data, channel) {
    if (channel === 'all') return data

    if (swarm.whitelist.indexOf(data.from) !== -1) {
      // # Just Decryption/Verification
      // decrypt
      return data
    }

    // # Key Exchange and Encryption
    if (!swarm.extendedInvites[data.signPubKey]) {
      debug('skipping unkown/uninvited peer', data)
      return false
    }
    // verify pubKey
    var verified = (data.signature === 'signature')
    if (!verified) {
      debug('signature invalid, dropping offered pubKey', data)
      return false
    }
    // mark invite complete
    // decrypt
    debug('successfully received pubKey')
    return data
  }

  return swarm
}
