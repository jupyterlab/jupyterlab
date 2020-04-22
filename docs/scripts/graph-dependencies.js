const childProcess = require('child_process');
const fs = require('fs-extra');
const glob = require('glob');
const path = require('path');
const url = require('url');

const basePath = path.resolve('..');
const baseUrl = 'https://github.com/jupyterlab/jupyterlab/tree/master/packages';
const packages = glob.sync(path.join(basePath, 'packages/*'));

// Begin the graph specification
let text = 'digraph G {\n';
text += 'ratio = 0.6;\n';
text += 'rankdir=LR;\n';

packages.forEach(function(packagePath) {
  // Load the package.json data.
  const dataPath = path.join(packagePath, 'package.json');
  try {
    const data = require(dataPath); // eslint-disable-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return;
  }

  // Don't include private packages.
  if (data.private === true) {
    return;
  }

  // Only include packages in the @jupyterlab namespace.
  if (data.name.indexOf('@jupyterlab') === -1) {
    return;
  }

  // In order to cut down on the number of graph nodes,
  // don't include "*-extension" packages.
  if (data.name.indexOf('-extension') !== -1) {
    return;
  }

  // Don't include the metapackage.
  if (data.name === '@jupyterlab/metapackage') {
    return;
  }

  // Construct a URL to the package on GitHub.
  const Url = url.resolve(baseUrl, 'packages/' + path.basename(packagePath));

  // Remove the '@jupyterlab' part of the name.
  const name = '"' + data.name.split('/')[1] + '"';
  text += name + '[URL="' + Url + '"];\n';

  const deps = data.dependencies || [];
  for (let dep in deps) {
    // Don't include non-jupyterlab dependencies.
    if (dep.indexOf('@jupyterlab') === -1) {
      continue;
    }
    dep = '"' + dep.split('/')[1] + '"';
    text += name + ' -> ' + dep + ';\n';
  }
});

text += '}\n';
fs.writeFileSync('./dependencies.gv', text);
childProcess.execSync(
  'cat dependencies.gv | tred | dot -Tsvg -o dependency-graph.svg'
);
fs.unlinkSync('./dependencies.gv');
