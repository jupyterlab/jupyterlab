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
import { CodeCompletion as LSPCompletionSettings } from '../../_completion';
import { FeatureSettings } from '../../feature';
import { CompletionItemTag } from '../../lsp';
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
      settings as FeatureSettings<LSPCompletionSettings>,
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
        settings: settings,
        capabilities: {
          textDocument: {
            completion: {
              dynamicRegistration: true,
              completionItem: {
                snippetSupport: false,
                commitCharactersSupport: true,
                documentationFormat: ['markdown', 'plaintext'],
                deprecatedSupport: true,
                preselectSupport: false,
                tagSupport: {
                  valueSet: [CompletionItemTag.Deprecated]
                }
              },
              contextSupport: false
            }
          }
        }
      }
    });
  }
};
