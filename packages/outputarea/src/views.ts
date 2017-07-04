/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import {
  IRenderMime, RenderMime
} from '@jupyterlab/rendermime';

import {
  JSONExt, ReadonlyJSONObject
} from '@phosphor/coreutils';

import {
  ConflatableMessage, Message, MessageLoop
} from '@phosphor/messaging';

import {
  PanelLayout, Widget
} from '@phosphor/widgets';

import {
  List
} from 'immutable';

import {
  SetOutputDataAction
} from './actions';

import {
  ErrorOutput, OutputArea, OutputItem, OutputStore
} from './models';


/**
 * A widget which displays an output area.
 */
export
class OutputAreaView extends Widget {
  /**
   * Construct a new output area view.
   *
   * @param options - The options for initializing the view.
   */
  constructor(options: OutputAreaView.IOptions) {
    super();
    this.addClass('jp-OutputAreaView');
    this.store = options.store;
    this.areaId = options.areaId;
    this.store.changed.connect(this._onStoreChanged, this);
    this.layout = new PanelLayout();
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    this._area = null;
    super.dispose();
  }

  /**
   * The output store which holds the output area.
   */
  readonly store: OutputStore;

  /**
   * The id of the output area.
   */
  readonly areaId: string;

  /**
   * The rendermime used for rendering.
   */
  readonly rendermime: RenderMime;

  /**
   * Request that the output area be refreshed.
   *
   * #### Notes
   * This is a batched asynchronous request.
   */
  refresh(): void {
    MessageLoop.postMessage(this, Private.RefreshRequest);
  }

  /**
   * Process a message sent to the widget.
   */
  processMessage(msg: Message): void {
    if (msg.type === 'refresh-request') {
      this._onRefreshRequest(msg);
    } else {
      super.processMessage(msg);
    }
  }

  /**
   * A message handler invoked on a `'before-attach'` message.
   */
  protected onBeforeAttach(msg: Message): void {
    this.refresh();
  }

  /**
   * A message handler invoked on a `'refresh-request'` message.
   */
  private _onRefreshRequest(msg: Message): void {
    // Update the node trusted flag.
    this.node.dataset['trusted'] = `${this._area ? this._area.trusted : false}`;

    // Collect a temporary mapping of the current item views.
    let layout = this.layout as PanelLayout;
    let itemIdMap: { [key: string]: OutputItemView } = {};
    for (let widget of layout.widgets) {
      if (widget instanceof OutputItemView) {
        itemIdMap[widget.id] = widget;
      }
    }

    // Unpack the store and rendermime.
    let { store, rendermime } = this;

    // Get the list of output ids.
    let idList = this._area ? this._area.outputItemIds : List<string>();

    // Synchronize the layout with the list.
    for (let i = 0; i < idList.size; ++i) {
      let view: OutputItemView;
      let itemId = idList.get(i);
      if (itemId in itemIdMap) {
        view = itemIdMap[itemId];
        delete itemIdMap[itemId];
      } else {
        view = new OutputItemView({ store, itemId, rendermime });
        view.addClass('jp-OutputAreaView-outputItem');
      }
      if (layout.widgets[i] !== view) {
        layout.insertWidget(i, view);
      }
    }

    // Dispose of any remaining stale item views.
    for (let key in itemIdMap) {
      itemIdMap[key].dispose();
    }
  }

  /**
   * A handler for the output store `changed` signal.
   */
  private _onStoreChanged(): void {
    // Look up the output area.
    let area = this.store.state.outputAreaTable.get(this.areaId) || null;

    // Bail early if the output area did not change.
    if (this._area === area) {
      return;
    }

    // Update the internal output area.
    this._area = area;

    // Schedule a refresh.
    this.refresh();
  }

  private _area: OutputArea | null = null;
}


/**
 * The namespace for the `OutputAreaView` class statics.
 */
export
namespace OutputAreaView {
  /**
   * An options object for initializing an output area view.
   */
  export
  interface IOptions {
    /**
     * The output store which holds the output area.
     */
    store: OutputStore;

    /**
     * The id of the output area.
     */
    areaId: string;

    /**
     * The rendermime to use for rendering.
     */
    rendermime: RenderMime;
  }
}


/**
 * A widget which displays a single item for an output area.
 */
export
class OutputItemView extends Widget {
  /**
   * Construct a new output item view.
   *
   * @param options - The options for initializing the view.
   */
  constructor(options: OutputItemView.IOptions) {
    super();
    this.addClass('jp-OutputItemView');
    this.store = options.store;
    this.itemId = options.itemId;
    this.rendermime = options.rendermime;
    this.store.changed.connect(this._onStoreChanged, this);
    this.layout = new PanelLayout();
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    this._item = null;
    this._mimeType = '';
    this._renderer = null;
    super.dispose();
  }

  /**
   * The output store which holds the output item.
   */
  readonly store: OutputStore;

  /**
   * The id of the output item.
   */
  readonly itemId: string;

  /**
   * The rendermime used for rendering.
   */
  readonly rendermime: RenderMime;

