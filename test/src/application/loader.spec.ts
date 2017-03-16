// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  ModuleLoader
} from '@jupyterlab/application';


describe('ModuleLoader', () => {

  let loader: ModuleLoader;

  beforeEach(() => {
    loader = new ModuleLoader();
  });

  describe('#constructor()', () => {

    it('should create a ModuleLoader object', () => {
      expect(loader).to.be.a(ModuleLoader);
    });

  });

  describe('#define()', () => {

    it('should define a module that can be synchronously required', () => {
      let called = false;
      let callback = (module: any, exports: any, require: any) => {
        called = true;
      };
      loader.define('foo@1.0.1/index.js', callback);
      loader.require('foo@^1.0.1/index.js');
      expect(called).to.be(true);
    });

    it('should be a no-op if the path is already registered', () => {
      let called0 = false;
      let called1 = false;
      let callback0 = (module: any, exports: any, require: any) => {
        called0 = true;
      };
      let callback1 = (module: any, exports: any, require: any) => {
        called1 = true;
      };
      loader.define('foo@1.0.1/index.js', callback0);
      loader.define('foo@1.0.1/index.js', callback1);
      loader.require('foo@^1.0.1/index.js');
      expect(called0).to.be(true);
      expect(called1).to.be(false);
    });

  });

  describe('#require()', () => {

    it('should synchronously return a module that has already been loaded', () => {
      let callback = (module: any, exports: any, require: any) => {
        module.exports = 'hello';
      };
      loader.define('foo@1.0.1/index.js', callback);
      let value = loader.require('foo@^1.0/index.js');
      expect(value).to.be('hello');
    });

    it('should return the maximally satisfying module', () => {
      let callback0 = (module: any, exports: any, require: any) => {
        module.exports = '1.0.0';
      };
      loader.define('foo@1.0.0/index.js', callback0);
      let callback1 = (module: any, exports: any, require: any) => {
        module.exports = '1.0.1';
      };
      loader.define('foo@1.0.1/index.js', callback1);
      let value = loader.require('foo@^1.0/index.js');
      expect(value).to.be('1.0.1');
    });

    it('should throw an error if the required module is not found', () => {
      expect(() => { loader.require('foo@^1.0/index.js'); }).to.throwError();
      let callback = (module: any, exports: any, require: any) => {
        module.exports = 'hello';
      };
      loader.define('foo@1.0.1/index.js', callback);
      expect(() => { loader.require('foo@^1.0.2/index.js'); }).to.throwError();
    });

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
