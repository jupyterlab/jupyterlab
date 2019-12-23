// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ReactWidget } from '@jupyterlab/apputils';

import React, { useEffect, useState } from 'react';

import { CallstackModel } from './model';

/**
 * The body for a Callstack Panel.
 */
export class CallstackBody extends ReactWidget {
  /**
   * Instantiate a new Body for the Callstack Panel.
   * @param model The model for the callstack.
   */
  constructor(model: CallstackModel) {
    super();
    this._model = model;
    this.addClass('jp-DebuggerCallstack-body');
  }

  /**
   * Render the FramesComponent.
   */
  render() {
    return <FramesComponent model={this._model} />;
  }

  private _model: CallstackModel;
}

/**
 * A React component to display a list of frames in a callstack.
 * @param model The model for the callstack.
 */
const FramesComponent = ({ model }: { model: CallstackModel }) => {
  const [frames, setFrames] = useState(model.frames);
  const [selected, setSelected] = useState(model.frame);

  const onSelected = (frame: any) => {
    setSelected(frame);
    model.frame = frame;
  };

  useEffect(() => {
    const updateFrames = () => {
      setSelected(model.frame);
      setFrames(model.frames);
    };
    model.framesChanged.connect(updateFrames);

    return () => {
      model.framesChanged.disconnect(updateFrames);
    };
  }, [model]);

  return (
    <ul>
      {frames.map(ele => (
        <li
          key={ele.id}
          onClick={() => onSelected(ele)}
          className={selected?.id === ele.id ? 'selected' : ''}
        >
          {ele.name} at {ele.source.name}:{ele.line}
        </li>
      ))}
    </ul>
  );
};
