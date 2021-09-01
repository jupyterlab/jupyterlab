import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ICodeMirror } from '@jupyterlab/codemirror';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import * as lsProtocol from 'vscode-languageserver-protocol';

import { SignatureHelp as LSPSignatureSettings } from '../_signature';
import { EditorTooltipManager } from '../components/free_tooltip';
import { CodeMirrorIntegration } from '../editor_integration/codemirror';
import { FeatureSettings, IFeatureLabIntegration } from '../feature';
import { IEditorPosition, IRootPosition } from '../positioning';
import { ILSPFeatureManager, PLUGIN_ID } from '../tokens';
import { escapeMarkdown } from '../utils';
import { CodeMirrorVirtualEditor } from '../virtual/codemirror_editor';
import { IEditorChange } from '../virtual/editor';

const TOOLTIP_ID = 'signature';
const CLASS_NAME = 'lsp-signature-help';

function getMarkdown(item: string | lsProtocol.MarkupContent) {
  if (typeof item === 'string') {
    return escapeMarkdown(item);
  } else {
    if (item.kind === 'markdown') {
      return item.value;
    } else {
      return escapeMarkdown(item.value);
    }
  }
}

export class SignatureCM extends CodeMirrorIntegration {
  protected signature_character: IRootPosition;
  protected _signatureCharacters: string[];

  get settings() {
    return super.settings as FeatureSettings<LSPSignatureSettings>;
  }

  get _closeCharacters(): string[] {
    if (!this.settings) {
      return [];
    }
    return this.settings.composite.closeCharacters;
  }

  register(): void {
    this.editor_handlers.set(
      'cursorActivity',
      this.onCursorActivity.bind(this)
    );
    this.editor_handlers.set('blur', this.onBlur.bind(this));
    this.editor_handlers.set('focus', this.onCursorActivity.bind(this));
    super.register();
  }

  onBlur(virtualEditor: CodeMirrorVirtualEditor, event: FocusEvent) {
    if (
      this.isSignatureShown() &&
      (event.target as Element).closest('.' + CLASS_NAME) !== null
    ) {
      this._hideTooltip();
    }
  }

  onCursorActivity() {
    if (!this.isSignatureShown()) {
      return;
    }
    const newRootPosition = this.virtual_editor.get_cursor_position();
    const previousPosition = this.lab_integration.tooltip.position;
    let newEditorPosition = this.virtual_editor.root_position_to_editor(
      newRootPosition
    );
    // hide tooltip if exceeded position
    if (
      newEditorPosition.line === previousPosition.line &&
      newEditorPosition.ch < previousPosition.ch
    ) {
      this._hideTooltip();
    } else {
      // otherwise, update the signature as the active parameter could have changed,
      // or the server may want us to close the tooltip
      this.requestSignature(newRootPosition, previousPosition).catch(
        this.console.warn
      );
    }
  }

  get lab_integration() {
    return super.lab_integration as SignatureLabIntegration;
  }

