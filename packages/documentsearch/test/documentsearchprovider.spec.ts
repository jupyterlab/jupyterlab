// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import {
  FOUND_CLASSES,
  GenericSearchProvider,
  HTMLSearchEngine
} from '@jupyterlab/documentsearch';
import { Widget } from '@lumino/widgets';

const MATCH_CLASSES = FOUND_CLASSES.join(' ');

function mark(text: string): string {
  return `<mark class="${MATCH_CLASSES}">${text}</mark>`;
}

/**
 * The DOM of `$x = 10$` typeset by MathJax: a text node per character, a line
 * break opportunity after x, and the hidden MathML copy.
 */
function formula(x = '𝑥', equals = '=', one = '1', zero = '0'): string {
  return (
    '<mjx-container class="MathJax" jax="CHTML"><mjx-math aria-hidden="true">' +
    `<mjx-mi><mjx-c>${x}</mjx-c></mjx-mi><mjx-break> </mjx-break>` +
    `<mjx-mo><mjx-c>${equals}</mjx-c></mjx-mo>` +
    `<mjx-mn><mjx-c>${one}</mjx-c><mjx-c>${zero}</mjx-c></mjx-mn></mjx-math>` +
    '<mjx-assistive-mml><math><mi>x</mi><mo>=</mo><mn>10</mn></math>' +
    '</mjx-assistive-mml></mjx-container>'
  );
}

/**
 * The DOM of `$\sin x$` typeset by MathJax, with the invisible function
 * application after `sin`.
 */
const FUNCTION_FORMULA =
  '<mjx-container class="MathJax" jax="CHTML"><mjx-math aria-hidden="true">' +
  '<mjx-mi><mjx-c>s</mjx-c><mjx-c>i</mjx-c><mjx-c>n</mjx-c></mjx-mi>' +
  '<mjx-mo><mjx-c>\u2061</mjx-c></mjx-mo><mjx-mi><mjx-c>𝑥</mjx-c></mjx-mi>' +
  '</mjx-math></mjx-container>';

/**
 * The DOM of `$\sin(x)$` typeset by MathJax, with the invisible function
 * application between `sin` and the parenthesis.
 */
const APPLIED_FUNCTION_FORMULA =
  '<mjx-container class="MathJax" jax="CHTML"><mjx-math aria-hidden="true">' +
  '<mjx-mi><mjx-c>s</mjx-c><mjx-c>i</mjx-c><mjx-c>n</mjx-c></mjx-mi>' +
  '<mjx-mo><mjx-c>\u2061</mjx-c></mjx-mo><mjx-mo><mjx-c>(</mjx-c></mjx-mo>' +
  '<mjx-mi><mjx-c>𝑥</mjx-c></mjx-mi><mjx-mo><mjx-c>)</mjx-c></mjx-mo>' +
  '</mjx-math></mjx-container>';

/**
 * The DOM of `$1, \ldots, n$` typeset by MathJax, whose ellipsis becomes
 * three dots when normalized.
 */
const ELLIPSIS_FORMULA =
  '<mjx-container class="MathJax" jax="CHTML"><mjx-math aria-hidden="true">' +
  '<mjx-mn><mjx-c>1</mjx-c></mjx-mn><mjx-mo><mjx-c>,</mjx-c></mjx-mo>' +
  '<mjx-mo><mjx-c>…</mjx-c></mjx-mo><mjx-mo><mjx-c>,</mjx-c></mjx-mo>' +
  '<mjx-mi><mjx-c>𝑛</mjx-c></mjx-mi></mjx-math></mjx-container>';

/**
 * The DOM of `$\text{ＡＡ}$` typeset by MathJax, which puts characters that
 * its font lacks in one text node.
 */
const TEXT_RUN_FORMULA =
  '<mjx-container class="MathJax" jax="CHTML"><mjx-math aria-hidden="true">' +
  '<mjx-mtext><mjx-utext>ＡＡ</mjx-utext></mjx-mtext></mjx-math>' +
  '</mjx-container>';

