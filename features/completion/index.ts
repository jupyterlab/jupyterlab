import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ICompletionManager } from '@jupyterlab/completer';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { LabIcon } from '@jupyterlab/ui-components';
import { ILSPCompletionThemeManager } from '@krassowski/completion-theme/lib/types';

import completionSvg from '../../../style/icons/completion.svg';
import { FeatureSettings } from '../../feature';
import {
  ILSPAdapterManager,
  ILSPFeatureManager,
  ILSPLogConsole,
  PLUGIN_ID
} from '../../tokens';

import { CompletionCM, CompletionLabIntegration } from './completion';

export const completionIcon = new LabIcon({
  name: 'lsp:completion',
  svgstr: completionSvg
});

const FEATURE_ID = PLUGIN_ID + ':completion';

export const COMPLETION_PLUGIN: JupyterFrontEndPlugin<void> = {
  id: FEATURE_ID,
  requires: [
    ILSPFeatureManager,
    ISettingRegistry,
    ICompletionManager,
    ILSPAdapterManager,
    ILSPCompletionThemeManager,
    ILSPLogConsole,
    IRenderMimeRegistry
  ],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    featureManager: ILSPFeatureManager,
    settingRegistry: ISettingRegistry,
    completionManager: ICompletionManager,
    adapterManager: ILSPAdapterManager,
    iconsThemeManager: ILSPCompletionThemeManager,
    logConsole: ILSPLogConsole,
    renderMimeRegistry: IRenderMimeRegistry
  ) => {
    const settings = new FeatureSettings(settingRegistry, FEATURE_ID);
    const labIntegration = new CompletionLabIntegration(
      app,
      completionManager,
      settings,
      adapterManager,
      iconsThemeManager,
      logConsole.scope('CompletionLab'),
      renderMimeRegistry
    );

    featureManager.register({
      feature: {
        editorIntegrationFactory: new Map([['CodeMirrorEditor', CompletionCM]]),
        id: FEATURE_ID,
        name: 'LSP Completion',
        labIntegration: labIntegration,
        settings: settings
      }
    });
  }
};
