import { JupyterFrontEndPlugin } from '@jupyterlab/application';

import {
  ICodeOverridesRegistry,
  ILSPCodeOverridesManager,
  IScopedCodeOverride
} from './tokens';

class CodeOverridesManager implements ILSPCodeOverridesManager {
  private readonly _overrides: ICodeOverridesRegistry;

  get registry() {
    return this._overrides;
  }

  constructor() {
    this._overrides = {};
  }

  register(override: IScopedCodeOverride, language: string) {
    if (!(language in this._overrides)) {
      this._overrides[language] = { cell: [], line: [] };
    }
    let overrides = this._overrides[language];
    switch (override.scope) {
      case 'cell':
        overrides.cell.push(override);
        break;
      case 'line':
        overrides.line.push(override);
        break;
    }
  }
}

export const CODE_OVERRIDES_MANAGER: JupyterFrontEndPlugin<ILSPCodeOverridesManager> =
  {
    id: ILSPCodeOverridesManager.name,
    requires: [],
    activate: app => {
      return new CodeOverridesManager();
    },
    provides: ILSPCodeOverridesManager,
    autoStart: true
  };
