import { JupyterFrontEnd } from '@jupyterlab/application';
import { IWidgetTracker } from '@jupyterlab/apputils';
import { JupyterLabWidgetAdapter } from './adapters/jupyterlab/jl_adapter';
import {
  CommandEntryPoint,
  IFeatureCommand
} from './adapters/codemirror/feature';
import { IEditorTracker } from '@jupyterlab/fileeditor';
import { FileEditorAdapter } from './adapters/jupyterlab/file_editor';
import { NotebookAdapter } from './adapters/jupyterlab/notebook';
import { INotebookTracker } from '@jupyterlab/notebook';
import { VirtualDocument } from './virtual/document';
import { LSPConnection } from './connection';
import { IRootPosition, IVirtualPosition } from './positioning';

export const file_editor_adapters: Map<string, FileEditorAdapter> = new Map();
export const notebook_adapters: Map<string, NotebookAdapter> = new Map();

function is_context_menu_over_token(adapter: JupyterLabWidgetAdapter) {
  let position = adapter.get_position_from_context_menu();
  if (!position) {
    return false;
  }
  let token = adapter.virtual_editor.getTokenAt(position);
  return token.string !== '';
}

abstract class LSPCommandManager {
  protected constructor(
    protected app: JupyterFrontEnd,
    protected tracker: IWidgetTracker,
    protected suffix: string
  ) {}

  abstract entry_point: CommandEntryPoint;
  abstract get current_adapter(): JupyterLabWidgetAdapter;
  abstract attach_command(command: IFeatureCommand): void;
  abstract execute(command: IFeatureCommand): void;
  abstract is_enabled(command: IFeatureCommand): boolean;
  abstract is_visible(command: IFeatureCommand): boolean;

  add(commands: Array<IFeatureCommand>) {
    for (let cmd of commands) {
      this.app.commands.addCommand(this.create_id(cmd), {
        execute: () => this.execute(cmd),
        isEnabled: () => this.is_enabled(cmd),
        isVisible: () => this.is_visible(cmd),
        label: cmd.label
      });

      if (this.should_attach(cmd)) {
        this.attach_command(cmd);
      }
    }
  }

  protected should_attach(command: IFeatureCommand) {
    if (typeof command.attach_to === 'undefined') {
      return true;
    }
    return command.attach_to.has(this.entry_point);
  }

  protected create_id(command: IFeatureCommand): string {
    return 'lsp:' + command.id + '-' + this.suffix;
  }
}

export abstract class ContextMenuCommandManager extends LSPCommandManager {
  abstract selector: string;

  constructor(
    app: JupyterFrontEnd,
    tracker: IWidgetTracker,
    suffix: string,
    protected rank_group?: number,
    protected rank_group_size?: number
  ) {
    super(app, tracker, suffix);
  }

  attach_command(command: IFeatureCommand): void {
    this.app.contextMenu.addItem({
      selector: this.selector,
      command: this.create_id(command),
      rank: this.get_rank(command)
    });
  }

  add_context_separator(position_in_group: number) {
    this.app.contextMenu.addItem({
      type: 'separator',
      selector: this.selector,
      rank: this.rank_group + position_in_group
    });
  }

  execute(command: IFeatureCommand): void {
    let context = this.current_adapter.get_context_from_context_menu();
    command.execute(context);
  }

  is_enabled() {
    return is_context_menu_over_token(this.current_adapter);
  }

  is_visible(command: IFeatureCommand): boolean {
    let context = this.current_adapter.get_context_from_context_menu();
    return (
      this.current_adapter && context.connection && command.is_enabled(context)
    );
  }

  protected get_rank(command: IFeatureCommand): number {
    let is_relative =
      typeof command.is_rank_relative === 'undefined'
        ? true
        : command.is_rank_relative;
    if (
      is_relative &&
      typeof this.rank_group !== 'undefined' &&
      this.rank_group_size
    ) {
      let relative = typeof command.rank !== 'undefined' ? command.rank : 0;
      return this.rank_group + relative / this.rank_group_size;
    } else {
      return typeof command.rank !== 'undefined' ? command.rank : Infinity;
    }
  }
}

export class NotebookCommandManager extends ContextMenuCommandManager {
  protected tracker: INotebookTracker;
  selector = '.jp-Notebook .jp-CodeCell .jp-Editor';
  entry_point = CommandEntryPoint.CellContextMenu;

  get current_adapter() {
    let notebook = this.tracker.currentWidget;
    return notebook_adapters.get(notebook.id);
  }
}

export class FileEditorCommandManager extends ContextMenuCommandManager {
  protected tracker: IEditorTracker;
  selector = '.jp-FileEditor';
  entry_point = CommandEntryPoint.FileEditorContextMenu;

  get current_adapter() {
    let fileEditor = this.tracker.currentWidget.content;
    return file_editor_adapters.get(fileEditor.id);
  }
}

export interface ICommandContext {
  document: VirtualDocument;
  connection: LSPConnection;
  virtual_position: IVirtualPosition;
  root_position: IRootPosition;
}
