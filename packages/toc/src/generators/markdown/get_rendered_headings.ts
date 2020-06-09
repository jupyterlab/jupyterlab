// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISanitizer } from '@jupyterlab/apputils';
import { INumberingDictionary } from '../../utils/numbering_dictionary';
import { INumberedHeading } from '../../utils/headings';
import { generateNumbering } from '../../utils/generate_numbering';
import { sanitizerOptions } from '../../utils/sanitizer_options';

/**
 * Returns a "click" handler.
 *
 * @private
 * @param heading - heading element
 * @returns "click" handler
 */
function onClick(heading: Element) {
  return () => {
    heading.scrollIntoView();
  };
}

/**
 * Processes an HTML element containing rendered Markdown and returns a list of headings.
 *
 * @private
 * @param node - HTML element
 * @param sanitizer - HTML sanitizer
 * @param dict - numbering dictionary
 * @param numbering - boolean indicating whether to enable numbering
 * @returns list of headings
 */
function getRenderedHeadings(
  node: HTMLElement,
  sanitizer: ISanitizer,
  dict: INumberingDictionary,
  numbering = true
): INumberedHeading[] {
  let nodes = node.querySelectorAll('h1, h2, h3, h4, h5, h6');
  let headings: INumberedHeading[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const heading = nodes[i];
    const level = parseInt(heading.tagName[1], 10);
    let text = heading.textContent ? heading.textContent : '';
    let hide = !numbering;

    // Show/hide numbering DOM element based on user settings:
    if (heading.getElementsByClassName('numbering-entry').length > 0) {
      heading.removeChild(heading.getElementsByClassName('numbering-entry')[0]);
    }
    let html = sanitizer.sanitize(heading.innerHTML, sanitizerOptions);
    html = html.replace('¶', ''); // remove the anchor symbol

    // Generate a numbering string:
    let nstr = generateNumbering(dict, level);

    // Generate the numbering DOM element:
    let nhtml = '';
    if (!hide) {
      nhtml = '<span class="numbering-entry">' + nstr + '</span>';
    }
    // Append the numbering element to the document:
    heading.innerHTML = nhtml + html;

    headings.push({
      level,
      text: text.replace('¶', ''),
      numbering: nstr,
      html,
      onClick: onClick(heading)
    });
  }
  return headings;
}

/**
 * Exports.
 */
export { getRenderedHeadings };
