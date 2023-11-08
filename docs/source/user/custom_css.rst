.. Copyright (c) Jupyter Development Team.
.. Distributed under the terms of the Modified BSD License.

Applying Custom CSS
-------------------

To apply custom CSS, you can add a ``/custom/custom.css`` file in the
jupyter ``config`` directory. You can find the path, ``~/.jupyter``, to
this directory by running ``jupyter --paths``. There you can create a
folder named ``custom`` and create a ``custom.css`` file within the
folder.

Custom CSS is not loaded by default. In the jupyter configuration directory, the
``~/.jupyter/custom/custom.css`` file will not be loaded unless the the application is
initialized with the ``custom_css`` flag with the argument set to ``True`` as in
``--LabApp.custom_css=True``.

Jupyter Styling
---------------

You can use a custom CSS file to modify default Jupyter styling.

::

   /* Modify Jupyter Styles */

  .lm-BoxPanel-child, .jp-FileBrowser-Panel, .lm-StackedPanel-child, .jp-FileBrowser-toolbar {
      background-color: #aecad4!important;
  }

  #top-panel-wrapper, #jp-top-bar {
      background-color: #aecad4!important;
  }

  #menu-panel-wrapper, #jp-MainMenu, #menu-panel {
      background-color: #aecad4!important;
  }

  .jp-NotebookPanel-toolbar {
      background-color:  #aecad4!important;
  }
  .lm-MenuBar-content {
      color: #02484d
  }

  .lm-TabBar-content, .jp-DirListing-content, .lm-MenuBar-content {
      font-size: small;
  }

.. figure:: https://user-images.githubusercontent.com/12378147/248197127-7e825096-3394-438f-9136-be4cc5c5cf01.png
   :alt: a screenshot custom jupyter styling

Markdown
--------

Another potential application for custom CSS is styling markdown.

::

  /* Styling Markdown */

  /* Headings */
  h1,
  h2 {
    font-family: Impact, Charcoal, sans-serif;
    font-weight: bold;
    text-shadow: 2px 2px 4px #000000;
  }

  h1 {
    font-size: 22px;
    margin-bottom: 40px;
    color: #10929e;
    text-decoration: underline;

  }

  h2 {
    font-size: 48px;
    margin-bottom: 32px;
    color: #76b4be;
    text-transform: uppercase;
  }

  /* Block Quotes */
  blockquote {
    font-family: Georgia, serif;
    font-size: 16px;
    color: #19085c;
    border-left: 8px solid #effffc;
    background-color: #eafcff;
    padding: 20px;
  }

  /* Lists */
  ul,
  ol {
    font-family: Verdana, Geneva, sans-serif;
    font-size: 18px;
    color: #333333;
    margin-bottom: 24px;
  }

.. figure:: https://user-images.githubusercontent.com/12378147/248197319-674e196b-0085-4ed2-84e9-39cd2ab9be00.png
   :alt: a screenshot of custom markdown styling
