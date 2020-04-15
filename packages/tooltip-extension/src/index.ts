// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Kernel, KernelMessage, Session } from '@jupyterlab/services';

import { find, toArray } from '@lumino/algorithm';

import { JSONObject } from '@lumino/coreutils';

import { Widget } from '@lumino/widgets';

import { Text } from '@jupyterlab/coreutils';

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { CodeEditor } from '@jupyterlab/codeeditor';

import { IConsoleTracker } from '@jupyterlab/console';

import { IEditorTracker } from '@jupyterlab/fileeditor';

import { INotebookTracker } from '@jupyterlab/notebook';

import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

import { ITooltipManager, Tooltip } from '@jupyterlab/tooltip';

/**
 * The command IDs used by the tooltip plugin.
 */
namespace CommandIDs {
  export const dismiss = 'tooltip:dismiss';

  export const launchConsole = 'tooltip:launch-console';

  export const launchNotebook = 'tooltip:launch-notebook';

  export const launchFile = 'tooltip:launch-file';
}

/**
 * The main tooltip manager plugin.
 */
const manager: JupyterFrontEndPlugin<ITooltipManager> = {
  id: '@jupyterlab/tooltip-extension:manager',
  autoStart: true,
  provides: ITooltipManager,
  activate: (app: JupyterFrontEnd): ITooltipManager => {
    let tooltip: Tooltip | null = null;

    // Add tooltip dismiss command.
    app.commands.addCommand(CommandIDs.dismiss, {
      execute: () => {
        if (tooltip) {
          tooltip.dispose();
          tooltip = null;
        }
      }
    });

    return {
      invoke(options: ITooltipManager.IOptions): Promise<void> {
        const detail: 0 | 1 = 0;
        const { anchor, editor, kernel, rendermime } = options;

        if (tooltip) {
          tooltip.dispose();
          tooltip = null;
        }

        return Private.fetch({ detail, editor, kernel })
          .then(bundle => {
            tooltip = new Tooltip({ anchor, bundle, editor, rendermime });
            Widget.attach(tooltip, document.body);
          })
          .catch(() => {
            /* Fails silently. */
          });
      }
    };
  }
};

/**
 * The console tooltip plugin.
 */
const consoles: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/tooltip-extension:consoles',
  autoStart: true,
  requires: [ITooltipManager, IConsoleTracker],
  activate: (
    app: JupyterFrontEnd,
    manager: ITooltipManager,
    consoles: IConsoleTracker
  ): void => {
    // Add tooltip launch command.
    app.commands.addCommand(CommandIDs.launchConsole, {
      execute: () => {
        const parent = consoles.currentWidget;

        if (!parent) {
          return;
        }

        const anchor = parent.console;
        const editor = anchor.promptCell?.editor;
        const kernel = anchor.sessionContext.session?.kernel;
        const rendermime = anchor.rendermime;

        // If all components necessary for rendering exist, create a tooltip.
        if (!!editor && !!kernel && !!rendermime) {
          return manager.invoke({ anchor, editor, kernel, rendermime });
        }
      }
    });
  }
};

/**
 * The notebook tooltip plugin.
 */
const notebooks: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/tooltip-extension:notebooks',
  autoStart: true,
  requires: [ITooltipManager, INotebookTracker],
  activate: (
    app: JupyterFrontEnd,
    manager: ITooltipManager,
    notebooks: INotebookTracker
  ): void => {
    // Add tooltip launch command.
    app.commands.addCommand(CommandIDs.launchNotebook, {
      execute: () => {
        const parent = notebooks.currentWidget;

        if (!parent) {
          return;
        }

        const anchor = parent.content;
        const editor = anchor.activeCell?.editor;
        const kernel = parent.sessionContext.session?.kernel;
        const rendermime = anchor.rendermime;

        // If all components necessary for rendering exist, create a tooltip.
        if (!!editor && !!kernel && !!rendermime) {
          return manager.invoke({ anchor, editor, kernel, rendermime });
        }
      }
    });
  }
};

/**
 * The file editor tooltip plugin.
 */
