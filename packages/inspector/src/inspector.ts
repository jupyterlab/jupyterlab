// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Printing } from '@jupyterlab/apputils';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import { Panel, PanelLayout, Widget } from '@lumino/widgets';
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
 * The class name added to default inspector content.
 */
const DEFAULT_CONTENT_CLASS = 'jp-Inspector-placeholderContent';

/**
 * A panel which contains a set of inspectors.
 */
export class InspectorPanel
  extends Panel
  implements IInspector, Printing.IPrintable
{
  /**
   * Construct an inspector.
   */
  constructor(options: InspectorPanel.IOptions = {}) {
    super();
    this.translator = options.translator || nullTranslator;
    this._trans = this.translator.load('jupyterlab');

    if (options.initialContent instanceof Widget) {
      this._content = options.initialContent;
    } else if (typeof options.initialContent === 'string') {
      this._content = InspectorPanel._generateContentWidget(
        `<p>${options.initialContent}</p>`
      );
    } else {
      const placeholderHeadline = `<h3>${this._trans.__(
        'No Documentation'
      )}</h3>`;
      const placeholderText = `<p>${this._trans.__(
        'Move the cursor to a code fragment (e.g. function or object) to request information about it from the kernel attached to the editor.'
      )}</p>`;

      this._content = InspectorPanel._generateContentWidget(
        `${placeholderHeadline}${placeholderText}`
      );
    }

    this.addClass(PANEL_CLASS);
    (this.layout as PanelLayout).addWidget(this._content);
  }

  /**
   * Print in iframe
   */
  [Printing.symbol]() {
    return (): Promise<void> => Printing.printWidget(this);
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
    if (!content || content === this._content) {
      return;
    }
    this._content.dispose();

    this._content = content;
    content.addClass(CONTENT_CLASS);
    (this.layout as PanelLayout).addWidget(content);
  }

  /**
   * Handle source disposed signals.
   */
  protected onSourceDisposed(sender: any, args: void): void {
    this.source = null;
  }

  /**
   * Generate content widget from string
   */
  private static _generateContentWidget(message: string): Widget {
    const widget = new Widget();
    widget.node.innerHTML = message;
    widget.addClass(CONTENT_CLASS);
    widget.addClass(DEFAULT_CONTENT_CLASS);

    return widget;
  }

  protected translator: ITranslator;
  private _trans: TranslationBundle;
  private _content: Widget;
  private _source: IInspector.IInspectable | null = null;
}

export namespace InspectorPanel {
  export interface IOptions {
    initialContent?: Widget | string | undefined;

    /**
     * The application language translator.
     */
    translator?: ITranslator;
  }
}
