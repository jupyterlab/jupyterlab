// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IDocumentWidget } from '@jupyterlab/docregistry';
import { TableOfContents, TableOfContentsFactory } from '@jupyterlab/toc';
import { Widget } from '@lumino/widgets';
import { FileEditor } from '../widget';
import { EditorToCModel, IEditorHeading } from './model';

const KEYWORDS = new RegExp(/^\s*(class |def |from |import )/, 'd');

export class PythonToCModel extends EditorToCModel {
  protected getHeadings(): IEditorHeading[] | null {
    if (!this.isActive) {
      return null;
    }

    // Split the text into lines:
    const lines = this.widget.content.model.value.text.split('\n') as Array<
      string
    >;

    // Iterate over the lines to get the heading level and text for each line:
    let headings = new Array<IEditorHeading>();
    let processingImports = false;

    let indent = 1;

    let lineIdx = 0;
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

    return headings;
  }
}

export class PythonToCFactory extends TableOfContentsFactory<
  IDocumentWidget<FileEditor>
> {
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
