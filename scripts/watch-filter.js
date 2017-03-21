var path = require('path');

module.exports = function(f, stat) {
    if (f.indexOf('node_modules') !== -1) {
        return false;
    }
    if (f.indexOf('.git') !== -1) {
        return false;
    }
    if (f.indexOf('src') !== -1 && f.indexOf('style') !== -1) {
        return false;
    }
    return true;
}
