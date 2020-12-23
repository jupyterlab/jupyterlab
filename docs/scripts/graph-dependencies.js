// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/**
 * This script generates a transitive reduction of the dependency graph among
 * jupyterlab packages using the graphviz library. It works from package.json
 * dependencies, so does not capture the nuances of how plugins depend on each
 * other, such as optional dependencies. Still, it can be useful to have a way
 * to generate such a graph to get an idea of how packages depend on other
 * packages.
 *
 * You must have graphviz installed to run this script. Run from the docs
 * directory:
 *
 * % node scripts/graph-dependencies.js
 */

const childProcess = require('child_process');
const fs = require('fs-extra');
const glob = require('glob');
const path = require('path');
const url = require('url');

const basePath = path.resolve('..');
const baseUrl = 'https://github.com/jupyterlab/jupyterlab/tree/master/packages';
const packages = glob.sync(path.join(basePath, 'packages/*'));

// Begin the graph specification
let text = ['digraph G {', 'node [shape=box];'];

packages.forEach(function (packagePath) {
  // Load the package.json data.
  const dataPath = path.join(packagePath, 'package.json');
  let data;
  try {
    data = require(dataPath);
  } catch (e) {
    return;
  }

  const name = data.name ?? 'UNKNOWN';

  // Don't include private packages.
  if (data.private === true) {
    return;
  }

  // Only include packages in the @jupyterlab namespace.
  if (!name.startsWith('@jupyterlab')) {
    return;
  }

  // In order to cut down on the number of graph nodes,
  // don't include "*-extension" packages.
  if (name.endsWith('-extension')) {
    return;
  }

  // Don't include the metapackage.
  if (name === '@jupyterlab/metapackage') {
    return;
  }

  const shortName = name.split('/')[1];
  const urlLink = url.resolve(
    baseUrl,
    'packages/' + path.basename(packagePath)
  );

  // Remove the '@jupyterlab' part of the name.
  text.push(`"${shortName}" [URL="${urlLink}"];\n`);

  const deps = data.dependencies ?? [];
  for (let dep in deps) {
    // Only include JupyterLab dependencies
    if (dep.startsWith('@jupyterlab')) {
      text.push(`"${shortName}" -> "${dep.split('/')[1]}";\n`);
    }
  }
});

text.push('}');

fs.writeFileSync('./dependencies.gv', text.join('\n'));
childProcess.execSync(
  'cat dependencies.gv | tred | dot -Tsvg -o dependency-graph.svg'
);
fs.unlinkSync('./dependencies.gv');
