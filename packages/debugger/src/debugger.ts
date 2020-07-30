// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { DebuggerConfig } from './config';

import { DebuggerModel } from './model';

import { DebuggerService } from './service';

import { DebuggerSession } from './session';

import { DebuggerSidebar } from './sidebar';

import { DebuggerSources } from './sources';

/**
 * A namespace for `Debugger` statics.
 */
export namespace Debugger {
  /**
   * Debugger configuration for all kernels.
   */
  export class Config extends DebuggerConfig {}

  /**
   * A model for a debugger.
   */
  export class Model extends DebuggerModel {}

  /**
   * The main IDebugger implementation.
   */
  export class Service extends DebuggerService {}

  /**
   * A concrete implementation of IDebugger.ISession.
   */
  export class Session extends DebuggerSession {}

  /**
   * The debugger sidebar UI.
   */
  export class Sidebar extends DebuggerSidebar {}

  /**
   * The source and editor manager for a debugger instance.
   */
  export class Sources extends DebuggerSources {}
}
