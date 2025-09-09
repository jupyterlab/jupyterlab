import { DocumentRegistry } from '@jupyterlab/docregistry';
import { NotebookActions, NotebookPanel } from '@jupyterlab/notebook';
import { IRenderMime } from '@jupyterlab/rendermime-interfaces';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { runIcon, ToolbarButton } from '@jupyterlab/ui-components';
import { Signal } from '@lumino/signaling';

/**
 * Widget extension that creates run buttons each time a notebook is created.
 */
export class RunCellButtonExtension
  implements DocumentRegistry.WidgetExtension
{
  constructor(options: { translator: ITranslator }) {
    this._trans = (options.translator ?? nullTranslator).load('jupyterlab');
  }

  get enabled(): boolean {
    return this._enabled;
  }
  set enabled(value: boolean) {
    this._enabled = value;
    this._enabledChanged.emit(value);
  }

  createNew(panel: NotebookPanel) {
    const updateButtons = () => {
      panel.content.widgets.forEach(cell => {
        cell.ready
          .then(() => {
            if (!cell.inputArea) {
              return;
            }
            if (this._enabled && cell.model.type === 'code') {
              cell.inputArea.prompt.runButton = this._runButtonFactory(panel);
            } else {
              cell.inputArea.prompt.runButton = undefined;
            }
          })
          .catch(() => {
            // no-op
          });
      });
    };

    // Listen for new cells added after creation.
    panel.content.model?.cells.changed.connect(updateButtons);

    // Listen for setting to enable it or not.
    this._enabledChanged.connect(updateButtons);

    // Initialize the buttons.
    updateButtons();
  }

  private _runButtonFactory = (panel: NotebookPanel) =>
    new ToolbarButton({
      icon: runIcon,
      onClick: () => {
        void NotebookActions.run(panel.content, panel.sessionContext);
      },
      tooltip: this._trans.__('Run the selected cells and advance')
    });

  private _trans: IRenderMime.TranslationBundle;
  private _enabled: boolean = true;
  private _enabledChanged = new Signal<RunCellButtonExtension, boolean>(this);
}
