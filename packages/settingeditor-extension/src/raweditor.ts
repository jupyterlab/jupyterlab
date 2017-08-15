// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  CodeEditor, CodeEditorWrapper, JSONEditor
} from '@jupyterlab/codeeditor';

import {
  ISettingRegistry, ObservableJSON
} from '@jupyterlab/coreutils';

import {
  Message
} from '@phosphor/messaging';

import {
  h, VirtualDOM
} from '@phosphor/virtualdom';

import {
  BoxLayout, Widget
} from '@phosphor/widgets';

import {
  SplitPanel
} from './splitpanel';

/**
 * A class name added to all raw editors.
 */
const RAW_EDITOR_CLASS = 'jp-SettingsRawEditor';

/**
 * A class name added to the banner of editors in the raw settings editor.
 */
const BANNER_CLASS = 'jp-SettingsRawEditor-banner';

/**
 * The banner text for the default editor.
 */
const DEFAULT_TITLE = 'System Defaults';

/**
 * The banner text for the user settings editor.
 */
const USER_TITLE = 'User Overrides';


/**
 * A raw JSON settings editor.
 */
export
class RawEditor extends SplitPanel {
  /**
   * Create a new plugin editor.
   */
  constructor(options: RawEditor.IOptions) {
    super({
      orientation: 'horizontal',
      renderer: SplitPanel.defaultRenderer,
      spacing: 1
    });

    const { editorFactory } = options;
    const collapsible = false;

    // Create read-only defaults editor.
    const defaults = this._defaults = new CodeEditorWrapper({
      model: new CodeEditor.Model(),
      factory: editorFactory
    });

    defaults.editor.model.value.text = '';
    defaults.editor.model.mimeType = 'text/javascript';
    defaults.editor.setOption('readOnly', true);

    // Create read-write user settings editor.
    const user = this._user = new JSONEditor({ collapsible, editorFactory });

    this.addClass(RAW_EDITOR_CLASS);
    this._onSaveError = options.onSaveError;
    this.addWidget(Private.addBanner(defaults, DEFAULT_TITLE, BANNER_CLASS));
    this.addWidget(Private.addBanner(user, USER_TITLE, BANNER_CLASS));
  }

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
      this._settings = user.source = null;
      defaults.editor.model.value.text = '';
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
   * Dispose of the resources held by the raw editor.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    super.dispose();
    this._defaults.dispose();
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

    defaults.editor.model.value.text = settings.annotatedDefaults();
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

  private _defaults: CodeEditorWrapper;
  private _onSaveError: (reason: any) => void;
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


/**
 * A namespace for private module data.
 */
namespace Private {
  /**
   * Returns a wrapper widget to hold an editor and its banner.
   */
  export
  function addBanner(editor: Widget, bannerText: string, bannerClass: string): Widget {
    const widget = new Widget();
    const layout = widget.layout = new BoxLayout({ spacing: 0 });
    const banner = new Widget({
      node: VirtualDOM.realize(h.div({ className: bannerClass }, bannerText))
    });

    layout.addWidget(banner);
    layout.addWidget(editor);

    return widget;
  }
}
