/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import {
  Action
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
class AddOutputItem extends Action<'@jupyterlab/outputarea/ADD_OUTPUT_ITEM'> {
  /**
   *
   */
  constructor(outputAreaId: string, outputItemId: string) {
    super('@jupyterlab/outputarea/ADD_OUTPUT_ITEM');
    this.outputAreaId = outputAreaId;
    this.outputItemId = outputItemId;
  }

  /**
   *
   */
  readonly outputAreaId: string;

  /**
   *
   */
  readonly outputItemId: string;
}


/**
 *
 */
export
type OutputAction = (
  CreateMimeModel |
  CreateOutputItem |
  AddOutputItem
);
