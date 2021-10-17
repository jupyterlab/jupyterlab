import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { InputDialog } from '@jupyterlab/apputils';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import { LabIcon } from '@jupyterlab/ui-components';
import * as lsProtocol from 'vscode-languageserver-protocol';

import renameSvg from '../../style/icons/rename.svg';
import {
  CodeMirrorIntegration,
  IEditOutcome
} from '../editor_integration/codemirror';
import { FeatureSettings, IFeatureCommand } from '../feature';
import { ILSPFeatureManager, PLUGIN_ID } from '../tokens';
import { CodeMirrorVirtualEditor } from '../virtual/codemirror_editor';

import { FEATURE_ID as DIAGNOSTICS_PLUGIN_ID } from './diagnostics';
import { DiagnosticsCM } from './diagnostics/diagnostics';

export const renameIcon = new LabIcon({
  name: 'lsp:rename',
  svgstr: renameSvg
});

const FEATURE_ID = PLUGIN_ID + ':rename';

const COMMANDS = (trans: TranslationBundle): IFeatureCommand[] => [
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
      rename_feature.setTrans(trans);

      let root_position =
        rename_feature.transform_virtual_position_to_root_position(
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
          status = trans.__(`Rename failed: %1`, error);
        }

        rename_feature.setStatus(status, 7.5 * 1000);
      };

      const dialog_value = await InputDialog.getText({
        title: trans.__('Rename to'),
        text: old_value,
        okLabel: trans.__('Rename'),
        cancelLabel: trans.__('Cancel')
      });

      try {
        if (dialog_value.button.accept != true) {
          // the user has cancelled the rename action
          return;
        }
        let new_value = dialog_value.value;
        rename_feature.setStatus(
          trans.__('Renaming %1 to %2...', old_value, new_value),
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
    label: trans.__('Rename symbol'),
    icon: renameIcon
  }
];

export class RenameCM extends CodeMirrorIntegration {
  public setTrans(trans: TranslationBundle) {
    this.trans = trans;
  }

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
      this.status_message.set(this.trans.__('Rename failed: %1', error));
      return outcome;
    }

    try {
      let status: string;
      const change_text = this.trans.__('%1 to %2', old_value, new_value);

      if (outcome.appliedChanges === 0) {
        status = this.trans.__(
          'Could not rename %1 - consult the language server documentation',
          change_text
        );
      } else if (outcome.wasGranular) {
        status = this.trans._n(
          'Renamed %2 in %3 place',
          'Renamed %2 in %3 places',
          outcome.appliedChanges,
          change_text,
          outcome.appliedChanges
        );
      } else if (this.adapter.has_multiple_editors) {
        status = this.trans._n(
          'Renamed %2 in %3 cell',
          'Renamed %2 in %3 cells',
          outcome.modifiedCells,
          change_text,
          outcome.modifiedCells
        );
      } else {
        status = this.trans.__('Renamed %1', change_text);
      }

      if (outcome.errors.length !== 0) {
        status += this.trans.__(' with errors: %1', outcome.errors);
      }

      this.status_message.set(status, 5 * 1000);
    } catch (error) {
      this.console.warn(error);
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
            return rename_feature.trans.__(
              '%1 in cell %2 at line %3',
              message,
              cell_number,
              start.line
            );
          } else {
            return rename_feature.trans.__(
              '%1 at line %2',
              message,
              start.line
            );
          }
        })
      )
    ].join(', ');
    return rename_feature.trans.__(
      'Syntax error(s) prevent rename: %1',
      dire_errors
    );
  }
}

export const RENAME_PLUGIN: JupyterFrontEndPlugin<void> = {
  id: FEATURE_ID,
  requires: [ILSPFeatureManager, ISettingRegistry, ITranslator],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    featureManager: ILSPFeatureManager,
    settingRegistry: ISettingRegistry,
    translator: ITranslator
  ) => {
    const trans = (translator || nullTranslator).load('jupyterlab_lsp');
    const settings = new FeatureSettings(settingRegistry, FEATURE_ID);

    featureManager.register({
      feature: {
        editorIntegrationFactory: new Map([['CodeMirrorEditor', RenameCM]]),
        id: FEATURE_ID,
        name: 'LSP Rename',
        settings: settings,
        commands: COMMANDS(trans)
      }
    });
  }
};
