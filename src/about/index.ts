// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  h, VNode
} from 'phosphor/lib/ui/vdom';

import {
  VDomModel, VDomWidget
} from '../common/vdom';

export
class AboutModel extends VDomModel {
  constructor() {
    super();
    this._title = 'Welcome to the JupyterLab Alpha preview';
    this._headerText = [
      'Click on the Launcher tab for the initial JupyterLab screen.',
      'This demo gives an Alpha-level developer preview of the JupyterLab enviromnent. ',
      'It is not ready for general usage yet.',
      'We are developing JupyterLab at ',
      'https://github.com/jupyterlab/jupyterlab',
      '. Pull requests are welcome!',
      'Here is a brief description of some fo the things you\'ll find in this demo.'
    ];
    this._pluginHeaders = [
      'Main Area',
      'Command Palette',
      'File Browser',
      'Notebook'
    ];
    this._mainAreaDesc = [
      'Open tabs and drag and drop them to rearrange them.',
      'The main area is divided into panels of tabs. Drag a tab around the area ' +
      'to split the main area in different ways. Drag a tab to the center of a ' +
      'panel to move a tab without splitting the panel (in this case, the whole ' +
      'panel will highlight instead of just a portion).',
      'Resize panels by dragging their borders (be aware that panels and sidebars ' +
      'also have a minimum width). A file that contains changes to be saved has ' +
      'a circle for a close icon.'

    ];
    this._filebrowserDesc = [
      'Navigate and organize your files.',
      'Clicking the "Files" tab, located on the left, will toggle the file browser. ' +
      'Navigate into directories by double-clicking, and use the breadcrumbs at the ' +
      'top to navigate out. Create a new file/directory by clicking the plus icon at ' +
      'the top. Click the middle icon to upload files, and click the last icon to reload ' +
      'the file listing. Drag and drop files to move them to subdirectories. ' +
      'Click on a selected file to rename it. Sort the list by clicking on a column header. ' +
      'Open a file by double-clicking it or dragging it into the main area. ' +
      'Opening an image displays the image. Opening a code file opens a code editor. ' +
      'Opening a notebook opens a very preliminary notebook component.'
    ];
    this._commandPaletteDesc = [
      'View list of commands and keyboard shortcuts.',
      'Clicking the "Commands" tab, located on the left, will toggle the command ' +
      'palette. Execute a command by clicking, or navigating with your arrow keys ' +
      'and pressing Enter. Filter commands by typing in the text box at the top of ' +
      'the palette. The palette is organized into categories, and you can filter on ' +
      'a single category by clicking on the category header or by typing the header ' +
      'surrounded by colons in the search input (e.g., :fie).',
      'You can try these things from the command palette:',
      'Open a new terminal(requires macOS or Linux)',
      'Open an IPython console',
      'Open a new file',
      'Save a file',
      'Open a help panel on the right'
    ];
    this._notebookDesc = [
      'Dedicate a tab to running a class notebook.',
      'Opening a notebook will open a minimally-featured notebook. ' +
      'Code execution, Markdown rendering, and basic cell toolbar actions are supported. ' +
      'Future versions will add more features from the existing Jupyter notebook.'
    ];
  }

  get title(): string {
    return this._title;
  }

  get headerText(): string[] {
    return this._headerText;
  }

  get pluginHeaders(): string[] {
    return this._pluginHeaders;
  }

  get mainAreaDesc(): string[] {
    return this._mainAreaDesc;
  }

  get filebrowserDesc(): string[] {
    return this._filebrowserDesc;
  }

  get commandPaletteDesc(): string[] {
    return this._commandPaletteDesc;
  }

  get notebookDesc(): string[] {
    return this._notebookDesc;
  }

  private _title: string;
  private _headerText: string[];
  private _pluginHeaders: string[];
  private _mainAreaDesc: string[];
  private _filebrowserDesc: string[];
  private _commandPaletteDesc: string[];
  private _notebookDesc: string[];
}

export
class AboutWidget extends VDomWidget<AboutModel> {
  constructor() {
    super();
  }

