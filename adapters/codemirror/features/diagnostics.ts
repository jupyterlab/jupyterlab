import * as CodeMirror from 'codemirror';
import * as lsProtocol from 'vscode-languageserver-protocol';
import { PositionConverter } from '../../../converter';
import { IEditorPosition, IVirtualPosition } from '../../../positioning';
import { diagnosticSeverityNames } from '../../../lsp';
import { DefaultMap } from '../../../utils';
import { CodeMirrorLSPFeature } from '../feature';

// TODO: settings
const default_severity = 2;

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

export class Diagnostics extends CodeMirrorLSPFeature {
  register(): void {
    this.connection_handlers.set(
      'diagnostic',
      this.handleDiagnostic.bind(this)
    );
    this.unique_editor_ids = new DefaultMap(() => this.unique_editor_ids.size);
    super.register();
  }

  private unique_editor_ids: DefaultMap<CodeMirror.Editor, number>;
  private marked_diagnostics: Map<string, CodeMirror.TextMarker> = new Map();
  /**
   * Allows access to the most recent diagnostics in context of the editor.
   *
   * One can use VirtualEditorForNotebook.find_cell_by_editor() to find
   * the corresponding cell in notebook.
   * Can be used to implement a Panel showing diagnostics list.
   */
  public diagnostics_db: IEditorDiagnostic[];

  protected collapse_overlapping_diagnostics(
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

  public handleDiagnostic(response: lsProtocol.PublishDiagnosticsParams) {
    /* TODO: gutters */
    try {
      let diagnostics_db: IEditorDiagnostic[] = [];
      // Note: no deep equal for Sets or Maps in JS
      const markers_to_retain: Set<string> = new Set();

      // add new markers, keep track of the added ones

      // TODO: test for diagnostic messages not being over-writen
      //  test case: from statistics import mean, bisect_left
      //  and do not use either; expected: title has "mean imported but unused; bisect_left imported and unused'
      // TODO: test case for severity class always being set, even if diagnostic has no severity

      let diagnostics_by_range = this.collapse_overlapping_diagnostics(
        response.diagnostics
      );

      diagnostics_by_range.forEach(
        (diagnostics: lsProtocol.Diagnostic[], range: lsProtocol.Range) => {
          const start = PositionConverter.lsp_to_cm(
            range.start
          ) as IVirtualPosition;
          const end = PositionConverter.lsp_to_cm(
            range.end
          ) as IVirtualPosition;
          if (start.line > this.virtual_document.last_virtual_line) {
            console.log(
              'Malformed diagnostic was skipped (out of lines) ',
              diagnostics
            );
            return;
          }
          // assuming that we got a response for this document
          let start_in_root = this.transform_virtual_position_to_root_position(
            start
          );
          let document = this.virtual_editor.document_at_root_position(
            start_in_root
          );

          // TODO why do I get signals from the other connection in the first place?
          //  A: because each virtual document adds listeners AND if the extracted content
          //  is kept in the host document, it remains in the same editor.
          if (this.virtual_document !== document) {
            console.log(
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
            console.log(
              'Ignoring inspections silenced for this document:',
              diagnostics
            );
            return;
          }

          let highest_severity_code = diagnostics
            .map(diagnostic => diagnostic.severity || default_severity)
            .sort()[0];

          const severity = diagnosticSeverityNames[highest_severity_code];

          let cm_editor = document.get_editor_at_virtual_line(start);

          let start_in_editor = document.transform_virtual_to_editor(start);
          let end_in_editor = document.transform_virtual_to_editor(end);
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
            diagnostics_db.push({
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
              console.warn(
                'Marking inspection (diagnostic text) failed, see following logs (2):'
              );
              console.log(diagnostics);
              console.log(e);
              return;
            }
            this.marked_diagnostics.set(diagnostic_hash, marker);
          }
        }
      );

      // remove the markers which were not included in the new message
      this.remove_unused_diagnostic_markers(markers_to_retain);

      this.diagnostics_db = diagnostics_db;
    } catch (e) {
      console.warn(e);
    }
  }

  protected remove_unused_diagnostic_markers(to_retain: Set<string>) {
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
    // remove all markers
    this.remove_unused_diagnostic_markers(new Set());
    super.remove();
  }
}
