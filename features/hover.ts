import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { LabIcon } from '@jupyterlab/ui-components';
import { Throttler } from '@lumino/polling';
import type * as CodeMirror from 'codemirror';
import type * as lsProtocol from 'vscode-languageserver-protocol';

import hoverSvg from '../../style/icons/hover.svg';
import { CodeHover as LSPHoverSettings, ModifierKey } from '../_hover';
import { EditorTooltipManager, FreeTooltip } from '../components/free_tooltip';
import { PositionConverter } from '../converter';
import {
  CodeMirrorIntegration,
  IEditorRange
} from '../editor_integration/codemirror';
import {
  FeatureSettings,
  IEditorIntegrationOptions,
  IFeatureLabIntegration
} from '../feature';
import { IRootPosition, IVirtualPosition, is_equal } from '../positioning';
import { ILSPFeatureManager, PLUGIN_ID } from '../tokens';
import { getModifierState } from '../utils';
import { VirtualDocument } from '../virtual/document';
import { IEditorChange } from '../virtual/editor';

export const hoverIcon = new LabIcon({
  name: 'lsp:hover',
  svgstr: hoverSvg
});

interface IResponseData {
  response: lsProtocol.Hover;
  document: VirtualDocument;
  editor_range: IEditorRange;
  ce_editor: CodeEditor.IEditor;
}

/**
 * Check whether mouse is close to given element (within a specified number of pixels)
 * @param what target element
 * @param who mouse event determining position and target
 * @param cushion number of pixels on each side defining "closeness" boundary
 */
function isCloseTo(what: HTMLElement, who: MouseEvent, cushion = 50): boolean {
  const target = who.type === 'mouseleave' ? who.relatedTarget : who.target;

  if (what === target || what.contains(target as HTMLElement)) {
    return true;
  }
  const whatRect = what.getBoundingClientRect();
  return !(
    who.x < whatRect.left - cushion ||
    who.x > whatRect.right + cushion ||
    who.y < whatRect.top - cushion ||
    who.y > whatRect.bottom + cushion
  );
}

class ResponseCache {
  protected _data: Array<IResponseData>;
  get data() {
    return this._data;
  }

  constructor(public maxSize: number) {
    this._data = [];
  }

  store(item: IResponseData) {
    const previousIndex = this._data.findIndex(
      previous =>
        previous.document === item.document &&
        is_equal(previous.editor_range.start, item.editor_range.start) &&
        is_equal(previous.editor_range.end, item.editor_range.end) &&
        previous.editor_range.editor === item.editor_range.editor
    );
    if (previousIndex !== -1) {
      this._data[previousIndex] = item;
      return;
    }

    if (this._data.length >= this.maxSize) {
      this._data.shift();
    }
    this._data.push(item);
  }

  clean() {
    this._data = [];
  }
}

function to_markup(
  content: string | lsProtocol.MarkedString
): lsProtocol.MarkupContent {
  if (typeof content === 'string') {
    // coerce deprecated MarkedString to an MarkupContent; if given as a string it is markdown too,
    // quote: "It is either a markdown string or a code-block that provides a language and a code snippet."
    // (https://microsoft.github.io/language-server-protocol/specifications/specification-3-17/#markedString)
    return {
      kind: 'markdown',
      value: content
    };
  } else {
    return {
      kind: 'markdown',
      value: '```' + content.language + '\n' + content.value + '\n```'
    };
  }
}

export class HoverCM extends CodeMirrorIntegration {
  protected last_hover_character: IRootPosition;
  private last_hover_response: lsProtocol.Hover;
  protected hover_marker: CodeMirror.TextMarker;
  private virtual_position: IVirtualPosition;
  protected cache: ResponseCache;

  private debounced_get_hover: Throttler<Promise<lsProtocol.Hover>>;
  private tooltip: FreeTooltip;
  private _previousHoverRequest: Promise<Promise<lsProtocol.Hover>> | null;

  constructor(options: IEditorIntegrationOptions) {
    super(options);
    this._previousHoverRequest = null;
  }

  protected get modifierKey(): ModifierKey {
    return this.settings.composite.modifierKey;
  }

  get lab_integration() {
    return super.lab_integration as HoverLabIntegration;
  }

  get settings() {
    return super.settings as FeatureSettings<LSPHoverSettings>;
  }

