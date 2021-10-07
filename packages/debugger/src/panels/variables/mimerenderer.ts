import { MainAreaWidget } from '@jupyterlab/apputils';
import { IRenderMimeRegistry, MimeModel } from '@jupyterlab/rendermime';
import { PromiseDelegate } from '@lumino/coreutils';
import { Panel } from '@lumino/widgets';
import { murmur2 } from '../../hash';
import { IDebugger } from '../../tokens';

/**
 * Debugger variable mime type renderer
 */
export class VariableMimeRenderer extends MainAreaWidget<Panel> {
  /**
   * Instantiate a new VariableMimeRenderer.
   */
  constructor(options: VariableMimeRenderer.IOptions) {
    const { dataLoader, rendermime } = options;
    const content = new Panel();
    const loaded = new PromiseDelegate<void>();
    super({
      content,
      reveal: Promise.all([dataLoader, loaded.promise])
    });
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
  async refresh(): Promise<void> {
    const data = await this.dataLoader();

    if (data.data) {
      const hash = murmur2(JSON.stringify(data), 17);
      if (this._dataHash !== hash) {
        if (this.content.layout) {
          this.content.widgets.forEach(w => {
            this.content.layout!.removeWidget(w);
          });
        }

        const mimeType = this.renderMime.preferredMimeType(data.data, 'any');

        if (mimeType) {
          const widget = this.renderMime.createRenderer(mimeType);
          const model = new MimeModel(data);
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
  }
}
