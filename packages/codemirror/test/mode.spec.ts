// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Mode } from '@jupyterlab/codemirror';

import { foo } from './foolanguage';

describe('Mode', () => {
  beforeAll(() => {
    Mode.registerModeInfo({
      name: 'foo',
      mime: 'text/foo',
      load: () => Promise.resolve(foo())
    });
  });

  describe('#ensure', () => {
    it('should get a non-empty list of spec', () => {
      const specs = Mode.getModeInfo();
      expect(specs.length).toBeTruthy();
    });

    it('should load a defined spec', async () => {
      const spec = (await Mode.ensure('text/foo'))!;
      expect(spec.name).toBe('foo');
    });

    it('should load a bundled spec', async () => {
      const spec = (await Mode.ensure('application/json'))!;
      expect(spec.name).toBe('JSON');
    });

    it('should default to null', async () => {
      const spec = (await Mode.ensure('this is not a mode'))!;
      expect(spec).toBe(null);
    });
  });

  describe('#run', () => {
    it('should load a defined spec', async () => {
      const spec = await Mode.ensure('text/foo');

      const container = document.createElement('pre');
      Mode.run(
        `(defun check-login (name password) ; absolutely secure
      (if (equal name "admin")
        (equal password "12345")
        #t))`,
        spec!,
        container
      );
      expect(container.innerHTML).toEqual(
        `<span class="ͼ18">(</span><span class="ͼt">defun</span> <span class="ͼt">check-login</span> <span class="ͼ18">(</span><span class="ͼt">name</span> <span class="ͼt">password</span><span class="ͼ18">)</span> <span class="ͼy">; absolutely secure</span>
      <span class="ͼ18">(</span><span class="ͼt">if</span> <span class="ͼ18">(</span><span class="ͼt">equal</span> <span class="ͼt">name</span> <span class="ͼz">"admin"</span><span class="ͼ18">)</span>
        <span class="ͼ18">(</span><span class="ͼt">equal</span> <span class="ͼt">password</span> <span class="ͼz">"12345"</span><span class="ͼ18">)</span>
        #t<span class="ͼ18">)</span><span class="ͼ18">)</span>`
      );
    });
  });
});
