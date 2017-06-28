/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import {
  Action, Table
} from '@phosphor/datastore';


/**
 * An action for creating a new mime model.
 */
export
class CreateMimeModel extends Action<'@jupyterlab/outputarea/CREATE_MIME_MODEL'> {
  /**
   * Construct a new action.
   *
   * @param modelId - The unique id to use for the mime model.
   *
   * @param model - The initial state for the mime model.
   */
  constructor(
    public readonly modelId: string,
    public readonly model: IMimeModel) {
    super('@jupyterlab/outputarea/CREATE_MIME_MODEL');
  }
}


/**
 * An action for creating a new output item.
 */
export
class CreateOutputItem extends Action<'@jupyterlab/outputarea/CREATE_OUTPUT_ITEM'> {
  /**
   * Construct a new action.
   *
   * @param itemId - The unique id to use for the output item.
   *
   * @param item - The initial state for the output item.
   */
  constructor(
    public readonly itemId: string,
    public readonly item: IOutputItem) {
    super('@jupyterlab/outputarea/CREATE_OUTPUT_ITEM');
  }
}


/**
 * An action for creating a new output list.
 */
export
class CreateOutputList extends Action<'@jupyterlab/outputarea/CREATE_OUTPUT_LIST'> {
  /**
   * Construct a new action.
   *
   * @param listId - The unique id to use for the output list.
   *
   * @param list - The initial state for the output list.
   */
  constructor(
    public readonly listId: string,
    public readonly list: Table.List<string>) {
    super('@jupyterlab/outputarea/CREATE_OUTPUT_LIST');
  }
}


/**
 * An action for creating a new output area.
 */
export
class CreateOutputArea extends Action<'@jupyterlab/outputarea/CREATE_OUTPUT_AREA'> {
  /**
   * Construct a new action.
   *
   * @param areaId - The unique id to use for the output area.
   *
   * @param area - The initial state for the output area.
   */
  constructor(
    public readonly areaId: string,
    public readonly area: IOutputArea) {
    super('@jupyterlab/outputarea/CREATE_OUTPUT_AREA');
  }
}


/**
 * An action for adding an output item to an output list.
 */
export
class AddOutput extends Action<'@jupyterlab/outputarea/ADD_OUTPUT'> {
  /**
   * Construct a new action.
   *
   * @param listId - The id of the ouptut list to modify.
   *
   * @param itemId - The id of the output item to add to the list.
   */
  constructor(
    public readonly listId: string,
    public readonly itemId: string) {
    super('@jupyterlab/outputarea/ADD_OUTPUT');
  }
}


/**
 * An action for setting the contents of an output list.
 */
export
class SetOutputs extends Action<'@jupyterlab/outputarea/SET_OUTPUTS'> {
  /**
   * Construct a new action.
   *
   * @param listId - The id of the ouptut list to modify.
   *
   * @param list - The new state for the output list.
   */
  constructor(
    public readonly listId: string
    public readonly list: Table.List<string>) {
    super('@jupyterlab/outputarea/SET_OUTPUTS');
  }
}


/**
 * A type alias of the supported output actions.
 */
export
type OutputAction = (
  CreateMimeModel |
  CreateOutputItem |
  CreateOutputList |
  CreateOutputArea |
  AddOutput |
  SetOutputs
);
