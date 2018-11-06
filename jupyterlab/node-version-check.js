#!/usr/bin/env node
var pkg = require('./staging/package.json');

function parser(part) {
  return parseInt(part, 10);
}

var engine = pkg.engines.node.replace('>=', '');
var eparts = engine.split('.').map(parser);

var version = process.version.replace('v', '');
var vparts = version.split('.').map(parser);

// eslint-disable-next-line
console.log('Node', process.version);

if (vparts[0] > eparts[0]) {
  process.exit(0);
}

if (vparts[0] < eparts[0]) {
  process.exit(1);
}

if (vparts[1] > eparts[1]) {
  process.exit(0);
}

if (vparts[1] < eparts[1]) {
  process.exit(1);
}

if (vparts[2] < eparts[1]) {
  process.exit(1);
}
