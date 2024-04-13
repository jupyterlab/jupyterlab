/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { CodeEditor, IEditorMimeTypeService } from '@jupyterlab/codeeditor';
import { IEditorLanguageRegistry } from '@jupyterlab/codemirror';
import { IChangedArgs } from '@jupyterlab/coreutils';
import { Popup, showPopup, TextItem } from '@jupyterlab/statusbar';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { VDomModel, VDomRenderer } from '@jupyterlab/ui-components';
import { CommandRegistry } from '@lumino/commands';
import { JSONObject } from '@lumino/coreutils';
import { Menu } from '@lumino/widgets';
import React from 'react';

/**
 * A namespace for `EditorSyntaxComponentStatics`.
 */
namespace EditorSyntaxComponent {
  /**
   * The props for the `EditorSyntaxComponent`.
   */
  export interface IProps {
    /**
     * The current CodeMirror language for an editor.
     */
    language: string;

    /**
     * A function to execute on clicking the component.
     * By default we provide a function that opens a menu
     * for CodeMirror language selection.
     */
    handleClick: () => void;
  }
}

/**
 * A pure function that returns a tsx component for an editor syntax item.
 *
 * @param props the props for the component.
 *
 * @returns an editor syntax component.
 */
function EditorSyntaxComponent(
  props: EditorSyntaxComponent.IProps
): React.ReactElement<EditorSyntaxComponent.IProps> {
  return <TextItem source={props.language} onClick={props.handleClick} />;
}

/**
 * StatusBar item to change the language syntax highlighting of the file editor.
 */
export class EditorSyntaxStatus extends VDomRenderer<EditorSyntaxStatus.Model> {
  /**
   * Construct a new VDomRenderer for the status item.
   */
  constructor(options: EditorSyntaxStatus.IOptions) {
    super(new EditorSyntaxStatus.Model(options.languages));
    this._commands = options.commands;
    this.translator = options.translator ?? nullTranslator;
    const trans = this.translator.load('jupyterlab');

    this.addClass('jp-mod-highlighted');
    this.title.caption = trans.__('Change text editor syntax highlighting');
  }

  /**
   * Render the status item.
   */
  render(): JSX.Element | null {
    if (!this.model) {
      return null;
    }
    return (
      <EditorSyntaxComponent
        language={this.model.language}
        handleClick={this._handleClick}
      />
    );
  }

  /**
   * Create a menu for selecting the language of the editor.
   */
  private _handleClick = () => {
    const languageMenu = new Menu({ commands: this._commands });
    const command = 'fileeditor:change-language';
    if (this._popup) {
      this._popup.dispose();
    }
    this.model.languages
      .getLanguages()
      .sort((a, b) => {
        const aName = a.displayName ?? a.name;
        const bName = b.displayName ?? b.name;
        return aName.localeCompare(bName);
      })
      .forEach(spec => {
        if (spec.name.toLowerCase().indexOf('brainf') === 0) {
          return;
        }

        const args: JSONObject = {
          name: spec.name,
          displayName: spec.displayName ?? spec.name
        };

        languageMenu.addItem({
          command,
          args
        });
      });
    this._popup = showPopup({
      body: languageMenu,
      anchor: this,
      align: 'left'
    });
  };

  protected translator: ITranslator;
  private _commands: CommandRegistry;
  private _popup: Popup | null = null;
}

/**
 * A namespace for EditorSyntax statics.
 */
export namespace EditorSyntaxStatus {
  /**
   * A VDomModel for the current editor/mode combination.
   */
  export class Model extends VDomModel {
    constructor(public languages: IEditorLanguageRegistry) {
      super();
    }
    /**
     * The current editor language. If no editor is present,
     * returns the empty string.
     */
    get language(): string {
      return this._language;
    }

    /**
     * The current editor for the application editor tracker.
     */
    get editor(): CodeEditor.IEditor | null {
      return this._editor;
    }
    set editor(editor: CodeEditor.IEditor | null) {
      const oldEditor = this._editor;
      if (oldEditor !== null) {
        oldEditor.model.mimeTypeChanged.disconnect(this._onMIMETypeChange);
      }
      const oldLanguage = this._language;
      this._editor = editor;
      if (this._editor === null) {
        this._language = '';
      } else {
        const spec = this.languages.findByMIME(this._editor.model.mimeType);
        this._language = spec?.name ?? IEditorMimeTypeService.defaultMimeType;

        this._editor.model.mimeTypeChanged.connect(this._onMIMETypeChange);
      }

      this._triggerChange(oldLanguage, this._language);
    }

    /**
     * If the editor mode changes, update the model.
     */
    private _onMIMETypeChange = (
      mode: CodeEditor.IModel,
      change: IChangedArgs<string>
    ) => {
      const oldLanguage = this._language;
      const spec = this.languages.findByMIME(change.newValue);
      this._language = spec?.name ?? IEditorMimeTypeService.defaultMimeType;

      this._triggerChange(oldLanguage, this._language);
    };

    /**
     * Trigger a rerender of the model.
     */
    private _triggerChange(oldState: string, newState: string) {
      if (oldState !== newState) {
        this.stateChanged.emit(void 0);
      }
    }

    private _language: string = '';
    private _editor: CodeEditor.IEditor | null = null;
  }

  /**
   * Options for the EditorSyntax status item.
   */
  export interface IOptions {
    /**
     * The application command registry.
     */
    commands: CommandRegistry;

    /**
     * Editor languages.
     */
    languages: IEditorLanguageRegistry;

    /**
     * The language translator.
     */
    translator?: ITranslator;
  }
}