const files: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/tooltip-extension:files',
  autoStart: true,
  requires: [ITooltipManager, IEditorTracker, IRenderMimeRegistry],
  activate: (
    app: JupyterFrontEnd,
    manager: ITooltipManager,
    editorTracker: IEditorTracker,
    rendermime: IRenderMimeRegistry
  ): void => {
    // Keep a list of active ISessions so that we can
    // clean them up when they are no longer needed.
    const activeSessions: {
      [id: string]: Session.ISessionConnection;
    } = {};

    const sessions = app.serviceManager.sessions;
    // When the list of running sessions changes,
    // check to see if there are any kernels with a
    // matching path for the file editors.
    const onRunningChanged = (
      sender: Session.IManager,
      models: Session.IModel[]
    ) => {
      editorTracker.forEach(file => {
        const model = find(models, m => file.context.path === m.path);
        if (model) {
          const oldSession = activeSessions[file.id];
          // If there is a matching path, but it is the same
          // session as we previously had, do nothing.
          if (oldSession && oldSession.id === model.id) {
            return;
          }
          // Otherwise, dispose of the old session and reset to
          // a new CompletionConnector.
          if (oldSession) {
            delete activeSessions[file.id];
            oldSession.dispose();
          }
          const session = sessions.connectTo({ model });
          activeSessions[file.id] = session;
        } else {
          const session = activeSessions[file.id];
          if (session) {
            session.dispose();
            delete activeSessions[file.id];
          }
        }
      });
    };
    onRunningChanged(sessions, toArray(sessions.running()));
    sessions.runningChanged.connect(onRunningChanged);

    // Clean up after a widget when it is disposed
    editorTracker.widgetAdded.connect((sender, widget) => {
      widget.disposed.connect(w => {
        const session = activeSessions[w.id];
        if (session) {
          session.dispose();
          delete activeSessions[w.id];
        }
      });
    });

    // Add tooltip launch command.
    app.commands.addCommand(CommandIDs.launchFile, {
      execute: async () => {
        const parent = editorTracker.currentWidget;
        const kernel =
          parent &&
          activeSessions[parent.id] &&
          activeSessions[parent.id].kernel;
        if (!kernel) {
          return;
        }
        const anchor = parent!.content;
        const editor = anchor?.editor;

        // If all components necessary for rendering exist, create a tooltip.
        if (!!editor && !!kernel && !!rendermime) {
          return manager.invoke({ anchor, editor, kernel, rendermime });
        }
      }
    });
  }
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [
  manager,
  consoles,
  notebooks,
  files
];
export default plugins;

/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * A counter for outstanding requests.
   */
  let pending = 0;

  export interface IFetchOptions {
    /**
     * The detail level requested from the API.
     *
     * #### Notes
     * The only acceptable values are 0 and 1. The default value is 0.
     * @see http://jupyter-client.readthedocs.io/en/latest/messaging.html#introspection
     */
    detail?: 0 | 1;

    /**
     * The referent editor for the tooltip.
     */
    editor: CodeEditor.IEditor;

    /**
     * The kernel against which the API request will be made.
     */
    kernel: Kernel.IKernelConnection;
  }

  /**
   * Fetch a tooltip's content from the API server.
   */
  export function fetch(options: IFetchOptions): Promise<JSONObject> {
    const { detail, editor, kernel } = options;
    const code = editor.model.value.text;
    const position = editor.getCursorPosition();
    const offset = Text.jsIndexToCharIndex(editor.getOffsetAt(position), code);

    // Clear hints if the new text value is empty or kernel is unavailable.
    if (!code || !kernel) {
      return Promise.reject(void 0);
    }

    const contents: KernelMessage.IInspectRequestMsg['content'] = {
      code,
      cursor_pos: offset,
      detail_level: detail || 0
    };
    const current = ++pending;

    return kernel.requestInspect(contents).then(msg => {
      const value = msg.content;

      // If a newer request is pending, bail.
      if (current !== pending) {
        return Promise.reject(void 0) as Promise<JSONObject>;
      }

      // If request fails or returns negative results, bail.
      if (value.status !== 'ok' || !value.found) {
        return Promise.reject(void 0) as Promise<JSONObject>;
      }

      return Promise.resolve(value.data);
    });
  }
}
