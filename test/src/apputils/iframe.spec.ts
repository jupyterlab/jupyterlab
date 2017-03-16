// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  expect
} from 'chai';

import {
  IFrameWidget
} from '@jupyterlab/apputils';


describe('@jupyterlab/domutils', () => {

  describe('IFrameWidget', () => {

    describe('#constructor()', () => {

      it('should create a new iframe widget', () => {
        let iframe = new IFrameWidget();
        expect(iframe).to.be.an.instanceof(IFrameWidget);
        expect(iframe.hasClass('jp-IFrameWidget')).to.equal(true);
        expect(iframe.node.querySelector('iframe')).to.be.ok;
      });

    });

    describe('#url', () => {

      it('should be the url of the iframe', () => {
        let iframe = new IFrameWidget();
        expect(iframe.url).to.equal(null);
        iframe.url = 'foo';
        expect(iframe.url).to.equal('foo');
      });

    });

  });

});

