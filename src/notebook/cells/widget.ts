// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  loadModeByMIME
} from 'jupyter-js-ui/lib/codemirror';

import {
  CodeMirrorWidget
} from 'jupyter-js-ui/lib/codemirror/widget';

import {
  RenderMime
} from 'jupyter-js-ui/lib/rendermime';

import {
  Message
} from 'phosphor-messaging';

import {
  PanelLayout
} from 'phosphor-panel';

import {
  Widget
} from 'phosphor-widget';

import {
  MimeBundle
} from '../notebook/nbformat';

import {
  OutputAreaWidget, ObservableOutputs
} from '../output-area';

import {
  sanitize
} from 'sanitizer';

import {
  ICodeCellModel, ICellModel, IMetadataCursor
} from './model';


/**
 * The class name added to cell widgets.
 */
const CELL_CLASS = 'jp-Cell';

/**
 * The class name added to input area widgets.
 */
const INPUT_CLASS = 'jp-InputArea';

/**
 * The class name added to the prompt area of cell.
 */
const PROMPT_CLASS = 'jp-InputArea-prompt';

/**
 * The class name added to the editor area of the cell.
 */
const EDITOR_CLASS = 'jp-InputArea-editor';

/**
 * The class name added to the cell when collapsed.
 */
const COLLAPSED_CLASS = 'jp-mod-collapsed';

/**
 * The class name added to the cell when readonly.
 */
const READONLY_CLASS = 'jp-mod-readOnly';

/**
 * The class name added to code cells.
 */
const CODE_CELL_CLASS = 'jp-CodeCell';

/**
 * The class name added to markdown cells.
 */
const MARKDOWN_CELL_CLASS = 'jp-MarkdownCell';

/**
 * The class name added to the markdown cell renderer widget.
 */
const RENDERER_CLASS = 'jp-MarkdownCell-renderer';

/**
 * The class name added to raw cells.
 */
const RAW_CELL_CLASS = 'jp-RawCell';

/**
 * The class name added to a rendered markdown cell.
 */
const RENDERED_CLASS = 'jp-mod-rendered';

/**
 * The text applied to an empty markdown cell.
 */
const DEFAULT_MARKDOWN_TEXT = 'Type Markdown and LaTeX: $ α^2 $';


/**
 * A base cell widget.
 */
export
class BaseCellWidget extends Widget {
  /**
   * Construct a new base cell widget.
   */
  constructor(model: ICellModel) {
    super();
    this.addClass(CELL_CLASS);
    this._model = model;
    this._editor = new CodeMirrorWidget();
    this._input = new InputAreaWidget(this._editor);
    this.layout = new PanelLayout();
    (this.layout as PanelLayout).addChild(this._input);
    this._initializeEditor();
    model.contentChanged.connect(this.onModelChanged, this);
    this._trustedCursor = model.getMetadata('trusted');
    this._trusted = this._trustedCursor.getValue();
  }

  /**
   * Get the model used by the widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get model(): ICellModel {
    return this._model;
  }

  /**
   * Get the editor used by the widget.
   *
   * #### Notes
   * This is a ready-only property.
   */
   get editor(): CodeMirror.Editor {
     return this._editor.editor;
   }

  /**
   * The mimetype used by the cell.
   */
  get mimetype(): string {
    return this._mimetype;
  }
  set mimetype(value: string) {
    if (this._mimetype === value) {
      return;
    }
    this._mimetype = value;
    loadModeByMIME(this.editor, value);
  }

  /**
   * The read only state of the cell.
   */
  get readOnly(): boolean {
    return this._readOnly;
  }
  set readOnly(value: boolean) {
    if (value === this._readOnly) {
      return;
    }
    this._readOnly = value;
    this.update();
  }

  /**
   * The trusted state of the cell.
   */
  get trusted(): boolean {
    return this._trusted;
  }
  set trusted(value: boolean) {
    this._trustedCursor.setValue(value);
  }

  /**
   * Set the prompt for the widget.
   */
  setPrompt(value: string): void {
    this._input.setPrompt(value);
  }

  /**
   * Toggle whether the input area is shown.
   */
  toggleInput(value: boolean): void {
    if (value) {
      this._input.show();
      this.editor.focus();
    } else {
      this._input.hide();
    }
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose() {
    // Do nothing if already disposed.
    if (this.isDisposed) {
      return;
    }
    this._model = null;
    this._input = null;
    this._editor = null;
    this._trustedCursor.dispose();
    this._trustedCursor = null;
    super.dispose();
  }

  /**
   * Handle `after-attach` messages.
   */
  protected onAfterAttach(msg: Message): void {
    this.update();
  }

  /**
   * Handle `update_request` messages.
   */
  protected onUpdateRequest(message: Message): void {
    // Handle read only state.
    let option = this._readOnly ? 'nocursor' : false;
    this.editor.setOption('readOnly', option);
    this.toggleClass(READONLY_CLASS, this._readOnly);
  }

  /**
   * Handle changes in the model.
   */
  protected onModelChanged(model: ICellModel, change: string): void {
    switch (change) {
    case 'source':
      this.editor.getDoc().setValue(model.source);
      break;
    case 'metadata':
    case 'metadata.trusted':
      this._trusted = this._trustedCursor.getValue();
      this.update();
      break;
    default:
      break;
    }
  }

  /**
   * Initialize the codemirror editor.
   */
  private _initializeEditor(): void {
    let doc = this.editor.getDoc();
    CodeMirror.on(doc, 'change', (instance, change) => {
      if (change.origin === 'setValue') {
        return;
      }
      this._model.source = instance.getValue();
    });
  }

  private _input: InputAreaWidget = null;
  private _editor: CodeMirrorWidget = null;
  private _model: ICellModel = null;
  private _mimetype = 'text/plain';
  private _readOnly = false;
  private _trustedCursor: IMetadataCursor = null;
  private _trusted = false;
}


/**
 * A widget for a code cell.
 */
export
class CodeCellWidget extends BaseCellWidget {

