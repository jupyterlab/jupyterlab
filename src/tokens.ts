// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IClientSession } from '@jupyterlab/apputils';

import { CodeEditor } from '@jupyterlab/codeeditor';

import { Token } from '@phosphor/coreutils';

import { IDisposable } from '@phosphor/disposable';

/**
 * A visual debugger.
 */
export interface IDebugger {
  /**
   * The active debugger session.
   */
  session: IDebugger.ISession | null;
}

/**
 * A visual debugger.
 */
export namespace IDebugger {
  /**
   * A visual debugger session.
   */
  export interface ISession extends IDisposable {
    /**
     * The API client session to connect to a debugger.
     */
    client: IClientSession;

    /**
     * The code editor to connect to a debugger.
     */
    editor: CodeEditor.IEditor;
  }
}

export const IDebugger = new Token<IDebugger>('@jupyterlab/debugger');
