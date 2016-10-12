// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  InstanceTracker
} from '../../../lib/common/instancetracker';


describe('common/instancetracker', () => {

  describe('InstanceTracker', () => {

    describe('#constructor()', () => {

      it('should create an InstanceTracker', () => {
        let tracker = new InstanceTracker();
        expect(tracker).to.be.an(InstanceTracker);
      });

    });

  });

});
