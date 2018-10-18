/**
 * Default item to display which notebook mode user is in.
 */
/**
 * Part of Jupyterlab status bar defaults.
 */
import * as React from 'react';

import { JupyterLabPlugin, JupyterLab } from '@jupyterlab/application';

import {
  INotebookTracker,
  Notebook,
  NotebookPanel,
  NotebookMode
} from '@jupyterlab/notebook';

import { IDefaultsManager } from './manager';

import { TextItem } from '../component/text';

import { VDomRenderer, VDomModel } from '@jupyterlab/apputils';
// import { CommandRegistry } from '@phosphor/commands';
import { ISignal } from '@phosphor/signaling';
import { IDisposable } from '@phosphor/disposable';
import { Token } from '@phosphor/coreutils';
import { IStatusContext } from '../contexts';
import { TextExt } from '../util/text';

// tslint:disable-next-line:variable-name
const CommandEditComponent = (
  props: CommandEditComponent.IProps
): React.ReactElement<CommandEditComponent.IProps> => {
  return <TextItem source={`Mode: ${TextExt.titleCase(props.notebookMode)}`} />;
};

namespace CommandEditComponent {
  export interface IProps {
    notebookMode: NotebookMode;
  }
}

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

// tslint:disable-next-line:variable-name
export const ICommandEdit = new Token<ICommandEdit>(
  '@jupyterlab/statusbar:ICommandEdit'
);

export const commandEditItem: JupyterLabPlugin<ICommandEdit> = {
  id: '@jupyterlab/statusbar:command-edit-item',
  autoStart: true,
  provides: ICommandEdit,
  requires: [IDefaultsManager, INotebookTracker],
  activate: (
    app: JupyterLab,
    manager: IDefaultsManager,
    tracker: INotebookTracker
  ) => {
    const item = new CommandEdit({
      tracker
    });

    manager.addDefaultStatus('command-edit-item', item, {
      align: 'right',
      priority: 4,
      isActive: IStatusContext.delegateActive(app.shell, [{ tracker }])
    });

    return item;
  }
};
