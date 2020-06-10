import { CodeMirrorLSPFeature, IFeatureCommand } from '../feature';
import { PositionConverter } from '../../../converter';
import { IVirtualPosition } from '../../../positioning';
import { uri_to_contents_path, uris_equal } from '../../../utils';
import { AnyLocation } from 'lsp-ws-connection/src/types';

export class JumpToDefinition extends CodeMirrorLSPFeature {
  name = 'JumpToDefinition';
  static commands: Array<IFeatureCommand> = [
    {
      id: 'jump-to-definition',
      execute: async ({ connection, virtual_position, document, features }) => {
        const jump_feature = features.get(
          'JumpToDefinition'
        ) as JumpToDefinition;
        const targets = await connection.getDefinition(
          virtual_position,
          document.document_info,
          false
        );
        await jump_feature.handle_jump(targets, document.document_info.uri);
      },
      is_enabled: ({ connection }) => connection.isDefinitionSupported(),
      label: 'Jump to definition',
    },
  ];

  get jumper() {
    return this.jupyterlab_components.jumper;
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
        range: location_or_link.targetRange,
      };
    } else if ('uri' in location_or_link) {
      return {
        uri: decodeURI(location_or_link.uri),
        range: location_or_link.range,
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
          value: '',
        },
        index: editor_index,
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
        column: source_position_ce.column,
      };

      // assume that we got a relative path to a file within the project
      // TODO use is_relative() or something? It would need to be not only compatible
      //  with different OSes but also with JupyterHub and other platforms.

      try {
        await this.jumper.document_manager.services.contents.get(uri, {
          content: false,
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
