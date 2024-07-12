// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { DocumentRegistry, IDocumentWidget } from '@jupyterlab/docregistry';
import {
  TableOfContents,
  TableOfContentsFactory,
  TableOfContentsModel
} from '@jupyterlab/toc';
import { FileEditor } from '../widget';

/**
 * Interface describing a file editor heading.
 */
export interface IEditorHeading extends TableOfContents.IHeading {
  /**
   * Heading line number.
   */
  line: number;
}

/**
 * Base table of contents model factory for file editor
 */
export abstract class EditorTableOfContentsFactory extends TableOfContentsFactory<
  IDocumentWidget<FileEditor>,
  IEditorHeading
> {
  /**
   * Create a new table of contents model for the widget
   *
   * @param widget - widget
   * @param configuration - Table of contents configuration
   * @returns The table of contents model
   */
  createNew(
    widget: IDocumentWidget<FileEditor, DocumentRegistry.IModel>,
    configuration?: TableOfContents.IConfig
  ): TableOfContentsModel<
    IEditorHeading,
    IDocumentWidget<FileEditor, DocumentRegistry.IModel>
  > {
    const model = super.createNew(widget, configuration);

    const onActiveHeadingChanged = (
      model: TableOfContentsModel<
        IEditorHeading,
        IDocumentWidget<FileEditor, DocumentRegistry.IModel>
      >,
      heading: IEditorHeading | null
    ) => {
      if (heading) {
        widget.content.editor.setCursorPosition({
          line: heading.line,
          column: 0
        });
      }
    };

    model.activeHeadingChanged.connect(onActiveHeadingChanged);
    widget.disposed.connect(() => {
      model.activeHeadingChanged.disconnect(onActiveHeadingChanged);
    });

    return model;
  }
}
