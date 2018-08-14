#!/usr/bin/env node
var version = parseInt(process.version.replace('v', ''));
if (version < 5) {
  process.exit(1);
}
