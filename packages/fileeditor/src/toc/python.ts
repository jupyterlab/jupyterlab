// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { DocumentRegistry, IDocumentWidget } from '@jupyterlab/docregistry';
import { TableOfContents, TableOfContentsModel } from '@jupyterlab/toc';
import { Widget } from '@lumino/widgets';
import { FileEditor } from '../widget';
import { EditorToCModelFactory, IEditorHeading } from './factory';

/**
 * Regular expression to create the outline
 */
const KEYWORDS = new RegExp(/^\s*(class |def |from |import )/);

/**
 * Table of content model for Python files.
 */
export class PythonToCModel extends TableOfContentsModel<
  IEditorHeading,
  IDocumentWidget<FileEditor, DocumentRegistry.IModel>
> {
  /**
   * Type of document supported by the model.
   *
   * #### Notes
   * A `data-document-type` attribute with this value will be set
   * on the tree view `.jp-TableOfContents-content[data-document-type="..."]`
   */
  get documentType(): string {
    return 'python';
  }

  /**
   * Produce the headings for a document.
   *
   * @returns The list of new headings or `null` if nothing needs to be updated.
   */
  protected getHeadings(): Promise<IEditorHeading[] | null> {
    if (!this.isActive) {
      return Promise.resolve(null);
    }

    // Split the text into lines:
    const lines = this.widget.content.model.value.text.split('\n') as Array<
      string
    >;

    // Iterate over the lines to get the heading level and text for each line:
    let headings = new Array<IEditorHeading>();
    let processingImports = false;

    let indent = 1;

    let lineIdx = -1;
    for (const line of lines) {
      lineIdx++;
      const hasKeyword = KEYWORDS.exec(line);
      if (hasKeyword) {
        // Index 0 contains the spaces, index 1 is the keyword group
        const [start] = (hasKeyword as any).indices[1];
        if (indent === 1 && start > 0) {
          indent = start;
        }

        const isImport = ['from ', 'import '].includes(hasKeyword[1]);
        if (isImport && processingImports) {
          continue;
        }
        processingImports = isImport;

        const level = 1 + start / indent;

        if (level > this.configuration.maximalDepth) {
          continue;
        }

        headings.push({
          text: line.slice(start),
          level,
          line: lineIdx
        });
      }
    }

    return Promise.resolve(headings);
  }
}

/**
 * Table of content model factory for Python files.
 */
export class PythonToCFactory extends EditorToCModelFactory {
  /**
   * Whether the factory can handle the widget or not.
   *
   * @param widget - widget
   * @returns boolean indicating a ToC can be generated
   */
  isApplicable(widget: Widget): boolean {
    const isApplicable = super.isApplicable(widget);

    if (isApplicable) {
      let mime = (widget as any).content?.model?.mimeType;
      return (
        mime &&
        (mime === 'application/x-python-code' || mime === 'text/x-python')
      );
    }
    return false;
  }

  /**
   * Create a new table of contents model for the widget
   *
   * @param widget - widget
   * @param configuration - Table of contents configuration
   * @returns The table of contents model
   */
  protected _createNew(
    widget: IDocumentWidget<FileEditor>,
    configuration?: TableOfContents.IConfig
  ): PythonToCModel {
    return new PythonToCModel(widget, configuration);
  }
}
