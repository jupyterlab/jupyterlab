// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { defaultSanitizer } from '@jupyterlab/apputils';
import { JSONObject, JSONValue } from '@lumino/coreutils';
import {
  htmlRendererFactory,
  IRenderMime,
  markdownRendererFactory,
  MimeModel,
  textRendererFactory
} from '../src';

function createModel(
  mimeType: string,
  source: JSONValue,
  trusted = false
): IRenderMime.IMimeModel {
  const data: JSONObject = {};
  data[mimeType] = source;
  return new MimeModel({ data, trusted });
}

const sanitizer = defaultSanitizer;
const defaultOptions: any = {
  sanitizer,
  linkHandler: null,
  resolver: null
};

describe('@jupyterlab/rendermime', () => {
  describe('RenderedHTML', () => {
    describe('#renderHighlights', () => {
      const source =
        '<h1>This is great</h1><p>What about <span>that part.</span></p>';
      it.each([
        [[], '<h1>This is great</h1><p>What about <span>that part.</span></p>'],
        [
          [{ text: 'about', position: /about/.exec(source)!.index }],
          '<h1>This is great</h1><p>What <span class="jp-mimeType-highlight">about</span> <span>that part.</span></p>'
        ],
        [
          [{ text: 'This', position: /This/.exec(source)!.index }],
          '<h1><span class="jp-mimeType-highlight">This</span> is great</h1><p>What about <span>that part.</span></p>'
        ],
        [
          [{ text: 'part.', position: /part\./.exec(source)!.index }],
          '<h1>This is great</h1><p>What about <span>that <span class="jp-mimeType-highlight">part.</span></span></p>'
        ]
      ])('should highlight %j', async (highlights, expected) => {
        const f = htmlRendererFactory;
        const mimeType = 'text/html';
        const model = createModel(mimeType, source);
        const w = f.createRenderer({ mimeType, ...defaultOptions });
        await w.renderModel(model);
        w.renderHighlights && (await w.renderHighlights(highlights));
        expect(w.node.innerHTML).toBe(expected);
      });
    });
  });

  describe('RenderedMarkdown', () => {
    describe('#renderHighlights', () => {
      const source = '# This is great\nWhat <span>about that</span> part.';
      it.each([
        [
          [],
          '<h1 id="This-is-great">This is great<a target="_self" href="#This-is-great" class="jp-InternalAnchorLink">¶</a></h1>\n<p>What <span>about that</span> part.</p>\n'
        ],
        [
          [{ text: 'about', position: /about/.exec(source)!.index }],
          '<h1 id="This-is-great">This is great<a target="_self" href="#This-is-great" class="jp-InternalAnchorLink">¶</a></h1>\n<p>What <span><span class="jp-mimeType-highlight">about</span> that</span> part.</p>\n'
        ],
        [
          [{ text: 'This', position: /This/.exec(source)!.index }],
          '<h1 id="This-is-great"><span class="jp-mimeType-highlight">This</span> is great<a target="_self" href="#This-is-great" class="jp-InternalAnchorLink">¶</a></h1>\n<p>What <span>about that</span> part.</p>\n'
        ],
        [
          [{ text: 'part.', position: /part\./.exec(source)!.index }],
          '<h1 id="This-is-great">This is great<a target="_self" href="#This-is-great" class="jp-InternalAnchorLink">¶</a></h1>\n<p>What <span>about that</span> <span class="jp-mimeType-highlight">part.</span></p>\n'
        ]
      ])('should highlight %j', async (highlights, expected) => {
        const f = markdownRendererFactory;
        const mimeType = 'text/markdown';
        const model = createModel(mimeType, source);
        const w = f.createRenderer({ mimeType, ...defaultOptions });
        await w.renderModel(model);
        w.renderHighlights && (await w.renderHighlights(highlights));
        expect(w.node.innerHTML).toBe(expected);
      });
    });
  });

  describe('RenderedText', () => {
    describe('#renderHighlights', () => {
      const source =
        'That should be <span>plain text</span> <script>window.x=1</script> but \x1b[01;41;32mtext\x1b[00m.\nWoo.';
      it.each([
        [
          [],
          '<pre>That should be &lt;span&gt;plain text&lt;/span&gt; &lt;script&gt;window.x=1&lt;/script&gt; but <span class="ansi-green-intense-fg ansi-red-bg ansi-bold">text</span>.\nWoo.</pre>'
        ],
        [
          [
            {
              text: 'plain text',
              position: /plain text/.exec(source)!.index
            }
          ],
          '<pre>That should be &lt;span&gt;<span class="jp-mimeType-highlight">plain text</span>&lt;/span&gt; &lt;script&gt;window.x=1&lt;/script&gt; but <span class="ansi-green-intense-fg ansi-red-bg ansi-bold">text</span>.\nWoo.</pre>'
        ],
        [
          [
            {
              text: 'That',
              position: /That/.exec(source)!.index
            }
          ],
          '<pre><span class="jp-mimeType-highlight">That</span> should be &lt;span&gt;plain text&lt;/span&gt; &lt;script&gt;window.x=1&lt;/script&gt; but <span class="ansi-green-intense-fg ansi-red-bg ansi-bold">text</span>.\nWoo.</pre>'
        ],
        [
          [
            {
              text: 'Woo.',
              position: /Woo\./.exec(source)!.index
            }
          ],
          '<pre>That should be &lt;span&gt;plain text&lt;/span&gt; &lt;script&gt;window.x=1&lt;/script&gt; but <span class="ansi-green-intense-fg ansi-red-bg ansi-bold">text</span>.\n<span class="jp-mimeType-highlight">Woo.</span></pre>'
        ]
      ])('should highlight %j', async (highlights, expected) => {
        const f = textRendererFactory;
        const mimeType = 'text/plain';
        const model = createModel(mimeType, source);
        const w = f.createRenderer({ mimeType, ...defaultOptions });
        await w.renderModel(model);
        w.renderHighlights && (await w.renderHighlights(highlights));
        expect(w.node.innerHTML).toBe(expected);
      });
    });
  });
});
