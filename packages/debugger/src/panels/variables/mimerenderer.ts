import { MainAreaWidget } from '@jupyterlab/apputils';
import { IRenderMimeRegistry, MimeModel } from '@jupyterlab/rendermime';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import {
  notTrustedIcon,
  ToolbarButton,
  trustedIcon
} from '@jupyterlab/ui-components';
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
    const { dataLoader, isTrusted, rendermime, translator } = options;
    const content = new Panel();
    const loaded = new PromiseDelegate<void>();
    super({
      content,
      reveal: Promise.all([dataLoader, loaded.promise])
    });
    const trans = (translator ?? nullTranslator).load('jupyterlab');
    this.dataLoader = dataLoader;
    this.renderMime = rendermime;
    this.trustedButton = new ToolbarButton({
      className: 'jp-VariableRenderer-TrustButton',
      icon: notTrustedIcon,
      tooltip: trans.__('Variable value is not trusted'),
      pressedIcon: trustedIcon,
      pressedTooltip: trans.__('Variable value is trusted'),
      pressed: isTrusted,
      onClick: this.onTrustClick.bind(this)
    });
    this._dataHash = null;

    this.toolbar.addItem('trust-variable', this.trustedButton);

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

        const mimeType = this.renderMime.preferredMimeType(
          data.data,
          this.trustedButton.pressed ? 'any' : 'ensure'
        );

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

  protected onTrustClick(): Promise<void> {
    return this.refresh();
  }

  protected dataLoader: () => Promise<IDebugger.IRichVariable>;
  protected renderMime: IRenderMimeRegistry;
  protected trustedButton: ToolbarButton;
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
     * Whether the data is trusted or not
     *
     * By default it will be false.
     */
    isTrusted?: boolean;
    /**
     * Translation manager
     */
    translator?: ITranslator;
  }
}
