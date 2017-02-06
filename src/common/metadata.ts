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
    }

    /**
     * Get the text area used by the metadata editor.
     */
    get textarea(): HTMLTextAreaElement {
      return this.node.getElementsByTagName('textarea')[0];
    }

    /**
     * The metadata owner.
     */
    get owner(): IOwner | null {
      return this._owner;
    }
    set owner(value: IOwner | null) {
      this._owner = value;
      this._handleOwner();
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
          break;
        case 'focus':
          break;
        case 'blur':
          // Update the metadata if necessary.
          if (!this._inputDirty && this._dataDirty) {
            this._handleOwner();
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
      let node = this.textarea;
      node.addEventListener('input', this);
      node.addEventListener('focus', this);
      node.addEventListener('blur', this);
    }

    /**
     * Handle `before_detach` messages for the widget.
     */
    protected onBeforeDetach(msg: Message): void {
      let node = this.textarea;
      node.removeEventListener('input', this);
      node.removeEventListener('focus', this);
      node.removeEventListener('blur', this);
    }

    /**
     * Handle a change to the metadata of the active cell.
     */
    protected onMetadataChanged(msg: ChangeMessage) {
      if (document.activeElement === this.textarea) {
        this._dataDirty = true;
      }
      this._handleOwner();
    }

    /**
     * Handle the owner contents.
     */
    private _handleOwner(): void {
      this._dataDirty = false;
      this._inputDirty = false;
      let owner = this.owner;
      if (owner) {
        let content: JSONObject = {};
        each(owner.listMetadata(), key => {
          // Do not show the trusted metadata.
          if (key === 'trusted') {
            return;
          }
          content[key] = owner.getMetadata(key).getValue();
        });
        this.textarea.value = JSON.stringify(content, null, 2);
      } else {
        this.textarea.value = 'No active cell!';
      }
    }

    private _dataDirty = false;
    private _inputDirty = false;
    private _owner: IOwner | null;
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
                h.textarea()
              );
    return realize(vnode);
  }
}
