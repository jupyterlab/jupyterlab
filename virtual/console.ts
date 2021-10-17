import '../../style/console.css';
import { JupyterFrontEndPlugin } from '@jupyterlab/application';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { Signal } from '@lumino/signaling';

import {
  LanguageServer as LSPSettings,
  LoggingConsoleVerbosityLevel
} from '../_plugin';
import { ILSPLogConsole, ILogConsoleCore, PLUGIN_ID } from '../tokens';

interface ILogConsoleImplementation extends ILogConsoleCore {
  dispose(): void;
  bindThis(): any;
}

function to_string(args: any[]): string {
  return args
    .map(arg => {
      let textual: string;
      if (typeof arg === 'string') {
        return arg;
      }
      try {
        textual = JSON.stringify({ k: arg }).slice(5, -1);
      } catch {
        textual = '' + arg;
      }
      return '<span class="lsp-code">' + textual + '</span>';
    })
    .join(' ');
}

class FloatingConsole implements ILogConsoleImplementation {
  // likely to be replaced by JupyterLab console: https://github.com/jupyterlab/jupyterlab/pull/6833#issuecomment-543016425
  private readonly element: HTMLElement;

  constructor(scope: string[] = ['LSP'], element: HTMLElement = null) {
    if (element) {
      this.element = element;
    } else {
      this.element = document.createElement('ul');
      this.element.className = 'lsp-floating-console';
      document.body.appendChild(this.element);
    }
  }

  bindThis(): any {
    return this;
  }

  dispose() {
    this.element.remove();
  }

  append(text: string, kind = 'log') {
    let entry = document.createElement('li');
    entry.innerHTML = '<span class="lsp-kind">' + kind + '</span>' + text;
    this.element.appendChild(entry);
    this.element.scrollTop = this.element.scrollHeight;
  }

  debug(...args: any[]) {
    this.append(to_string(args), 'debug');
  }
  log(...args: any[]) {
    this.append(to_string(args), 'log');
  }
  warn(...args: any[]) {
    this.append(to_string(args), 'warn');
  }
  error(...args: any[]) {
    this.append(to_string(args), 'error');
  }
}

/**
 * Used both as a console implementation, and as a dummy ILSPLogConsole
 */
export class BrowserConsole
  implements ILogConsoleImplementation, ILSPLogConsole
{
  debug = window.console.debug.bind(window.console);
  log = window.console.log.bind(window.console);
  warn = window.console.warn.bind(window.console);
  error = window.console.error.bind(window.console);

  dispose(): void {
    return;
  }
  scope(scope: string): BrowserConsole {
    return this;
  }

  bindThis(): any {
    return window.console;
  }
}

class ConsoleWrapper implements ILSPLogConsole {
  private readonly singleton: ConsoleSingleton;
  private readonly breadcrumbs: string[];
  private readonly _scope: string;

  constructor(scope: string[] = ['LSP'], singleton: ConsoleSingleton) {
    this.breadcrumbs = scope;
    this._scope = this.breadcrumbs.join('.') + ':';
    this.singleton = singleton;
    this.singleton.changed.connect(this._rebind_functions.bind(this));
    this._rebind_functions();
  }

  /**
   * Re-binding directly to the underlying functions allows to get nice
   * location (file:line) of the actual call rather than of this wrapper
   * when using with the browser implementation.
   */
  _rebind_functions() {
    const no_op = () => {
      // do nothing
    };
    const bind_arg = this.implementation.bindThis();

    if (this.verbosity === 'debug') {
      this.debug = this.implementation.debug.bind(bind_arg, this._scope);
    } else {
      this.debug = no_op;
    }

    if (this.verbosity === 'debug' || this.verbosity === 'log') {
      this.log = this.implementation.log.bind(bind_arg, this._scope);
    } else {
      this.log = no_op;
    }

    if (
      this.verbosity === 'debug' ||
      this.verbosity === 'log' ||
      this.verbosity === 'warn'
    ) {
      this.warn = this.implementation.warn.bind(bind_arg, this._scope);
    } else {
      this.warn = no_op;
    }

    this.error = this.implementation.error.bind(bind_arg, this._scope);
  }

  get verbosity() {
    return this.singleton.verbosity;
  }

  get implementation() {
    return this.singleton.implementation;
  }

  debug(...args: any[]) {
    return this.implementation.debug(this._scope, ...args);
  }
  log(...args: any[]) {
    return this.implementation.log(this._scope, ...args);
  }
  warn(...args: any[]) {
    return this.implementation.warn(this._scope, ...args);
  }
  error(...args: any[]) {
    return this.implementation.error(this._scope, ...args);
  }

  scope(scope: string): ILSPLogConsole {
    return new ConsoleWrapper([...this.breadcrumbs, scope], this.singleton);
  }
}

class ConsoleSingleton {
  public verbosity: LoggingConsoleVerbosityLevel;
  public implementation: ILogConsoleImplementation;
  public changed: Signal<ConsoleSingleton, void>;

  constructor(setting_registry: ISettingRegistry) {
    // until loaded log everything, to browser console
    this.verbosity = 'debug';
    this.implementation = new BrowserConsole();
    this.changed = new Signal(this);

    setting_registry
      .load(PLUGIN_ID + ':plugin')
      .then(settings => {
        this.updateSettings(settings);
        settings.changed.connect(() => {
          this.updateSettings(settings);
        });
      })
      .catch(console.warn);
  }

  updateSettings(settings: ISettingRegistry.ISettings) {
    const composite = settings.composite as LSPSettings;
    const kind = composite.loggingConsole;

    if (this.implementation) {
      this.implementation.dispose();
    }

    if (kind === 'browser') {
      this.implementation = new BrowserConsole();
    } else if (kind === 'floating') {
      this.implementation = new FloatingConsole();
    } else {
      console.warn(
        'Unknown console type',
        kind,
        'falling back to browser console'
      );
      this.implementation = new BrowserConsole();
    }

    this.verbosity = composite.loggingLevel;
    this.changed.emit();
  }
}

export const LOG_CONSOLE: JupyterFrontEndPlugin<ILSPLogConsole> = {
  id: PLUGIN_ID + ':ILSPLogConsole',
  requires: [ISettingRegistry],
  activate: (app, setting_registry: ISettingRegistry) => {
    const singleton = new ConsoleSingleton(setting_registry);
    return new ConsoleWrapper(['LSP'], singleton);
  },
  provides: ILSPLogConsole,
  autoStart: true
};
