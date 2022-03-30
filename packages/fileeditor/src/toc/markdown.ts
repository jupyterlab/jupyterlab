// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { DocumentRegistry, IDocumentWidget } from '@jupyterlab/docregistry';
import {
  TableOfContents,
  TableOfContentsFactory,
  ToCUtils
} from '@jupyterlab/toc';
import { Widget } from '@lumino/widgets';
import { EditorToCModel, IEditorHeading } from './model';
import { FileEditor } from '../widget';

export class MarkdownToCModel extends EditorToCModel {
  protected getHeadings(): Promise<IEditorHeading[] | null> {
    if (!this.isActive) {
      return Promise.resolve(null);
    }

    const content = this.widget.content.model.value.text;

    const headings = ToCUtils.Markdown.getHeadings(content, this.configuration);
    return Promise.resolve(headings);
  }
}

export class MarkdownToCFactory extends TableOfContentsFactory<
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
      return mime && ToCUtils.Markdown.isMarkdown(mime);
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
    widget: IDocumentWidget<FileEditor, DocumentRegistry.IModel>,
    configuration?: TableOfContents.IConfig
  ): MarkdownToCModel {
    return new MarkdownToCModel(widget, configuration);
  }
}
