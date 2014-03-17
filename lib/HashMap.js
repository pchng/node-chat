// TODO: PC: Worthwhile to rewrite this as an "actual" hash table using an array for the buckets?
/**
 * Simple hash-based key-value map. 
 * For simplicity, the keys can ONLY be strings.
 * This is to prevent inconsistency arising from mutable keys.
 *
 * For now, just using a hash function to transform the key value into a fixed-length string with 
 * a limited character set. This value is then used as the property name on an object.
 *
 * This has the benefit of ensuring built-in object properties are not overridden.
 * Mainly used when the keys come from user-input values.
 *
 * @class
 */
function HashMap() {
  // Object providing the backing map.
  this.map = {};
}

/**
 * @param key the key to associate the value with.
 * @param value the value to store.
 * @return the value formerly associated with the key, or `undefined`.
 *         (Note that the former value may be `undefined`)
 */
HashMap.prototype.put = function(key, value) {
  if (typeof key !== "string") {
    throw new TypeError("Key must be a string.");
  }

  key = hash(key);

  var formerValue;
  if (this.map.hasOwnProperty(key)) {
    formerValue = this.map[key];
  }

  this.map[key] = value;

  return formerValue;
}

HashMap.prototype.get = function(key) {
  return this.map[hash(key)];
}

HashMap.prototype.containsKey = function(key) {
  return this.map.hasOwnProperty(hash(key));
}

function hash() {
  // TODO: PC: Hook into a proper library.
  return null;
}

module.exports = HashMap;
