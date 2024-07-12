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
    this.model = options.model;

    const editorWidget = new CodeEditorWrapper({
      factory: options.factory,
      model: this.model,
      editorOptions: {
        ...options.editorOptions,
        config: { ...options.editorOptions?.config, readOnly: true }
      }
    });
    this.editor = editorWidget.editor;

    const layout = (this.layout = new StackedLayout());
    layout.addWidget(editorWidget);
  }

  static createCodeViewer(
    options: CodeViewerWidget.INoModelOptions
  ): CodeViewerWidget {
    const { content, mimeType, ...others } = options;
    const model = new CodeEditor.Model({
      mimeType
    });
    model.sharedModel.setSource(content);
    const widget = new CodeViewerWidget({ ...others, model });
    widget.disposed.connect(() => {
      model.dispose();
    });
    return widget;
  }

  get content(): string {
    return this.model.sharedModel.getSource();
  }

  get mimeType(): string {
    return this.model.mimeType;
  }

  readonly model: CodeEditor.IModel;
  readonly editor: CodeEditor.IEditor;
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
     * The content model for the viewer.
     */
    model: CodeEditor.IModel;
    /**
     * Code editor options
     */
    editorOptions?: Omit<CodeEditor.IOptions, 'host' | 'model'>;
  }

  /**
   * The options used to create an code viewer widget without a model.
   */
  export interface INoModelOptions extends Omit<IOptions, 'model'> {
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
