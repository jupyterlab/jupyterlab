// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  each
} from 'phosphor/lib/algorithm/iteration';

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  IIterator
} from 'phosphor/lib/algorithm/iteration';

import {
  JSONObject, JSONValue
} from 'phosphor/lib/algorithm/json';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  h, realize
} from 'phosphor/lib/ui/vdom';

import {
  IChangedArgs
} from '../common/interfaces';


/**
 * The class name added to a MetadataEditor instance.
 */
const METADATA_CLASS = 'jp-MetadataEditor';

/**
 * The class name added when the Metadata editor contains invalid JSON.
 */
const ERROR_CLASS = 'jp-mod-error';

/**
 * The class name added to the button area.
 */
const BUTTON_AREA = 'jp-MetadataEditor-buttons';

/**
 * The class name added to the cancel button.
 */
const CANCEL_BUTTON = 'jp-MetadataEditor-cancelButton';

/**
 * The class name added to the cancel button.
 */
const CONFIRM_BUTTON = 'jp-MetadataEditor-confirmButton';


/**
 * A class used to interact with user level metadata.
 */
export
interface IMetadataCursor {
  /**
   * The metadata namespace.
   */
  readonly name: string;

  /**
   * Get the value of the metadata.
   */
  getValue(): JSONValue;

  /**
   * Set the value of the metdata.
   */
  setValue(value: JSONValue): void;
}


/**
 * An implementation of a metadata cursor.
 */
export
class MetadataCursor implements IMetadataCursor {
  /**
   * Construct a new metadata cursor.
   *
   * @param name - The metadata namespace key.
   *
   * @param read - The read callback.
   *
   * @param write - The write callback.
   */
  constructor(name: string, read: () => any, write: (value: JSONValue) => void) {
    this._name = name;
    this._read = read;
    this._write = write;
  }

  /**
   * Get the namespace key of the metadata.
   */
  get name(): string {
    return this._name;
  }

  /**
   * Dispose of the resources used by the cursor.
   *
   * #### Notes
   * This is not meant to be called by user code.
   */
  dispose(): void {
    this._read = null;
    this._write = null;
  }

  /**
   * Get the value of the namespace data.
   */
  getValue(): JSONValue {
    let read = this._read;
    return read();
  }

  /**
   * Set the value of the namespace data.
   */
  setValue(value: JSONValue): void {
    let write = this._write;
    write(value);
  }

  private _name = '';
  private _read: () => JSONValue = null;
  private _write: (value: JSONValue) => void = null;
}


/**
 * The namespace for `MetadataCursor` statics.
 */
export
namespace MetadataCursor {
  /**
   * A class which supplies metadata.
   */
  export
  interface IOwner {
    /**
     * Get a metadata cursor for the object.
     *
     * #### Notes
     * Metadata associated with the nbformat spec are set directly
     * on the model.  This method is used to interact with a namespaced
     * set of metadata on the object.
     */
    getMetadata(name: string): IMetadataCursor;

    /**
     * List the metadata namespace keys for the object.
     *
     * #### Notes
     * Metadata associated with the nbformat are not included.
     */
    listMetadata(): IIterator<string>;
  }

  /**
   * A metadata changed message.
   */
  export
  class ChangeMessage extends Message {
    /**
     * Create a new metadata changed message.
     */
    constructor(args: IChangedArgs<JSONValue>) {
      super('metadata-changed');
      this.args = args;
    }

    /**
     * The arguments of the metadata change.
     */
    readonly args: IChangedArgs<JSONValue>;
  }

  /**
   * A widget that supports the editing of metadata.
   */
  export
  class Editor extends Widget {
    /**
     * Construct a new metadata editor.
     */
    constructor() {
      super({ node: Private.createMetadataNode() });
      this.addClass(METADATA_CLASS);
    }

    /**
     * Get the text area used by the metadata editor.
     */
    get textareaNode(): HTMLTextAreaElement {
      return this.node.getElementsByTagName('textarea')[0];
    }

    /**
     * Get the cancel button used by the metadata editor.
     */
    get cancelButtonNode(): HTMLElement {
      return this.node.getElementsByClassName(CANCEL_BUTTON)[0] as HTMLElement;
    }

