// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IChangedArgs, Property
} from 'phosphor-properties';

import {
  ISignal, Signal
} from 'phosphor-signaling';

import {
  ObservableList
} from 'phosphor-observablelist';

import {
  IOutput, IStream, isStream, IExecuteResult, IDisplayData, IError
} from '../notebook/nbformat';


/**
* The model for an output area.
*/
export
interface IOutputAreaModel {
  /**
   * A signal emitted when state of the output area changes.
   */
  stateChanged: ISignal<IOutputAreaModel, IChangedArgs<any>>;

  /**
   * Whether the output is collapsed.
   */
  collapsed: boolean;

  /**
   * Whether the output has a fixed maximum height.
   */
  fixedHeight: boolean;

  /**
   * The actual outputs.
   */
  outputs: ObservableList<IOutput>;

  /**
   * A convenience method to add an output to the end of the outputs list,
   * combining outputs if necessary.
   */
  add(output: IOutput): void;

  /**
   * Clear all of the output.
   */
  clear(wait: boolean): void;
}


/**
 * An implementation of an input area model.
 */
export
class OutputAreaModel implements IOutputAreaModel {
  /**
   * A signal emitted when the state of the model changes.
   */
  get stateChanged() {
    return Private.stateChangedSignal.bind(this);
  }

  /**
   * Get whether the output has a maximum fixed height.
   */
  get fixedHeight() {
    return Private.fixedHeightProperty.get(this);
  }

  /**
   * Set whether the output has a maximum fixed height.
   */
  set fixedHeight(value: boolean) {
    Private.fixedHeightProperty.set(this, value);
  }

  /**
   * Get whether the input area should be collapsed or displayed.
   */
  get collapsed() {
    return Private.collapsedProperty.get(this);
  }

  /**
   * Set whether the input area should be collapsed or displayed.
   */
  set collapsed(value: boolean) {
    Private.collapsedProperty.set(this, value);
  }

  /**
   * Add an output, which may be combined with previous output
   * (e.g. for streams).
   */
  add(output: IOutput) {
    // if we received a delayed clear message, then clear now
    if (this._clearNext) {
      this.clear();
      this._clearNext = false;
    }

    // Consolidate outputs if they are stream outputs of the same kind
    let lastOutput = this.outputs.get(-1) as IStream;
    if (isStream(output)
        && lastOutput && isStream(lastOutput)
        && output.name === lastOutput.name) {
      // In order to get a list change event, we add the previous
      // text to the current item and replace the previous item.
      // This also replaces the metadata of the last item.
      output.text = lastOutput.text + output.text;
      this.outputs.set(-1, output);
    } else {
      this.outputs.add(output);
    }
  }

  /**
  * Clear all of the output.
  *
  * @param wait Delay clearing the output until the next message is added.
  */
  clear(wait: boolean = false) {
    if(wait) {
      this._clearNext = true;
    } else {
      this.outputs.clear();
    }
  }

  /**
   * The actual outputs.
   */
  outputs = new ObservableList<IOutput>();

  /**
   * Whether to clear on the next message add.
   */
  private _clearNext = false;
}


/**
 * A private namespace for output area model data.
 */
namespace Private {
  /**
   * A signal emitted when the state of the model changes.
   */
  export
  const stateChangedSignal = new Signal<OutputAreaModel, IChangedArgs<any>>();

  /**
   * A property descriptor which determines whether the output has a maximum 
   * fixed height.
   */
  export
  const fixedHeightProperty = new Property<OutputAreaModel, boolean>({
    name: 'fixedHeight',
    notify: stateChangedSignal,
  });

  /**
   * A property descriptor which determines whether the output area is 
   * collapsed or displayed.
   */
  export
  const collapsedProperty = new Property<OutputAreaModel, boolean>({
    name: 'collapsed',
    notify: stateChangedSignal,
  });
}
