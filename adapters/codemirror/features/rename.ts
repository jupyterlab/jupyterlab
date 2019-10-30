import * as lsProtocol from 'vscode-languageserver-protocol';
import {
  CodeMirrorLSPFeature,
  CommandEntryPoint,
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
      label: 'Rename symbol',
      attach_to: new Set<CommandEntryPoint>([
        // notebooks are not supported yet
        CommandEntryPoint.FileEditorContextMenu
      ])
    }
  ];

  register(): void {
    this.connection_handlers.set('renamed', this.handleRename.bind(this));
    super.register();
  }

  protected handleRename(workspaceEdit: lsProtocol.WorkspaceEdit) {
    this.apply_edit(workspaceEdit);
  }
}
