import React, { ReactElement } from 'react';
import { VDomModel, VDomRenderer } from '@jupyterlab/apputils';
import { caretDownIcon, caretUpIcon } from '@jupyterlab/ui-components';
import * as lsProtocol from 'vscode-languageserver-protocol';
import * as CodeMirror from 'codemirror';
import { IEditorPosition } from '../../positioning';
import { VirtualDocument } from '../../virtual/document';

import '../../../style/diagnostics_listing.css';
import { DiagnosticSeverity } from '../../lsp';
import { CodeMirrorVirtualEditor } from '../../virtual/codemirror_editor';
import { StatusMessage, WidgetAdapter } from '../../adapters/adapter';
import { IVirtualEditor } from '../../virtual/editor';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { IDocumentWidget } from '@jupyterlab/docregistry';
import { DocumentLocator, focus_on } from '../../components/utils';
import { FeatureSettings } from '../../feature';
import { CodeDiagnostics as LSPDiagnosticsSettings } from '../../_diagnostics';
import { TranslationBundle } from '@jupyterlab/translation';

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

export interface IDiagnosticsRow {
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
  editor: IVirtualEditor<CodeEditor.IEditor>;
  adapter: WidgetAdapter<IDocumentWidget>;
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

function SortableTH(props: {
  name: string;
  listing: DiagnosticsListing;
}): ReactElement {
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
        <label>{trans.__(props.name)}</label>
        <sortIcon.react tag="span" className="lsp-sort-icon" />
      </div>
    </th>
  );
}

export function message_without_code(diagnostic: lsProtocol.Diagnostic) {
  let message = diagnostic.message;
  let code_str = '' + diagnostic.code;
  if (
    diagnostic.code != null &&
    diagnostic.code !== '' &&
    message.startsWith(code_str + '')
  ) {
    return message.slice(code_str.length).trim();
  }
  return message;
}

export class DiagnosticsListing extends VDomRenderer<DiagnosticsListing.Model> {
  sort_key = 'Severity';
  sort_direction = 1;
  private _diagnostics: Map<string, IDiagnosticsRow>;

  columns = [
    new Column({
      name: 'Virtual Document',
      render_cell: (row, context: IListingContext) => (
        <td key={0}>
          <DocumentLocator document={row.document} adapter={context.adapter} />
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
        <td key={3}>{trans.__(DiagnosticSeverity[row.data.diagnostic.severity || 1])}</td>
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
      sort: (a, b) =>
        a.cell_number > b.cell_number
          ? 1
          : a.data.range.start.line > b.data.range.start.line
          ? 1
          : a.data.range.start.ch > b.data.range.start.ch
          ? 1
          : -1,
      is_available: context => context.adapter.has_multiple_editors
    }),
    new Column({
      name: 'Line:Ch',
      render_cell: row => (
        <td key={6}>
          {row.data.range.start.line}:{row.data.range.start.ch}
        </td>
      ),
      sort: (a, b) =>
        a.data.range.start.line > b.data.range.start.line
          ? 1
          : a.data.range.start.ch > b.data.range.start.ch
          ? 1
          : -1
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
    const adapter = this.model.adapter;
    if (!diagnostics_db || editor == null) {
      return <div>{trans.__('No issues detected, great job!')}</div>;
    }

    let by_document = Array.from(diagnostics_db).map(
      ([virtual_document, diagnostics]) => {
        if (virtual_document.isDisposed) {
          return [];
        }
        return diagnostics.map((diagnostic_data, i) => {
          let cell_number: number = null;
          if (adapter.has_multiple_editors) {
            let { index: cell_id } = editor.find_editor(diagnostic_data.editor);
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
    this._diagnostics = new Map(flattened.map(row => [row.key, row]));

    let sorted_column = this.columns.filter(
      column => column.name === this.sort_key
    )[0];
    let sorter = sorted_column.sort.bind(sorted_column);
    let sorted = flattened.sort((a, b) => sorter(a, b) * this.sort_direction);

    let context: IListingContext = {
      db: diagnostics_db,
      editor: editor,
      adapter: adapter
    };

    let columns_to_display = this.columns.filter(
      column => column.is_available(context) && column.is_visible
    );

    let elements = sorted.map(row => {
      let cells = columns_to_display.map(column =>
        column.render_cell(row, context)
      );

      return (
        <tr
          key={row.key}
          data-key={row.key}
          onClick={() => {
            this.jump_to(row);
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

  get_diagnostic(key: string): IDiagnosticsRow {
    if (!this._diagnostics.has(key)) {
      console.warn('Could not find the diagnostics row with key', key);
      return;
    }
    return this._diagnostics.get(key);
  }

  jump_to(row: IDiagnosticsRow) {
    const cm_editor = row.data.editor;
    focus_on(cm_editor.getWrapperElement());
    cm_editor.getDoc().setCursor(row.data.range.start);
    cm_editor.focus();
  }
}

let trans: TranslationBundle;

export namespace DiagnosticsListing {
  /**
   * A VDomModel for the LSP of current file editor/notebook.
   */
  export class Model extends VDomModel {
    diagnostics: DiagnosticsDatabase;
    virtual_editor: CodeMirrorVirtualEditor;
    adapter: WidgetAdapter<any>;
    settings: FeatureSettings<LSPDiagnosticsSettings>;
    status_message: StatusMessage;

    constructor(translator_bundle: TranslationBundle) {
      super();
      trans = translator_bundle;
    }
  }
}