  protected restore_from_cache(
    document: VirtualDocument,
    virtual_position: IVirtualPosition
  ): IResponseData | null {
    const { line, ch } = virtual_position;
    const matching_items = this.cache.data.filter(cache_item => {
      if (cache_item.document !== document) {
        return false;
      }
      let range = cache_item.response.range;
      return (
        line >= range.start.line &&
        line <= range.end.line &&
        // need to be non-overlapping see https://github.com/jupyter-lsp/jupyterlab-lsp/issues/628
        (line != range.start.line || ch > range.start.character) &&
        (line != range.end.line || ch <= range.end.character)
      );
    });
    if (matching_items.length > 1) {
      this.console.warn(
        'Potential hover cache malfunction: ',
        virtual_position,
        matching_items
      );
    }
    return matching_items.length != 0 ? matching_items[0] : null;
  }

  register(): void {
    this.cache = new ResponseCache(this.settings.composite.cacheSize);

    this.wrapper_handlers.set('mousemove', event => {
      // as CodeMirror.Editor does not support mouseleave nor mousemove,
      // we simulate the mouseleave for the editor in wrapper's mousemove;
      // this is used to hide the tooltip on leaving cells in notebook
      this.updateUnderlineAndTooltip(event)
        .then(keep_tooltip => {
          if (!keep_tooltip) {
            this.maybeHideTooltip(event);
          }
        })
        .catch(this.console.warn);
    });
    this.wrapper_handlers.set('mouseleave', this.onMouseLeave);

    // show hover after pressing the modifier key
    // TODO: when the editor (notebook or file editor) is not focused, the keydown event is not getting to us
    //  (probably getting captured by lab); this gives subpar experience when using hover in two editors open
    //  side-by-side, BUT this does not happen for mousemove which properly reads keyModifier from the event
    //  (so this is no too bad as most of the time the user will get the desired outcome - they just need to
    //  budge the mice when holding ctrl if looking at a document which is not active).
    // whether the editor is focused
    this.wrapper_handlers.set('keydown', this.onKeyDown);
    // or just the wrapper (e.g. the notebook but no cell active)
    this.editor_handlers.set('keydown', (instance, event: KeyboardEvent) =>
      this.onKeyDown(event)
    );

    this.debounced_get_hover = this.create_throttler();

    this.settings.changed.connect(() => {
      this.cache.maxSize = this.settings.composite.cacheSize;
      this.debounced_get_hover = this.create_throttler();
    });
    super.register();
  }

  protected onKeyDown = (event: KeyboardEvent) => {
    if (
      getModifierState(event, this.modifierKey) &&
      typeof this.last_hover_character !== 'undefined'
    ) {
      // does not need to be shown if it is already visible (otherwise we would be creating an identical tooltip again!)
      if (this.tooltip && this.tooltip.isVisible && !this.tooltip.isDisposed) {
        return;
      }
      const document = this.virtual_editor.document_at_root_position(
        this.last_hover_character
      );
      let response_data = this.restore_from_cache(
        document,
        this.virtual_position
      );
      if (response_data == null) {
        return;
      }
      event.stopPropagation();
      this.handleResponse(response_data, this.last_hover_character, true);
    }
  };

  protected onMouseLeave = (event: MouseEvent) => {
    this.remove_range_highlight();
    this.maybeHideTooltip(event);
  };

  protected maybeHideTooltip(mouseEvent: MouseEvent) {
    if (
      typeof this.tooltip !== 'undefined' &&
      !isCloseTo(this.tooltip.node, mouseEvent)
    ) {
      this.tooltip.dispose();
    }
  }

  protected create_throttler() {
    return new Throttler<Promise<lsProtocol.Hover>>(this.on_hover, {
      limit: this.settings.composite.throttlerDelay,
      edge: 'trailing'
    });
  }

  afterChange(change: IEditorChange, root_position: IRootPosition) {
    super.afterChange(change, root_position);
    // reset cache on any change in the document
    this.cache.clean();
    this.last_hover_character = undefined;
    this.remove_range_highlight();
  }

