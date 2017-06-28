/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import {
  Action, Table
} from '@phosphor/datastore';



/**
 *
 */
export
class CreateMimeModel extends Action<'@jupyterlab/outputarea/CREATE_MIME_MODEL'> {
  /**
   *
   */
  constructor(
    public readonly id: string,
    public readonly model: IMimeModel) {
    super('@jupyterlab/outputarea/CREATE_MIME_MODEL');
  }
}


/**
 *
 */
export
class CreateOutputItem extends Action<'@jupyterlab/outputarea/CREATE_OUTPUT_ITEM'> {
  /**
   *
   */
  constructor(
    public readonly id: string,
    public readonly item: IOutputItem) {
    super('@jupyterlab/outputarea/CREATE_OUTPUT_ITEM');
  }
}


/**
 *
 */
export
class CreateOutputList extends Action<'@jupyterlab/outputarea/CREATE_OUTPUT_LIST'> {
  /**
   *
   */
  constructor(
    public readonly id: string,
    public readonly list: Table.List<string>) {
    super('@jupyterlab/outputarea/CREATE_OUTPUT_LIST');
  }
}


/**
 *
 */
export
class CreateOutputArea extends Action<'@jupyterlab/outputarea/CREATE_OUTPUT_AREA'> {
  /**
   *
   */
  constructor(
    public readonly id: string,
    public readonly area: IOutputArea) {
    super('@jupyterlab/outputarea/CREATE_OUTPUT_AREA');
  }
}


/**
 *
 */
export
class AddOutput extends Action<'@jupyterlab/outputarea/ADD_OUTPUT'> {
  /**
   *
   */
  constructor(
    public readonly listId: string,
    public readonly itemId: string) {
    super('@jupyterlab/outputarea/ADD_OUTPUT');
  }
}


/**
 *
 */
export
class ClearOutputs extends Action<'@jupyterlab/outputarea/CLEAR_OUTPUTS'> {
  /**
   *
   */
  constructor(
    public readonly id: string) {
    super('@jupyterlab/outputarea/CLEAR_OUTPUTS');
  }
}


/**
 *
 */
export
type OutputAction = (
  CreateMimeModel |
  CreateOutputItem |
  CreateOutputList |
  CreateOutputArea |
  AddOutput |
  ClearOutputs
);
