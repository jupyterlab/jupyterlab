// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISanitizer } from '@jupyterlab/apputils';
import { Cell } from '@jupyterlab/cells';
import { generateNumbering } from '../../utils/generate_numbering';
import { INotebookHeading, RunningStatus } from '../../utils/headings';
import { INumberingDictionary } from '../../utils/numbering_dictionary';
import { sanitizerOptions } from '../../utils/sanitizer_options';

/**
 * Returns a "click" handler.
 *
 * @private
 * @param el - HTML element
 * @returns "click" handler
 */
type onClickFactory = (el: Element) => () => void;

/**
 * Returns a notebook heading from an HTML element.
 *
 * @private
 * @param node - HTML element
 * @param onClick - callback which returns a "click" handler
 * @param dict - numbering dictionary
 * @param lastLevel - last level
 * @param numbering - boolean indicating whether to enable numbering
 * @param numberingH1 - boolean indicating whether to enable first level headers numbering
 * @param cellRef - cell reference
 * @param index - index of referenced cell relative to other cells in the notebook
 * @returns notebook heading
 */
function getRenderedHTMLHeadings(
  node: HTMLElement,
  onClick: onClickFactory,
  sanitizer: ISanitizer,
  dict: INumberingDictionary,
  lastLevel: number,
  numbering = false,
  numberingH1 = true,
  cellRef: Cell,
  index: number = -1,
  isRunning = RunningStatus.Idle
): INotebookHeading[] {
  let nodes = node.querySelectorAll('h1, h2, h3, h4, h5, h6, p');

  if (index === -1) {
    console.warn(
      'Deprecation warning! index argument will become mandatory in the next version'
    );
  }
  let headings: INotebookHeading[] = [];
  for (const el of nodes) {
    if (el.classList.contains('jp-toc-ignore')) {
      // skip this element if a special class name is included
      continue;
    }
    if (el.nodeName.toLowerCase() === 'p') {
      if (el.innerHTML) {
        let html = sanitizer.sanitize(el.innerHTML, sanitizerOptions);
        headings.push({
          level: lastLevel + 1,
          html: html.replace('¶', ''),
          text: el.textContent ? el.textContent : '',
          onClick: onClick(el),
          type: 'markdown',
          cellRef: cellRef,
          hasChild: false,
          index: index,
          isRunning
        });
      }
      continue;
    }
    if (el.getElementsByClassName('numbering-entry').length > 0) {
      el.removeChild(el.getElementsByClassName('numbering-entry')[0]);
    }
    let html = sanitizer.sanitize(el.innerHTML, sanitizerOptions);
    html = html.replace('¶', '');

    let level = parseInt(el.tagName[1], 10);
    if (!numberingH1) {
      level -= 1;
    }
    let nstr = generateNumbering(dict, level);
    if (numbering) {
      const nhtml = document.createElement('span');
      nhtml.classList.add('numbering-entry');
      nhtml.textContent = nstr ?? '';
      el.insertBefore(nhtml, el.firstChild);
    }
    headings.push({
      level: level,
      text: el.textContent ? el.textContent : '',
      numbering: nstr,
      html: html,
      onClick: onClick(el),
      type: 'header',
      cellRef: cellRef,
      hasChild: false,
      index: index,
      isRunning
    });
  }
  return headings;
}

/**
 * Exports.
 */
export { getRenderedHTMLHeadings };
