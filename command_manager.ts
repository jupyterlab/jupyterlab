import { JupyterFrontEnd } from '@jupyterlab/application';
import { ICommandPalette, IWidgetTracker } from '@jupyterlab/apputils';
import { WidgetAdapter } from './adapters/jupyterlab/jl_adapter';
import { FeatureEditorIntegration, IFeatureCommand } from './feature';
import { IEditorTracker } from '@jupyterlab/fileeditor';
import { INotebookTracker } from '@jupyterlab/notebook';
import { VirtualDocument } from './virtual/document';
import { LSPConnection } from './connection';
import {
  IEditorPosition,
  IRootPosition,
  IVirtualPosition
} from './positioning';
import { IVirtualEditor } from './virtual/editor';
import { PositionConverter } from './converter';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { IDocumentWidget } from '@jupyterlab/docregistry';
import { file_editor_adapters, notebook_adapters } from './index';

function is_context_menu_over_token(adapter: WidgetAdapter<IDocumentWidget>) {
  let position = adapter.get_position_from_context_menu();
  if (!position) {
    return false;
  }
  let token = adapter.virtual_editor.get_token_at(position);
  return token.value !== '';
}

export enum CommandEntryPoint {
  CellContextMenu,
  FileEditorContextMenu
}

abstract class LSPCommandManager {
  protected constructor(
    protected app: JupyterFrontEnd,
    protected palette: ICommandPalette,
    protected tracker: IWidgetTracker,
    protected suffix: string
  ) {}

  abstract entry_point: CommandEntryPoint;
  abstract get current_adapter(): WidgetAdapter<IDocumentWidget>;
  abstract attach_command(command: IFeatureCommand): void;
  abstract execute(command: IFeatureCommand): void;
  abstract is_enabled(command: IFeatureCommand): boolean;
  abstract is_visible(command: IFeatureCommand): boolean;
  add_to_palette: boolean = true;
  category: string = 'Language Server Protocol';

  add(commands: Array<IFeatureCommand>) {
    for (let cmd of commands) {
      let id = this.create_id(cmd);
      this.app.commands.addCommand(id, {
        execute: () => this.execute(cmd),
        isEnabled: () => this.is_enabled(cmd),
        isVisible: () => this.is_visible(cmd),
        label: cmd.label
      });

      if (this.should_attach(cmd)) {
        this.attach_command(cmd);
      }

      if (this.add_to_palette) {
        this.palette.addItem({ command: id, category: this.category });
      }
    }
  }

  protected should_attach(command: IFeatureCommand) {
    if (command.attach_to == null) {
      return true;
    }
    return command.attach_to.has(this.entry_point);
  }

  protected create_id(command: IFeatureCommand): string {
    return 'lsp:' + command.id + '-' + this.suffix;
  }
}

/**
 * Contextual commands, with the context retrieved from the ContextMenu
 * position (if open) or from the cursor in the current widget.
 */
export abstract class ContextCommandManager extends LSPCommandManager {
  abstract selector: string;

  constructor(
    app: JupyterFrontEnd,
    palette: ICommandPalette,
    tracker: IWidgetTracker,
    suffix: string,
    protected rank_group?: number,
    protected rank_group_size?: number
  ) {
    super(app, palette, tracker, suffix);
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
    let context = this.get_context();
    if (context) {
      command.execute(context);
    }
  }

  protected get is_context_menu_open(): boolean {
    return this.app.contextMenu.menu.isAttached;
  }

  protected get is_widget_current(): boolean {
    // is the current widget of given type (notebook/editor)
    // also the currently used widget in the entire app?
    return (
      this.tracker.currentWidget != null &&
      this.tracker.currentWidget === this.app.shell.currentWidget
    );
  }

  is_enabled() {
    if (this.is_context_menu_open) {
      return is_context_menu_over_token(this.current_adapter);
    } else {
      return this.is_widget_current;
    }
  }

  get_context(): ICommandContext | null {
    let context: ICommandContext = null;
    if (this.is_context_menu_open) {
      try {
        context = this.current_adapter.get_context_from_context_menu();
      } catch (e) {
        console.warn(
          'contextMenu is attached, but could not get the context',
          e
        );
        context = null;
      }
    }
    if (context == null) {
      context = this.context_from_active_document();
    }
    return context;
  }

  is_visible(command: IFeatureCommand): boolean {
    try {
      let context = this.get_context();
      return (
        context != null &&
        this.current_adapter &&
        context.connection?.isReady &&
        command.is_enabled(context)
      );
    } catch (e) {
      console.warn('is_visible failed', e);
      return false;
    }
  }

  protected get_rank(command: IFeatureCommand): number {
    let is_relative =
      command.is_rank_relative == null ? true : command.is_rank_relative;
    if (is_relative && this.rank_group != null && this.rank_group_size) {
      let relative = command.rank != null ? command.rank : 0;
      return this.rank_group + relative / this.rank_group_size;
    } else {
      return command.rank != null ? command.rank : Infinity;
    }
  }

  abstract context_from_active_document(): ICommandContext;
}

export class NotebookCommandManager extends ContextCommandManager {
  protected tracker: INotebookTracker;
  selector = '.jp-Notebook .jp-CodeCell .jp-Editor';
  entry_point = CommandEntryPoint.CellContextMenu;

  get current_adapter() {
    let notebook = this.tracker.currentWidget;
    return notebook_adapters.get(notebook.id);
  }

  context_from_active_document(): ICommandContext | null {
    if (!this.is_widget_current) {
      return null;
    }
    let notebook = this.tracker.currentWidget;
    let cell = notebook.content.activeCell;
    let editor = cell.editor;
    let ce_cursor = editor.getCursorPosition();
    let cm_cursor = PositionConverter.ce_to_cm(ce_cursor) as IEditorPosition;

    let virtual_editor = this.current_adapter?.virtual_editor;

    if (virtual_editor == null) {
      return null;
    }

    let root_position = virtual_editor.transform_from_notebook_to_root(
      cell,
      cm_cursor
    );

    if (root_position == null) {
      console.warn('Could not retrieve current context', virtual_editor);
      return null;
    }

    return this.current_adapter?.get_context(root_position);
  }
}

export class FileEditorCommandManager extends ContextCommandManager {
  protected tracker: IEditorTracker;
  selector = '.jp-FileEditor';
  entry_point = CommandEntryPoint.FileEditorContextMenu;

  get current_adapter() {
    let fileEditorId = this.tracker.currentWidget?.content?.id;
    return fileEditorId && file_editor_adapters.get(fileEditorId);
  }

  context_from_active_document(): ICommandContext {
    if (!this.is_widget_current) {
      return null;
    }
    let editor = this.tracker.currentWidget.content.editor;
    let ce_cursor = editor.getCursorPosition();
    let root_position = PositionConverter.ce_to_cm(ce_cursor) as IRootPosition;
    return this.current_adapter?.get_context(root_position);
  }
}

export interface ICommandContext {
  app: JupyterFrontEnd;
  document: VirtualDocument;
  connection: LSPConnection;
  virtual_position: IVirtualPosition;
  root_position: IRootPosition;
  features: Map<string, FeatureEditorIntegration<any>>;
  editor: IVirtualEditor<CodeEditor.IEditor>;
  adapter: WidgetAdapter<IDocumentWidget>;
}
