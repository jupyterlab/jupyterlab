// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

var semver = require('semver');

// The registered module cache
var registered = {};

// The module cache
var installedModules = {};

// The module lookup cache
var lookupCache = {};

// object to store loaded and loading chunks
// "0" means "already loaded"
// Array means "loading", array contains callbacks
var installedChunks = {
};


// Define a jupyter module.
function jupyterDefine(name, callback) {
  registered[name] = callback;
}


// Require a jupyter module that has already been loaded.
function jupyterRequire(moduleRequest) {
  // Check if module is in cache
  var moduleId = findModuleId(moduleRequest)
  if(installedModules[moduleId])
    return installedModules[moduleId].exports;

  // Create a new module (and put it into the cache)
  var module = installedModules[moduleId] = {
    exports: {},
    id: moduleId,
    loaded: false
  };

  // Execute the module function
  registered[moduleId].call(module.exports, module, module.exports, jupyterRequire);

  // Flag the module as loaded
  module.loaded = true;

  // Return the exports of the module
  return module.exports;
}


// Ensure a jupyter bundle is loaded on a page.
function jupyterEnsure(path, callback) {
  // "0" is the signal for "already loaded"
  if (installedChunks[path] === 0) {
    return callback.call(null, jupyterRequire);
  }

  // an array means "currently loading".
  if (Array.isArray(installedChunks[path])) {
    installedChunks[path].push(callback);
    return;
  }

  // start chunk loading
  installedChunks[path] = [callback];
  var head = document.getElementsByTagName('head')[0];
  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.charset = 'utf-8';
  script.async = true;
  script.onload = function() {
    var callbacks = installedChunks[path];
    while(callbacks.length)
      callbacks.shift().call(null, jupyterRequire);
    installedChunks[path] = 0;
  }
  head.appendChild(script);
  script.src = path;
}


// Find a module matching a given module request.
function findModuleId(name) {
  if (lookupCache[name]) {
    return lookupCache[name];
  }
  var modules = Object.keys(registered);
  // Get the package name, semver string, and module name.
  var parts = name.match(/(^.*?)@(.*?)(\/.*$)/) || name.match(/(^.*?)@(.*?)$/);
  if (parts.length === 2) {
    parts.push('');
  }
  var matches = [];
  var versions = [];
  for (var i = 0; i < modules.length; i++) {
    var mod = modules[i];
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
  };

  if (!matches.length) {
    throw Error('No module found matching: ' + name);
    return;
  }
  var index = 0;
  if (matches.length > 1) {
    var best = semver.maxSatisfying(versions, parts[2]);
    if (!best) {
      throw new Error('No module found satisying: ' + name);
    }
    index = versions.indexOf(best);
  }
  lookupCache[name] = matches[index];
  return matches[index];
}

// Add the functions to window.
jupyterRequire.e = jupyterEnsure;

window.jupyterDefine = jupyterDefine;
window.jupyterRequire = jupyterRequire;
window.jupyterEnsure = jupyterEnsure;
