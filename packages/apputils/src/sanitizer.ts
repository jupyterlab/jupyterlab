// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import sanitize from 'sanitize-html';


export
interface ISanitizer {
  /**
   * Sanitize an HTML string.
   *
   * @param dirty - The dirty text.
   *
   * @param options - The optional sanitization options.
   *
   * @returns The sanitized string.
   */
  sanitize(dirty: string, options?: ISanitizer.IOptions): string;
}


/**
 * The namespace for `ISanitizer` related interfaces.
 */
export
namespace ISanitizer {
  /**
   * The options used to sanitize.
   */
  export
  interface IOptions {
    /**
     * The allowed tags.
     */
    allowedTags?: string[];

    /**
     * The allowed attributes for a given tag.
     */
    allowedAttributes?: { [key: string]: string[] };
  }
}



/**
 * A class to sanitize HTML strings.
 */
class Sanitizer implements ISanitizer {
  /**
   * Sanitize an HTML string.
   *
   * @param dirty - The dirty text.
   *
   * @param options - The optional sanitization options.
   *
   * @returns The sanitized string.
   */
  sanitize(dirty: string, options?: ISanitizer.IOptions): string {
    return sanitize(dirty, { ...this._options, ...options || {} });
  }

  private _options: sanitize.IOptions = {
    allowedTags: sanitize.defaults.allowedTags
      .concat('h1', 'h2', 'img', 'span', 'audio', 'video', 'del',
              'kbd', 'sup', 'sub', 'colspan', 'rowspan', 'input'),
    allowedAttributes: {
      // Allow the "rel" attribute for <a> tags.
      'a': sanitize.defaults.allowedAttributes['a'].concat('rel'),
      // Allow the "src" attribute for <img> tags.
      'img': ['src', 'height', 'width', 'alt'],
      // Allow "type", "disabled", and "checked" attributes for <input> tags.
      'input': ['type', 'disabled', 'checked'],
      // Allow "class" attribute for <code> tags.
      'code': ['class'],
      // Allow "class" attribute for <span> tags.
      'span': ['class'],
      // Allow "class" attribute for <div> tags.
      'div': ['class'],
      // Allow "class" attribute for <p> tags.
      'p': ['class'],
      // Allow "class" attribute for <pre> tags.
      'pre': ['class'],
      // Allow the "src" attribute for <audio> tags.
      'audio': ['src', 'autoplay', 'loop', 'muted', 'controls'],
      // Allow the "src" attribute for <video> tags.
      'video': ['src', 'height', 'width', 'autoplay',
                'loop', 'muted', 'controls']
    },
    transformTags: {
      // Set the "rel" attribute for <a> tags to "nofollow".
      'a': sanitize.simpleTransform('a', { 'rel': 'nofollow' }),
      // Set the "disabled" attribute for <input> tags.
      'input': sanitize.simpleTransform('input', { 'disabled': 'disabled' })
    },
    allowedSchemesByTag: {
      // Allow 'attachment:' img src (used for markdown cell attachments).
      'img': sanitize.defaults.allowedSchemes.concat(['attachment']),
    }
  };
}


/**
 * The default instance of an `ISanitizer` meant for use by user code.
 */
export
const defaultSanitizer: ISanitizer = new Sanitizer();
