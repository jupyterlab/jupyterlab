// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Message
} from '@phosphor/messaging';

import {
  h, VirtualNode
} from '@phosphor/virtualdom';

import {
  VDomModel, VDomWidget
} from '@jupyterlab/apputils';


/**
 * The class name added to each page in the About plugin.
 */
const SECTION_CLASS = 'jp-About-section';

/**
 * The class name added to center content.
 */
const SECTION_CENTER_CLASS = 'jp-About-sectioncenter';

/**
 * The class name added to group elements on the initial page.
 */
const CONTAINER_CLASS = 'jp-About-container';

/**
 * The class name added to elements in a row.
 */
const ROW_CLASS = 'jp-About-row';

/**
 * The class name added to elements in a column.
 */
const COLUMN_CLASS = 'jp-About-column';

/**
 * The class name used specify postion of elements.
 */
const HALF_CLASS = 'jp-About-one-half';

/**
 * The class name added to the About plugin description on the intial page.
 */
const DESC_ONE_CLASS = 'jp-About-desc-one';

/**
 * The class name added to other plugin descriptions on the intial page.
 */
const DESC_TWO_CLASS = 'jp-About-desc-two';

/**
 * The class name added to headers of other plugins on the intial page.
 */
const DESC_TWO_HEADER_CLASS = 'jp-About-desc-two-header';

/**
 * The class name added to headers.
 */
const HEADER_CLASS = 'jp-About-header';

/**
 * The class name added to plugin pages.
 */
const CONTENT_CLASS = 'jp-About-content';

/**
 * The class name added to descriptions on plugin pages.
 */
const CONTENT_DESC_CLASS = 'jp-About-content-desc';

/**
 * The class name added to the navigation down button.
 */
const NAV_CLASS = 'jp-About-nav-button';

/**
 * The class name added to all images and icons.
 */
const IMAGE_CLASS = 'jp-img';

/**
 * The class name added to the JupyterLab logo.
 */
const LOGO_CLASS = 'jp-About-logo';

/**
 * The class name added to the main area icon.
 */
const MAIN_AREA_ICON_CLASS = 'jp-About-hero-mainarea';

/**
 * The class name added the command palette icon.
 */
const COMMAND_ICON_CLASS = 'jp-About-hero-command';

/**
 * The class name added to the filebrowser icon.
 */
const FILEBROWSER_ICON_CLASS = 'jp-About-hero-filebrowser';

/**
 * The class name added for the notebook icon.
 */
const NOTEBOOK_ICON_CLASS = 'jp-About-hero-notebook';

/**
 * The class name added to the main area image.
 */
const MAIN_AREA_IMAGE_CLASS = 'jp-About-mainarea';

/**
 * The class name added to the command palette image.
 */
const COMMAND_IMAGE_CLASS = 'jp-About-command';

/**
 * The class name added to the filebrowser image.
 */
const FILEBROWSER_IMAGE_CLASS = 'jp-About-fb';

/**
 * The class name added to the notebook image.
 */
const NOTEBOOK_IMAGE_CLASS = 'jp-About-nb';

/**
 * Title of About page.
 */
const TITLE = 'Welcome to the JupyterLab alpha preview';

/**
 * Text on the first page that gives a high level overview of JupyterLab.
 */
const HEADER_TEXT = [
  'Click on the Launcher tab for the initial JupyterLab screen.',
  'This demo gives an alpha developer preview of the JupyterLab environment.',
  'It is not ready for general usage yet.',
  'We are developing JupyterLab at ',
  'https://github.com/jupyterlab/jupyterlab',
  '. Pull requests and feedback are welcome!',
  `Here is a brief description of some of the things you'll find in this demo.`
];

/**
 * Contains the plugin names.
 */
const PLUGIN_HEADERS = [
  'Main Area',
  'Command Palette',
  'File Browser',
  'Notebook'
];

/**
 * Description of the main area and its functionality.
 */
const MAIN_AREA_DESC = [
  'Open tabs and drag and drop them to rearrange them.',
  `The main area is divided into panels of tabs. Drag a tab around the area
   to split the main area in different ways. Drag a tab to the center of a
   panel to move a tab without splitting the panel (in this case, the whole
   panel will highlight instead of just a portion).`,
  `Resize panels by dragging their borders (be aware that panels and sidebars
   also have a minimum width). A file that contains changes to be saved has
   a circle for a close icon.`
];

/**
 * Description of the file browser and its functionality.
 */
const FILE_BROWSER_DESC = [
  'Navigate and organize your files.',
  `Clicking the "Files" tab, located on the left, will toggle the file browser.
   Navigate into directories by double-clicking, and use the breadcrumbs at the
   top to navigate out. Create a new file/directory by clicking the plus icon at
   the top. Click the middle icon to upload files, and click the last icon to
   reload the file listing. Drag and drop files to move them to subdirectories.
   Click on a selected file to rename it. Sort the list by clicking on a column
   header.
   Open a file by double-clicking it or dragging it into the main area.
   Opening an image displays the image. Opening a code file opens a code editor.
   Opening a notebook opens a very preliminary notebook component.`
];

