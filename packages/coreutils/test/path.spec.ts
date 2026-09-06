// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PathExt } from '@jupyterlab/coreutils';

const TESTPATH = 'foo/test/simple/test-path.js';

describe('@jupyterlab/coreutils', () => {
  describe('PathExt', () => {
    describe('.join()', () => {
      it('should join the arguments and normalize the path', () => {
        const path = PathExt.join('foo', '../../../bar');
        expect(path).toBe('../../bar');
      });

      it('should not return "." for an empty path', () => {
        const path = PathExt.join('', '');
        expect(path).toBe('');
      });
    });

    describe('.basename()', () => {
      it('should return the last portion of a path', () => {
        expect(PathExt.basename(TESTPATH)).toBe('test-path.js');
      });
    });

    describe('.dirname()', () => {
      it('should get the directory name of a path', () => {
        expect(PathExt.dirname(TESTPATH)).toBe('foo/test/simple');
      });

      it('should not return "." for an empty path', () => {
        const path = PathExt.dirname('');
        expect(path).toBe('');
      });

      it('should not return "." for a path in the root directory', () => {
        const path = PathExt.dirname('foo.txt');
        expect(path).toBe('');
      });
    });

    describe('.extname()', () => {
      it('should get the file extension of the path', () => {
        expect(PathExt.extname(TESTPATH)).toBe('.js');
      });

      it('should only take the last occurrence of a dot', () => {
        expect(PathExt.extname('foo.tar.gz')).toBe('.gz');
      });
    });

    describe('.normalize()', () => {
      it('should normalize a string path', () => {
        const path = PathExt.normalize('./fixtures///b/../b/c.js');
        expect(path).toBe('fixtures/b/c.js');
      });

      it('should not return "." for an empty path', () => {
        const path = PathExt.normalize('');
        expect(path).toBe('');
      });
    });

    describe('.resolve()', () => {
      it('should resolve a sequence of paths to an absolute path on the server', () => {
        const path = PathExt.resolve('var/src', '../', 'file/');
        expect(path.indexOf('var/file')).not.toBe(-1);
      });
    });

    describe('.relative()', () => {
      it('should solve the relative path', () => {
        const path = PathExt.relative('var/src', 'var/apache');
        expect(path).toBe('../apache');
      });
    });

    describe('.normalizeExtension()', () => {
      it('should normalize a file extension to be of type `.foo`', () => {
        expect(PathExt.normalizeExtension('foo')).toBe('.foo');
        expect(PathExt.normalizeExtension('.bar')).toBe('.bar');
      });
    });
  });
});
