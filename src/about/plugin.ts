// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Application
} from 'phosphide/lib/core/application';

import {
  Widget
} from 'phosphor-widget';

import {
  TabPanel
} from 'phosphor-tabs';

/**
 * The about page extension.
 */
export
const aboutExtension = {
  id: 'jupyter.extensions.about',
  activate: activateAbout
};

function activateAbout(app: Application): void {
  let widget = new Widget();
  let commandId = 'about-jupyterlab:show';
  widget.id = 'about-jupyterlab';
  widget.title.text = 'About';
  widget.title.closable = true;
  widget.node.innerHTML = `
  <div id="about">
        <!-- PAGE ONE -->
        <div class="section">
          <a name="#"></a>
            <div class="sectioncenter">
            <div class="container">
                <div class="row">
                    <div class="column">
                        <span class="jp-img jp-About-logo"></span>
                        <p class="header">Welcome to the JupyterLab Alpha preview</p>
                        <div class="desc-one">
                            <p>Click on the JupyterLab tab for the initial JupyterLab screen.</p>
                            <p>This demo gives an Alpha-level developer preview of the JupyterLab environment. <b>It is not ready for general usage yet.</b> We are developing JupyterLab at <a href="https://github.com/jupyter/jupyterlab">https://github.com/jupyter/jupyterlab</a>. Pull requests are welcome!</p>
                            <p>Here is a brief description of some of the things you'll find in this demo.</p>
                        </div>
                    </div>
                </div>
                <!-- 4 SECTIONS -->
                <div class="row">
                    <div class="one-half column">
                        <p class="desc-two-header">
                            <a href="#main-area">
                              <span class="jp-img jp-About-hero-mainarea"></span>Main Area
                            </a>
                        </p>
                        <p class="desc-two">
                            Open tabs and drag and drop them to rearrange them
                        </p>
                    </div>
                    <div class="one-half column">
                        <p class="desc-two-header">
                            <a href="#command">
                                <span class="jp-img jp-About-hero-command"></span>Command Palette
                            </a>
                        </p>
                        <p class="desc-two">
                            View list of commands and keyboard shortcuts
                        </p>
                    </div>
                </div>

                <div class="row">
                    <div class="one-half column">
                        <p class="desc-two-header">
                            <a href="#filebrowser">
                                <span class="jp-img jp-About-hero-filebrowser"></span>File Browser
                            </a>
                        </p>
                        <p class="desc-two">
                            Navigate and organize your files
                        </p>
                    </div>
                    <div class="one-half column">
                        <p class="desc-two-header">
                            <a href="#notebook">
                                <span class="jp-img jp-About-hero-notebook"></span>Notebook
                            </a>
                        </p>
                        <p class="desc-two">
                            Dedicate a tab to running a classic notebook
                        </p>
                    </div>
                </div>

                <!-- END OF 4 SECTIONS -->
            </div>
            <a href="#main-area">
              <span class="nav-button"></span>
            </a>
        </div>
      </div>
        <div class="section">
          <a name="main-area"></a>
          <div class="sectioncenter">
            <p class="header content"><span class="jp-img jp-About-hero-mainarea"></span>Main Area</p>
            <span class="jp-img jp-Dumbo"></span>
            <p class="content-desc">The main area is divided into panels of tabs. Drag a tab around the area to split the main area in different ways. Drag a tab to the center of a panel to move a tab without splitting the panel (in this case, the whole panel will highlight instead of just a portion).</p>
            <p class="content-desc">Resize panels by dragging their borders (be aware that panels and sidebars also have a minimum width). A file that contains changes to be saved has a circle for a close icon.</p>
            <a href="#command">
              <span class="nav-button"></span>
            </a>
          </div>
        </div>
        <div class="section">
          <a name="command"></a>
          <div class="sectioncenter">
            <p class="header content"><span class="jp-img jp-About-hero-command"></span>Command Palette</p>
            <span class="jp-img jp-About-command-cimg"></span>
            <p class="content-desc">Clicking the "Commands" tab, located on the left, will toggle the command palette. Execute a command by clicking, or navigating with your arrow keys and pressing Enter. Filter commands by typing in the text box at the top of the palette. The palette is organized into categories, and you can filter on a single category by clicking on the category header or by typing the header surrounded by colons in the search input (e.g., <code>:file:</code>).</p>
            <div class="content-desc">
                <p>You can try these things out from the command palette:</p>
                <ul>
                    <li>Open a new terminal (requires OS X or Linux)</li>
                    <li>Open a ipython console</li>
                    <li>Open a new file</li>
                    <li>Save a file</li>
                    <li>Open up a help panel on the right</li>
                </ul>
            </div>
            <a href="#filebrowser">
              <span class="nav-button"></span>
            </a>
          </div>
        </div>
        <div class="section">
          <a name="filebrowser"></a>
          <div class="sectioncenter">
            <p class="header content"><span class="jp-img jp-About-hero-filebrowser"></span>File Browser</p>
            <span class="jp-img jp-About-fb"></span>
            <p class="content-desc">Clicking the "Files" tab, located on the left, will toggle the file browser. Navigate into directories by double-clicking, and use the breadcrumbs at the top to navigate out. Create a new file/directory by clicking the plus icon at the top. Click the middle icon to upload files, and click the last icon to reload the file listing. Drag and drop files to move them to subdirectories. Click on a selected file to rename it. Sort the list by clicking on a column header. Open a file by double-clicking it or dragging it into the main area. Opening an image displays the image. Opening a code file opens a code editor. Opening a notebook opens a very preliminary notebook component.</p>
            <a href="#notebook">
              <span class="nav-button"></span>
            </a>
          </div>
        </div>
        <div class="section">
          <a name="notebook"></a>
          <div class="sectioncenter">
            <p class="header content"><span class="jp-img jp-About-hero-notebook"></span>Notebook</p>
            <span class="jp-img jp-About-nb"></span>
            <p class="content-desc">Opening a notebook will open a minimally-featured notebook. Code execution, Markdown rendering, and basic cell toolbar actions are supported. Future versions will add more features from the existing Jupyter notebook.</p>
          </div>
        </div>
    </div>`;

  widget.node.style.overflowY = 'auto';
  app.commands.add([{
    id: commandId,
    handler: () => {
      if (!widget.isAttached) app.shell.addToMainArea(widget);
      let stack = widget.parent;
      if (!stack) {
        return;
      }
      let tabs = stack.parent;
      if (tabs instanceof TabPanel) {
        tabs.currentWidget = widget;
      }
    }
  }]);

  app.palette.add([{
    command: commandId,
    text: 'About JupyterLab',
    category: 'Help'
  }]);
}
