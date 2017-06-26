/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/


/**
 *
 */
export
function reducer(state: IOutputStoreState, action: OutputAction): IOutputStoreState {
  return {
    ...state,
    mimeModels: mimeModels(state, action),
    outputItems: outputItems(state, action),
    outputAreas: outputAreas(state, action)
  };
}


/**
 *
 */
function mimeModels(state: ITable<IMimeModel>, action: OutputAction): ITable<IMimeModel> {
  switch (action.type) {
  case '@jupyterlab/outputarea/CREATE_MIME_MODEL':
    return createNewEntry(state, action.id, action.model);
  default:
    return state;
  }
}


/**
 *
 */
function outputItems(state: ITable<IOutputItem>, action: OutputAction): ITable<IOutputItem> {
  switch (action.type) {
  case '@jupyterlab/outputarea/CREATE_OUTPUT_ITEM':
    return createNewEntry(state, action.id, action.item);
  default:
    return state;
  }
}


/**
 *
 */
function outputAreas(state: ITable<IOutputArea>, action: OutputAction): ITable<IOutputArea> {
  switch (action.type) {
  case '@jupyterlab/outputarea/ADD_OUTPUT_ITEM':
    return addOutputItem(state, action);
  default:
    return state;
  }
}


/**
 *
 */
function createNewEntry<T>(table: ITable<T>, id: string, entry: T): ITable<T> {
  if (id in table.byId) {
    throw new Error(`Id '${id}' already exists.`);
  }

  return { ...table, maxId: maxId(table.maxId), byId: byId(table.byId) };

  function byId(map: IByIdMap<T>): IByIdMap<T> {
    return { ...map, [id]: entry };
  }

  function maxId(maxId: number): number {
    return Math.max(maxId, id);
  }
}


/**
 *
 */
function addOutputItem(table: ITable<IOutputArea>, action: AddOutputItem): ITable<IOutputArea> {
  const { outputAreaId, outputItemId } = action;

  if (!table.byId[outputAreaId]) {
    throw new Error(`Output Area '${outputAreaId}' does not exist.`);
  }

  return { ...table, byId: byId(table.byId) };

  function byId(map: IByIdMap<IOutputArea>): IByIdMap<IOutputArea> {
    return { ...map, [outputAreaId]: outputArea(map[outputAreaId]) };
  }

  function outputArea(area: IOutputArea): IOutputArea {
    return { ...area, outputItemIds: outputItemIds(area.outputItemIds) };
  }

  function outputItemIds(ids: ReadonArray<string>): ReadonArray<string> {
    return [...ids, outputItemId];
  }
}