  protected on_hover = async () => {
    if (
      !(
        this.connection.isReady &&
        this.connection.serverCapabilities?.hoverProvider
      )
    ) {
      return;
    }
    let position = this.virtual_position;
    return await this.connection.clientRequests['textDocument/hover'].request({
      textDocument: {
        // this might be wrong - should not it be using the specific virtual document?
        uri: this.virtual_document.document_info.uri
      },
      position: {
        line: position.line,
        character: position.ch
      }
    });
  };

  protected static get_markup_for_hover(
    response: lsProtocol.Hover
  ): lsProtocol.MarkupContent {
    let contents = response.contents;

    if (typeof contents === 'string') {
      contents = [contents as lsProtocol.MarkedString];
    }

    if (!Array.isArray(contents)) {
      return contents as lsProtocol.MarkupContent;
    }

    let markups = contents.map(to_markup);
    if (markups.every(markup => markup.kind == 'plaintext')) {
      return {
        kind: 'plaintext',
        value: markups.map(markup => markup.value).join('\n')
      };
    } else {
      return {
        kind: 'markdown',
        value: markups.map(markup => markup.value).join('\n\n')
      };
    }
  }

  /**
   * Underlines the word if a tooltip is available.
   * Displays tooltip if asked to do so.
   *
   * Returns true is the tooltip was shown.
   */
  public handleResponse = (
    response_data: IResponseData,
    root_position: IRootPosition,
    show_tooltip: boolean
  ): boolean => {
    let response = response_data.response;

    // testing for object equality because the response will likely be reused from cache
    if (this.last_hover_response != response) {
      this.remove_range_highlight();
      this.hover_marker = this.highlight_range(
        response_data.editor_range,
        'cm-lsp-hover-available'
      );
    }

    this.last_hover_response = response;

    if (show_tooltip) {
      this.lab_integration.tooltip.remove();
      const markup = HoverCM.get_markup_for_hover(response);
      let editor_position =
        this.virtual_editor.root_position_to_editor(root_position);

      this.tooltip = this.lab_integration.tooltip.create({
        markup,
        position: editor_position,
        ce_editor: response_data.ce_editor,
        adapter: this.adapter,
        className: 'lsp-hover'
      });
      return true;
    }
    return false;
  };

  protected is_token_empty(token: CodeMirror.Token) {
    return token.string.length === 0;
    // TODO  || token.type.length === 0? (sometimes the underline is shown on meaningless tokens)
  }

  protected is_event_inside_visible(event: MouseEvent) {
    let target = event.target as HTMLElement;
    return target.closest('.CodeMirror-sizer') != null;
  }

  protected is_useful_response(response: lsProtocol.Hover) {
    return (
      response &&
      response.contents &&
      !(Array.isArray(response.contents) && response.contents.length === 0)
    );
  }

  /**
   * Returns true if the tooltip should stay.
   */
  protected async _updateUnderlineAndTooltip(
    event: MouseEvent
  ): Promise<boolean> {
    const target = event.target as HTMLElement;

    // if over an empty space in a line (and not over a token) then not worth checking
    if (target.classList.contains('CodeMirror-line')) {
      this.remove_range_highlight();
      return;
    }

    const show_tooltip = getModifierState(event, this.modifierKey);

    // currently the events are coming from notebook panel; ideally these would be connected to individual cells,
    // (only cells with code) instead, but this is more complex to implement right. In any case filtering
    // is needed to determine in hovered character belongs to this virtual document

    let root_position = this.position_from_mouse(event);

    // happens because mousemove is attached to panel, not individual code cells,
    // and because some regions of the editor (between lines) have no characters
    if (root_position == null) {
      this.remove_range_highlight();
      return;
    }

    let token = this.virtual_editor.getTokenAt(root_position);

    let document = this.virtual_editor.document_at_root_position(root_position);

    if (
      this.is_token_empty(token) ||
      document !== this.virtual_document ||
      !this.is_event_inside_visible(event)
    ) {
      this.remove_range_highlight();
      return;
    }

    if (!is_equal(root_position, this.last_hover_character)) {
      let virtual_position =
        this.virtual_editor.root_position_to_virtual_position(root_position);
      this.virtual_position = virtual_position;
      this.last_hover_character = root_position;

      // if we already sent a request, maybe it already covers the are of interest?
      // not harm waiting as the server won't be able to help us anyways
      if (this._previousHoverRequest) {
        await Promise.race([
          this._previousHoverRequest,
          // just in case if the request stalled, set a timeout so we do not
          // get stuck indefinitely
          new Promise(resolve => {
            return setTimeout(resolve, 1000);
          })
        ]);
      }
      let response_data = this.restore_from_cache(document, virtual_position);

      if (response_data == null) {
        const promise = this.debounced_get_hover.invoke();
        this._previousHoverRequest = promise;
        let response = await promise;
        if (this._previousHoverRequest === promise) {
          this._previousHoverRequest = null;
        }
        if (this.is_useful_response(response)) {
          let ce_editor =
            this.virtual_editor.get_editor_at_root_position(root_position);
          let cm_editor =
            this.virtual_editor.ce_editor_to_cm_editor.get(ce_editor);

          let editor_range = this.get_editor_range(
            response,
            root_position,
            token,
            cm_editor
          );

          response_data = {
            response: this.add_range_if_needed(
              response,
              editor_range,
              ce_editor
            ),
            document: document,
            editor_range: editor_range,
            ce_editor: ce_editor
          };

          this.cache.store(response_data);
        } else {
          this.remove_range_highlight();
          return;
        }
      }

      return this.handleResponse(response_data, root_position, show_tooltip);
    } else {
      return true;
    }
  }

