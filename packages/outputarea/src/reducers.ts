/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import {
  Table, combineReducers
} from '@phosphor/datastore';

import {
  IMimeModel
} from '@jupyterlab/rendermime';

import {
  IOutputArea, IOutputItem, IOutputStoreState
} from './models';


/**
 * The root reducer for an output store.
 */
export
const reducer = combineReducers<IOutputStoreState>({
  mimeModelTable,
  outputItemTable,
  outputAreaTable,
  outputListTable
});


/**
 * A reducer which handles actions for the `mimeModelTable` branch.
 */
function mimeModelTable(table: Table.RecordTable<IMimeModel>, action: OutputAction): Table.RecordTable<IMimeModel> {
  switch (action.type) {
  case '@jupyterlab/outputarea/CREATE_MIME_MODEL':
    return Table.insert(table, action.modelId, action.model);
  default:
    return table;
  }
}


/**
 * A reducer which handles actions for the `outputItemTable` branch.
 */
function outputItemTable(table: Table.RecordTable<IOutputItem>, action: OutputAction): Table.RecordTable<IOutputItem> {
  switch (action.type) {
  case '@jupyterlab/outputarea/CREATE_OUTPUT_ITEM':
    return Table.insert(table, action.itemId, action.item);
  default:
    return table;
  }
}


/**
 * A reducer which handles actions for the `outputAreaTable` branch.
 */
function outputAreaTable(table: Table.RecordTable<IOutputArea>, action: OutputAction): Table.RecordTable<IOutputArea> {
  switch (action.type) {
  case '@jupyterlab/outputarea/CREATE_OUTPUT_AREA':
    return Table.insert(table, action.areaId, action.area);
  default:
    return table;
  }
}


/**
 * A reducer which handles actions for the `outputListTable` branch.
 */
function outputListTable(table: Table.ListTable<string>, action: OutputAction): Table.ListTable<string> {
  switch (action.type) {
  case '@jupyterlab/outputarea/CREATE_OUTPUT_LIST':
    return Table.insert(table, action.listId, action.list);
  case '@jupyterlab/outputarea/ADD_OUTPUT':
    return Table.push(table, action.listId, [action.itemId]);
  case '@jupyterlab/outputarea/SET_OUTPUTS':
    return Table.replace(table, action.listId, action.list);
  default:
    return table;
  }
}
