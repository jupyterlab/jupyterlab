// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import React, { useState } from 'react';
import { Callstack } from '.';
import { ReactWidget } from '@jupyterlab/apputils';

export class Body extends ReactWidget {
  constructor(model: Callstack.IModel) {
    super();
    this.model = model;
    this.addClass('jp-DebuggerCallstack-body');
  }

  render() {
    return <FramesComponent model={this.model} />;
  }

  readonly model: Callstack.IModel;
}

const FramesComponent = ({ model }: { model: Callstack.IModel }) => {
  const [frames] = useState(model.frames);
  const [selected, setSelected] = useState();
  const onSelected = (frame: any) => {
    setSelected(frame);
  };

  return (
    <ul>
      {frames.map(ele => (
        <li
          key={ele.id}
          onClick={() => onSelected(ele)}
          className={selected === ele ? 'selected' : ''}
        >
          {ele.name} at {ele.source.name}:{ele.line}
        </li>
      ))}
    </ul>
  );
};
