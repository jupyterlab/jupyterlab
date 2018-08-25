import { TableOfContentsRegistry } from '../../registry';

import { TableOfContents } from '../../toc';

import { IInstanceTracker } from '@jupyterlab/apputils';

import { MimeDocument } from '@jupyterlab/docregistry';

import { each } from '@phosphor/algorithm';

export class MarkdownDocGeneratorOptionsManager extends TableOfContentsRegistry.IGeneratorOptionsManager {
  constructor(
    widget: TableOfContents,
    options: { needNumbering: boolean },
    tracker?: IInstanceTracker<MimeDocument>
  ) {
    super();
    this._numbering = options.needNumbering;
    this._tracker = tracker;
    this._widget = widget;
  }

  // Show/hide numbering in the document
  private changeNumberingStateDocument(showNumbering: boolean) {
    if (this._tracker && this._tracker.currentWidget) {
      let numberingNodes = this._tracker.currentWidget.content.node.querySelectorAll(
        '.numbering-entry'
      );
      each(numberingNodes, numbering => {
        if (!showNumbering) {
          numbering.setAttribute('hidden', 'true');
        } else {
          numbering.removeAttribute('hidden');
        }
      });
    }
  }

  set numbering(value: boolean) {
    this._numbering = value;
    this._widget.update();
    // this.notebookMetadata = ['toc-autonumbering', this._numbering];
    this.changeNumberingStateDocument(this._numbering);
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
  private _tracker?: IInstanceTracker<MimeDocument>;
  private _widget: TableOfContents;
}
