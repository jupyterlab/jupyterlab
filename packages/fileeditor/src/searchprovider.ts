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
   * Initialize the search state with the given target.
   *
   * @param searchTarget The widget to be searched
   *
   * @returns A promise that resolves when search state is initialized.
   */
  startSearch(searchTarget: FileEditorPanel): void {
    this.editor = searchTarget.content.editor as CodeMirrorEditor;
  }
}
