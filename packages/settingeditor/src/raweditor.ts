// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeEditor, CodeEditorWrapper } from '@jupyterlab/codeeditor';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { CommandToolbarButton, Toolbar } from '@jupyterlab/ui-components';
import { CommandRegistry } from '@lumino/commands';
import { Message } from '@lumino/messaging';
import { ISignal, Signal } from '@lumino/signaling';
import { BoxLayout, SplitPanel, Widget } from '@lumino/widgets';
import { createInspector } from './inspector';

/**
 * A class name added to all raw editors.
 */
const RAW_EDITOR_CLASS = 'jp-SettingsRawEditor';

/**
 * A class name added to the user settings editor.
 */
const USER_CLASS = 'jp-SettingsRawEditor-user';

/**
 * A class name added to the user editor when there are validation errors.
 */
const ERROR_CLASS = 'jp-mod-error';

/**
 * A raw JSON settings editor.
 */
export class RawEditor extends SplitPanel {
  /**
   * Create a new plugin editor.
   */
  constructor(options: RawEditor.IOptions) {
    super({
      orientation: 'horizontal',
      renderer: SplitPanel.defaultRenderer,
      spacing: 1
    });

    const { commands, editorFactory, registry, translator } = options;
    this.registry = registry;
    this.translator = translator || nullTranslator;
    this._commands = commands;

    // Create read-only defaults editor.
    const defaults = (this._defaults = new CodeEditorWrapper({
      editorOptions: {
        config: { readOnly: true }
      },
      model: new CodeEditor.Model({ mimeType: 'text/javascript' }),
      factory: editorFactory
    }));

    // Create read-write user settings editor.
    const user = (this._user = new CodeEditorWrapper({
      editorOptions: {
        config: { lineNumbers: true }
      },
      model: new CodeEditor.Model({ mimeType: 'text/javascript' }),
      factory: editorFactory
    }));

    user.addClass(USER_CLASS);
    user.editor.model.sharedModel.changed.connect(this._onTextChanged, this);

    // Create and set up an inspector.
    this._inspector = createInspector(
      this,
      options.rendermime,
      this.translator
    );

    this.addClass(RAW_EDITOR_CLASS);
    this._onSaveError = options.onSaveError;
    this.addWidget(Private.defaultsEditor(defaults, this.translator));
    this.addWidget(
      Private.userEditor(user, this._toolbar, this._inspector, this.translator)
    );
  }

  /**
   * The setting registry used by the editor.
   */
  readonly registry: ISettingRegistry;

  /**
   * Whether the raw editor revert functionality is enabled.
   */
  get canRevert(): boolean {
    return this._canRevert;
  }

  /**
   * Whether the raw editor save functionality is enabled.
   */
  get canSave(): boolean {
    return this._canSave;
  }

  /**
   * Emits when the commands passed in at instantiation change.
   */
  get commandsChanged(): ISignal<any, string[]> {
    return this._commandsChanged;
  }

  /**
   * Tests whether the settings have been modified and need saving.
   */
  get isDirty(): boolean {
    return (
      this._user.editor.model.sharedModel.getSource() !== this._settings?.raw ??
      ''
    );
  }

  /**
   * The plugin settings being edited.
   */
  get settings(): ISettingRegistry.ISettings | null {
    return this._settings;
  }
  set settings(settings: ISettingRegistry.ISettings | null) {
    if (!settings && !this._settings) {
      return;
    }

    const samePlugin =
      settings && this._settings && settings.plugin === this._settings.plugin;

    if (samePlugin) {
      return;
    }

    const defaults = this._defaults;
    const user = this._user;

    // Disconnect old settings change handler.
    if (this._settings) {
      this._settings.changed.disconnect(this._onSettingsChanged, this);
    }

    if (settings) {
      this._settings = settings;
      this._settings.changed.connect(this._onSettingsChanged, this);
      this._onSettingsChanged();
    } else {
      this._settings = null;
      defaults.editor.model.sharedModel.setSource('');
      user.editor.model.sharedModel.setSource('');
    }

    this.update();
  }

  /**
   * Get the relative sizes of the two editor panels.
   */
  get sizes(): number[] {
    return this.relativeSizes();
  }
  set sizes(sizes: number[]) {
    this.setRelativeSizes(sizes);
  }

  /**
   * The inspectable source editor for user input.
   */
  get source(): CodeEditor.IEditor {
    return this._user.editor;
  }

  /**
   * Dispose of the resources held by the raw editor.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    this._defaults.model.dispose();
    this._defaults.dispose();
    this._user.model.dispose();
    this._user.dispose();
    super.dispose();
  }

  /**
   * Revert the editor back to original settings.
   */
  revert(): void {
    this._user.editor.model.sharedModel.setSource(this.settings?.raw ?? '');
    this._updateToolbar(false, false);
  }

  /**
   * Save the contents of the raw editor.
   */
  save(): Promise<void> {
    if (!this.isDirty || !this._settings) {
      return Promise.resolve(undefined);
    }

    const settings = this._settings;
    const source = this._user.editor.model.sharedModel.getSource();

    return settings
      .save(source)
      .then(() => {
        this._updateToolbar(false, false);
      })
      .catch(reason => {
        this._updateToolbar(true, false);
        this._onSaveError(reason, this.translator);
      });
  }

