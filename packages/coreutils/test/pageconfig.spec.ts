// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import 'jest';

import { PageConfig } from '@jupyterlab/coreutils';

describe('@jupyterlab/coreutils', () => {
  describe('PageConfig', () => {
    beforeEach(() => {
      PageConfig.setOption('foo', 'bar');
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
  });
});
