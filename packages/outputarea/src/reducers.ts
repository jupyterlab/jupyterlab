/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import {
  ITable, TableHelpers
} from '@phosphor/datastore';


export
const reducer = combineReducers<IOutputStoreState>({
  // mimeModelTable,
  outputItemTable,
  outputAreaTable,
  outputListTable
});


/**
 *
 */
function outputItemTable(table: Table.RecordTable<IOutputItem>, action: OutputAction): Table.RecordTable<IOutputItem> {
  switch (action.type) {
  case '@jupyterlab/outputarea/CREATE_OUTPUT_ITEM':
    return Table.insert(table, action.id, action.item);
  default:
    return table;
  }
}


/**
 *
 */
function outputAreaTable(table: Table.RecordTable<IOutputArea>, action: OutputAction): Table.RecordTable<IOutputArea> {
  switch (action.type) {
  case '@jupyterlab/outputarea/CREATE_OUTPUT_AREA':
    return Table.insert(table, action.id, action.area);
  default:
    return table;
  }
}


/**
 *
 */
function outputListTable(table: Table.ListTable<string>, action: OutputAction): Table.ListTable<string> {
  switch (action.type) {
  case '@jupyterlab/outputarea/ADD_OUTPUT':
    return Table.push(table, action.listId, [action.itemId]);
  case '@jupyterlab/outputarea/CLEAR_OUTPUTS':
    return Table.replace(table, action.id, []);
  default:
    return table;
  }
}
