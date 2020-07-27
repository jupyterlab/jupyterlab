import { getModifierState } from '../../../utils';
import {
  IRootPosition,
  is_equal,
  IVirtualPosition
} from '../../../positioning';
import * as lsProtocol from 'vscode-languageserver-protocol';
import * as CodeMirror from 'codemirror';
import { CodeMirrorLSPFeature, IEditorRange } from '../feature';
import { Debouncer } from '@lumino/polling';

export type KeyModifier = 'Alt' | 'Control' | 'Shift' | 'Meta' | 'AltGraph';
const hover_modifier: KeyModifier = 'Control';

export class Hover extends CodeMirrorLSPFeature {
  name = 'Hover';
  protected hover_character: IRootPosition;
  private last_hover_response: lsProtocol.Hover;
  private show_next_tooltip: boolean;
  private last_hover_character: CodeMirror.Position;
  protected hover_marker: CodeMirror.TextMarker;
  private virtual_position: IVirtualPosition;

  private debounced_get_hover: Debouncer<Promise<lsProtocol.Hover>>;

  register(): void {
    this.wrapper_handlers.set('mousemove', this.handleMouseOver);
    this.wrapper_handlers.set(
      'mouseleave',
      // TODO: remove_tooltip() but allow the mouse to leave if it enters the tooltip
      //  (a bit tricky: normally we would just place the tooltip within, but it was designed to be attached to body)
      this.remove_range_highlight
    );
    // show hover after pressing the modifier key
    this.wrapper_handlers.set('keydown', (event: KeyboardEvent) => {
      if (
        (!hover_modifier || getModifierState(event, hover_modifier)) &&
        this.hover_character === this.last_hover_character
      ) {
        this.show_next_tooltip = true;
        this.handleHover(
          this.last_hover_response,
          this.virtual_document.document_info.uri
        );
      }
    });
    // TODO: make the debounce rate configurable
    this.debounced_get_hover = new Debouncer<Promise<lsProtocol.Hover>>(
      this.on_hover,
      50
    );
    super.register();
  }

  on_hover = async () => {
    const hover = await this.connection.getHoverTooltip(
      this.virtual_position,
      this.virtual_document.document_info,
      false
    );
    return hover;
  };

  protected static get_markup_for_hover(
    response: lsProtocol.Hover
  ): lsProtocol.MarkupContent {
    let contents = response.contents;

    // this causes the webpack to fail "Module not found: Error: Can't resolve 'net'" for some reason
    // if (lsProtocol.MarkedString.is(contents))
    ///  contents = [contents];

    if (typeof contents === 'string') {
      contents = [contents as lsProtocol.MarkedString];
    }

    if (!Array.isArray(contents)) {
      return contents as lsProtocol.MarkupContent;
    }

    // now we have MarkedString
    let content = contents[0];

    if (typeof content === 'string') {
      // coerce to MarkedString  object
      return {
        kind: 'plaintext',
        value: content
      };
    } else {
      return {
        kind: 'markdown',
        value: '```' + content.language + '\n' + content.value + '```'
      };
    }
  }

  public handleHover = (response: lsProtocol.Hover, documentUri: string) => {
    if (documentUri !== this.virtual_document.document_info.uri) {
      return;
    }
    this.hide_hover();
    this.last_hover_character = null;
    this.last_hover_response = null;

    if (
      !this.hover_character ||
      !response ||
      !response.contents ||
      (Array.isArray(response.contents) && response.contents.length === 0)
    ) {
      return;
    }

    this.hover_marker = this.highlight_range(
      this.editor_range_for_hover(response.range),
      'cm-lsp-hover-available'
    );

    if (!this.show_next_tooltip) {
      this.last_hover_response = response;
      this.last_hover_character = this.hover_character;
      return;
    }

    const markup = Hover.get_markup_for_hover(response);
    let root_position = this.hover_character;
    let cm_editor = this.get_cm_editor(root_position);
    let editor_position = this.virtual_editor.root_position_to_editor(
      root_position
    );

    this.jupyterlab_components.create_tooltip(
      markup,
      cm_editor,
      editor_position
    );
  };

  protected is_token_empty(token: CodeMirror.Token) {
    return token.string.length === 0;
    // TODO  || token.type.length === 0? (sometimes the underline is shown on meaningless tokens)
  }

  protected is_event_inside_visible(event: MouseEvent) {
    let target = event.target as HTMLElement;
    return target.closest('.CodeMirror-sizer') != null;
  }

  public async _handleMouseOver(event: MouseEvent) {
    // currently the events are coming from notebook panel; ideally these would be connected to individual cells,
    // (only cells with code) instead, but this is more complex to implement right. In any case filtering
    // is needed to determine in hovered character belongs to this virtual document

    let root_position = this.position_from_mouse(event);

    // happens because mousemove is attached to panel, not individual code cells,
    // and because some regions of the editor (between lines) have no characters
    if (root_position == null) {
      // this.remove_range_highlight();
      this.hover_character = null;
      return;
    }

    let token = this.virtual_editor.getTokenAt(root_position);

    let document = this.virtual_editor.document_at_root_position(root_position);
    let virtual_position = this.virtual_editor.root_position_to_virtual_position(
      root_position
    );

    if (
      this.is_token_empty(token) ||
      document !== this.virtual_document ||
      !this.is_event_inside_visible(event)
    ) {
      // this.remove_range_highlight();
      this.hover_character = null;
      return;
    }

    if (!is_equal(root_position, this.hover_character)) {
      this.hover_character = root_position;
      this.virtual_position = virtual_position;
      const hover = await this.debounced_get_hover.invoke();
      this.handleHover(hover, this.virtual_document.document_info.uri);
    }
  }

  public handleMouseOver = (event: MouseEvent) => {
    // proceed when no hover modifier or hover modifier pressed
    this.show_next_tooltip =
      !hover_modifier || getModifierState(event, hover_modifier);

    try {
      return this._handleMouseOver(event);
    } catch (e) {
      if (
        !(
          e.message === 'Cell not found in cell_line_map' ||
          e.message === "Cannot read property 'string' of undefined"
        )
      ) {
        console.warn(e);
      }
    }
  };

  protected editor_range_for_hover(range: lsProtocol.Range): IEditorRange {
    let character = this.hover_character;
    // NOTE: foreign document ranges are checked before the request is sent,
    // no need to to this again here.

    if (range) {
      let cm_editor = this.virtual_editor.get_editor_at_root_position(
        character
      );
      return this.range_to_editor_range(range, cm_editor);
    } else {
      // construct range manually using the token information
      let cm_editor = this.virtual_document.root.get_editor_at_source_line(
        character
      );
      let token = this.virtual_editor.getTokenAt(character);

      let start_in_root = {
        line: character.line,
        ch: token.start
      } as IRootPosition;
      let end_in_root = {
        line: character.line,
        ch: token.end
      } as IRootPosition;

      return {
        start: this.virtual_editor.root_position_to_editor(start_in_root),
        end: this.virtual_editor.root_position_to_editor(end_in_root),
        editor: cm_editor
      };
    }
  }

  hide_hover() {
    this.jupyterlab_components.remove_tooltip();
    this.remove_range_highlight();
  }

  protected remove_range_highlight = () => {
    if (this.hover_marker) {
      this.hover_marker.clear();
      this.hover_marker = null;
    }
    this.last_hover_character = null;
  };

  remove(): void {
    this.remove_range_highlight();
    this.debounced_get_hover.dispose();
    super.remove();

    // just to be sure
    this.debounced_get_hover = null;
    this.remove_range_highlight = null;
    this.handleHover = null;
    this.on_hover = null;
  }
}
