// In-memory storage with persistence through localStorage
var merge = require('deepmerge')


module.exports = function (namespace) {
  return storage = {
    _cache: JSON.parse(window.localStorage.getItem(namespace)) || {},
    _save: function () {
      window.localStorage.setItem(namespace, JSON.stringify(this._cache))
    },
    get: function (key) {
      return this._cache[key] ? this._cache[key] : {}
    },
    set: function (key, meta) {
      this._cache[key] = meta
      this._save()
    },
    assign: function (key, meta) {
      if (!this._cache[key]) this._cache[key] = {}
      this._cache[key] = Object.assign(this._cache[key], meta)
      this._save()
    },
    merge: function (key, meta) {
      if (!this._cache[key]) this._cache[key] = {}
      this._cache[key] = merge(this._cache[key], meta)
      this._save()
    },
    remove: function (key, meta) {
      delete this.cache[key]
      this._save()
    }
  }
}
