var aes = require('crypto-js').AES
var debug = require('debug')('secure-webrtc-swarm')
var enc = require('crypto-js').enc.Utf8
var randomstring = require('randomstring')
var Swarm = require('webrtc-swarm')

module.exports = Main

Main.WEBRTC_SUPPORT = Swarm.WEBRTC_SUPPORT
Main.createSecret = randomstring.generate

function Main (hub, opts) {
  if (!hub) throw new Error('`signalhub` instance required, see: https://github.com/mafintosh/signalhub')
  opts = opts || {}
  var secret = opts.secret || this.createSecret(16)

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