/**
 * Description of the command palette and its functionality.
 */
const COMMAND_PALETTE_DESC = [
  'View list of commands and keyboard shortcuts.',

  `Clicking the "Commands" tab, located on the left, will toggle the command
   palette. Execute a command by clicking, or navigating with your arrow keys
   and pressing Enter. Filter commands by typing in the text box at the top of
   the palette. The palette is organized into categories, and you can filter on
   a single category by clicking on the category header or by typing the header
   surrounded by colons in the search input (e.g., :file:).`,
  'You can try these things from the command palette:',
  'Open a new terminal (requires macOS or Linux)',
  'Open an IPython console',
  'Open a new file',
  'Save a file',
  'Open a help panel on the right'
];

/**
 * Description of the notebook and its functionality.
 */
const NOTEBOOK_DESC = [
  'Dedicate a tab to running a class notebook.',
  `Opening a notebook will open a minimally-featured notebook.
   Code execution, Markdown rendering, and basic cell toolbar actions are
   supported.
   Future versions will add more features from the existing Jupyter notebook.`
];


/**
 * AboutModel holds data which the AboutWidgetwill render.
 */
export
class AboutModel extends VDomModel {
  /**
   * Create an about model.
   */
  constructor(options: AboutModel.IOptions) {
    super();
    this.version = options.version;
  }

  /**
   * Title of About page.
   */
  readonly title = TITLE;

  /**
   * The current JupyterLab version.
   */
  readonly version: string;

  /**
   * Text on the first page that gives a high level overview of JupyterLab.
   */
  readonly headerText = HEADER_TEXT;

  /**
   * Contains the plugin names.
   */
  readonly pluginHeaders = PLUGIN_HEADERS;

  /**
   * Description of the main area and its functionality.
   */
  readonly mainAreaDesc = MAIN_AREA_DESC;

  /**
   * Description of the file browser and its functionality.
   */
  readonly filebrowserDesc = FILE_BROWSER_DESC;

  /**
   * Description of the command palette and its functionality.
   */
  readonly commandPaletteDesc = COMMAND_PALETTE_DESC;

  /**
   * Description of the notebook and its functionality.
   */
  readonly notebookDesc = NOTEBOOK_DESC;
}


/**
 * A namespace for `AboutModel` statics.
 */
export
namespace AboutModel {
  /**
   * Instantiation options for an about model.
   */
  export
  interface IOptions {
    /**
     * The lab application version.
     */
    version: string;
  }
}


/**
 * A virtual-DOM-based widget for the About plugin.
 */
