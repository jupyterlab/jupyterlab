// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as Y from 'yjs';
import { IAwareness } from './tokens';

/**
 * Default user implementation.
 */
export class AwarenessMock implements IAwareness {
  constructor(doc: Y.Doc) {
    this.doc = doc;
    this.clientID = doc.clientID;
  }

  setLocalState(state: any) {
    return;
  }

  setLocalStateField(field: string, value: any) {
    return;
  }

  getLocalState(): any {
    return null;
  }

  getStates(): any {
    return this.states;
  }

  on(name: string, f: any) {
    return;
  }
  off(name: string, f: any) {
    return;
  }
  once(name: string, f: any) {
    return;
  }
  emit(name: string, args: any) {
    return;
  }
  destroy() {
    return;
  }

  doc: Y.Doc;
  clientID: number;
  states: Map<any, any> = new Map();
  meta: Map<any, any> = new Map();
  _checkInterval: any;
  _observers: any;
}
