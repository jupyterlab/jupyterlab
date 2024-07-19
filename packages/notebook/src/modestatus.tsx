/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { TextItem } from '@jupyterlab/statusbar';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import { VDomModel, VDomRenderer } from '@jupyterlab/ui-components';
import * as React from 'react';
import { Notebook, NotebookMode } from '.';

/**
 * A pure function for rendering a Command/Edit mode component.
 *
 * @param props the props for rendering the component.
 *
 * @returns a tsx component for command/edit mode.
 */
function CommandEditComponent(
  props: CommandEditComponent.IProps
): React.ReactElement<CommandEditComponent.IProps> {
  const trans = (props.translator || nullTranslator).load('jupyterlab');
  return (
    <TextItem
      source={trans.__('Mode: %1', props.modeNames[props.notebookMode])}
    />
  );
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

    /**
     * Language translator.
     */
    translator?: ITranslator;

    /**
     * Mapping translating the names of modes.
     */
    modeNames: Record<NotebookMode, string>;
  }
}

/**
 * StatusBar item to display which notebook mode user is in.
 */
export class CommandEditStatus extends VDomRenderer<CommandEditStatus.Model> {
  /**
   * Construct a new CommandEdit status item.
   */
  constructor(translator?: ITranslator) {
    super(new CommandEditStatus.Model());
    this.translator = translator || nullTranslator;
    this._trans = this.translator.load('jupyterlab');
    this._modeNames = {
      command: this._trans.__('Command'),
      edit: this._trans.__('Edit')
    };
  }

  /**
   * Render the CommandEdit status item.
   */
  render(): JSX.Element | null {
    if (!this.model) {
      return null;
    }
    this.node.title = this._trans.__(
      'Notebook is in %1 mode',
      this._modeNames[this.model.notebookMode]
    );
    return (
      <CommandEditComponent
        notebookMode={this.model.notebookMode}
        translator={this.translator}
        modeNames={this._modeNames}
      />
    );
  }

  protected translator: ITranslator;
  private _trans: TranslationBundle;
  private readonly _modeNames: Record<NotebookMode, string>;
}

/**
 * A namespace for CommandEdit statics.
 */
export namespace CommandEditStatus {
  /**
   * A VDomModel for the CommandEdit renderer.
   */
  export class Model extends VDomModel {
    /**
     * The current mode of the current notebook.
     */
    get notebookMode(): NotebookMode {
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
