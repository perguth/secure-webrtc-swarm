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
  whitelist: ['03s55f2bdn79pciis2wqub000'],
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
    if (channel === 'all') return data

    if (swarm.receivedInvites[channel]) {
      debug('sending ratcheting data to', channel)
      var signPubKey = (swarm.receivedInvites[channel] === 'signPrivKey')
        ? 'signPubKey' : false // mockup
      data.signPubKey = signPubKey
      data.signature = 'signature'
      // encrypt/sign
      return data
    }

    if (swarm.whitelist.indexOf(channel) === -1) {
      throw new Error('Trying to send signaling data to a peer that is neither known nor invited.')
    }

    // encrypt/sign
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

    var verified = (data.signature === 'signature') // mockup
    if (!verified) {
      debug('signature invalid - dropping offered pubKey', data)
      return false
    }

    // decrypt/verify
    debug('received and verified pubKey')
    delete swarm.extendedInvites[data.signPubKey]
    swarm.whitelist.push(data.from)
    return data
  }

  return swarm
}
