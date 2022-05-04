import { JupyterFrontEndPlugin } from '@jupyterlab/application';
import { IDocumentWidget } from '@jupyterlab/docregistry';
import { IEditorTracker } from '@jupyterlab/fileeditor';

import { CommandEntryPoint } from '../../command_manager';
import { ILSPAdapterManager, PLUGIN_ID } from '../../tokens';

import { FileEditorAdapter } from './file_editor';

export const FileEditorContextMenuEntryPoint: CommandEntryPoint =
  'file-editor-context-menu';
export const FILE_EDITOR_ADAPTER: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID + ':FileEditorAdapter',
  requires: [ILSPAdapterManager],
  optional: [IEditorTracker],
  activate(
    app,
    adapterManager: ILSPAdapterManager,
    fileEditorTracker: IEditorTracker | null
  ) {
    if (fileEditorTracker === null) {
      console.warn(
        'LSP: no fileEditorTracker - not registering file editor capabilities'
      );
    } else {
      adapterManager.registerAdapterType({
        name: 'file_editor',
        tracker: fileEditorTracker,
        adapter: FileEditorAdapter,
        entrypoint: FileEditorContextMenuEntryPoint,
        get_id(widget: IDocumentWidget): string {
          return widget.id;
        },
        context_menu: {
          selector: '.jp-FileEditor',
          rank_group: 0,
          rank_group_size: 4
        }
      });
    }
  },
  autoStart: true
};
