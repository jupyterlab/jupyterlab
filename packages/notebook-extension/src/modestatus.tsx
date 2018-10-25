import * as React from 'react';

import { JupyterLabPlugin, JupyterLab } from '@jupyterlab/application';

import { VDomRenderer, VDomModel } from '@jupyterlab/apputils';

import { Text } from '@jupyterlab/coreutils';

import {
  INotebookTracker,
  Notebook,
  NotebookPanel,
  NotebookMode
} from '@jupyterlab/notebook';

import { IStatusBar, TextItem } from '@jupyterlab/statusbar';

/**
 * A pure function for rendering a Command/Edit mode component.
 *
 * @param props: the props for rendering the component.
 *
 * @returns a tsx component for command/edit mode.
 */
function CommandEditComponent(
  props: CommandEditComponent.IProps
): React.ReactElement<CommandEditComponent.IProps> {
  return <TextItem source={`Mode: ${Text.titleCase(props.notebookMode)}`} />;
}

/**
 * A namespace for CommandEditComponent statics.
 */
namespace CommandEditComponent {
  /**
   * The props for the CommandEditComponent.
   */
  export interface IProps {
    /**
     * The current mode of the current notebook.
     */
    notebookMode: NotebookMode;
  }
}

/**
 * StatusBar item to display which notebook mode user is in.
 */
class CommandEdit extends VDomRenderer<CommandEdit.Model> {
  /**
   * Construct a new CommandEdit status item.
   */
  constructor(opts: CommandEdit.IOptions) {
    super();
    this._tracker = opts.tracker;

    this._tracker.currentChanged.connect(this._onNotebookChange);

    this.model = new CommandEdit.Model(
      this._tracker.currentWidget && this._tracker.currentWidget.content
    );
    this.title.caption = `Notebook is in ${this.model.notebookMode} mode`;
  }

  /**
   * Render the CommandEdit status item.
   */
  render() {
    this.node.title = `Notebook is in ${this.model.notebookMode} mode`;
    return <CommandEditComponent notebookMode={this.model.notebookMode} />;
  }

  /**
   * Dispose of the status item.
   */
  dispose() {
    super.dispose();
    this._tracker.currentChanged.disconnect(this._onNotebookChange);
  }

  /**
   * Update the model when the tracker current widget changes.
   */
  private _onNotebookChange = (
    tracker: INotebookTracker,
    notebook: NotebookPanel | null
  ) => {
    if (notebook === null) {
      this.model.notebook = null;
    } else {
      this.model.notebook = notebook.content;
    }
  };

  private _tracker: INotebookTracker;
}

/**
 * A namespace for CommandEdit statics.
 */
namespace CommandEdit {
  /**
   * A VDomModle for the CommandEdit renderer.
   */
  export class Model extends VDomModel {
    /**
     * Construct a new CommandEdit model.
     */
    constructor(notebook: Notebook | null) {
      super();
      this.notebook = notebook;
    }

    /**
     * The current mode of the current notebook.
     */
    get notebookMode() {
      return this._notebookMode;
    }

    /**
     * Set the current notebook for the model.
     */
    set notebook(notebook: Notebook | null) {
      const oldNotebook = this._notebook;
      if (oldNotebook !== null) {
        oldNotebook.stateChanged.disconnect(this._onChanged);
        oldNotebook.activeCellChanged.disconnect(this._onChanged);
        oldNotebook.modelContentChanged.disconnect(this._onChanged);
      }

      const oldMode = this._notebookMode;
      this._notebook = notebook;
      if (this._notebook === null) {
        this._notebookMode = 'command';
      } else {
        this._notebookMode = this._notebook.mode;
        this._notebook.stateChanged.connect(this._onChanged);
        this._notebook.activeCellChanged.connect(this._onChanged);
        this._notebook.modelContentChanged.connect(this._onChanged);
      }

      this._triggerChange(oldMode, this._notebookMode);
    }

    /**
     * On a change to the notebook, update the mode.
     */
    private _onChanged = (_notebook: Notebook) => {
      const oldMode = this._notebookMode;
      if (this._notebook) {
        this._notebookMode = _notebook.mode;
      } else {
        this._notebookMode = 'command';
      }
      this._triggerChange(oldMode, this._notebookMode);
    };

    /**
     * Trigger a state change for the renderer.
     */
    private _triggerChange(oldState: NotebookMode, newState: NotebookMode) {
      if (oldState !== newState) {
        this.stateChanged.emit(void 0);
      }
    }

    private _notebookMode: NotebookMode = 'command';
    private _notebook: Notebook | null = null;
  }

  /**
   * Options for creating a CommandEdit status item.
   */
  export interface IOptions {
    tracker: INotebookTracker;
  }
}

/**
 * A plugin providing a CommandEdit status item.
 */
export const commandEditItem: JupyterLabPlugin<void> = {
  id: '@jupyterlab/notebook-extension:mode-status',
  autoStart: true,
  requires: [IStatusBar, INotebookTracker],
  activate: (
    app: JupyterLab,
    statusBar: IStatusBar,
    tracker: INotebookTracker
  ) => {
    const item = new CommandEdit({
      tracker
    });

    statusBar.registerStatusItem('command-edit-item', item, {
      align: 'right',
      rank: 4,
      isActive: () =>
        app.shell.currentWidget &&
        tracker.currentWidget &&
        app.shell.currentWidget === tracker.currentWidget
    });
  }
};
