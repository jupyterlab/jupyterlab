import { CodeEditor } from '@jupyterlab/codeeditor';
import { CommandEntryPoint, ICommandContext } from './command_manager';
import { IVirtualEditor } from './virtual/editor';
import { VirtualDocument } from './virtual/document';
import { LSPConnection } from './connection';
import * as CodeMirror from 'codemirror';
import { IRootPosition } from './positioning';
import { StatusMessage } from './adapters/jupyterlab/jl_adapter';
import IEditor = CodeEditor.IEditor;
import { ISettingRegistry } from "@jupyterlab/settingregistry";

export interface IFeatureCommand {
  /**
   * The command id; it will be prepended with 'lsp' prefix.
   * To support multiple attachment points, multiple actual commands will be created,
   * identified by an attachment-point-specific suffix.
   */
  id: string;
  execute: (context: ICommandContext) => void;
  is_enabled: (context: ICommandContext) => boolean;
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
   * By default the command will be attached to the cell and file editor context menus.
   */
  attach_to?: Set<CommandEntryPoint>;
}

export class FeatureSettings<T> {
  protected settings: ISettingRegistry.ISettings;

  constructor(protected settingRegistry: ISettingRegistry, featureID: string) {
    if (!(featureID in settingRegistry.plugins)) {
      console.warn(`${featureID} settings schema could not be found and was not loaded`)
    } else {
      settingRegistry
        .load(featureID)
        .then(settings => {
          this.settings = settings
          settings.changed.connect(() => {
            this.settings = settings;
          })
        })
    }
  }

  get composite(): T {
    return this.settings.composite as unknown as T
  }

  set(setting: string, value: any) {
    this.settings.set(setting, value).catch(console.warn);
  }
}

export interface IFeature {
  id: string;
  /**
   * The user-readable name of the feature
   */
  name: string;
  commands?: Array<IFeatureCommand>;
  // each feature can be written in mind with mind to support one or more editors;
  // by default we target CodeMirrorEditor, but let's think about allowing others too
  // supportedEditors: typeof CodeEditor[] = [CodeMirrorEditor];
  editorIntegrationFactory: Map<
    string,
    IFeatureEditorIntegrationConstructor<IVirtualEditor<IEditor>>
  >;
  labIntegration?: IFeatureLabIntegration;
  /**
   * Settings to be passed to the FeatureEditorIntegration.
   * To use the same settings for lab integration bind the same FeatureSettings object to the labIntegration object.
   */
  settings?: FeatureSettings<any>
}

export abstract class FeatureEditorIntegration<T extends IVirtualEditor<IEditor>> {
  is_registered: boolean;
  protected virtual_editor: IVirtualEditor<T>;
  protected virtual_document: VirtualDocument;
  protected connection: LSPConnection;
  protected status_message: StatusMessage;
  feature: IFeature;

  get settings() {
    return this.feature.settings;
  }

  get lab_integration() {
    return this.feature.labIntegration
  }

  protected constructor(options: IEditorIntegrationOptions) {
    this.feature = options.feature;
    this.virtual_editor = options.virtual_editor;
    this.virtual_document = options.virtual_document;
    this.connection = options.connection;
    this.status_message = options.status_message;
  }

  /**
   * Connect event handlers to the editor, virtual document and connection(s)
   */
  abstract register(): void;

  /**
   * Will allow the user to disable specific functions
   */
  abstract isEnabled(): boolean;

  /**
   * Remove event handlers on destruction
   */
  abstract remove(): void;

  abstract afterChange(
    change: CodeMirror.EditorChange, // TODO: provide an editor-diagnostic abstraction layer for EditorChange
    root_position: IRootPosition
  ): void;
}

export interface IFeatureEditorIntegrationConstructor<T extends IVirtualEditor<IEditor>> {
  new (options: IEditorIntegrationOptions): FeatureEditorIntegration<T>;
}

export interface IEditorIntegrationOptions {
  feature: IFeature;
  virtual_editor: IVirtualEditor<IEditor>;
  virtual_document: VirtualDocument;
  connection: LSPConnection;
  status_message: StatusMessage;
  settings: FeatureSettings<any>;
}

export interface IFeatureLabIntegration {
  settings?: FeatureSettings<any>
}
