// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { MainAreaWidget } from '@jupyterlab/apputils';
import { CodeMirrorEditor, EditorSearchProvider } from '@jupyterlab/codemirror';
import type { CodeEditor } from '@jupyterlab/codeeditor';
import type {
  IFilters,
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
 * Search provider for the JSON settings editor.
 */
export class SettingEditorSearchProvider
  extends EditorSearchProvider<CodeEditor.IModel>
  implements ISearchProvider
{
  constructor(protected widget: SettingEditorPanel) {
    super();
  }

  get isReadOnly(): boolean {
    return this.editor.getOption('readOnly') as boolean;
  }

  get replaceOptionsSupport(): IReplaceOptionsSupport {
    return { preserveCase: true };
  }

  get editor(): CodeMirrorEditor {
    return this.widget.content.source as CodeMirrorEditor;
  }

  get model(): CodeEditor.IModel {
    return this.widget.content.source.model;
  }

  async startQuery(
    query: RegExp,
    filters: IFilters | undefined
  ): Promise<void> {
    this._searchActive = true;
    await super.startQuery(query, filters);
    await this.highlightNext(true, {
      from: 'selection-start',
      scroll: false,
      select: false
    });
  }

  async endQuery(): Promise<void> {
    this._searchActive = false;
    await super.endQuery();
  }

  protected async onSharedModelChanged(
    emitter: ISharedText,
    changes: SourceChange
  ): Promise<void> {
    if (this._searchActive) {
      return super.onSharedModelChanged(emitter, changes);
    }
  }

  static createNew(
    widget: SettingEditorPanel,
    translator?: ITranslator
  ): ISearchProvider {
    return new SettingEditorSearchProvider(widget);
  }

  static isApplicable(domain: Widget): domain is SettingEditorPanel {
    return (
      domain instanceof MainAreaWidget &&
      domain.content instanceof JsonSettingEditor
    );
  }

  getInitialQuery(): string {
    const cm = this.editor;
    return cm.state.sliceDoc(
      cm.state.selection.main.from,
      cm.state.selection.main.to
    );
  }

  private _searchActive = false;
}
