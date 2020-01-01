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
      execute: ({ connection, virtual_position, document }) => {
        let old_value = document.getTokenAt(virtual_position).string;
        InputDialog.getText({
          title: 'Rename to',
          text: old_value,
          okLabel: 'Rename'
        })
          .then(value => {
            connection.rename(virtual_position, value.value);
          })
          .catch(console.warn);
      },
      is_enabled: ({ connection }) => connection.isRenameSupported(),
      label: 'Rename symbol'
    }
  ];

  register(): void {
    this.connection_handlers.set('renamed', this.handleRename.bind(this));
    super.register();
  }

  protected handleRename(workspaceEdit: lsProtocol.WorkspaceEdit) {
    this.apply_edit(workspaceEdit)
      .catch(error => {
        console.log(error);
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
        this.status_message.set(status, 5 * 1000);
      })
      .catch(console.warn);
  }
}
