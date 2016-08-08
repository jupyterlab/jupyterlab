// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Application
} from 'phosphor/lib/ui/application';

import {
  ApplicationShell
} from './shell';


/**
 * The type for all JupyterLab plugins.
 */
export
type JupyterLabPlugin<T> = Application.IPlugin<JupyterLab, T>;


/**
 * JupyterLab is the main application class. It is instantiated once and shared.
 */
export
class JupyterLab extends Application<ApplicationShell> {
  /**
   * Create the application shell for the JupyterLab application.
   */
  protected createShell(): ApplicationShell {
    return new ApplicationShell();
  }
}