describe('documentsearch/genericsearchprovider', () => {
  describe('HTMLSearchEngine', () => {
    describe('#search()', () => {
      it('should list the text nodes of a match in a formula', async () => {
        const node = document.createElement('div');
        node.innerHTML = `<p>${formula()}</p>`;
        const matches = await HTMLSearchEngine.search(/10/g, node);
        expect(
          matches.map(match => match.parts?.map(part => part.text))
        ).toEqual([['1', '0']]);
      });
    });
  });

  describe('GenericSearchProvider', () => {
    let provider: GenericSearchProvider;
    let widget: Widget;

    beforeEach(() => {
      widget = new Widget();
      provider = new GenericSearchProvider(widget);
    });

    afterEach(async () => {
      widget.dispose();
    });

    describe('#preserveCase()', () => {
      it.each([
        ['OLD_TEXT_1', 'new_text_1', 'NEW_TEXT_1'],
        ['OLD_TEXT_1', 'NEW_TEXT_1', 'NEW_TEXT_1'],
        ['old_text_1', 'new_text_1', 'new_text_1'],
        ['old_text_1', 'NEW_TEXT_1', 'new_text_1'],
        ['Old', 'new', 'New'],
        ['Old', '𐐶ew', '𐐎ew']
      ])(
        'should copy case from %s to %s yielding %s',
        (oldText, newText, expected) => {
          const replace = GenericSearchProvider.preserveCase(oldText, newText);
          expect(replace).toEqual(expected);
        }
      );
    });

    describe('#startQuery()', () => {
      it.each([
        [/x/, '<pre>xyz</pre>', `<mark class="${MATCH_CLASSES}">x</mark>yz`],
        [/y/, '<pre>xyz</pre>', `x<mark class="${MATCH_CLASSES}">y</mark>z`],
        [/z/, '<pre>xyz</pre>', `xy<mark class="${MATCH_CLASSES}">z</mark>`],
        [
          /x/,
          '<pre><span>x</span>yz</pre>',
          `<span><mark class="${MATCH_CLASSES}">x</mark></span>yz`
        ],
        [
          /y/,
          '<pre><span>x</span>yz</pre>',
          `<span>x</span><mark class="${MATCH_CLASSES}">y</mark>z`
        ],
        [
          /z/,
          '<pre><span>x</span>yz</pre>',
          `<span>x</span>y<mark class="${MATCH_CLASSES}">z</mark>`
        ],
        [
          /x/,
          '<pre>x<span>y</span>z</pre>',
          `<mark class="${MATCH_CLASSES}">x</mark><span>y</span>z`
        ],
        [
          /y/,
          '<pre>x<span>y</span>z</pre>',
          `x<span><mark class="${MATCH_CLASSES}">y</mark></span>z`
        ],
        [
          /z/,
          '<pre>x<span>y</span>z</pre>',
          `x<span>y</span><mark class="${MATCH_CLASSES}">z</mark>`
        ],
        [
          /x/,
          '<pre>xy<span>z</span></pre>',
          `<mark class="${MATCH_CLASSES}">x</mark>y<span>z</span>`
        ],
        [
          /y/,
          '<pre>xy<span>z</span></pre>',
          `x<mark class="${MATCH_CLASSES}">y</mark><span>z</span>`
        ],
        [
          /z/,
          '<pre>xy<span>z</span></pre>',
          `xy<span><mark class="${MATCH_CLASSES}">z</mark></span>`
        ]
      ])(
        'should highlight %s fragment in %s',
        async (query, content, expected) => {
          widget.node.innerHTML = content;
          await provider.startQuery(query);
          expect(widget.node.firstElementChild!.innerHTML).toEqual(expected);
        }
      );

      it.each([
        [/z/, '<pre><svg>z</svg></pre>'],
        [/y/, '<pre><svg><text>y</text></svg></pre>'],
        [/x/, '<pre><svg><text x="5" y="15" fill="red">x</text></svg></pre>'],
        [
          /1/,
          '<pre><mjx-assistive-mml><math><mn>1</mn></math></mjx-assistive-mml></pre>'
        ]
      ])(
        'should ignore %s in unsupported fragment %s',
        async (query, content) => {
          widget.node.innerHTML = content;
          await provider.startQuery(query);
          expect(widget.node.innerHTML).toEqual(content);
        }
      );

      it.each([
        [/10/, formula('𝑥', '=', mark('1'), mark('0'))],
        [/x/i, formula(mark('𝑥'))],
        [/x=10/, formula(mark('𝑥'), mark('='), mark('1'), mark('0'))]
      ])('should highlight %s in a formula', async (query, expected) => {
        widget.node.innerHTML = `<p>${formula()}</p>`;
        await provider.startQuery(query);
        expect(widget.node.firstElementChild!.innerHTML).toEqual(expected);
      });

      it('should count a match that spans several text nodes once', async () => {
        widget.node.innerHTML = `<p>${formula()}</p>`;
        await provider.startQuery(/10/);
        expect(provider.matchesCount).toBe(1);
      });

      it('should find a function name in a formula as a whole word', async () => {
        widget.node.innerHTML = `<p>${FUNCTION_FORMULA}</p>`;
        await provider.startQuery(/\bsin\b/);
        expect(provider.matchesCount).toBe(1);
      });

      it('should find a function applied to a parenthesis in a formula', async () => {
        widget.node.innerHTML = `<p>${APPLIED_FUNCTION_FORMULA}</p>`;
        await provider.startQuery(/sin\(x\)/);
        expect(provider.matchesCount).toBe(1);
      });

      it('should highlight each character of a text node of a formula', async () => {
        widget.node.innerHTML = `<p>${TEXT_RUN_FORMULA}</p>`;
        await provider.startQuery(/a/i);
        expect(widget.node.querySelector('mjx-utext')!.innerHTML).toEqual(
          mark('Ａ') + mark('Ａ')
        );
      });

      it('should count the dots of an ellipsis in a formula as one match', async () => {
        widget.node.innerHTML = `<p>${ELLIPSIS_FORMULA}</p>`;
        await provider.startQuery(/\./);
        expect(provider.matchesCount).toBe(1);
      });
    });

    describe('#highlightNext()', () => {
      it('should select every text node of the current match', async () => {
        widget.node.innerHTML = `<p>${formula()}</p>`;
        await provider.startQuery(/10/);
        await provider.highlightNext();
        const selected = Array.from(widget.node.querySelectorAll('mark'), m =>
          m.classList.contains('jp-current-match')
        );
        expect(selected).toEqual([true, true]);
      });
    });

    describe('#endQuery()', () => {
      it.each([
        [/x/, '<pre>xyz</pre>'],
        [/y/, '<pre>xyz</pre>'],
        [/z/, '<pre>xyz</pre>'],
        [/x/, '<pre><span>x</span>yz</pre>'],
        [/y/, '<pre><span>x</span>yz</pre>'],
        [/z/, '<pre><span>x</span>yz</pre>'],
        [/x/, '<pre>x<span>y</span>z</pre>'],
        [/y/, '<pre>x<span>y</span>z</pre>'],
        [/z/, '<pre>x<span>y</span>z</pre>'],
        [/x/, '<pre>xy<span>z</span></pre>'],
        [/y/, '<pre>xy<span>z</span></pre>'],
        [/z/, '<pre>xy<span>z</span></pre>'],
        [/10/, `<p>${formula()}</p>`],
        [/x=10/, `<p>${formula()}</p>`],
        [/a/i, `<p>${TEXT_RUN_FORMULA}</p>`],
        [/\./, `<p>${ELLIPSIS_FORMULA}</p>`],
        [/sin\(x\)/, `<p>${APPLIED_FUNCTION_FORMULA}</p>`]
      ])(
        'should restore highlighted %s fragment in %s',
        async (query, content) => {
          widget.node.innerHTML = content;
          await provider.startQuery(query);
          await provider.endQuery();
          expect(widget.node.innerHTML).toEqual(content);
        }
      );
    });
  });
});
