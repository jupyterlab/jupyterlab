// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONExt, JSONObject
} from '@phosphor/coreutils';

import {
  Message
} from '@phosphor/messaging';

import {
  Widget
} from '@phosphor/widgets';

import {
  h, VirtualDOM
} from '@phosphor/virtualdom';

import {
  IObservableJSON
} from '@jupyterlab/coreutils';

import {
  CodeEditor
} from '.';

/**
 * The class name added to a JSONEditorWidget instance.
 */
const METADATA_CLASS = 'jp-JSONEditorWidget';

/**
 * The class name added when the Metadata editor contains invalid JSON.
 */
const ERROR_CLASS = 'jp-mod-error';

/**
 * The class name added to the editor host node.
 */
const HOST_CLASS = 'jp-JSONEditorWidget-host';

/**
 * The class name added to the button area.
 */
const BUTTON_AREA_CLASS = 'jp-JSONEditorWidget-buttons';

/**
 * The class name added to the revert button.
 */
const REVERT_CLASS = 'jp-JSONEditorWidget-revertButton';

/**
 * The class name added to the commit button.
 */
const COMMIT_CLASS = 'jp-JSONEditorWidget-commitButton';


/**
 * A widget for editing observable JSON.
 */
export
class JSONEditorWidget extends Widget {
  /**
   * Construct a new metadata editor.
   */
  constructor(options: JSONEditorWidget.IOptions) {
    super({ node: Private.createEditorNode() });
    this.addClass(METADATA_CLASS);
    let host = this.editorHostNode;
    let model = new CodeEditor.Model();
    model.value.text = 'No data!';
    model.mimeType = 'application/json';
    model.value.changed.connect(this._onValueChanged, this);
    this.model = model;
    this.editor = options.editorFactory({ host, model });
    this.editor.readOnly = true;
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
   * Get the editor host node used by the metadata editor.
   */
  get editorHostNode(): HTMLElement {
    return this.node.getElementsByClassName(HOST_CLASS)[0] as HTMLElement;
  }

  /**
   * Get the revert button used by the metadata editor.
   */
  get revertButtonNode(): HTMLElement {
    return this.node.getElementsByClassName(REVERT_CLASS)[0] as HTMLElement;
  }

  /**
   * Get the commit button used by the metadata editor.
   */
  get commitButtonNode(): HTMLElement {
    return this.node.getElementsByClassName(COMMIT_CLASS)[0] as HTMLElement;
  }

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
    this.editor.readOnly = !value;
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
    let node = this.editorHostNode;
    node.addEventListener('blur', this, true);
    this.revertButtonNode.hidden = true;
    this.commitButtonNode.hidden = true;
    this.revertButtonNode.addEventListener('click', this);
    this.commitButtonNode.addEventListener('click', this);
  }

  /**
   * Handle `before-detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    let node = this.editorHostNode;
    node.removeEventListener('blur', this, true);
    this.revertButtonNode.removeEventListener('click', this);
    this.commitButtonNode.removeEventListener('click', this);
  }

  /**
   * Handle a change to the metadata of the source.
   */
  private _onSourceChanged(sender: IObservableJSON, args: IObservableJSON.IChangedArgs) {
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
  private _onValueChanged(): void {
    let valid = true;
    try {
      let value = JSON.parse(this.editor.model.value.text);
      this.removeClass(ERROR_CLASS);
      this._inputDirty = (
        !this._changeGuard && !JSONExt.deepEqual(value, this._originalValue)
      );
    } catch (err) {
      this.addClass(ERROR_CLASS);
      this._inputDirty = true;
      valid = false;
    }
    this.revertButtonNode.hidden = !this._inputDirty;
    this.commitButtonNode.hidden = !valid || !this._inputDirty;
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
    let target = event.target as HTMLElement;
    if (target === this.revertButtonNode) {
      this._setValue();
    } else if (target === this.commitButtonNode) {
      if (!this.commitButtonNode.hidden && !this.hasClass(ERROR_CLASS)) {
        this._changeGuard = true;
        this._mergeContent();
        this._changeGuard = false;
        this._setValue();
      }
    }
  }

  /**
   * Merge the user content.
   */
  private _mergeContent(): void {
    let model = this.editor.model;
    let current = this._getContent() || {};
    let old = this._originalValue;
    let user = JSON.parse(model.value.text) as JSONObject;
    let source = this.source;
    // If it is in user and has changed from old, set in current.
    for (let key in user) {
      if (!JSONExt.deepEqual(user[key], old[key])) {
        current[key] = user[key];
      }
    }
    // If it was in old and is not in user, remove from current.
    for (let key in old) {
      if (!(key in user)) {
        delete current[key];
        source.delete(key);
      }
    }
    // Set the values.
    for (let key in current) {
      source.set(key, current[key]);
    }
  }

  /**
   * Get the metadata from the owner.
   */
  private _getContent(): JSONObject | undefined {
    let source = this._source;
    if (!source) {
      return void 0;
    }
    let content: JSONObject = {};
    for (let key of source.keys()) {
      content[key] = source.get(key);
    }
    return content;
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
    let model = this.editor.model;
    let content = this._getContent();
    this._changeGuard = true;
    if (content === void 0) {
      model.value.text = 'No data!';
      this._originalValue = null;
    } else {
      let value = JSON.stringify(content, null, 2);
      model.value.text = value;
      this._originalValue = content;
    }
    this.editor.refresh();
    this._changeGuard = false;
    this.commitButtonNode.hidden = true;
    this.revertButtonNode.hidden = true;
  }

  private _dataDirty = false;
  private _inputDirty = false;
  private _source: IObservableJSON | null = null;
  private _originalValue: JSONObject = null;
  private _changeGuard = false;
}


/**
 * The static namespace JSONEditorWidget class statics.
 */
export
namespace JSONEditorWidget {
  /**
   * The options used to initialize a metadata editor.
   */
  export
  interface IOptions {
    /**
     * The editor factory used by the tool.
     */
    editorFactory: CodeEditor.Factory;
  }
}


/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * Create the node for the EditorWdiget.
   */
  export
  function createEditorNode(): HTMLElement {
    let cancelTitle = 'Revert changes to data';
    let confirmTitle = 'Commit changes to data';
    return VirtualDOM.realize(
      h.div({ className: METADATA_CLASS },
        h.div({ className: BUTTON_AREA_CLASS },
          h.span({ className: REVERT_CLASS, title: cancelTitle }),
          h.span({ className: COMMIT_CLASS, title: confirmTitle })),
        h.div({ className: HOST_CLASS }))
    );
  }
}
