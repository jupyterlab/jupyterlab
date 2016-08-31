
var semver = require('semver');

function loadWithSemver(name, req, onLoad, config) {
    console.log(semver);
    var modules = Object.keys(requirejs.s.contexts['_'].registry);
    // Get the package name, semver string, and module name.
    var parts = name.match(/(^.*?):(.*?)(\/.*$)/);
    var matches = [];
    for (var mod of modules) {
      var modParts = mod.match(/(^.*?):(.*?)(\/.*$)/);
      if (!modParts) {
        console.log('skipping', mod);
        continue;
      }
      if (modParts[1] === parts[1] && modParts[3] === parts[3]) {
        matches.push(mod);
      }
    }
    if (!matches.length) {
      onLoad.error('No module found matching: ' + name);
    } else if (matches.length == 1) {
      requirejs([matches[0]], function(mod) {
        onLoad(mod);
      });
    } else {
      // Find the best match using semver.
      console.log('multiple matches for', name);
    }
};


module.exports = {
    load: loadWithSemver
}
