import { TableOfContentsRegistry } from '../../registry';

import { TableOfContents } from '../../toc';

export class MarkdownDocGeneratorOptionsManager extends TableOfContentsRegistry.IGeneratorOptionsManager {
  constructor(widget: TableOfContents, options: { needNumbering: boolean }) {
    super();
    this._numbering = options.needNumbering;
    this._widget = widget;
  }

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
