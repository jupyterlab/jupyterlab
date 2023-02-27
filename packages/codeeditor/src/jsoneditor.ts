// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IObservableJSON } from '@jupyterlab/observables';
import { ISharedText, SourceChange } from '@jupyter/ydoc';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import { checkIcon, undoIcon } from '@jupyterlab/ui-components';
import {
  JSONExt,
  JSONObject,
  ReadonlyPartialJSONObject
} from '@lumino/coreutils';
import { Message } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';
import { CodeEditor } from './editor';

/**
 * The class name added to a JSONEditor instance.
 */
const JSONEDITOR_CLASS = 'jp-JSONEditor';

/**
 * The class name added when the Metadata editor contains invalid JSON.
 */
const ERROR_CLASS = 'jp-mod-error';

/**
 * The class name added to the editor host node.
 */
const HOST_CLASS = 'jp-JSONEditor-host';

/**
 * The class name added to the header area.
 */
const HEADER_CLASS = 'jp-JSONEditor-header';

/**
 * A widget for editing observable JSON.
 */
export class JSONEditor extends Widget {
  /**
   * Construct a new JSON editor.
   */
  constructor(options: JSONEditor.IOptions) {
    super();
    this.translator = options.translator || nullTranslator;
    this._trans = this.translator.load('jupyterlab');
    this.addClass(JSONEDITOR_CLASS);

    this.headerNode = document.createElement('div');
    this.headerNode.className = HEADER_CLASS;

    this.revertButtonNode = undoIcon.element({
      tag: 'span',
      title: this._trans.__('Revert changes to data')
    });

    this.commitButtonNode = checkIcon.element({
      tag: 'span',
      title: this._trans.__('Commit changes to data'),
      marginLeft: '8px'
    });

    this.editorHostNode = document.createElement('div');
    this.editorHostNode.className = HOST_CLASS;

    this.headerNode.appendChild(this.revertButtonNode);
    this.headerNode.appendChild(this.commitButtonNode);

    this.node.appendChild(this.headerNode);
    this.node.appendChild(this.editorHostNode);

    const model = new CodeEditor.Model({ mimeType: 'application/json' });
    model.sharedModel.changed.connect(this._onModelChanged, this);

    this.model = model;
    this.editor = options.editorFactory({
      host: this.editorHostNode,
      model,
      config: {
        readOnly: true
      }
    });
  }

  /**
   * The code editor used by the editor.
   */
  readonly editor: CodeEditor.IEditor;

  /**
   * The code editor model used by the editor.
   */
  readonly model: CodeEditor.IModel;

  /**
   * The editor host node used by the JSON editor.
   */
  readonly headerNode: HTMLDivElement;

  /**
   * The editor host node used by the JSON editor.
   */
  readonly editorHostNode: HTMLDivElement;

  /**
   * The revert button used by the JSON editor.
   */
  readonly revertButtonNode: HTMLSpanElement;

  /**
   * The commit button used by the JSON editor.
   */
  readonly commitButtonNode: HTMLSpanElement;

  /**
   * The observable source.
   */
  get source(): IObservableJSON | null {
    return this._source;
  }
  set source(value: IObservableJSON | null) {
    if (this._source === value) {
      return;
    }
    if (this._source) {
      this._source.changed.disconnect(this._onSourceChanged, this);
    }
    this._source = value;
    this.editor.setOption('readOnly', value === null);
    if (value) {
      value.changed.connect(this._onSourceChanged, this);
    }
    this._setValue();
  }

  /**
   * Get whether the editor is dirty.
   */
  get isDirty(): boolean {
    return this._dataDirty || this._inputDirty;
  }

  /**
   * Dispose of the editor.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    this.source?.dispose();
    this.model.dispose();
    this.editor.dispose();

    super.dispose();
  }

  /**
   * Handle the DOM events for the widget.
   *
   * @param event - The DOM event sent to the widget.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the notebook panel's node. It should
   * not be called directly by user code.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
      case 'blur':
        this._evtBlur(event as FocusEvent);
        break;
      case 'click':
        this._evtClick(event as MouseEvent);
        break;
      default:
        break;
    }
  }

  /**
   * Handle `after-attach` messages for the widget.
   */
  protected onAfterAttach(msg: Message): void {
    const node = this.editorHostNode;
    node.addEventListener('blur', this, true);
    node.addEventListener('click', this, true);
    this.revertButtonNode.hidden = true;
    this.commitButtonNode.hidden = true;
    this.headerNode.addEventListener('click', this);
  }

