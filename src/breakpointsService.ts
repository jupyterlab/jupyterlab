import { Breakpoints } from './breakpoints';
import { Signal } from '@phosphor/signaling';
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

export class BreakpointsService {
  constructor() {}

  state: any = {};

  testSignal = new Signal<this, any>(this);

  addBreakpoint(session_id: any, editor_id: any, lineInfo: any) {
    console.log('adding');
    this.testSignal.emit('test');
  }

  removeBreakpoint(session_id: any, editor_id: any, lineInfo: any) {}

  getBreakpointState(session_id: any, editor_id: any, lineInfo: any) {}

  setBreakpointState(session_id: any, editor_id: any, lineInfo: any) {}

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
