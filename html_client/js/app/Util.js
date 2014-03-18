define(function() {

  function getChatTimestamp(timestamp) {
    return "[" + formatDateTime("%H:%M:%S", timestamp) + "] "
  }

  // Only supports {%H, %M, %S} literals.
  function formatDateTime(formatString, dateTime) {
    return formatString.replace(
      "%H", zeroPad(dateTime.getHours(), 2)).replace(
      "%M", zeroPad(dateTime.getMinutes(), 2)).replace(
      "%S", zeroPad(dateTime.getSeconds(), 2));
  }

  function zeroPad(number, length) {
    var value = number.toString();
    var diff = length - value.length;
    for (var i = 0; i < diff; ++i) {
      value = "0" + value;
    }
    return value;
  }

  // Public APIs.
  return {
    getChatTimestamp: getChatTimestamp,
  }
})