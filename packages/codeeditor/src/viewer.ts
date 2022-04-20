// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { StackedLayout, Widget } from '@lumino/widgets';
import { CodeEditor } from './editor';
import { CodeEditorWrapper } from './widget';

export class CodeViewerWidget extends Widget {
  /**
   * Construct a new code viewer widget.
   */
  constructor(options: CodeViewerWidget.IOptions) {
    super();

    this.model = new CodeEditor.Model({
      value: options.content,
      mimeType: options.mimeType
    });

    const editorWidget = new CodeEditorWrapper({
      factory: options.factory,
      model: this.model
    });
    this.editor = editorWidget.editor;
    this.editor.setOption('readOnly', true);

    const layout = (this.layout = new StackedLayout());
    layout.addWidget(editorWidget);
  }

  model: CodeEditor.IModel;
  editor: CodeEditor.IEditor;
}

/**
 * The namespace for code viewer widget.
 */
export namespace CodeViewerWidget {
  /**
   * The options used to create an code viewer widget.
   */
  export interface IOptions {
    /**
     * A code editor factory.
     */
    factory: CodeEditor.Factory;

    /**
     * The content to display in the viewer.
     */
    content: string;

    /**
     * The mime type for the content.
     */
    mimeType?: string;
  }
}
