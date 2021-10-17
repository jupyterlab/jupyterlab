import { JupyterFrontEnd } from '@jupyterlab/application';
import { MainAreaWidget } from '@jupyterlab/apputils';
import { nullTranslator, TranslationBundle } from '@jupyterlab/translation';
import { LabIcon, copyIcon } from '@jupyterlab/ui-components';
import { Menu } from '@lumino/widgets';
import type * as CodeMirror from 'codemirror';
import type * as lsProtocol from 'vscode-languageserver-protocol';

import diagnosticsSvg from '../../../style/icons/diagnostics.svg';
import { CodeDiagnostics as LSPDiagnosticsSettings } from '../../_diagnostics';
import { LSPConnection } from '../../connection';
import { PositionConverter } from '../../converter';
import { CodeMirrorIntegration } from '../../editor_integration/codemirror';
import { FeatureSettings } from '../../feature';
import { DiagnosticSeverity } from '../../lsp';
import { IEditorPosition, IVirtualPosition } from '../../positioning';
import { DefaultMap, uris_equal } from '../../utils';
import { CodeMirrorVirtualEditor } from '../../virtual/codemirror_editor';
import { VirtualDocument } from '../../virtual/document';
import { jumpToIcon } from '../jump_to';

import {
  DIAGNOSTICS_LISTING_CLASS,
  DiagnosticsDatabase,
  DiagnosticsListing,
  IDiagnosticsRow,
  IEditorDiagnostic
} from './listing';

export const diagnosticsIcon = new LabIcon({
  name: 'lsp:diagnostics',
  svgstr: diagnosticsSvg
});

const CMD_COLUMN_VISIBILITY = 'lsp-set-column-visibility';
const CMD_JUMP_TO_DIAGNOSTIC = 'lsp-jump-to-diagnostic';
const CMD_COPY_DIAGNOSTIC = 'lsp-copy-diagnostic';
const CMD_IGNORE_DIAGNOSTIC_CODE = 'lsp-ignore-diagnostic-code';
const CMD_IGNORE_DIAGNOSTIC_MSG = 'lsp-ignore-diagnostic-message';

/**
 * Escape pattern to form a base of a regular expression.
 * The snippet comes from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Escaping
 * and is in the Public Domain (CC0):
 *  > Any copyright is dedicated to the Public Domain.
 *  > http://creativecommons.org/publicdomain/zero/1.0/
 */
function escapeRegExp(string: string) {
  return string.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
}

class DiagnosticsPanel {
  private _content: DiagnosticsListing = null;
  private _widget: MainAreaWidget<DiagnosticsListing> = null;
  feature: DiagnosticsCM;
  is_registered = false;
  trans: TranslationBundle;

  constructor(trans: TranslationBundle) {
    this.trans = trans;
  }

  get widget() {
    if (this._widget == null || this._widget.content.model == null) {
      if (this._widget && !this._widget.isDisposed) {
        this._widget.dispose();
      }
      this._widget = this.initWidget();
    }
    return this._widget;
  }

  get content() {
    return this.widget.content;
  }

  protected initWidget() {
    this._content = new DiagnosticsListing(
      new DiagnosticsListing.Model(this.trans)
    );
    this._content.model.diagnostics = new DiagnosticsDatabase();
    this._content.addClass('lsp-diagnostics-panel-content');
    const widget = new MainAreaWidget({ content: this._content });
    widget.id = 'lsp-diagnostics-panel';
    widget.title.label = this.trans.__('Diagnostics Panel');
    widget.title.closable = true;
    widget.title.icon = diagnosticsIcon;
    return widget;
  }

  update() {
    // if not attached, do not bother to update
    if (!this.widget.isAttached) {
      return;
    }
    this.widget.content.update();
  }

