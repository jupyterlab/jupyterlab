
var semver = require('semver');

function loadWithSemver(name, req, onLoad, config) {
    var modules = Object.keys(requirejs.s.contexts['_'].registry);
    // Get the package name, semver string, and module name.
    var parts = name.match(/(^.*?):(.*?)(\/.*$)/);
    var matches = [];
    var versions = [];
    for (var mod of modules) {
      var modParts = mod.match(/(^.*?):(.*?)(\/.*$)/);
      if (!modParts) {
        continue;
      }
      if (modParts[1] === parts[1] && modParts[3] === parts[3]) {
        matches.push(mod);
        versions.push(modParts[2]);
      }
    }

    if (!matches.length) {
      onLoad.error('No module found matching: ' + name);
      return;
    }
    var index = 0;
    if (matches.length > 1) {
      var best = semver.maxSatisfying(versions, parts[2]);
      index = versions.indexOf(best);
    }
    requirejs([matches[index]], function(mod) {
      onLoad(mod);
    });
};


module.exports = {
    load: loadWithSemver
}
