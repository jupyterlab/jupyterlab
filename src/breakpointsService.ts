// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Breakpoints } from './breakpoints';
import { Signal } from '@phosphor/signaling';
import { LineInfo } from './notebookTracker';

export class BreakpointsService {
  constructor() {}

  state: any = {};
  selectedBreakpoints: Breakpoints.IBreakpoint[] = [];

  selectedBreakpointsChanged = new Signal<this, Breakpoints.IBreakpoint[]>(
    this
  );
  breakpointChanged = new Signal<this, Breakpoints.IBreakpoint>(this);

  addBreakpoint(session_id: string, editor_id: any, lineInfo: LineInfo) {
    const breakpoint: Breakpoints.IBreakpoint = {
      line: lineInfo.line,
      active: true,
      verified: true,
      source: {
        name: session_id
      }
    };
    this.selectedBreakpoints.push(breakpoint);
    this.breakpointChanged.emit(breakpoint);
  }

  get breakpoints() {
    return this.selectedBreakpoints;
  }

  removeBreakpoint(session_id: any, editor_id: any, lineInfo: any) {}

  getBreakpointState(session_id: any, editor_id: any, lineInfo: any) {}

  setBreakpointState(session_id: any, editor_id: any, lineInfo: any) {}

  clearSelectedBreakpoints() {
    this.selectedBreakpoints = [];
    this.selectedBreakpointsChanged.emit([]);
  }

  newLine(session_id: any, editor_id: any, lineInfo: any) {}

  protected changeLines(
    breakpoints: Breakpoints.IBreakpoint[],
    lineInfo: any,
    sign: number
  ) {
    breakpoints.map(ele => {
      if (
        ele.line > lineInfo.line ||
        (lineInfo.text === '' && lineInfo.line === ele.line)
      ) {
        ele.line = ele.line + sign;
      }
      return ele;
    });
  }
}
