import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { LabIcon } from '@jupyterlab/ui-components';
import { Debouncer } from '@lumino/polling';
import type * as CodeMirror from 'codemirror';
import type * as lsProtocol from 'vscode-languageserver-protocol';

import highlightSvg from '../../style/icons/highlight.svg';
import { CodeHighlights as LSPHighlightsSettings } from '../_highlights';
import { CodeMirrorIntegration } from '../editor_integration/codemirror';
import { FeatureSettings } from '../feature';
import { DocumentHighlightKind } from '../lsp';
import { IRootPosition, IVirtualPosition } from '../positioning';
import { ILSPFeatureManager, PLUGIN_ID } from '../tokens';
import { VirtualDocument } from '../virtual/document';

export const highlightIcon = new LabIcon({
  name: 'lsp:highlight',
  svgstr: highlightSvg
});

export class HighlightsCM extends CodeMirrorIntegration {
  protected highlight_markers: CodeMirror.TextMarker[] = [];
  private debounced_get_highlight: Debouncer<
    lsProtocol.DocumentHighlight[] | undefined
  >;
  private virtual_position: IVirtualPosition;
  private sent_version: number;
  private last_token: CodeEditor.IToken | null = null;

  get settings() {
    return super.settings as FeatureSettings<LSPHighlightsSettings>;
  }

  register(): void {
    this.debounced_get_highlight = this.create_debouncer();

    this.settings.changed.connect(() => {
      this.debounced_get_highlight = this.create_debouncer();
    });
    this.editor_handlers.set('cursorActivity', this.onCursorActivity);
    this.editor_handlers.set('blur', this.onBlur);
    this.editor_handlers.set('focus', this.onCursorActivity);
    super.register();
  }

  protected onBlur = () => {
    if (this.settings.composite.removeOnBlur) {
      this.clear_markers();
      this.last_token = null;
    } else {
      this.onCursorActivity().catch(console.warn);
    }
  };

  remove(): void {
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
    items: lsProtocol.DocumentHighlight[] | undefined
  ) => {
    this.clear_markers();

    if (!items) {
      return;
    }

    for (let item of items) {
      let range = this.range_to_editor_range(item.range);
      let kind_class = item.kind
        ? 'cm-lsp-highlight-' + DocumentHighlightKind[item.kind]
        : '';
      let marker = this.highlight_range(
        range,
        'cm-lsp-highlight ' + kind_class
      );
      this.highlight_markers.push(marker);
    }
  };

  protected create_debouncer() {
    return new Debouncer<lsProtocol.DocumentHighlight[] | undefined>(
      this.on_cursor_activity,
      this.settings.composite.debouncerDelay
    );
  }

  protected on_cursor_activity = async () => {
    this.sent_version = this.virtual_document.document_info.version;
    return await this.connection.getDocumentHighlights(
      this.virtual_position,
      this.virtual_document.document_info,
      false
    );
  };

  protected onCursorActivity = async () => {
    if (!this.virtual_editor?.virtual_document?.document_info) {
      return;
    }
    let root_position: IRootPosition;

    await this.virtual_editor.virtual_document.update_manager.update_done;
    try {
      root_position = this.virtual_editor
        .getDoc()
        .getCursor('start') as IRootPosition;
    } catch (err) {
      this.console.warn('no root position available');
      return;
    }

    if (root_position == null) {
      this.console.warn('no root position available');
      return;
    }

    const token = this.virtual_editor.get_token_at(root_position);

    // if token has not changed, no need to update highlight, unless it is an empty token
    // which would indicate that the cursor is at the first character
    if (
      this.last_token &&
      token.value === this.last_token.value &&
      token.value !== ''
    ) {
      this.console.log(
        'not requesting highlights (token did not change)',
        token
      );
      return;
    }

    let document: VirtualDocument;
    try {
      document = this.virtual_editor.document_at_root_position(root_position);
    } catch (e) {
      this.console.warn(
        'Could not obtain virtual document from position',
        root_position
      );
      return;
    }
    if (document !== this.virtual_document) {
      return;
    }

    try {
      let virtual_position =
        this.virtual_editor.root_position_to_virtual_position(root_position);

      this.virtual_position = virtual_position;

      Promise.all([
        // request the highlights as soon as possible
        this.debounced_get_highlight.invoke(),
        // and in the meantime remove the old markers
        async () => {
          this.clear_markers();
          this.last_token = null;
        }
      ])
        .then(([highlights]) => {
          // in the time the response returned the document might have been closed - check that
          if (this.virtual_document.isDisposed) {
            return;
          }

          let version_after = this.virtual_document.document_info.version;

          /// if document was updated since (e.g. user pressed delete - token change, but position did not)
          if (version_after !== this.sent_version) {
            this.console.log(
              'skipping highlights response delayed by ' +
                (version_after - this.sent_version) +
                ' document versions'
            );
            return;
          }
          // if cursor position changed (e.g. user moved cursor up - position has changed, but document version did not)
          if (virtual_position !== this.virtual_position) {
            this.console.log(
              'skipping highlights response: cursor moved since it was requested'
            );
            return;
          }

          this.handleHighlight(highlights);
          this.last_token = token;
        })
        .catch(this.console.warn);
    } catch (e) {
      this.console.warn('Could not get highlights:', e);
    }
  };
}

const FEATURE_ID = PLUGIN_ID + ':highlights';

export const HIGHLIGHTS_PLUGIN: JupyterFrontEndPlugin<void> = {
  id: FEATURE_ID,
  requires: [ILSPFeatureManager, ISettingRegistry],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    featureManager: ILSPFeatureManager,
    settingRegistry: ISettingRegistry
  ) => {
    const settings = new FeatureSettings(settingRegistry, FEATURE_ID);

    featureManager.register({
      feature: {
        editorIntegrationFactory: new Map([['CodeMirrorEditor', HighlightsCM]]),
        id: FEATURE_ID,
        name: 'LSP Highlights',
        settings: settings
      }
    });
  }
};
