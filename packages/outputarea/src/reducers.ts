/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import {
  nbformat
} from '@jupyterlab/coreutils';

import {
  JSONExt
} from '@phosphor/coreutils';

import {
  uuid4
} from '@phosphor/datastore';

import {
  AppendOutputAction, ClearOutputsAction, OutputAction, OutputActionType,
  SetOutputDataAction
} from './actions';

import {
  DisplayDataOutput, ErrorOutput, ExecuteResultOutput, OutputArea, OutputItem,
  OutputStoreState, StreamOutput
} from './models';


/**
 * The root reducer for an output store.
 */
export
function outputStoreReducer(state: OutputStoreState, action: OutputAction): OutputStoreState {
  switch (action.type) {
  case OutputActionType.APPEND_OUTPUT:
    return appendOutput(state, action);
  case OutputActionType.CLEAR_OUTPUTS:
    return clearOutputs(state, action);
  case OutputActionType.SET_OUTPUT_DATA:
    return setOutputData(state, action);
  default:
    return state;
  }
}


/**
 * Append an output item to an output area.
 */
function appendOutput(state: OutputStoreState, action: AppendOutputAction): OutputStoreState {
  // Unpack the area id and output.
  let { areaId, output } = action;

  // Clear the outputs if a clear is pending.
  state = Private.clearOutputsIfNeeded(state, areaId);

  // Look up the output area object.
  let area = state.outputAreaTable.get(areaId);

  // Bail early if the area does not exist.
  if (!area) {
    return state;
  }

  // If the output is a display update, update the matching outputs.
  if (nbformat.isDisplayUpdate(output)) {
    return Private.mergeDisplayUpdate(state, area, output);
  }

  // If the output is a stream, merge it if possible.
  if (nbformat.isStream(output)) {
    // Try to merge with the last stream.
    let merged = Private.mergeStreamOutput(state, area, output);

    // Return the new state if the output was merged.
    if (state !== merged) {
      return merged;
    }
  }

  // Create a UUID for the new output item.
  let itemId = uuid4();

  // Create the new output item.
  let item = Private.createOutputItem(output, area.trusted);

  // Append the output item id to the output area.
  area = area.update('outputItemIds', list => list.push(itemId));

  // Update the root tables in the state.
  return state.withMutations(state => {
    // Set the updated area in the output area table.
    state.set('outputAreaTable', state.outputAreaTable.set(areaId, area));

    // Set the new item in the output item table.
    state.set('outputItemTable', state.outputItemTable.set(itemId, item));
  });
}


/**
 * Clear the outputs for an output area.
 */
function clearOutputs(state: OutputStoreState, action: ClearOutputsAction): OutputStoreState {
  // Unpack the action.
  let { areaId, wait } = action;

  // Look up the output area object.
  let area = state.outputAreaTable.get(areaId);

  // Bail early if the area does not exist.
  if (!area) {
    return state;
  }

  // If no waiting is needed, clear immediately.
  if (!wait) {
    return Private.clearOutputs(state, areaId);
  }

  // Otherwise, set the pending clear flag on the area.
  area = area.set('pendingClear', true);

  // Update the output area table with the new value.
  return state.set('outputAreaTable', state.outputAreaTable.set(areaId, area));
}


/**
 * Set the data and/or metadata for an output item.
 */
function setOutputData(state: OutputStoreState, action: SetOutputDataAction): OutputStoreState {
  // Unpack the action.
  let { itemId, data, metadata } = action;

  // Look up the item.
  let item = state.outputItemTable.get(itemId);

  // Bail if there is nothing to update.
  if (!item || (!data && !metadata)) {
    return state;
  }

  // Bail if the output item cannot be updated.
  if (item.type !== 'execute_result' && item.type !== 'display_data') {
    return state;
  }

  // Update the data and metadata for the item.
  // https://github.com/Microsoft/TypeScript/issues/16917
  item = (item as any).withMutations((item: any) => {
    if (data) {
      item.set('data', data);
    }
    if (metadata) {
      item.set('metadata', metadata);
    }
  });

  // Update the output item table with the new value.
  return state.set('outputItemTable', state.outputItemTable.set(itemId, item));
}


/**
 * The namespace for the module implementation details.
 */
namespace Private {
  /**
   * Clear the outputs if the `pendingClear` flag is set on the area.
   *
   * Returns the original state if no change was made.
   */
  export
  function clearOutputsIfNeeded(state: OutputStoreState, areaId: string): OutputStoreState {
    // Look up the output area object.
    let area = state.outputAreaTable.get(areaId);

    // Bail early if the area does not exist or should not be cleared.
    if (!area || !area.pendingClear) {
      return state;
    }

    // Clear the outputs.
    return clearOutputs(state, areaId);
  }

