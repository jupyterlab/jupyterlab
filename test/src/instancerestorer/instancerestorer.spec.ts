// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  InstanceRestorer
} from '../../../lib/instancerestorer/instancerestorer';


describe('instancerestorer/instancerestorer', () => {

  describe('InstanceRestorer', () => {

    describe('#constructor()', () => {

      it('should construct a new instance restorer', () => {
        let options: InstanceRestorer.IOptions = {
          first: Promise.resolve(),
          registry: null,
          state: null
        };
        let restorer = new InstanceRestorer(options);
        expect(restorer).to.be.an(InstanceRestorer);
      });

    });

  });

});
