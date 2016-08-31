
var semver = require('semver');

function load(name, req, onLoad, config) {
    console.log(semver);
    var modules = Object.keys(requirejs.s.contexts['_'].registry);
    console.log(modules);
    console.log(name, req, onLoad, config);
};


module.exports = {
    load: load
}
