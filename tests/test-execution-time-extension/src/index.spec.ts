// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import ExecutionTimePlugin from '@jupyterlab/execution-time-extension';

describe('execution-time-extension', () => {

  describe('ExecutionTimePlugin', () => {
    it('should have an id', () => {
        expect(ExecutionTimePlugin.id).to.be.ok();
      });
  });
});
