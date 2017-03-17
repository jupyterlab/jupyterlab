// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  expect
} from 'chai';

import {
  uuid
} from '@jupyterlab/coreutils';


describe('@jupyterlab/coreutils', () => {

  describe('uuid()', () => {

    it('should generate a random 32 character hex string', () => {
      let id0 = uuid();
      let id1 = uuid();
      expect(id0.length).to.equal(32);
      expect(id1.length).to.equal(32);
      expect(id0).to.not.equal(id1);
    });

    it('should accept a length', () => {
      let id0 = uuid(10);
      let id1 = uuid(10);
      expect(id0.length).to.equal(10);
      expect(id1.length).to.equal(10);
      expect(id0).to.not.equal(id1);
    });

  });

});
