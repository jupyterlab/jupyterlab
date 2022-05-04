import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { InputDialog } from '@jupyterlab/apputils';
import { CodeMirrorEditor } from '@jupyterlab/codemirror';
import { URLExt } from '@jupyterlab/coreutils';
import { IDocumentManager } from '@jupyterlab/docmanager';
import { IEditorTracker } from '@jupyterlab/fileeditor';
import { INotebookTracker } from '@jupyterlab/notebook';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ITranslator, TranslationBundle } from '@jupyterlab/translation';
import { LabIcon } from '@jupyterlab/ui-components';
import {
  CodeJumper,
  FileEditorJumper,
  NotebookJumper
} from '@krassowski/code-jumpers';
import { AnyLocation } from 'lsp-ws-connection/lib/types';
import type * as lsp from 'vscode-languageserver-protocol';

import jumpToSvg from '../../style/icons/jump-to.svg';
import { CodeJump as LSPJumpSettings, ModifierKey } from '../_jump_to';
import { CommandEntryPoint } from '../command_manager';
import { PositionConverter } from '../converter';
import { CodeMirrorIntegration } from '../editor_integration/codemirror';
import {
  FeatureSettings,
  IFeatureCommand,
  IFeatureLabIntegration
} from '../feature';
import { IVirtualPosition, ProtocolCoordinates } from '../positioning';
import { ILSPAdapterManager, ILSPFeatureManager, PLUGIN_ID } from '../tokens';
import { getModifierState, uri_to_contents_path, uris_equal } from '../utils';
import { CodeMirrorVirtualEditor } from '../virtual/codemirror_editor';

export const jumpToIcon = new LabIcon({
  name: 'lsp:jump-to',
  svgstr: jumpToSvg
});

const jumpBackIcon = new LabIcon({
  name: 'lsp:jump-back',
  svgstr: jumpToSvg.replace('jp-icon3', 'lsp-icon-flip-x jp-icon3')
});

const FEATURE_ID = PLUGIN_ID + ':jump_to';

let trans: TranslationBundle;

const enum JumpResult {
  NoTargetsFound = 1,
  PositioningFailure = 2,
  PathResolutionFailure = 3,
  AssumeSuccess = 4,
  UnspecifiedFailure = 5,
  AlreadyAtTarget = 6
}

export class CMJumpToDefinition extends CodeMirrorIntegration {
  get jumper() {
    return (this.feature.labIntegration as JumperLabIntegration).jumper;
  }

  get settings() {
    return super.settings as FeatureSettings<LSPJumpSettings>;
  }

  protected get modifierKey(): ModifierKey {
    return this.settings.composite.modifierKey;
  }

  register() {
    this.editor_handlers.set(
      'mousedown',
      this._jumpToDefinitionOrRefernce.bind(this)
    );
    super.register();
  }

  private _jumpToDefinitionOrRefernce(
    virtual_editor: CodeMirrorVirtualEditor,
    event: MouseEvent
  ) {
    const { button } = event;
    const shouldJump =
      button === 0 && getModifierState(event, this.modifierKey);
    if (!shouldJump) {
      return;
    }
    let root_position = this.position_from_mouse(event);
    if (root_position == null) {
      this.console.warn(
        'Could not retrieve root position from mouse event to jump to definition/reference'
      );
      return;
    }
    let document = virtual_editor.document_at_root_position(root_position);
    let virtual_position =
      virtual_editor.root_position_to_virtual_position(root_position);

    const positionParams: lsp.TextDocumentPositionParams = {
      textDocument: {
        uri: document.document_info.uri
      },
      position: {
        line: virtual_position.line,
        character: virtual_position.ch
      }
    };

    this.connection.clientRequests['textDocument/definition']
      .request(positionParams)
      .then(targets => {
        this.handleJump(targets, positionParams)
          .then((result: JumpResult | undefined) => {
            if (
              result === JumpResult.NoTargetsFound ||
              result === JumpResult.AlreadyAtTarget
            ) {
              // definition was not found, or we are in definition already, suggest references
              this.connection.clientRequests['textDocument/references']
                .request({
                  ...positionParams,
                  context: { includeDeclaration: false }
                })
                .then(targets =>
                  // TODO: explain that we are now presenting references?
                  this.handleJump(targets, positionParams)
                )
                .catch(this.console.warn);
            }
          })
          .catch(this.console.warn);
      })
      .catch(this.console.warn);

    event.preventDefault();
    event.stopPropagation();
  }

