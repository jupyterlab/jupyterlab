// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import React, { useEffect, useState } from 'react';

import { Callstack } from '.';

import { ReactWidget } from '@jupyterlab/apputils';

export class Body extends ReactWidget {
  constructor(model: Callstack.Model) {
    super();
    this.model = model;
    this.addClass('jp-DebuggerCallstack-body');
  }

  render() {
    return <FramesComponent model={this.model} />;
  }

  readonly model: Callstack.Model;
}

const FramesComponent = ({ model }: { model: Callstack.Model }) => {
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
