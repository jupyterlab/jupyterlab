import * as CodeMirror from 'codemirror';
import * as lsProtocol from 'vscode-languageserver-protocol';
import { documentHighlightKindNames } from '../lsp';
import { VirtualDocument } from '../virtual/document';
import { IRootPosition } from '../positioning';
import { uris_equal } from '../utils';
import { FeatureSettings, IFeatureCommand } from '../feature';
import { CodeMirrorIntegration } from '../editor_integration/codemirror';
import { JupyterFrontEnd, JupyterFrontEndPlugin } from "@jupyterlab/application";
import { ILSPFeatureManager, PLUGIN_ID } from "../tokens";
import { ISettingRegistry } from "@jupyterlab/settingregistry";


const COMMANDS: IFeatureCommand[] = [
  {
    id: 'highlight-references',
    execute: ({ connection, virtual_position, document }) =>
      connection.getReferences(virtual_position, document.document_info),
    is_enabled: ({ connection }) => connection.isReferencesSupported(),
    label: 'Highlight references'
  },
  {
    id: 'highlight-type-definition',
    execute: ({ connection, virtual_position, document }) =>
      connection.getTypeDefinition(virtual_position, document.document_info),
    is_enabled: ({ connection }) => connection.isTypeDefinitionSupported(),
    label: 'Highlight type definition'
  }
];


export class HighlightsCM extends CodeMirrorIntegration {
  protected highlight_markers: CodeMirror.TextMarker[] = [];

  register(): void {
    this.editor_handlers.set('cursorActivity', this.onCursorActivity);
    super.register();
  }

  remove(): void {
    this.handleHighlight = null;
    this.onCursorActivity = null;
    this.clear_markers();
    super.remove();
  }

  protected clear_markers() {
    for (let marker of this.highlight_markers) {
      marker.clear();
    }
    this.highlight_markers = [];
  }

  protected handleHighlight = (
    items: lsProtocol.DocumentHighlight[],
    documentUri: string
  ) => {
    if (!uris_equal(documentUri, this.virtual_document.document_info.uri)) {
      return;
    }
    this.clear_markers();

    if (!items) {
      return;
    }

    for (let item of items) {
      let range = this.range_to_editor_range(item.range);
      let kind_class = item.kind
        ? 'cm-lsp-highlight-' + documentHighlightKindNames[item.kind]
        : '';
      let marker = this.highlight_range(
        range,
        'cm-lsp-highlight ' + kind_class
      );
      this.highlight_markers.push(marker);
    }
  };

  protected onCursorActivity = async () => {
    if (!this.virtual_editor?.virtual_document?.document_info) {
      return;
    }
    let root_position: IRootPosition;

    try {
      root_position = this.virtual_editor
        .getDoc()
        .getCursor('start') as IRootPosition;
    } catch (err) {
      console.warn('LSP: no root position available');
      return;
    }

    let document: VirtualDocument;
    try {
      document = this.virtual_editor.document_at_root_position(root_position);
    } catch (e) {
      console.warn(
        'LSP: Could not obtain virtual document from position',
        root_position
      );
      return;
    }
    if (document !== this.virtual_document) {
      return;
    }
    try {
      let virtual_position = this.virtual_editor.root_position_to_virtual_position(
        root_position
      );
      const highlights = await this.connection.getDocumentHighlights(
        virtual_position,
        this.virtual_document.document_info,
        false
      );
      if (!this.virtual_document.isDisposed) {
        this.handleHighlight(
          highlights,
          this.virtual_document.document_info.uri
        );
      }
    } catch (e) {
      console.warn('Could not get highlights:', e);
    }
  };
}

const FEATURE_ID = PLUGIN_ID + ':highlights';

export const HIGHLIGHTS_PLUGIN: JupyterFrontEndPlugin<void> = {
  id: FEATURE_ID,
  requires: [
    ILSPFeatureManager,
    ISettingRegistry,
  ],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    featureManager: ILSPFeatureManager,
    settingRegistry: ISettingRegistry,
  ) => {
    const settings = new FeatureSettings(settingRegistry, FEATURE_ID)

    featureManager.register({
      feature: {
        editorIntegrationFactory: new Map([
          ['CodeMirrorEditor', HighlightsCM]
        ]),
        id: FEATURE_ID,
        name: 'LSP Highlights',
        settings: settings,
        commands: COMMANDS
      }
    });
  }
};
