// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import type { ISearchProviderFactory } from '@jupyterlab/documentsearch';
import { GenericSearchProvider } from '@jupyterlab/documentsearch';
import { MarkdownDocument } from '@jupyterlab/markdownviewer';

/**
 * Search provider for the rendered markdown of a markdown viewer.
 *
 * #### Notes
 * It is built over the inner `MarkdownViewer`, so the toolbar, the content
 * header and the search overlay itself are left out of the search.
 */
export class MarkdownViewerSearchProvider extends GenericSearchProvider {
  /**
   * Get an initial query value if applicable so that it can be entered
   * into the search box as an initial query
   *
   * @returns Initial value used to populate the search box.
   */
  getInitialQuery(): string {
    const selection = window.getSelection();
    // Ignore a selection made outside of the rendered markdown, for example
    // in another document or in the file browser.
    if (!selection || !this.widget.node.contains(selection.anchorNode)) {
      return '';
    }
    return selection.toString();
  }
}

/**
 * Factory registering `MarkdownViewerSearchProvider` for markdown documents.
 */
export const markdownViewerSearchProviderFactory: ISearchProviderFactory<MarkdownDocument> =
  {
    isApplicable: (domain): domain is MarkdownDocument =>
      domain instanceof MarkdownDocument,
    createNew: (widget: MarkdownDocument) =>
      new MarkdownViewerSearchProvider(widget.content)
  };