  register(app: JupyterFrontEnd) {
    const widget = this.widget;

    let get_column = (id: string) => {
      // TODO: a hashmap in the panel itself?
      for (let column of widget.content.columns) {
        if (column.id === id) {
          return column;
        }
      }
    };

    /** Columns Menu **/
    let columns_menu = new Menu({ commands: app.commands });
    columns_menu.title.label = this.trans.__('Panel columns');

    app.commands.addCommand(CMD_COLUMN_VISIBILITY, {
      execute: args => {
        let column = get_column(args['id'] as string);
        column.is_visible = !column.is_visible;
        widget.update();
      },
      label: args => this.trans.__(args['id'] as string),
      isToggled: args => {
        let column = get_column(args['id'] as string);
        return column.is_visible;
      }
    });

    for (let column of widget.content.columns) {
      columns_menu.addItem({
        command: CMD_COLUMN_VISIBILITY,
        args: { id: column.id }
      });
    }
    app.contextMenu.addItem({
      selector: '.' + DIAGNOSTICS_LISTING_CLASS + ' th',
      submenu: columns_menu,
      type: 'submenu'
    });

    /** Diagnostics Menu **/
    let ignore_diagnostics_menu = new Menu({ commands: app.commands });
    ignore_diagnostics_menu.title.label = this.trans.__(
      'Ignore diagnostics like this'
    );

    let get_row = (): IDiagnosticsRow => {
      let tr = app.contextMenuHitTest(
        node => node.tagName.toLowerCase() == 'tr'
      );
      if (!tr) {
        return;
      }
      return this.widget.content.get_diagnostic(tr.dataset.key);
    };

    ignore_diagnostics_menu.addItem({
      command: CMD_IGNORE_DIAGNOSTIC_CODE
    });
    ignore_diagnostics_menu.addItem({
      command: CMD_IGNORE_DIAGNOSTIC_MSG
    });
    app.commands.addCommand(CMD_IGNORE_DIAGNOSTIC_CODE, {
      execute: () => {
        const diagnostic = get_row().data.diagnostic;
        let current = this.content.model.settings.composite.ignoreCodes;
        this.content.model.settings.set('ignoreCodes', [
          ...current,
          diagnostic.code
        ]);
        this.feature.refreshDiagnostics();
      },
      isVisible: () => {
        const row = get_row();
        if (!row) {
          return false;
        }
        const diagnostic = row.data.diagnostic;
        return !!diagnostic.code;
      },
      label: () => {
        const row = get_row();
        if (!row) {
          return '';
        }
        const diagnostic = row.data.diagnostic;
        return this.trans.__(
          'Ignore diagnostics with "%1" code',
          diagnostic.code
        );
      }
    });
    app.commands.addCommand(CMD_IGNORE_DIAGNOSTIC_MSG, {
      execute: () => {
        const row = get_row();
        const diagnostic = row.data.diagnostic;
        let current =
          this.content.model.settings.composite.ignoreMessagesPatterns;
        this.content.model.settings.set('ignoreMessagesPatterns', [
          ...current,
          escapeRegExp(diagnostic.message)
        ]);
        this.feature.refreshDiagnostics();
      },
      isVisible: () => {
        const row = get_row();
        if (!row) {
          return false;
        }
        const diagnostic = row.data.diagnostic;
        return !!diagnostic.message;
      },
      label: () => {
        const row = get_row();
        if (!row) {
          return '';
        }
        const diagnostic = row.data.diagnostic;
        return this.trans.__(
          'Ignore diagnostics with "%1" message',
          diagnostic.message
        );
      }
    });

    app.commands.addCommand(CMD_JUMP_TO_DIAGNOSTIC, {
      execute: () => {
        const row = get_row();
        this.widget.content.jump_to(row);
      },
      label: this.trans.__('Jump to location'),
      icon: jumpToIcon
    });

    app.commands.addCommand(CMD_COPY_DIAGNOSTIC, {
      execute: () => {
        const row = get_row();
        if (!row) {
          return;
        }
        const message = row.data.diagnostic.message;
        navigator.clipboard
          .writeText(message)
          .then(() => {
            this.content.model.status_message.set(
              this.trans.__('Successfully copied "%1" to clipboard', message)
            );
          })
          .catch(() => {
            console.warn(
              'Could not copy with clipboard.writeText interface, falling back'
            );
            window.prompt(
              this.trans.__(
                'Your browser protects clipboard from write operations; please copy the message manually'
              ),
              message
            );
          });
      },
      label: this.trans.__("Copy diagnostics' message"),
      icon: copyIcon
    });

    app.contextMenu.addItem({
      selector: '.' + DIAGNOSTICS_LISTING_CLASS + ' tbody tr',
      command: CMD_COPY_DIAGNOSTIC
    });
    app.contextMenu.addItem({
      selector: '.' + DIAGNOSTICS_LISTING_CLASS + ' tbody tr',
      command: CMD_JUMP_TO_DIAGNOSTIC
    });
    app.contextMenu.addItem({
      selector: '.' + DIAGNOSTICS_LISTING_CLASS + ' tbody tr',
      submenu: ignore_diagnostics_menu,
      type: 'submenu'
    });

    this.is_registered = true;
  }
}

