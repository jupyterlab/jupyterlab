

function load(name, req, onLoad, config) {
    var modules = Object.keys(requirejs.s.contexts['_'].registry);
    console.log(modules);
    console.log(name, req, onLoad, config);
};


module.exports = {
    load: load
}
