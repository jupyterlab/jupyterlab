// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Sanitizer } from '@jupyterlab/apputils';
import { EditorLanguageRegistry } from '@jupyterlab/codemirror';
import { MathJaxTypesetter } from '@jupyterlab/mathjax-extension';
import { createMarkdownParser } from '@jupyterlab/markedparser-extension';
import {
  MimeModel,
  RenderMimeRegistry,
  standardRendererFactories
} from '@jupyterlab/rendermime';
import type { Widget } from '@lumino/widgets';

/**
 * End-to-end test of per-renderer `$` inline math handling.
 *
 * Unlike the unit tests (which mock either the typesetter or the parser), this
 * exercises the real Markdown parser (marked) and the real MathJax typesetter
 * together through a `RenderMimeRegistry`, the same path the application uses.
 */
describe('@jupyterlab/rendermime', () => {
  describe('RenderMimeRegistry latexTypesetter', () => {
    const markdownParser = createMarkdownParser(new EditorLanguageRegistry());
    const sanitizer = new Sanitizer();

    async function render(
      source: string,
      typesetter: MathJaxTypesetter
    ): Promise<Widget> {
      const registry = new RenderMimeRegistry({
        initialFactories: standardRendererFactories,
        markdownParser,
        latexTypesetter: typesetter,
        sanitizer
      });
      const widget = registry.createRenderer('text/markdown');
      // Render (which runs `removeMath` with the typesetter's `mathParseOptions`)
      // then typeset explicitly so the assertions are deterministic; the widget
      // otherwise typesets asynchronously on attach.
      await widget.renderModel(
        new MimeModel({ trusted: true, data: { 'text/markdown': source } })
      );
      await typesetter.typeset(widget.node);
      return widget;
    }

    it('should render `$` literally with a dollar-disabled typesetter', async () => {
      const widget = await render(
        'You owe me $5 and $10.',
        new MathJaxTypesetter({ dollarInlineMath: false })
      );
      expect(widget.node.textContent).toContain('$5 and $10');
      expect(widget.node.querySelector('mjx-container')).toBeNull();
      widget.dispose();
    });

    it('should typeset `$...$` with the default typesetter', async () => {
      const widget = await render(
        'The value $x$ is unknown.',
        new MathJaxTypesetter()
      );
      expect(widget.node.querySelector('mjx-container')).not.toBeNull();
      widget.dispose();
    });

    it('should allow deriving a dollar-disabled typesetter with `withParseOptions`', async () => {
      // The flow extensions are expected to use: derive a typesetter from the
      // one the registry provides, rather than hard-coding `MathJaxTypesetter`.
      const registry = new RenderMimeRegistry({
        initialFactories: standardRendererFactories,
        markdownParser,
        latexTypesetter: new MathJaxTypesetter(),
        sanitizer
      });
      const original = registry.latexTypesetter!;
      const latexTypesetter =
        original.withParseOptions?.({ dollarInlineMath: false }) ?? original;
      const widget = registry
        .clone({ latexTypesetter })
        .createRenderer('text/markdown');
      await widget.renderModel(
        new MimeModel({
          trusted: true,
          data: { 'text/markdown': 'You owe me $5 and $10.' }
        })
      );
      await latexTypesetter.typeset(widget.node);
      expect(widget.node.textContent).toContain('$5 and $10');
      expect(widget.node.querySelector('mjx-container')).toBeNull();
      widget.dispose();
    });

    it('should keep `$$...$$` display math with a dollar-disabled typesetter', async () => {
      const widget = await render(
        'Display: $$x = 5$$',
        new MathJaxTypesetter({ dollarInlineMath: false })
      );
      expect(widget.node.querySelector('mjx-container')).not.toBeNull();
      widget.dispose();
    });
  });
});
