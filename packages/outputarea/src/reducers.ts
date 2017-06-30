/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import {
  JSONObject
} from '@phosphor/coreutils';

import {
  Table, uuid4
} from '@phosphor/datastore';

import {
  AppendOutputAction, ClearOutputsAction, OutputAction, OutputActionType
} from './actions';

import {
  OutputState
} from './models';


/**
 * The mime type for stdout.
 */
const STDOUT = 'application/vnd.jupyter.stdout';

/**
 * The mime type for stderr.
 */
const STDERR = 'application/vnd.jupyter.stderr';


/**
 * The root reducer for the output area package.
 */
export
function outputReducer(state: OutputState, action: OutputAction): OutputState {
  switch (action.type) {
  case OutputActionType.APPEND_OUTPUT:
    return appendOutput(state, action);
  case OutputActionType.CLEAR_OUTPUTS:
    return clearOutputs(state, action);
  default:
    return state;
  }
}


/**
 * Append an output item to an output area.
 */
function appendOutput(state: OutputState, action: AppendOutputAction): OutputState {
  // Unpack the area id and output.
  let { areaId, output } = action;

  // Look up the output area object.
  let area = state.outputAreaTable[areaId];

  // Try to merge the output first, if possible.
  let mergeState = mergeOutputs(state, area, output);

  // Return the new state if the output was merged.
  if (state !== mergeState) {
    return mergeState;
  }

  // Create the mime data for the output.
  let mimeData = createMimeData(output);

  // Create the mime metadata for the output.
  let mimeMetadata = createMimeMetadata(output);

  // Create the uuids needed for the tables.
  let itemId = uuid4();
  let mimeDataId = uuid4();
  let mimeMetadataId = uuid4();

  // Create the output item.
  let item: OutputItem = {
    type: output.output_type,
    trusted: area.trusted,
    mimeDataId,
    mimeMetadataId,
    streamType: getStreamType(output),
    executionCount: getExecutionCount(output)
  };

  // Add the mime bundles to the table.
  let mimeBundleTable = Table.apply(state.mimeBundleTable, [
    Table.opInsert(mimeDataId, mimeData),
    Table.opInsert(mimeMetadataId, mimeMetadata)
  ]);

  // Add the output item to the table.
  let outputItemTable = Table.apply(state.outputItemTable,
    Table.opInsert(itemId, item)
  );

  // Add the item id to the output list.
  let outputListTable = Table.apply(state.outputListTable,
    Table.opAppend(area.outputListId, [itemId])
  );

  // Return the updated state.
  return { ...state, mimeBundleTable, outputItemTable, outputListTable };
}


/**
 * Clear the outputs for an output area.
 */
function clearOutputs(state: OutputState, action: ClearOutputsAction): OutputState {
  // Look up the output list id.
  let outputListId = state.outputAreaTable[action.areaId].outputListId;

  // Clear the output list in the table.
  let outputListTable = Table.apply(state.outputListTable,
    Table.opReplace(outputListId, [])
  );

  // Return the updated state.
  return { ...state, outputListTable };
}


/**
 * Create the mime data for an output.
 */
function createMimeData(output: nbformat.IOutput): JSONObject {
  let data: JSONObject;
  switch (true) {
  case nbformat.isExecuteResult(output):
  case nbformat.isDisplayUpdate(output):
  case nbformat.isDisplayData(output):
    data = normalizeMimeBundle(output.data);
    break;
  case nbformat.isStream(output):
    data = { [getMimeType(output)]: output.text.join('\n') };
    break;
  case nbformat.isError(output):
    data = { [stderr]: formatError(output) };
    break;
  default:
    data = {};
    break;
  }
  return data;
}


/**
 * Create the mime metadata for an output.
 */
function createMimeMetadata(output: nbformat.IOutput): JSONObject {
  let metadata: JSONObject;
  switch (true) {
  case nbformat.isExecuteResult(output):
  case nbformat.isDisplayData(output):
  case nbformat.isDisplayUpdate(output):
    metadata = JSONExt.deepCopy(output.metadata);
    break;
  default:
    metadata = {};
    break;
  }
  return metadata;
}


/**
 * Format the error text for an error output.
 */
function formatError(output: nbformat.IError): string {
  return output.traceback.join('\n') || `${output.ename}: ${output.evalue}`;
}


/**
 * Get the mimetype for an output stream.
 */
function getMimeType(output: nbformat.IStream): string {
  return output.name === 'stdout' ? STDOUT : STDERR;
}


/**
 * Get the stream type for an output.
 */
function getStreamType(output: nbformat.IOutput): string | null {
  return nbformat.isStream(output) ? output.name : null;
}


/**
 * Get the execution count for an output.
 */
function getExecutionCount(output: nbformat.IOutput): nbformat.ExecutionCount {
  return nbformat.isExecuteResult(output) ? output.execution_count: null;
}


/**
 * Create a normalized copy of a mime bundle.
 *
 * Top-level multiline strings (`string[]`) are joined with `\n`.
 */
function normalizeMimeBundle(bundle: IMimeBundle): JSONObject {
  let result: JSONObject = {};
  for (let key in bundle) {
    let value = bundle[key];
    if (Array.isArray(value)) {
      result[key] = value.join('\n');
    } else {
      result[key] = JSONExt.deepCopy(value);
    }
  }
  return result;
}


/**
 * Merge an output with an existing output area, if possible.
 *
 * Returns the original state if no merge was performed.
 */
function mergeOutputs(state: OutputState, area: OutputArea, output: nbformat.IOutput): OutputState {
  // Bail early if the output is not a stream.
  if (!nbformat.isStream(output)) {
    return state;
  }

  // Look up the output list for the area.
  let outputList = state.outputListTable[area.outputListId];

  // Bail early if the area has no outputs.
  if (outputList.length === 0) {
    return state;
  }

  // Look up the last output item for the area.
  let lastItem = state.outputItemTable[outputList[outputList.length - 1]];

  // Bail if the outputs cannot be merged.
  if (lastItem.type !== 'stream' || lastItem.streamType !== output.name) {
    return state;
  }

  // Shallow copy the mime data for the last stream item.
  let mimeData = { ...state.mimeBundleTable[lastItem.mimeDataId] };

  // Add the new output text to the existing text.
  mimeData[getMimeType(output)] += output.text.join('\n');

  // Replace the mime bundle in the table.
  let mimeBundleTable = Table.apply(state.mimeBundleTable,
    Table.opReplace(lastItem.mimeDataId, mimeData)
  );

  // Return the updated state.
  return { ...state, mimeBundleTable };
}
