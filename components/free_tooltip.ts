// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
// (Parts of the FreeTooltip code are copy-paste from Tooltip, ideally this would be PRed be merged)
import { HoverBox } from '@jupyterlab/apputils';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { IDocumentWidget } from '@jupyterlab/docregistry';
import {
  IRenderMime,
  MimeModel,
  IRenderMimeRegistry
} from '@jupyterlab/rendermime';
import { Tooltip } from '@jupyterlab/tooltip';
import { Widget } from '@lumino/widgets';
import * as lsProtocol from 'vscode-languageserver-protocol';

import { WidgetAdapter } from '../adapters/adapter';
import { PositionConverter } from '../converter';
import { IEditorPosition } from '../positioning';

const MIN_HEIGHT = 20;
const MAX_HEIGHT = 250;

const CLASS_NAME = 'lsp-tooltip';

interface IFreeTooltipOptions extends Tooltip.IOptions {
  /**
   * Position at which the tooltip should be placed, or null (default) to use the current cursor position.
   */
  position: CodeEditor.IPosition | null;
  /**
   * HoverBox privilege.
   */
  privilege?: 'above' | 'below' | 'forceAbove' | 'forceBelow';
  /**
   * Alignment with respect to the current token.
   */
  alignment?: 'start' | 'end' | null;
  /**
   * default: true; ESC will always hide
   */
  hideOnKeyPress?: boolean;
}

/**
 * Tooltip which can be placed  at any character, not only at the current position (derived from getCursorPosition)
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export class FreeTooltip extends Tooltip {
  constructor(protected options: IFreeTooltipOptions) {
    super(options);
    this._setGeometry();
    // TODO: remove once https://github.com/jupyterlab/jupyterlab/pull/11010 is merged & released
    const model = new MimeModel({ data: options.bundle });
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const content: IRenderMime.IRenderer = this._content;
    content
      .renderModel(model)
      .then(() => this._setGeometry())
      .catch(console.warn);
  }

  handleEvent(event: Event): void {
    if (this.isHidden || this.isDisposed) {
      return;
    }

    const { node } = this;
    const target = event.target as HTMLElement;

    switch (event.type) {
      case 'keydown': {
        const keyCode = (event as KeyboardEvent).keyCode;
        // ESC or Backspace cancel anyways
        if (
          node.contains(target) ||
          (!this.options.hideOnKeyPress && keyCode != 27 && keyCode != 8)
        ) {
          return;
        }
        this.dispose();
        break;
      }
      default:
        super.handleEvent(event);
        break;
    }
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  private _setGeometry(): void {
    // Find the start of the current token for hover box placement.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const editor = this._editor as CodeEditor.IEditor;
    const cursor: CodeEditor.IPosition =
      this.options.position == null
        ? editor.getCursorPosition()
        : this.options.position;

    const end = editor.getOffsetAt(cursor);
    const line = editor.getLine(cursor.line);

    if (!line) {
      return;
    }

    let position: CodeEditor.IPosition;

    switch (this.options.alignment) {
      case 'start': {
        const tokens = line.substring(0, end).split(/\W+/);
        const last = tokens[tokens.length - 1];
        const start = last ? end - last.length : end;
        position = editor.getPositionAt(start);
        break;
      }
      case 'end': {
        const tokens = line.substring(0, end).split(/\W+/);
        const last = tokens[tokens.length - 1];
        const start = last ? end - last.length : end;
        position = editor.getPositionAt(start);
        break;
      }
      default: {
        position = cursor;
        break;
      }
    }

    if (!position) {
      return;
    }

    const anchor = editor.getCoordinateForPosition(position) as ClientRect;
    const style = window.getComputedStyle(this.node);
    const paddingLeft = parseInt(style.paddingLeft!, 10) || 0;

    // Calculate the geometry of the tooltip.
    HoverBox.setGeometry({
      anchor,
      host: editor.host,
      maxHeight: MAX_HEIGHT,
      minHeight: MIN_HEIGHT,
      node: this.node,
      offset: { horizontal: -1 * paddingLeft },
      privilege: this.options.privilege || 'below',
      style: style
    });
  }
}

export namespace EditorTooltip {
  export interface IOptions {
    id?: string;
    markup: lsProtocol.MarkupContent;
    ce_editor: CodeEditor.IEditor;
    position: IEditorPosition;
    adapter: WidgetAdapter<IDocumentWidget>;
    className?: string;
    tooltip?: Partial<IFreeTooltipOptions>;
  }
}

export class EditorTooltipManager {
  private currentTooltip: FreeTooltip = null;
  private currentOptions: EditorTooltip.IOptions | null;

  constructor(private rendermime_registry: IRenderMimeRegistry) {}

  create(options: EditorTooltip.IOptions): FreeTooltip {
    this.remove();
    this.currentOptions = options;
    let { markup, position, adapter } = options;
    let widget = adapter.widget;
    const bundle =
      markup.kind === 'plaintext'
        ? { 'text/plain': markup.value }
        : { 'text/markdown': markup.value };
    const tooltip = new FreeTooltip({
      ...(options.tooltip || {}),
      anchor: widget.content,
      bundle: bundle,
      editor: options.ce_editor,
      rendermime: this.rendermime_registry,
      position: PositionConverter.cm_to_ce(position)
    });
    tooltip.addClass(CLASS_NAME);
    tooltip.addClass(options.className);
    Widget.attach(tooltip, document.body);
    this.currentTooltip = tooltip;
    return tooltip;
  }

  get position(): IEditorPosition {
    return this.currentOptions.position;
  }

  isShown(id?: string): boolean {
    if (id && this.currentOptions && this.currentOptions?.id !== id) {
      return false;
    }
    return (
      this.currentTooltip &&
      !this.currentTooltip.isDisposed &&
      this.currentTooltip.isVisible
    );
  }

  remove() {
    if (this.currentTooltip !== null) {
      this.currentTooltip.dispose();
      this.currentTooltip = null;
    }
  }
}
