// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import 'jest';

import CodeMirror from 'codemirror';

import { Mode } from '@jupyterlab/codemirror';

function fakeMode(name: string) {
  return {
    mode: name,
    ext: [name],
    mime: `text/${name}`,
    name: name.toUpperCase()
  };
}

describe('Mode', () => {
  describe('#ensure', () => {
    it('should load a defined spec', async () => {
      CodeMirror.modeInfo.push(fakeMode('foo'));
      CodeMirror.defineMode('foo', () => {
        return {};
      });
      const spec = (await Mode.ensure('text/foo'))!;
      expect(spec.name).toBe('FOO');
    });

    it('should load a bundled spec', async () => {
      const spec = (await Mode.ensure('application/json'))!;
      expect(spec.name).toBe('JSON');
    });

    it('should add a spec loader', async () => {
      let called = 0;
      let loaded = 0;

      Mode.addSpecLoader(async spec => {
        called++;
        if (spec.mode !== 'bar') {
          return false;
        }
        loaded++;
        return true;
      }, 42);

      CodeMirror.modeInfo.push(fakeMode('bar'));

      let spec = await Mode.ensure('bar');
      expect(called).toBe(1);
      expect(loaded).toBe(1);
      expect(spec!.name).toBe('BAR');

      spec = await Mode.ensure('python');
      expect(called).toBe(1);
      expect(loaded).toBe(1);

      try {
        spec = await Mode.ensure('APL');
      } catch (err) {
        // apparently one cannot use webpack `require` in jest
      }
      expect(called).toBe(2);
      expect(loaded).toBe(1);
    });

    it('should default to plain text', async () => {
      const spec = (await Mode.ensure('this is not a mode'))!;
      expect(spec.name).toBe('Plain Text');
    });
  });
});