  private _harmonizeLocations(locationData: AnyLocation): lsp.Location[] {
    if (locationData == null) {
      return [];
    }

    const locationsList = Array.isArray(locationData)
      ? locationData
      : [locationData];

    return (locationsList as (lsp.Location | lsp.LocationLink)[])
      .map((locationOrLink): lsp.Location | undefined => {
        if ('targetUri' in locationOrLink) {
          return {
            uri: locationOrLink.targetUri,
            range: locationOrLink.targetRange
          };
        } else if ('uri' in locationOrLink) {
          return {
            uri: locationOrLink.uri,
            range: locationOrLink.range
          };
        } else {
          this.console.warn(
            'Returned jump location is incorrect (no uri or targetUri):',
            locationOrLink
          );
          return undefined;
        }
      })
      .filter((location): location is lsp.Location => location != null);
  }

  private async _chooseTarget(locations: lsp.Location[]) {
    if (locations.length > 1) {
      const choices = locations.map(location => {
        // TODO: extract the line, the line above and below, and show it
        const path = this._resolvePath(location.uri) || location.uri;
        return path + ', line: ' + location.range.start.line;
      });

      // TODO: use selector with preview, basically needes the ui-component
      // from jupyterlab-citation-manager; let's try to move it to JupyterLab core
      // (and re-implement command palette with it)
      // the preview should use this.jumper.document_manager.services.contents

      let getItemOptions = {
        title: trans.__('Choose the jump target'),
        okLabel: trans.__('Jump'),
        items: choices
      };
      // TODO: use showHints() or completion-like widget instead?
      const choice = await InputDialog.getItem(getItemOptions).catch(
        this.console.warn
      );
      if (!choice || choice.value == null) {
        this.console.warn('No choice selected for jump location selection');
        return;
      }
      const choiceIndex = choices.indexOf(choice.value);
      if (choiceIndex === -1) {
        this.console.error(
          'Choice selection error: please report this as a bug:',
          choices,
          choice
        );
        return;
      }
      return locations[choiceIndex];
    } else {
      return locations[0];
    }
  }

  private _resolvePath(uri: string): string | null {
    let contentsPath = uri_to_contents_path(uri);

    if (contentsPath == null) {
      if (uri.startsWith('file://')) {
        contentsPath = decodeURIComponent(uri.slice(7));
      } else {
        contentsPath = decodeURIComponent(uri);
      }
    }
    return contentsPath;
  }

