// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import React, { useState } from 'react';
import { Breakpoints } from '.';
import { ReactWidget } from '@jupyterlab/apputils';

export class Body extends ReactWidget {
  constructor(model: Breakpoints.IModel) {
    super();
    this.model = model;
    this.addClass('jp-DebuggerBreakpoints-body');
  }

  render() {
    return <BreakpointsComponent model={this.model} />;
  }

  readonly model: Breakpoints.IModel;
}

const BreakpointsComponent = ({ model }: { model: Breakpoints.IModel }) => {
  const [breakpoints] = useState(model.breakpoints);
  const [active, setActive] = useState(model.isActive);

  model.activesChange.connect((_: Breakpoints.IModel, update: boolean) => {
    console.log(update);
    setActive(update);
  });

  return (
    <div>
      {breakpoints.map((breakpoint: any) => (
        <BreakpointComponent
          key={breakpoint.id}
          breakpoint={breakpoint}
          active={active}
        />
      ))}
    </div>
  );
};

const BreakpointComponent = ({
  breakpoint,
  active
}: {
  breakpoint: any;
  active: any;
}) => {
  const [checkState, setCheck] = useState(breakpoint.verified);
  breakpoint.verified = checkState;
  const setBreakpointEnabled = (breakpoint: any, state: boolean) => {
    setCheck(state);
  };

  return (
    <div className={`breakpoint ${active ? '' : 'disabled'}`}>
      <input
        onChange={() => {
          setBreakpointEnabled(breakpoint, !checkState);
        }}
        type="checkbox"
        checked={checkState}
      />
      <span>
        {breakpoint.source.name} : {breakpoint.line}
      </span>
    </div>
  );
};
