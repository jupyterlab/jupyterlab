// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import * as sanitize from 'sanitize-html';


export
interface ISanitizer {
  /**
   * Sanitize an HTML string.
   */
  sanitize(dirty: string): string;
}


/**
 * A class to sanitize HTML strings.
 */
class Sanitizer implements ISanitizer {
  /**
   * Sanitize an HTML string.
   */
  sanitize(dirty: string): string {
    return sanitize(dirty, this._options);
  }

  private _options: sanitize.IOptions = {
    allowedTags: sanitize.defaults.allowedTags
      .concat('svg', 'h1', 'h2', 'img', 'span'),
    allowedAttributes: {
      // Allow the "rel" attribute for <a> tags.
      'a': sanitize.defaults.allowedAttributes['a'].concat('rel'),
      // Allow the "src" attribute for <img> tags.
      'img': ['src', 'height', 'width', 'alt'],
      // Allow "class" attribute for <code> tags.
      'code': ['class'],
      // Allow "class" attribute for <span> tags.
      'span': ['class']
    },
    transformTags: {
      // Set the "rel" attribute for <a> tags to "nofollow".
      'a': sanitize.simpleTransform('a', { 'rel': 'nofollow' })
    }
  };
}


/**
 * The default instance of an `ISanitizer` meant for use by user code.
 */
export
const defaultSanitizer: ISanitizer = new Sanitizer();