export const diagnostics_panel = new DiagnosticsPanel(
  nullTranslator.load('jupyterlab_lsp')
);
export const diagnostics_databases = new WeakMap<
  CodeMirrorVirtualEditor,
  DiagnosticsDatabase
>();

export class DiagnosticsCM extends CodeMirrorIntegration {
  private last_response: lsProtocol.PublishDiagnosticsParams;

  get settings() {
    return super.settings as FeatureSettings<LSPDiagnosticsSettings>;
  }

  register(): void {
    // this.connection_handlers.set('diagnostic', this.handleDiagnostic);
    // TODO: unregister
    this.connection.serverNotifications[
      'textDocument/publishDiagnostics'
    ].connect(this.handleDiagnostic);

    this.wrapper_handlers.set('focusin', this.switchDiagnosticsPanelSource);
    this.unique_editor_ids = new DefaultMap(() => this.unique_editor_ids.size);
    this.settings.changed.connect(this.refreshDiagnostics, this);
    this.adapter.adapterConnected.connect(() =>
      this.switchDiagnosticsPanelSource()
    );
    this.virtual_document.foreign_document_closed.connect(
      (document, context) => {
        this.clearDocumentDiagnostics(context.foreign_document);
      }
    );
    super.register();
  }

  clearDocumentDiagnostics(document: VirtualDocument) {
    this.diagnostics_db.set(document, []);
  }

  private unique_editor_ids: DefaultMap<CodeMirror.Editor, number>;
  private marked_diagnostics: Map<string, CodeMirror.TextMarker> = new Map();
  /**
   * Allows access to the most recent diagnostics in context of the editor.
   *
   * One can use VirtualEditorForNotebook.find_cell_by_editor() to find
   * the corresponding cell in notebook.
   * Can be used to implement a Panel showing diagnostics list.
   *
   * Maps virtual_document.uri to IEditorDiagnostic[].
   */
  public get diagnostics_db(): DiagnosticsDatabase {
    // Note that virtual_editor can change at runtime (kernel restart)
    if (!diagnostics_databases.has(this.virtual_editor)) {
      diagnostics_databases.set(this.virtual_editor, new DiagnosticsDatabase());
    }
    return diagnostics_databases.get(this.virtual_editor);
  }

  switchDiagnosticsPanelSource = () => {
    diagnostics_panel.trans = this.adapter.trans;
    if (
      diagnostics_panel.content.model.virtual_editor === this.virtual_editor &&
      diagnostics_panel.content.model.diagnostics == this.diagnostics_db
    ) {
      return;
    }
    diagnostics_panel.content.model.diagnostics = this.diagnostics_db;
    diagnostics_panel.content.model.virtual_editor = this.virtual_editor;
    diagnostics_panel.content.model.adapter = this.adapter;
    diagnostics_panel.content.model.settings = this.settings;
    diagnostics_panel.content.model.status_message = this.status_message;
    diagnostics_panel.feature = this;
    diagnostics_panel.update();
  };

  protected collapseOverlappingDiagnostics(
    diagnostics: lsProtocol.Diagnostic[]
  ): Map<lsProtocol.Range, lsProtocol.Diagnostic[]> {
    // because Range is not a primitive type, the equality of the objects having
    // the same parameters won't be compared (thus considered equal) in Map.

    // instead, a intermediate step of mapping through a stringified representation of Range is needed:
    // an alternative would be using nested [start line][start character][end line][end character] structure,
    // which would increase the code complexity, but reduce memory use and may be slightly faster.
    type RangeID = string;
    const range_id_to_range = new Map<RangeID, lsProtocol.Range>();
    const range_id_to_diagnostics = new Map<RangeID, lsProtocol.Diagnostic[]>();

    function get_range_id(range: lsProtocol.Range): RangeID {
      return (
        range.start.line +
        ',' +
        range.start.character +
        ',' +
        range.end.line +
        ',' +
        range.end.character
      );
    }

    diagnostics.forEach((diagnostic: lsProtocol.Diagnostic) => {
      let range = diagnostic.range;
      let range_id = get_range_id(range);
      range_id_to_range.set(range_id, range);
      if (range_id_to_diagnostics.has(range_id)) {
        let ranges_list = range_id_to_diagnostics.get(range_id);
        ranges_list.push(diagnostic);
      } else {
        range_id_to_diagnostics.set(range_id, [diagnostic]);
      }
    });

    let map = new Map<lsProtocol.Range, lsProtocol.Diagnostic[]>();

    range_id_to_diagnostics.forEach(
      (range_diagnostics: lsProtocol.Diagnostic[], range_id: RangeID) => {
        let range = range_id_to_range.get(range_id);
        map.set(range, range_diagnostics);
      }
    );

    return map;
  }