    /**
     * Get the confirm button used by the metadata editor.
     */
    get confirmButtonNode(): HTMLElement {
      return this.node.getElementsByClassName(CONFIRM_BUTTON)[0] as HTMLElement;
    }

    /**
     * The metadata owner.
     */
    get owner(): IOwner | null {
      return this._owner;
    }
    set owner(value: IOwner | null) {
      this._owner = value;
      this._setValue();
    }

    /**
     * Process a message sent to the widget.
     *
     * @param msg - The message sent to the widget.
     */
    processMessage(msg: Message): void {
      super.processMessage(msg);
      switch (msg.type) {
      case 'metadata-changed':
        this.onMetadataChanged(msg as ChangeMessage);
        break;
      default:
        break;
      }
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
        case 'input':
          this._inputDirty = true;
          try {
            JSON.parse(this.textareaNode.value);
            this.removeClass(ERROR_CLASS);
          } catch (err) {
            this.addClass(ERROR_CLASS);
          }
          break;
        case 'blur':
          // Update the metadata if necessary.
          if (!this._inputDirty && this._dataDirty) {
            this._setValue();
          }
          break;
        case 'click':
          let target = event.target as HTMLElement;
          if (target === this.cancelButtonNode) {
            this._setValue();
          } else if (target === this.confirmButtonNode) {
            if (!this.hasClass(ERROR_CLASS)) {
              this._mergeContent();
            }
          }
          break;
        default:
          break;
      }
    }

    /**
     * Handle `after-attach` messages for the widget.
     */
    protected onAfterAttach(msg: Message): void {
      let node = this.textareaNode;
      node.addEventListener('input', this);
      node.addEventListener('blur', this);
      this.cancelButtonNode.addEventListener('click', this);
      this.confirmButtonNode.addEventListener('click', this);
    }

    /**
     * Handle `before_detach` messages for the widget.
     */
    protected onBeforeDetach(msg: Message): void {
      let node = this.textareaNode;
      node.removeEventListener('input', this);
      node.removeEventListener('blur', this);
      this.cancelButtonNode.removeEventListener('click', this);
      this.confirmButtonNode.removeEventListener('click', this);
    }

    /**
     * Handle a change to the metadata of the active cell.
     */
    protected onMetadataChanged(msg: ChangeMessage) {
      if (this._inputDirty || document.activeElement === this.textareaNode) {
        this._dataDirty = true;
        return;
      }
      this._setValue();
    }

    /**
     * Merge the user content.
     */
    private _mergeContent(): void {
      let current = this._getContent();
      let old = this._originalValue;
      let user = JSON.parse(this.textareaNode.value);
      console.log('current', current);
      console.log('old', old);
      console.log('user', user);
    }

    /**
     * Get the metadata from the owner.
     */
    private _getContent(): JSONObject | undefined {
      let owner = this.owner;
      if (!owner) {
        return void 0;
      }
      let content: JSONObject = {};
      each(owner.listMetadata(), key => {
        // Do not show the trusted metadata.
        if (key === 'trusted') {
          return;
        }
        content[key] = owner.getMetadata(key).getValue();
      });
      return content;
    }

    /**
     * Set the value given the owner contents.
     */
    private _setValue(): void {
      this._dataDirty = false;
      this._inputDirty = false;
      let textarea = this.textareaNode;
      let content = this._getContent();
      if (content === void 0) {
        textarea.value = 'No data!';
        this._originalValue = {};
      } else {
        let value = JSON.stringify(content, null, 2);
        textarea.value = value;
        this._originalValue = content;
      }
    }

    private _dataDirty = false;
    private _inputDirty = false;
    private _owner: IOwner | null;
    private _originalValue: JSONObject;
  }
}


/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * Create the node for a MetadataEditor.
   */
  export
  function createMetadataNode(): HTMLElement {
    let vnode = h.div({ className: METADATA_CLASS },
                h.label({}, 'Cell Metadata'),
                h.div({ className: BUTTON_AREA },
                  h.span({ className: CANCEL_BUTTON }),
                  h.span({ className: CONFIRM_BUTTON })),
                h.textarea()
              );
    return realize(vnode);
  }
}
