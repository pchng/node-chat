// TODO: PC: Worthwhile to rewrite this as an "actual" hash table using an array for the buckets?
// - Have to deal with chaining or other collision resolution.
// TODO: PC: QUnit tests.

var crypto = require("crypto");

/**
 * Simple hash-based key-value map. 
 * For simplicity, the keys can ONLY be strings.
 * This is to prevent inconsistency arising from mutable keys.
 *
 * For now, just using a hash function to transform the key value into a fixed-length string with 
 * a limited character set. This value is then used as the property name on an object.
 *
 * This has the benefit of ensuring built-in Object properties are not overridden.
 * Mainly used when the keys come from user-input values.
 *
 * @class
 */
function HashMap() {
  // Object providing the backing map.
  this._map = {};
}

/**
 * @param {string} key the key to associate the value with.
 * @param {Object} value the value to store.
 * @return {Object} the value formerly associated with the key, or `undefined`.
 *         (Note that the former value may be `undefined`)
 */
HashMap.prototype.put = function(key, value) {
  if (typeof key !== "string") {
    throw new TypeError("Key must be a string.");
  }

  key = hash(key);
  console.log("hash value: %s", key);

  var formerValue;
  if (this._map.hasOwnProperty(key)) {
    formerValue = this._map[key];
  }

  this._map[key] = value;

  return formerValue;
}

/**
 * @param {string} key the key to retrieve the value for.
 * @return {Object} the value associated with the key (which may be `undefined`), 
 *         or `undefined` if the key doesn't exist.
 */
HashMap.prototype.get = function(key) {
  return this._map[hash(key)];
}

/**
 * @param {string} key the key to test for.
 * @param {Boolean} whether the key exists in the map.
 */
HashMap.prototype.containsKey = function(key) {
  return this._map.hasOwnProperty(hash(key));
}

function hash(key) {
  // Have to create a new Hash instance each time because the hashing process
  // is stateful, i.e. digest() can only be called once.
  var md5hash = crypto.createHash("md5");
  md5hash.update(key);
  return md5hash.digest("hex");
}

module.exports = HashMap;
