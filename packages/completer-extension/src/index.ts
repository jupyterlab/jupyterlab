// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module completer-extension
 */

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  CompletionProviderManager,
  ContextCompleterProvider,
  ICompletionProviderManager,
  KernelCompleterProvider
} from '@jupyterlab/completer';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import {
  IFormRenderer,
  IFormRendererRegistry
} from '@jupyterlab/ui-components';
import type { FieldProps } from '@rjsf/utils';

import { renderAvailableProviders } from './renderer';

const COMPLETION_MANAGER_PLUGIN = '@jupyterlab/completer-extension:manager';

const defaultProvider: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/completer-extension:base-service',
  description: 'Adds context and kernel completion providers.',
  requires: [ICompletionProviderManager],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    completionManager: ICompletionProviderManager
  ): void => {
    completionManager.registerProvider(new ContextCompleterProvider());
    completionManager.registerProvider(new KernelCompleterProvider());
  }
};

const manager: JupyterFrontEndPlugin<ICompletionProviderManager> = {
  id: COMPLETION_MANAGER_PLUGIN,
  description: 'Provides the completion provider manager.',
  requires: [ISettingRegistry],
  optional: [IFormRendererRegistry],
  provides: ICompletionProviderManager,
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    settings: ISettingRegistry,
    editorRegistry: IFormRendererRegistry | null
  ): ICompletionProviderManager => {
    const AVAILABLE_PROVIDERS = 'availableProviders';
    const PROVIDER_TIMEOUT = 'providerTimeout';
    const SHOW_DOCUMENT_PANEL = 'showDocumentationPanel';
    const CONTINUOUS_HINTING = 'autoCompletion';
    const manager = new CompletionProviderManager();
    const updateSetting = (
      settingValues: ISettingRegistry.ISettings,
      availableProviders: string[]
    ): void => {
      const providersData = settingValues.get(AVAILABLE_PROVIDERS);
      const timeout = settingValues.get(PROVIDER_TIMEOUT);
      const showDoc = settingValues.get(SHOW_DOCUMENT_PANEL);
      const continuousHinting = settingValues.get(CONTINUOUS_HINTING);
      manager.setTimeout(timeout.composite as number);
      manager.setShowDocumentationPanel(showDoc.composite as boolean);
      manager.setContinuousHinting(continuousHinting.composite as boolean);
      const selectedProviders = providersData.user ?? providersData.composite;
      const sortedProviders = Object.entries(selectedProviders ?? {})
        .filter(val => val[1] >= 0 && availableProviders.includes(val[0]))
        .sort(([, rank1], [, rank2]) => rank2 - rank1)
        .map(item => item[0]);
      manager.activateProvider(sortedProviders);
    };

    app.restored
      .then(() => {
        const availableProviders = [...manager.getProviders().keys()];
        settings.transform(COMPLETION_MANAGER_PLUGIN, {
          fetch: plugin => {
            const schema = plugin.schema.properties!;
            const defaultValue: { [key: string]: number } = {};
            availableProviders.forEach((item, index) => {
              defaultValue[item] = (index + 1) * 100;
            });
            schema[AVAILABLE_PROVIDERS]['default'] = defaultValue;
            return plugin;
          }
        });
        const settingsPromise = settings.load(COMPLETION_MANAGER_PLUGIN);
        settingsPromise
          .then(settingValues => {
            updateSetting(settingValues, availableProviders);
            settingValues.changed.connect(newSettings => {
              updateSetting(newSettings, availableProviders);
            });
          })
          .catch(console.error);
      })
      .catch(console.error);

    if (editorRegistry) {
      const renderer: IFormRenderer = {
        fieldRenderer: (props: FieldProps) => {
          return renderAvailableProviders(props);
        }
      };
      editorRegistry.addRenderer(
        `${COMPLETION_MANAGER_PLUGIN}.availableProviders`,
        renderer
      );
    }

    return manager;
  }
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [manager, defaultProvider];
export default plugins;
