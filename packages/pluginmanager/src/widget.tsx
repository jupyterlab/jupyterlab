/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { ITranslator, TranslationBundle } from '@jupyterlab/translation';
import {
  FilterBox,
  stopIcon as lockIcon,
  ReactWidget,
  Table
} from '@jupyterlab/ui-components';
import { Panel } from '@lumino/widgets';
import * as React from 'react';
import { Action, IEntry, PluginListModel } from './model';

/**
 * A namespace for plugins panel.
 */
export namespace Plugins {
  /**
   * The initialization options for a plugins panel.
   */
  export interface IOptions {
    model: PluginListModel;
    translator: ITranslator;
  }
}

/**
 * Panel with a table of available plugins allowing to enable/disable each.
 */
export class Plugins extends Panel {
  constructor(options: Plugins.IOptions) {
    const { model, translator } = options;
    super();
    this.model = model;
    this.addClass('jp-pluginmanager');

    this.trans = translator.load('jupyterlab');

    this.addWidget(new Disclaimer(model, this.trans));

    const header = new Header(model, this.trans);
    this.addWidget(header);

    const availableList = new AvailableList(model, this.trans);
    this.addWidget(availableList);
  }
  readonly model: PluginListModel;
  protected trans: TranslationBundle;
}

class AvailableList extends ReactWidget {
  constructor(
    protected model: PluginListModel,
    protected trans: TranslationBundle
  ) {
    super();
    this.addClass('jp-pluginmanager-AvailableList');
    model.stateChanged.connect(this.update, this);
  }

  render(): JSX.Element {
    return (
      <>
        {this.model.statusError !== null ? (
          <ErrorMessage>
            {this.trans.__(
              'Error querying installed extensions%1',
              this.model.statusError ? `: ${this.model.statusError}` : '.'
            )}
          </ErrorMessage>
        ) : this.model.isLoading ? (
          <div className="jp-pluginmanager-loader">
            {this.trans.__('Updating plugin list…')}
          </div>
        ) : (
          <Table<IEntry>
            blankIndicator={() => {
              return <div>{this.trans.__('No entries')}</div>;
            }}
            sortKey={'plugin-id'}
            rows={this.model.available
              .filter(pkg => {
                const pattern = new RegExp(this.model.query, 'i');
                return (
                  pattern.test(pkg.id) ||
                  pattern.test(pkg.extension) ||
                  (pkg.tokenLabel && pattern.test(pkg.tokenLabel))
                );
              })
              .map(data => {
                return {
                  data: data,
                  key: data.id
                };
              })}
            columns={[
              {
                id: 'plugin-id',
                label: this.trans.__('Plugin'),
                renderCell: (row: IEntry) => (
                  <>
                    <code>{row.id}</code>
                    <br />
                    {row.description}
                  </>
                ),
                sort: (a: IEntry, b: IEntry) => a.id.localeCompare(b.id)
              },
              {
                id: 'description',
                label: this.trans.__('Description'),
                renderCell: (row: IEntry) => <>{row.description}</>,
                sort: (a: IEntry, b: IEntry) =>
                  a.description.localeCompare(b.description),
                isHidden: true
              },
              {
                id: 'autostart',
                label: this.trans.__('Autostart?'),
                renderCell: (row: IEntry) => (
                  <>
                    {row.autoStart ? this.trans.__('Yes') : this.trans.__('No')}
                  </>
                ),
                sort: (a: IEntry, b: IEntry) =>
                  a.autoStart === b.autoStart ? 0 : a.autoStart ? -1 : 1
              },
              {
                id: 'requires',
                label: this.trans.__('Depends on'),
                renderCell: (row: IEntry) => (
                  <>{row.requires.map(v => v.name).join('\n')}</>
                ),
                sort: (a: IEntry, b: IEntry) =>
                  (a.requires || []).length - (b.requires || []).length,
                isHidden: true
              },
              {
                id: 'extension',
                label: this.trans.__('Extension'),
                renderCell: (row: IEntry) => <>{row.extension}</>,
                sort: (a: IEntry, b: IEntry) =>
                  a.extension.localeCompare(b.extension)
              },
              {
                id: 'provides',
                label: this.trans.__('Provides'),
                renderCell: (row: IEntry) => (
                  <>
                    {row.provides ? (
                      <code title={row.provides.name}>{row.tokenLabel}</code>
                    ) : (
                      '-'
                    )}
                  </>
                ),
                sort: (a: IEntry, b: IEntry) =>
                  (a.tokenLabel || '').localeCompare(b.tokenLabel || '')
              },
              {
                id: 'enabled',
                label: this.trans.__('Enabled'),
                renderCell: (row: IEntry) => (
                  <>
                    <input
                      type="checkbox"
                      checked={row.enabled}
                      disabled={row.locked || !this.model.isDisclaimed}
                      onChange={(
                        event: React.ChangeEvent<HTMLInputElement>
                      ) => {
                        if (!this.model.isDisclaimed) {
                          return;
                        }
                        if (event.target.checked) {
                          void this.onAction('enable', row);
                        } else {
                          void this.onAction('disable', row);
                        }
                      }}
                    />
                    {row.locked ? (
                      <lockIcon.react
                        tag="span"
                        title={this.trans.__(
                          'This plugin was locked by system administrator or is a cricital dependency and cannot be enabled/disabled.'
                        )}
                      />
                    ) : (
                      ''
                    )}
                  </>
                ),
                sort: (a: IEntry, b: IEntry) => +a.enabled - +b.enabled
              }
            ]}
          />
        )}
      </>
    );
  }

