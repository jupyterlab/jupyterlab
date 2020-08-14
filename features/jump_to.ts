import { CodeJumper } from '@krassowski/jupyterlab_go_to_definition/lib/jumpers/jumper';
import { FileEditorJumper } from '@krassowski/jupyterlab_go_to_definition/lib/jumpers/fileeditor';
import { NotebookJumper } from '@krassowski/jupyterlab_go_to_definition/lib/jumpers/notebook';
import { PositionConverter } from '../converter';
import { IVirtualPosition } from '../positioning';
import { uri_to_contents_path, uris_equal } from '../utils';
import { AnyLocation } from 'lsp-ws-connection/lib/types';
import {
  FeatureSettings,
  IFeatureCommand,
  IFeatureLabIntegration
} from '../feature';
import { CodeMirrorIntegration } from '../editor_integration/codemirror';
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { IEditorTracker } from '@jupyterlab/fileeditor';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import { INotebookTracker } from '@jupyterlab/notebook';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { ILSPFeatureManager, PLUGIN_ID } from '../tokens';

const FEATURE_ID = PLUGIN_ID + ':jump-to';

export class CMJumpToDefinition extends CodeMirrorIntegration {
  get jumper() {
    return (this.feature.labIntegration as JumperLabIntegration).jumper;
  }

  get_uri_and_range(location_or_locations: AnyLocation) {
    if (location_or_locations == null) {
      console.log('No jump targets found');
      return;
    }
    // some language servers appear to return a single object
    const locations = Array.isArray(location_or_locations)
      ? location_or_locations
      : [location_or_locations];

    // TODO: implement selector for multiple locations
    //  (like when there are multiple definitions or usages)
    //  could use the showHints() or completion frontend as a reference
    if (locations.length === 0) {
      return;
    }

    console.log('Will jump to the first of suggested locations:', locations);

    const location_or_link = locations[0];

    if ('targetUri' in location_or_link) {
      return {
        uri: decodeURI(location_or_link.targetUri),
        range: location_or_link.targetRange
      };
    } else if ('uri' in location_or_link) {
      return {
        uri: decodeURI(location_or_link.uri),
        range: location_or_link.range
      };
    }
  }

  async handle_jump(location_or_locations: AnyLocation, document_uri: string) {
    const target_info = this.get_uri_and_range(location_or_locations);

    if (target_info == null) {
      console.log('No jump targets found');
    }

    let { uri, range } = target_info;

    let virtual_position = PositionConverter.lsp_to_cm(
      range.start
    ) as IVirtualPosition;

    if (uris_equal(uri, document_uri)) {
      let editor_index = this.virtual_editor.get_editor_index(virtual_position);
      // if in current file, transform from the position within virtual document to the editor position:
      let editor_position = this.virtual_editor.transform_virtual_to_editor(
        virtual_position
      );
      let editor_position_ce = PositionConverter.cm_to_ce(editor_position);
      console.log(`Jumping to ${editor_index}th editor of ${uri}`);
      console.log('Jump target within editor:', editor_position_ce);
      this.jumper.jump({
        token: {
          offset: this.jumper.getOffset(editor_position_ce, editor_index),
          value: ''
        },
        index: editor_index
      });
    } else {
      // otherwise there is no virtual document and we expect the returned position to be source position:
      let source_position_ce = PositionConverter.cm_to_ce(virtual_position);
      console.log(`Jumping to external file: ${uri}`);

      console.log('Jump target (source location):', source_position_ce);

      // can it be resolved vs our guessed server root?
      const contents_path = uri_to_contents_path(uri);

      if (contents_path) {
        uri = contents_path;
      } else if (uri.startsWith('file://')) {
        uri = uri.slice(7);
      }

      let jump_data = {
        editor_index: 0,
        line: source_position_ce.line,
        column: source_position_ce.column
      };

      // assume that we got a relative path to a file within the project
      // TODO use is_relative() or something? It would need to be not only compatible
      //  with different OSes but also with JupyterHub and other platforms.

      try {
        await this.jumper.document_manager.services.contents.get(uri, {
          content: false
        });
        this.jumper.global_jump({ uri, ...jump_data }, false);
        return;
      } catch (err) {
        console.warn(err);
      }

      this.jumper.global_jump(
        { uri: '.lsp_symlink/' + uri, ...jump_data },
        true
      );
    }
  }
}

class JumperLabIntegration implements IFeatureLabIntegration {
  private fileEditorTracker: IEditorTracker;
  private notebookTracker: INotebookTracker;
  private jumpers: Map<string, CodeJumper>;
  // settings should be implemented in the future
  settings?: FeatureSettings<any>;

  constructor(
    fileEditorTracker: IEditorTracker,
    notebookTracker: INotebookTracker,
    documentManager: IDocumentManager
  ) {
    this.fileEditorTracker = fileEditorTracker;
    this.notebookTracker = notebookTracker;
    this.jumpers = new Map();

    fileEditorTracker.widgetAdded.connect((sender, widget) => {
      let fileEditor = widget.content;

      if (fileEditor.editor instanceof CodeMirrorEditor) {
        let jumper = new FileEditorJumper(widget, documentManager);
        this.jumpers.set(widget.id, jumper);
      }
    });

    notebookTracker.widgetAdded.connect(async (sender, widget) => {
      // NOTE: assuming that the default cells content factory produces CodeMirror editors(!)
      let jumper = new NotebookJumper(widget, documentManager);
      this.jumpers.set(widget.id, jumper);
    });
  }

  get jumper(): CodeJumper {
    let current =
      this.notebookTracker.currentWidget.id ||
      this.fileEditorTracker.currentWidget.id;
    return this.jumpers.get(current);
  }
}

const COMMANDS: IFeatureCommand[] = [
  {
    id: 'jump-to-definition',
    execute: async ({ connection, virtual_position, document, features }) => {
      const jump_feature = features.get(FEATURE_ID) as CMJumpToDefinition;
      const targets = await connection.getDefinition(
        virtual_position,
        document.document_info,
        false
      );
      await jump_feature.handle_jump(targets, document.document_info.uri);
    },
    is_enabled: ({ connection }) => connection.isDefinitionSupported(),
    label: 'Jump to definition'
  }
];

export const JUMP_PLUGIN: JupyterFrontEndPlugin<void> = {
  id: FEATURE_ID,
  requires: [
    ILSPFeatureManager,
    IEditorTracker,
    INotebookTracker,
    IDocumentManager
  ],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    featureManager: ILSPFeatureManager,
    fileEditorTracker: IEditorTracker,
    notebookTracker: INotebookTracker,
    documentManager: IDocumentManager
  ) => {
    let labIntegration = new JumperLabIntegration(
      fileEditorTracker,
      notebookTracker,
      documentManager
    );

    featureManager.register({
      feature: {
        editorIntegrationFactory: new Map([
          ['CodeMirrorEditor', CMJumpToDefinition]
        ]),
        commands: COMMANDS,
        id: FEATURE_ID,
        name: 'Jump to definition',
        labIntegration: labIntegration
      }
    });
  }
};
