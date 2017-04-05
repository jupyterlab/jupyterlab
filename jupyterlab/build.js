

// After running typescript, move the built files to their constituent lib
// folders
var fs = require('fs-extra');
var path = require('path');

var modules = fs.readdirSync('./lib/packages');

modules.forEach(function(name) {
    var dest = path.join('../packages', name, 'lib');
    fs.copySync(path.join('./lib/packages', name, 'src'), dest);
});
