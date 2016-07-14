// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import * as sanitize from 'sanitize-html';


/**
 * A class to sanitize HTML strings.
 *
 * #### Notes
 * This class should not ordinarily need to be instantiated by user code.
 * Instead, the `defaultSanitizer` instance should be used.
 */
export
class Sanitizer {
  /**
   * Sanitize an HTML string.
   */
  sanitize(dirty: string): string {
    return sanitize(dirty, this._options);
  }

  private _options: sanitize.IOptions = {
    allowedTags: sanitize.defaults.allowedTags.concat('img'),
    allowedAttributes: {
      // Allow the "rel" attribute for <a> tags.
      'a': sanitize.defaults.allowedAttributes['a'].concat('rel')
    },
    transformTags: {
      // Set the "rel" attribute for <a> tags to "nofollow".
      'a': sanitize.simpleTransform('a', { 'rel': 'nofollow' })
    }
  };
}


/**
 * The default instance of the `Sanitizer` class meant for use by user code.
 */
export
const defaultSanitizer = new Sanitizer();