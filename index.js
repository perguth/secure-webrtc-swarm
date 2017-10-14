var debug = require('debug')('secure-webrtc-swarm')
var swarm = require('webrtc-swarm')
var randword = require('secure-randword')
var aes = require('crypto-js').AES
var enc = require('crypto-js').enc.Utf8

module.exports = Object.assign(SecureWebRTCSwarm, {generateMnemonic: generateMnemonic})

function SecureWebRTCSwarm (hub, opts) {
  if (!(this instanceof SecureWebRTCSwarm)) return new SecureWebRTCSwarm(hub, opts)
  if (!hub) throw new Error('SignalHub instance required')
  opts = opts || {}
  var mnemonic = opts.mnemonic || this.generateMnemonic(opts.mnemonicLength)

  opts = Object.assign(opts, {
    wrap: function (data, channel) {
      if (!data.signal || channel === '/all') return data
      let signal = JSON.stringify(data.signal)
      data.signal = aes.encrypt(signal, mnemonic).toString()
      return data
    },
    unwrap: function (data, channel) {
      if (!data.signal) return data
      try {
        var signal = (aes.decrypt(data.signal, mnemonic)).toString(enc)
        data.signal = JSON.parse(signal)
      } catch (e) {
        debug(e)
        return
      }
      return data
    }
  })

  return Object.assign(swarm(hub, opts), {mnemonic: mnemonic})
}

function generateMnemonic (len) {
  return randword(len || 3).join('-')
}
