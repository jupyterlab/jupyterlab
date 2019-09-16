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

  addBreakpoint(session_id: string, editor_id: string, lineInfo: LineInfo) {
    const breakpoint: Breakpoints.IBreakpoint = {
      line: lineInfo.line,
      active: true,
      verified: true,
      source: {
        name: session_id
      }
    };
    this.selectedBreakpoints = [...this.selectedBreakpoints, breakpoint];
    this.selectedBreakpointsChanged.emit(this.selectedBreakpoints);
  }

  get breakpoints() {
    return this.selectedBreakpoints;
  }

  onSelectedBreakpoints(session_id: string, editor_id: string) {
    if (!this.state[session_id]) {
      this.state[session_id] = {};
      if (!this.state[session_id][editor_id]) {
        this.state[session_id][editor_id] = [];
      }
    } else {
      if (!this.state[session_id][editor_id]) {
        this.state[session_id][editor_id] = [];
      }
    }
  }

  removeBreakpoint(session_id: any, editor_id: any, lineInfo: any) {
    this.selectedBreakpoints = this.selectedBreakpoints.filter(
      ele => ele.line !== lineInfo.line
    );
    this.selectedBreakpointsChanged.emit(this.selectedBreakpoints);
  }

  getBreakpointState(session_id: any, editor_id: any, lineInfo: any) {}

  setBreakpointState(session_id: any, editor_id: any, lineInfo: any) {}

  clearSelectedBreakpoints() {
    this.selectedBreakpoints = [];
    this.selectedBreakpointsChanged.emit([]);
  }

  changeLines(linesInfo: LineInfo[]) {
    if (!linesInfo && this.breakpoints.length === 0) {
      return;
    }
    if (linesInfo.length === 0) {
      this.selectedBreakpoints = [];
      this.selectedBreakpointsChanged.emit([]);
    } else {
      const breakpoint = { ...this.breakpoints[0] };
      var breakpoints: Breakpoints.IBreakpoint[] = [];
      linesInfo.forEach(ele => {
        breakpoints.push({ ...breakpoint, line: ele.line });
      });
      this.selectedBreakpoints = [...breakpoints];
      this.selectedBreakpointsChanged.emit(this.selectedBreakpoints);
    }
  }
}

// changeLines(lineInfo: LineInfo, sign: number) {
//   const breakpoints = this.selectedBreakpoints.map(ele => {
//     if (
//       ele.line > lineInfo.line ||
//       (lineInfo.text === '' && lineInfo.line === ele.line)
//     ) {
//       ele.line = ele.line + sign;
//     }
//     if (ele.line > 0) {
//       return ele;
//     }
//   });
//   this.selectedBreakpoints = [...breakpoints];
//   this.selectedBreakpointsChanged.emit(this.selectedBreakpoints);
// }
