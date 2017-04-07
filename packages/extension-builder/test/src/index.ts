// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  expect
} from 'chai';

import {
  build
} from '../../lib';

import * as fs
  from 'fs-extra';


describe('@jupyterlab/extension-builder', () => {

  describe('build()', () => {

    it('should build the assets', () => {
      build({
        rootPath: './test/build',
        outPath: './test/build/out'
      });
      let path = './out/package.json';
      let manifest = require(path);
      expect(manifest.name).to.equal('@jupyterlab/extension-builder-test');
      let main = manifest.main;
      let exists = fs.existsSync('./test/build/out/' + main);
      expect(exists).to.equal(true);
    });

  });

});

