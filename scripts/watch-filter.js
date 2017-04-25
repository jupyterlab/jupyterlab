var path = require('path');

module.exports = function(f, stat) {
    var parts = f.split(path.sep);
    return parts.indexOf('src') !== -1 || parts.indexOf('style') !== -1;
}
