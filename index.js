var aes = require('crypto-js').AES
var debug = require('debug')('secure-webrtc-swarm')
var enc = require('crypto-js').enc.Utf8
var randomstring = require('randomstring').generate
var Swarm = require('webrtc-swarm')

module.exports = Main

Main.WEBRTC_SUPPORT = Swarm.WEBRTC_SUPPORT
Main.createKey = randomstring

function Main (hub, opts) {
  if (!hub) throw new Error('`signalhub` instance required, see: https://github.com/mafintosh/signalhub')
  opts = opts || {}
  this.sharedKeys = opts.sharedKeys || {}
  this.keys = opts.keys || [randomstring(16)]

  opts = Object.assign(opts, {
    wrap: function (data, channel) {
      var key = this.sharedKeys[channel] || pickRandom(this.keys)
      Object.keys(data).forEach(function (prop) {
        if (prop === 'type' || prop === 'from') return
        data[prop] = JSON.stringify(data[prop])
        data[prop] = aes.encrypt(data[prop], key).toString()
      })
      return data
    },
    unwrap: function (data, channel) {
      console.log(Object.keys(data))
      if (!data.signal) return data
      var key = this.sharedKeys[data.from]
      if (key) {
        try {
          Object.keys(data).forEach(function (prop) {
            if (prop === 'type' || prop === 'from') return
            data[prop] = aes.decrypt(data[prop], key).toString(enc)
            data[prop] = JSON.parse(data[prop])
          })
        } catch (err) {
          debug(swarm.me,
            'Unable to decrypt message /w known key in channel:',
            channel
          )
        }
        debug(swarm.me, 'Decrypted data w/ known key:', key)
        return data
      }
      debug(swarm.me, 'Trying to discover key out of', this.keys.length)
      key = this.keys.find(function (key) {
        try {
          Object.keys(data).forEach(function (prop) {
            if (prop === 'type' || prop === 'from') return
            data[prop] = aes.decrypt(data[prop], key).toString(enc)
            data[prop] = JSON.parse(data[prop])
          })
        } catch (err) {
          return false
        }
        debug(swarm.me, 'Discoverd key', key)
        return true
      })
      if (!key) {
        debug(
          swarm.me,
          'No shared key found - trying again next time',
          data.from
        )
        // we need to remove the remote otherwise `webrtc-swarm` won't try again
        delete swarm.remotes[data.from]
        return
      }
      Object.assign(this.sharedKeys, {
        [data.from]: key
      })
      return data
    }
  })

  var swarm = new Swarm(hub, opts)
  Object.assign(swarm, this)
  swarm.on('peer', function (peer, id) {
    Object.assign(peer, {sharedKey: this.sharedKeys[id]})
  })
  return swarm
}

function pickRandom (obj) {
  var props = Object.keys(obj)
  return obj[props[props.length * Math.random() << 0]]
}
