
import {
  Dialog, showDialog
} from '@jupyterlab/apputils';

import {
  CodeEditor
} from '@jupyterlab/codeeditor';

import {
  ISettingRegistry
} from '@jupyterlab/coreutils';

import {
  JSONExt
} from '@phosphor/coreutils';

import {
  Message
} from '@phosphor/messaging';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  Widget, StackedLayout
} from '@phosphor/widgets';

import {
  RawEditor
} from './raweditor';

import {
  SettingEditor
} from './settingeditor';

import {
  TableEditor
} from './tableeditor';


/**
 * The class name added to all plugin editors.
 */
const PLUGIN_EDITOR_CLASS = 'jp-PluginEditor';


/**
 * An individual plugin settings editor.
 */
export
class PluginEditor extends Widget {
  /**
   * Create a new plugin editor.
   */
  constructor(options: PluginEditor.IOptions) {
    super();
    this.addClass(PLUGIN_EDITOR_CLASS);

    const { editorFactory } = options;
    const layout = this.layout = new StackedLayout();
    const { onSaveError } = Private;

    this._rawEditor = new RawEditor({ editorFactory, onSaveError });
    this._tableEditor = new TableEditor({ onSaveError });
    this._rawEditor.handleMoved.connect(this._onStateChanged, this);

    layout.addWidget(this._rawEditor);
    layout.addWidget(this._tableEditor);
  }

  /**
   * Tests whether the settings have been modified and need saving.
   */
  get isDirty(): boolean {
    return this._rawEditor.isDirty || this._tableEditor.isDirty;
  }

  /**
   * The plugin settings being edited.
   */
  get settings(): ISettingRegistry.ISettings | null {
    return this._settings;
  }
  set settings(settings: ISettingRegistry.ISettings | null) {
    if (this._settings === settings) {
      return;
    }

    const raw = this._rawEditor;
    const table = this._tableEditor;

    this._settings = raw.settings = table.settings = settings;
    this.update();
  }

  /**
   * The plugin editor layout state.
   */
  get state(): SettingEditor.IPluginLayout {
    const editor = this._editor;
    const plugin = this._settings ? this._settings.plugin : '';
    const { sizes } = this._rawEditor;

    return { editor, plugin, sizes };
  }
  set state(state: SettingEditor.IPluginLayout) {
    if (JSONExt.deepEqual(this.state, state)) {
      return;
    }

    this._editor = state.editor;
    this._rawEditor.sizes = state.sizes;
    this.update();
  }

  /**
   * A signal that emits when editor layout state changes and needs to be saved.
   */
  get stateChanged(): ISignal<this, void> {
    return this._stateChanged;
  }

  /**
   * If the editor is in a dirty state, confirm that the user wants to leave.
   */
  confirm(): Promise<void> {
    if (this.isHidden || !this.isAttached || !this.isDirty) {
      return Promise.resolve(void 0);
    }

    return showDialog({
      title: 'You have unsaved changes.',
      body: 'Do you want to leave without saving?',
      buttons: [Dialog.cancelButton(), Dialog.okButton()]
    }).then(result => {
      if (!result.button.accept) {
        throw new Error('User cancelled.');
      }
    });
  }

  /**
   * Dispose of the resources held by the plugin editor.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    super.dispose();
    this._rawEditor.dispose();
    this._tableEditor.dispose();
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
    const editor = this._editor;
    const raw = this._rawEditor;
    const table = this._tableEditor;
    const settings = this._settings;

    if (!settings) {
      this.hide();
      return;
    }

    this.show();
    (editor === 'raw' ? table : raw).hide();
    (editor === 'raw' ? raw : table).show();
  }

  /**
   * Handle layout state changes that need to be saved.
   */
  private _onStateChanged(): void {
    (this.stateChanged as Signal<any, void>).emit(undefined);
  }

  private _editor: 'raw' | 'table' = 'raw';
  private _rawEditor: RawEditor;
  private _tableEditor: TableEditor;
  private _settings: ISettingRegistry.ISettings | null = null;
  private _stateChanged = new Signal<this, void>(this);
}


/**
 * A namespace for `PluginEditor` statics.
 */
export
namespace PluginEditor {
  /**
   * The instantiation options for a plugin editor.
   */
  export
  interface IOptions {
    /**
     * The editor factory used by the plugin editor.
     */
    editorFactory: CodeEditor.Factory;
  }
}


/**
 * A namespace for private module data.
 */
namespace Private {
  /**
   * Handle save errors.
   */
  export
  function onSaveError(reason: any): void {
    console.error(`Saving setting editor value failed: ${reason.message}`);

    showDialog({
      title: 'Your changes were not saved.',
      body: reason.message,
      buttons: [Dialog.okButton()]
    });
  }
}