  get defaultSeverity(): lsProtocol.DiagnosticSeverity {
    return DiagnosticSeverity[this.settings.composite.defaultSeverity];
  }

  private filterDiagnostics(
    diagnostics: lsProtocol.Diagnostic[]
  ): lsProtocol.Diagnostic[] {
    const ignoredDiagnosticsCodes = new Set(
      this.settings.composite.ignoreCodes
    );
    const ignoredMessagesRegExp =
      this.settings.composite.ignoreMessagesPatterns.map(
        pattern => new RegExp(pattern)
      );

    return diagnostics.filter(diagnostic => {
      let code = diagnostic.code;
      if (
        typeof code !== 'undefined' &&
        // pygls servers return code null if value is missing (rather than undefined)
        // which is a departure from the LSP specs: https://microsoft.github.io/language-server-protocol/specification#diagnostic
        // there is an open issue: https://github.com/openlawlibrary/pygls/issues/124
        // and PR: https://github.com/openlawlibrary/pygls/pull/132
        // this also affects hover tooltips.
        code !== null &&
        ignoredDiagnosticsCodes.has(code.toString())
      ) {
        return false;
      }
      let message = diagnostic.message;
      if (
        message &&
        ignoredMessagesRegExp.some(pattern => pattern.test(message))
      ) {
        return false;
      }
      return true;
    });
  }

  setDiagnostics(response: lsProtocol.PublishDiagnosticsParams) {
    let diagnostics_list: IEditorDiagnostic[] = [];

    // Note: no deep equal for Sets or Maps in JS
    const markers_to_retain: Set<string> = new Set();

    // add new markers, keep track of the added ones

    // TODO: test case for severity class always being set, even if diagnostic has no severity

    let diagnostics_by_range = this.collapseOverlappingDiagnostics(
      this.filterDiagnostics(response.diagnostics)
    );

    diagnostics_by_range.forEach(
      (diagnostics: lsProtocol.Diagnostic[], range: lsProtocol.Range) => {
        const start = PositionConverter.lsp_to_cm(
          range.start
        ) as IVirtualPosition;
        const end = PositionConverter.lsp_to_cm(range.end) as IVirtualPosition;
        const last_line_number =
          this.virtual_document.last_virtual_line -
          this.virtual_document.blank_lines_between_cells;
        if (start.line > last_line_number) {
          this.console.log(
            `Out of range diagnostic (${start.line} line > ${last_line_number}) was skipped `,
            diagnostics
          );
          return;
        } else {
          let last_line = this.virtual_document.last_line;
          if (start.line == last_line_number && start.ch > last_line.length) {
            this.console.log(
              `Out of range diagnostic (${start.ch} character > ${last_line.length} at line ${last_line_number}) was skipped `,
              diagnostics
            );
            return;
          }
        }

        let document: VirtualDocument;
        try {
          // assuming that we got a response for this document
          let start_in_root =
            this.transform_virtual_position_to_root_position(start);
          document =
            this.virtual_editor.document_at_root_position(start_in_root);
        } catch (e) {
          this.console.warn(
            `Could not place inspections from ${response.uri}`,
            ` inspections: `,
            diagnostics,
            'error: ',
            e
          );
          return;
        }

        // This may happen if the response came delayed
        // and the user already changed the document so
        // that now this regions is in another virtual document!
        if (this.virtual_document !== document) {
          this.console.log(
            `Ignoring inspections from ${response.uri}`,
            ` (this region is covered by a another virtual document: ${document.uri})`,
            ` inspections: `,
            diagnostics
          );
          return;
        }

        if (
          document.virtual_lines
            .get(start.line)
            .skip_inspect.indexOf(document.id_path) !== -1
        ) {
          this.console.log(
            'Ignoring inspections silenced for this document:',
            diagnostics
          );
          return;
        }

        let highest_severity_code = diagnostics
          .map(diagnostic => diagnostic.severity || this.defaultSeverity)
          .sort()[0];

        const severity = DiagnosticSeverity[highest_severity_code];

        let ce_editor = document.get_editor_at_virtual_line(start);
        let cm_editor =
          this.virtual_editor.ce_editor_to_cm_editor.get(ce_editor);

        let start_in_editor = document.transform_virtual_to_editor(start);
        let end_in_editor: IEditorPosition;

        // some servers return strange positions for ends
        try {
          end_in_editor = document.transform_virtual_to_editor(end);
        } catch (err) {
          this.console.warn('Malformed range for diagnostic', end);
          end_in_editor = { ...start_in_editor, ch: start_in_editor.ch + 1 };
        }

        let range_in_editor = {
          start: start_in_editor,
          end: end_in_editor
        };
        // what a pity there is no hash in the standard library...
        // we could use this: https://stackoverflow.com/a/7616484 though it may not be worth it:
        //   the stringified diagnostic objects are only about 100-200 JS characters anyway,
        //   depending on the message length; this could be reduced using some structure-aware
        //   stringifier; such a stringifier could also prevent the possibility of having a false
        //   negative due to a different ordering of keys
        // obviously, the hash would prevent recovery of info from the key.
        let diagnostic_hash = JSON.stringify({
          // diagnostics without ranges
          diagnostics: diagnostics.map(diagnostic => [
            diagnostic.severity,
            diagnostic.message,
            diagnostic.code,
            diagnostic.source,
            diagnostic.relatedInformation
          ]),
          // the apparent marker position will change in the notebook with every line change for each marker
          // after the (inserted/removed) line - but such markers should not be invalidated,
          // i.e. the invalidation should be performed in the cell space, not in the notebook coordinate space,
          // thus we transform the coordinates and keep the cell id in the hash
          range: range_in_editor,
          editor: this.unique_editor_ids.get(cm_editor)
        });
        for (let diagnostic of diagnostics) {
          diagnostics_list.push({
            diagnostic,
            editor: cm_editor,
            range: range_in_editor
          });
        }

        markers_to_retain.add(diagnostic_hash);

        if (!this.marked_diagnostics.has(diagnostic_hash)) {
          let options: CodeMirror.TextMarkerOptions = {
            title: diagnostics
              .map(d => d.message + (d.source ? ' (' + d.source + ')' : ''))
              .join('\n'),
            className: 'cm-lsp-diagnostic cm-lsp-diagnostic-' + severity
          };
          let marker;
          try {
            marker = cm_editor
              .getDoc()
              .markText(start_in_editor, end_in_editor, options);
          } catch (e) {
            this.console.warn(
              'Marking inspection (diagnostic text) failed:',
              diagnostics,
              e
            );
            return;
          }
          this.marked_diagnostics.set(diagnostic_hash, marker);
        }
      }
    );

    // remove the markers which were not included in the new message
    this.removeUnusedDiagnosticMarkers(markers_to_retain);

    this.diagnostics_db.set(this.virtual_document, diagnostics_list);
  }

