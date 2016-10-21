// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  utils, Session
} from '@jupyterlab/services';

import {
  CodeMirrorConsoleRenderer
} from '../../../lib/console/codemirror/widget';

import {
  ConsoleContent
} from '../../../lib/console/content';

import {
  defaultRenderMime
} from '../utils';


const rendermime = defaultRenderMime();
const renderer = CodeMirrorConsoleRenderer.defaultRenderer;


describe('console/content', () => {

  describe('ConsoleContent', () => {

    describe('#constructor()', () => {

      it('should create a new console content widget', done => {
        Session.startNew({ path: utils.uuid() }).then(session => {
          let content = new ConsoleContent({ renderer, rendermime, session });
          expect(content).to.be.a(ConsoleContent);
          done();
        });
      });

    });

    // describe('#isDisposed', () => {

    //   it('should get whether the object is disposed', () => {
    //     let history = new ConsoleHistory();
    //     expect(history.isDisposed).to.be(false);
    //     history.dispose();
    //     expect(history.isDisposed).to.be(true);
    //   });

    // });

    // describe('#dispose()', () => {

    //   it('should dispose the history object', () => {
    //     let history = new ConsoleHistory();
    //     expect(history.isDisposed).to.be(false);
    //     history.dispose();
    //     expect(history.isDisposed).to.be(true);
    //   });

    //   it('should be safe to dispose multiple times', () => {
    //     let history = new ConsoleHistory();
    //     expect(history.isDisposed).to.be(false);
    //     history.dispose();
    //     history.dispose();
    //     expect(history.isDisposed).to.be(true);
    //   });

    // });

  });

});
