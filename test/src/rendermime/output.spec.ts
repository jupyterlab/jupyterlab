// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  nbformat
} from '@jupyterlab/services';

import {
  OutputModel
} from '../../../lib/rendermime';

import {
  DEFAULT_OUTPUTS
} from '../utils';


describe('rendermime/output', () => {

  describe('.getData()', () => {

    it('should handle all bundle types', () => {
      for (let i = 0; i < DEFAULT_OUTPUTS.length; i++) {
        let output = DEFAULT_OUTPUTS[i];
        let bundle = OutputModel.getData(output);
        expect(Object.keys(bundle).length).to.not.be(0);
      }
    });

  });

});
