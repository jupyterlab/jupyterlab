import * as React from 'react';

import { VDomRenderer, VDomModel } from '@jupyterlab/apputils';

import { Text } from '@jupyterlab/coreutils';

import { Notebook, NotebookMode } from '.';

import { TextItem } from '@jupyterlab/statusbar';

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
export class CommandEditStatus extends VDomRenderer<CommandEditStatus.Model> {
  /**
   * Construct a new CommandEdit status item.
   */
  constructor() {
    super(new CommandEditStatus.Model());
  }

  /**
   * Render the CommandEdit status item.
   */
  render() {
    if (!this.model) {
      return null;
    }
    this.node.title = `Notebook is in ${this.model.notebookMode} mode`;
    return <CommandEditComponent notebookMode={this.model.notebookMode} />;
  }
}

/**
 * A namespace for CommandEdit statics.
 */
export namespace CommandEditStatus {
  /**
   * A VDomModle for the CommandEdit renderer.
   */
  export class Model extends VDomModel {
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
        oldNotebook.stateChanged.disconnect(this._onChanged, this);
        oldNotebook.activeCellChanged.disconnect(this._onChanged, this);
        oldNotebook.modelContentChanged.disconnect(this._onChanged, this);
      }

      const oldMode = this._notebookMode;
      this._notebook = notebook;
      if (this._notebook === null) {
        this._notebookMode = 'command';
      } else {
        this._notebookMode = this._notebook.mode;
        this._notebook.stateChanged.connect(this._onChanged, this);
        this._notebook.activeCellChanged.connect(this._onChanged, this);
        this._notebook.modelContentChanged.connect(this._onChanged, this);
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
}
