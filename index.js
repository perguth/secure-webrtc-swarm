var aes = require('crypto-js').AES
var debug = require('debug')('secure-webrtc-swarm')
var enc = require('crypto-js').enc.Utf8
var randomstring = require('randomstring').generate
var Swarm = require('webrtc-swarm')

module.exports = Main

Main.WEBRTC_SUPPORT = Swarm.WEBRTC_SUPPORT
Main.createSecret = randomstring

function Main (hub, opts) {
  if (!hub) throw new Error('`signalhub` instance required, see: https://github.com/mafintosh/signalhub')
  opts = opts || {}
  var knownSecrets = opts.knownSecrets || {}
  var secrets = opts.secrets || []
  if (opts.secret) secrets.push(opts.secret)
  if (!secrets.length) secrets = [randomstring(16)]

  opts = Object.assign(opts, {
    wrap: function (data, channel) {
      if (!data.signal) return data
      var secret = knownSecrets[channel] || pickRandom(secrets)
      var signal = JSON.stringify(data.signal)
      data.signal = aes.encrypt(signal, secret).toString()
      return data
    },
    unwrap: function (data, channel) {
      if (!data.signal) return data
      var plaintext
      var secret = knownSecrets[data.from]
      if (secret) {
        plaintext = (aes.decrypt(data.signal, secret)).toString(enc)
        data.signal = JSON.parse(plaintext)
        return data
      }
      debug('Trying to discover key')
      secret = secrets.find(function (secret) {
        try {
          plaintext = (aes.decrypt(data.signal, secret)).toString(enc)
          data.signal = JSON.parse(plaintext)
        } catch (err) {
          return false
        }
        debug('Discoverd key', secret)
        return true
      })
      if (!secret) return
      Object.assign(knownSecrets, {
        [data.from]: secret
      })
      return data
    }
  })

  var swarm = new Swarm(hub, opts)
  if (secrets.length === 1) swarm.secret = secrets[0]
  swarm.secrets = secrets
  swarm.knownSecrets = knownSecrets
  swarm.on('peer', function (peer, id) {
    Object.assign(peer, {sharedSecret: knownSecrets[id]})
  })
  return swarm
}

function pickRandom (obj) {
  var props = Object.keys(obj)
  return obj[props[props.length * Math.random() << 0]]
}
