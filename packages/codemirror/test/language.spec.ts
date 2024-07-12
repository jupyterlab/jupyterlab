// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { EditorLanguageRegistry } from '@jupyterlab/codemirror';

import { foo } from './foolanguage';

describe('@jupyterlab/codemirror', () => {
  describe('EditorLanguageRegistry', () => {
    let languages: EditorLanguageRegistry;

    beforeEach(() => {
      languages = new EditorLanguageRegistry();
      languages.addLanguage({
        name: 'foo',
        mime: 'text/foo',
        load: () => Promise.resolve(foo())
      });
    });

    describe('#getLanguage', () => {
      it('should get a non-empty list of spec', () => {
        const specs = languages.getLanguages();
        expect(specs.length).toBeTruthy();
      });

      it('should load a defined spec', async () => {
        const spec = (await languages.getLanguage('text/foo'))!;
        expect(spec.name).toBe('foo');
      });

      it('should load a bundled spec', async () => {
        for (const language of EditorLanguageRegistry.getDefaultLanguages().filter(
          spec => spec.name === 'JSON'
        )) {
          languages.addLanguage(language);
        }
        const spec = (await languages.getLanguage('application/json'))!;
        expect(spec.name).toBe('JSON');
      });

      it('should default to null', async () => {
        const spec = (await languages.getLanguage('this is not a mode'))!;
        expect(spec.name).toBe('none');
      });
    });

    describe('#highlight', () => {
      it('should load a defined spec', async () => {
        const container = document.createElement('pre');
        await languages.highlight(
          `(defun check-login (name password) ; absolutely secure
      (if (equal name "admin")
        (equal password "12345")
        #t))`,
          languages.findBest('text/foo'),
          container
        );
        expect(container.innerHTML).toEqual(
          `<span class="ͼ19">(</span>defun check-login <span class="ͼ19">(</span>name password<span class="ͼ19">)</span> <span class="ͼ11">; absolutely secure</span>
      <span class="ͼ19">(</span>if <span class="ͼ19">(</span>equal name <span class="ͼ12">"admin"</span><span class="ͼ19">)</span>
        <span class="ͼ19">(</span>equal password <span class="ͼ12">"12345"</span><span class="ͼ19">)</span>
        <span class="ͼ1d">#t</span><span class="ͼ19">)</span><span class="ͼ19">)</span>`
        );
      });
    });
  });
});
