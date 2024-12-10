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
import { COMPLETER_ACTIVE_CLASS } from '@jupyterlab/codeeditor';
import { CommandToolbarButton } from '@jupyterlab/ui-components';
import {
  CompletionProviderManager,
  ContextCompleterProvider,
  HistoryInlineCompletionProvider,
  ICompletionProviderManager,
  IInlineCompleterFactory,
  IInlineCompleterSettings,
  IInlineCompletionProviderInfo,
  InlineCompleter,
  KernelCompleterProvider
} from '@jupyterlab/completer';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import {
  caretLeftIcon,
  caretRightIcon,
  checkIcon,
  IFormRenderer,
  IFormRendererRegistry
} from '@jupyterlab/ui-components';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import type { FieldProps } from '@rjsf/utils';
import { CommandRegistry } from '@lumino/commands';

import { renderAvailableProviders } from './renderer';

const COMPLETION_MANAGER_PLUGIN = '@jupyterlab/completer-extension:manager';
const INLINE_COMPLETER_PLUGIN =
  '@jupyterlab/completer-extension:inline-completer';

namespace CommandIDs {
  export const nextInline = 'inline-completer:next';
  export const previousInline = 'inline-completer:previous';
  export const acceptInline = 'inline-completer:accept';
  export const invokeInline = 'inline-completer:invoke';
}

const defaultProviders: JupyterFrontEndPlugin<void> = {
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

const inlineHistoryProvider: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/completer-extension:inline-history',
  description:
    'Adds inline completion provider suggesting code from execution history.',
  requires: [ICompletionProviderManager],
  optional: [ITranslator],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    completionManager: ICompletionProviderManager,
    translator: ITranslator | null
  ): void => {
    completionManager.registerInlineProvider(
      new HistoryInlineCompletionProvider({
        translator: translator ?? nullTranslator
      })
    );
  }
};

const inlineCompleterFactory: JupyterFrontEndPlugin<IInlineCompleterFactory> = {
  id: '@jupyterlab/completer-extension:inline-completer-factory',
  description: 'Provides a factory for inline completer.',
  provides: IInlineCompleterFactory,
  optional: [ITranslator],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    translator: ITranslator | null
  ): IInlineCompleterFactory => {
    const trans = (translator || nullTranslator).load('jupyterlab');
    return {
      factory: options => {
        const inlineCompleter = new InlineCompleter({
          ...options,
          trans: trans
        });
        const describeShortcut = (commandID: string): string => {
          const binding = app.commands.keyBindings.find(
            binding => binding.command === commandID
          );
          const keys = binding
            ? CommandRegistry.formatKeystroke(binding.keys)
            : '';
          return keys ? `${keys}` : '';
        };

        const labelCache = {
          [CommandIDs.previousInline]: describeShortcut(
            CommandIDs.previousInline
          ),
          [CommandIDs.nextInline]: describeShortcut(CommandIDs.nextInline),
          [CommandIDs.acceptInline]: describeShortcut(CommandIDs.acceptInline)
        };

        app.commands.keyBindingChanged.connect(
          (
            _emitter: CommandRegistry,
            change: CommandRegistry.IKeyBindingChangedArgs
          ) => {
            const command = change.binding.command;
            if (labelCache.hasOwnProperty(command)) {
              const cached = labelCache[command as keyof typeof labelCache];
              const newLabel = describeShortcut(command);
              if (newLabel !== cached) {
                // Update cache
                labelCache[command as keyof typeof labelCache] = newLabel;
                // Re-render any UI elements using this command
                app.commands.notifyCommandChanged(command);
              }
            }
          }
        );

        inlineCompleter.toolbar.addItem(
          'previous-inline-completion',
          new CommandToolbarButton({
            commands: app.commands,
            icon: caretLeftIcon,
            id: CommandIDs.previousInline,
            label: () => labelCache[CommandIDs.previousInline],
            caption: trans.__('Previous')
          })
        );
        inlineCompleter.toolbar.addItem(
          'next-inline-completion',
          new CommandToolbarButton({
            commands: app.commands,
            icon: caretRightIcon,
            id: CommandIDs.nextInline,
            label: () => labelCache[CommandIDs.nextInline],
            caption: trans.__('Next')
          })
        );
        inlineCompleter.toolbar.addItem(
          'accept-inline-completion',
          new CommandToolbarButton({
            commands: app.commands,
            icon: checkIcon,
            id: CommandIDs.acceptInline,
            label: () => labelCache[CommandIDs.acceptInline],
            caption: trans.__('Accept')
          })
        );
        inlineCompleter.model!.suggestionsChanged.connect(() => {
          // Enabled state of these commands depends on whether
          // there are any suggestions (or whether there is more
          // than one suggestion) so the UI needs to be modified
          // when the suggestions change to reflect the enabled
          // state in the buttons state.
          for (const command of [
            CommandIDs.previousInline,
            CommandIDs.nextInline,
            CommandIDs.acceptInline
          ]) {
            app.commands.notifyCommandChanged(command);
          }
        });
        return inlineCompleter;
      }
    };
  }
};

