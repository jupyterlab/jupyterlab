// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ReactWidget } from '@jupyterlab/ui-components';
import React, { useEffect, useState } from 'react';
import { IDebugger } from '../../tokens';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import {
  breakpointIcon,
  selectedBreakpointIcon
} from '@jupyterlab/ui-components';

/**
 * The body for a Breakpoints Panel.
 */
export class BreakpointsBody extends ReactWidget {
  /**
   * Instantiate a new Body for the Breakpoints Panel.
   *
   * @param model The model for the breakpoints.
   */
  constructor(
    model: IDebugger.Model.IBreakpoints,
    translator: ITranslator = nullTranslator
  ) {
    super();
    this._model = model;
    this._translator = translator;

    this.addClass('jp-DebuggerBreakpoints-body');
  }

  /**
   * Render the BreakpointsComponent.
   */
  render(): JSX.Element {
    return (
      <BreakpointsComponent model={this._model} translator={this._translator} />
    );
  }

  private _model: IDebugger.Model.IBreakpoints;
  private _translator: ITranslator;
}

/**
 * A React component to display a list of breakpoints.
 *
 * @param {object} props The component props.
 * @param props.model The model for the breakpoints.
 */
const BreakpointsComponent = ({
  model,
  translator
}: {
  model: IDebugger.Model.IBreakpoints;
  translator: ITranslator;
}): JSX.Element => {
  const trans = translator.load('jupyterlab');
  const [breakpoints, setBreakpoints] = useState(
    Array.from(model.breakpoints.entries())
  );
  const [selectedBreakpoint, setSelectedBreakpoint] =
    useState<IDebugger.IBreakpoint | null>(null);

  useEffect(() => {
    const updateBreakpoints = (
      _: IDebugger.Model.IBreakpoints,
      updates: IDebugger.IBreakpoint[]
    ): void => {
      setBreakpoints(Array.from(model.breakpoints.entries()));
    };

    const restoreBreakpoints = (_: IDebugger.Model.IBreakpoints): void => {
      setBreakpoints(Array.from(model.breakpoints.entries()));
    };

    const handleClick = (
      _: IDebugger.Model.IBreakpoints,
      breakpoint: IDebugger.IBreakpoint
    ): void => {
      model.selectedBreakpoint = breakpoint;
    };

    const handleSelectedChanged = (_: IDebugger.Model.IBreakpoints): void => {
      setSelectedBreakpoint(model.selectedBreakpoint);
    };

    model.changed.connect(updateBreakpoints);
    model.restored.connect(restoreBreakpoints);
    model.clicked.connect(handleClick);
    model.selectedChanged.connect(handleSelectedChanged);

    return (): void => {
      model.changed.disconnect(updateBreakpoints);
      model.restored.disconnect(restoreBreakpoints);
      model.clicked.disconnect(handleClick);
      model.selectedChanged.disconnect(() => handleSelectedChanged);
    };
  });

  return (
    <>
      {breakpoints.map(entry => (
        <BreakpointCellComponent
          key={entry[0]}
          breakpoints={entry[1]}
          model={model}
          selectedBreakpoint={selectedBreakpoint}
          trans={trans}
        />
      ))}
    </>
  );
};

/**
 * A React Component to display breakpoints grouped by source file.
 *
 * @param {object} props The component props.
 * @param props.breakpoints The list of breakpoints.
 * @param props.model The model for the breakpoints.
 */
const BreakpointCellComponent = ({
  breakpoints,
  model,
  selectedBreakpoint,
  trans
}: {
  breakpoints: IDebugger.IBreakpoint[];
  model: IDebugger.Model.IBreakpoints;
  selectedBreakpoint: IDebugger.IBreakpoint | null;
  trans: TranslationBundle;
}): JSX.Element => {
  return (
    <>
      {breakpoints
        .sort((a, b) => {
          return (a.line ?? 0) - (b.line ?? 0);
        })
        .map((breakpoint: IDebugger.IBreakpoint, index) => (
          <BreakpointComponent
            key={(breakpoint.source?.path ?? '') + index}
            breakpoint={breakpoint}
            model={model}
            isSelected={
              selectedBreakpoint?.line === breakpoint.line &&
              selectedBreakpoint?.source?.path === breakpoint.source?.path
            }
            trans={trans}
          />
        ))}
    </>
  );
};

/**
 * A React Component to display a single breakpoint.
 *
 * @param {object} props The component props.
 * @param props.breakpoint The breakpoint.
 * @param props.model The model for the breakpoints.
 */
const BreakpointComponent = ({
  breakpoint,
  model,
  isSelected,
  trans
}: {
  breakpoint: IDebugger.IBreakpoint;
  model: IDebugger.Model.IBreakpoints;
  isSelected: boolean;
  trans: TranslationBundle;
}): JSX.Element => {
  const moveToEndFirstCharIfSlash = (breakpointSourcePath: string): string => {
    return breakpointSourcePath[0] === '/'
      ? breakpointSourcePath.slice(1) + '/'
      : breakpointSourcePath;
  };
  return (
    <div
      className={'jp-DebuggerBreakpoint'}
      onClick={(): void => model.clicked.emit(breakpoint)}
      title={breakpoint.source?.path}
    >
      <span className="jp-DebuggerBreakpoint-container">
        {!isSelected ? (
          <breakpointIcon.react
            aria-label={trans.__('Breakpoint')}
          ></breakpointIcon.react>
        ) : (
          <selectedBreakpointIcon.react
            aria-label={trans.__('Selected breakpoint')}
          ></selectedBreakpointIcon.react>
        )}
      </span>
      <span className={'jp-DebuggerBreakpoint-source jp-left-truncated'}>
        {moveToEndFirstCharIfSlash(breakpoint.source?.path ?? '')}
      </span>
      <span className={'jp-DebuggerBreakpoint-line'}>{breakpoint.line}</span>
    </div>
  );
};
