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

import { ISignal } from '@phosphor/signaling';

import { IDisposable } from '@phosphor/disposable';

// tslint:disable-next-line:variable-name
const CommandEditComponent = (
  props: CommandEditComponent.IProps
): React.ReactElement<CommandEditComponent.IProps> => {
  return <TextItem source={`Mode: ${Text.titleCase(props.notebookMode)}`} />;
};

namespace CommandEditComponent {
  export interface IProps {
    notebookMode: NotebookMode;
  }
}

/**
 * StatusBar item to display which notebook mode user is in.
 */
class CommandEdit extends VDomRenderer<CommandEdit.Model>
  implements ICommandEdit {
  constructor(opts: CommandEdit.IOptions) {
    super();
    this._tracker = opts.tracker;

    this._tracker.currentChanged.connect(this._onNotebookChange);

    this.model = new CommandEdit.Model(
      this._tracker.currentWidget && this._tracker.currentWidget.content
    );
    this.node.title = `Notebook is in ${this.model.notebookMode} mode`;
  }

  render() {
    if (this.model === null) {
      return null;
    } else {
      this.node.title = `Notebook is in ${this.model.notebookMode} mode`;
      return <CommandEditComponent notebookMode={this.model.notebookMode} />;
    }
  }

  dispose() {
    super.dispose();

    this._tracker.currentChanged.disconnect(this._onNotebookChange);
  }

  private _onNotebookChange = (
    tracker: INotebookTracker,
    notebook: NotebookPanel | null
  ) => {
    if (notebook === null) {
      this.model!.notebook = null;
    } else {
      this.model!.notebook = notebook.content;
    }
  };

  private _tracker: INotebookTracker;
}

namespace CommandEdit {
  export class Model extends VDomModel implements ICommandEdit.IModel {
    constructor(notebook: Notebook | null) {
      super();

      this.notebook = notebook;
    }

    get notebookMode() {
      return this._notebookMode;
    }

    set notebookMode(notebookMode: NotebookMode) {
      this._notebookMode = notebookMode;
    }

    set notebook(notebook: Notebook | null) {
      const oldNotebook = this._notebook;
      if (oldNotebook !== null) {
        oldNotebook.stateChanged.disconnect(this._onChanged);
        oldNotebook.activeCellChanged.disconnect(this._onChanged);
        oldNotebook.modelContentChanged.disconnect(this._onChanged);
      }

      const oldState = this._getAllState();
      this._notebook = notebook;
      if (this._notebook === null) {
        this._notebookMode = 'command';
      } else {
        this._notebookMode = this._notebook.mode;
        this._notebook.stateChanged.connect(this._onChanged);
        this._notebook.activeCellChanged.connect(this._onChanged);
        this._notebook.modelContentChanged.connect(this._onChanged);
      }

      this._triggerChange(oldState, this._getAllState());
    }

    private _onChanged = (_notebook: Notebook) => {
      const oldState = this._getAllState();
      if (_notebook !== null && _notebook !== undefined) {
        this._notebookMode = _notebook.mode;
      } else {
        this._notebookMode = 'command';
      }
      this._triggerChange(oldState, this._getAllState());
    };

    private _getAllState(): NotebookMode {
      return this._notebookMode;
    }

    private _triggerChange(oldState: NotebookMode, newState: NotebookMode) {
      if (oldState !== newState) {
        this.stateChanged.emit(void 0);
      }
    }

    private _notebookMode: NotebookMode = 'command';
    private _notebook: Notebook | null = null;
  }

  export interface IOptions {
    tracker: INotebookTracker;
  }
}

export interface ICommandEdit extends IDisposable {
  readonly model: ICommandEdit.IModel | null;
  readonly modelChanged: ISignal<this, void>;
}

export namespace ICommandEdit {
  export interface IModel {
    readonly notebookMode: NotebookMode;
    readonly notebook: Notebook | null;
  }
}

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
