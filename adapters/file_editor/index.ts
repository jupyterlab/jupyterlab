import { JupyterFrontEndPlugin } from '@jupyterlab/application';
import { ILSPAdapterManager, PLUGIN_ID } from '../../tokens';
import { IEditorTracker } from '@jupyterlab/fileeditor';
import { FileEditorAdapter } from './file_editor';
import { IDocumentWidget } from '@jupyterlab/docregistry';
import { CommandEntryPoint } from '../../command_manager';

export const FileEditorContextMenuEntryPoint: CommandEntryPoint =
  'file-editor-context-menu';
export const FILE_EDITOR_ADAPTER: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID + ':FileEditorAdapter',
  requires: [ILSPAdapterManager, IEditorTracker],
  activate(
    app,
    adapterManager: ILSPAdapterManager,
    fileEditorTracker: IEditorTracker
  ) {
    adapterManager.registerAdapterType({
      name: 'file_editor',
      tracker: fileEditorTracker,
      adapter: FileEditorAdapter,
      entrypoint: FileEditorContextMenuEntryPoint,
      get_id(widget: IDocumentWidget): string {
        return widget.id;
      },
      context_menu: {
        selector: '.jp-FileEditor'
      }
    });
  },
  autoStart: true
};