  /**
   * Request that the output be refreshed.
   *
   * #### Notes
   * This is a batched asynchronous request.
   */
  refresh(): void {
    MessageLoop.postMessage(this, Private.RefreshRequest);
  }

  /**
   * Process a message sent to the widget.
   */
  processMessage(msg: Message): void {
    if (msg.type === 'refresh-request') {
      this._onRefreshRequest(msg);
    } else {
      super.processMessage(msg);
    }
  }

  /**
   * A message handler invoked on a `'before-attach'` message.
   */
  protected onBeforeAttach(msg: Message): void {
    this.refresh();
  }

  /**
   * A message handler invoked on a `'refresh-request'` message.
   */
  private _onRefreshRequest(msg: Message): void {
    // Clear the content if there is no output item to render.
    if (!this._item) {
      // Clear the node state.
      this.node.dataset['output-type'] = '';
      this.node.dataset['trusted'] = `${false}`;
      this.node.dataset['mime-type'] = '';

      // Clear the internal mime type.
      this._mimeType = '';

      // Dispose of the old renderer.
      if (this._renderer) {
        this._renderer.dispose();
        this._renderer = null;
      }

      // Finished.
      return;
    }

    // Update the node state.
    this.node.dataset['output-type'] = this._item.type;
    this.node.dataset['trusted'] = `${this._item.trusted}`;

    // Create the new mime model.
    let model: IRenderMime.IMimeModel = {
      trusted: this._item.trusted,
      data: Private.getData(this._item),
      metadata: Private.getMetadata(this._item),
      setData: this._setData
    };

    // Look up the preferred mime type for the model.
    let mimeType = this.rendermime.preferredMimeType(model) || '';

    // Update the existing renderer in-place if possible.
    if (this._renderer && this._mimeType === mimeType) {
      this._renderer.renderModel(model);
      return;
    }

    // Update the internal mime type.
    this._mimeType = mimeType;

    // Update the node mime type.
    this.node.dataset['mime-type'] = mimeType;

    // Dispose the existing renderer.
    if (this._renderer) {
      this._renderer.dispose();
      this._renderer = null;
    }

    // Bail if there is no mime type to render.
    if (!mimeType) {
      return;
    }

    // Create a new renderer for the mime type.
    this._renderer = this.rendermime.createRenderer(mimeType);
    this._renderer.addClass('jp-OutputItemView-renderer');
    this._renderer.renderModel(model);

    // Add the renderer to the layout.
    (this.layout as PanelLayout).addWidget(this._renderer);
  }

  /**
   * A handler for the output store `changed` signal.
   */
  private _onStoreChanged(): void {
    // Look up the output item.
    let item = this.store.state.outputItemTable.get(this.itemId) || null;

    // Bail early if the output item did not change.
    if (this._item === item) {
      return;
    }

    // Update the internal output item.
    this._item = item;

    // Schedule a refresh.
    this.refresh();
  }

  /**
   * A callback function for setting the mime data.
   */
  private _setData = (options: IRenderMime.IMimeModel.ISetDataOptions) => {
    // Parse the data option.
    let data = options.data || null;

    // Parse the metadata option.
    let metadata = options.metadata || null;

    // Dispatch the set output data action.
    this.store.dispatch(new SetOutputDataAction(this.itemId, data, metadata));
  };

  private _mimeType = '';
  private _item: OutputItem | null = null;
  private _renderer: IRenderMime.IRenderer | null;
}


/**
 * The namespace for the `OutputItemView` class statics.
 */
export
namespace OutputItemView {
  /**
   * An options object for initializing an output item view.
   */
  export
  interface IOptions {
    /**
     * The output store which holds the output item.
     */
    store: OutputStore;

    /**
     * The id of the output item.
     */
    itemId: string;

    /**
     * The rendermime to use for rendering.
     */
    rendermime: RenderMime;
  }
}


/**
 * The namespace for the module implementation details.
 */
namespace Private {
  /**
   * A singleton conflatable refresh request message.
   */
  export
  const RefreshRequest = new ConflatableMessage('refresh-request');

  /**
   * Get the mime data for an output item.
   */
  export
  function getData(item: OutputItem): ReadonlyJSONObject {
    switch (item.type) {
    case 'execute_result':
    case 'display_data':
      return item.data;
    case 'stream':
      return { [`application/vnd.jupyter.${item.name}`]: item.text };
    case 'error':
      return { 'application/vnd.jupyter.stderr': formatError(item) };
    default:
      return JSONExt.emptyObject;
    }
  }

  /**
   * Get the mime metadata for an output item.
   */
  export
  function getMetadata(item: OutputItem): ReadonlyJSONObject {
    switch (item.type) {
    case 'execute_result':
    case 'display_data':
      return item.metadata;
    default:
      return JSONExt.emptyObject;
    }
  }

  /**
   * Format the error text for an error output.
   */
  function formatError(item: ErrorOutput): string {
    return item.traceback || `${item.ename}: ${item.evalue}`;
  }
}
