// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { CommandToolbarButton, Toolbar } from '@jupyterlab/ui-components';
import { CommandRegistry } from '@lumino/commands';
import { Panel } from '@lumino/widgets';
import { IDebugger } from '../../tokens';
import { CallstackBody } from './body';

/**
 * A Panel to show a callstack.
 */
export class Callstack extends Panel {
  /**
   * Instantiate a new Callstack Panel.
   *
   * @param options The instantiation options for a Callstack Panel.
   */
  constructor(options: Callstack.IOptions) {
    super();
    const { commands, model } = options;
    const translator = options.translator || nullTranslator;
    const trans = translator.load('jupyterlab');
    this.title.label = trans.__('Callstack');
    const header = new Toolbar();
    header.addClass('jp-stack-panel-header');
    const body = new CallstackBody(model);

    header.addItem(
      'continue',
      new CommandToolbarButton({
        commands: commands.registry,
        id: commands.continue,
        label: ''
      })
    );

    header.addItem(
      'terminate',
      new CommandToolbarButton({
        commands: commands.registry,
        id: commands.terminate,
        label: ''
      })
    );

    header.addItem(
      'step-over',
      new CommandToolbarButton({
        commands: commands.registry,
        id: commands.next,
        label: ''
      })
    );

    header.addItem(
      'step-in',
      new CommandToolbarButton({
        commands: commands.registry,
        id: commands.stepIn,
        label: ''
      })
    );

    header.addItem(
      'step-out',
      new CommandToolbarButton({
        commands: commands.registry,
        id: commands.stepOut,
        label: ''
      })
    );

    header.addItem(
      'evaluate',
      new CommandToolbarButton({
        commands: commands.registry,
        id: commands.evaluate,
        label: ''
      })
    );
    this._header = header;
    this.addWidget(header);
    this.addWidget(body);

    this.addClass('jp-DebuggerCallstack');
  }

  get header(): Toolbar {
    return this._header;
  }

  /**
   * The toolbar widget, it is not attached to current widget
   * but is rendered by the sidebar panel.
   */
  private _header: Toolbar;
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
