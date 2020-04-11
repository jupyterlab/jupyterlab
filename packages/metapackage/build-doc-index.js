const fs = require('fs-extra');
const utils = require('@jupyterlab/buildutils');

let index = `<!DOCTYPE html>
<!--
Copyright (c) Jupyter Development Team.
Distributed under the terms of the Modified BSD License.
-->
<html>

<head>
  <meta charset="utf-8">

  <title>JupyterLab API Docs</title>

</head>

<body>
<h2>JupyterLab Packages</h2>
<div style='display:flex;flex-direction:column'>`;

const data = utils.readJSONFile('./package.json');
const pkgs = Object.keys(data.dependencies);
pkgs.forEach(function(pkg) {
  const name = pkg.split('/')[1];
  index += `<a href="${name}/index.html">${name}</a>\n`;
});

index += `
</div>
</body>

</html>`;

fs.writeFileSync('../../docs/api/index.html', index);
