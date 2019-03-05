// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { Poll } from '@jupyterlab/coreutils/src';

describe('Poll', () => {
  let poll: Poll | null;

  afterEach(() => {
    poll.dispose();
    poll = null;
  });

  describe('#constructor()', () => {
    it('should create a poll', () => {
      poll = new Poll({
        interval: 1000,
        factory: () => Promise.resolve(),
        when: new Promise(() => undefined) // Never.
      });
      expect(poll).to.be.an.instanceof(Poll);
    });
  });
});
