/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import {
  Action
} from '@phosphor/datastore';


/**
 * An enum of the output action type names.
 */
export
enum OutputActionType {
  APPEND_OUTPUT = '@jupyterlab/outputarea/APPEND_OUTPUT',
  CLEAR_OUTPUTS = '@jupyterlab/outputarea/CLEAR_OUTPUTS'
}


/**
 * A type alias of the supported output actions.
 */
export
type OutputAction = (
  AppendOutputAction |
  ClearOutputsAction
);


/**
 * An action for appending output to an output area.
 */
export
class AppendOutputAction extends Action<OutputActionType.APPEND_OUTPUT> {
  /**
   * @param areaId - The id of the output area.
   *
   * @param output - The output object to add to the area.
   */
  constructor(
    public readonly areaId: string,
    public readonly ouptut: nbformat.IOutput) {
    super(OutputActionType.APPEND_OUTPUT);
  }
}


/**
 * An action for clearing the outputs of an output area.
 */
export
class ClearOutputsAction extends Action<OutputActionType.CLEAR_OUTPUTS> {
  /**
   * @param areaId - The id of the output area.
   *
   * @param output - The output object to add to the area.
   */
  constructor(
    public readonly areaId: string) {
    super(OutputActionType.CLEAR_OUTPUTS);
  }
}
