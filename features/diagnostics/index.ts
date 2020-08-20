import { ILSPFeatureManager, PLUGIN_ID } from "../../tokens";
import { FeatureSettings, IFeatureCommand } from "../../feature";
import { Menu } from "@lumino/widgets";
import { DIAGNOSTICS_LISTING_CLASS } from "./listing";
import { JupyterFrontEnd, JupyterFrontEndPlugin } from "@jupyterlab/application";
import { ISettingRegistry } from "@jupyterlab/settingregistry";
import { diagnostics_panel, DiagnosticsCM } from "./diagnostics";
import { LabIcon } from "@jupyterlab/ui-components";
import diagnosticsSvg from "../../../style/icons/diagnostics.svg";

export const FEATURE_ID = PLUGIN_ID + ':diagnostics';

export const diagnosticsIcon = new LabIcon({
  name: 'lsp:diagnostics',
  svgstr: diagnosticsSvg
});

const COMMANDS: IFeatureCommand[] = [
  {
    id: 'show-diagnostics-panel',
    execute: ({app, features, adapter}) => {
      let diagnostics_feature = features.get(FEATURE_ID) as DiagnosticsCM;
      diagnostics_feature.switchDiagnosticsPanelSource();

      let panel_widget = diagnostics_panel.widget;

      let get_column = (name: string) => {
        // TODO: a hashmap in the panel itself?
        for (let column of panel_widget.content.columns) {
          if (column.name === name) {
            return column;
          }
        }
      };

      if (!diagnostics_panel.is_registered) {
        let columns_menu = new Menu({commands: app.commands});
        app.commands.addCommand(CMD_COLUMN_VISIBILITY, {
          execute: args => {
            let column = get_column(args['name'] as string);
            column.is_visible = !column.is_visible;
            panel_widget.update();
          },
          label: args => args['name'] as string,
          isToggled: args => {
            let column = get_column(args['name'] as string);
            return column.is_visible;
          }
        });
        columns_menu.title.label = 'Panel columns';
        for (let column of panel_widget.content.columns) {
          columns_menu.addItem({
            command: CMD_COLUMN_VISIBILITY,
            args: {name: column.name}
          });
        }
        app.contextMenu.addItem({
          selector: '.' + DIAGNOSTICS_LISTING_CLASS + ' th',
          submenu: columns_menu,
          type: 'submenu'
        });
        diagnostics_panel.is_registered = true;
      }

      if (!panel_widget.isAttached) {
        app.shell.add(panel_widget, 'main', {
          ref: adapter.widget_id,
          mode: 'split-bottom'
        });
      }
      app.shell.activateById(panel_widget.id);
    },
    is_enabled: () => true,
    label: 'Show diagnostics panel',
    rank: 3,
    icon: diagnosticsIcon
  }
];

const CMD_COLUMN_VISIBILITY = 'lsp-set-column-visibility';

export const DIAGNOSTICS_PLUGIN: JupyterFrontEndPlugin<void> = {
  id: FEATURE_ID,
  requires: [ILSPFeatureManager, ISettingRegistry],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    featureManager: ILSPFeatureManager,
    settingRegistry: ISettingRegistry
  ) => {
    const settings = new FeatureSettings(settingRegistry, FEATURE_ID);

    featureManager.register({
      feature: {
        editorIntegrationFactory: new Map([
          ['CodeMirrorEditor', DiagnosticsCM]
        ]),
        id: FEATURE_ID,
        name: 'LSP Diagnostics',
        settings: settings,
        commands: COMMANDS
      }
    });
  }
};
