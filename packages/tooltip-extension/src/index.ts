// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module tooltip-extension
 */

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { IConsoleTracker } from '@jupyterlab/console';
import { Text } from '@jupyterlab/coreutils';
import { IEditorTracker } from '@jupyterlab/fileeditor';
import { INotebookTracker } from '@jupyterlab/notebook';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { Kernel, KernelMessage, Session } from '@jupyterlab/services';
import { ITooltipManager, Tooltip } from '@jupyterlab/tooltip';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { find } from '@lumino/algorithm';
import { JSONObject } from '@lumino/coreutils';
import { Widget } from '@lumino/widgets';

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
  description: 'Provides the tooltip manager.',
  autoStart: true,
  optional: [ITranslator],
  provides: ITooltipManager,
  activate: (
    app: JupyterFrontEnd,
    translator: ITranslator | null
  ): ITooltipManager => {
    const trans = (translator ?? nullTranslator).load('jupyterlab');
    let tooltip: Tooltip | null = null;

    // Add tooltip dismiss command.
    app.commands.addCommand(CommandIDs.dismiss, {
      label: trans.__('Dismiss the tooltip'),
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
  // FIXME This should be in @jupyterlab/console-extension
  id: '@jupyterlab/tooltip-extension:consoles',
  description: 'Adds the tooltip capability to consoles.',
  autoStart: true,
  optional: [ITranslator],
  requires: [ITooltipManager, IConsoleTracker],
  activate: (
    app: JupyterFrontEnd,
    manager: ITooltipManager,
    consoles: IConsoleTracker,
    translator: ITranslator | null
  ): void => {
    const trans = (translator ?? nullTranslator).load('jupyterlab');

    // Add tooltip launch command.
    app.commands.addCommand(CommandIDs.launchConsole, {
      label: trans.__('Open the tooltip'),
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
  // FIXME This should be in @jupyterlab/notebook-extension
  id: '@jupyterlab/tooltip-extension:notebooks',
  description: 'Adds the tooltip capability to notebooks.',
  autoStart: true,
  optional: [ITranslator],
  requires: [ITooltipManager, INotebookTracker],
  activate: (
    app: JupyterFrontEnd,
    manager: ITooltipManager,
    notebooks: INotebookTracker,
    translator: ITranslator | null
  ): void => {
    const trans = (translator ?? nullTranslator).load('jupyterlab');

    // Add tooltip launch command.
    app.commands.addCommand(CommandIDs.launchNotebook, {
      label: trans.__('Open the tooltip'),
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
  // FIXME This should be in @jupyterlab/fileeditor-extension
  id: '@jupyterlab/tooltip-extension:files',
  description: 'Adds the tooltip capability to file editors.',
  autoStart: true,
  optional: [ITranslator],
  requires: [ITooltipManager, IEditorTracker, IRenderMimeRegistry],
  activate: (
    app: JupyterFrontEnd,
    manager: ITooltipManager,
    editorTracker: IEditorTracker,
    rendermime: IRenderMimeRegistry,
    translator: ITranslator | null
  ): void => {
    const trans = (translator ?? nullTranslator).load('jupyterlab');

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
      models: Iterable<Session.IModel>
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
    onRunningChanged(sessions, sessions.running());
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
      label: trans.__('Open the tooltip'),
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
    const code = editor.model.sharedModel.getSource();
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
