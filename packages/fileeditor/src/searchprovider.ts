// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { MainAreaWidget } from '@jupyterlab/apputils';
import { CodeMirrorEditor, EditorSearchProvider } from '@jupyterlab/codemirror';
import type { IHighlightAdjacentMatchOptions } from '@jupyterlab/codemirror';
import type { CodeEditor } from '@jupyterlab/codeeditor';
import type {
  IFilters,
  IReplaceOptionsSupport,
  ISearchMatch,
  ISearchProvider
} from '@jupyterlab/documentsearch';
import type { ITranslator } from '@jupyterlab/translation';
import type { Widget } from '@lumino/widgets';
import { FileEditor } from './widget';
import type { ISharedText, SourceChange } from '@jupyter/ydoc';

/**
 * Helper type
 */
export type FileEditorPanel = MainAreaWidget<FileEditor>;

/**
 * File editor search provider
 */
export class FileEditorSearchProvider
  extends EditorSearchProvider<CodeEditor.IModel>
  implements ISearchProvider
{
  /**
   * Constructor
   * @param widget File editor panel
   */
  constructor(protected widget: FileEditorPanel) {
    super();
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
    return this.widget.content.editor as CodeMirrorEditor;
  }

  /**
   * Editor content model
   */
  get model(): CodeEditor.IModel {
    return this.widget.content.model;
  }

  async startQuery(
    query: RegExp,
    filters: IFilters | undefined
  ): Promise<void> {
    const queryKey = JSON.stringify([query.source, query.flags, filters ?? {}]);
    // `startQuery` also restarts the search after each change of the text
    const isNewQuery = queryKey !== this._queryKey;
    this._queryKey = queryKey;
    this._searchActive = true;
    await super.startQuery(query, filters);
    await this.highlightNext(true, {
      from: 'selection-start',
      scroll: isNewQuery,
      select: false
    });
  }

  /**
   * Highlight the next match, or the first one after the last match.
   *
   * @param loop - Whether to go on from the last match to the first one.
   * @param options - Options of the step.
   * @returns The next match if there is one.
   */
  async highlightNext(
    loop = true,
    options?: IHighlightAdjacentMatchOptions
  ): Promise<ISearchMatch | undefined> {
    const match = await super.highlightNext(false, options);
    if (match || !loop || this.matchesCount === 0) {
      return match;
    }
    return super.highlightNext(false, { ...options, from: 'start' });
  }

  /**
   * Highlight the previous match, or the last one before the first match.
   *
   * @param loop - Whether to go on from the first match to the last one.
   * @param options - Options of the step.
   * @returns The previous match if there is one.
   */
  async highlightPrevious(
    loop = true,
    options?: IHighlightAdjacentMatchOptions
  ): Promise<ISearchMatch | undefined> {
    const match = await super.highlightPrevious(false, options);
    if (match || !loop || this.matchesCount === 0) {
      return match;
    }
    // Without a current match, a step back from the start begins at the end
    return super.highlightPrevious(false, { ...options, from: 'start' });
  }

  /**
   * Stop the search and clean any UI elements.
   */
  async endQuery(): Promise<void> {
    this._searchActive = false;
    this._queryKey = null;
    await super.endQuery();
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
    if (this._searchActive) {
      return super.onSharedModelChanged(emitter, changes);
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
    widget: FileEditorPanel,
    translator?: ITranslator
  ): ISearchProvider {
    return new FileEditorSearchProvider(widget);
  }

  /**
   * Report whether or not this provider has the ability to search on the given object
   */
  static isApplicable(domain: Widget): domain is FileEditorPanel {
    return (
      domain instanceof MainAreaWidget &&
      domain.content instanceof FileEditor &&
      domain.content.editor instanceof CodeMirrorEditor
    );
  }

  /**
   * Get an initial query value if applicable so that it can be entered
   * into the search box as an initial query
   *
   * @returns Initial value used to populate the search box.
   */
  getInitialQuery(): string {
    const cm = this.editor as CodeMirrorEditor;
    const selection = cm.state.sliceDoc(
      cm.state.selection.main.from,
      cm.state.selection.main.to
    );
    return selection;
  }

  private _searchActive = false;
  private _queryKey: string | null = null;
}
