/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import {
  nbformat
} from '@jupyterlab/coreutils';

import {
  JSONExt, ReadonlyJSONObject
} from '@phosphor/coreutils';

import {
  DataStore
} from '@phosphor/datastore';

import {
  List, Map, Record
} from 'immutable';


/**
 * A record type for an execute result output.
 */
export
class ExecuteResultOutput extends Record<{
  /**
   * The type of the output.
   */
  type: 'execute_result';

  /**
   * Whether the output is trusted.
   */
  trusted: boolean;

  /**
   * The mime data for the output.
   */
  data: ReadonlyJSONObject;

  /**
   * The the mime metadata for the output.
   */
  metadata: ReadonlyJSONObject;

  /**
   * The execution count of the output.
   */
  executionCount: nbformat.ExecutionCount;
}>({
  type: 'execute_result',
  trusted: false,
  data: JSONExt.emptyObject,
  metadata: JSONExt.emptyObject,
  executionCount: null
}) { }


/**
 * A record type for a display data output.
 */
export
class DisplayDataOutput extends Record<{
  /**
   * The type of the output.
   */
  type: 'display_data';

  /**
   * Whether the output is trusted.
   */
  trusted: boolean;

  /**
   * The mime data for the output.
   */
  data: ReadonlyJSONObject;

  /**
   * The the mime metadata for the output.
   */
  metadata: ReadonlyJSONObject;

  /**
   * The display id for the output.
   */
  displayId: string | null;
}>({
  type: 'display_data',
  trusted: false,
  data: JSONExt.emptyObject,
  metadata: JSONExt.emptyObject,
  displayId: null
}) { }


/**
 * A record type for a stream output.
 */
export
class StreamOutput extends Record<{
  /**
   * The type of the output.
   */
  type: 'stream';

  /**
   * Whether the output is trusted.
   */
  trusted: boolean;

  /**
   * The name of the stream.
   */
  name: nbformat.StreamType;

  /**
   * The stream's text output.
   */
  text: string;
}>({
  type: 'stream',
  trusted: false,
  name: 'stdout',
  text: ''
}) { }


/**
 * A record type for an error output.
 */
export
class ErrorOutput extends Record<{
  /**
   * The type of the output.
   */
  type: 'error';

  /**
   * Whether the output is trusted.
   */
  trusted: boolean;

  /**
   * The name of the error.
   */
  ename: string;

  /**
   * The value, or message, of the error.
   */
  evalue: string;

  /**
   * The error's traceback.
   */
  traceback: string;
}>({
  type: 'error',
  trusted: false,
  ename: '',
  evalue: '',
  traceback: ''
}) { }


/**
 * A type alias of the output record types.
 */
export
type OutputItem = (
  ExecuteResultOutput |
  DisplayDataOutput |
  StreamOutput |
  ErrorOutput
);


/**
 * A record type for an output area.
 */
export
class OutputArea extends Record<{
  /**
   * Whether the output area is trusted.
   */
  trusted: boolean;

  /**
   * Whether the outputs are waiting to be cleared.
   */
  pendingClear: boolean;

  /**
   * The list of output item ids for the area.
   */
  outputItemIds: List<string>;
}>({
  trusted: false,
  pendingClear: false,
  outputItemIds: List<string>()
}) { }


/**
 * The base type for the output store state.
 *
 * #### Notes
 * This type is defined separately from the record type so that
 * the output store type can be extended by external code.
 */
export
type BaseOutputStoreState = {
  /**
   * The table of output items keyed by id.
   */
  outputItemTable: Map<string, OutputItem>;

  /**
   * The table of output areas keyed by id.
   */
  outputAreaTable: Map<string, OutputArea>;
};


/**
 * The defaults for the output store state.
 *
 * #### Notes
 * These defaults are defined separately from the record type so that
 * the output store type can be extended by external code.
 */
export
const defaultOutputStoreState: BaseOutputStoreState = {
  outputItemTable: Map<string, OutputItem>(),
  outputAreaTable: Map<string, OutputArea>()
};


/**
 * A record type for the output store state.
 *
 * #### Notes
 * This record type will only be used by code which *does not* extend
 * the output store type.
 */
export
class OutputStoreState extends Record<BaseOutputStoreState>(defaultOutputStoreState) { }


/**
 * A type alias for the output store.
 */
export
type OutputStore = DataStore<OutputStoreState>;
