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
  MERMAID_CLASS,
  MERMAID_CODE_CLASS,
  MermaidManager,
  MermaidMarkdown,
  RenderedMermaid
} from '@jupyterlab/mermaid';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';

/**
 * A namespace for mermaid text-based diagram commands.
 */
export namespace CommandIDs {
  export const copySource = 'mermaid:copy-source';
}

/**
 * A plugin for the core rendering/cachine of mermaid text-based diagrams
 */
const core: JupyterFrontEndPlugin<IMermaidManager> = {
  id: '@jupyterlab/mermaid-extension:core',
  description: 'Provides the Mermaid manager.',
  autoStart: true,
  optional: [IThemeManager],
  provides: IMermaidManager,
  activate: (app: JupyterFrontEnd, themes: IThemeManager | null) => {
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

/**
 * Contextual commands for mermaid text-based diagrams.
 */
const contextCommands: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/mermaid-extension:context-commands',
  description: 'Provides context menu commands for mermaid diagrams.',
  autoStart: true,
  requires: [IMermaidManager],
  optional: [ITranslator],
  activate: (
    app: JupyterFrontEnd,
    mermaid: IMermaidManager,
    translator: ITranslator | null
  ) => {
    const isMermaid = (node: HTMLElement) =>
      node.classList.contains(MERMAID_CLASS);

    const trans = (translator ?? nullTranslator).load('jupyterlab');
    app.commands.addCommand(CommandIDs.copySource, {
      label: trans.__('Mermaid Copy Diagram Source'),
      execute: async (args?: any) => {
        const node = app.contextMenuHitTest(isMermaid);
        if (!node) {
          return;
        }
        const code = node.querySelector(`.${MERMAID_CODE_CLASS}`);
        if (!code || !code.textContent) {
          return;
        }
        await navigator.clipboard.writeText(code.textContent);
      }
    });

    const options = { selector: `.${MERMAID_CLASS}`, rank: 13 };
    app.contextMenu.addItem({ command: CommandIDs.copySource, ...options });
    app.contextMenu.addItem({ type: 'separator', ...options });
  }
};

export default [core, markdown, contextCommands];
