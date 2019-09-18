// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Breakpoints } from './breakpoints';
import { Signal } from '@phosphor/signaling';
import { LineInfo } from './cellManeger';

export class BreakpointsService {
  constructor() {}

  selectedType: SessionTypes;
  selectedBreakpoints: Breakpoints.IBreakpoint[] = [];

  selectedBreakpointsChanged = new Signal<this, Breakpoints.IBreakpoint[]>(
    this
  );
  breakpointChanged = new Signal<this, Breakpoints.IBreakpoint>(this);

  addBreakpoint(session_id: string, type: string, lineInfo: LineInfo) {
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

  onSelectedBreakpoints(session_id: string, type: SessionTypes) {
    // this still not work

    this.selectedType = type;
    if (this.selectedType && this.selectedType !== type) {
      this.clearSelectedBreakpoints();
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

export type SessionTypes = 'console' | 'notebook';
