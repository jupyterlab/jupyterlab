// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  expect
} from 'chai';

import {
  PathExt
} from '@jupyterlab/coreutils';


const TESTPATH = 'foo/test/simple/test-path.js';


describe('@jupyterlab/coreutils', () => {

  describe('PathExt', () => {

    describe('.join()', () => {

      it('should join the arguments and normalize the path', () => {
        let path = PathExt.join('foo', '../../../bar');
        expect(path).to.equal('../../bar');
      });

    });

    describe('.basename()', () => {

      it('should return the last portion of a path', () => {
        expect(PathExt.basename(TESTPATH)).to.equal('test-path.js');
      });

    });

    describe('.dirname()', () => {

      it('should get the directory name of a path', () => {
        expect(PathExt.dirname(TESTPATH)).to.equal('foo/test/simple');
      });

      it('should not return "." for an empty path', () => {
        let path = PathExt.dirname('');
        expect(path).to.equal('');
      });

      it('should not return "." for a path in the root directory', () => {
        let path = PathExt.dirname('foo.txt');
        expect(path).to.equal('');
      });

    });

    describe('.extname()', () => {

      it('should get the file extension of the path', () => {
        expect(PathExt.extname(TESTPATH)).to.equal('.js');
      });

      it('should only take the last occurance of a dot', () => {
        expect(PathExt.extname('foo.tar.gz')).to.equal('.gz');
      });

    });

    describe('.normalize()', () => {

      it('should normalize a string path', () => {
        let path = PathExt.normalize('./fixtures///b/../b/c.js');
        expect(path).to.equal('fixtures/b/c.js');
      });

      it('should not return "." for an empty path', () => {
        let path = PathExt.normalize('');
        expect(path).to.equal('');
      });

    });

    describe('.resolve()', () => {

      it('should resolve a sequence of paths to an absolute path on the server', () => {
        let path = PathExt.resolve('var/lib', '../', 'file/');
        expect(path).to.equal('var/file');
      });

    });

    describe('.relative()', () => {

      it('should solve the relative path', () => {
        let path = PathExt.relative('var/lib', 'var/apache');
        expect(path).to.equal('../apache');
      });

    });

    describe('.normalizeExtension()', () => {

      it('should normalize a file extension to be of type `.foo`', () => {
        expect(PathExt.normalizeExtension('foo')).to.equal('.foo');
        expect(PathExt.normalizeExtension('.bar')).to.equal('.bar');
      });

    });

  });

});
