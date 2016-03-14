// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  ObservableList
} from 'phosphor-observablelist';

import {
  IChangedArgs, Property
} from 'phosphor-properties';

import {
  ISignal, Signal
} from 'phosphor-signaling';

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
   * Whether the output is trusted.
   *
   * See http://jupyter-notebook.readthedocs.org/en/latest/security.html.
   */
  trusted: boolean;

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
 * An implementation of an output area model.
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
   * Whether the output is trusted.
   *
   * See http://jupyter-notebook.readthedocs.org/en/latest/security.html.
   */
  get trusted(): boolean {
    return Private.trustedProperty.get(this);
  }
  set trusted(value: boolean) {
    Private.trustedProperty.set(this, value);
  }

  /**
   * Whether the output has a maximum fixed height.
   */
  get fixedHeight(): boolean {
    return Private.fixedHeightProperty.get(this);
  }
  set fixedHeight(value: boolean) {
    Private.fixedHeightProperty.set(this, value);
  }

  /**
   * Whether the input area should be collapsed or displayed.
   */
  get collapsed(): boolean {
    return Private.collapsedProperty.get(this);
  }
  set collapsed(value: boolean) {
    Private.collapsedProperty.set(this, value);
  }

  /**
   * Add an output, which may be combined with previous output
   * (e.g. for streams).
   */
  add(output: IOutput) {
    // If we received a delayed clear message, then clear now.
    if (this._clearNext) {
      this.clear();
      this._clearNext = false;
    }

    // Consolidate outputs if they are stream outputs of the same kind.
    let lastOutput = this.outputs.get(-1) as IStream;
    if (isStream(output)
        && lastOutput && isStream(lastOutput)
        && output.name === lastOutput.name) {
      // In order to get a list change event, we add the previous
      // text to the current item and replace the previous item.
      // This also replaces the metadata of the last item.
      let text = output.text as string;
      if (Array.isArray(output.text)) {
        text = (output.text as string[]).join('\n');
      }
      output.text = lastOutput.text as string + text;
      this.outputs.set(-1, output);
    } else {
      switch(output.output_type) {
      case 'stream':
      case 'execute_result':
      case 'display_data':
      case 'error':
        this.outputs.add(output);
        break;
      }
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
   * Execution, display, or stream outputs.
   */
  outputs = new ObservableList<IOutput>();

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
   * The property descriptor for whether the output is trusted.
   */
  export
  const trustedProperty = new Property<OutputAreaModel, boolean>({
    name: 'trusted',
    notify: stateChangedSignal,
  });

  /**
   * The property descriptor for whether the output has a fixed maximum height.
   */
  export
  const fixedHeightProperty = new Property<OutputAreaModel, boolean>({
    name: 'fixedHeight',
    notify: stateChangedSignal,
  });

  /**
   * The property descriptor for whether the output is collapsed.
   */
  export
  const collapsedProperty = new Property<OutputAreaModel, boolean>({
    name: 'collapsed',
    notify: stateChangedSignal,
  });
}
