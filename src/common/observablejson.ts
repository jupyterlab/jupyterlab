// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  deepEqual, isPrimitive, JSONObject, JSONValue
} from '@phosphor/coreutils';

import {
  Message
} from '@phosphor/messaging';

import {
  Widget
} from '@phosphor/widgetwidget';

import {
  h, realize
} from '@phosphor/widgetvdom';

import {
  CodeEditor
} from '../codeeditor';

import {
  IObservableMap, ObservableMap
} from './observablemap';


/**
 * The class name added to a ObservableJSONWidget instance.
 */
const METADATA_CLASS = 'jp-ObservableJSONWidget';

/**
 * The class name added when the Metadata editor contains invalid JSON.
 */
const ERROR_CLASS = 'jp-mod-error';

/**
 * The class name added to the editor host node.
 */
const HOST_CLASS = 'jp-ObservableJSONWidget-host';

/**
 * The class name added to the button area.
 */
const BUTTON_AREA_CLASS = 'jp-ObservableJSONWidget-buttons';

/**
 * The class name added to the revert button.
 */
const REVERT_CLASS = 'jp-ObservableJSONWidget-revertButton';

/**
 * The class name added to the commit button.
 */
const COMMIT_CLASS = 'jp-ObservableJSONWidget-commitButton';


/**
 * An observable JSON value.
 */
export
interface IObservableJSON extends IObservableMap<JSONValue> {
  /**
   * Serialize the model to JSON.
   */
  toJSON(): JSONObject;
}


/**
 * The namespace for IObservableJSON related interfaces.
 */
export
namespace IObservableJSON {
  /**
   * A type alias for observable JSON changed args.
   */
  export
  type IChangedArgs = ObservableMap.IChangedArgs<JSONValue>;
}


/**
 * A concrete Observable map for JSON data.
 */
export
class ObservableJSON extends ObservableMap<JSONValue> {
  /**
   * Construct a new observable JSON object.
   */
  constructor(options: ObservableJSON.IOptions = {}) {
    super({
      itemCmp: deepEqual,
      values: options.values
    });
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): JSONObject {
    let out: JSONObject = Object.create(null);
    for (let key of this.keys()) {
      let value = this.get(key);
      if (isPrimitive(value)) {
        out[key] = value;
      } else {
        out[key] = JSON.parse(JSON.stringify(value));
      }
    }
    return out;
  }
}


/**
 * The namespace for ObservableJSON static data.
 */
export
namespace ObservableJSON {
  /**
   * The options use to initialize an observable JSON object.
   */
  export
  interface IOptions {
    /**
     * The optional intitial value for the object.
     */
    values?: JSONObject;
  }

  /**
   * An observable JSON change message.
   */
  export
  class ChangeMessage extends Message {
    /**
     * Create a new metadata changed message.
     */
    constructor(args: IObservableJSON.IChangedArgs) {
      super('jsonvalue-changed');
      this.args = args;
    }

    /**
     * The arguments of the change.
     */
    readonly args: IObservableJSON.IChangedArgs;
  }
}


/**
 * A widget for editing observable JSON.
 */
export
class ObservableJSONWidget extends Widget {
  /**
   * Construct a new metadata editor.
   */
  constructor(options: ObservableJSONWidget.IOptions) {
    super({ node: Private.createEditorNode() });
    this.addClass(METADATA_CLASS);
    let host = this.editorHostNode;
    let model = new CodeEditor.Model();
    model.value.text = 'No data!';
    model.mimeType = 'application/json';
    model.value.changed.connect(this._onValueChanged, this);
    this.model = model;
    this.editor = options.editorFactory({ host, model });
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
    value.changed.connect(this._onSourceChanged, this);
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
   * Handle `before_detach` messages for the widget.
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
        !this._changeGuard && !deepEqual(value, this._originalValue)
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
    let current = this._getContent() as JSONObject;
    let old = this._originalValue;
    let user = JSON.parse(model.value.text) as JSONObject;
    let source = this.source;
    // If it is in user and has changed from old, set in current.
    for (let key in user) {
      if (!deepEqual(user[key], old[key])) {
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
      this._originalValue = {};
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
  private _originalValue: JSONObject;
  private _changeGuard = false;
}


/**
 * The static namespace ObservableJSONWidget class statics.
 */
export
namespace ObservableJSONWidget {
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
    return realize(
      h.div({ className: METADATA_CLASS },
        h.div({ className: BUTTON_AREA_CLASS },
          h.span({ className: REVERT_CLASS, title: cancelTitle }),
          h.span({ className: COMMIT_CLASS, title: confirmTitle })),
        h.div({ className: HOST_CLASS }))
    );
  }
}