  protected get_markup_for_signature_help(
    response: lsProtocol.SignatureHelp,
    language: string
  ): lsProtocol.MarkupContent {
    let signatures = new Array<string>();

    if (response.activeSignature != null) {
      if (response.activeSignature >= response.signatures.length) {
        this.console.error(
          'LSP server returned wrong number for activeSignature for: ',
          response
        );
      } else {
        const item = response.signatures[response.activeSignature];
        return {
          kind: 'markdown',
          value: this.markdown_from_signature(
            item,
            language,
            response.activeParameter
          )
        };
      }
    }

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
    language: string,
    activeParameterFallback?: number | null
  ): string {
    const activeParameter: number | null =
      typeof item.activeParameter !== 'undefined'
        ? item.activeParameter
        : activeParameterFallback;
    let markdown: string;
    let label = item.label;
    if (item.parameters && activeParameter != null) {
      if (activeParameter > item.parameters.length) {
        this.console.error(
          'LSP server returned wrong number for activeSignature for: ',
          item
        );
        markdown = '```' + language + '\n' + label + '\n```';
      } else {
        const parameter = item.parameters[activeParameter];
        let substring: string =
          typeof parameter.label === 'string'
            ? parameter.label
            : label.slice(parameter.label[0], parameter.label[1]);
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        pre.appendChild(code);
        code.className = `cm-s-jupyter language-${language}`;
        this.lab_integration.codeMirror.CodeMirror.runMode(
          label,
          language,
          (token: string, className: string) => {
            let element: HTMLElement | Node;
            if (className) {
              element = document.createElement('span');
              (element as HTMLElement).classList.add('cm-' + className);
              element.textContent = token;
            } else {
              element = document.createTextNode(token);
            }
            if (className === 'variable' && token === substring) {
              const mark = document.createElement('mark');
              mark.appendChild(element);
              element = mark;
            }
            code.appendChild(element);
          }
        );
        markdown = pre.outerHTML + '\n\n';
      }
    } else {
      markdown = '```' + language + '\n' + label + '\n```';
    }
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
    } else if (item.parameters) {
      markdown +=
        '\n\n' +
        item.parameters
          .filter(parameter => parameter.documentation)
          .map(parameter => '- ' + getMarkdown(parameter.documentation))
          .join('\n');
    }
    return markdown;
  }

  private _hideTooltip() {
    this.lab_integration.tooltip.remove();
  }

  private handleSignature(
    response: lsProtocol.SignatureHelp,
    position_at_request: IRootPosition,
    display_position: IEditorPosition | null = null
  ) {
    this.console.log('Signature received', response);
    if (response || response === null) {
      // do not hide on undefined as it simply indicates that no new info is available
      // (null means close, response means update)
      this._hideTooltip();
    }

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
      root_position,
      response
    );

    this.lab_integration.tooltip.create({
      markup,
      position: display_position === null ? editor_position : display_position,
      id: TOOLTIP_ID,
      ce_editor: this.virtual_editor.find_ce_editor(cm_editor),
      adapter: this.adapter,
      className: CLASS_NAME,
      tooltip: {
        privilege: 'forceAbove',
        alignment: 'start',
        hideOnKeyPress: false
      }
    });
  }

  get signatureCharacters() {
    if (!this._signatureCharacters?.length) {
      this._signatureCharacters = this.connection.getLanguageSignatureCharacters();
    }
    return this._signatureCharacters;
  }

  protected isSignatureShown() {
    return this.lab_integration.tooltip.isShown(TOOLTIP_ID);
  }

  afterChange(change: IEditorChange, root_position: IRootPosition) {
    let last_character = this.extract_last_character(change);

    const isSignatureShown = this.isSignatureShown();
    let previousPosition: IEditorPosition | null = null;

    if (isSignatureShown) {
      previousPosition = this.lab_integration.tooltip.position;
      if (this._closeCharacters.includes(last_character)) {
        // remove just in case but do not short-circuit in case if we need to re-trigger
        this._hideTooltip();
      }
    }

    // only proceed if: trigger character was used or the signature is/was visible immediately before
    if (
      !(this.signatureCharacters.includes(last_character) || isSignatureShown)
    ) {
      return;
    }

    this.requestSignature(root_position, previousPosition).catch(
      this.console.warn
    );
  }

  private requestSignature(
    root_position: IRootPosition,
    previousPosition: IEditorPosition | null
  ) {
    this.signature_character = root_position;

    let virtual_position = this.virtual_editor.root_position_to_virtual_position(
      root_position
    );

    this.console.log('Signature will be requested for', virtual_position);

    return this.connection
      .getSignatureHelp(
        virtual_position,
        this.virtual_document.document_info,
        false
      )
      .then(help =>
        this.handleSignature(help, root_position, previousPosition)
      );
  }
}

class SignatureLabIntegration implements IFeatureLabIntegration {
  tooltip: EditorTooltipManager;
  settings: FeatureSettings<LSPSignatureSettings>;

  constructor(
    app: JupyterFrontEnd,
    settings: FeatureSettings<LSPSignatureSettings>,
    renderMimeRegistry: IRenderMimeRegistry,
    public codeMirror: ICodeMirror
  ) {
    this.tooltip = new EditorTooltipManager(renderMimeRegistry);
  }
}

const FEATURE_ID = PLUGIN_ID + ':signature';

export const SIGNATURE_PLUGIN: JupyterFrontEndPlugin<void> = {
  id: FEATURE_ID,
  requires: [
    ILSPFeatureManager,
    ISettingRegistry,
    IRenderMimeRegistry,
    ICodeMirror
  ],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    featureManager: ILSPFeatureManager,
    settingRegistry: ISettingRegistry,
    renderMimeRegistry: IRenderMimeRegistry,
    codeMirror: ICodeMirror
  ) => {
    const settings = new FeatureSettings(settingRegistry, FEATURE_ID);
    const labIntegration = new SignatureLabIntegration(
      app,
      settings,
      renderMimeRegistry,
      codeMirror
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