  /**
   * Handle `before-detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    const node = this.editorHostNode;
    node.removeEventListener('blur', this, true);
    node.removeEventListener('click', this, true);
    this.headerNode.removeEventListener('click', this);
  }

  /**
   * Handle a change to the metadata of the source.
   */
  private _onSourceChanged(
    sender: IObservableJSON,
    args: IObservableJSON.IChangedArgs
  ) {
    if (this._changeGuard) {
      return;
    }
    if (this._inputDirty || this.editor.hasFocus()) {
      this._dataDirty = true;
      return;
    }
    this._setValue();
  }

  /**
   * Handle change events.
   */
  private _onModelChanged(model: ISharedText, change: SourceChange): void {
    if (change.sourceChange) {
      let valid = true;
      try {
        const value = JSON.parse(this.editor.model.sharedModel.getSource());
        this.removeClass(ERROR_CLASS);
        this._inputDirty =
          !this._changeGuard && !JSONExt.deepEqual(value, this._originalValue);
      } catch (err) {
        this.addClass(ERROR_CLASS);
        this._inputDirty = true;
        valid = false;
      }
      this.revertButtonNode.hidden = !this._inputDirty;
      this.commitButtonNode.hidden = !valid || !this._inputDirty;
    }
  }

  /**
   * Handle blur events for the text area.
   */
  private _evtBlur(event: FocusEvent): void {
    // Update the metadata if necessary.
    if (!this._inputDirty && this._dataDirty) {
      this._setValue();
    }
  }

  /**
   * Handle click events for the buttons.
   */
  private _evtClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (this.revertButtonNode.contains(target)) {
      this._setValue();
    } else if (this.commitButtonNode.contains(target)) {
      if (!this.commitButtonNode.hidden && !this.hasClass(ERROR_CLASS)) {
        this._changeGuard = true;
        this._mergeContent();
        this._changeGuard = false;
        this._setValue();
      }
    } else if (this.editorHostNode.contains(target)) {
      this.editor.focus();
    }
  }

  /**
   * Merge the user content.
   */
  private _mergeContent(): void {
    const model = this.editor.model;
    const old = this._originalValue;
    const user = JSON.parse(model.sharedModel.getSource()) as JSONObject;
    const source = this.source;
    if (!source) {
      return;
    }

    // If it is in user and has changed from old, set in new.
    for (const key in user) {
      if (!JSONExt.deepEqual(user[key], old[key] || null)) {
        source.set(key, user[key]);
      }
    }

    // If it was in old and is not in user, remove from source.
    for (const key in old) {
      if (!(key in user)) {
        source.delete(key);
      }
    }
  }

  /**
   * Set the value given the owner contents.
   */
  private _setValue(): void {
    this._dataDirty = false;
    this._inputDirty = false;
    this.revertButtonNode.hidden = true;
    this.commitButtonNode.hidden = true;
    this.removeClass(ERROR_CLASS);
    const model = this.editor.model;
    const content = this._source ? this._source.toJSON() : {};
    this._changeGuard = true;
    if (content === void 0) {
      model.sharedModel.setSource(this._trans.__('No data!'));
      this._originalValue = JSONExt.emptyObject;
    } else {
      const value = JSON.stringify(content, null, 4);
      model.sharedModel.setSource(value);
      this._originalValue = content;
      // Move the cursor to within the brace.
      if (value.length > 1 && value[0] === '{') {
        this.editor.setCursorPosition({ line: 0, column: 1 });
      }
    }
    this._changeGuard = false;
    this.commitButtonNode.hidden = true;
    this.revertButtonNode.hidden = true;
  }

  protected translator: ITranslator;
  private _trans: TranslationBundle;
  private _dataDirty = false;
  private _inputDirty = false;
  private _source: IObservableJSON | null = null;
  private _originalValue: ReadonlyPartialJSONObject = JSONExt.emptyObject;
  private _changeGuard = false;
}

/**
 * The static namespace JSONEditor class statics.
 */
export namespace JSONEditor {
  /**
   * The options used to initialize a json editor.
   */
  export interface IOptions {
    /**
     * The editor factory used by the editor.
     */
    editorFactory: CodeEditor.Factory;

    /**
     * The language translator.
     */
    translator?: ITranslator;
  }
}
