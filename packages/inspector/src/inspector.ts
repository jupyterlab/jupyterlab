// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Printing } from '@jupyterlab/apputils';

import { Panel, PanelLayout, Widget } from '@phosphor/widgets';

import { IInspector } from './tokens';

/**
 * The class name added to inspector panels.
 */
const PANEL_CLASS = 'jp-Inspector';

/**
 * The class name added to inspector content.
 */
const CONTENT_CLASS = 'jp-Inspector-content';

/**
 * A panel which contains a set of inspectors.
 */
export class InspectorPanel extends Panel
  implements IInspector, Printing.IPrintable {
  /**
   * Construct an inspector.
   */
  constructor() {
    super();
    this.addClass(PANEL_CLASS);
  }

  /**
   * Print in iframe
   */
  [Printing.symbol]() {
    return () => Printing.printWidget(this);
  }

  /**
   * The source of events the inspector panel listens for.
   */
  get source(): IInspector.IInspectable | null {
    return this._source;
  }
  set source(source: IInspector.IInspectable | null) {
    if (this._source === source) {
      return;
    }

    // Disconnect old signal handler.
    if (this._source) {
      this._source.standby = true;
      this._source.inspected.disconnect(this.onInspectorUpdate, this);
      this._source.disposed.disconnect(this.onSourceDisposed, this);
    }

    // Reject a source that is already disposed.
    if (source && source.isDisposed) {
      source = null;
    }

    // Update source.
    this._source = source;

    // Connect new signal handler.
    if (this._source) {
      this._source.standby = false;
      this._source.inspected.connect(this.onInspectorUpdate, this);
      this._source.disposed.connect(this.onSourceDisposed, this);
    }
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.source = null;
    super.dispose();
  }

  /**
   * Handle inspector update signals.
   */
  protected onInspectorUpdate(
    sender: any,
    args: IInspector.IInspectorUpdate
  ): void {
    const { content } = args;

    // Update the content of the inspector widget.
    if (content === this._content) {
      return;
    }
    if (this._content) {
      this._content.dispose();
    }
    this._content = content;
    if (content) {
      content.addClass(CONTENT_CLASS);
      (this.layout as PanelLayout).addWidget(content);
    }
  }

  /**
   * Handle source disposed signals.
   */
  protected onSourceDisposed(sender: any, args: void): void {
    this.source = null;
  }

  private _content: Widget | null = null;
  private _source: IInspector.IInspectable | null = null;
}
