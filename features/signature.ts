import * as lsProtocol from 'vscode-languageserver-protocol';
import { IRootPosition } from '../positioning';
import { CodeMirrorIntegration } from '../editor_integration/codemirror';
import { FeatureSettings, IFeatureLabIntegration } from '../feature';
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ILSPFeatureManager, PLUGIN_ID } from '../tokens';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { EditorTooltipManager } from '../components/free_tooltip';
import { IEditorChange } from '../virtual/editor';

export class SignatureCM extends CodeMirrorIntegration {
  protected signature_character: IRootPosition;
  protected _signatureCharacters: string[];

  get lab_integration() {
    return super.lab_integration as SignatureLabIntegration;
  }

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
          this.console.warn(
            'Unknown MarkupContent kind:',
            item.documentation.kind
          );
        }
        markdown += item.documentation.value;
      }
    }
    return markdown;
  }

  private handleSignature(
    response: lsProtocol.SignatureHelp,
    position_at_request: IRootPosition
  ) {
    this.lab_integration.tooltip.remove();

    this.console.log('Signature received', response);

    if (!this.signature_character || !response || !response.signatures.length) {
      this.console.debug(
        'Ignoring signature response: cursor lost or response empty'
      );
      return;
    }

    let root_position = position_at_request;

    // if the cursor advanced in the same line, the previously retrieved signature may still be useful
    // if the line changed or cursor moved backwards then no reason to keep the suggestions
    if (
      position_at_request.line != root_position.line ||
      root_position.ch < position_at_request.ch
    ) {
      this.console.debug(
        'Ignoring signature response: cursor has receded or changed line'
      );
    }

    let cm_editor = this.get_cm_editor(root_position);
    if (!cm_editor.hasFocus()) {
      this.console.debug(
        'Ignoring signature response: the corresponding editor lost focus'
      );
      return;
    }
    let editor_position = this.virtual_editor.root_position_to_editor(
      root_position
    );
    let language = this.get_language_at(editor_position, cm_editor);
    let markup = this.get_markup_for_signature_help(response, language);

    this.console.log(
      'Signature will be shown',
      language,
      markup,
      root_position
    );

    this.lab_integration.tooltip.create({
      markup,
      position: editor_position,
      ce_editor: this.virtual_editor.find_ce_editor(cm_editor),
      adapter: this.adapter,
      className: 'lsp-signature-help'
    });
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

    this.console.log('Signature will be requested for', virtual_position);

    this.connection
      .getSignatureHelp(
        virtual_position,
        this.virtual_document.document_info,
        false
      )
      .then(help => this.handleSignature(help, root_position))
      .catch(this.console.warn);
  }
}

class SignatureLabIntegration implements IFeatureLabIntegration {
  tooltip: EditorTooltipManager;
  settings: FeatureSettings<any>;

  constructor(
    app: JupyterFrontEnd,
    settings: FeatureSettings<any>,
    renderMimeRegistry: IRenderMimeRegistry
  ) {
    this.tooltip = new EditorTooltipManager(renderMimeRegistry);
  }
}

const FEATURE_ID = PLUGIN_ID + ':signature';

export const SIGNATURE_PLUGIN: JupyterFrontEndPlugin<void> = {
  id: FEATURE_ID,
  requires: [ILSPFeatureManager, ISettingRegistry, IRenderMimeRegistry],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    featureManager: ILSPFeatureManager,
    settingRegistry: ISettingRegistry,
    renderMimeRegistry: IRenderMimeRegistry
  ) => {
    const settings = new FeatureSettings(settingRegistry, FEATURE_ID);
    const labIntegration = new SignatureLabIntegration(
      app,
      settings,
      renderMimeRegistry
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
