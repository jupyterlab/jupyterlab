// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module json-extension
 */

import { Printing } from '@jupyterlab/apputils';
import { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { JSONObject, JSONValue } from '@lumino/coreutils';
import { Message } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';

/**
 * The CSS class to add to the JSON Widget.
 */
const CSS_CLASS = 'jp-RenderedJSON';

/**
 * The MIME type for JSON.
 */
export const MIME_TYPE = 'application/json';
// NOTE: not standardized yet
export const MIME_TYPES_JSONL = [
  'text/jsonl',
  'application/jsonl',
  'application/json-lines'
];

/**
 * A renderer for JSON data.
 */
export class RenderedJSON
  extends Widget
  implements IRenderMime.IRenderer, Printing.IPrintable
{
  /**
   * Create a new widget for rendering JSON.
   */
  constructor(options: IRenderMime.IRendererOptions) {
    super();
    this.addClass(CSS_CLASS);
    this.addClass('CodeMirror');
    this._mimeType = options.mimeType;
    this.translator = options.translator || nullTranslator;
  }

  [Printing.symbol]() {
    return (): Promise<void> => Printing.printWidget(this);
  }

  /**
   * Render JSON into this widget's node.
   */
  async renderModel(model: IRenderMime.IMimeModel): Promise<void> {
    const { Component } = await import('./component');

    let data: NonNullable<JSONValue>;

    // handle if json-lines format
    if (MIME_TYPES_JSONL.indexOf(this._mimeType) >= 0) {
      // convert into proper json
      const lines = ((model.data[this._mimeType] || '') as string)
        .trim()
        .split(/\n/);
      data = JSON.parse(`[${lines.join(',')}]`);
    } else {
      data = (model.data[this._mimeType] || {}) as NonNullable<JSONValue>;
    }

    const metadata = (model.metadata[this._mimeType] || {}) as JSONObject;
    if (this._rootDOM === null) {
      this._rootDOM = createRoot(this.node);
    }
    return new Promise<void>((resolve, reject) => {
      this._rootDOM!.render(
        <Component
          data={data}
          metadata={metadata}
          translator={this.translator}
          forwardedRef={() => resolve()}
        />
      );
    });
  }

  /**
   * Called before the widget is detached from the DOM.
   */
  protected onBeforeDetach(msg: Message): void {
    // Unmount the component so it can tear down.
    if (this._rootDOM) {
      this._rootDOM.unmount();
      this._rootDOM = null;
    }
  }

  translator: ITranslator;
  private _mimeType: string;
  private _rootDOM: Root | null = null;
}

/**
 * A mime renderer factory for JSON data.
 */
export const rendererFactory: IRenderMime.IRendererFactory = {
  safe: true,
  mimeTypes: [MIME_TYPE, ...MIME_TYPES_JSONL],
  createRenderer: options => new RenderedJSON(options)
};

const extensions: IRenderMime.IExtension | IRenderMime.IExtension[] = [
  {
    id: '@jupyterlab/json-extension:factory',
    description: 'Adds renderer for JSON content.',
    rendererFactory,
    rank: 0,
    dataType: 'json',
    documentWidgetFactoryOptions: {
      name: 'JSON',
      // TODO: how to translate label of the factory?
      primaryFileType: 'json',
      fileTypes: ['json', 'notebook', 'geojson'],
      defaultFor: ['json']
    }
  },
  {
    id: '@jupyterlab/json-lines-extension:factory',
    description: 'Adds renderer for JSONLines content.',
    rendererFactory,
    rank: 0,
    dataType: 'string',
    documentWidgetFactoryOptions: {
      name: 'JSONLines',
      primaryFileType: 'jsonl',
      fileTypes: ['jsonl', 'ndjson'],
      defaultFor: ['jsonl', 'ndjson']
    }
  }
];

export default extensions;
