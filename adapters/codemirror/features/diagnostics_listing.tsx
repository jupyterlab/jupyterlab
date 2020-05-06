import React, { ReactElement } from 'react';
import { VDomModel, VDomRenderer } from '@jupyterlab/apputils';
import { caretDownIcon, caretUpIcon, LabIcon } from '@jupyterlab/ui-components';
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

import diagnosticsSvg from '../../../../style/icons/diagnostics.svg';

export const diagnosticsIcon = new LabIcon({
  name: 'lsp:diagnostics',
  svgstr: diagnosticsSvg
});

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

export const DIAGNOSTICS_LISTING_CLASS = 'lsp-diagnostics-listing';

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
  /**
   * Cell number is the ordinal, 1-based cell identifier displayed to the user.
   */
  cell_number?: number;
}

interface IListingContext {
  db: DiagnosticsDatabase;
  editor: VirtualEditor;
}

interface IColumnOptions {
  name: string;
  render_cell(data: IDiagnosticsRow, context?: IListingContext): ReactElement;
  sort(a: IDiagnosticsRow, b: IDiagnosticsRow): number;
  is_available?(context: IListingContext): boolean;
}

class Column {
  public is_visible: boolean;

  constructor(private options: IColumnOptions) {
    this.is_visible = true;
  }

  render_cell(data: IDiagnosticsRow, context: IListingContext) {
    return this.options.render_cell(data, context);
  }

  sort(a: IDiagnosticsRow, b: IDiagnosticsRow) {
    return this.options.sort(a, b);
  }

  get name(): string {
    return this.options.name;
  }

  is_available(context: IListingContext) {
    if (this.options.is_available != null) {
      return this.options.is_available(context);
    }
    return true;
  }

  render_header(listing: DiagnosticsListing): ReactElement {
    return <SortableTH name={this.name} listing={listing} key={this.name} />;
  }
}

function SortableTH(props: { name: string; listing: DiagnosticsListing }): any {
  const is_sort_key = props.name === props.listing.sort_key;
  const sortIcon =
    !is_sort_key || props.listing.sort_direction === 1
      ? caretUpIcon
      : caretDownIcon;
  return (
    <th
      key={props.name}
      onClick={() => props.listing.sort(props.name)}
      className={is_sort_key ? 'lsp-sorted-header' : null}
    >
      <div>
        <label>{props.name}</label>
        <sortIcon.react tag="span" className="lsp-sort-icon" />
      </div>
    </th>
  );
}

export class DiagnosticsListing extends VDomRenderer<DiagnosticsListing.Model> {
  sort_key = 'Severity';
  sort_direction = 1;

  columns = [
    new Column({
      name: 'Virtual Document',
      render_cell: (row, context) => (
        <td key={0}>
          <DocumentLocator document={row.document} editor={context.editor} />
        </td>
      ),
      sort: (a, b) => a.document.id_path.localeCompare(b.document.id_path),
      is_available: context => context.db.size > 1
    }),
    new Column({
      name: 'Message',
      render_cell: row => {
        let message = message_without_code(row.data.diagnostic);
        return <td key={1}>{message}</td>;
      },
      sort: (a, b) =>
        a.data.diagnostic.message.localeCompare(b.data.diagnostic.message)
    }),
    new Column({
      name: 'Code',
      render_cell: row => <td key={2}>{row.data.diagnostic.code}</td>,
      sort: (a, b) =>
        (a.data.diagnostic.code + '').localeCompare(
          b.data.diagnostic.source + ''
        )
    }),
    new Column({
      name: 'Severity',
      // TODO: use default diagnostic severity
      render_cell: row => (
        <td key={3}>
          {diagnosticSeverityNames[row.data.diagnostic.severity || 1]}
        </td>
      ),
      sort: (a, b) =>
        a.data.diagnostic.severity > b.data.diagnostic.severity ? 1 : -1
    }),
    new Column({
      name: 'Source',
      render_cell: row => <td key={4}>{row.data.diagnostic.source}</td>,
      sort: (a, b) =>
        a.data.diagnostic.source.localeCompare(b.data.diagnostic.source)
    }),
    new Column({
      name: 'Cell',
      render_cell: row => <td key={5}>{row.cell_number}</td>,
      sort: (a, b) => (a.cell_number > b.cell_number ? 1 : -1),
      is_available: context => context.editor.has_cells
    }),
    new Column({
      name: 'Line',
      render_cell: row => <td key={6}>{row.data.range.start.line}</td>,
      sort: (a, b) =>
        a.data.range.start.line > b.data.range.start.line ? 1 : -1
    }),
    new Column({
      name: 'Ch',
      render_cell: row => <td key={7}>{row.data.range.start.line}</td>,
      sort: (a, b) => (a.data.range.start.ch > b.data.range.start.ch ? 1 : -1)
    })
  ];

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
    if (!diagnostics_db || editor == null) {
      return <div>No issues detected, great job!</div>;
    }

    let by_document = Array.from(diagnostics_db).map(
      ([virtual_document, diagnostics]) => {
        if (virtual_document.isDisposed) {
          return [];
        }
        return diagnostics.map((diagnostic_data, i) => {
          let cell_number: number = null;
          if (editor.has_cells) {
            let notebook_editor = editor as VirtualEditorForNotebook;
            let { cell_id } = notebook_editor.find_cell_by_editor(
              diagnostic_data.editor
            );
            cell_number = cell_id + 1;
          }
          return {
            data: diagnostic_data,
            key: virtual_document.uri + ',' + i,
            document: virtual_document,
            cell_number: cell_number,
            editor: editor
          } as IDiagnosticsRow;
        });
      }
    );
    let flattened: IDiagnosticsRow[] = [].concat.apply([], by_document);

    let sorted_column = this.columns.filter(
      column => column.name === this.sort_key
    )[0];
    let sorter = sorted_column.sort.bind(sorted_column);
    let sorted = flattened.sort((a, b) => sorter(a, b) * this.sort_direction);

    let context: IListingContext = {
      db: diagnostics_db,
      editor: editor
    };

    let columns_to_display = this.columns.filter(
      column => column.is_available(context) && column.is_visible
    );

    let elements = sorted.map(row => {
      let cm_editor = row.data.editor;

      let cells = columns_to_display.map(column =>
        column.render_cell(row, context)
      );

      return (
        <tr
          key={row.key}
          onClick={() => {
            focus_on(cm_editor.getWrapperElement());
            cm_editor.getDoc().setCursor(row.data.range.start);
            cm_editor.focus();
          }}
        >
          {cells}
        </tr>
      );
    });

    let columns_headers = columns_to_display.map(column =>
      column.render_header(this)
    );

    return (
      <table className={DIAGNOSTICS_LISTING_CLASS}>
        <thead>
          <tr>{columns_headers}</tr>
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
