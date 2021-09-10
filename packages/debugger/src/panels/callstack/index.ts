// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ITranslator } from '@jupyterlab/translation';
import { CommandToolbarButton } from '@jupyterlab/ui-components';
import { CommandRegistry } from '@lumino/commands';
import { Panel } from '@lumino/widgets';
import { IDebugger } from '../../tokens';
import { PanelWidget } from '../panelwidget';
import { CallstackBody } from './body';

/**
 * A Panel to show a callstack.
 */
export class Callstack extends PanelWidget {
  /**
   * Instantiate a new Callstack Panel.
   *
   * @param options The instantiation options for a Callstack Panel.
   */
  constructor(options: Callstack.IOptions) {
    super(options);
    const { commands, model } = options;
    this.title.label = this.trans.__('Callstack');
    const body = new CallstackBody(model);

    this.header.addItem(
      'continue',
      new CommandToolbarButton({
        commands: commands.registry,
        id: commands.continue,
        label: ''
      })
    );

    this.header.addItem(
      'terminate',
      new CommandToolbarButton({
        commands: commands.registry,
        id: commands.terminate,
        label: ''
      })
    );

    this.header.addItem(
      'step-over',
      new CommandToolbarButton({
        commands: commands.registry,
        id: commands.next,
        label: ''
      })
    );

    this.header.addItem(
      'step-in',
      new CommandToolbarButton({
        commands: commands.registry,
        id: commands.stepIn,
        label: ''
      })
    );

    this.header.addItem(
      'step-out',
      new CommandToolbarButton({
        commands: commands.registry,
        id: commands.stepOut,
        label: ''
      })
    );

    this.header.addItem(
      'evaluate',
      new CommandToolbarButton({
        commands: commands.registry,
        id: commands.evaluate,
        label: ''
      })
    );
    this.addWidget(this.header);
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
     * The continue command ID.
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
