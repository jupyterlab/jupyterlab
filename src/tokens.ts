// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IClientSession,
  IWidgetTracker,
  MainAreaWidget
} from '@jupyterlab/apputils';

import { CodeEditor } from '@jupyterlab/codeeditor';

import { Token } from '@phosphor/coreutils';

import { IObservableDisposable } from '@phosphor/disposable';

import { Debugger } from './debugger';

/**
 * An interface describing an application's visual debugger.
 */
export interface IDebugger extends IWidgetTracker<MainAreaWidget<Debugger>> {}

/**
 * A namespace for visual debugger types.
 */
export namespace IDebugger {
  /**
   * A visual debugger session.
   */
  export interface ISession extends IObservableDisposable {
    /**
     * The API client session to connect to a debugger.
     */
    client: IClientSession;

    /**
     * The code editors in a debugger session.
     */
    editors: CodeEditor.IEditor[];
  }
}

/**
 * A token for a tracker for an application's visual debugger instances.
 */
export const IDebugger = new Token<IDebugger>('@jupyterlab/debugger');
