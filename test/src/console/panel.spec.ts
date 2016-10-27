// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Session, utils
} from '@jupyterlab/services';

import {
  CodeMirrorConsoleRenderer
} from '../../../lib/console/codemirror/widget';

import {
  ConsolePanel
} from '../../../lib/console/panel';

import {
  defaultRenderMime
} from '../utils';


const renderer = CodeMirrorConsoleRenderer.defaultRenderer;
const rendermime = defaultRenderMime();


describe('console/panel', () => {

  describe('ConsolePanel', () => {

    describe('#constructor()', () => {

      it('should create a new console panel', done => {
        Session.startNew({ path: utils.uuid() }).then(session => {
          let panel = new ConsolePanel({ renderer, rendermime, session });
          expect(panel).to.be.a(ConsolePanel);
          expect(panel.node.classList).to.contain('jp-ConsolePanel');
          done();
        });
      });

    });

  });

});
