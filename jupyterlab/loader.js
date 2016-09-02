
var semver = require('semver');
window.loading = [];
window.loaded = [];
window.pending = [];

function loadWithSemver(name, req, onLoad, config) {
    var modules = Object.keys(requirejs.s.contexts['_'].registry);
    // Get the package name, semver string, and module name.
    var parts = name.match(/(^.*?)@(.*?)(\/.*$)/) || name.match(/(^.*?)@(.*?)$/);
    if (parts.length === 2) {
      parts.push('');
    }
    var matches = [];
    var versions = [];
    for (var mod of modules) {
      var modParts = mod.match(/(^.*?)@(.*?)(\/.*$)/) || mod.match(/(^.*?)@(.*?)$/);
      if (!modParts) {
        continue;
      }
      if (modParts.length === 2) {
        modParts.push('');
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
      if (!best) {
        onLoad.error('No module found satisying: ' + name);
        return;
      }
      index = versions.indexOf(best);
    }
    if (pending.indexOf(matches[index]) !== -1) {
      console.log('duplicate', matches[index]);
    }
    loading.push(matches[index]);
    pending.push(matches[index]);
    console.log('loading', loading.length, matches[index]);
    requirejs([matches[index]], function(mod) {
      loaded.push(matches[index]);
      pending.splice(pending.indexOf(matches[index]), 1);
      console.log('loaded', loaded.length, 'of', loading.length, matches[index]);
      onLoad(mod);
    });
};


module.exports = {
    load: loadWithSemver
}
