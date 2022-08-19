/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { MainAreaWidget } from '@jupyterlab/apputils';
import { IRenderMimeRegistry, MimeModel } from '@jupyterlab/rendermime';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import { PromiseDelegate } from '@lumino/coreutils';
import { Panel } from '@lumino/widgets';
import { murmur2 } from '../../hash';
import { IDebugger } from '../../tokens';

const RENDERER_PANEL_CLASS = 'jp-VariableRendererPanel';
const RENDERER_PANEL_RENDERER_CLASS = 'jp-VariableRendererPanel-renderer';

/**
 * Debugger variable mime type renderer
 */
export class VariableMimeRenderer extends MainAreaWidget<Panel> {
  /**
   * Instantiate a new VariableMimeRenderer.
   */
  constructor(options: VariableMimeRenderer.IOptions) {
    const { dataLoader, rendermime, translator } = options;
    const content = new Panel();
    const loaded = new PromiseDelegate<void>();
    super({
      content,
      reveal: Promise.all([dataLoader, loaded.promise])
    });
    this.content.addClass(RENDERER_PANEL_CLASS);
    this.trans = (translator ?? nullTranslator).load('jupyterlab');
    this.dataLoader = dataLoader;
    this.renderMime = rendermime;
    this._dataHash = null;

    this.refresh()
      .then(() => {
        loaded.resolve();
      })
      .catch(reason => loaded.reject(reason));
  }

  /**
   * Refresh the variable view
   */
  async refresh(force = false): Promise<void> {
    let data = await this.dataLoader();

    if (Object.keys(data.data).length === 0) {
      data = {
        data: {
          'text/plain': this.trans.__(
            'The variable is undefined in the active context.'
          )
        },
        metadata: {}
      };
    }

    if (data.data) {
      const hash = murmur2(JSON.stringify(data), 17);
      if (force || this._dataHash !== hash) {
        if (this.content.layout) {
          this.content.widgets.forEach(w => {
            this.content.layout!.removeWidget(w);
          });
        }

        // We trust unconditionally the data as the user is required to
        // execute the code to load a particular variable in memory
        const mimeType = this.renderMime.preferredMimeType(data.data, 'any');

        if (mimeType) {
          const widget = this.renderMime.createRenderer(mimeType);
          widget.addClass(RENDERER_PANEL_RENDERER_CLASS);
          const model = new MimeModel({ ...data, trusted: true });
          this._dataHash = hash;
          await widget.renderModel(model);

          this.content.addWidget(widget);
        } else {
          this._dataHash = null;
          return Promise.reject('Unable to determine the preferred mime type.');
        }
      }
    } else {
      this._dataHash = null;
      return Promise.reject('Unable to get a view on the variable.');
    }
  }

  protected dataLoader: () => Promise<IDebugger.IRichVariable>;
  protected renderMime: IRenderMimeRegistry;
  protected trans: TranslationBundle;
  private _dataHash: number | null;
}

/**
 * Debugger variable mime type renderer namespace
 */
export namespace VariableMimeRenderer {
  /**
   * Constructor options
   */
  export interface IOptions {
    /**
     * Loader of the variable to be rendered
     */
    dataLoader: () => Promise<IDebugger.IRichVariable>;
    /**
     * Render mime type registry
     */
    rendermime: IRenderMimeRegistry;
    /**
     * Translation manager
     */
    translator?: ITranslator;
  }
}
