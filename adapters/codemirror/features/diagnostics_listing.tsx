import React from 'react';
import { VDomModel, VDomRenderer } from '@jupyterlab/apputils';
import * as lsProtocol from 'vscode-languageserver-protocol';
import * as CodeMirror from 'codemirror';
import { IEditorPosition } from '../../../positioning';
import { VirtualEditor } from '../../../virtual/editor';
import { VirtualEditorForNotebook } from '../../../virtual/editors/notebook';
import { VirtualDocument } from '../../../virtual/document';

import '../../../../style/diagnostics_listing.css';
import { Cell } from '@jupyterlab/cells';
import { diagnosticSeverityNames } from '../../../lsp';
import { message_without_code } from './diagnostics';

/**
 * Diagnostic which is localized at a specific editor (cell) within a notebook
 * (if used in the context of a FileEditor, then there is just a single editor)
 */
export interface IEditorDiagnostic {
  diagnostic: lsProtocol.Diagnostic;
  editor: CodeMirror.Editor;
  range: {
    start: IEditorPosition;
    end: IEditorPosition;
  };
}

export class DiagnosticsDatabase extends Map<
  VirtualDocument,
  IEditorDiagnostic[]
> {
  get all(): Array<IEditorDiagnostic> {
    return [].concat.apply([], this.values());
  }
}

function focus_on(node: HTMLElement) {
  if (!node) {
    return;
  }
  node.scrollIntoView();
  node.focus();
}

