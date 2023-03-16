// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { DocumentRegistry, IDocumentWidget } from '@jupyterlab/docregistry';
import {
  TableOfContents,
  TableOfContentsModel,
  TableOfContentsUtils
} from '@jupyterlab/toc';
import { Widget } from '@lumino/widgets';
import { FileEditor } from '../widget';
import { EditorTableOfContentsFactory, IEditorHeading } from './factory';

/**
 * Table of content model for Markdown files.
 */
export class MarkdownTableOfContentsModel extends TableOfContentsModel<
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
    return 'markdown';
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

    const content = this.widget.content.model.sharedModel.getSource();

    const headings = TableOfContentsUtils.filterHeadings(
      TableOfContentsUtils.Markdown.getHeadings(content),
      {
        ...this.configuration,
        // Force removing numbering as they cannot be displayed
        // in the document
        numberHeaders: false
      }
    );
    return Promise.resolve(headings);
  }
}

/**
 * Table of content model factory for Markdown files.
 */
export class MarkdownTableOfContentsFactory extends EditorTableOfContentsFactory {
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
      return mime && TableOfContentsUtils.Markdown.isMarkdown(mime);
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
  ): MarkdownTableOfContentsModel {
    return new MarkdownTableOfContentsModel(widget, configuration);
  }
}
