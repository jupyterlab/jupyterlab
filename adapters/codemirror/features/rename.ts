import * as lsProtocol from 'vscode-languageserver-protocol';
import {
  CodeMirrorLSPFeature,
  IEditOutcome,
  IFeatureCommand
} from '../feature';
import { InputDialog } from '@jupyterlab/apputils';

export class Rename extends CodeMirrorLSPFeature {
  static commands: Array<IFeatureCommand> = [
    {
      id: 'rename-symbol',
      execute: ({ connection, virtual_position, document, features }) => {
        let old_value = document.getTokenAt(virtual_position).string;
        let handle_failure = (error: any) => {
          let feature = features.get('Rename') as Rename;
          feature.status_message.set(`Rename failed: ${error}`, 5 * 1000);
        };

        InputDialog.getText({
          title: 'Rename to',
          text: old_value,
          okLabel: 'Rename'
        })
          .then(value => {
            connection
              .rename(virtual_position, value.value)
              .catch(handle_failure);
          })
          .catch(handle_failure);
      },
      is_enabled: ({ connection }) => connection.isRenameSupported(),
      label: 'Rename symbol'
    }
  ];

  register(): void {
    this.connection_handlers.set('renamed', this.handleRename.bind(this));
    super.register();
  }

  handleRename(workspaceEdit: lsProtocol.WorkspaceEdit) {
    this.apply_edit(workspaceEdit)
      .catch(error => {
        this.status_message.set(`Rename failed: ${error}`);
      })
      .then((outcome: IEditOutcome) => {
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
      })
      .catch(console.warn);
  }
}
