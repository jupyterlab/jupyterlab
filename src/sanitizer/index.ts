// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as sanitize from 'sanitize-html';

export
class Sanitizer {
  sanitize(dirty: string): string {
    return sanitize(dirty, this._options);
  }

  private _options: sanitize.IOptions = {
    allowedTags: sanitize.defaults.allowedTags.concat('img'),
    transformTags: {
      'a': sanitize.simpleTransform('a', { 'rel': 'nofollow' })
    }
  };
}

export
const defaultSanitizer = new Sanitizer();