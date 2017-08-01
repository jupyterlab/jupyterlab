

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  IThemeManager
} from '@jupyterlab/apputils';



const plugin: JupyterLabPlugin<void> = {
    id: 'theme-light-extension',
    requires: [IThemeManager],
    activate: function(app: JupyterLab, manager: IThemeManager) {
        manager.register({
            name: 'JupyterLab Light',
            load: function() {
                return Promise.resolve(['./lab/api/themes/jupyterlab-theme-light-extension/style/index.css']);
            },
            unload: function() {
                return Promise.resolve(void 0);
            }
        });
    },
    autoStart: true
};


export default plugin;
