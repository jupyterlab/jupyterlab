import * as lsProtocol from 'vscode-languageserver-protocol';
import { InputDialog } from '@jupyterlab/apputils';
import { DiagnosticsCM } from './diagnostics';
import { VirtualCodeMirrorEditor } from '../virtual/editor';
import { VirtualCodeMirrorNotebookEditor } from '../virtual/editors/notebook';
import { FeatureSettings, IFeatureCommand } from '../feature';
import {
  CodeMirrorIntegration,
  IEditOutcome
} from '../editor_integration/codemirror';
import { PLUGIN_ID } from "../index";
import { JupyterFrontEnd, JupyterFrontEndPlugin } from "@jupyterlab/application";
import { ILSPFeatureManager } from "../tokens";
import { ISettingRegistry } from "@jupyterlab/settingregistry";
import { SignatureCM } from "./signature";

export class Rename extends CodeMirrorIntegration {
  name = 'Rename';
  static commands: Array<IFeatureCommand> = [
    {
      id: 'rename-symbol',
      execute: async ({
        editor,
        connection,
        virtual_position,
        document,
        features
      }) => {
        let old_value = document.getTokenAt(virtual_position).string;
        const rename_feature = features.get('Rename') as Rename;
        let handle_failure = (error: any) => {
          let status = '';

          if (features.has('Diagnostics')) {
            let diagnostics_feature = features.get('Diagnostics') as DiagnosticsCM;

            status = ux_workaround_for_rope_limitation(
              error,
              diagnostics_feature,
              editor as VirtualCodeMirrorEditor
            );
          }

          if (!status) {
            status = `Rename failed: ${error}`;
          }

          rename_feature.status_message.set(status, 7.5 * 1000);
        };

        const dialog_value = await InputDialog.getText({
          title: 'Rename to',
          text: old_value,
          okLabel: 'Rename'
        });

        try {
          const edit = await connection.rename(
            virtual_position,
            document.document_info,
            dialog_value.value,
            false
          );
          await rename_feature.handleRename(edit);
        } catch (error) {
          handle_failure(error);
        }
      },
      is_enabled: ({ connection }) => connection.isRenameSupported(),
      label: 'Rename symbol'
    }
  ];

  async handleRename(workspaceEdit: lsProtocol.WorkspaceEdit) {
    let outcome: IEditOutcome;

    try {
      outcome = await this.apply_edit(workspaceEdit);
    } catch (error) {
      this.status_message.set(`Rename failed: ${error}`);
      return outcome;
    }

    try {
      let status: string;

      if (outcome.wasGranular) {
        status = `Renamed a variable in ${outcome.appliedChanges} places`;
      } else if (this.virtual_editor.has_cells) {
        status = `Renamed a variable in ${outcome.modifiedCells} cells`;
      } else {
        status = `Renamed a variable`;
      }

      if (outcome.errors.length !== 0) {
        status += ` with errors: ${outcome.errors}`;
      }

      this.status_message.set(status, 5 * 1000);
    } catch (error) {
      console.warn(error);
    }

    return outcome;
  }
}

/**
 * In #115 an issue with rename for Python (when using pyls) was identified:
 * rename was failing with an obscure message when the source code could
 * not be parsed correctly by rope (due to a user's syntax error).
 *
 * This function detects such a condition using diagnostics feature
 * and provides a nice error message to the user.
 */
function ux_workaround_for_rope_limitation(
  error: any,
  diagnostics_feature: DiagnosticsCM,
  editor: VirtualCodeMirrorEditor
): string {
  let has_index_error = false;
  try {
    has_index_error = error.message.includes('IndexError');
  } catch (e) {
    return null;
  }
  if (!has_index_error) {
    return null;
  }
  let dire_python_errors = (
    diagnostics_feature.diagnostics_db.all || []
  ).filter(
    diagnostic =>
      diagnostic.diagnostic.message.includes('invalid syntax') ||
      diagnostic.diagnostic.message.includes('SyntaxError') ||
      diagnostic.diagnostic.message.includes('IndentationError')
  );

  if (dire_python_errors.length === 0) {
    return null;
  }

  let dire_errors = [
    ...new Set(
      dire_python_errors.map(diagnostic => {
        let message = diagnostic.diagnostic.message;
        let start = diagnostic.range.start;
        if (editor.has_cells) {
          let notebook_editor = editor as VirtualCodeMirrorNotebookEditor;
          let { cell_id } = notebook_editor.find_cell_by_editor(
            diagnostic.editor
          );
          let cell_nr = cell_id + 1;
          // TODO: should we show "code cell" numbers, or just cell number?
          return `${message} in cell ${cell_nr} at line ${start.line}`;
        } else {
          return `${message} at line ${start.line}`;
        }
      })
    )
  ].join(', ');
  return `Syntax error(s) prevent rename: ${dire_errors}`;
}

const FEATURE_ID = PLUGIN_ID + ':rename';

export const RENAME_PLUGIN: JupyterFrontEndPlugin<void> = {
  id: FEATURE_ID,
  requires: [
    ILSPFeatureManager,
    ISettingRegistry,
  ],
  activate: (
    app: JupyterFrontEnd,
    featureManager: ILSPFeatureManager,
    settingRegistry: ISettingRegistry,
  ) => {
    const settings = new FeatureSettings(settingRegistry, FEATURE_ID)

    featureManager.register({
      feature: {
        editorIntegrationFactory: new Map([
          ['CodeMirrorEditor', SignatureCM]
        ]),
        id: FEATURE_ID,
        name: 'LSP Rename',
        settings: settings
      }
    });
  }
};
