/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { Dialog, showDialog, showErrorMessage } from '@jupyterlab/apputils';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import { CommandRegistry } from '@lumino/commands';
import { JSONExt } from '@lumino/coreutils';
import { Message } from '@lumino/messaging';
import { ISignal, Signal } from '@lumino/signaling';
import { StackedLayout, Widget } from '@lumino/widgets';
import { RawEditor } from './raweditor';
import { JsonSettingEditor } from './jsonsettingeditor';

/**
 * The class name added to all plugin editors.
 */
const PLUGIN_EDITOR_CLASS = 'jp-PluginEditor';

/**
 * An individual plugin settings editor.
 */
export class PluginEditor extends Widget {
  /**
   * Create a new plugin editor.
   *
   * @param options - The plugin editor instantiation options.
   */
  constructor(options: PluginEditor.IOptions) {
    super();
    this.addClass(PLUGIN_EDITOR_CLASS);

    const { commands, editorFactory, registry, rendermime, translator } =
      options;
    this.translator = translator || nullTranslator;
    this._trans = this.translator.load('jupyterlab');

    // TODO: Remove this layout. We were using this before when we
    // when we had a way to switch between the raw and table editor
    // Now, the raw editor is the only child and probably could merged into
    // this class directly in the future.
    const layout = (this.layout = new StackedLayout());
    const { onSaveError } = Private;

    this.raw = this._rawEditor = new RawEditor({
      commands,
      editorFactory,
      onSaveError,
      registry,
      rendermime,
      translator
    });
    this._rawEditor.handleMoved.connect(this._onStateChanged, this);

    layout.addWidget(this._rawEditor);
  }

  /**
   * The plugin editor's raw editor.
   */
  readonly raw: RawEditor;

  /**
   * Tests whether the settings have been modified and need saving.
   */
  get isDirty(): boolean {
    return this._rawEditor.isDirty;
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

    this._settings = raw.settings = settings;
    this.update();
  }

  /**
   * The plugin editor layout state.
   */
  get state(): JsonSettingEditor.IPluginLayout {
    const plugin = this._settings ? this._settings.id : '';
    const { sizes } = this._rawEditor;

    return { plugin, sizes };
  }
  set state(state: JsonSettingEditor.IPluginLayout) {
    if (JSONExt.deepEqual(this.state, state)) {
      return;
    }

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
      return Promise.resolve(undefined);
    }

    return showDialog({
      title: this._trans.__('You have unsaved changes.'),
      body: this._trans.__('Do you want to leave without saving?'),
      buttons: [
        Dialog.cancelButton({ label: this._trans.__('Cancel') }),
        Dialog.okButton({ label: this._trans.__('Ok') })
      ]
    }).then(result => {
      if (!result.button.accept) {
        throw new Error('User canceled.');
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
    const raw = this._rawEditor;
    const settings = this._settings;

    if (!settings) {
      this.hide();
      return;
    }

    this.show();
    raw.show();
  }

  /**
   * Handle layout state changes that need to be saved.
   */
  private _onStateChanged(): void {
    (this.stateChanged as Signal<any, void>).emit(undefined);
  }

  protected translator: ITranslator;
  private _trans: TranslationBundle;
  private _rawEditor: RawEditor;
  private _settings: ISettingRegistry.ISettings | null = null;
  private _stateChanged = new Signal<this, void>(this);
}

/**
 * A namespace for `PluginEditor` statics.
 */
export namespace PluginEditor {
  /**
   * The instantiation options for a plugin editor.
   */
  export interface IOptions {
    /**
     * The toolbar commands and registry for the setting editor toolbar.
     */
    commands: {
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
    };

    /**
     * The editor factory used by the plugin editor.
     */
    editorFactory: CodeEditor.Factory;

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
   * Handle save errors.
   */
  export function onSaveError(
    reason: Dialog.IError,
    translator?: ITranslator
  ): void {
    translator = translator || nullTranslator;
    const trans = translator.load('jupyterlab');
    console.error(`Saving setting editor value failed: ${reason.message}`);
    void showErrorMessage(trans.__('Your changes were not saved.'), reason);
  }
}
