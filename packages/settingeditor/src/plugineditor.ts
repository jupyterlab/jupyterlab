/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { ILabStatus } from '@jupyterlab/application';
import { Dialog, IThemeManager, showDialog } from '@jupyterlab/apputils';
import { IEditorServices } from '@jupyterlab/codeeditor';
import { ISettingRegistry, Settings } from '@jupyterlab/settingregistry';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import { JSONExt } from '@lumino/coreutils';
import { Message } from '@lumino/messaging';
import { ISignal, Signal } from '@lumino/signaling';
import { Panel, PanelLayout, Widget } from '@lumino/widgets';
import { PluginList } from './pluginlist';
import { SettingEditor } from './settingeditor';
import { SettingsMetadataEditor } from './settingmetadataeditor';
import { ISettingEditorRegistry } from './tokens';

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

    this.node.addEventListener('scroll', (ev: Event) => {
      for (const editor of this._editors) {
        const offsetTop =
          editor.node.offsetTop + (editor.parent?.node?.offsetTop ?? 0);
        if (
          this.node.scrollTop >= (editor.parent?.node?.offsetTop ?? 0) &&
          // If top of editor is visible
          (offsetTop >= this.node.scrollTop ||
            // If the top is above the view and the bottom is below the view
            (offsetTop < this.node.scrollTop &&
              offsetTop + editor.node.scrollHeight >
                this.node.scrollTop + this.node.clientHeight))
        ) {
          this.selection = editor.id;
          break;
        }
      }
    });

    this.translator = options.translator || nullTranslator;
    this._trans = this.translator.load('jupyterlab');
    // TODO: Remove this layout. We were using this before when we
    // when we had a way to switch between the raw and table editor
    // Now, the raw editor is the only child and probably could merged into
    // this class directly in the future.
    const layout = (this.layout = new PanelLayout());
    const modifiedLayout = new Panel();
    const otherLayout = new Panel();
    const modifiedHeader = document.createElement('div');
    modifiedHeader.textContent = 'Modified';
    modifiedHeader.className = 'jp-SettingEditor-header';
    layout.addWidget(new Widget({ node: modifiedHeader }));
    layout.addWidget(modifiedLayout);
    const otherHeader = document.createElement('div');
    otherHeader.textContent = 'Other Settings';
    otherHeader.className = 'jp-SettingEditor-header';
    layout.addWidget(new Widget({ node: otherHeader }));
    layout.addWidget(otherLayout);
    const editors = (this._editors = [] as SettingsMetadataEditor[]);
    const setupEditors = async () => {
      const plugins = PluginList.sortPlugins(options.registry).filter(
        plugin => {
          const { schema } = plugin;
          const deprecated = schema['jupyter.lab.setting-deprecated'] === true;
          const editable = Object.keys(schema.properties || {}).length > 0;
          const extensible = schema.additionalProperties !== false;

          return !deprecated && (editable || extensible);
        }
      );
      for (const plugin of plugins) {
        const newEditor = new SettingsMetadataEditor({
          name: plugin?.id
            .replace('@', '')
            .replace('/', '')
            .replace('-', '')
            .replace(':', ''),
          code: options.code,
          editorServices: options.editorServices,
          status: options.status,
          themeManager: options.themeManager,
          settings: plugin,
          registry: options.registry,
          editorRegistry: options.editorRegistry
        });
        editors.push(newEditor);
        try {
          const registry = await options.registry;
          const settings = (await registry.load(plugin.id)) as Settings;
          if (!newEditor.isAttached) {
            if (settings.modifiedFields.length > 0) {
              modifiedLayout.addWidget(newEditor);
            } else {
              otherLayout.addWidget(newEditor);
            }
          }
          newEditor.settings = settings;
        } catch {
          console.log(`error loading settings for ${plugin.id}`);
        }
        // list.selection = pluginName;
        // this._setLayout();
      }
      this.update();
    };

    void setupEditors();

    // this.raw = this._rawEditor = new SettingsMetadataEditor(options);
    // this._rawEditor.handleMoved.connect(this._onStateChanged, this);
  }

  /**
   * The plugin editor's raw editor.
   */
  // readonly raw: SettingsMetadataEditor;

  /**
   * Tests whether the settings have been modified and need saving.
   */
  get isDirty(): boolean {
    return this._editors.filter(editor => editor.dirty).length > 0;
  }

  /**
   * The plugin settings being edited.
   */
  get settings(): ISettingRegistry.ISettings | null {
    return this._settings;
  }
  set settings(settings: ISettingRegistry.ISettings | null) {
    this._settings = settings;
    // this._rawEditor.settings = settings;

    this.update();
  }

  get selection(): string {
    return this._selection;
  }
  set selection(value: string) {
    this._selection = value;
    this._onSelectionChanged.emit(value);
  }

  get onSelectionChanged(): Signal<this, string> {
    return this._onSelectionChanged;
  }

  /**
   * The plugin editor layout state.
   */
  get state(): SettingEditor.IPluginLayout {
    const plugin = this._settings ? this._settings.id : '';
    // const { sizes } = this._rawEditor;

    return { plugin };
  }
  set state(state: SettingEditor.IPluginLayout) {
    if (JSONExt.deepEqual(this.state, state)) {
      return;
    }

    // this._rawEditor.sizes = state.sizes;
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
  confirm(id: string): Promise<void> {
    const editor = this._editors.find(editor => editor.id === id);
    if (editor) {
      editor.node?.scrollIntoView();
    }
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
    this._editors.forEach(editor => editor.dispose());
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
    // const raw = this._rawEditor;
    const settings = this._settings;

    if (!settings) {
      this.hide();
      return;
    }

    this.show();
    void this.confirm(this.selection);
    // raw.show();
  }

  /**
   * Handle layout state changes that need to be saved.
   */
  // private _onStateChanged(): void {
  //   (this.stateChanged as Signal<any, void>).emit(undefined);
  // }

  protected translator: ITranslator;
  private _selection: string;
  private _trans: TranslationBundle;
  private _editors: SettingsMetadataEditor[];
  private _settings: ISettingRegistry.ISettings | null = null;
  private _onSelectionChanged = new Signal<this, string>(this);
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
    name?: string;
    code?: string[];
    editorServices: IEditorServices | null;
    status: ILabStatus;
    themeManager?: IThemeManager;

    registry: ISettingRegistry;

    editorRegistry: ISettingEditorRegistry;

    /**
     * The application language translator.
     */
    translator?: ITranslator;
  }
}

/**
 * A namespace for private module data.
 */
// namespace Private {
//   /**
//    * Handle save errors.
//    */
//   export function onSaveError(reason: any, translator?: ITranslator): void {
//     translator = translator || nullTranslator;
//     const trans = translator.load('jupyterlab');
//     console.error(`Saving setting editor value failed: ${reason.message}`);
//     void showDialog({
//       title: trans.__('Your changes were not saved.'),
//       body: reason.message,
//       buttons: [Dialog.okButton({ label: trans.__('Ok') })]
//     });
//   }
// }
