import { IDocumentWidget } from '@jupyterlab/docregistry';
import { nullTranslator, TranslationBundle } from '@jupyterlab/translation';
import React from 'react';

import { WidgetAdapter } from '../adapters/adapter';
import { VirtualDocument } from '../virtual/document';

export function getBreadcrumbs(
  document: VirtualDocument,
  adapter: WidgetAdapter<IDocumentWidget>,
  trans?: TranslationBundle,
  collapse = true
): JSX.Element[] {
  if (!trans) {
    trans = nullTranslator.load('');
  }
  return document.ancestry.map((document: VirtualDocument) => {
    if (!document.parent) {
      let path = document.path;
      if (
        !document.has_lsp_supported_file &&
        path.endsWith(document.file_extension)
      ) {
        path = path.slice(0, -document.file_extension.length - 1);
      }
      const full_path = path;
      if (collapse) {
        let parts = path.split('/');
        if (parts.length > 2) {
          path = parts[0] + '/.../' + parts[parts.length - 1];
        }
      }
      return (
        <span key={document.uri} title={full_path}>
          {path}
        </span>
      );
    }
    if (!document.virtual_lines.size) {
      return <span key={document.uri}>Empty document</span>;
    }
    try {
      if (adapter.has_multiple_editors) {
        let first_line = document.virtual_lines.get(0);
        let last_line = document.virtual_lines.get(
          document.last_virtual_line - 1
        );

        let first_cell = adapter.get_editor_index(first_line.editor);
        let last_cell = adapter.get_editor_index(last_line.editor);

        let cell_locator =
          first_cell === last_cell
            ? trans.__('cell %1', first_cell + 1)
            : trans.__('cells: %1-%2', first_cell + 1, last_cell + 1);

        return (
          <span key={document.uri}>
            {document.language} ({cell_locator})
          </span>
        );
      }
    } catch (e) {
      console.warn('LSP: could not display document cell location', e);
    }
    return <span key={document.uri}>{document.language}</span>;
  });
}

/**
 * @deprecated please use getBreadcrumbs instead; `get_breadcrumbs` will be removed in 4.0
 */
export function get_breadcrumbs(
  document: VirtualDocument,
  adapter: WidgetAdapter<IDocumentWidget>,
  collapse = true
) {
  return getBreadcrumbs(document, adapter, null, collapse);
}

export function focus_on(node: HTMLElement) {
  if (!node) {
    return;
  }
  node.scrollIntoView();
  node.focus();
}

export function DocumentLocator(props: {
  document: VirtualDocument;
  adapter: WidgetAdapter<any>;
  trans?: TranslationBundle;
}) {
  let { document, adapter } = props;
  let target: HTMLElement = null;
  if (adapter.has_multiple_editors) {
    let first_line = document.virtual_lines.get(0);
    if (first_line) {
      target = adapter.get_editor_wrapper(first_line.editor);
    } else {
      console.warn('Could not get first line of ', document);
    }
  }
  let breadcrumbs = getBreadcrumbs(document, adapter, props.trans);
  return (
    <div
      className={'lsp-document-locator'}
      onClick={() => focus_on(target ? target : null)}
    >
      {breadcrumbs}
    </div>
  );
}