  async handleJump(
    locationData: AnyLocation,
    positionParams: lsp.TextDocumentPositionParams
  ) {
    const locations = this._harmonizeLocations(locationData);
    const targetInfo = await this._chooseTarget(locations);

    if (!targetInfo) {
      this.setStatusMessage(trans.__('No jump targets found'), 2 * 1000);
      return JumpResult.NoTargetsFound;
    }

    let { uri, range } = targetInfo;

    let virtual_position = PositionConverter.lsp_to_cm(
      range.start
    ) as IVirtualPosition;

    if (uris_equal(uri, positionParams.textDocument.uri)) {
      let editor_index = this.adapter.get_editor_index_at(virtual_position);
      // if in current file, transform from the position within virtual document to the editor position:
      let editor_position =
        this.virtual_editor.transform_virtual_to_editor(virtual_position);
      if (editor_position === null) {
        this.console.warn(
          'Could not jump: conversion from virtual position to editor position failed',
          virtual_position
        );
        return JumpResult.PositioningFailure;
      }
      let editor_position_ce = PositionConverter.cm_to_ce(editor_position);
      this.console.log(`Jumping to ${editor_index}th editor of ${uri}`);
      this.console.log('Jump target within editor:', editor_position_ce);

      let contentsPath = this.adapter.widget.context.path;

      const didUserChooseThis = locations.length > 1;

      // note: we already know that URIs are equal, so just check the position range
      if (
        !didUserChooseThis &&
        ProtocolCoordinates.isWithinRange(positionParams.position, range)
      ) {
        return JumpResult.AlreadyAtTarget;
      }

      this.jumper.global_jump({
        line: editor_position_ce.line,
        column: editor_position.ch,
        editor_index: editor_index,
        is_symlink: false,
        contents_path: contentsPath
      });
      return JumpResult.AssumeSuccess;
    } else {
      // otherwise there is no virtual document and we expect the returned position to be source position:
      let source_position_ce = PositionConverter.cm_to_ce(virtual_position);
      this.console.log(`Jumping to external file: ${uri}`);
      this.console.log('Jump target (source location):', source_position_ce);

      let jump_data = {
        editor_index: 0,
        line: source_position_ce.line,
        column: source_position_ce.column
      };

      // assume that we got a relative path to a file within the project
      // TODO use is_relative() or something? It would need to be not only compatible
      //  with different OSes but also with JupyterHub and other platforms.

      // can it be resolved vs our guessed server root?
      const contentsPath = this._resolvePath(uri);

      if (contentsPath === null) {
        this.console.warn('contents_path could not be resolved');
        return JumpResult.PathResolutionFailure;
      }

      try {
        await this.jumper.document_manager.services.contents.get(contentsPath, {
          content: false
        });
        this.jumper.global_jump({
          contents_path: contentsPath,
          ...jump_data,
          is_symlink: false
        });
        return JumpResult.AssumeSuccess;
      } catch (err) {
        this.console.warn(err);
      }

      this.jumper.global_jump({
        contents_path: URLExt.join('.lsp_symlink', contentsPath),
        ...jump_data,
        is_symlink: true
      });
      return JumpResult.AssumeSuccess;
    }
  }
}

class JumperLabIntegration implements IFeatureLabIntegration {
  private adapterManager: ILSPAdapterManager;
  private jumpers: Map<string, CodeJumper>;
  settings: FeatureSettings<any>;

  constructor(
    settings: FeatureSettings<any>,
    adapterManager: ILSPAdapterManager,
    notebookTracker: INotebookTracker,
    documentManager: IDocumentManager,
    fileEditorTracker: IEditorTracker | null
  ) {
    this.settings = settings;
    this.adapterManager = adapterManager;
    this.jumpers = new Map();

    if (fileEditorTracker !== null) {
      fileEditorTracker.widgetAdded.connect((sender, widget) => {
        let fileEditor = widget.content;

        if (fileEditor.editor instanceof CodeMirrorEditor) {
          let jumper = new FileEditorJumper(widget, documentManager);
          this.jumpers.set(widget.id, jumper);
        }
      });
    }

    notebookTracker.widgetAdded.connect(async (sender, widget) => {
      // NOTE: assuming that the default cells content factory produces CodeMirror editors(!)
      let jumper = new NotebookJumper(widget, documentManager);
      this.jumpers.set(widget.id, jumper);
    });
  }

  get jumper(): CodeJumper {
    let current = this.adapterManager.currentAdapter.widget.id;
    return this.jumpers.get(current)!;
  }
}

