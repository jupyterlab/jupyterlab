// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Mode } from '@jupyterlab/codemirror';

import {
  delimitedIndent,
  foldInside,
  foldNodeProp,
  indentNodeProp,
  LanguageSupport,
  LRLanguage
} from '@codemirror/language';
import { styleTags, tags as t } from '@lezer/highlight';
import { parser } from './foo';

/*
 * Demonstrate registration of new modes using the example at https://github.com/codemirror/lang-example
 * Licensed under MIT License, Copyright (C) 2021 by Marijn Haverbeke <marijnh@gmail.com> and others
 */
let parserWithMetadata = parser.configure({
  props: [
    styleTags({
      Identifier: t.variableName,
      Boolean: t.bool,
      String: t.string,
      LineComment: t.lineComment,
      '( )': t.paren
    }),
    indentNodeProp.add({
      Application: delimitedIndent({ closing: ')', align: false })
    }),
    foldNodeProp.add({
      Application: foldInside
    })
  ]
});

const fooLanguage = LRLanguage.define({
  parser: parserWithMetadata,
  languageData: {
    commentTokens: { line: ';' }
  }
});

function foo() {
  return new LanguageSupport(fooLanguage);
}

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
