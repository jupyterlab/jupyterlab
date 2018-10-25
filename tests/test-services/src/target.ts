// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

declare var define: any;

if (typeof define !== 'function') {
  // @ts-ignore
  const define = require('amdefine')(module); // tslint:disable-line
}

module.exports = {
  test: () => {
    return 1;
  },
  test2: () => {
    throw Error('Nope');
  }
};
