// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  JupyterLab, ModuleLoader
} from '@jupyterlab/application';


describe('JupyterLab', () => {

  let lab: JupyterLab;
  let loader = new ModuleLoader();

  beforeEach(() => {
    lab = new JupyterLab();
  });

  describe('#constructor()', () => {

    it('should create a JupyterLab object', () => {
      expect(lab).to.be.a(JupyterLab);
    });

    it('should accept options', () => {
      lab = new JupyterLab({
        version: 'foo',
        gitDescription: 'foo',
        loader
      });
    });

  });

  describe('#started', () => {

    it('should resolve when the application is started', (done) => {
      lab.started.then(done, done);
      lab.start();
    });

  });

  describe('#info', () => {

    it('should be the info about the application', () => {
      expect(lab.info.version).to.be('unknown');
      expect(lab.info.gitDescription).to.be('unknown');
      lab = new JupyterLab({
        version: 'foo',
        gitDescription: 'foo'
      });
      expect(lab.info.version).to.be('foo');
      expect(lab.info.gitDescription).to.be('foo');
    });

  });

  describe('#loader', () => {

    it('should be the loader used by the application', () => {
      expect(lab.loader).to.be(null);
      lab = new JupyterLab({ loader });
      expect(lab.loader).to.be(loader);
    });

  });

  describe('#start()', () => {

    it('should start the application', (done) => {
      lab.start().then(done, done);
    });

    it('should accept options', (done) => {
      lab.start({ hostID: 'foo' }).then(done, done);
    });

  });

});
