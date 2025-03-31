// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import {
  CommandToolbarButton,
  PanelWithToolbar
} from '@jupyterlab/ui-components';
import { CommandRegistry } from '@lumino/commands';
import { Panel } from '@lumino/widgets';
import { IDebugger } from '../../tokens';
import { CallstackBody } from './body';

/**
 * A Panel to show a callstack.
 */
export class Callstack extends PanelWithToolbar {
  /**
   * Instantiate a new Callstack Panel.
   *
   * @param options The instantiation options for a Callstack Panel.
   */
  constructor(options: Callstack.IOptions) {
    super(options);
    const { commands, model } = options;
    const trans = (options.translator ?? nullTranslator).load('jupyterlab');
    this.title.label = trans.__('Callstack');
    const body = new CallstackBody(model);

    this.toolbar.node.setAttribute(
      'aria-label',
      trans.__('Callstack panel toolbar')
    );
    this.toolbar.addItem(
      'continue',
      new CommandToolbarButton({
        commands: commands.registry,
        id: commands.continue,
        label: ''
      })
    );

    this.toolbar.addItem(
      'terminate',
      new CommandToolbarButton({
        commands: commands.registry,
        id: commands.terminate,
        label: ''
      })
    );

    this.toolbar.addItem(
      'step-over',
      new CommandToolbarButton({
        commands: commands.registry,
        id: commands.next,
        label: ''
      })
    );

    this.toolbar.addItem(
      'step-in',
      new CommandToolbarButton({
        commands: commands.registry,
        id: commands.stepIn,
        label: ''
      })
    );

    this.toolbar.addItem(
      'step-out',
      new CommandToolbarButton({
        commands: commands.registry,
        id: commands.stepOut,
        label: ''
      })
    );

    this.toolbar.addItem(
      'evaluate',
      new CommandToolbarButton({
        commands: commands.registry,
        id: commands.evaluate,
        label: ''
      })
    );

    this.addWidget(body);
    this.addClass('jp-DebuggerCallstack');
  }
}

/**
 * A namespace for Callstack `statics`.
 */
export namespace Callstack {
  /**
   * The toolbar commands and registry for the callstack.
   */
  export interface ICommands {
    /**
     * The command registry.
     */
    registry: CommandRegistry;

    /**
     * The pause/continue command ID.
     */
    continue: string;

    /**
     * The terminate command ID.
     */
    terminate: string;

    /**
     * The next / stepOver command ID.
     */
    next: string;

    /**
     * The stepIn command ID.
     */
    stepIn: string;

    /**
     * The stepOut command ID.
     */
    stepOut: string;

    /**
     * The evaluate command ID.
     */
    evaluate: string;
  }

  /**
   * Instantiation options for `Callstack`.
   */
  export interface IOptions extends Panel.IOptions {
    /**
     * The toolbar commands interface for the callstack.
     */
    commands: ICommands;

    /**
     * The model for the callstack.
     */
    model: IDebugger.Model.ICallstack;

    /**
     * The application language translator
     */
    translator?: ITranslator;
  }
}
