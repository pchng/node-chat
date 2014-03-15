module.exports = {
  buildErrorResponse: function(reason) {
    var r = {}
    r[FIELDS.type] = TYPES.error;
    r[FIELDS.reason] = reason;
    return r;
  },
  buildLoginFailureResponse: function(reason) {
    var r = {}
    r[FIELDS.type] = TYPES.login_failure;
    r[FIELDS.reason] = reason;
    return r;
  },
}
