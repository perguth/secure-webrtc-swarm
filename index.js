var aes = require('crypto-js').AES
let crypto = require('crypto')
var debug = require('debug')('secure-webrtc-swarm')
var enc = require('crypto-js').enc.Utf8
var Swarm = require('webrtc-swarm')

module.exports = Main

Main.WEBRTC_SUPPORT = Swarm.WEBRTC_SUPPORT
Main.createSecret = function (length) {
  // https://github.com/mafintosh/webrtc-swarm/commit/ce77175c7d48cf4fad11c5e40f8869ebf0d7f303#diff-1dd241c4cd3fd1dd89c570cee98b79dd
  length = length || 16
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length)
}

function Main (hub, opts) {
  if (!(this instanceof Main)) return new Main(hub, opts)
  if (!hub) throw new Error('`signalhub` instance required, see: https://github.com/mafintosh/signalhub')
  opts = opts || {}
  var secret = opts.secret || this.createSecret(opts.secretLength)

  opts = Object.assign(opts, {
    wrap: function (data, channel) {
      if (!data.signal || channel === '/all') return data
      let signal = JSON.stringify(data.signal)
      data.signal = aes.encrypt(signal, secret).toString()
      return data
    },
    unwrap: function (data, channel) {
      if (!data.signal) return data
      try {
        var signal = (aes.decrypt(data.signal, secret)).toString(enc)
        data.signal = JSON.parse(signal)
      } catch (e) {
        debug(e)
        return
      }
      return data
    }
  })

  var swarm = new Swarm(hub, opts)
  swarm.secret = secret
  return swarm
}
