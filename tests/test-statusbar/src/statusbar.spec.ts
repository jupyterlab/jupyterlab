// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { StatusBar } from '@jupyterlab/statusbar/src';

describe('@jupyterlab/statusbar', () => {
  describe('StatusBar', () => {
    let statusBar: StatusBar;

    beforeEach(() => {
      statusBar = new StatusBar();
    });

    afterEach(() => {
      statusBar.dispose();
    });

    describe('#constructor()', () => {
      it('should construct a new status bar', () => {
        const statusBar = new StatusBar();
        expect(statusBar).to.be.an.instanceof(StatusBar);
      });
    });
  });
});