const COMMANDS = (trans: TranslationBundle): IFeatureCommand[] => [
  {
    id: 'jump-to-definition',
    execute: async ({ connection, virtual_position, document, features }) => {
      const jumpFeature = features.get(FEATURE_ID) as CMJumpToDefinition;
      if (!connection) {
        jumpFeature.setStatusMessage(
          trans.__('Connection not found for jump'),
          2 * 1000
        );
        return;
      }

      const positionParams: lsp.TextDocumentPositionParams = {
        textDocument: {
          uri: document.document_info.uri
        },
        position: {
          line: virtual_position.line,
          character: virtual_position.ch
        }
      };
      const targets = await connection.clientRequests[
        'textDocument/definition'
      ].request(positionParams);
      await jumpFeature.handleJump(targets, positionParams);
    },
    is_enabled: ({ connection }) =>
      connection ? connection.provides('definitionProvider') : false,
    label: trans.__('Jump to definition'),
    icon: jumpToIcon
  },
  {
    id: 'jump-to-reference',
    execute: async ({ connection, virtual_position, document, features }) => {
      const jumpFeature = features.get(FEATURE_ID) as CMJumpToDefinition;
      if (!connection) {
        jumpFeature.setStatusMessage(
          trans.__('Connection not found for jump'),
          2 * 1000
        );
        return;
      }

      const positionParams: lsp.TextDocumentPositionParams = {
        textDocument: {
          uri: document.document_info.uri
        },
        position: {
          line: virtual_position.line,
          character: virtual_position.ch
        }
      };
      const targets = await connection.clientRequests[
        'textDocument/references'
      ].request({ ...positionParams, context: { includeDeclaration: false } });
      await jumpFeature.handleJump(targets, positionParams);
    },
    is_enabled: ({ connection }) =>
      connection ? connection.provides('referencesProvider') : false,
    label: trans.__('Jump to references'),
    icon: jumpToIcon
  },
  {
    id: 'jump-back',
    execute: async ({ connection, virtual_position, document, features }) => {
      const jump_feature = features.get(FEATURE_ID) as CMJumpToDefinition;
      jump_feature.jumper.global_jump_back();
    },
    is_enabled: ({ connection }) =>
      connection
        ? connection.provides('definitionProvider') ||
          connection.provides('referencesProvider')
        : false,
    label: trans.__('Jump back'),
    icon: jumpBackIcon,
    // do not attach to any of the context menus
    attach_to: new Set<CommandEntryPoint>()
  }
];

export const JUMP_PLUGIN: JupyterFrontEndPlugin<void> = {
  id: FEATURE_ID,
  requires: [
    ILSPFeatureManager,
    ISettingRegistry,
    ILSPAdapterManager,
    INotebookTracker,
    IDocumentManager,
    ITranslator
  ],
  optional: [IEditorTracker],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    featureManager: ILSPFeatureManager,
    settingRegistry: ISettingRegistry,
    adapterManager: ILSPAdapterManager,
    notebookTracker: INotebookTracker,
    documentManager: IDocumentManager,
    translator: ITranslator,
    fileEditorTracker: IEditorTracker | null
  ) => {
    const settings = new FeatureSettings(settingRegistry, FEATURE_ID);
    trans = translator.load('jupyterlab-lsp');
    let labIntegration = new JumperLabIntegration(
      settings,
      adapterManager,
      notebookTracker,
      documentManager,
      fileEditorTracker
    );

    featureManager.register({
      feature: {
        editorIntegrationFactory: new Map([
          ['CodeMirrorEditor', CMJumpToDefinition]
        ]),
        commands: COMMANDS(trans),
        id: FEATURE_ID,
        name: 'Jump to definition',
        labIntegration: labIntegration,
        settings: settings,
        capabilities: {
          textDocument: {
            declaration: {
              dynamicRegistration: true,
              linkSupport: true
            },
            definition: {
              dynamicRegistration: true,
              linkSupport: true
            },
            typeDefinition: {
              dynamicRegistration: true,
              linkSupport: true
            },
            implementation: {
              dynamicRegistration: true,
              linkSupport: true
            }
          }
        }
      }
    });
  }
};
