// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Application
} from 'phosphide/lib/core/application';

import {
  Widget
} from 'phosphor-widget';


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
<h1>Welcome to the JupyterLab pre-alpha preview</h1>

<p>This demo gives an pre-alpha-level developer preview of the JupyterLab environment. <b>It is not ready for general usage yet.</b> We are developing JupyterLab at <a href="https://github.com/jupyter/jupyterlab">https://github.com/jupyter/jupyterlab</a>. Pull requests are welcome!</p>

<p>Click on the JupyterLab tab for the initial JupyterLab screen.</p>

<p>Here is a brief description of some of the things you'll find in this demo.</p>

<h2>File Browser</h2>

<p>Clicking the "Files" tab, located on the left, will toggle the file browser. Navigate into directories by double-clicking, and use the breadcrumbs at the top to navigate out. Create a new file/directory by clicking the plus icon at the top. Click the middle icon to upload files, and click the last icon to reload the file listing. Drag and drop files to move them to subdirectories. Click on a selected file to rename it. Sort the list by clicking on a column header. Open a file by double-clicking it or dragging it into the main area. Opening an image displays the image. Opening a code file opens a code editor. Opening a notebook opens a very preliminary notebook component.</p>

<h2>Command Palette</h2>

<p>Clicking the "Commands" tab, located on the left, will toggle the command palette. Execute a command by clicking, or navigating with your arrow keys and pressing Enter. Filter commands by typing in the text box at the top of the palette. The palette is organized into categories, and you can filter on a single category by clicking on the category header or by typing the header surrounded by colons in the search input (e.g., <code>:file:</code>).</p>

<p>You can try these things out from the command palette:</p>

<ul>
<li>Open a new terminal (requires OS X or Linux)</li>
<li>Open a ipython console</li>
<li>Open a new file</li>
<li>Save a file</li>
<li>Open up a help panel on the right</li>
</ul>

<h2>Main area</h2>

<p>The main area is divided into panels of tabs. Drag a tab around the area to split the main area in different ways. Drag a tab to the center of a panel to move a tab without splitting the panel (in this case, the whole panel will highlight instead of just a portion). Resize panels by dragging their borders (be aware that panels and sidebars also have a minimum width). A file that contains changes to be saved has a star for a close icon.</p>

<h2>Notebook</h2>

<p>Opening a notebook will open a minimally-featured notebook. Code execution, Markdown rendering, and basic cell toolbar actions are supported.  Future versions will add more features from the existing Jupyter notebook.</p>
`;

  widget.node.style.overflowY = 'auto';
  app.commands.add([{
    id: commandId,
    handler: () => {
      if (!widget.isAttached) app.shell.addToMainArea(widget);
      app.shell.activateMain(widget.id);
    }
  }]);

  app.palette.add([{
    command: commandId,
    text: 'About JupyterLab',
    category: 'Help'
  }]);

  app.shell.addToMainArea(widget);
}
