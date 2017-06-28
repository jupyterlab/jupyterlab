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
  constructor(id: string, model: IMimeModel) {
    super('@jupyterlab/outputarea/CREATE_MIME_MODEL');
    this.id = id;
    this.model = model;
  }

  /**
   *
   */
  readonly id: string;

  /**
   *
   */
  readonly model: IMimeModel;
}


/**
 *
 */
export
class CreateOutputItem extends Action<'@jupyterlab/outputarea/CREATE_OUTPUT_ITEM'> {
  /**
   *
   */
  constructor(id: string, item: IOutputItem) {
    super('@jupyterlab/outputarea/CREATE_OUTPUT_ITEM');
    this.id = id;
    this.item = item;
  }

  /**
   *
   */
  readonly id: string;

  /**
   *
   */
  readonly item: IOutputItem;
}


/**
 *
 */
export
class CreateOutputList extends Action<'@jupyterlab/outputarea/CREATE_OUTPUT_LIST'> {
  /**
   *
   */
  constructor(id: string, list: Table.List<string>) {
    super('@jupyterlab/outputarea/CREATE_OUTPUT_LIST');
    this.id = id;
    this.list = list;
  }

  /**
   *
   */
  readonly id: string;

  /**
   *
   */
  readonly list: Table.List<string>;
}


/**
 *
 */
export
class CreateOutputArea extends Action<'@jupyterlab/outputarea/CREATE_OUTPUT_AREA'> {
  /**
   *
   */
  constructor(id: string, area: IOutputArea) {
    super('@jupyterlab/outputarea/CREATE_OUTPUT_AREA');
    this.id = id;
    this.area = area;
  }

  /**
   *
   */
  readonly id: string;

  /**
   *
   */
  readonly area: IOutputArea;
}


/**
 *
 */
export
class AddOutput extends Action<'@jupyterlab/outputarea/ADD_OUTPUT'> {
  /**
   *
   */
  constructor(areaId: string, itemId: string) {
    super('@jupyterlab/outputarea/ADD_OUTPUT');
    this.areaId = areaId;
    this.itemId = itemId;
  }

  /**
   *
   */
  readonly areaId: string;

  /**
   *
   */
  readonly itemId: string;
}


/**
 *
 */
export
class ClearOutputs extends Action<'@jupyterlab/outputarea/CLEAR_OUTPUTS'> {
  /**
   *
   */
  constructor(areaId: string) {
    super('@jupyterlab/outputarea/CLEAR_OUTPUTS');
    this.areaId = areaId;
  }

  /**
   *
   */
  readonly areaId: string;
}


/**
 *
 */
export
type OutputAction = (
  CreateMimeModel |
  CreateOutputItem |
  CreateOutputList |
  CreateOutputArea
  AddOutputItem
);
