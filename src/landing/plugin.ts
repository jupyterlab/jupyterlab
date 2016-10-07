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

/**
 * The landing page extension.
 */
export
const landingExtension: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.landing',
  requires: [IPathTracker, ICommandPalette],
  activate: activateLanding,
  autoStart: true
};

class LandingModel extends VDomModel {
  constructor() {
    super();
    let previewMessages = ['super alpha preview', 'very alpha preview', 'extremely alpha preview', 'exceedingly alpha preview', 'alpha alpha preview'];
    this._previewMessage = previewMessages[(Math.floor(Math.random() * previewMessages.length))];
    this._headerText = 'Start a new activity';
    this._activities =
    [['Notebook', 'file-operations:new-notebook'],
     ['Code Console', `console:create`],
     ['Terminal', 'terminal:create-new'],
     ['Text Editor', 'file-operations:new-text-file']];
    this._path = 'home';
  }

  get previewMessage(): string {
    return this._previewMessage;
  }

  get headerText(): string {
    return this._headerText;
  }

  get activities() : string[][] {
    return this._activities;
  }

  get path(): string {
    return this._path;
  }

  set path(value: string) {
    this._path = value;
    this.stateChanged.emit(void 0);
  }

  private _previewMessage: string;
  private _activities: string[][];
  private _headerText: string;
  private _path: string;
}

class LandingWidget extends VDomWidget<LandingModel> {
  constructor(app: JupyterLab) {
    super();
    this._app = app;
  }

  protected render(): VNode {
    let activitiesList: VNode[] = [];
    let activites = this.model.activities;
    for (let activityName of activites) {
      let imgName = activityName[0].replace(' ', '');
      let column =
      h.div({className: 'jp-Landing-column'},
        h.span({className: `jp-Image${imgName} jp-Landing-image`,
                onclick: () => {
                  this._app.commands.execute(activityName[1], void 0);
                }}
        ),
        h.span({className: 'jp-Landing-text'}, activityName[0])
      );
      activitiesList.push(column);
    }

    let logo = h.span({className: 'jp-ImageJupyterLab jp-Landing-logo'});
    let subtitle =
    h.span({className: 'jp-Landing-subtitle'},
      this.model.previewMessage
    );
    let tour =
    h.span({className: 'jp-Landing-tour',
            onclick: () => {
              this._app.commands.execute('about-jupyterlab:show', void 0);
            }}
    );
    let header =
    h.span({className: 'jp-Landing-header'},
      this.model.headerText
    );
    let body =
    h.div({className: 'jp-Landing-body'},
      activitiesList
    );

    let dialog =
    h.div({className: 'jp-Landing-dialog'},
      logo,
      subtitle,
      tour,
      header,
      body,
      h.div({className: 'jp-Landing-cwd'},
        h.span({className: 'jp-Landing-folder'}),
        h.span({className: 'jp-Landing-path'}, this.model.path
        )
      )
    );
    return dialog;
  }

  private _app: JupyterLab;
}


function activateLanding(app: JupyterLab, pathTracker: IPathTracker, palette: ICommandPalette): void {
  let landingModel = new LandingModel();
  let widget = new LandingWidget(app);
  widget.model = landingModel;
  widget.id = 'landing-jupyterlab';
  widget.title.label = 'Launcher';
  widget.title.closable = true;
  widget.addClass('jp-Landing');

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
      } else {
        app.shell.activateMain(widget.id);
      }
    }
  });

  palette.addItem({
    command: 'jupyterlab-landing:show',
    category: 'Help'
  });

  app.shell.addToMainArea(widget);
}
