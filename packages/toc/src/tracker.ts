// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Widget } from '@lumino/widgets';
import { ITableOfContentsTracker, TableOfContents } from './tokens';

/**
 * Table of contents tracker
 */
export class TableOfContentsTracker implements ITableOfContentsTracker {
  /**
   * Constructor
   */
  constructor() {
    this.modelMapping = new WeakMap<Widget, TableOfContents.Model>();
  }

  /**
   * Track a given model.
   *
   * @param widget Widget
   * @param model Table of contents model
   */
  add(widget: Widget, model: TableOfContents.Model): void {
    this.modelMapping.set(widget, model);
  }

  /**
   * Get the table of contents model associated with a given widget.
   *
   * @param widget Widget
   * @returns The table of contents model
   */
  get(widget: Widget): TableOfContents.Model | null {
    const model = this.modelMapping.get(widget);

    return !model || model.isDisposed ? null : model;
  }

  protected modelMapping: WeakMap<Widget, TableOfContents.Model>;
}