  protected render(): VNode {
    let title = this.model.title;
    let headerText = this.model.headerText;
    let pluginHeaders = this.model.pluginHeaders;
    let mainAreaDesc = this.model.mainAreaDesc;
    let filebrowserDesc = this.model.filebrowserDesc;
    let commandPaletteDesc = this.model.commandPaletteDesc;
    let notebookDesc = this.model.notebookDesc;

    let headerRow =
    h.div({className: 'row'},
      h.div({className: 'column'},
        h.span({className: 'jp-img jp-About-logo'}),
        h.p({className: 'header'}, title),
        h.div({className: 'desc-one'},
          h.p(headerText[0]),
          h.p(headerText[1],
            h.b(headerText[2])
          ),
          h.p(headerText[3],
            h.a({href: headerText[4]}, headerText[4]),
            headerText[5]
          ),
          h.p(headerText[6])
        )
      )
    );

    let mainAreaCommandPaletteRow =
    h.div({className: 'row'},
      h.div({className: 'one-half column'},
        h.p({className: 'desc-two-header'},
          h.a({href: '#main-area'},
            h.span({className: 'jp-img jp-About-hero-mainarea'}),
            pluginHeaders[0]
          )
        ),
        h.p({className: 'desc-two'}, mainAreaDesc[0])
      ),
      h.div({className: 'one-half column'},
        h.p({className: 'desc-two-header'},
          h.a({href: '#command'},
            h.span({className: 'jp-img jp-About-hero-command'}),
            pluginHeaders[1]
          )
        ),
        h.p({className: 'desc-two'}, commandPaletteDesc[0])
      )
    );

    let filebrowserNotebookRow =
    h.div({className: 'row'},
      h.div({className: 'one-half column'},
        h.p({className: 'desc-two-header'},
          h.a({href: '#filebrowser'},
            h.span({className: 'jp-img jp-About-hero-filebrowser'}),
            pluginHeaders[2]
          )
        ),
        h.p({className: 'desc-two'}, filebrowserDesc[0]),
      ),
      h.div({className: 'one-half column'},
        h.p({className: 'desc-two-header'},
          h.a({href: '#notebook'},
            h.span({className: 'jp-img jp-About-hero-notebook'}),
            pluginHeaders[3]
          )
        ),
        h.p({className: 'desc-two'}, notebookDesc[0])
      )
    );

    let mainAreaPage =
    h.div({className: 'section'},
      h.a({id: 'main-area'}),
      h.div({className: 'sectioncenter'},
        h.p({className: 'header content'},
          h.span({className: 'jp-img jp-About-hero-mainarea'}),
          pluginHeaders[0]
        ),
        h.span({className: 'jp-img jp-About-mainarea'}),
        h.p({className: 'content-desc'}, mainAreaDesc[1]),
        h.p({className: 'content-desc'}, mainAreaDesc[2]),
        h.a({href: '#command'},
          h.span({className: 'nav-button'})
        )
      )
    );

    let commandPalettePage =
    h.div({className: 'section'},
      h.a({id: 'command'}),
      h.div({className: 'sectioncenter'},
        h.p({className: 'header content'},
          h.span({className: 'jp-img jp-About-hero-command'}),
          pluginHeaders[1]
        ),
        h.span({className: 'jp-img jp-About-command'}),
        h.p({className: 'content-desc'}, commandPaletteDesc[1]),
        h.div({className: 'content-desc'},
          h.p(commandPaletteDesc[2]),
          h.ul(
            h.li(commandPaletteDesc[3]),
            h.li(commandPaletteDesc[4]),
            h.li(commandPaletteDesc[5]),
            h.li(commandPaletteDesc[6]),
            h.li(commandPaletteDesc[7])
          )
        ),
        h.a({href: '#filebrowser'},
          h.span({className: 'nav-button'})
        )
      )
    );

    let filebrowserPage =
    h.div({className: 'section'},
      h.a({id: 'filebrowser'}),
      h.div({className: 'sectioncenter'},
        h.p({className: 'header content'},
          h.span({className: 'jp-img jp-About-hero-filebrowser'}),
          pluginHeaders[2]
        ),
        h.span({className: 'jp-img jp-About-fb'}),
        h.p({className: 'content-desc'}, filebrowserDesc[1]),
        h.a({href: '#notebook'},
          h.span({className: 'nav-button'})
        )
      )
    );

    let notebookPage =
    h.div({className: 'section'},
      h.a({id: 'notebook'}),
      h.div({className: 'sectioncenter'},
        h.p({className: 'header content'},
          h.span({className: 'jp-img jp-About-hero-notebook'}),
          pluginHeaders[3]
        ),
        h.span({className: 'jp-img jp-About-nb'}),
        h.p({className: 'content-desc'}, notebookDesc[1])
      )
    );

    let domTree =
    h.div({id: 'about'},
      h.div({className: 'section'},
        h.div({className: 'sectioncenter'},
          h.div({className: 'container'},
            headerRow,
            mainAreaCommandPaletteRow,
            filebrowserNotebookRow
          ),
          h.a({href: '#main-area'},
            h.span({className: 'nav-button'})
          )
        )
      ),
      mainAreaPage,
      commandPalettePage,
      filebrowserPage,
      notebookPage
    );
    return domTree;
  }
}
