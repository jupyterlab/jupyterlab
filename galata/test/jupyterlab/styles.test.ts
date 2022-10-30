// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';

// possibly incomplete (as new tags get added) list of HTML tags as defined in HTML standards (including deprecated elements)
const standardHTMLTags = new Set([
  'a',
  'abbr',
  'address',
  'area',
  'article',
  'aside',
  'audio',
  'b',
  'base',
  'bdi',
  'bdo',
  'blockquote',
  'body',
  'br',
  'button',
  'canvas',
  'caption',
  'cite',
  'code',
  'col',
  'colgroup',
  'data',
  'datalist',
  'dd',
  'del',
  'details',
  'dfn',
  'dialog',
  'div',
  'dl',
  'dt',
  'em',
  'embed',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'head',
  'header',
  'hgroup',
  'hr',
  'html',
  'i',
  'iframe',
  'img',
  'input',
  'ins',
  'kbd',
  'label',
  'legend',
  'li',
  'link',
  'main',
  'map',
  'mark',
  'menu',
  'meta',
  'meter',
  'nav',
  'noscript',
  'object',
  'ol',
  'optgroup',
  'option',
  'output',
  'p',
  'param',
  'picture',
  'pre',
  'progress',
  'q',
  'rp',
  'rt',
  'ruby',
  's',
  'samp',
  'script',
  'section',
  'select',
  'slot',
  'small',
  'source',
  'span',
  'strong',
  'style',
  'sub',
  'summary',
  'sup',
  'table',
  'tbody',
  'td',
  'template',
  'textarea',
  'tfoot',
  'th',
  'thead',
  'time',
  'title',
  'tr',
  'track',
  'u',
  'ul',
  'var',
  'video',
  'wbr'
]);

const fileName = 'notebook.ipynb';

test.describe('CSS Selectors', () => {
  const themes = ['light', 'dark'];
  for (const theme of themes) {
    /** Upon hover event (as of 2022) Chromuim's blink invalidates all elements
     * that match tags in selectors in the format `some-selector:hover some-tag`
     * and `some-selector:hover > some-tag` as analysed in:
     * https://github.com/jupyterlab/jupyterlab/issues/9757#issuecomment-1264399740
     * and reported in:
     * https://bugs.chromium.org/p/chromium/issues/detail?id=1248496
     * Since those cause significant UI lag when many elements of `some-tag` are
     * present we avoid having even a single selector like that, especialy since
     * changing the selector to increase specificity (e.g. replacing `some-tag`
     * with a class) is sufficient to workaround the problem.
     */
    test(`No non-specific selectors after pseudo-class (${theme} theme)`, async ({
      page
    }) => {
      switch (theme) {
        case 'dark':
          await page.theme.setDarkTheme();
          break;
        case 'light':
          await page.theme.setLightTheme();
          break;
        default:
          expect(false);
      }

      // Create a new notebook and add a MathJax 2 element to ensure that
      // we cover MathJax styles which get injected dynamically.
      await page.notebook.createNew(fileName);
      await page.notebook.addCell('markdown', '$test$');
      await page.notebook.runCell(1, true);
      await page.locator('.MathJax').isVisible();

      const detectedTags = new Set(
        await page.evaluate(() =>
          [...document.body.getElementsByTagName('*')].map(element =>
            element.tagName.toLowerCase()
          )
        )
      );
      // We do not rely on present element tags only as outputs in user notebooks may
      // include additional element tags not used by JupyterLab itself; we do not rely on
      // known tags only either, as JupyterLab or extensions may use tags we did not
      // include in the list of known tags.

      const allTags = new Set([...standardHTMLTags, ...detectedTags]);

      const selectors: string[] = await page.style.collectAllSelectors();
      const matcher = new RegExp(
        ':hover.*\\s+(' + [...allTags].join('|') + ')($|\\s)'
      );

      const matchedSelectors: string[] = [];

      for (const selectorGroup of selectors) {
        for (const selector of selectorGroup.split(',')) {
          if (selector.match(matcher)) {
            matchedSelectors.push(selector);
          }
        }
      }

      if (matchedSelectors.length) {
        console.warn(
          'Detected CSS selectors that might cause performance issues in Chromium',
          matchedSelectors
        );
      }
      expect(matchedSelectors).toHaveLength(0);
    });
  }
});
