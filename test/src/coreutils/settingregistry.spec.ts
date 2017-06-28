// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  expect
} from 'chai';

import {
  SettingRegistry
} from '@jupyterlab/coreutils';


describe('@jupyterlab/coreutils', () => {

  describe('SettingRegistry', () => {

    describe('#constructor()', () => {

      it('should create a new setting registry', () => {
        expect(new SettingRegistry()).to.be.an.instanceof(SettingRegistry);
      });

    });

  });

});