  public handleDiagnostic = (
    connection: LSPConnection,
    response: lsProtocol.PublishDiagnosticsParams
  ) => {
    if (!uris_equal(response.uri, this.virtual_document.document_info.uri)) {
      return;
    }

    if (this.virtual_document.last_virtual_line === 0) {
      return;
    }

    /* TODO: gutters */
    try {
      this.last_response = response;
      this.setDiagnostics(response);
      diagnostics_panel.update();
    } catch (e) {
      this.console.warn(e);
    }
  };

  public refreshDiagnostics() {
    if (this.last_response) {
      this.setDiagnostics(this.last_response);
    }
    diagnostics_panel.update();
  }

  protected removeUnusedDiagnosticMarkers(to_retain: Set<string>) {
    this.marked_diagnostics.forEach(
      (marker: CodeMirror.TextMarker, diagnostic_hash: string) => {
        if (!to_retain.has(diagnostic_hash)) {
          this.marked_diagnostics.delete(diagnostic_hash);
          marker.clear();
        }
      }
    );
  }

  remove(): void {
    this.settings.changed.disconnect(this.refreshDiagnostics, this);
    // remove all markers
    this.removeUnusedDiagnosticMarkers(new Set());
    this.diagnostics_db.clear();
    diagnostics_databases.delete(this.virtual_editor);
    this.unique_editor_ids.clear();

    if (
      diagnostics_panel.content.model.virtual_editor === this.virtual_editor
    ) {
      diagnostics_panel.content.model.virtual_editor = null;
      diagnostics_panel.content.model.diagnostics = null;
      diagnostics_panel.content.model.adapter = null;
    }

    diagnostics_panel.update();
    super.remove();
  }
}
