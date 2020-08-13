import { CodeEditor } from '@jupyterlab/codeeditor';
import { CommandEntryPoint, ICommandContext } from "./command_manager";
import { IVirtualEditor, VirtualCodeMirrorEditor } from "./virtual/editor";
import { VirtualDocument } from "./virtual/document";
import { LSPConnection } from "./connection";
import * as CodeMirror from "codemirror";
import { IRootPosition } from "./positioning";
import { StatusMessage } from "./adapters/jupyterlab/jl_adapter";
import IEditor = CodeEditor.IEditor;


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
    editorIntegrationFactory: Map<string, FeatureEditorIntegrationConstructor<IEditor>>;
    labIntegration?: IFeatureLabIntegration;
    // note: settings could be one-per plugin rather than centrally managed by LSP (as proposed here);
    // the per-plugin settings may be nicer for the user, and would keep the schema near the plugin
    // but then combining per-language settings etc would be a pain
    // register(settings: Saettings): void;
}


export abstract class FeatureEditorIntegration<T extends IEditor> {
    is_registered: boolean;
    protected virtual_editor: IVirtualEditor<T>;
    protected virtual_document: VirtualDocument;
    protected connection: LSPConnection;
    feature: IFeature;

    protected constructor(options: IEditorIntegrationOptions) {
        this.feature = options.feature;
        this.virtual_editor = options.virtual_editor
        this.virtual_document = options.virtual_document
        this.connection = options.connection;
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

export interface FeatureEditorIntegrationConstructor<T extends IEditor> {
    new (options: IEditorIntegrationOptions): FeatureEditorIntegration<T>
}

export interface IEditorIntegrationOptions {
    feature: IFeature,
    virtual_editor: VirtualCodeMirrorEditor,
    virtual_document: VirtualDocument,
    connection: LSPConnection,
    status_message: StatusMessage,
    // settings: IFeatureSettings
}

export interface IFeatureLabIntegration {

}

