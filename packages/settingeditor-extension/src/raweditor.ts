// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  CodeEditor, JSONEditor
} from '@jupyterlab/codeeditor';

import {
  ISettingRegistry, ObservableJSON
} from '@jupyterlab/coreutils';

import {
  Message
} from '@phosphor/messaging';

import {
  ISignal
} from '@phosphor/signaling';

import {
  PanelLayout, Widget
} from '@phosphor/widgets';

import {
  SplitPanel
} from './settingeditor';


/**
 * A raw JSON settings editor.
 */
export
class RawEditor extends Widget {
  /**
   * Create a new plugin editor.
   */
  constructor(options: RawEditor.IOptions) {
    super();

    const layout = this.layout = new PanelLayout();
    const { editorFactory } = options;
    const collapsible = false;
    const panel = this._panel = new SplitPanel({
      orientation: 'horizontal',
      renderer: SplitPanel.defaultRenderer,
      spacing: 1
    });

    this.handleMoved = panel.handleMoved;
    this._onSaveError = options.onSaveError;
    this._defaults = new JSONEditor({ collapsible, editorFactory });
    this._user = new JSONEditor({ collapsible, editorFactory });

    layout.addWidget(panel);
    panel.addWidget(this._defaults);
    panel.addWidget(this._user);
  }

  /**
   * Emits when the split handle has moved.
   */
  readonly handleMoved: ISignal<any, void>;

  /**
   * Tests whether the settings have been modified and need saving.
   */
  get isDirty(): boolean {
    return this._user.isDirty;
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

    const samePlugin = (settings && this._settings) &&
      settings.plugin === this._settings.plugin;

    if (samePlugin) {
      return;
    }

    const defaults = this._defaults;
    const user = this._user;

    // Disconnect old source change handler.
    if (user.source) {
      user.source.changed.disconnect(this._onSourceChanged, this);
    }

    // Disconnect old settings change handler.
    if (this._settings) {
      this._settings.changed.disconnect(this._onSettingsChanged, this);
    }

    if (settings) {
      this._settings = settings;
      this._settings.changed.connect(this._onSettingsChanged, this);
      this._onSettingsChanged();
    } else {
      this._settings = defaults.source = user.source = null;
    }

    this.update();
  }

  /**
   * Get the relative sizes of the two editor panels.
   */
  get sizes(): number[] {
    return this._panel.relativeSizes();
  }
  set sizes(sizes: number[]) {
    this._panel.setRelativeSizes(sizes);
  }

  /**
   * Dispose of the resources held by the raw editor.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    super.dispose();
    this._defaults.dispose();
    this._panel.dispose();
    this._user.dispose();
  }

  /**
   * Handle `after-attach` messages.
   */
  protected onAfterAttach(msg: Message): void {
    this.update();
  }

  /**
   * Handle `'update-request'` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    const settings = this._settings;
    const defaults = this._defaults;
    const user = this._user;

    if (settings) {
      defaults.editor.refresh();
      user.editor.refresh();
    }
  }

  /**
   * Handle updates to the settings.
   */
  private _onSettingsChanged(): void {
    const settings = this._settings;
    const defaults = this._defaults;
    const user = this._user;
    const values = settings && settings.user || { };

    defaults.source = new ObservableJSON({ values });
    user.source = new ObservableJSON({ values });
    user.source.changed.connect(this._onSourceChanged, this);
  }

  /**
   * Handle source changes in the underlying editor.
   */
  private _onSourceChanged(): void {
    const source = this._user.source;
    const settings = this._settings;

    if (!settings || !source) {
      return;
    }

    settings.save(source.toJSON()).catch(this._onSaveError);
  }

  private _defaults: JSONEditor;
  private _onSaveError: (reason: any) => void;
  private _panel: SplitPanel;
  private _settings: ISettingRegistry.ISettings | null = null;
  private _user: JSONEditor;
}


/**
 * A namespace for `RawEditor` statics.
 */
export
namespace RawEditor {
  /**
   * The instantiation options for a raw editor.
   */
  export
  interface IOptions {
    /**
     * The editor factory used by the raw editor.
     */
    editorFactory: CodeEditor.Factory;

    /**
     * A function the raw editor calls on save errors.
     */
    onSaveError: (reason: any) => void;
  }
}
