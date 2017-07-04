#!/usr/bin/env node
var semver = require('semver');

if (!semver.satisfies(semver(process.version), '>=5')) {
  process.exit(1);
}
