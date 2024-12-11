// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import type { JupyterLab } from '@jupyterlab/application';
import { TranslationBundle } from '@jupyterlab/translation';
import * as React from 'react';

export function PluginRequiredMessage(props: {
  plugin: JupyterLab.IPluginInfo;
  dependants: JupyterLab.IPluginInfo[];
  trans: TranslationBundle;
}): React.ReactElement<any> {
  return (
    <>
      {props.trans.__(
        'The plugin "%1" cannot be disabled as it is required by other plugins:',
        props.plugin.id
      )}
      <ul>
        {props.dependants.map(plugin => (
          <li key={'dependantsDialog-' + plugin.id}>{plugin.id}</li>
        ))}
      </ul>
      {props.trans.__('Please disable the dependent plugins first.')}
    </>
  );
}

export function PluginInUseMessage(props: {
  plugin: JupyterLab.IPluginInfo;
  optionalDependants: JupyterLab.IPluginInfo[];
  trans: TranslationBundle;
}): React.ReactElement<any> {
  return (
    <div className={'jp-pluginmanager-PluginInUseMessage'}>
      {props.trans.__(
        'While the plugin "%1" is not required by other enabled plugins, some plugins provide optional features depending on it. These plugins are:',
        props.plugin.id
      )}
      <ul>
        {props.optionalDependants.map(plugin => (
          <li key={'optionalDependantsDialog-' + plugin.id}>{plugin.id}</li>
        ))}
      </ul>
      {props.trans.__('Do you want to disable it anyway?')}
    </div>
  );
}
