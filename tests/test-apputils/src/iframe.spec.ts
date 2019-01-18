// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { IFrame } from '@jupyterlab/apputils/src';

describe('@jupyterlab/apputils', () => {
  describe('IFrame', () => {
    describe('#constructor()', () => {
      it('should create a new iframe widget', () => {
        let iframe = new IFrame();
        expect(iframe).to.be.an.instanceof(IFrame);
        expect(iframe.hasClass('jp-IFrame')).to.equal(true);
        expect(iframe.node.querySelector('iframe')).to.be.ok;
      });

      it('should be sandboxed by default', () => {
        let iframe = new IFrame();
        let node = iframe.node.querySelector('iframe')!;
        expect(node.getAttribute('sandbox') !== null).to.equal(true);
      });

      it('should allow sandboxing exceptions to be specified in the options', () => {
        let iframe = new IFrame({
          sandbox: ['allow-scripts', 'allow-same-origin']
        });
        let node = iframe.node.querySelector('iframe')!;
        expect(node.getAttribute('sandbox')).to.equal(
          'allow-scripts allow-same-origin'
        );
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

    describe('#sandbox', () => {
      it('should set the exceptions for the sandbox attribute.', () => {
        let iframe = new IFrame({
          sandbox: ['allow-scripts', 'allow-same-origin']
        });
        let node = iframe.node.querySelector('iframe')!;
        expect(iframe.sandbox).to.deep.equal([
          'allow-scripts',
          'allow-same-origin'
        ]);
        iframe.sandbox = ['allow-pointer-lock'];
        expect(iframe.sandbox).to.deep.equal(['allow-pointer-lock']);
        expect(node.getAttribute('sandbox')).to.equal('allow-pointer-lock');
      });
    });
  });
});
