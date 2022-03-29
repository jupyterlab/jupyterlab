// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IDocumentWidget } from '@jupyterlab/docregistry';
import { TableOfContents, TableOfContentsModel } from '@jupyterlab/toc';
import { FileEditor } from '../widget';

export interface IEditorHeading extends TableOfContents.IHeading {
  line: number;
}

export abstract class EditorToCModel extends TableOfContentsModel<
  IEditorHeading,
  IDocumentWidget<FileEditor>
> {
  set activeHeading(heading: IEditorHeading | null) {
    super.activeHeading = heading;
    if (heading) {
      this.widget.content.editor.setCursorPosition({
        line: heading.line,
        column: 0
      });
    }
  }
}
