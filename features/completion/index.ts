import {
  ILSPAdapterManager,
  ILSPFeatureManager,
  PLUGIN_ID
} from '../../tokens';
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ICompletionManager } from '@jupyterlab/completer';
import { FeatureSettings } from '../../feature';
import { CompletionCM, CompletionLabIntegration } from './completion';
import { LabIcon } from '@jupyterlab/ui-components';
import completionSvg from '../../../style/icons/completion.svg';
import { ILSPCompletionThemeManager } from './themes/types';

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
    ILSPCompletionThemeManager
  ],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    featureManager: ILSPFeatureManager,
    settingRegistry: ISettingRegistry,
    completionManager: ICompletionManager,
    adapterManager: ILSPAdapterManager,
    iconsThemeManager: ILSPCompletionThemeManager
  ) => {
    const settings = new FeatureSettings(settingRegistry, FEATURE_ID);
    const labIntegration = new CompletionLabIntegration(
      app,
      completionManager,
      settings,
      adapterManager,
      iconsThemeManager
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
