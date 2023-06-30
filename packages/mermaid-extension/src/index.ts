// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/**
 * @packageDocumentation
 * @module mermaid-extension
 */

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { IThemeManager } from '@jupyterlab/apputils';
import {
  IMermaidManager,
  IMermaidMarkdown,
  MermaidManager,
  MermaidMarkdown,
  RenderedMermaid
} from '@jupyterlab/mermaid';

/**
 * A plugin for the core rendering/cachine of mermaid text-based diagrams
 */
const core: JupyterFrontEndPlugin<IMermaidManager> = {
  id: '@jupyterlab/mermaid-extension:core',
  description: 'Provides the Mermaid manager.',
  autoStart: true,
  optional: [IThemeManager],
  provides: IMermaidManager,
  activate: (app: JupyterFrontEnd, themes: IThemeManager) => {
    const manager = new MermaidManager({ themes });
    RenderedMermaid.manager = manager;
    return manager;
  }
};

/**
 * A plugin for rendering mermaid text-based diagrams in markdown fenced code blocks
 */
const markdown: JupyterFrontEndPlugin<IMermaidMarkdown> = {
  id: '@jupyterlab/mermaid-extension:markdown',
  description: 'Provides the Mermaid markdown renderer.',
  autoStart: true,
  requires: [IMermaidManager],
  provides: IMermaidMarkdown,
  activate: (app: JupyterFrontEnd, mermaid: IMermaidManager) => {
    return new MermaidMarkdown({ mermaid });
  }
};

export default [core, markdown];
