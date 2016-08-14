// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
var path = require("path");

function validate_lab_config(name, lab_pkg){
  if(!lab_pkg["main"]){
    throw Exception(name + " is not configured properly to load at runtime");
  }

  if(!lab_pkg["externals"]){
    console.warn(name + " doesn't explicitly define its externals, will naively assume the package name");
  }
}


function load_externals(pkg_path, pkg_name, lab_pkg, local_require){
  if(!lab_pkg["externals"]){
    return [pkg_name];
  }

  var pkg_externals = [pkg_name];

  try {
    pkg_externals = pkg_externals.concat(local_require(pkg_path + "/" + lab_pkg["externals"]));
  } catch(err) {
    console.warn("Couldn't load the externals for " + pkg_name +
                 ", just using the package name");
  }

  return pkg_externals;
}


function find_externals(local_require, pkg_path, pkg_name, seen){
  // an array of strings, functions or regexen that can be deferenced by
  // webpack `externals` config directive
  // https://webpack.github.io/docs/configuration.html#externals

  var externals = [],
    package_json,
    is_user_pkg = arguments.length === 1,
    // You should have `require('../package.json')`
    seen = seen || {},
    pkg_path = pkg_path || "";

  if(is_user_pkg){
    package_json = local_require("./package.json");
    pkg_name = package_json["name"];
  }else{
    console.log("WHERE IS", pkg_name, pkg_path)
    package_json = local_require(pkg_path + "/package.json");
    console.log("HERE IS", pkg_name, pkg_path)
  }

  if(seen[pkg_name]){
    return [];
  }

  // avoid circular dependencies
  seen[pkg_name] = true;

  var lab_config;

  try {
    lab_config = package_json["jupyter"]["lab"];
  } catch(err) {
    if(is_user_pkg){
      throw Exception(
        "The package " + package_json["name"] + " does not contain " +
        "a jupyter configuration. Please see TODO: where?"
      );
    }
    return [];
  }

  validate_lab_config(pkg_name, lab_config);

  if(is_user_pkg){
    externals = [
      function(context, request, callback){ /* TODO: PHOSPHOR */ },
      "jupyter-js-services",
      /codemirror/
    ];
  } else {
    externals.push(load_externals(pkg_path, pkg_name, lab_config, local_require));
  }

  // look through the dependencies, and add to externals anything that has
  // a jupyter lab config (you must have installed them some other way)
  Object.keys(package_json["dependencies"]).map(function(dep_name){
    var dep_pkg;
    externals = externals.concat(find_externals(
      local_require,
      !pkg_path ? dep_name : pkg_path + "/node_modules/" + dep_name,
      dep_name,
      seen));
  });

  return externals;
}

module.exports = find_externals;
