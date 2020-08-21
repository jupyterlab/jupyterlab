import { CodeMirrorIntegration } from '../editor_integration/codemirror';
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ILSPFeatureManager, PLUGIN_ID } from '../tokens';
import { LabIcon } from '@jupyterlab/ui-components';
import syntaxSvg from '../../style/icons/syntax-highlight.svg';
import {
  FeatureSettings,
  IEditorIntegrationOptions,
  IFeatureLabIntegration,
  IFeatureSettings
} from '../feature';
import { VirtualDocument } from '../virtual/document';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import CodeMirror from 'codemirror';
import { IEditorMimeTypeService } from '@jupyterlab/codeeditor/lib/mimetype';
import { IEditorServices } from '@jupyterlab/codeeditor/lib/tokens';
import { CodeSyntax as LSPSyntaxHighlightingSettings } from '../_syntax_highlighting';
import { ISettingRegistry } from '@jupyterlab/settingregistry';

export const syntaxHighlightingIcon = new LabIcon({
  name: 'lsp:syntax-highlighting',
  svgstr: syntaxSvg
});

const FEATURE_ID = PLUGIN_ID + ':syntax_highlighting';

export class CMSyntaxHighlighting extends CodeMirrorIntegration {
  lab_integration: SyntaxLabIntegration;
  settings: IFeatureSettings<LSPSyntaxHighlightingSettings>;

  constructor(options: IEditorIntegrationOptions) {
    super(options);
    this.virtual_document.changed.connect(this.update_mode.bind(this), this);
  }

  private get_mode(language: string) {
    let mimetype = this.lab_integration.mimeTypeService.getMimeTypeByLanguage({
      name: language
    });

    if (!mimetype || mimetype == 'text/plain') {
      // if a mimetype cannot be found it will be 'text/plain', therefore do
      // not change mode to text/plain, as this could be a step backwards for
      // the user experience
      return;
    }

    return CodeMirror.findModeByMIME(mimetype);
  }

  update_mode(doc: VirtualDocument, changed_document: VirtualDocument) {
    let root = this.virtual_document;
    for (let map of root.foreign_document_maps) {
      for (let [range, block] of map.entries()) {
        let ce_editor = block.editor;
        // get the ce_editor from block
        let editor = (ce_editor as CodeMirrorEditor).editor;
        let lines = editor.getValue('\n');
        let total_area = lines.concat('').length;

        let covered_area =
          ce_editor.getOffsetAt(range.end) - ce_editor.getOffsetAt(range.start);

        let coverage = covered_area / total_area;

        let language = block.virtual_document.language;

        let mode = this.get_mode(language);

        // if not highlighting mode available, skip this editor
        if (typeof mode === 'undefined') {
          continue;
        }

        // change the mode if the majority of the code is the foreign code
        if (coverage > this.settings.composite.foreignCodeThreshold) {
          editor.setOption('mode', mode.mime);
        }
      }
    }
  }
}

class SyntaxLabIntegration implements IFeatureLabIntegration {
  // TODO: we could accept custom mimetype mapping from settings
  settings: IFeatureSettings<LSPSyntaxHighlightingSettings>;

  constructor(public mimeTypeService: IEditorMimeTypeService) {}
}

export const SYNTAX_HIGHLIGHTING_PLUGIN: JupyterFrontEndPlugin<void> = {
  id: FEATURE_ID,
  requires: [ILSPFeatureManager, IEditorServices, ISettingRegistry],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    featureManager: ILSPFeatureManager,
    editorServices: IEditorServices,
    settingRegistry: ISettingRegistry
  ) => {
    const settings = new FeatureSettings(settingRegistry, FEATURE_ID);

    featureManager.register({
      feature: {
        editorIntegrationFactory: new Map([
          ['CodeMirrorEditor', CMSyntaxHighlighting]
        ]),
        commands: [],
        id: FEATURE_ID,
        name: 'Syntax highlighting',
        labIntegration: new SyntaxLabIntegration(
          editorServices.mimeTypeService
        ),
        settings: settings
      }
    });
  }
};
