// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
// (Parts of the FreeTooltip code are copy-paste from Tooltip, ideally this would be PRed be merged)
import { HoverBox } from '@jupyterlab/apputils';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { IDocumentWidget } from '@jupyterlab/docregistry';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { Tooltip } from '@jupyterlab/tooltip';
import { Widget } from '@lumino/widgets';
import * as lsProtocol from 'vscode-languageserver-protocol';

import { WidgetAdapter } from '../adapters/adapter';
import { PositionConverter } from '../converter';
import { IEditorPosition } from '../positioning';

const MIN_HEIGHT = 20;
const MAX_HEIGHT = 250;

interface IFreeTooltipOptions extends Tooltip.IOptions {
  /**
   * Position at which the tooltip should be placed, or null (default) to use the current cursor position.
   */
  position: CodeEditor.IPosition | null;
  /**
   * Should the tooltip be placed at the end of the line indicated by position?
   */
  moveToLineEnd: boolean;
}

/**
 * Tooltip which can be placed  at any character, not only at the current position (derived from getCursorPosition)
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export class FreeTooltip extends Tooltip {
  position: CodeEditor.IPosition | null;
  movetoLineEnd: boolean;

  constructor(options: IFreeTooltipOptions) {
    super(options);
    this.position = options.position;
    this.movetoLineEnd = options.moveToLineEnd;
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  private _setGeometry(): void {
    // Find the start of the current token for hover box placement.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const editor = this._editor as CodeEditor.IEditor;
    const cursor: CodeEditor.IPosition =
      this.position == null ? editor.getCursorPosition() : this.position;

    const end = editor.getOffsetAt(cursor);
    const line = editor.getLine(cursor.line);

    if (!line) {
      return;
    }

    let position: CodeEditor.IPosition;

    if (this.movetoLineEnd) {
      const tokens = line.substring(0, end).split(/\W+/);
      const last = tokens[tokens.length - 1];
      const start = last ? end - last.length : end;
      position = editor.getPositionAt(start);
    } else {
      position = cursor;
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
      privilege: 'below',
      style: style
    });
  }
}

export namespace EditorTooltip {
  export interface IOptions {
    markup: lsProtocol.MarkupContent;
    ce_editor: CodeEditor.IEditor;
    position: IEditorPosition;
    adapter: WidgetAdapter<IDocumentWidget>;
    className?: string;
  }
}

export class EditorTooltipManager {
  private currentTooltip: FreeTooltip = null;

  constructor(private rendermime_registry: IRenderMimeRegistry) {}

  create(options: EditorTooltip.IOptions): FreeTooltip {
    this.remove();
    let { markup, position, adapter } = options;
    let widget = adapter.widget;
    const bundle =
      markup.kind === 'plaintext'
        ? { 'text/plain': markup.value }
        : { 'text/markdown': markup.value };
    const tooltip = new FreeTooltip({
      anchor: widget.content,
      bundle: bundle,
      editor: options.ce_editor,
      rendermime: this.rendermime_registry,
      position: PositionConverter.cm_to_ce(position),
      moveToLineEnd: false
    });
    tooltip.addClass(options.className);
    Widget.attach(tooltip, document.body);
    this.currentTooltip = tooltip;
    return tooltip;
  }

  remove() {
    if (this.currentTooltip !== null) {
      this.currentTooltip.dispose();
    }
  }
}
