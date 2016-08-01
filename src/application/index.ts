// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Application
} from 'phosphor/lib/ui/application';

import {
  ApplicationShell
} from './shell';

export
class JupyterLab extends Application<ApplicationShell> {
  protected createShell(): ApplicationShell {
    return new ApplicationShell();
  }
}
