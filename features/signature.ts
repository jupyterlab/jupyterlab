import * as lsProtocol from 'vscode-languageserver-protocol';
import { IRootPosition } from '../positioning';
import { CodeMirrorIntegration } from '../editor_integration/codemirror';
import { FeatureSettings, IFeatureLabIntegration } from '../feature';
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ILSPAdapterManager, ILSPFeatureManager, PLUGIN_ID } from '../tokens';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { EditorTooltipManager } from '../components/free_tooltip';
import { IEditorChange } from '../virtual/editor';

export class SignatureCM extends CodeMirrorIntegration {
  protected signature_character: IRootPosition;
  protected _signatureCharacters: string[];
  lab_integration: SignatureLabIntegration;

  protected get_markup_for_signature_help(
    response: lsProtocol.SignatureHelp,
    language: string
  ): lsProtocol.MarkupContent {
    let signatures = new Array<string>();

    response.signatures.forEach(item => {
      let markdown = this.markdown_from_signature(item, language);
      signatures.push(markdown);
    });

    return {
      kind: 'markdown',
      value: signatures.join('\n\n')
    };
  }

  /**
   * A temporary workaround for the LSP servers returning plain text (e.g. docstrings)
   * (providing not-the-best UX) instead of markdown and me being unable to force
   * them to return markdown instead.
   */
  private markdown_from_signature(
    item: lsProtocol.SignatureInformation,
    language: string
  ): string {
    let markdown = '```' + language + '\n' + item.label + '\n```';
    if (item.documentation) {
      markdown += '\n';
      if (
        typeof item.documentation === 'string' ||
        item.documentation.kind === 'plaintext'
      ) {
        let in_text_block = false;
        // TODO: make use of the MarkupContent object instead
        for (let line of item.documentation.toString().split('\n')) {
          if (line.trim() === item.label.trim()) {
            continue;
          }

          if (line.startsWith('>>>')) {
            if (in_text_block) {
              markdown += '```\n\n';
              in_text_block = false;
            }
            line = '```' + language + '\n' + line.substr(3) + '\n```';
          } else {
            // start new text block
            if (!in_text_block) {
              markdown += '```\n';
              in_text_block = true;
            }
          }
          markdown += line + '\n';
        }
        // close off the text block - if any
        if (in_text_block) {
          markdown += '```';
        }
      } else {
        if (item.documentation.kind !== 'markdown') {
          this.virtual_editor.console.warn(
            'Unknown MarkupContent kind:',
            item.documentation.kind
          );
        }
        markdown += item.documentation.value;
      }
    }
    return markdown;
  }

  private handleSignature(response: lsProtocol.SignatureHelp) {
    this.lab_integration.tooltip.remove();

    this.virtual_editor.console.log('Signature received', response);
    if (!this.signature_character || !response || !response.signatures.length) {
      return;
    }

    let root_position = this.signature_character;
    let cm_editor = this.get_cm_editor(root_position);
    let editor_position = this.virtual_editor.root_position_to_editor(
      root_position
    );
    let language = this.get_language_at(editor_position, cm_editor);
    let markup = this.get_markup_for_signature_help(response, language);

    this.virtual_editor.console.log(
      'Signature will be shown',
      language,
      markup,
      root_position
    );

    let tooltip = this.lab_integration.tooltip.create({
      markup,
      position: editor_position,
      ce_editor: this.virtual_editor.find_ce_editor(cm_editor)
    });
    tooltip.addClass('lsp-signature-help');
  }

  get signatureCharacters() {
    if (!this._signatureCharacters?.length) {
      this._signatureCharacters = this.connection.getLanguageSignatureCharacters();
    }
    return this._signatureCharacters;
  }

  afterChange(change: IEditorChange, root_position: IRootPosition) {
    let last_character = this.extract_last_character(change);

    if (this.signatureCharacters.indexOf(last_character) === -1) {
      return;
    }

    this.signature_character = root_position;

    let virtual_position = this.virtual_editor.root_position_to_virtual_position(
      root_position
    );

    this.virtual_editor.console.log(
      'Signature will be requested for',
      virtual_position
    );

    this.connection
      .getSignatureHelp(
        virtual_position,
        this.virtual_document.document_info,
        false
      )
      .then(help => this.handleSignature(help))
      .catch(console.warn);
  }
}

class SignatureLabIntegration implements IFeatureLabIntegration {
  tooltip: EditorTooltipManager;
  settings: FeatureSettings<any>;

  constructor(
    app: JupyterFrontEnd,
    settings: FeatureSettings<any>,
    renderMimeRegistry: IRenderMimeRegistry,
    adapterManager: ILSPAdapterManager
  ) {
    this.tooltip = new EditorTooltipManager(renderMimeRegistry, adapterManager);
  }
}

const FEATURE_ID = PLUGIN_ID + ':signature';

export const SIGNATURE_PLUGIN: JupyterFrontEndPlugin<void> = {
  id: FEATURE_ID,
  requires: [
    ILSPFeatureManager,
    ISettingRegistry,
    IRenderMimeRegistry,
    ILSPAdapterManager
  ],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    featureManager: ILSPFeatureManager,
    settingRegistry: ISettingRegistry,
    renderMimeRegistry: IRenderMimeRegistry,
    adapterManager: ILSPAdapterManager
  ) => {
    const settings = new FeatureSettings(settingRegistry, FEATURE_ID);
    const labIntegration = new SignatureLabIntegration(
      app,
      settings,
      renderMimeRegistry,
      adapterManager
    );

    featureManager.register({
      feature: {
        editorIntegrationFactory: new Map([['CodeMirrorEditor', SignatureCM]]),
        id: FEATURE_ID,
        name: 'LSP Function signature',
        labIntegration: labIntegration,
        settings: settings
      }
    });
  }
};
