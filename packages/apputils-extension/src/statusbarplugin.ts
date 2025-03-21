/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  ILabShell,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  IKernelStatusModel,
  ISessionContext,
  ISessionContextDialogs,
  KernelStatus,
  RunningSessions,
  SessionContextDialogs
} from '@jupyterlab/apputils';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IStatusBar } from '@jupyterlab/statusbar';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { IDisposable } from '@lumino/disposable';
import { Title, Widget } from '@lumino/widgets';
import { KeyboardEvent } from 'react';

/**
 * A plugin that provides a kernel status item to the status bar.
 */
export const kernelStatus: JupyterFrontEndPlugin<IKernelStatusModel> = {
  id: '@jupyterlab/apputils-extension:kernel-status',
  description: 'Provides the kernel status indicator model.',
  autoStart: true,
  requires: [IStatusBar],
  provides: IKernelStatusModel,
  optional: [ISessionContextDialogs, ITranslator, ILabShell],
  activate: (
    app: JupyterFrontEnd,
    statusBar: IStatusBar,
    sessionDialogs_: ISessionContextDialogs | null,
    translator_: ITranslator | null,
    labShell: ILabShell | null
  ): IKernelStatusModel => {
    const translator = translator_ ?? nullTranslator;
    const sessionDialogs =
      sessionDialogs_ ?? new SessionContextDialogs({ translator });
    // When the status item is clicked, launch the kernel
    // selection dialog for the current session.
    const changeKernel = async () => {
      if (!item.model.sessionContext) {
        return;
      }
      await sessionDialogs.selectKernel(item.model.sessionContext);
    };

    const changeKernelOnKeyDown = async (
      event: KeyboardEvent<HTMLImageElement>
    ) => {
      if (
        event.key === 'Enter' ||
        event.key === 'Spacebar' ||
        event.key === ' '
      ) {
        event.preventDefault();
        event.stopPropagation();
        return changeKernel();
      }
    };

    // Create the status item.
    const item = new KernelStatus(
      { onClick: changeKernel, onKeyDown: changeKernelOnKeyDown },
      translator
    );

    const providers = new Set<(w: Widget | null) => ISessionContext | null>();

    const addSessionProvider = (
      provider: (w: Widget | null) => ISessionContext | null
    ): void => {
      providers.add(provider);

      if (app.shell.currentWidget) {
        updateSession(app.shell, {
          newValue: app.shell.currentWidget,
          oldValue: null
        });
      }
    };

    function updateSession(
      shell: JupyterFrontEnd.IShell,
      changes: ILabShell.IChangedArgs
    ) {
      const { oldValue, newValue } = changes;

      // Clean up after the old value if it exists,
      // listen for changes to the title of the activity
      if (oldValue) {
        oldValue.title.changed.disconnect(onTitleChanged);
      }

      item.model.sessionContext =
        [...providers]
          .map(provider => provider(changes.newValue))
          .filter(session => session !== null)[0] ?? null;

      if (newValue && item.model.sessionContext) {
        onTitleChanged(newValue.title);
        newValue.title.changed.connect(onTitleChanged);
      }
    }

    // When the title of the active widget changes, update the label
    // of the hover text.
    const onTitleChanged = (title: Title<Widget>) => {
      item.model!.activityName = title.label;
    };

    if (labShell) {
      labShell.currentChanged.connect(updateSession);
    }

    statusBar.registerStatusItem(kernelStatus.id, {
      priority: 1,
      item,
      align: 'left',
      rank: 1,
      isActive: () => item.model!.sessionContext !== null
    });

    return { addSessionProvider };
  }
};

/*
 * A plugin providing running terminals and sessions information
 * to the status bar.
 */
export const runningSessionsStatus: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/apputils-extension:running-sessions-status',
  description: 'Add the running sessions and terminals status bar item.',
  autoStart: true,
  requires: [IStatusBar, ITranslator],
  optional: [ISettingRegistry],
  activate: (
    app: JupyterFrontEnd,
    statusBar: IStatusBar,
    translator: ITranslator,
    settingRegistry: ISettingRegistry | null
  ) => {
    const createStatusItem = (options: {
      showKernels: boolean;
      showTerminals?: boolean;
    }) => {
      const item = new RunningSessions({
        onClick: () => app.shell.activateById('jp-running-sessions'),
        onKeyDown: (event: KeyboardEvent<HTMLImageElement>) => {
          if (
            event.key === 'Enter' ||
            event.key === 'Spacebar' ||
            event.key === ' '
          ) {
            event.preventDefault();
            event.stopPropagation();
            app.shell.activateById('jp-running-sessions');
          }
        },
        serviceManager: app.serviceManager,
        translator,
        ...options
      });

      item.model.sessions = Array.from(
        app.serviceManager.sessions.running()
      ).length;
      item.model.terminals = Array.from(
        app.serviceManager.terminals.running()
      ).length;

      return item;
    };

    const registerItem = (options: {
      showKernels: boolean;
      showTerminals?: boolean;
    }) => {
      const item = createStatusItem(options);
      return statusBar.registerStatusItem(runningSessionsStatus.id, {
        item,
        align: 'left',
        rank: 0
      });
    };

    if (settingRegistry) {
      let disposable: IDisposable;
      const onSettingsUpdated = (
        kernelSettings?: ISettingRegistry.ISettings,
        terminalsSettings?: ISettingRegistry.ISettings
      ): void => {
        const showTerminalsMap = {
          'if-any': undefined,
          never: false,
          always: true
        };
        const showKernels =
          (kernelSettings?.get('showStatusBarItem').composite as
            | boolean
            | undefined) ?? true;
        const showTerminals =
          showTerminalsMap[
            (terminalsSettings?.get('showStatusBarItem').composite as
              | 'if-any'
              | 'never'
              | 'always'
              | undefined) ?? 'if-any'
          ];

        disposable?.dispose();
        if (showKernels || showTerminals !== false) {
          disposable = registerItem({
            showKernels,
            showTerminals
          });
        }
      };

      const kernelsPluginId = '@jupyterlab/apputils-extension:kernels-settings';
      const terminalPluginId = '@jupyterlab/terminal-extension:plugin';

      void Promise.all([
        // Settings may be missing if the respective plugins are not enabled/included.
        kernelsPluginId in settingRegistry.plugins
          ? settingRegistry.load(kernelsPluginId).catch(() => undefined)
          : Promise.resolve(undefined),
        terminalPluginId in settingRegistry.plugins
          ? settingRegistry.load(terminalPluginId).catch(() => undefined)
          : Promise.resolve(undefined)
      ]).then(([kernelSettings, terminalSettings]) => {
        onSettingsUpdated(kernelSettings, terminalSettings);
        if (kernelSettings) {
          kernelSettings.changed.connect(settings => {
            kernelSettings = settings;
            onSettingsUpdated(kernelSettings, terminalSettings);
          });
        }
        if (terminalSettings) {
          terminalSettings.changed.connect(settings => {
            terminalSettings = settings;
            onSettingsUpdated(kernelSettings, terminalSettings);
          });
        }
      });
    } else {
      registerItem({
        showKernels: true
      });
    }
  }
};
