import '../../style/console.css';

export abstract class EditorLogConsole {
  abstract log(...args: any[]): void;
  abstract warn(...args: any[]): void;
  abstract error(...args: any[]): void;
}

export class FloatingConsole extends EditorLogConsole {
  // likely to be replaced by JupyterLab console: https://github.com/jupyterlab/jupyterlab/pull/6833#issuecomment-543016425
  element: HTMLElement;

  constructor() {
    super();
    this.element = document.createElement('ul');
    this.element.className = 'lsp-floating-console';
    document.body.appendChild(this.element);
  }

  append(text: string, kind = 'log') {
    let entry = document.createElement('li');
    entry.innerHTML = '<span class="lsp-kind">' + kind + '</span>' + text;
    this.element.appendChild(entry);
    this.element.scrollTop = this.element.scrollHeight;
  }

  private to_string(args: any[]) {
    return args
      .map(arg => '<span class="lsp-code">' + JSON.stringify(arg) + '</span>')
      .join(', ');
  }

  log(...args: any[]) {
    this.append(this.to_string(args), 'log');
  }
  warn(...args: any[]) {
    this.append(this.to_string(args), 'warn');
  }
  error(...args: any[]) {
    this.append(this.to_string(args), 'error');
  }
}

export class BrowserConsole extends EditorLogConsole {
  log(...args: any[]) {
    console.log('LSP: ', ...args);
  }
  warn(...args: any[]) {
    console.warn('LSP: ', ...args);
  }
  error(...args: any[]) {
    console.error('LSP: ', ...args);
  }
}

export function create_console(kind: 'browser' | 'floating'): EditorLogConsole {
  if (kind === 'browser') {
    return new BrowserConsole();
  } else {
    return new FloatingConsole();
  }
}
