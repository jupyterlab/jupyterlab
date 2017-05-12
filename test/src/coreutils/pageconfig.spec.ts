// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  expect
} from 'chai';

import {
  PageConfig
} from '@jupyterlab/coreutils';


describe('@jupyterlab/coreutils', () => {

  describe('PageConfig', () => {

    describe('#getOption()', () => {

      it('should get a known option', () => {
        expect(PageConfig.getOption('foo')).to.equal('bar');
      });

      it('should return an empty string for an unknown option', () => {
        expect(PageConfig.getOption('bar')).to.equal('');
      });

    });

    describe('#getBaseUrl()', () => {

      it('should get the base url of the page', () => {
        // The value was passed as a command line arg.
        expect(PageConfig.getBaseUrl()).to.contain('http://localhost');
      });

    });

    describe('#getWsUrl()', () => {

      it('should get the base ws url of the page', () => {
        // The value was passed as a command line arg.
        expect(PageConfig.getWsUrl()).to.contain('ws://localhost');
      });

    });

  });

});