  /**
   * Callback handler for when the user wants to perform an action on an extension.
   *
   * @param action The action to perform.
   * @param entry The entry to perform the action on.
   */
  onAction(action: Action, entry: IEntry): Promise<void> {
    switch (action) {
      case 'enable':
        return this.model.enable(entry);
      case 'disable':
        return this.model.disable(entry);
      default:
        throw new Error(`Invalid action: ${action}`);
    }
  }
}

class Disclaimer extends ReactWidget {
  constructor(
    protected model: PluginListModel,
    protected trans: TranslationBundle
  ) {
    super();
    model.stateChanged.connect(this.update, this);
    this.addClass('jp-pluginmanager-Disclaimer');
  }
  render(): JSX.Element {
    return (
      <div>
        <div>
          {this.trans.__(
            'Customise your experience/improve performance by disabling plugins you do not need. To disable or uninstall an entire extension use the Extension Manager instead. Changes will apply after reloading JupyterLab.'
          )}
        </div>
        <label>
          <input
            type="checkbox"
            className="jp-mod-styled jp-pluginmanager-Disclaimer-checkbox"
            defaultChecked={this.model.isDisclaimed}
            onChange={event => {
              this.model.isDisclaimed = event.target.checked;
            }}
          />
          {this.trans.__(
            'I understand that disabling core application plugins may render features and parts of the user interface unavailable and recovery using `jupyter labextension enable <plugin-name>` command may be required'
          )}
        </label>
      </div>
    );
  }
}

class Header extends ReactWidget {
  constructor(
    protected model: PluginListModel,
    protected trans: TranslationBundle
  ) {
    super();
    model.stateChanged.connect(this.update, this);
    this.addClass('jp-pluginmanager-Header');
  }

  render(): JSX.Element {
    return (
      <>
        <FilterBox
          placeholder={this.trans.__('Filter')}
          updateFilter={(fn, query) => {
            this.model.query = query ?? '';
          }}
          initialQuery={this.model.query}
          useFuzzyFilter={false}
        />
        <div
          className={`jp-pluginmanager-pending ${
            this.model.hasPendingActions() ? 'jp-mod-hasPending' : ''
          }`}
        />
        {this.model.actionError && (
          <ErrorMessage>
            <p>{this.trans.__('Error when performing an action.')}</p>
            <p>{this.trans.__('Reason given:')}</p>
            <pre>{this.model.actionError}</pre>
          </ErrorMessage>
        )}
      </>
    );
  }
}

function ErrorMessage(props: ErrorMessage.IProperties) {
  return <div className="jp-pluginmanager-error">{props.children}</div>;
}

namespace ErrorMessage {
  export interface IProperties {
    children: React.ReactNode;
  }
}
