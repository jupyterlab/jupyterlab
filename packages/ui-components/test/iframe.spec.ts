// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IFrame } from '@jupyterlab/ui-components';

describe('@jupyterlab/ui-components', () => {
  describe('IFrame', () => {
    describe('#constructor()', () => {
      it('should create a new iframe widget', () => {
        const iframe = new IFrame();
        expect(iframe).toBeInstanceOf(IFrame);
        expect(iframe.hasClass('jp-IFrame')).toBe(true);
        expect(iframe.node.querySelector('iframe')).toBeTruthy();
      });

      it('should be sandboxed by default', () => {
        const iframe = new IFrame();
        const node = iframe.node.querySelector('iframe')!;
        expect(node.getAttribute('sandbox') !== null).toBe(true);
      });

      it('should be have a no-referrer policy by default', () => {
        const iframe = new IFrame();
        const node = iframe.node.querySelector('iframe')!;
        expect(node.getAttribute('referrerpolicy')).toBe('no-referrer');
      });

      it('should allow sandboxing exceptions to be specified in the options', () => {
        const iframe = new IFrame({
          sandbox: ['allow-scripts', 'allow-same-origin']
        });
        const node = iframe.node.querySelector('iframe')!;
        expect(node.getAttribute('sandbox')).toBe(
          'allow-scripts allow-same-origin'
        );
      });

      it('should allow the referrer policy to be specified in the options', () => {
        const iframe = new IFrame({ referrerPolicy: 'unsafe-url' });
        const node = iframe.node.querySelector('iframe')!;
        expect(node.getAttribute('referrerpolicy')).toBe('unsafe-url');
      });
    });

    describe('#url', () => {
      it('should be the url of the iframe', () => {
        const iframe = new IFrame();
        expect(iframe.url).toBe('');
        iframe.url = 'foo';
        expect(iframe.url).toBe('foo');
      });
    });

    describe('#referrerPolicy', () => {
      it('should set the referrer policy for the iframe.', () => {
        const iframe = new IFrame({ referrerPolicy: 'unsafe-url' });
        const node = iframe.node.querySelector('iframe')!;
        expect(iframe.referrerPolicy).toBe('unsafe-url');
        iframe.referrerPolicy = 'origin';
        expect(iframe.referrerPolicy).toBe('origin');
        expect(node.getAttribute('referrerpolicy')).toBe('origin');
      });
    });

    describe('#sandbox', () => {
      it('should set the exceptions for the sandbox attribute.', () => {
        const iframe = new IFrame({
          sandbox: ['allow-scripts', 'allow-same-origin']
        });
        const node = iframe.node.querySelector('iframe')!;
        expect(iframe.sandbox).toEqual(['allow-scripts', 'allow-same-origin']);
        iframe.sandbox = ['allow-pointer-lock'];
        expect(iframe.sandbox).toEqual(['allow-pointer-lock']);
        expect(node.getAttribute('sandbox')).toBe('allow-pointer-lock');
      });
    });
  });
});
