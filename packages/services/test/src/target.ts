// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

if (typeof define !== 'function') { var define = require('amdefine')(module) }

module.exports = {
  test: () => { return 1; },
  test2: () => { throw Error('Nope'); }
};