  /**
   * Clear the outputs for an output area.
   *
   * Returns the original state if no change was made.
   */
  export
  function clearOutputs(state: OutputStoreState, areaId: string): OutputStoreState {
    // Look up the output area object.
    let area = state.outputAreaTable.get(areaId);

    // Bail early if the area does not exist.
    if (!area) {
      return state;
    }

    // Get the list of item ids.
    let itemIds = area.outputItemIds;

    // Update the output area.
    area = area.withMutations(area => {
      // Clear the list of output item ids.
      area.set('outputItemIds', itemIds.clear());

      // Clear the pending clear flag.
      area.set('pendingClear', false);
    });

    // Update the state tables.
    return state.withMutations(state => {
      // Delete all cleared output items from the table.
      state.set('outputItemTable', state.outputItemTable.deleteAll(itemIds));

      // Update the output area table with the new value.
      state.set('outputAreaTable', state.outputAreaTable.set(areaId, area));
    });
  }

  /**
   * Merge a stream output into an existing item, if possible.
   *
   * Returns the original state if a merge is not performed.
   */
  export
  function mergeStreamOutput(state: OutputStoreState, area: OutputArea, output: nbformat.IStream): OutputStoreState {
    // Get the last item id for the area.
    let lastId = area.outputItemIds.last();

    // Bail early if the area is empty.
    if (!lastId) {
      return state;
    }

    // Look up the last output item for the area.
    let lastItem = state.outputItemTable.get(lastId);

    // Bail early if the item does not exist.
    if (!lastItem) {
      return state;
    }

    // Bail if the outputs cannot be merged.
    if (lastItem.type !== 'stream' || lastItem.name !== output.name) {
      return state;
    }

    // Update the text of the last item.
    lastItem = lastItem.set('text', lastItem.text + output.text);

    // Set the updated item in the table.
    return state.set('outputItemTable', state.outputItemTable.set(lastId, lastItem));
  }

  /**
   * Merge a display update output into an existing item, if possible.
   *
   * Returns the original state if a merge is not performed.
   */
  export
  function mergeDisplayUpdate(state: OutputStoreState, area: OutputArea, output: nbformat.IDisplayUpdate): OutputStoreState {
    // Look up the display id for the output.
    let displayId = output.transient.display_id;

    // Bail early if there is no display id.
    if (!displayId) {
      return state;
    }

    // Clone the output data.
    let data = JSONExt.deepCopy(output.data);

    // Clone the output metadata.
    let metadata = JSONExt.deepCopy(output.metadata);

    // Update the matching items in the table.
    let outputItemTable = state.outputItemTable.withMutations(table => {
      // Iterate each output item in the area.
      area.outputItemIds.forEach(id => {
        // Look up the item in the table.
        let item = table.get(id);

        // Skip items which don't exist.
        if (!item) {
          return;
        }

        // Skip items which should not be updated.
        if (item.type !== 'display_data' || item.displayId !== displayId) {
          return;
        }

        // Update the data and metadata for the item.
        item = item.withMutations(item => {
          item.set('data', data);
          item.set('metadata', metadata);
        });

        // Set the new item in the table.
        table.set(id, item);
      });
    });

    // Update the table in the state.
    return state.set('outputItemTable', outputItemTable);
  }

  /**
   * Create an output item for an nbformat output.
   */
  export
  function createOutputItem(output: nbformat.IOutput, trusted: boolean): OutputItem {
    if (nbformat.isExecuteResult(output)) {
      return createExecuteResultOutput(output, trusted);
    }
    if (nbformat.isDisplayData(output)) {
      return createDisplayDataOutput(output, trusted);
    }
    if (nbformat.isStream(output)) {
      return createStreamOutput(output, trusted);
    }
    if (nbformat.isError(output)) {
      return createErrorOutput(output, trusted);
    }
    throw 'unreachable';
  }

  /**
   * Convert an nbformat execute result output to an output item.
   */
  function createExecuteResultOutput(output: nbformat.IExecuteResult, trusted: boolean): ExecuteResultOutput {
    // Unpack the output.
    let { data, metadata, execution_count } = output;

    // Return a new execute result output.
    return new ExecuteResultOutput({
      trusted,
      data: JSONExt.deepCopy(data),
      metadata: JSONExt.deepCopy(metadata),
      executionCount: execution_count
    });
  }

  /**
   * Convert an nbformat display data output to an output item.
   */
  function createDisplayDataOutput(output: nbformat.IDisplayData, trusted: boolean): DisplayDataOutput {
    // Unpack the output.
    let { data, metadata, transient } = output;

    // Return a new display data output.
    return new DisplayDataOutput({
      trusted,
      data: JSONExt.deepCopy(data),
      metadata: JSONExt.deepCopy(metadata),
      displayId: (transient && transient.display_id) || null
    });
  }

  /**
   * Convert an nbformat stream output to an output item.
   */
  function createStreamOutput(output: nbformat.IStream, trusted: boolean): StreamOutput {
    // Unpack the output.
    let { name, text } = output;

    // Return a new stream output.
    return new StreamOutput({ trusted, name, text });
  }

  /**
   * Convert an nbformat error output to an output item.
   */
  function createErrorOutput(output: nbformat.IError, trusted: boolean): ErrorOutput {
    // Unpack the output.
    let { ename, evalue, traceback } = output;

    // Join the multiline traceback into a single string.
    let tb = traceback.join('\n');

    // Return a new error output.
    return new ErrorOutput({ trusted, ename, evalue, traceback: tb });
  }
}