export
class AboutWidget extends VDomWidget<AboutModel> {
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
   * Render the about plugin to virtual DOM nodes.
   */
  protected render(): VirtualNode {
    let title = this.model.title;
    let version = `v${this.model.version}`;
    let headerText = this.model.headerText;
    let pluginHeaders = this.model.pluginHeaders;
    let mainAreaDesc = this.model.mainAreaDesc;
    let filebrowserDesc = this.model.filebrowserDesc;
    let commandPaletteDesc = this.model.commandPaletteDesc;
    let notebookDesc = this.model.notebookDesc;

    let headerRow = h.div({ className: ROW_CLASS },
      h.div({ className: COLUMN_CLASS },
        h.span({ className: IMAGE_CLASS + ' ' + LOGO_CLASS }),
        h.p({ className: HEADER_CLASS },
          title,
          h.span(' (', h.code(version), ')')
        ),
        h.div({ className: DESC_ONE_CLASS },
          h.p(headerText[0]),
          h.p(headerText[1], ' ', h.strong(headerText[2])),
          h.p(headerText[3],
            h.a({ href: headerText[4], target: '_blank' }, headerText[4]),
            headerText[5]
          ),
          h.p(headerText[6])
        )
      )
    );

    let mainAreaCommandPaletteRow = h.div({ className: ROW_CLASS },
      h.div({ className: HALF_CLASS + ' ' + COLUMN_CLASS },
        h.p({ className: DESC_TWO_HEADER_CLASS },
          h.a({ href: '#about-main-area' },
            h.span({ className: IMAGE_CLASS + ' ' + MAIN_AREA_ICON_CLASS }),
            pluginHeaders[0]
          )
        ),
        h.p({ className: DESC_TWO_CLASS }, mainAreaDesc[0])
      ),
      h.div({ className: HALF_CLASS + ' ' + COLUMN_CLASS },
        h.p({ className: DESC_TWO_HEADER_CLASS },
          h.a({ href: '#about-command' },
            h.span({ className: IMAGE_CLASS + ' ' + COMMAND_ICON_CLASS }),
            pluginHeaders[1]
          )
        ),
        h.p({ className: DESC_TWO_CLASS }, commandPaletteDesc[0])
      )
    );

    let filebrowserNotebookRow = h.div({ className: ROW_CLASS },
      h.div({ className: HALF_CLASS + ' ' + COLUMN_CLASS },
        h.p({ className: DESC_TWO_HEADER_CLASS },
          h.a({ href: '#about-filebrowser' },
            h.span({ className: IMAGE_CLASS + ' ' + FILEBROWSER_ICON_CLASS }),
            pluginHeaders[2]
          )
        ),
        h.p({ className: DESC_TWO_CLASS }, filebrowserDesc[0]),
      ),
      h.div({ className: HALF_CLASS + ' ' + COLUMN_CLASS },
        h.p({ className: DESC_TWO_HEADER_CLASS },
          h.a({ href: '#about-notebook' },
            h.span({ className: IMAGE_CLASS + ' ' + NOTEBOOK_ICON_CLASS }),
            pluginHeaders[3]
          )
        ),
        h.p({ className: DESC_TWO_CLASS }, notebookDesc[0])
      )
    );

    let mainAreaPage = h.div({ className: SECTION_CLASS },
      h.a({ id: 'about-main-area' }),
      h.div({ className: SECTION_CENTER_CLASS },
        h.p({ className: HEADER_CLASS + ' ' + CONTENT_CLASS },
          h.span({ className: IMAGE_CLASS + ' ' + MAIN_AREA_ICON_CLASS }),
          pluginHeaders[0]
        ),
        h.span({ className: IMAGE_CLASS + ' ' + MAIN_AREA_IMAGE_CLASS }),
        h.p({ className: CONTENT_DESC_CLASS }, mainAreaDesc[1]),
        h.p({ className: CONTENT_DESC_CLASS }, mainAreaDesc[2]),
        h.a({ href: '#about-command' }, h.span({ className: NAV_CLASS }))
      )
    );

    let commandPalettePage = h.div({ className: SECTION_CLASS },
      h.a({ id: 'about-command' }),
      h.div({ className: SECTION_CENTER_CLASS },
        h.p({ className: HEADER_CLASS + ' ' + CONTENT_CLASS },
          h.span({ className: IMAGE_CLASS + ' ' + COMMAND_ICON_CLASS }),
          pluginHeaders[1]
        ),
        h.span({ className: IMAGE_CLASS + ' ' + COMMAND_IMAGE_CLASS }),
        h.p({ className: CONTENT_DESC_CLASS }, commandPaletteDesc[1]),
        h.div({ className: CONTENT_DESC_CLASS },
          h.p(commandPaletteDesc[2]),
          h.ul(
            h.li(commandPaletteDesc[3]),
            h.li(commandPaletteDesc[4]),
            h.li(commandPaletteDesc[5]),
            h.li(commandPaletteDesc[6]),
            h.li(commandPaletteDesc[7])
          )
        ),
        h.a({ href: '#about-filebrowser' }, h.span({ className: NAV_CLASS }))
      )
    );

    let filebrowserPage = h.div({ className: SECTION_CLASS },
      h.a({ id: 'about-filebrowser' }),
      h.div({ className: SECTION_CENTER_CLASS },
        h.p({ className: HEADER_CLASS + ' ' + CONTENT_CLASS },
          h.span({ className: IMAGE_CLASS + ' ' + FILEBROWSER_ICON_CLASS }),
          pluginHeaders[2]
        ),
        h.span({ className: IMAGE_CLASS + ' ' + FILEBROWSER_IMAGE_CLASS }),
        h.p({ className: CONTENT_DESC_CLASS }, filebrowserDesc[1]),
        h.a({ href: '#about-notebook' }, h.span({ className: NAV_CLASS }))
      )
    );

    let notebookPage = h.div({ className: SECTION_CLASS },
      h.a({ id: 'about-notebook' }),
      h.div({ className: SECTION_CENTER_CLASS },
        h.p({ className: HEADER_CLASS + ' ' + CONTENT_CLASS },
          h.span({ className: IMAGE_CLASS + ' ' + NOTEBOOK_ICON_CLASS }),
          pluginHeaders[3]
        ),
        h.span({ className: IMAGE_CLASS + ' ' + NOTEBOOK_IMAGE_CLASS }),
        h.p({ className: CONTENT_DESC_CLASS }, notebookDesc[1])
      )
    );

    return h.div({id: 'about' },
      h.div({ className: SECTION_CLASS },
        h.div({ className: SECTION_CENTER_CLASS },
          h.div({ className: CONTAINER_CLASS },
            headerRow,
            mainAreaCommandPaletteRow,
            filebrowserNotebookRow
          ),
          h.a({ href: '#about-main-area' }, h.span({ className: NAV_CLASS }))
        )
      ),
      mainAreaPage,
      commandPalettePage,
      filebrowserPage,
      notebookPage
    );
  }
}
