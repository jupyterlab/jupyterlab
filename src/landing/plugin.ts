// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  h, VNode
} from 'phosphor/lib/ui/vdom';

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  ICommandPalette
} from '../commandpalette';

import {
  VDomModel, VDomWidget
} from '../common/vdom';

import {
  IPathTracker
} from '../filebrowser';

import {
  IServiceManager
} from '../services';


/**
 * The landing page extension.
 */
export
const landingExtension: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.landing',
  requires: [IPathTracker, ICommandPalette, IServiceManager],
  activate: activateLanding,
  autoStart: true
};

/**
 * The class name added to the landing plugin.
 */
const LANDING_CLASS = 'jp-Landing';

/**
 * The class name added to the dialog.
 */
const LANDING_DIALOG_CLASS = 'jp-Landing-dialog';

/**
 * The class name for the JupyterLab icon from default-theme.
 */
const JUPYTERLAB_ICON_CLASS = 'jp-ImageJupyterLab';

/**
 * The class name added to specify size of the JupyterLab logo.
 */
const LANDING_LOGO_CLASS = 'jp-Landing-logo';

/**
 * The class name added to the preview message subtitle.
 */
const LANDING_SUBTITLE_CLASS = 'jp-Landing-subtitle';

/**
 * The class name added for the tour icon from default-theme.
 */
const TOUR_ICON_CLASS = 'jp-Landing-tour';

/**
 * The class name added to the header text.
 */
const LANDING_HEADER_CLASS = 'jp-Landing-header';

/**
 * The class name added to the dialog body.
 */
const LANDING_BODY_CLASS = 'jp-Landing-body';

/**
 * The class name added to the column of the dialog.
 */
const LANDING_COLUMN_CLASS = 'jp-Landing-column';

/**
 * The class name added to specify size of activity icons.
 */
const LANDING_ICON_CLASS = 'jp-Landing-image';

/**
 * The class name added to the image text of an activity.
 */
const LANDING_TEXT_CLASS = 'jp-Landing-text';

/**
 * The class name added to the current working directory.
 */
const LANDING_CWD_CLASS = 'jp-Landing-cwd';

/**
 * The class name added to Landing folder node.
 */
const FOLDER_CLASS = 'jp-Landing-folder';

/**
 * The class name added for the folder icon from default-theme.
 */
const FOLDER_ICON_CLASS = 'jp-FolderIcon';

/**
 * The class name added to the current working directory path.
 */
const LANDING_PATH_CLASS = 'jp-Landing-path';


/**
 * LandingModel keeps track of the path to working directory and has text data,
 * which the LandingWidget will render.
 */
class LandingModel extends VDomModel {
  // Contains a preview messages.
  readonly previewMessage: string;
  // Contains text to `Start a new activity`.
  readonly headerText: string;
  // Contains the names of activities and their associated commands.
  readonly activities: string[][];

  /**
   * Construct a new landing model.
   */
  constructor(terminalsAvailable = false) {
    super();
    let previewMessages = ['super alpha preview', 'very alpha preview', 'extremely alpha preview', 'exceedingly alpha preview', 'alpha alpha preview'];
    this.previewMessage = previewMessages[(Math.floor(Math.random() * previewMessages.length))];
    this.headerText = 'Start a new activity';
    this.activities =
    [['Notebook', 'file-operations:new-notebook'],
     ['Code Console', `console:create`],
     ['Text Editor', 'file-operations:new-text-file']];

    if (terminalsAvailable) {
      this.activities.push(
        ['Terminal', 'terminal:create-new']
      );
    }
    this._path = 'home';
  }

  /**
   * Get the path of the current working directory.
   */
  get path(): string {
    return this._path;
  }

  /**
   * Set the path of the current working directory.
   */
  set path(value: string) {
    this._path = value;
    this.stateChanged.emit(void 0);
  }

  private _path: string;
}

/**
 * A virtual-DOM-based widget for the Landing plugin.
 */
class LandingWidget extends VDomWidget<LandingModel> {
  /**
   * Construct a new landing widget.
   */
  constructor(app: JupyterLab) {
    super();
    this._app = app;
  }

  /**
   * Render the landing plugin to virtual DOM nodes.
   */
  protected render(): VNode {
    let activitiesList: VNode[] = [];
    let activites = this.model.activities;
    for (let activityName of activites) {
      let imgName = activityName[0].replace(' ', '');
      let column =
      h.div({className: LANDING_COLUMN_CLASS},
        h.span({className: LANDING_ICON_CLASS + ` jp-Image${imgName}` ,
                onclick: () => {
                  this._app.commands.execute(activityName[1], void 0);
                }}
        ),
        h.span({className: LANDING_TEXT_CLASS}, activityName[0])
      );
      activitiesList.push(column);
    }

    let logo = h.span({className: JUPYTERLAB_ICON_CLASS + ' ' + LANDING_LOGO_CLASS});
    let subtitle =
    h.span({className: LANDING_SUBTITLE_CLASS},
      this.model.previewMessage
    );
    let tour =
    h.span({className: TOUR_ICON_CLASS,
            onclick: () => {
              this._app.commands.execute('about-jupyterlab:show', void 0);
            }}
    );
    let header =
    h.span({className: LANDING_HEADER_CLASS},
      this.model.headerText
    );
    let body =
    h.div({className: LANDING_BODY_CLASS},
      activitiesList
    );

    let dialog =
    h.div({className: LANDING_DIALOG_CLASS},
      logo,
      subtitle,
      tour,
      header,
      body,
      h.div({className: LANDING_CWD_CLASS},
        h.span({className: FOLDER_ICON_CLASS + ' ' + FOLDER_CLASS}),
        h.span({className: LANDING_PATH_CLASS}, this.model.path
        )
      )
    );
    return dialog;
  }

  private _app: JupyterLab;
}


function activateLanding(app: JupyterLab, pathTracker: IPathTracker, palette: ICommandPalette, services: IServiceManager): void {
  let landingModel = new LandingModel(services.terminals.isAvailable());
  let widget = new LandingWidget(app);
  widget.model = landingModel;
  widget.id = 'landing-jupyterlab';
  widget.title.label = 'Launcher';
  widget.title.closable = true;
  widget.addClass(LANDING_CLASS);

  let path = 'home';
  pathTracker.pathChanged.connect(() => {
    if (pathTracker.path.length > 0) {
      path = 'home > ';
      let path2 = pathTracker.path;
      path2 = path2.replace('/', ' > ');
      path += path2;
    } else {
      path = 'home';
    }
    landingModel.path = path;
  });

  app.commands.addCommand('jupyterlab-landing:show', {
    label: 'Show Landing',
    execute: () => {
      if (!widget.isAttached) {
        app.shell.addToMainArea(widget);
      }
      app.shell.activateMain(widget.id);
    }
  });

  palette.addItem({
    command: 'jupyterlab-landing:show',
    category: 'Help'
  });

  app.shell.addToMainArea(widget);
  app.shell.activateMain(widget.id);
}