const inlineCompleter: JupyterFrontEndPlugin<void> = {
  id: INLINE_COMPLETER_PLUGIN,
  description:
    'Registers the inline completer factory; adds inline completer commands, shortcuts and settings.',
  requires: [
    ICompletionProviderManager,
    IInlineCompleterFactory,
    ISettingRegistry
  ],
  optional: [ITranslator],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    completionManager: ICompletionProviderManager,
    factory: IInlineCompleterFactory,
    settings: ISettingRegistry,
    translator: ITranslator | null
  ): void => {
    completionManager.setInlineCompleterFactory(factory);
    const trans = (translator || nullTranslator).load('jupyterlab');
    const isEnabled = () =>
      !!app.shell.currentWidget && !!completionManager.inline;
    let inlineCompleterSettings: IInlineCompleterSettings | undefined;
    app.commands.addCommand(CommandIDs.nextInline, {
      execute: () => {
        completionManager.inline?.cycle(app.shell.currentWidget!.id!, 'next');
      },
      label: trans.__('Next Inline Completion'),
      isEnabled
    });
    app.commands.addCommand(CommandIDs.previousInline, {
      execute: () => {
        completionManager.inline?.cycle(
          app.shell.currentWidget!.id!,
          'previous'
        );
      },
      label: trans.__('Previous Inline Completion'),
      isEnabled
    });
    app.commands.addCommand(CommandIDs.acceptInline, {
      execute: () => {
        completionManager.inline?.accept(app.shell.currentWidget!.id!);
      },
      label: trans.__('Accept Inline Completion'),
      isEnabled: () => {
        return (
          isEnabled() &&
          completionManager.inline!.isActive(app.shell.currentWidget!.id!)
        );
      }
    });
    app.commands.addCommand(CommandIDs.invokeInline, {
      execute: () => {
        completionManager.inline?.invoke(app.shell.currentWidget!.id!);
      },
      label: trans.__('Invoke Inline Completer'),
      isEnabled
    });

    const updateSettings = (settings: ISettingRegistry.ISettings) => {
      inlineCompleterSettings =
        settings.composite as unknown as IInlineCompleterSettings;
      completionManager.inline?.configure(inlineCompleterSettings);
    };

    app.restored
      .then(() => {
        const availableProviders = completionManager.inlineProviders ?? [];
        const composeDefaults = (provider: IInlineCompletionProviderInfo) => {
          return {
            // By default all providers are opt-out, but
            // any provider can configure itself to be opt-in.
            enabled: true,
            autoFillInMiddle: false,
            timeout: 5000,
            debouncerDelay: 0,
            ...((provider.schema?.default as object) ?? {})
          };
        };
        settings.transform(INLINE_COMPLETER_PLUGIN, {
          compose: plugin => {
            const providers: IInlineCompleterSettings['providers'] =
              (plugin.data.composite[
                'providers'
              ] as IInlineCompleterSettings['providers']) ?? {};
            for (const provider of availableProviders) {
              const defaults = composeDefaults(provider);
              providers[provider.identifier] = {
                ...defaults,
                ...(providers[provider.identifier] ?? {})
              };
            }
            // Add fallback defaults in composite settings values
            plugin.data['composite']['providers'] = providers;
            return plugin;
          },
          fetch: plugin => {
            const schema = plugin.schema.properties!;
            const providersSchema: {
              [property: string]: ISettingRegistry.IProperty;
            } = {};
            for (const provider of availableProviders) {
              providersSchema[provider.identifier] = {
                title: trans.__('%1 provider', provider.name),
                properties: {
                  ...(provider.schema?.properties ?? {}),
                  timeout: {
                    title: trans.__('Timeout'),
                    description: trans.__(
                      'Timeout for %1 provider (in milliseconds).',
                      provider.name
                    ),
                    type: 'number',
                    minimum: 0
                  },
                  debouncerDelay: {
                    title: trans.__('Debouncer delay'),
                    minimum: 0,
                    description: trans.__(
                      'Time since the last key press to wait before requesting completions from %1 provider (in milliseconds).',
                      provider.name
                    ),
                    type: 'number'
                  },
                  enabled: {
                    title: trans.__('Enabled'),
                    description: trans.__(
                      'Whether to fetch completions %1 provider.',
                      provider.name
                    ),
                    type: 'boolean'
                  },
                  autoFillInMiddle: {
                    title: trans.__('Fill in middle on typing'),
                    description: trans.__(
                      'Whether to show completions in the middle of the code line from %1 provider on typing.',
                      provider.name
                    ),
                    type: 'boolean'
                  }
                },
                default: composeDefaults(provider),
                type: 'object'
              };
            }
            // Populate schema for providers settings
            schema['providers']['properties'] = providersSchema;
            return plugin;
          }
        });

        const settingsPromise = settings.load(INLINE_COMPLETER_PLUGIN);
        settingsPromise
          .then(settingValues => {
            updateSettings(settingValues);
            settingValues.changed.connect(newSettings => {
              updateSettings(newSettings);
            });
          })
          .catch(console.error);
      })
      .catch(console.error);

    const findKeybinding = (
      commandID: string
    ): CommandRegistry.IKeyBinding | undefined => {
      return app.commands.keyBindings.find(
        binding => binding.command === commandID
      );
    };

    const keyBindings = {
      [CommandIDs.acceptInline]: findKeybinding(CommandIDs.acceptInline),
      [CommandIDs.invokeInline]: findKeybinding(CommandIDs.invokeInline)
    };

    app.commands.keyBindingChanged.connect(
      (
        _emitter: CommandRegistry,
        change: CommandRegistry.IKeyBindingChangedArgs
      ) => {
        const command = change.binding.command;
        if (keyBindings.hasOwnProperty(command)) {
          keyBindings[command as keyof typeof keyBindings] =
            findKeybinding(command);
        }
      }
    );

    const evtKeydown = (event: KeyboardEvent) => {
      // Handle bindings to `Tab` key specially
      if (!(event.target instanceof Element)) {
        return;
      }
      const target = event.target as Element;
      switch (event.keyCode) {
        case 9: {
          // Tab key
          const potentialTabBindings = [
            // Note: `accept` should come ahead of `invoke` due to specificity
            keyBindings[CommandIDs.acceptInline],
            keyBindings[CommandIDs.invokeInline]
          ];
          for (const binding of potentialTabBindings) {
            if (
              binding &&
              binding.keys.length === 1 &&
              binding.keys[0] === 'Tab' &&
              target.closest(binding.selector) &&
              app.commands.isEnabled(binding.command)
            ) {
              const tabCompleterActive = target.closest(
                '.' + COMPLETER_ACTIVE_CLASS
              );
              if (
                inlineCompleterSettings?.suppressIfTabCompleterActive &&
                tabCompleterActive
              ) {
                return;
              }
              app.commands.execute(binding.command).catch(console.error);
              event.preventDefault();
              event.stopPropagation();
              event.stopImmediatePropagation();
              return;
            }
          }
          break;
        }
        default:
          return;
      }
    };
    document.addEventListener('keydown', evtKeydown, true);
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
    const manager = new CompletionProviderManager();
    const updateSetting = (
      settingValues: ISettingRegistry.ISettings,
      availableProviders: string[]
    ): void => {
      const providersData = settingValues.get(AVAILABLE_PROVIDERS);
      const composite = settingValues.composite;
      manager.setTimeout(composite.providerTimeout as number);
      manager.setShowDocumentationPanel(
        composite.showDocumentationPanel as boolean
      );
      manager.setContinuousHinting(composite.autoCompletion as boolean);
      manager.setSuppressIfInlineCompleterActive(
        composite.suppressIfInlineCompleterActive as boolean
      );
      const selectedProviders = providersData.user ?? providersData.composite;
      const sortedProviders = Object.entries(selectedProviders ?? {})
        .filter(val => val[1] >= 0 && availableProviders.includes(val[0]))
        .sort(([, rank1], [, rank2]) => rank2 - rank1)
        .map(item => item[0]);
      manager.activateProvider(sortedProviders);
    };

    app.restored
      .then(() => {
        const availableProviders = [...manager.getProviders().entries()];
        const availableProviderIDs = availableProviders.map(
          ([key, value]) => key
        );
        settings.transform(COMPLETION_MANAGER_PLUGIN, {
          fetch: plugin => {
            const schema = plugin.schema.properties!;
            const defaultValue: { [key: string]: number } = {};
            availableProviders.forEach(([key, value], index) => {
              defaultValue[key] = value.rank ?? (index + 1) * 10;
            });
            schema[AVAILABLE_PROVIDERS]['default'] = defaultValue;
            return plugin;
          }
        });
        const settingsPromise = settings.load(COMPLETION_MANAGER_PLUGIN);
        settingsPromise
          .then(settingValues => {
            updateSetting(settingValues, availableProviderIDs);
            settingValues.changed.connect(newSettings => {
              updateSetting(newSettings, availableProviderIDs);
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
const plugins: JupyterFrontEndPlugin<any>[] = [
  manager,
  defaultProviders,
  inlineHistoryProvider,
  inlineCompleterFactory,
  inlineCompleter
];
export default plugins;
