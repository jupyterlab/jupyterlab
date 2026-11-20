// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { MainAreaWidget } from '@jupyterlab/apputils';
import {
  CodeMirrorEditor,
  CodeMirrorSearchHighlighter,
  EditorSearchProvider
} from '@jupyterlab/codemirror';
import type { CodeEditor } from '@jupyterlab/codeeditor';
import type {
  IFilters,
  IReplaceOptions,
  IReplaceOptionsSupport,
  ISearchProvider
} from '@jupyterlab/documentsearch';
import type { ITranslator } from '@jupyterlab/translation';
import type { Widget } from '@lumino/widgets';
import { JsonSettingEditor } from './jsonsettingeditor';
import type { ISharedText, SourceChange } from '@jupyter/ydoc';

/**
 * Helper type
 */
export type SettingEditorPanel = MainAreaWidget<JsonSettingEditor>;

/**
 * Search provider for the Advanced Settings JSON editor
 */
export class SettingEditorSearchProvider
  extends EditorSearchProvider<CodeEditor.IModel>
  implements ISearchProvider
{
  /**
   * Constructor
   * @param widget Settings editor panel
   */
  constructor(protected widget: SettingEditorPanel) {
    super();
    const content = this.widget.content;
    this._defaultsEditor = content.defaults as CodeMirrorEditor;
    this._userEditor = content.source as CodeMirrorEditor;
    // The focused pane is tracked through focus events as well as read
    // live through hasFocus(): jsdom cannot focus a CodeMirror editor,
    // so the tests switch panes through these events.
    this._defaultsFocusHandler = () => {
      this._focusedEditor = this._defaultsEditor;
    };
    this._userFocusHandler = () => {
      this._focusedEditor = this._userEditor;
    };
    this._defaultsEditor.host.addEventListener(
      'focusin',
      this._defaultsFocusHandler
    );
    this._userEditor.host.addEventListener('focusin', this._userFocusHandler);
  }

  get isReadOnly(): boolean {
    return this.editor.getOption('readOnly') as boolean;
  }

  /**
   * Support for options adjusting replacement behavior.
   */
  get replaceOptionsSupport(): IReplaceOptionsSupport {
    return {
      preserveCase: true
    };
  }

  /**
   * Text editor
   */
  get editor() {
    return this._activeEditor ?? this._userEditor;
  }

  /**
   * Editor content model
   */
  get model(): CodeEditor.IModel {
    return (this._activeEditor ?? this._userEditor).model;
  }

  async startQuery(
    query: RegExp,
    filters: IFilters | undefined
  ): Promise<void> {
    this._snapshotActiveEditor();
    this._searchActive = true;
    await super.startQuery(query, filters);
    await this.highlightNext(true, {
      from: 'selection-start',
      scroll: false,
      select: false
    });
  }

  /**
   * Stop the search and clean any UI elements.
   */
  async endQuery(): Promise<void> {
    this._searchActive = false;
    await super.endQuery();
  }

  /**
   * Dispose of the resources held by the search provider.
   */
  dispose(): void {
    this._defaultsEditor.host.removeEventListener(
      'focusin',
      this._defaultsFocusHandler
    );
    this._userEditor.host.removeEventListener(
      'focusin',
      this._userFocusHandler
    );
    super.dispose();
  }

  /**
   * Replace the currently selected match with the provided text.
   *
   * @param newText - The replacement text.
   * @returns Whether a replace occurred.
   */
  replaceCurrentMatch(
    newText: string,
    loop?: boolean,
    options?: IReplaceOptions
  ): Promise<boolean> {
    if (this.isReadOnly) {
      return Promise.resolve(false);
    }
    return super.replaceCurrentMatch(newText, loop, options);
  }

  /**
   * Replace all matches with the provided text.
   *
   * @param newText - The replacement text.
   * @returns Whether a replace occurred.
   */
  replaceAllMatches(
    newText: string,
    options?: IReplaceOptions
  ): Promise<boolean> {
    if (this.isReadOnly) {
      return Promise.resolve(false);
    }
    return super.replaceAllMatches(newText, options);
  }

  /**
   * CodeMirror search highlighter for the active editor.
   *
   * #### Notes
   * The base class binds its highlighter to the first editor it sees, so a
   * separate highlighter is kept per pane; switching panes clears the
   * highlights in the previous one.
   */
  protected get cmHandler(): CodeMirrorSearchHighlighter {
    const editor = this.editor;
    if (!this._activeCmHandler || this._activeCmHandlerEditor !== editor) {
      if (this._activeCmHandler) {
        void this._activeCmHandler.endQuery();
      }
      this._activeCmHandler = new CodeMirrorSearchHighlighter(editor);
      this._activeCmHandlerEditor = editor;
    }
    return this._activeCmHandler;
  }

  /**
   * Callback on source change
   *
   * @param emitter Source of the change
   * @param changes Source change
   */
  protected async onSharedModelChanged(
    emitter: ISharedText,
    changes: SourceChange
  ): Promise<void> {
    // Ignore changes from the pane that is no longer active.
    if (emitter !== this.model.sharedModel) {
      return;
    }
    if (this._searchActive) {
      return super.onSharedModelChanged(emitter, changes);
    }
  }

  /**
   * Update matches
   */
  protected async updateCodeMirror(content: string): Promise<void> {
    await super.updateCodeMirror(content);
    if (this.isReadOnly) {
      this.cmHandler.matches.forEach(match => {
        match.readOnly = true;
      });
    }
  }

  /**
   * Instantiate a search provider for the widget.
   *
   * #### Notes
   * The widget provided is always checked using `isApplicable` before calling
   * this factory.
   *
   * @param widget The widget to search on
   * @param translator [optional] The translator object
   *
   * @returns The search provider on the widget
   */
  static createNew(
    widget: SettingEditorPanel,
    translator?: ITranslator
  ): ISearchProvider {
    return new SettingEditorSearchProvider(widget);
  }

  /**
   * Report whether or not this provider has the ability to search on the given object
   */
  static isApplicable(domain: Widget): domain is SettingEditorPanel {
    return (
      domain instanceof MainAreaWidget &&
      domain.content instanceof JsonSettingEditor &&
      domain.content.source instanceof CodeMirrorEditor
    );
  }

  /**
   * Get an initial query value if applicable so that it can be entered
   * into the search box as an initial query
   *
   * @returns Initial value used to populate the search box.
   */
  getInitialQuery(): string {
    this._snapshotActiveEditor();
    const cm = this.editor as CodeMirrorEditor;
    const selection = cm.state.sliceDoc(
      cm.state.selection.main.from,
      cm.state.selection.main.to
    );
    return selection;
  }

  /**
   * Point the search at the pane that has focus, if either does.
   *
   * #### Notes
   * Focus is read live when possible, and falls back to the pane that last
   * fired a focus event; when neither pane has focus the previous pane is
   * kept, so reopening the search box does not move the search.
   */
  private _snapshotActiveEditor(): void {
    const active: CodeMirrorEditor | null = this._defaultsEditor.hasFocus()
      ? this._defaultsEditor
      : this._userEditor.hasFocus()
        ? this._userEditor
        : this._focusedEditor;
    if (active && active !== this._activeEditor) {
      const previous = this._activeEditor;
      if (previous) {
        previous.model.sharedModel.changed.disconnect(
          this.onSharedModelChanged,
          this
        );
      }
      this._activeEditor = active;
    }
  }

  private _activeEditor: CodeMirrorEditor | null = null;
  private _activeCmHandler: CodeMirrorSearchHighlighter | null = null;
  private _activeCmHandlerEditor: CodeMirrorEditor | null = null;
  private _defaultsEditor: CodeMirrorEditor;
  private _defaultsFocusHandler: () => void;
  private _focusedEditor: CodeMirrorEditor | null = null;
  private _searchActive = false;
  private _userEditor: CodeMirrorEditor;
  private _userFocusHandler: () => void;
}
