// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISanitizer } from '@jupyterlab/apputils';

import { TableOfContentsRegistry as Registry } from '../../registry';

import { TableOfContents } from '../../toc';

class OptionsManager extends Registry.IGeneratorOptionsManager {
  constructor(
    widget: TableOfContents,
    options: { needsNumbering: boolean; sanitizer: ISanitizer }
  ) {
    super();
    this._numbering = options.needsNumbering;
    this._widget = widget;
    this.sanitizer = options.sanitizer;
  }

  readonly sanitizer: ISanitizer;

  set numbering(value: boolean) {
    this._numbering = value;
    this._widget.update();
  }

  get numbering() {
    return this._numbering;
  }

  // initialize options, will NOT change notebook metadata
  initializeOptions(numbering: boolean) {
    this._numbering = numbering;
    this._widget.update();
  }

  private _numbering: boolean;
  private _widget: TableOfContents;
}

/**
 * Exports.
 */
export { OptionsManager };
