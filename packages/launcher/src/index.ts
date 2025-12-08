// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ILayoutRestorer, JupyterFrontEnd, JupyterFrontEndPlugin } from '@jupyterlab/application';

import { ILauncher } from '@jupyterlab/launcher';

import { ReadonlyPartialJSONObject } from '@lumino/coreutils';

import { CommandRegistry } from '@lumino/commands';

import { IStateDB } from '@jupyterlab/coreutils';

/**
 * The default launcher provider.
 */
const DEFAULT_LAUNCHER: JupyterFrontEndPlugin<ILauncher> = {
  id: '@jupyterlab/launcher-extension:default',
  provides: ILauncher,
  autoStart: true,
  requires: [IStateDB],
  optional: [ILayoutRestorer],
  activate: (
    app: JupyterFrontEnd,
    state: IStateDB,
    restorer?: ILayoutRestorer
  ) => {
    const { commands, serviceManager } = app;
    const category = 'Launcher';
    const cmdIds: string[] = [];

    // **BUG FIX #18185**: Filter invalid kernel specs (empty resources)
    const createLauncher = async (): Promise<ILauncher> => {
      const model = app.serviceManager.launcher;
      
      // Get kernel specs with validation
      const specs = await serviceManager.kernelspec.getSpecs();
      const validKernelSpecs = Object.entries(specs.kernelspecs || {})
        .filter(([_, spec]: [string, any]) => {
          // Skip ghost kernels: empty resources after uninstall (Issue #18185)
          const resources = spec.resources || {};
          return Object.keys(resources).length > 0 || 
                 resources['logo-64x64'] || 
                 resources['logo-32x32'];
        })
        .reduce((acc: any, [name, spec]: [string, any]) => {
          acc[name] = spec;
          return acc;
        }, {});

      // Update model with validated specs only
      model._modelData.set('kernelSpecs', validKernelSpecs);

      return model;
    };

    // Register commands
    const registry = new CommandRegistry();
    commands.addHandler(category, createLauncher);

    // Track launcher commands
    const tracker = app.commands.commandPalette.addCategory(category);

    // Add launcher command
    const launcherCmd = 'launcher:create';
    cmdIds.push(launcherCmd);
    commands.addCommand(launcherCmd, {
      label: args => {
        const label = args['label'] || 'Launcher';
        const category = args['category'] || 'Launcher';
        return `New ${label} (${category})`;
      },
      execute: args => {
        const id = 'launcher';
        const options = {
          args: args as ReadonlyPartialJSONObject || {}
        } as any;

        if (restorer?.isRestored) {
          const widget = restorer.find(id, options.args?.category);
          if (widget) {
            void restorer.restore(widget, options);
            widget.activate();
            return;
          }
        }

        const widget = app.serviceManager.launcher.create(args as any);
        widget.id = id;
        widget.title.label = args['label'] || 'Launcher';
        widget.title.closable = true;
        widget.addClass('jp-Launcher');

        if (restorer) {
          restorer.add(widget, id, options.args?.category);
        }

        if (!widget.isAttached) {
          app.shell.add(widget, 'main');
        }

        app.shell.activateById(widget.id);
      }
    });

    // Track all commands
    tracker.add(launcherCmd, { category });

    return app.serviceManager.launcher;
  }
};

export default DEFAULT_LAUNCHER;
/**
 * @packageDocumentation
 * @module launcher
 */
