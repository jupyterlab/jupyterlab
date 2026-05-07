// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

declare let define: any;

if (typeof define !== 'function') {
  // @ts-expect-error Import of a untyped module
  const define = require('amdefine')(module); // eslint-disable-line @typescript-eslint/no-unused-vars
}

module.exports = {
  test: () => {
    return 1;
  },
  test2: () => {
    throw Error('Nope');
  }
};