function DocumentLocator(props: {
  document: VirtualDocument;
  editor: VirtualEditor;
}) {
  let { document, editor } = props;
  let ancestry = document.ancestry;
  let target_cell: Cell = null;
  let breadcrumbs: any = ancestry.map(document => {
    if (!document.parent) {
      let path = document.path;
      if (
        !editor.has_lsp_supported_file &&
        path.endsWith(document.file_extension)
      ) {
        path = path.slice(0, -document.file_extension.length - 1);
      }
      return <span key={document.uri}>{path}</span>;
    }
    if (!document.virtual_lines.size) {
      return <span key={document.uri}>Empty document</span>;
    }
    try {
      if (editor.has_cells) {
        let first_line = document.virtual_lines.get(0);
        let last_line = document.virtual_lines.get(
          document.last_virtual_line - 1
        );
        let notebook_editor = editor as VirtualEditorForNotebook;
        let { cell_id: first_cell, cell } = notebook_editor.find_cell_by_editor(
          first_line.editor
        );
        let { cell_id: last_cell } = notebook_editor.find_cell_by_editor(
          last_line.editor
        );
        target_cell = cell;

        let cell_locator =
          first_cell === last_cell
            ? `cell ${first_cell + 1}`
            : `cells: ${first_cell + 1}-${last_cell + 1}`;

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
  return (
    <div
      className={'lsp-document-locator'}
      onClick={() => focus_on(target_cell ? target_cell.node : null)}
    >
      {breadcrumbs}
    </div>
  );
}

interface IDiagnosticsRow {
  data: IEditorDiagnostic;
  key: string;
  document: VirtualDocument;
  cell_nr?: number;
}

const sorters: Record<
  string,
  (a: IDiagnosticsRow, b: IDiagnosticsRow) => number
> = {
  'Virtual Document': (a: IDiagnosticsRow, b: IDiagnosticsRow) => {
    return a.document.id_path.localeCompare(b.document.id_path);
  },
  Message: (a: IDiagnosticsRow, b: IDiagnosticsRow) => {
    return a.data.diagnostic.message.localeCompare(b.data.diagnostic.message);
  },
  Source: (a: IDiagnosticsRow, b: IDiagnosticsRow) => {
    return a.data.diagnostic.source.localeCompare(b.data.diagnostic.source);
  },
  Code: (a: IDiagnosticsRow, b: IDiagnosticsRow) => {
    return (a.data.diagnostic.code + '').localeCompare(
      b.data.diagnostic.source + ''
    );
  },
  Severity: (a: IDiagnosticsRow, b: IDiagnosticsRow) => {
    return a.data.diagnostic.severity > b.data.diagnostic.severity ? 1 : -1;
  },
  Line: (a: IDiagnosticsRow, b: IDiagnosticsRow) => {
    return a.data.range.start.line > b.data.range.start.line ? 1 : -1;
  },
  Ch: (a: IDiagnosticsRow, b: IDiagnosticsRow) => {
    return a.data.range.start.ch > b.data.range.start.ch ? 1 : -1;
  },
  Cell: (a: IDiagnosticsRow, b: IDiagnosticsRow) => {
    return a.cell_nr > b.cell_nr ? 1 : -1;
  }
};

export class DiagnosticsListing extends VDomRenderer<DiagnosticsListing.Model> {
  sort_key = 'Severity';
  sort_direction = 1;

  constructor(model: DiagnosticsListing.Model) {
    super();
    this.model = model;
  }

  sort(key: string) {
    if (key === this.sort_key) {
      this.sort_direction = this.sort_direction * -1;
    } else {
      this.sort_key = key;
      this.sort_direction = 1;
    }
    this.update();
  }

  render() {
    let diagnostics_db = this.model.diagnostics;
    const editor = this.model.virtual_editor;
    if (!diagnostics_db || typeof editor === 'undefined') {
      return <div>No issues detected, great job!</div>;
    }
    let documents_count = diagnostics_db.size;

    let by_document = Array.from(diagnostics_db).map(
      ([virtual_document, diagnostics]) => {
        return diagnostics.map((diagnostic_data, i) => {
          let cell_nr: number = null;
          if (editor.has_cells) {
            let notebook_editor = editor as VirtualEditorForNotebook;
            let { cell_id } = notebook_editor.find_cell_by_editor(
              diagnostic_data.editor
            );
            cell_nr = cell_id + 1;
          }
          return {
            data: diagnostic_data,
            key: virtual_document.uri + ',' + i,
            document: virtual_document,
            cell_nr: cell_nr
          } as IDiagnosticsRow;
        });
      }
    );
    let flattened: IDiagnosticsRow[] = [].concat.apply([], by_document);

    let sorter = sorters[this.sort_key];
    let sorted = flattened.sort((a, b) => sorter(a, b) * this.sort_direction);

    let elements = sorted.map(({ data, key, document, cell_nr }) => {
      let diagnostic = data.diagnostic;

      let cm_editor = data.editor;

      let message = message_without_code(diagnostic);
      let severity = diagnostic.severity || 1;

      return (
        <tr
          key={key}
          onClick={() => {
            focus_on(cm_editor.getWrapperElement());
            cm_editor.getDoc().setCursor(data.range.start);
            cm_editor.focus();
          }}
        >
          {documents_count > 1 ? (
            <td>
              <DocumentLocator document={document} editor={editor} />
            </td>
          ) : null}
          <td>{message}</td>
          <td>{diagnostic.code}</td>
          <td>{diagnosticSeverityNames[severity]}</td>
          <td>{diagnostic.source}</td>
          {editor.has_cells ? <td>{cell_nr}</td> : null}
          <td>{data.range.start.line}</td>
          <td>{data.range.start.ch}</td>
        </tr>
      );
    });

    let SortableTH = (props: { name: string }): any => {
      const is_sort_key = props.name === this.sort_key;
      return (
        <th
          onClick={() => this.sort(props.name)}
          className={
            is_sort_key
              ? 'lsp-sorted ' +
                (this.sort_direction === 1 ? 'lsp-descending' : '')
              : ''
          }
        >
          {props.name}
          {is_sort_key ? <span className={'lsp-caret'} /> : null}
        </th>
      );
    };

    return (
      <table className={'lsp-diagnostics-listing'}>
        <thead>
          <tr>
            {documents_count > 1 ? (
              <SortableTH name={'Virtual Document'} />
            ) : null}
            <SortableTH name={'Message'} />
            <SortableTH name={'Code'} />
            <SortableTH name={'Severity'} />
            <SortableTH name={'Source'} />
            {editor.has_cells ? <SortableTH name={'Cell'} /> : null}
            <SortableTH name={'Line'} />
            <SortableTH name={'Ch'} />
          </tr>
        </thead>
        <tbody>{elements}</tbody>
      </table>
    );
  }
}

export namespace DiagnosticsListing {
  /**
   * A VDomModel for the LSP of current file editor/notebook.
   */
  export class Model extends VDomModel {
    diagnostics: DiagnosticsDatabase;
    virtual_editor: VirtualEditor;

    constructor() {
      super();
    }
  }
}
