// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PageConfig } from '@jupyterlab/coreutils';

describe('@jupyterlab/coreutils', () => {
  describe('PageConfig', () => {
    beforeEach(() => {
      PageConfig.setOption('foo', 'bar');
      PageConfig.setOption('workspace', PageConfig.defaultWorkspace);
    });

    describe('#getOption()', () => {
      it('should get a known option', () => {
        expect(PageConfig.getOption('foo')).toBe('bar');
      });

      it('should return an empty string for an unknown option', () => {
        expect(PageConfig.getOption('bar')).toBe('');
      });
    });

    describe('#setOption()', () => {
      it('should get last option value and set it to the passed value', () => {
        expect(PageConfig.setOption('foo', 'bar1')).toBe('bar');
      });

      it('should get a known option', () => {
        expect(PageConfig.getOption('foo')).toBe('bar');
      });

      it('should add a new option', () => {
        expect(PageConfig.setOption('bar', 'foo')).toBe('');
      });

      it('should get a different known option', () => {
        expect(PageConfig.getOption('bar')).toBe('foo');
      });
    });

    describe('#getBaseUrl()', () => {
      it('should get the base url of the page', () => {
        // The value was passed as a command line arg.
        expect(PageConfig.getBaseUrl()).toContain('http://localhost');
      });
    });

    describe('#getWsUrl()', () => {
      it('should get the base ws url of the page', () => {
        // The value was passed as a command line arg.
        const expected = 'ws' + PageConfig.getBaseUrl().slice(4);
        expect(PageConfig.getWsUrl()).toBe(expected);
      });

      it('should handle a good base url', () => {
        const url = 'http://foo.com';
        expect(PageConfig.getWsUrl(url)).toBe('ws://foo.com/');
      });

      it('should be an empty string for a bad base url', () => {
        const url = 'blargh://foo.com';
        expect(PageConfig.getWsUrl(url)).toBe('');
      });
    });

    describe('#getUrl()', () => {
      const path = '/path/to/file.ext';

      it('should return shortest url by default', () => {
        const url = PageConfig.getUrl({});
        expect(url).toEqual('http://localhost/lab');
      });

      it('should return a local shareable url if shareUrl is undefined', () => {
        const url = PageConfig.getUrl({
          workspace: PageConfig.defaultWorkspace,
          treePath: path,
          toShare: true
        });

        expect(url).toEqual(`http://localhost/lab/tree${path}`);
      });

      describe('hub environment', () => {
        const shareUrl = 'http://hub.host.lab/hub/user-redirect';

        beforeEach(() => {
          PageConfig.setOption('shareUrl', shareUrl);
        });

        it('should return a non-local shareable url if shareUrl is defined', () => {
          const url = PageConfig.getUrl({
            workspace: PageConfig.defaultWorkspace,
            treePath: path,
            toShare: true
          });

          expect(url).toEqual(`${shareUrl}/lab/tree${path}`);
        });
      });
    });
  });
});
