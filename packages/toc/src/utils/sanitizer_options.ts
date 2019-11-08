// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/**
 * Allowed HTML tags and associated attributes for ToC entries when sanitizing HTML headings.
 *
 * ## Notes
 *
 * -   We specifically disallow anchor tags, since we are adding our own.
 *
 * @private
 */
const sanitizerOptions = {
  allowedTags: [
    'p',
    'blockquote',
    'b',
    'i',
    'strong',
    'em',
    'strike',
    'code',
    'br',
    'div',
    'span',
    'pre',
    'del'
  ],
  allowedAttributes: {
    // Allow "class" attribute for <code> tags.
    code: ['class'],
    // Allow "class" attribute for <span> tags.
    span: ['class'],
    // Allow "class" attribute for <div> tags.
    div: ['class'],
    // Allow "class" attribute for <p> tags.
    p: ['class'],
    // Allow "class" attribute for <pre> tags.
    pre: ['class']
  }
};

/**
 * Exports.
 */
export { sanitizerOptions };
