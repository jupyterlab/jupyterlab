// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  expect
} from 'chai';

import {
  IFrame
} from '@jupyterlab/apputils';


describe('@jupyterlab/domutils', () => {

  describe('IFrame', () => {

    describe('#constructor()', () => {

      it('should create a new iframe widget', () => {
        let iframe = new IFrame();
        expect(iframe).to.be.an.instanceof(IFrame);
        expect(iframe.hasClass('jp-IFrame')).to.equal(true);
        expect(iframe.node.querySelector('iframe')).to.be.ok;
      });

    });

    describe('#url', () => {

      it('should be the url of the iframe', () => {
        let iframe = new IFrame();
        expect(iframe.url).to.equal('');
        iframe.url = 'foo';
        expect(iframe.url).to.equal('foo');
      });

    });

  });

});

