// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Breakpoints } from './breakpoints';
import { Signal } from '@phosphor/signaling';
import { LineInfo } from './handlers/cell';

export class BreakpointsService {
  private selectedType: SessionTypes;
  private state = {
    console: [] as Breakpoints.IBreakpoint[],
    notebook: [] as Breakpoints.IBreakpoint[]
  };
  private selectedBreakpoints: Breakpoints.IBreakpoint[] = [];
  selectedBreakpointsChanged = new Signal<this, Breakpoints.IBreakpoint[]>(
    this
  );

  addBreakpoint(session: string, type: string, lineInfo: LineInfo) {
    const breakpoint: Breakpoints.IBreakpoint = {
      line: lineInfo.line,
      active: true,
      verified: true,
      source: {
        name: session
      }
    };
    this.selectedBreakpoints = [...this.selectedBreakpoints, breakpoint];
    this.selectedBreakpointsChanged.emit(this.selectedBreakpoints);
  }

  get breakpoints() {
    return this.selectedBreakpoints;
  }

  set type(newType: SessionTypes) {
    if (newType === this.selectedType) {
      return;
    }
    this.state[this.selectedType] = this.selectedBreakpoints;
    this.selectedType = newType;
    this.selectedBreakpoints = this.state[newType];
    this.selectedBreakpointsChanged.emit(this.selectedBreakpoints);
  }

  removeBreakpoint(session_id: any, editor_id: any, lineInfo: any) {
    this.selectedBreakpoints = this.selectedBreakpoints.filter(
      ele => ele.line !== lineInfo.line
    );
    this.selectedBreakpointsChanged.emit(this.selectedBreakpoints);
  }

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
