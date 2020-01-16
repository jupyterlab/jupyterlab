import * as CodeMirror from 'codemirror';
import * as lsProtocol from 'vscode-languageserver-protocol';
import { documentHighlightKindNames } from '../../../lsp';
import { VirtualDocument } from '../../../virtual/document';
import { IRootPosition } from '../../../positioning';
import { CodeMirrorLSPFeature, IFeatureCommand } from '../feature';

export class Highlights extends CodeMirrorLSPFeature {
  name = 'Highlights';
  protected highlight_markers: CodeMirror.TextMarker[] = [];

  static commands: Array<IFeatureCommand> = [
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

  register(): void {
    this.connection_handlers.set('highlight', this.handleHighlight.bind(this));
    this.editor_handlers.set(
      'cursorActivity',
      this.onCursorActivity.bind(this)
    );
    super.register();
  }

  remove(): void {
    super.remove();
    this.clear_markers();
  }

  protected clear_markers() {
    for (let marker of this.highlight_markers) {
      marker.clear();
    }
    this.highlight_markers = [];
  }

  protected handleHighlight(
    items: lsProtocol.DocumentHighlight[],
    documentUri: string
  ) {
    if (documentUri !== this.virtual_document.document_info.uri) {
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
  }

  protected onCursorActivity() {
    let root_position = this.virtual_editor
      .getDoc()
      .getCursor('start') as IRootPosition;
    let document: VirtualDocument;
    try {
      document = this.virtual_editor.document_at_root_position(root_position);
    } catch (e) {
      console.warn(
        'Could not obtain virtual document from position',
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
      this.connection.getDocumentHighlights(
        virtual_position,
        this.virtual_document.document_info
      );
    } catch (e) {
      console.warn('Could not get highlights:', e);
    }
  }
}
