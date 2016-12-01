// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  ModuleLoader
} from '../../lib/application/loader';


describe('ModuleLoader', () => {

  let loader: ModuleLoader;

  beforeEach(() => {
    loader = new ModuleLoader();
  });

  describe('#extractPlugins()', () => {

    it('should pass for a valid plugin array', () => {
      loader.extractPlugins([{
        id: 'foo',
        activate: () => { /* no-op */ }
      }, {
        id: 'bar',
        activate: () => { /* no-op */ }
      }]);
    });

    it('should pass for a valid plugin', () => {
      loader.extractPlugins({
        id: 'foo',
        activate: () => { /* no-op */ }
      });
    });

    it('should pass for an ES6 default', () => {
      loader.extractPlugins({
        __esModule: true,
        default: {
          id: 'foo',
          activate: () => { /* no-op */ }
        }
      });
    });

    it('should fail if it is an empty array', () => {
      expect(() => { loader.extractPlugins([]); }).to.throwError();
    });

    it('should fail if a plugin is missing an id', () => {
      let activate: () => { /* no-op */ };
      expect(() => { loader.extractPlugins({ activate }); }).to.throwError();
    });

    it('should fail if a plugin is missing an activate function', () => {
      expect(() => { loader.extractPlugins({ id: 'foo' }); }).to.throwError();
    });

  });


});