  /**
   * Create an output area widget.
   */
  static createOutput(outputs: ObservableOutputs, rendermime: RenderMime<Widget>): OutputAreaWidget {
    return new OutputAreaWidget(outputs, rendermime);
  }

  /**
   * Construct a code cell widget.
   */
  constructor(model: ICodeCellModel, rendermime: RenderMime<Widget>) {
    super(model);
    this._rendermime = rendermime;
    this.addClass(CODE_CELL_CLASS);
    let constructor = this.constructor as typeof CodeCellWidget;
    this._output = constructor.createOutput(model.outputs, rendermime);
    this._output.trusted = this.trusted;
    (this.layout as PanelLayout).addChild(this._output);
    this._collapsedCursor = model.getMetadata('collapsed');
    this._scrolledCursor = model.getMetadata('scrolled');
  }

  /**
   * Dispose of the resources used by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._rendermime = null;
    this._collapsedCursor.dispose();
    this._collapsedCursor = null;
    this._scrolledCursor.dispose();
    this._scrolledCursor = null;
    this._output = null;
    super.dispose();
  }

  /**
   * Handle `update_request` messages.
   */
  protected onUpdateRequest(message: Message): void {
    this.toggleClass(COLLAPSED_CLASS, this._collapsedCursor.getValue());
    // TODO: handle scrolled state.
    this._output.trusted = this.trusted;
    super.onUpdateRequest(message);
  }

  /**
   * Handle changes in the model.
   */
  protected onModelChanged(model: ICellModel, change: string): void {
    switch (change) {
    case 'metadata.collapsed':
    case 'metadata.scrolled':
      this.update();
      break;
    default:
      break;
    }
    super.onModelChanged(model, change);
  }

  private _output: OutputAreaWidget = null;
  private _rendermime: RenderMime<Widget> = null;
  private _collapsedCursor: IMetadataCursor = null;
  private _scrolledCursor: IMetadataCursor = null;
}


/**
 * A widget for a Markdown cell.
 *
 * #### Notes
 * Things get complicated if we want the rendered text to update
 * any time the text changes, the text editor model changes,
 * or the input area model changes.  We don't support automatically
 * updating the rendered text in all of these cases.
 */
export
class MarkdownCellWidget extends BaseCellWidget {
  /**
   * Construct a Markdown cell widget.
   */
  constructor(model: ICellModel, rendermime: RenderMime<Widget>) {
    super(model);
    this._rendermime = rendermime;
    this.addClass(MARKDOWN_CELL_CLASS);
    // Insist on the Github-flavored markdown mode.
    this.mimetype = 'text/x-ipythongfm';
    this._renderer = new Widget();
    this._renderer.addClass(RENDERER_CLASS);
    (this.layout as PanelLayout).addChild(this._renderer);
    this.model.contentChanged.connect(this.onModelChanged, this);
  }

  /**
   * Whether the cell is rendered.
   */
  get rendered(): boolean {
    return this._rendered;
  }
  set rendered(value: boolean) {
    if (value === this._rendered) {
      return;
    }
    this._rendered = value;
    this.update();
  }

  /**
   * Dispose of the resource held by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._renderer = null;
    this._rendermime = null;
    super.dispose();
  }

  /**
   * Handle `update_request` messages.
   */
  protected onUpdateRequest(message: Message): void {
    let model = this.model;
    if (this.rendered) {
      if (this._dirty) {
        let text = model.source || DEFAULT_MARKDOWN_TEXT;
        text = sanitize(text);
        let bundle: MimeBundle = { 'text/markdown': text };
        this._renderer.dispose();
        this._renderer = this._rendermime.render(bundle) || new Widget();
        this._renderer.addClass(RENDERER_CLASS);
        (this.layout as PanelLayout).addChild(this._renderer);
      }
      this._renderer.show();
      this.toggleInput(false);
      this.addClass(RENDERED_CLASS);
    } else {
      this._renderer.hide();
      this.toggleInput(true);
      this.removeClass(RENDERED_CLASS);
    }
    this._dirty = false;
    super.onUpdateRequest(message);
  }

  private _rendermime: RenderMime<Widget> = null;
  private _renderer: Widget = null;
  private _rendered = true;
  private _dirty = true;
}


/**
 * A widget for a raw cell.
 */
export
class RawCellWidget extends BaseCellWidget {
  /**
   * Construct a raw cell widget.
   */
  constructor(model: ICellModel) {
    super(model);
    this.addClass(RAW_CELL_CLASS);
  }
}


/**
 * An input area widget, which hosts a prompt and an editor widget.
 */
class InputAreaWidget extends Widget {
  /**
   * Construct an input area widget.
   */
  constructor(editor: CodeMirrorWidget) {
    super();
    this.addClass(INPUT_CLASS);
    editor.addClass(EDITOR_CLASS);
    this.layout = new PanelLayout();
    let prompt = new Widget();
    prompt.addClass(PROMPT_CLASS);
    let layout = this.layout as PanelLayout;
    layout.addChild(prompt);
    layout.addChild(editor);
  }

  /**
   * Set the prompt of the input area.
   */
  setPrompt(value: string): void {
    let prompt = (this.layout as PanelLayout).childAt(0);
    prompt.node.textContent = value;
  }
}
