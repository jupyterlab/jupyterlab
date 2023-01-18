import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';{% if cookiecutter.has_settings.lower().startswith('y') %}

import { ISettingRegistry } from '@jupyterlab/settingregistry';{% endif %}

/**
 * Initialization data for the {{ cookiecutter.labextension_name }} extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: '{{ cookiecutter.labextension_name }}:plugin',
  autoStart: true,{% if cookiecutter.has_settings.lower().startswith('y') %}
  optional: [ISettingRegistry],{% endif %}
  activate: (app: JupyterFrontEnd{% if cookiecutter.has_settings.lower().startswith('y') %}, settingRegistry: ISettingRegistry | null{% endif %}) => {
    console.log('JupyterLab extension {{ cookiecutter.labextension_name }} is activated!');{% if cookiecutter.has_settings.lower().startswith('y') %}

    if (settingRegistry) {
      settingRegistry
        .load(plugin.id)
        .then(settings => {
          console.log('{{ cookiecutter.labextension_name }} settings loaded:', settings.composite);
        })
        .catch(reason => {
          console.error('Failed to load settings for {{ cookiecutter.labextension_name }}.', reason);
        });
    }{% endif %}

    // handles "test" insertion mode, which just shows output in a native
    // browser alert.
    app.commands.addCommand('gai:insert-test', {
      execute: (context: any) => {
        alert(context.response.output)
      }
    })
  }
};

export default plugin;
