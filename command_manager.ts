import { JupyterFrontEnd } from '@jupyterlab/application';
import { ICommandPalette, IWidgetTracker } from '@jupyterlab/apputils';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { IDocumentWidget } from '@jupyterlab/docregistry';

import { WidgetAdapter } from './adapters/adapter';
import { LSPConnection } from './connection';
import { IFeatureCommand, IFeatureEditorIntegration } from './feature';
import { IRootPosition, IVirtualPosition } from './positioning';
import { ILSPAdapterManager, ILSPLogConsole } from './tokens';
import { VirtualDocument } from './virtual/document';
import { IVirtualEditor } from './virtual/editor';

function is_context_menu_over_token(adapter: WidgetAdapter<IDocumentWidget>) {
  let position = adapter.get_position_from_context_menu();
  if (!position) {
    return false;
  }
  let token = adapter.virtual_editor.get_token_at(position);
  return token.value !== '';
}

export type CommandEntryPoint = string;

export interface ILSPCommandManagerOptions {
  adapter_manager: ILSPAdapterManager;
  app: JupyterFrontEnd;
  palette: ICommandPalette;
  tracker: IWidgetTracker;
  suffix: string;
  entry_point: CommandEntryPoint;
  console: ILSPLogConsole;
}

abstract class LSPCommandManager {
  protected adapter_manager: ILSPAdapterManager;
  protected app: JupyterFrontEnd;
  protected palette: ICommandPalette;
  protected tracker: IWidgetTracker;
  protected suffix: string;
  protected entry_point: CommandEntryPoint;

  protected constructor(options: ILSPCommandManagerOptions) {
    this.adapter_manager = options.adapter_manager;
    this.app = options.app;
    this.palette = options.palette;
    this.tracker = options.tracker;
    this.suffix = options.suffix;
    this.entry_point = options.entry_point;
  }

  get current_adapter() {
    return this.adapter_manager.currentAdapter;
  }
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
        label: cmd.label,
        icon: cmd.icon
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

export interface IContextMenuOptions {
  selector: string;
  rank_group?: number;
  rank_group_size?: number;
  callback?(manager: ContextCommandManager): void;
}

export interface ILSPContextManagerOptions
  extends ILSPCommandManagerOptions,
    IContextMenuOptions {}

/**
 * Contextual commands, with the context retrieved from the ContextMenu
 * position (if open) or from the cursor in the current widget.
 */
export class ContextCommandManager extends LSPCommandManager {
  protected selector: string;
  public entry_point: CommandEntryPoint;
  protected rank_group?: number;
  protected rank_group_size?: number;
  protected console: ILSPLogConsole;

  constructor(options: ILSPContextManagerOptions) {
    super(options);
    this.selector = options.selector;
    this.entry_point = options.entry_point;
    this.rank_group = options.rank_group;
    this.rank_group_size = options.rank_group_size;
    this.console = options.console;
    if (options.callback) {
      options.callback(this);
    }
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
        this.console.warn(
          'contextMenu is attached, but could not get the context',
          e
        );
        context = null;
      }
    }
    if (context == null) {
      context = this.current_adapter?.context_from_active_document();
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
      this.console.warn('is_visible failed', e);
      return false;
    }
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
      return command.rank != null ? command.rank : Infinity;
    }
  }
}

export interface ICommandContext {
  app: JupyterFrontEnd;
  document: VirtualDocument;
  connection: LSPConnection;
  virtual_position: IVirtualPosition;
  root_position: IRootPosition;
  features: Map<string, IFeatureEditorIntegration<any>>;
  editor: IVirtualEditor<CodeEditor.IEditor>;
  adapter: WidgetAdapter<IDocumentWidget>;
}
