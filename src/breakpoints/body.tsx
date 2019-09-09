// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import React, { useState } from 'react';
import { Breakpoints } from '.';
import { ReactWidget } from '@jupyterlab/apputils';
import { ArrayExt } from '@phosphor/algorithm';
import { ISignal } from '@phosphor/signaling';

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
  const [breakpoints, setBreakpoints] = useState(model.breakpoints);

  model.breakpointsChanged.connect(
    (_: Breakpoints.IModel, updates: Breakpoints.IBreakpoint[]) => {
      if (ArrayExt.shallowEqual(breakpoints, updates)) {
        return;
      }
      setBreakpoints(updates);
    }
  );

  return (
    <div>
      {breakpoints.map((breakpoint: Breakpoints.IBreakpoint) => (
        <BreakpointComponent
          key={breakpoint.line}
          breakpoint={breakpoint}
          breakpointChanged={model.breakpointChanged}
        />
      ))}
    </div>
  );
};

const BreakpointComponent = ({
  breakpoint,
  breakpointChanged
}: {
  breakpoint: Breakpoints.IBreakpoint;
  breakpointChanged: ISignal<Breakpoints.IModel, Breakpoints.IBreakpoint>;
}) => {
  const [active, setActive] = useState(breakpoint.active);
  breakpoint.active = active;

  breakpointChanged.connect(
    (_: Breakpoints.IModel, updates: Breakpoints.IBreakpoint) => {
      setActive(updates.active);
    }
  );

  const setBreakpointEnabled = (state: boolean) => {
    setActive(state);
  };

  return (
    <div className={`breakpoint`}>
      <input
        onChange={() => {
          setBreakpointEnabled(!active);
        }}
        type="checkbox"
        checked={active}
      />
      <span>
        {breakpoint.source.name} : {breakpoint.line}
      </span>
    </div>
  );
};
