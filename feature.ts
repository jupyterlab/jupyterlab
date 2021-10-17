import { CodeEditor } from '@jupyterlab/codeeditor';
import { IDocumentWidget } from '@jupyterlab/docregistry';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { TranslationBundle } from '@jupyterlab/translation';
import { LabIcon } from '@jupyterlab/ui-components';
import { Signal } from '@lumino/signaling';

import { StatusMessage, WidgetAdapter } from './adapters/adapter';
import { CommandEntryPoint, ICommandContext } from './command_manager';
import { LSPConnection } from './connection';
import { IRootPosition } from './positioning';
import { VirtualDocument } from './virtual/document';
import { IEditorChange, IVirtualEditor } from './virtual/editor';

import IEditor = CodeEditor.IEditor;

export interface IFeatureCommand {
  /**
   * The command id; it will be prepended with 'lsp' prefix.
   * To support multiple attachment points, multiple actual commands will be created,
   * identified by an attachment-point-specific suffix.
   */
  id: string;
  /**
   * Execute callback, will be called when users executes the command.
   * @param context
   */
  execute: (context: ICommandContext) => void;
  /**
   * A callback to check whether the command is available in given context.
   * @param context
   */
  is_enabled: (context: ICommandContext) => boolean;
  /**
   * The user-facing name of the command.
   */
  label: string;
  /**
   * Default infinity (unassigned) if absolute, otherwise 0 (for relative ranks)
   */
  rank?: number;
  /**
   * Does the rank represent relative position in the LSP commands group? (default: true)
   */
  is_rank_relative?: boolean;
  /**
   * By default the command will be attached to context menus of each adapter.
   */
  attach_to?: Set<CommandEntryPoint>;
  /**
   * The icon to be displayed next to the label.
   */
  icon?: LabIcon;
}

export interface IFeatureSettings<T> {
  readonly composite: T;
  readonly changed: Signal<IFeatureSettings<T>, void>;
  readonly ready?: Promise<void>;

  set(setting: keyof T, value: any): void;
}

export class FeatureSettings<T> implements IFeatureSettings<T> {
  protected settings: ISettingRegistry.ISettings;
  public changed: Signal<FeatureSettings<T>, void>;
  public ready: Promise<void>;

  constructor(protected settingRegistry: ISettingRegistry, featureID: string) {
    this.changed = new Signal(this);
    if (!(featureID in settingRegistry.plugins)) {
      console.warn(
        `${featureID} settings schema could not be found and was not loaded`
      );
    } else {
      this.ready = new Promise(accept => {
        settingRegistry
          .load(featureID)
          .then(settings => {
            this.settings = settings;
            accept();
            this.changed.emit();
            settings.changed.connect(() => {
              this.settings = settings;
              this.changed.emit();
            });
          })
          .catch(console.warn);
      });
    }
  }

  get composite(): T {
    return this.settings.composite as unknown as T;
  }

  set(setting: keyof T, value: any) {
    this.settings.set(setting as string, value).catch(console.warn);
  }
}

/**
 * Names of the supported editors.
 */
export type IEditorName = string;

export interface IFeature {
  /**
   * The feature identifier. It must be the same as the feature plugin id.
   */
  id: string;
  /**
   * The user-readable name of the feature.
   */
  name: string;
  /**
   * Each feature can be written in mind with support for one or more editors.
   * Separate editor integration implementations should be provided for each supported editor.
   *
   * Currently only CodeMirrorEditor is supported.
   */
  editorIntegrationFactory: Map<
    IEditorName,
    IFeatureEditorIntegrationConstructor<IVirtualEditor<IEditor>>
  >;
  /**
   * Command specification, including context menu placement options.
   */
  commands?: Array<IFeatureCommand>;
  /**
   * Objects implementing JupyterLab-specific integration,
   * for example, adding new GUI elements such as hover tooltips or replacing completer.
   *
   * It can be accessed from the FeatureEditorIntegration object
   * constructor using (options: IEditorIntegrationOptions).feature.
   */
  labIntegration?: IFeatureLabIntegration;
  /**
   * Settings to be passed to the FeatureEditorIntegration.
   * To use the same settings for lab integration bind the same FeatureSettings object to the labIntegration object.
   */
  settings?: IFeatureSettings<any>;
}

export interface IFeatureEditorIntegration<T extends IVirtualEditor<IEditor>> {
  /**
   * Stores registration confirmation and should be set to true once register()
   * is successfully called (and false beforehand)
   */
  is_registered: boolean;
  /**
   * The reference to the Feature (it will be provided in the constructor options;
   * the implementations should expose them as public so that the specific features
   * can access their settings and metadata).
   */
  feature: IFeature;
  /**
   * Connect event handlers to the editor, virtual document and connection(s).
   */
  register(): void;
  /**
   * Remove the event handlers.
   */
  remove(): void;
  /**
   * A callback which is executed after a change in the virtual document has been
   * recorded and the document positions were recalculated; this is different from
   * observing value changes in the underlying editor implementation itself (e.g. in
   * the CodeMirror.Editor) as the direct listening to the events does not guarantee
   * that the appropriate changes were reflected in the virtual document at the point
   * the listeners were reached (thus not using afterChange() when needed may lead to
   * position transformation errors).
   */
  afterChange?(change: IEditorChange, root_position: IRootPosition): void;

  /** no-unused-vars rule is hard to disable selectively */
  __unused_editor_?: T;
}

export interface IFeatureEditorIntegrationConstructor<
  T extends IVirtualEditor<IEditor>
> {
  new (options: IEditorIntegrationOptions): IFeatureEditorIntegration<T>;
}

export interface IEditorIntegrationOptions {
  feature: IFeature;
  /**
   * Provides the editor-implementation-specific methods;
   * is NOT aware of existence of cells or multiple editors
   */
  virtual_editor: IVirtualEditor<IEditor>;
  /**
   * Provides an abstraction of continuous document,
   * regardless of the actual underlying model or GUI display
   * (even if it is a notebook, it can be viewed as a continuous document).
   * Is aware of the document potentially having multiple editors (blocks),
   * but is NOT aware of the actual editor-implementation (such as CodeMirror).
   */
  virtual_document: VirtualDocument;
  /**
   * Interfaces with the relevant JupyterLab widget, such as Notebook or FileEditor.
   * Is aware of existence of cells in notebook (exposed as multiple editors),
   * but is NOT aware of editor-implementation details (such as existence of CodeMirror).
   */
  adapter: WidgetAdapter<IDocumentWidget>;
  connection: LSPConnection;
  status_message: StatusMessage;
  settings: IFeatureSettings<any>;
  trans: TranslationBundle;
}

export interface IFeatureLabIntegration {
  settings?: IFeatureSettings<any>;
}