  protected updateUnderlineAndTooltip = (event: MouseEvent) => {
    try {
      return this._updateUnderlineAndTooltip(event);
    } catch (e) {
      if (
        !(
          e.message === 'Cell not found in cell_line_map' ||
          e.message === "Cannot read property 'string' of undefined"
        )
      ) {
        this.console.warn(e);
      }
    }
  };

  protected remove_range_highlight = () => {
    if (this.hover_marker) {
      this.hover_marker.clear();
      this.hover_marker = null;
      this.last_hover_response = undefined;
      this.last_hover_character = undefined;
    }
  };

  remove(): void {
    this.cache.clean();
    this.remove_range_highlight();
    this.debounced_get_hover.dispose();
    super.remove();

    // just to be sure
    this.debounced_get_hover = null;
    this.remove_range_highlight = null;
    this.handleResponse = null;
    this.on_hover = null;
  }

  private get_editor_range(
    response: lsProtocol.Hover,
    position: IRootPosition,
    token: CodeMirror.Token,
    cm_editor: CodeMirror.Editor
  ): IEditorRange {
    if (typeof response.range !== 'undefined') {
      return this.range_to_editor_range(response.range, cm_editor);
    }

    // construct the range manually using the token information
    let start_in_root = {
      line: position.line,
      ch: token.start
    } as IRootPosition;
    let end_in_root = {
      line: position.line,
      ch: token.end
    } as IRootPosition;

    return {
      start: this.virtual_editor.root_position_to_editor(start_in_root),
      end: this.virtual_editor.root_position_to_editor(end_in_root),
      editor: cm_editor
    };
  }

  private add_range_if_needed(
    response: lsProtocol.Hover,
    editor_range: IEditorRange,
    ce_editor: CodeEditor.IEditor
  ): lsProtocol.Hover {
    if (typeof response.range !== 'undefined') {
      return response;
    }
    return {
      ...response,
      range: {
        start: PositionConverter.cm_to_lsp(
          this.virtual_editor.root_position_to_virtual_position(
            this.virtual_editor.transform_from_editor_to_root(
              ce_editor,
              editor_range.start
            )
          )
        ),
        end: PositionConverter.cm_to_lsp(
          this.virtual_editor.root_position_to_virtual_position(
            this.virtual_editor.transform_from_editor_to_root(
              ce_editor,
              editor_range.end
            )
          )
        )
      }
    };
  }
}

class HoverLabIntegration implements IFeatureLabIntegration {
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

const FEATURE_ID = PLUGIN_ID + ':hover';

export const HOVER_PLUGIN: JupyterFrontEndPlugin<void> = {
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
    const labIntegration = new HoverLabIntegration(
      app,
      settings,
      renderMimeRegistry
    );

    featureManager.register({
      feature: {
        editorIntegrationFactory: new Map([['CodeMirrorEditor', HoverCM]]),
        id: FEATURE_ID,
        name: 'LSP Hover tooltip',
        labIntegration: labIntegration,
        settings: settings
      }
    });
  }
};
