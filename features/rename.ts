import * as lsProtocol from 'vscode-languageserver-protocol';
import { InputDialog } from '@jupyterlab/apputils';
import { DiagnosticsCM } from './diagnostics/diagnostics';
import { FeatureSettings, IFeatureCommand } from '../feature';
import {
  CodeMirrorIntegration,
  IEditOutcome
} from '../editor_integration/codemirror';
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ILSPFeatureManager, PLUGIN_ID } from '../tokens';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { CodeMirrorVirtualEditor } from '../virtual/codemirror_editor';
import { LabIcon } from '@jupyterlab/ui-components';
import renameSvg from '../../style/icons/rename.svg';
import { FEATURE_ID as DIAGNOSTICS_PLUGIN_ID } from "./diagnostics";

export const renameIcon = new LabIcon({
  name: 'lsp:rename',
  svgstr: renameSvg
});

const FEATURE_ID = PLUGIN_ID + ':rename';

const COMMANDS: IFeatureCommand[] = [
  {
    id: 'rename-symbol',
    execute: async ({
      editor,
      connection,
      virtual_position,
      document,
      features
    }) => {
      const rename_feature = features.get(FEATURE_ID) as RenameCM;
      let root_position = rename_feature.transform_virtual_position_to_root_position(
        virtual_position
      );
      let old_value = editor.get_token_at(root_position).value;
      let handle_failure = (error: any) => {
        let status = '';

        if (features.has(DIAGNOSTICS_PLUGIN_ID)) {
          let diagnostics_feature = features.get(
            DIAGNOSTICS_PLUGIN_ID
          ) as DiagnosticsCM;

          status = RenameCM.ux_workaround_for_rope_limitation(
            error,
            diagnostics_feature,
            editor as CodeMirrorVirtualEditor,
            rename_feature
          );
        }

        if (!status) {
          status = `Rename failed: ${error}`;
        }

        rename_feature.setStatus(status, 7.5 * 1000);
      };

      const dialog_value = await InputDialog.getText({
        title: 'Rename to',
        text: old_value,
        okLabel: 'Rename'
      });

      try {
        if (dialog_value.button.accept != true) {
          // the user has cancelled the rename action
          return;
        }
        let new_value = dialog_value.value;
        rename_feature.setStatus(
          `Renaming ${old_value} to ${new_value}...`,
          2 * 1000
        );
        const edit = await connection.rename(
          virtual_position,
          document.document_info,
          new_value,
          false
        );
        await rename_feature.handleRename(edit, old_value, new_value);
      } catch (error) {
        handle_failure(error);
      }
    },
    is_enabled: ({ connection }) => connection.isRenameSupported(),
    label: 'Rename symbol',
    icon: renameIcon
  }
];

export class RenameCM extends CodeMirrorIntegration {
  public setStatus(message: string, timeout: number) {
    return this.status_message.set(message, timeout);
  }

  async handleRename(
    workspaceEdit: lsProtocol.WorkspaceEdit,
    old_value: string,
    new_value: string
  ) {
    let outcome: IEditOutcome;

    try {
      outcome = await this.apply_edit(workspaceEdit);
    } catch (error) {
      this.status_message.set(`Rename failed: ${error}`);
      return outcome;
    }

    try {
      let status: string;
      let is_plural: boolean;
      const change_text = `${old_value} to ${new_value}`;

      if (outcome.appliedChanges === 0) {
        status = `Could not rename ${change_text} - consult the language server documentation`;
      } else if (outcome.wasGranular) {
        is_plural = outcome.appliedChanges > 1;
        status = `Renamed ${change_text} in ${outcome.appliedChanges} place${
          is_plural ? 's' : ''
        }`;
      } else if (this.adapter.has_multiple_editors) {
        is_plural = outcome.modifiedCells > 1;
        status = `Renamed ${change_text} in ${outcome.modifiedCells} cell${
          is_plural ? 's' : ''
        }`;
      } else {
        status = `Renamed ${change_text}`;
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

  /**
   * In #115 an issue with rename for Python (when using pyls) was identified:
   * rename was failing with an obscure message when the source code could
   * not be parsed correctly by rope (due to a user's syntax error).
   *
   * This function detects such a condition using diagnostics feature
   * and provides a nice error message to the user.
   */
  static ux_workaround_for_rope_limitation(
    error: any,
    diagnostics_feature: DiagnosticsCM,
    editor: CodeMirrorVirtualEditor,
    rename_feature: RenameCM
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
          if (rename_feature.adapter.has_multiple_editors) {
            let { index: editor_id } = editor.find_editor(diagnostic.editor);
            let cell_number = editor_id + 1;
            // TODO: should we show "code cell" numbers, or just cell number?
            return `${message} in cell ${cell_number} at line ${start.line}`;
          } else {
            return `${message} at line ${start.line}`;
          }
        })
      )
    ].join(', ');
    return `Syntax error(s) prevent rename: ${dire_errors}`;
  }
}

export const RENAME_PLUGIN: JupyterFrontEndPlugin<void> = {
  id: FEATURE_ID,
  requires: [ILSPFeatureManager, ISettingRegistry],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    featureManager: ILSPFeatureManager,
    settingRegistry: ISettingRegistry
  ) => {
    const settings = new FeatureSettings(settingRegistry, FEATURE_ID);

    featureManager.register({
      feature: {
        editorIntegrationFactory: new Map([['CodeMirrorEditor', RenameCM]]),
        id: FEATURE_ID,
        name: 'LSP Rename',
        settings: settings,
        commands: COMMANDS
      }
    });
  }
};
