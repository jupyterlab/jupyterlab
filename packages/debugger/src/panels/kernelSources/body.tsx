// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import React from 'react';

import {
  classes,
  LabIcon,
  openKernelSourceIcon,
  ReactWidget,
  UseSignal
} from '@jupyterlab/ui-components';

import { showErrorMessage } from '@jupyterlab/apputils';

import { ITranslator, nullTranslator } from '@jupyterlab/translation';

import { IDebugger } from '../../tokens';
import { IRenderMime } from '@jupyterlab/rendermime';

/**
 * The class for each source row.
 */
const SOURCE_CLASS = 'jp-DebuggerKernelSource-source';

/**
 * The body for a Sources Panel.
 */
export class KernelSourcesBody extends ReactWidget {
  /**
   * Instantiate a new Body for the KernelSourcesBody widget.
   *
   * @param options The instantiation options for a KernelSourcesBody.
   */
  constructor(options: KernelSourcesBody.IOptions) {
    super();
    this._model = options.model;
    this._debuggerService = options.service;
    this._trans = (options.translator ?? nullTranslator).load('jupyterlab');

    this.addClass('jp-DebuggerKernelSources-body');
  }

  render() {
    return (
      <React.Fragment>
        <UseSignal signal={this._model.changed}>
          {(_, kernelSources) => {
            const keymap: { [key: string]: number } = {};
            const query = (this._model.filter ?? '').toLowerCase();
            const filtered = (kernelSources ?? []).filter(module =>
              module.name.toLowerCase().includes(query)
            );

            return filtered.map(module => {
              const name = module.name;
              const path = module.path;
              const key =
                name + (keymap[name] = (keymap[name] ?? 0) + 1).toString();
              return (
                <div
                  key={key}
                  title={path}
                  className={SOURCE_CLASS}
                  onClick={() => {
                    this._debuggerService
                      .getSource({
                        sourceReference: 0,
                        path: path
                      })
                      .then(source => {
                        this._model.open(source);
                      })
                      .catch(reason => {
                        void showErrorMessage(
                          this._trans.__('Fail to get source'),
                          this._trans.__(
                            "Fail to get '%1' source:\n%2",
                            path,
                            reason
                          )
                        );
                      });
                  }}
                >
                  <LabIcon.resolveReact
                    icon={openKernelSourceIcon}
                    iconClass={classes('jp-Icon')}
                    tag={null}
                  />
                  {name}
                </div>
              );
            });
          }}
        </UseSignal>
      </React.Fragment>
    );
  }

  private _model: IDebugger.Model.IKernelSources;
  private _debuggerService: IDebugger;
  private _trans: IRenderMime.TranslationBundle;
}

/**
 * A namespace for SourcesBody `statics`.
 */
export namespace KernelSourcesBody {
  /**
   * Instantiation options for `KernelSourcesBody`.
   */
  export interface IOptions {
    /**
     * The debug service.
     */
    service: IDebugger;

    /**
     * The sources model.
     */
    model: IDebugger.Model.IKernelSources;

    /**
     * The application language translator
     */
    translator?: ITranslator;
  }
}