  /**
   * Handle `after-attach` messages.
   */
  protected onAfterAttach(msg: Message): void {
    Private.populateToolbar(this._commands, this._toolbar);
    this.update();
  }

  /**
   * Handle text changes in the underlying editor.
   */
  private _onTextChanged(): void {
    const raw = this._user.editor.model.sharedModel.getSource();
    const settings = this._settings;

    this.removeClass(ERROR_CLASS);

    // If there are no settings loaded or there are no changes, bail.
    if (!settings || settings.raw === raw) {
      this._updateToolbar(false, false);
      return;
    }

    const errors = settings.validate(raw);

    if (errors) {
      this.addClass(ERROR_CLASS);
      this._updateToolbar(true, false);
      return;
    }

    this._updateToolbar(true, true);
  }

  /**
   * Handle updates to the settings.
   */
  private _onSettingsChanged(): void {
    const settings = this._settings;
    const defaults = this._defaults;
    const user = this._user;

    defaults.editor.model.sharedModel.setSource(
      settings?.annotatedDefaults() ?? ''
    );
    user.editor.model.sharedModel.setSource(settings?.raw ?? '');
  }

  private _updateToolbar(revert = this._canRevert, save = this._canSave): void {
    const commands = this._commands;

    this._canRevert = revert;
    this._canSave = save;
    this._commandsChanged.emit([commands.revert, commands.save]);
  }

  protected translator: ITranslator;
  private _canRevert = false;
  private _canSave = false;
  private _commands: RawEditor.ICommandBundle;
  private _commandsChanged = new Signal<this, string[]>(this);
  private _defaults: CodeEditorWrapper;
  private _inspector: Widget;
  private _onSaveError: (reason: any, translator?: ITranslator) => void;
  private _settings: ISettingRegistry.ISettings | null = null;
  private _toolbar = new Toolbar<Widget>();
  private _user: CodeEditorWrapper;
}

/**
 * A namespace for `RawEditor` statics.
 */
export namespace RawEditor {
  /**
   * The toolbar commands and registry for the setting editor toolbar.
   */
  export interface ICommandBundle {
    /**
     * The command registry.
     */
    registry: CommandRegistry;

    /**
     * The revert command ID.
     */
    revert: string;

    /**
     * The save command ID.
     */
    save: string;
  }

  /**
   * The instantiation options for a raw editor.
   */
  export interface IOptions {
    /**
     * The toolbar commands and registry for the setting editor toolbar.
     */
    commands: ICommandBundle;

    /**
     * The editor factory used by the raw editor.
     */
    editorFactory: CodeEditor.Factory;

    /**
     * A function the raw editor calls on save errors.
     */
    onSaveError: (reason: any, translator?: ITranslator) => void;

    /**
     * The setting registry used by the editor.
     */
    registry: ISettingRegistry;

    /**
     * The optional MIME renderer to use for rendering debug messages.
     */
    rendermime?: IRenderMimeRegistry;

    /**
     * The application language translator.
     */
    translator?: ITranslator;
  }
}

/**
 * A namespace for private module data.
 */
namespace Private {
  /**
   * Returns the wrapped setting defaults editor.
   */
  export function defaultsEditor(
    editor: Widget,
    translator?: ITranslator
  ): Widget {
    translator = translator || nullTranslator;
    const trans = translator.load('jupyterlab');
    const widget = new Widget();
    const layout = (widget.layout = new BoxLayout({ spacing: 0 }));
    const banner = new Widget();
    const bar = new Toolbar();
    bar.node.setAttribute('aria-label', trans.__('Default editor toolbar'));
    const defaultTitle = trans.__('System Defaults');

    banner.node.innerText = defaultTitle;
    bar.insertItem(0, 'banner', banner);
    layout.addWidget(bar);
    layout.addWidget(editor);

    return widget;
  }

  /**
   * Populate the raw editor toolbar.
   */
  export function populateToolbar(
    commands: RawEditor.ICommandBundle,
    toolbar: Toolbar<Widget>
  ): void {
    const { registry, revert, save } = commands;

    toolbar.addItem('spacer', Toolbar.createSpacerItem());

    // Note the button order. The rationale here is that no matter what state
    // the toolbar is in, the relative location of the revert button in the
    // toolbar remains the same.
    [revert, save].forEach(name => {
      const item = new CommandToolbarButton({ commands: registry, id: name });
      toolbar.addItem(name, item);
    });
  }

  /**
   * Returns the wrapped user overrides editor.
   */
  export function userEditor(
    editor: Widget,
    toolbar: Toolbar<Widget>,
    inspector: Widget,
    translator?: ITranslator
  ): Widget {
    translator = translator || nullTranslator;
    const trans = translator.load('jupyterlab');
    const userTitle = trans.__('User Preferences');
    const widget = new Widget();
    const layout = (widget.layout = new BoxLayout({ spacing: 0 }));
    const banner = new Widget();

    banner.node.innerText = userTitle;
    toolbar.insertItem(0, 'banner', banner);
    layout.addWidget(toolbar);
    layout.addWidget(editor);
    layout.addWidget(inspector);

    return widget;
  }
}
