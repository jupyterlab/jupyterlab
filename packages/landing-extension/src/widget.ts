// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONObject
} from '@phosphor/coreutils';

import {
  Message
} from '@phosphor/messaging';

import {
  h, VirtualNode
} from '@phosphor/virtualdom';

import {
  ICommandLinker, VDomModel, VDomWidget
} from '@jupyterlab/apputils';


/**
 * The class name added to the landing scroll wrapper.
 */
const LANDING_WRAPPER_CLASS = 'jp-Landing-wrapper';

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
 * The list of preview messages.
 */
const previewMessages = [
  'super alpha preview',
  'very alpha preview',
  'extremely alpha preview',
  'exceedingly alpha preview',
  'alpha alpha preview'
];


/**
 * LandingModel holds text data which the LandingWidget will render.
 */
export
class LandingModel extends VDomModel {
  /**
   * Preview messages.
   */
  readonly previewMessage: string;

  /**
   * The `Start a new activity` text.
   */
  readonly headerText: string;

  /**
   * The names of activities and their associated commands.
   */
  readonly activities: [string, string, JSONObject][];

  /**
   * Construct a new landing model.
   */
  constructor(terminalsAvailable = false) {
    super();
    this.previewMessage = previewMessages[
      Math.floor(Math.random() * previewMessages.length)
    ];
    this.headerText = 'Start a new activity';

    const createFrom = 'file-operations:create-from';
    this.activities = [
      ['Notebook', createFrom, { creatorName: 'Notebook' }],
      ['Code Console', 'console:create', undefined],
      ['Text Editor', createFrom, { creatorName: 'Text File' }]
    ];

    if (terminalsAvailable) {
      this.activities.push(['Terminal', 'terminal:create-new', undefined]);
    }
  }
}

/**
 * A virtual-DOM-based widget for the Landing plugin.
 */
export
class LandingWidget extends VDomWidget<LandingModel> {
  /**
   * Construct a new landing widget.
   */
  constructor(linker: ICommandLinker) {
    super();
    this._linker = linker;
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.node.tabIndex = -1;
    this.node.focus();
  }

  /**
   * Handle `'close-request'` messages.
   */
  protected onCloseRequest(msg: Message): void {
    super.onCloseRequest(msg);
    this.dispose();
  }

  /**
   * Render the landing plugin to virtual DOM nodes.
   */
  protected render(): VirtualNode {
    let activitiesList: VirtualNode[] = [];
    let activites = this.model.activities;
    for (let activityName of activites) {
      let name = activityName[0];
      let command = activityName[1];
      let args = activityName[2];
      let imgName = name.replace(' ', '');
      let column = h.div({ className: LANDING_COLUMN_CLASS },
        h.span({
          className: LANDING_ICON_CLASS + ` jp-Image${imgName}` ,
          dataset: this._linker.populateVNodeDataset(command, args)
        }),
        h.span({ className: LANDING_TEXT_CLASS }, name)
      );
      activitiesList.push(column);
    }

    let logo = h.span({
      className: `${JUPYTERLAB_ICON_CLASS} ${LANDING_LOGO_CLASS}`
    });
    let subtitle = h.span(
      {className: LANDING_SUBTITLE_CLASS},
      this.model.previewMessage
    );
    let tour = h.span({
      className: TOUR_ICON_CLASS,
      dataset: this._linker.populateVNodeDataset('about-jupyterlab:open', {})
    });
    let header = h.span({
      className: LANDING_HEADER_CLASS
    }, this.model.headerText);
    let body = h.div({ className: LANDING_BODY_CLASS }, activitiesList);

    let dialog = h.div({ className: LANDING_DIALOG_CLASS },
      logo,
      subtitle,
      tour,
      header,
      body
    );
    return h.div({ className: LANDING_WRAPPER_CLASS }, dialog);
  }

  private _linker: ICommandLinker;
}
