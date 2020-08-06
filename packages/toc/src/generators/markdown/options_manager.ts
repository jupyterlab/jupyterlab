// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISanitizer } from '@jupyterlab/apputils';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { TableOfContentsRegistry as Registry } from '../../registry';
import { TableOfContents } from '../../toc';

/**
 * Interface describing constructor options.
 *
 * @private
 */
interface IOptions {
  /**
   * Boolean indicating whether items should be numbered.
   */
  numbering: boolean;

  /**
   * HTML sanitizer.
   */
  sanitizer: ISanitizer;

  /**
   * The application language translator.
   */
  translator?: ITranslator;
}

/**
 * Class for managing Markdown ToC generator options.
 *
 * @private
 */
class OptionsManager extends Registry.IOptionsManager {
  /**
   * Returns an options manager.
   *
   * @param widget - table of contents widget
   * @param options - generator options
   * @returns options manager
   */
  constructor(widget: TableOfContents, options: IOptions) {
    super();
    this._numbering = options.numbering;
    this._widget = widget;
    this.translator = options.translator || nullTranslator;
    this.sanitizer = options.sanitizer;
  }

  /**
   * HTML sanitizer.
   */
  readonly sanitizer: ISanitizer;

  /**
   * Gets/sets ToC generator numbering.
   */
  set numbering(value: boolean) {
    this._numbering = value;
    this._widget.update();
  }

  get numbering() {
    return this._numbering;
  }

  /**
   * Initializes options.
   *
   * ## Notes
   *
   * -  This will **not** change notebook meta-data.
   *
   * @param numbering - boolean indicating whether to number items
   */
  initializeOptions(numbering: boolean) {
    this._numbering = numbering;
    this._widget.update();
  }

  translator: ITranslator;
  private _numbering: boolean;
  private _widget: TableOfContents;
}

/**
 * Exports.
 */
export { OptionsManager };
