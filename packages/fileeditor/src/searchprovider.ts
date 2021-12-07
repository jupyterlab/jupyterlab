// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { MainAreaWidget } from '@jupyterlab/apputils';
import {
  CodeMirrorEditor,
  CodeMirrorSearchProvider
} from '@jupyterlab/codemirror';
import { ISearchProvider } from '@jupyterlab/documentsearch';
import { Widget } from '@lumino/widgets';
import { FileEditor } from './widget';

export type FileEditorPanel = MainAreaWidget<FileEditor>;

export class FileEditorSearchProvider
  extends CodeMirrorSearchProvider
  implements ISearchProvider<FileEditorPanel> {
  /**
   * Report whether or not this provider has the ability to search on the given object
   */
  static canSearchOn(domain: Widget): domain is FileEditorPanel {
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
  getInitialQuery(searchTarget: FileEditorPanel): any {
    const cm = searchTarget.content.editor as CodeMirrorEditor;
    const selection = cm.doc.getSelection();
    // if there are newlines, just return empty string
    return selection.search(/\r?\n|\r/g) === -1 ? selection : '';
  }

  /**
   * Initialize the search using the provided options.  Should update the UI
   * to highlight all matches and "select" whatever the first match should be.
   *
   * @param query A RegExp to be use to perform the search
   * @param searchTarget The widget to be searched
   * @param filters Filter parameters to pass to provider
   *
   * @returns A promise that resolves with a list of all matches
   */
  async startQuery(
    query: RegExp,
    searchTarget: FileEditorPanel,
    filters = {}
  ): Promise<void> {
    const cm = searchTarget.content.editor as CodeMirrorEditor;
    await this.startQueryCodeMirror(query, cm);
  }
}
