.. _changelog:

JupyterLab Changelog
====================

`v0.34.0 <https://github.com/jupyterlab/jupyterlab/releases/tag/v0.34.0>`__
---------------------------------------------------------------------------

August 18, 2018
^^^^^^^^^^^^^^^

See the `JupyterLab
0.34.0 <https://github.com/jupyterlab/jupyterlab/milestone/16?closed=1>`__
milestone on GitHub for the full list of pull requests and issues closed.


Key Features
^^^^^^^^^^^^
* Notebooks, consoles, and text files now have access to completions for local
  tokens.
* Python 3.5+ is now required to use JupyterLab. Python 2 kernels can still be
  run within JupyterLab.
* Added the pipe (``|``) character as a CSV delimiter option.
* Added "Open From Path..."" to top level ``File`` menu.
* Added "Copy Download Link" to context menu for files.


Changes for Developers
^^^^^^^^^^^^^^^^^^^^^^
* Notebooks, consoles, and text files now have access to completions for local
  tokens. If a text file has a running kernel associated with its path (as
  happens with an attached console), it also gets completions and tooltips from
  that kernel. (`#5049 <https://github.com/jupyterlab/jupyterlab/pull/5049>`__)
* The ``FileBrowser`` widget has a new constructor option ``refreshInterval``,
  allowing the creator to customize how often the widget polls the storage
  backend. This can be useful to prevent rate-limiting in certain contexts.
  (`#5048 <https://github.com/jupyterlab/jupyterlab/pull/5048>`__)
* The application shell now gets a pair of CSS data attributes indicating the
  current theme, and whether it is light or dark. Extension authors can write
  CSS rules targeting these to have their extension UI elements respond to the
  application theme. For instance, to write a rule targeting whether the theme
  is overall light or dark, you can use

  .. code:: css

     [data-theme-light="true"] your-ui-class {
       background-color: white;
     }
     [data-theme-light="false"] your-ui-class {
       background-color: black;
     }

  The theme name can also be targeted by writing CSS rules for
  ``data-theme-name``. (`#5078
  <https://github.com/jupyterlab/jupyterlab/pull/5078>`__)
* The ``IThemeManager`` interface now exposes a signal for ``themeChanged``,
  allowing extension authors to react to changes in the theme. Theme extensions
  must also provide a new boolean property ``isLight``, declaring whether they are
  broadly light colored. This data allows third-party extensions to react better
  to the active application theme. (`#5078
  <https://github.com/jupyterlab/jupyterlab/pull/5078>`__)
* Added a patch to update the ``uploads`` for each ``FileBrowserModel`` instantly
  whenever a file upload errors. Previously, the upload that erred was only
  being removed from uploads upon an update. This would allow the status bar
  component and other extensions that use the ``FileBrowserModel`` to be more
  precise. (`#5077 <https://github.com/jupyterlab/jupyterlab/pull/5077>`__)
* Cell IDs are now passed in the shell message as part of the cell metadata when
  a cell is executed. This helps in developing reactive kernels. (`#5033
  <https://github.com/jupyterlab/jupyterlab/pull/5033>`__)
* The IDs of all deleted cells since the last run cell are now passed as part of
  the cell metadata on execution. The IDs of deleted cells since the last run
  cell are stored as ``deletedCells`` in ``NotebookModel``. This helps in
  developing reactive kernels. (`#5037
  <https://github.com/jupyterlab/jupyterlab/pull/5037>`__)
* The ``ToolbarButton`` in ``apputils`` has been refactored with an API change
  and now uses a React component ``ToolbarButtonComponent``  to render its
  children. It is now a ``div`` with a single ``button`` child, which in turn as
  two ``span`` elements for an icon and text label. Extensions that were using
  the ``className`` options should rename it as ``iconClassName``. The
  ``className`` options still exists, but it used as the CSS class on the
  ``button`` element itself. The API changes were done to accommodate styling
  changes to the button. (`#5117
  <https://github.com/jupyterlab/jupyterlab/pull/5117>`__)
* The ``Toolbar.createFromCommand`` function has been replaced by a dedicated
  ``ToolbarButton`` subclass called ``CommandToolbarButton``, that wraps a similarly
  named React component. (`#5117
  <https://github.com/jupyterlab/jupyterlab/pull/5117>`__)
* The design and styling of the right and left sidebars tabs has been improved
  to address `#5054 <https://github.com/jupyterlab/jupyterlab/issues/50>`__.
  We are now using icons to render tabs for the extensions we ship with
  JupyterLab and extension authors are encouraged to do the same (text labels
  still work). Icon based tabs can be used by removing ``widget.caption`` and
  adding ``widget.iconClass = '<youriconclass> jp-SideBar-tabIcon';``. (`#5117
  <https://github.com/jupyterlab/jupyterlab/pull/5117>`__)
* The style of buttons in JupyterLab has been updated to a borderless design.
  (`#5117 <https://github.com/jupyterlab/jupyterlab/pull/5117>`__)
* A new series of helper CSS classes for stying SVG-based icons at different
  sizes has been added: ``jp-Icon``, ``jp-Icon-16``, ``jp-Icon-18``, ``jp-Icon-20``.
* The rank of the default sidebar widget has been updated. The main change is
  giving the extension manager a rank of ``1000`` so that it appears at the end of
  the default items.
* Python 3.5+ is now required to use JupyterLab.  Python 2 kernels can still be
  run within JupyterLab.  (`#5119
  <https://github.com/jupyterlab/jupyterlab/pull/5119>`__)
* JupyterLab now uses ``yarn 1.9.4`` (aliased as ``jlpm``), which now allows uses to
  use Node 10+.  (`#5121
  <https://github.com/jupyterlab/jupyterlab/pull/5121>`__)
* Clean up handling of ``baseUrl`` and ``wsURL`` for ``PageConfig`` and
  ``ServerConnection``.  (`#5111
  <https://github.com/jupyterlab/jupyterlab/pull/5111>`__)


Other Changes
^^^^^^^^^^^^^
* Added the pipe (``|``) character as a CSV delimiter option. (`#5112
  <https://github.com/jupyterlab/jupyterlab/pull/5112>`__)
* Added ``Open From Path...`` to top level ``File`` menu. (`#5108
  <https://github.com/jupyterlab/jupyterlab/pull/5108>`__)
* Added a ``saveState`` signal to the document context object. (`#5096
  <https://github.com/jupyterlab/jupyterlab/pull/5096>`__)
* Added "Copy Download Link" to context menu for files.  (`#5089
  <https://github.com/jupyterlab/jupyterlab/pull/5089>`__)
* Extensions marked as ``deprecated`` are no longer shown in the extension
  manager.  (`#5058 <https://github.com/jupyterlab/jupyterlab/pull/5058>`__)
* Remove ``In`` and ``Out`` text from cell prompts. Shrunk the prompt width from
  90px to 64px. In the light theme, set the prompt colors of executed console
  cells to active prompt colors and reduced their opacity to 0.5. In the dark
  theme, set the prompt colors of executed console cells to active prompt colors
  and set their opacity to 1. (`#5097
  <https://github.com/jupyterlab/jupyterlab/pull/5097>`__ and `#5130
  <https://github.com/jupyterlab/jupyterlab/pull/5130>`__)


Bug Fixes
^^^^^^^^^
* Fixed a bug in the rendering of the "New Notebook" item of the command
  palette. (`#5079 <https://github.com/jupyterlab/jupyterlab/pull/5079>`__)
* We only create the extension manager widget if it is enabled. This prevents
  unnecessary network requests to ``npmjs.com``.
  (`#5075 <https://github.com/jupyterlab/jupyterlab/pull/5075>`__)
* The ``running`` panel now shows the running sessions at startup.  (`#5118
  <https://github.com/jupyterlab/jupyterlab/pull/5118>`__)
* Double clicking a file in the file browser always opens it rather than
  sometimes selecting it for a rename.  (`#5101
  <https://github.com/jupyterlab/jupyterlab/pull/5101>`__)


`v0.33.0 <https://github.com/jupyterlab/jupyterlab/releases/tag/v0.33.0>`__
---------------------------------------------------------------------------

July 26, 2018
^^^^^^^^^^^^^

See the `JupyterLab
0.33.0 <https://github.com/jupyterlab/jupyterlab/milestone/12?closed=1>`__
milestone on GitHub for the full list of pull requests and issues
closed.

Key Features:
^^^^^^^^^^^^^

-  `No longer in beta <#no-longer-in-beta>`__
-  `Workspaces <#workspaces>`__
-  `Menu items <#menu-items>`__
-  `Keyboard shortcuts <#keyboard-shorcuts>`__
-  `Command palette items <#command-palette-items>`__
-  `Settings <#settings>`__
-  `Larger file uploads <#larger-size-uploads>`__
-  `Extension management and installation <#extension-manager>`__
-  `Interface changes <#interface-changes>`__
-  `Renderers <#renderers>`__
-  `Changes for developers <#changes-for-developers>`__
-  `Other fixes <#other-fixes>`__

No longer in beta
^^^^^^^^^^^^^^^^^

In JupyterLab 0.33, we removed the “Beta” label to better signal that
JupyterLab is ready for users to use on a daily basis. The extension
developer API is still being stabilized. See the release blog post for
details.
(`#4898 <https://github.com/jupyterlab/jupyterlab/issues/4898>`__,
`#4920 <https://github.com/jupyterlab/jupyterlab/pull/4920>`__)

Workspaces
^^^^^^^^^^

We added new workspace support, which enables you to have multiple saved
layouts, including in different browser windows. See the `workspace
documentation <https://jupyterlab.readthedocs.io/en/stable/user/urls.html>`__
for more details.
(`#4502 <https://github.com/jupyterlab/jupyterlab/issues/4502>`__,
`#4708 <https://github.com/jupyterlab/jupyterlab/pull/4708>`__,
`#4088 <https://github.com/jupyterlab/jupyterlab/issues/4088>`__,
`#4041 <https://github.com/jupyterlab/jupyterlab/pull/4041>`__
`#3673 <https://github.com/jupyterlab/jupyterlab/issues/3673>`__,
`#4780 <https://github.com/jupyterlab/jupyterlab/pull/4780>`__)

Menu items
^^^^^^^^^^

-  “Activate Previously Used Tab” added to the Tab menu
   (``Ctrl/Cmd Shift '``) to toggle between the previously active tabs
   in the main area.
   (`#4296 <https://github.com/jupyterlab/jupyterlab/pull/4296>`__)
-  “Reload From Disk” added to the File menu to reload an open file from
   the state saved on disk.
   (`#4615 <https://github.com/jupyterlab/jupyterlab/pull/4615>`__)
-  “Save Notebook with View State” added to the File menu to persist the
   notebook collapsed and scrolled cell state. We now read the
   ``collapsed``, ``scrolled``, ``jupyter.source_hidden`` and
   ``jupyter.outputs_hidden`` notebook cell metadata when opening.
   ``collapsed`` and ``jupyter.outputs_hidden`` are redundant and the
   initial collapsed state is the union of both of them. When the state
   is persisted, if an output is collapsed, both will be written with
   the value ``true``, and if it is not, both will not be written.
   (`#3981 <https://github.com/jupyterlab/jupyterlab/pull/3981>`__)
-  “Increase/Decrease Font Size” added to the text editor settings menu.
   (`#4811 <https://github.com/jupyterlab/jupyterlab/pull/4811>`__)
-  “Show in File Browser” added to a document tab’s context menu.
   (`#4500 <https://github.com/jupyterlab/jupyterlab/pull/4500>`__)
-  “Open in New Browser Tab” added to the file browser context menu.
   (`#4315 <https://github.com/jupyterlab/jupyterlab/pull/4315>`__)
-  “Copy Path” added to file browser context menu to copy the document’s
   path to the clipboard.
   (`#4582 <https://github.com/jupyterlab/jupyterlab/pull/4582>`__)
-  “Show Left Area” has been renamed to “Show Left Sidebar” for
   consistency (same for right sidebar).
   (`#3818 <https://github.com/jupyterlab/jupyterlab/pull/3818>`__)

Keyboard shortcuts
^^^^^^^^^^^^^^^^^^

-  “Save As…” given the keyboard shortcut ``Ctrl/Cmd Shift S``.
   (`#4560 <https://github.com/jupyterlab/jupyterlab/pull/4560>`__)
-  “Run All Cells” given the keyboard shortcut ``Ctrl/Cmd Shift Enter``.
   (`#4558 <https://github.com/jupyterlab/jupyterlab/pull/4558>`__)
-  “notebook:change-to-cell-heading-X” keyboard shortcuts (and commands)
   renamed to “notebook:change-cell-to-heading-X” for X=1…6. This fixes
   the notebook command-mode keyboard shortcuts for changing headings.
   (`#4430 <https://github.com/jupyterlab/jupyterlab/pull/4430>`__)
-  The console execute shortcut can now be set to either ``Enter`` or
   ``Shift Enter`` as a Console setting.
   (`#4054 <https://github.com/jupyterlab/jupyterlab/pull/4054>`__)

Command palette items
^^^^^^^^^^^^^^^^^^^^^

-  “Notebook” added to the command palette to open a new notebook.
   (`#4812 <https://github.com/jupyterlab/jupyterlab/pull/4812>`__)
-  “Run Selected Text or Current Line in Console” added to the command
   palette to run the selected text or current line from a notebook in a
   console. A default keyboard shortcut for this command is not yet
   provided, but can be added by users with the
   ``notebook:run-in-console`` command. To add a keyboard shortcut
   ``Ctrl G`` for this command, use the “Settings” \| “Advanced Settings
   Editor” menu item to open the “Keyboard Shortcuts” advanced settings,
   and add the following JSON in the shortcut JSON object in the User
   Overrides pane (adjust the actual keyboard shortcut if you wish).
   (`#3453 <https://github.com/jupyterlab/jupyterlab/issues/3453>`__,
   `#4206 <https://github.com/jupyterlab/jupyterlab/issues/4206>`__,
   `#4330 <https://github.com/jupyterlab/jupyterlab/pull/4330>`__)

   .. code:: json

      "notebook:run-in-console": {
        "command": "notebook:run-in-console",
        "keys": ["Ctrl G"],
        "selector": ".jp-Notebook.jp-mod-editMode"
      }

-  The command palette now renders labels, toggled state, and keyboard
   shortcuts in a more consistent and correct way.
   (`#4533 <https://github.com/jupyterlab/jupyterlab/pull/4533>`__,
   `#4510 <https://github.com/jupyterlab/jupyterlab/pull/4510>`__)

Settings
^^^^^^^^

-  “fontFamily”, “fontSize”, and “lineHeight” settings added to the text
   editor advanced settings.
   (`#4673 <https://github.com/jupyterlab/jupyterlab/pull/4673>`__)
-  Solarized dark and light text editor themes from CodeMirror.
   (`#4445 <https://github.com/jupyterlab/jupyterlab/pull/4445>`__)

Larger file uploads
^^^^^^^^^^^^^^^^^^^

-  Support for larger file uploads (>15MB) when using Jupyter notebook
   server version >= 5.1.
   (`#4224 <https://github.com/jupyterlab/jupyterlab/pull/4224>`__)

Extension management and installation
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

-  New extension manager for installing JupyterLab extensions from npm
   within the JupyterLab UI. You can enable this from the Advanced
   Settings interface.
   (`#4682 <https://github.com/jupyterlab/jupyterlab/pull/4682>`__,
   `#4925 <https://github.com/jupyterlab/jupyterlab/pull/4925>`__)
-  Please note that to install extensions in JupyterLab, you must use
   NodeJS version 9 or earlier (i.e., not NodeJS version 10). We will
   upgrade yarn, with NodeJS version 10 support, when a `bug in
   yarn <https://github.com/yarnpkg/yarn/issues/5935>`__ is fixed.
   (`#4804 <https://github.com/jupyterlab/jupyterlab/pull/4804>`__)

Interface changes
^^^^^^^^^^^^^^^^^

-  Wider tabs in the main working area to show longer filenames.
   (`#4801 <https://github.com/jupyterlab/jupyterlab/pull/4801>`__)
-  Initial kernel selection for a notebook or console can no longer be
   canceled: the user must select a kernel.
   (`#4596 <https://github.com/jupyterlab/jupyterlab/pull/4596>`__)
-  Consoles now do not display output from other clients by default. A
   new “Show All Kernel Activity” console context menu item has been
   added to show all activity from a kernel in the console.
   (`#4503 <https://github.com/jupyterlab/jupyterlab/pull/4503>`__)
-  The favicon now shows the busy status of the kernels in JupyterLab.
   (`#4361 <https://github.com/jupyterlab/jupyterlab/pull/4361>`__,
   `#3957 <https://github.com/jupyterlab/jupyterlab/issues/3957>`__,
   `#4966 <https://github.com/jupyterlab/jupyterlab/pull/4966>`__)

Renderers
^^^^^^^^^

-  JupyterLab now ships with a Vega4 renderer by default (upgraded from
   Vega3).
   (`#4806 <https://github.com/jupyterlab/jupyterlab/pull/4806>`__)
-  The HTML sanitizer now allows some extra tags in rendered HTML,
   including ``kbd``, ``sup``, and ``sub``.
   (`#4618 <https://github.com/jupyterlab/jupyterlab/pull/4618>`__)
-  JupyterLab now recognizes the ``.tsv`` file extension as
   tab-separated files.
   (`#4684 <https://github.com/jupyterlab/jupyterlab/pull/4684>`__)
-  Javascript execution in notebook cells has been re-enabled.
   (`#4515 <https://github.com/jupyterlab/jupyterlab/pull/4682>`__)

Changes for developers
^^^^^^^^^^^^^^^^^^^^^^

-  A new signal for observing application dirty status state changes.
   (`#4840 <https://github.com/jupyterlab/jupyterlab/issues/4840>`__)
-  A new signal for observing notebook cell execution.
   (`#4740 <https://github.com/jupyterlab/jupyterlab/issues/4740>`__,
   `#4744 <https://github.com/jupyterlab/jupyterlab/pull/4744>`__)
-  A new ``anyMessage`` signal for observing any message a kernel sends
   or receives.
   (`#4437 <https://github.com/jupyterlab/jupyterlab/pull/4437>`__)
-  A generic way for different widgets to register a “Save with extras”
   command that appears in the File menu under save.
   (`#3981 <https://github.com/jupyterlab/jupyterlab/pull/3981>`__)
-  A new API for removing groups from a JupyterLab menu. ``addGroup``
   now returns an ``IDisposable`` which can be used to remove the group.
   ``removeGroup`` has been removed.
   (`#4890 <https://github.com/jupyterlab/jupyterlab/pull/4890>`__)
-  The ``Launcher`` now uses commands from the application
   ``CommandRegistry`` to launch new activities. Extension authors that
   add items to the launcher will need to update them to use commands.
   (`#4757 <https://github.com/jupyterlab/jupyterlab/pull/4757>`__)
-  There is now a top-level ``addToBottomArea`` function in the
   application, allowing extension authors to add bottom panel items
   like status bars.
   (`#4752 <https://github.com/jupyterlab/jupyterlab/pull/4752>`__)
-  Rendermime extensions can now indicate that they are the default
   rendered widget factory for a file-type. For instance, the default
   widget for a markdown file is a text editor, but the default rendered
   widget is the markdown viewer.
   (`#4692 <https://github.com/jupyterlab/jupyterlab/pull/4692>`__)
-  Add new workspace REST endpoints to ``jupyterlab_launcher`` and make
   them available in ``@jupyterlab/services``.
   (`#4841 <https://github.com/jupyterlab/jupyterlab/pull/4841>`__)
-  Documents created with a mimerenderer extension can now be accessed
   using an ``IInstanceTracker`` which tracks them. Include the token
   ``IMimeDocumentTracker`` in your plugin to access this. The
   ``IInstanceTracker`` interface has also gained convenience functions
   ``find`` and ``filter`` to simplify iterating over instances.
   (`#4762 <https://github.com/jupyterlab/jupyterlab/pull/4762>`__)
-  RenderMime render errors are now displayed to the user.
   (`#4465 <https://github.com/jupyterlab/jupyterlab/pull/4465>`__)
-  ``getNotebookVersion`` is added to the ``PageConfig`` object.
   (`#4224 <https://github.com/jupyterlab/jupyterlab/pull/4224>`__)
-  The session ``kernelChanged`` signal now contains both the old kernel
   and the new kernel to make it easy to unregister things from the old
   kernel.
   (`#4834 <https://github.com/jupyterlab/jupyterlab/pull/4834>`__)
-  The ``connectTo`` functions for connecting to kernels and sessions
   are now synchronous (returning a connection immediately rather than a
   promise). The DefaultSession ``clone`` and ``update`` methods are
   also synchronous now.
   (`#4725 <https://github.com/jupyterlab/jupyterlab/pull/4725>`__)
-  Kernel message processing is now asynchronous, which guarantees the
   order of processing even if a handler is asynchronous. If a kernel
   message handler returns a promise, kernel message processing is
   paused until the promise resolves. The kernel’s ``anyMessage`` signal
   is emitted synchronously when a message is received before
   asynchronous message handling, and the ``iopubMessage`` and
   ``unhandledMessage`` signals are emitted during asynchronous message
   handling. These changes mean that the comm ``onMsg`` and ``onClose``
   handlers and the kernel future ``onReply``, ``onIOPub``, and
   ``onStdin`` handlers, as well as the comm target and message hook
   handlers, may be asynchronous and return promises.
   (`#4697 <https://github.com/jupyterlab/jupyterlab/pull/4697>`__)
-  Kernel comm targets and message hooks now are unregistered with
   ``removeCommTarget`` and ``removeMessageHook``, instead of using
   disposables. The corresponding ``registerCommTarget`` and
   ``registerMessageHook`` functions now return nothing.
   (`#4697 <https://github.com/jupyterlab/jupyterlab/pull/4697>`__)
-  The kernel ``connectToComm`` function is synchronous, and now returns
   the comm rather than a promise to the comm.
   (`#4697 <https://github.com/jupyterlab/jupyterlab/pull/4697>`__)
-  The ``KernelFutureHandler`` class ``expectShell`` constructor
   argument is renamed to ``expectReply``.
   (`#4697 <https://github.com/jupyterlab/jupyterlab/pull/4697>`__)
-  The kernel future ``done`` returned promise now resolves to undefined
   if there is no reply message.
   (`#4697 <https://github.com/jupyterlab/jupyterlab/pull/4697>`__)
-  The ``IDisplayDataMsg`` is updated to have the optional ``transient``
   key, and a new ``IUpdateDisplayDataMsg`` type was added for update
   display messages.
   (`#4697 <https://github.com/jupyterlab/jupyterlab/pull/4697>`__)
-  The ``uuid`` function from ``@jupyterlab/coreutils`` is removed.
   Instead import ``UUID`` from ``@phosphor/coreutils`` and use
   ``UUID.uuid4()`` .
   (`#4604 <https://github.com/jupyterlab/jupyterlab/pull/4604>`__)
-  Main area widgets like the launcher and console inherit from a common
   ``MainAreaWidget`` class which provides a content area (``.content``)
   and a toolbar (``.toolbar``), consistent focus handling and
   activation behavior, and a spinner displayed until the given
   ``reveal`` promise is resolved. Document widgets, like the notebook
   and text editor and other documents opened from the document manager,
   implement the ``IDocumentWidget`` interface (instead of
   ``DocumentRegistry.IReadyWidget``), which builds on
   ``MainAreaWidget`` and adds a ``.context`` attribute for the document
   context and makes dirty handling consistent. Extension authors may
   consider inheriting from the ``MainAreaWidget`` or ``DocumentWidget``
   class for consistency. Several effects from these changes are noted
   below.
   (`#3499 <https://github.com/jupyterlab/jupyterlab/pull/3499>`__,
   `#4453 <https://github.com/jupyterlab/jupyterlab/pull/4453>`__)

   -  The notebook panel ``.notebook`` attribute is renamed to
      ``.content``.
   -  The text editor is now the ``.content`` of a ``DocumentWidget``,
      so the top-level editor widget has a toolbar and the editor itself
      is ``widget.content.editor`` rather than just ``widget.editor``.
   -  Mime documents use a ``MimeContent`` widget embedded inside of a
      ``DocumentWidget`` now.
   -  Main area widgets and document widgets now have a ``revealed``
      promise which resolves when the widget has been revealed (i.e.,
      the spinner has been removed). This should be used instead of the
      ``ready`` promise.

Changes in the JupyterLab code infrastructure include:

-  The JupyterLab TypeScript codebase is now compiled to ES2015 (ES6)
   using TypeScript 2.9. We also turned on the TypeScript
   ``esModuleInterop`` flag to enable more natural imports from
   non-es2015 JavaScript modules. With the update to ES2015 output, code
   generated from async/await syntax became much more manageable, so we
   have started to use async/await liberally throughout the codebase,
   especially in tests. Because we use Typedoc for API documentation, we
   still use syntax compatible with TypeScript 2.7 where Typedoc is
   used. Extension authors may have some minor compatibility updates to
   make. If you are writing an extension in TypeScript, we recommend
   updating to TypeScript 2.9 and targeting ES2015 output as well.
   (`#4462 <https://github.com/jupyterlab/jupyterlab/pull/4462>`__,
   `#4675 <https://github.com/jupyterlab/jupyterlab/pull/4675>`__,
   `#4714 <https://github.com/jupyterlab/jupyterlab/pull/4714>`__,
   `#4797 <https://github.com/jupyterlab/jupyterlab/pull/4797>`__)
-  The JupyterLab codebase is now formatted using
   `Prettier <https://github.com/prettier/prettier>`__. By default the
   development environment installs a pre-commit hook that formats your
   staged changes.
   (`#4090 <https://github.com/jupyterlab/jupyterlab/pull/4090>`__)
-  Updated build infrastructure using webpack 4 and better typing.
   (`#4702 <https://github.com/jupyterlab/jupyterlab/pull/4702>`__,
   `#4698 <https://github.com/jupyterlab/jupyterlab/pull/4698>`__)
-  Upgraded yarn to version 1.6. Please note that you must use NodeJS
   version 9 or earlier with JupyterLab (i.e., not NodeJS version 10).
   We will upgrade yarn, with NodeJS version 10 support, when a `bug in
   yarn <https://github.com/yarnpkg/yarn/issues/5935>`__ is fixed.
   (`#4804 <https://github.com/jupyterlab/jupyterlab/pull/4804>`__)
-  Various process utilities were moved to ``jupyterlab_launcher``.
   (`#4696 <https://github.com/jupyterlab/jupyterlab/pull/4696>`__)

Other fixes
^^^^^^^^^^^

-  Fixed a rendering bug with the Launcher in single-document mode.
   (`#4805 <https://github.com/jupyterlab/jupyterlab/pull/4805>`__)
-  Fixed a bug where the native context menu could not be triggered in a
   notebook cell in Chrome.
   (`#4720 <https://github.com/jupyterlab/jupyterlab/pull/4720>`__)
-  Fixed a bug where the cursor would not show up in the dark theme.
   (`#4699 <https://github.com/jupyterlab/jupyterlab/pull/4699>`__)
-  Fixed a bug preventing relative links from working correctly in
   alternate ``IDrive``\ s.
   (`#4613 <https://github.com/jupyterlab/jupyterlab/pull/4613>`__)
-  Fixed a bug breaking the image viewer upon saving the image.
   (`#4602 <https://github.com/jupyterlab/jupyterlab/pull/4602>`__)
-  Fixed the font size for code blocks in notebook Markdown headers.
   (`#4617 <https://github.com/jupyterlab/jupyterlab/pull/4617>`__)
-  Prevented a memory leak when repeatedly rendering a Vega chart.
   (`#4904 <https://github.com/jupyterlab/jupyterlab/pull/4904>`__)
-  Support dropped terminal connection re-connecting.
   (`#4763 <https://github.com/jupyterlab/jupyterlab/issues/4763>`__,
   `#4802 <https://github.com/jupyterlab/jupyterlab/pull/4802>`__)
-  Use ``require.ensure`` in ``vega4-extension`` to lazily load
   ``vega-embed`` and its dependencies on first render.
   (`#4706 <https://github.com/jupyterlab/jupyterlab/pull/4706>`__)
-  Relative links to documents that include anchor tags will now
   correctly scroll the document to the right place.
   (`#4692 <https://github.com/jupyterlab/jupyterlab/pull/4692>`__)
-  Fix default settings JSON in setting editor.
   (`#4591 <https://github.com/jupyterlab/jupyterlab/issues/4591>`__,
   `#4595 <https://github.com/jupyterlab/jupyterlab/pull/4595>`__)
-  Fix setting editor pane layout’s stretch factor.
   (`#2971 <https://github.com/jupyterlab/jupyterlab/issues/2971>`__,
   `#4772 <https://github.com/jupyterlab/jupyterlab/pull/4772>`__)
-  Programmatically set settings are now output with nicer formatting.
   (`#4870 <https://github.com/jupyterlab/jupyterlab/pull/4870>`__)
-  Fixed a bug in displaying one-line CSV files.
   (`#4795 <https://github.com/jupyterlab/jupyterlab/issues/4795>`__,
   `#4796 <https://github.com/jupyterlab/jupyterlab/pull/4796>`__)
-  Fixed a bug where JSON arrays in rich outputs were collapsed into
   strings.
   (`#4480 <https://github.com/jupyterlab/jupyterlab/pull/4480>`__)

`Beta 2 (v0.32.0) <https://github.com/jupyterlab/jupyterlab/releases/tag/v0.32.0>`__
------------------------------------------------------------------------------------

Apr 16, 2018
^^^^^^^^^^^^

This is the second in the JupyterLab Beta series of releases. It
contains many enhancements, bugfixes, and refinements, including:

-  Better handling of a corrupted or invalid state database.
   (`#3619 <https://github.com/jupyterlab/jupyterlab/issues/3619>`__,
   `#3622 <https://github.com/jupyterlab/jupyterlab/issues/3622>`__,
   `#3687 <https://github.com/jupyterlab/jupyterlab/issues/3687>`__,
   `#4114 <https://github.com/jupyterlab/jupyterlab/issues/4114>`__).
-  Fixing file dirty status indicator.
   (`#3652 <https://github.com/jupyterlab/jupyterlab/issues/3652>`__).
-  New option for whether to autosave documents.
   (`#3734 <https://github.com/jupyterlab/jupyterlab/issues/3734>`__).
-  More commands in the notebook context menu.
   (`#3770 <https://github.com/jupyterlab/jupyterlab/issues/3770>`__,
   `#3909 <https://github.com/jupyterlab/jupyterlab/issues/3909>`__)
-  Defensively checking for completion metadata from kernels.
   (`#3888 <https://github.com/jupyterlab/jupyterlab/issues/3888>`__)
-  New “Shutdown all” button in the Running panel.
   (`#3764 <https://github.com/jupyterlab/jupyterlab/issues/3764>`__)
-  Performance improvements wherein non-focused documents poll the
   server less.
   (`#3931 <https://github.com/jupyterlab/jupyterlab/issues/3931>`__)
-  Changing the keyboard shortcut for singled-document-mode to something
   less easy to trigger.
   (`#3889 <https://github.com/jupyterlab/jupyterlab/issues/3889>`__)
-  Performance improvements for rendering text streams, especially
   around progress bars.
   (`#4045 <https://github.com/jupyterlab/jupyterlab/issues/4045>`__).
-  Canceling a “Restart Kernel” now functions correctly.
   (`#3703 <https://github.com/jupyterlab/jupyterlab/issues/3703>`__).
-  Defer loading file contents until after the application has been
   restored.
   (`#4087 <https://github.com/jupyterlab/jupyterlab/issues/4087>`__).
-  Ability to rotate, flip, and invert images in the image viewer.
   (`#4000 <https://github.com/jupyterlab/jupyterlab/issues/4000>`__)
-  Major performance improvements for large CSV viewing.
   (`#3997 <https://github.com/jupyterlab/jupyterlab/issues/3997>`__).
-  Always show the context menu in the file browser, even for an empty
   directory.
   (`#4264 <https://github.com/jupyterlab/jupyterlab/issues/4264>`__).
-  Handle asynchronous comm messages in the services library more
   correctly (Note: this means ``@jupyterlab/services`` is now at
   version 2.0!)
   (`[#4115](https://github.com/jupyterlab/jupyterlab/issues/4115) <https://github.com/jupyterlab/jupyterlab/pull/4115>`__).
-  Display the kernel banner in the console when a kernel is restarted
   to mark the restart
   (`[#3663](https://github.com/jupyterlab/jupyterlab/issues/3663) <https://github.com/jupyterlab/jupyterlab/pull/3663>`__).
-  Many tweaks to the UI, as well as better error handling.

`Beta 1 (v0.31.0) <https://github.com/jupyterlab/jupyterlab/releases/tag/v0.31.0>`__
------------------------------------------------------------------------------------

Jan 11, 2018
^^^^^^^^^^^^

-  Add a ``/tree`` handler and ``Copy Shareable Link`` to file listing
   right click menu: https://github.com/jupyterlab/jupyterlab/pull/3396
-  Experimental support for saved workspaces:
   `#3490 <https://github.com/jupyterlab/jupyterlab/issues/3490>`__,
   `#3586 <https://github.com/jupyterlab/jupyterlab/issues/3586>`__
-  Added types information to the completer:
   `#3508 <https://github.com/jupyterlab/jupyterlab/issues/3508>`__
-  More improvements to the top level menus:
   https://github.com/jupyterlab/jupyterlab/pull/3344
-  Editor settings for notebook cells:
   https://github.com/jupyterlab/jupyterlab/pull/3441
-  Simplification of theme extensions:
   https://github.com/jupyterlab/jupyterlab/pull/3423
-  New CSS variable naming scheme:
   https://github.com/jupyterlab/jupyterlab/pull/3403
-  Improvements to cell selection and dragging:
   https://github.com/jupyterlab/jupyterlab/pull/3414
-  Style and typography improvements:
   https://github.com/jupyterlab/jupyterlab/pull/3468
   https://github.com/jupyterlab/jupyterlab/pull/3457
   https://github.com/jupyterlab/jupyterlab/pull/3445
   https://github.com/jupyterlab/jupyterlab/pull/3431
   https://github.com/jupyterlab/jupyterlab/pull/3428
   https://github.com/jupyterlab/jupyterlab/pull/3408
   https://github.com/jupyterlab/jupyterlab/pull/3418

`v0.30.0 <https://github.com/jupyterlab/jupyterlab/releases/tag/v0.30.0>`__
---------------------------------------------------------------------------

Dec 05, 2017
^^^^^^^^^^^^

-  Semantic menus: https://github.com/jupyterlab/jupyterlab/pull/3182
-  Settings editor now allows comments and provides setting validation:
   https://github.com/jupyterlab/jupyterlab/pull/3167
-  Switch to Yarn as the package manager:
   https://github.com/jupyterlab/jupyterlab/pull/3182
-  Support for carriage return in outputs:
   `#2761 <https://github.com/jupyterlab/jupyterlab/issues/2761>`__
-  Upgrade to TypeScript 2.6:
   https://github.com/jupyterlab/jupyterlab/pull/3288
-  Cleanup of the build, packaging, and extension systems.
   ``jupyter labextension install`` is now the recommended way to
   install a local directory. Local directories are considered linked to
   the application. cf
   https://github.com/jupyterlab/jupyterlab/pull/3182
-  ``--core-mode`` and ``--dev-mode`` are now semantically different.
   ``--core-mode`` is a version of JupyterLab using released JavaScript
   packages and is what we ship in the Python package. ``--dev-mode`` is
   for unreleased JavaScript and shows the red banner at the top of the
   page. https://github.com/jupyterlab/jupyterlab/pull/3270

`v0.29.2 <https://github.com/jupyterlab/jupyterlab/releases/tag/v0.29.2>`__
---------------------------------------------------------------------------

Nov 17, 2017
^^^^^^^^^^^^

Bug fix for file browser right click handling.
https://github.com/jupyterlab/jupyterlab/issues/3019

`v0.29.0 <https://github.com/jupyterlab/jupyterlab/releases/tag/v0.29.0>`__
---------------------------------------------------------------------------

Nov 09, 2017
^^^^^^^^^^^^

-  Create new view of cell in cell context menu.
   `#3159 <https://github.com/jupyterlab/jupyterlab/issues/3159>`__
-  New Renderers for VDOM and JSON mime types and files.
   `#3157 <https://github.com/jupyterlab/jupyterlab/issues/3157>`__
-  Switch to React for our VDOM implementation. Affects the
   ``VDomRenderer`` class.
   `#3133 <https://github.com/jupyterlab/jupyterlab/issues/3133>`__
-  Standalone Cell Example.
   `#3155 <https://github.com/jupyterlab/jupyterlab/issues/3155>`__

`v0.28.0 <https://github.com/jupyterlab/jupyterlab/releases/tag/v0.28.0>`__
---------------------------------------------------------------------------

Oct 16, 2017
^^^^^^^^^^^^

This release generally focuses on developer and extension author
enhancements and general bug fixes.

-  Plugin id and schema file conventions change.
   https://github.com/jupyterlab/jupyterlab/pull/2936.
-  Theme authoring conventions change.
   `#3061 <https://github.com/jupyterlab/jupyterlab/issues/3061>`__
-  Enhancements to enabling and disabling of extensions.
   `#3078 <https://github.com/jupyterlab/jupyterlab/issues/3078>`__
-  Mime extensions API change (``name`` -> ``id`` and new naming
   convention).
   `#3078 <https://github.com/jupyterlab/jupyterlab/issues/3078>`__
-  Added a ``jupyter lab --watch`` mode for extension authors.
   `#3077 <https://github.com/jupyterlab/jupyterlab/issues/3077>`__
-  New comprehensive extension authoring tutorial.
   `#2921 <https://github.com/jupyterlab/jupyterlab/issues/2921>`__
-  Added the ability to use an alternate LaTeX renderer.
   `#2974 <https://github.com/jupyterlab/jupyterlab/issues/2974>`__
-  Numerous bug fixes and style enhancements.

`v0.27.0 <https://github.com/jupyterlab/jupyterlab/releases/tag/v0.27.0>`__
---------------------------------------------------------------------------

Aug 23, 2017
^^^^^^^^^^^^

-  Added support for dynamic theme loading.
   https://github.com/jupyterlab/jupyterlab/pull/2759
-  Added an application splash screen.
   https://github.com/jupyterlab/jupyterlab/pull/2899
-  Enhancements to the settings editor.
   https://github.com/jupyterlab/jupyterlab/pull/2784
-  Added a PDF viewer.
   `#2867 <https://github.com/jupyterlab/jupyterlab/issues/2867>`__
-  Numerous bug fixes and style improvements.

`v0.26.0 <https://github.com/jupyterlab/jupyterlab/releases/tag/v0.26.0>`__
---------------------------------------------------------------------------

Jul 21, 2017
^^^^^^^^^^^^

-  Implemented server side handling of users settings:
   https://github.com/jupyterlab/jupyterlab/pull/2585
-  Revamped the handling of file types in the application - affects
   document and mime renderers:
   https://github.com/jupyterlab/jupyterlab/pull/2701
-  Updated dialog API - uses virtual DOM instead of raw DOM nodes and
   better use of the widget lifecycle:
   https://github.com/jupyterlab/jupyterlab/pull/2661

`v0.25.0 <https://github.com/jupyterlab/jupyterlab/releases/tag/v0.25.0>`__
---------------------------------------------------------------------------

Jul 07, 2017
^^^^^^^^^^^^

-  Added a new extension type for mime renderers, with the
   ``vega2-extension`` as a built-in example. Also overhauled the
   rendermime interfaces.
   https://github.com/jupyterlab/jupyterlab/pull/2488
   https://github.com/jupyterlab/jupyterlab/pull/2555
   https://github.com/jupyterlab/jupyterlab/pull/2595
-  Finished JSON-schema based settings system, using client-side storage
   for now. https://github.com/jupyterlab/jupyterlab/pull/2411
-  Overhauled the launcher design.
   https://github.com/jupyterlab/jupyterlab/pull/2506
   https://github.com/jupyterlab/jupyterlab/pull/2580
-  Numerous bug fixes and style updates.

`v0.24.0 <https://github.com/jupyterlab/jupyterlab/releases/tag/v0.24.0>`__
---------------------------------------------------------------------------

Jun 16, 2017
^^^^^^^^^^^^

-  Overhaul of the launcher.
   `#2380 <https://github.com/jupyterlab/jupyterlab/issues/2380>`__
-  Initial implementation of client-side settings system.
   `#2157 <https://github.com/jupyterlab/jupyterlab/issues/2157>`__
-  Updatable outputs.
   `#2439 <https://github.com/jupyterlab/jupyterlab/issues/2439>`__
-  Use new Phosphor Datagrid for CSV viewer.
   `#2433 <https://github.com/jupyterlab/jupyterlab/issues/2433>`__
-  Added ability to enable/disable extensions without rebuilding.
   `#2409 <https://github.com/jupyterlab/jupyterlab/issues/2409>`__
-  Added language and tab settings for the file viewer.
   `#2406 <https://github.com/jupyterlab/jupyterlab/issues/2406>`__
-  Improvements to real time collaboration experience.
   `#2387 <https://github.com/jupyterlab/jupyterlab/issues/2387>`__
   `#2333 <https://github.com/jupyterlab/jupyterlab/issues/2333>`__
-  Compatibility checking for extensions.
   `#2410 <https://github.com/jupyterlab/jupyterlab/issues/2410>`__
-  Numerous bug fixes and style improvements.

`v0.23.0 <https://github.com/jupyterlab/jupyterlab/releases/tag/v0.23.0>`__
---------------------------------------------------------------------------

Jun 02, 2017
^^^^^^^^^^^^

-  Chat box feature. https://github.com/jupyterlab/jupyterlab/pull/2118
-  Collaborative cursors.
   https://github.com/jupyterlab/jupyterlab/pull/2139
-  Added concept of Drive to ContentsManager.
   https://github.com/jupyterlab/jupyterlab/pull/2248
-  Refactored to enable switching the theme.
   https://github.com/jupyterlab/jupyterlab/pull/2283
-  Clean up the APIs around kernel execution.
   https://github.com/jupyterlab/jupyterlab/pull/2266
-  Various bug fixes and style improvements.

`v0.22.0 <https://github.com/jupyterlab/jupyterlab/releases/tag/v0.22.0>`__
------------------------------------------------------------------------------------

May 18, 2017
^^^^^^^^^^^^

-  Export To… for notebooks.
   https://github.com/jupyterlab/jupyterlab/pull/2200
-  Change kernel by clicking on the kernel name in the notebook.
   https://github.com/jupyterlab/jupyterlab/pull/2195
-  Improved handling of running code in text editors.
   https://github.com/jupyterlab/jupyterlab/pull/2191
-  Can select file in file browser by typing:
   https://github.com/jupyterlab/jupyterlab/pull/2190
-  Ability to open a console for a notebook.
   https://github.com/jupyterlab/jupyterlab/pull/2189
-  Upgrade to Phosphor 1.2 with Command Palette fuzzy matching
   improvements.
   `#1182 <https://github.com/jupyterlab/jupyterlab/issues/1182>`__
-  Rename of widgets that had ``Widget`` in the name and associated
   package names. https://github.com/jupyterlab/jupyterlab/pull/2177
-  New ``jupyter labhub`` command to launch JupyterLab on JupyterHub:
   https://github.com/jupyterlab/jupyterlab/pull/2222
-  Removed the ``utils`` from ``@jupyterlab/services`` in favor of
   ``PageConfig`` and ``ServerConnection``.
   https://github.com/jupyterlab/jupyterlab/pull/2173
   https://github.com/jupyterlab/jupyterlab/pull/2185
-  Cleanup, bug fixes, and style updates.

`v0.20.0 <https://github.com/jupyterlab/jupyterlab/releases/tag/v0.20.0>`__
------------------------------------------------------------------------------------

Apr 21, 2017
^^^^^^^^^^^^

Release Notes:

-  Overhaul of extension handling, see updated docs for
   `users <https://github.com/jupyterlab/jupyterlab/blob/dd83a2e4be8bf23c610c163afe4b480215514764/tutorial/extensions_user.md>`__
   and
   `developers <https://github.com/jupyterlab/jupyterlab/blob/dd83a2e4be8bf23c610c163afe4b480215514764/tutorial/extensions_dev.md>`__.
   https://github.com/jupyterlab/jupyterlab/pull/2023
-  Added single document mode and a ``Tabs`` sidebar.
   https://github.com/jupyterlab/jupyterlab/pull/2037
-  More work toward real time collaboration - implemented a model
   database interface that can be in-memory by real time backends.
   https://github.com/jupyterlab/jupyterlab/pull/2039

Numerous bug fixes and improvements.

`v0.19.0 <https://github.com/jupyterlab/jupyterlab/releases/tag/v0.19.0>`__
------------------------------------------------------------------------------------------

Apr 04, 2017
^^^^^^^^^^^^

Mainly backend-focused release with compatibility with Phosphor 1.0 and
a big refactor of session handling (the ClientSession class) that
provides a simpler object for classes like notebooks, consoles,
inspectors, etc. to use to communicate with the API. Also includes
improvements to the development workflow of JupyterLab itself after the
big split.

https://github.com/jupyterlab/jupyterlab/pull/1984
https://github.com/jupyterlab/jupyterlab/pull/1927

`v0.18.0 <https://github.com/jupyterlab/jupyterlab/releases/tag/v0.18.0>`__
------------------------------------------------------------------------------------------

Mar 21, 2017
^^^^^^^^^^^^

-  Split the repository into multiple packages that are managed using
   the lerna build tool.
   https://github.com/jupyterlab/jupyterlab/issues/1773
-  Added restoration of main area layout on refresh.
   https://github.com/jupyterlab/jupyterlab/pull/1880
-  Numerous bug fixes and style updates.

`v0.17.0 <https://github.com/jupyterlab/jupyterlab/releases/tag/v0.17.0>`__
------------------------------------------------------------------------------------

Mar 01, 2017
^^^^^^^^^^^^

-  Upgrade to new ``@phosphor`` packages - brings a new Command Palette
   interaction that should be more intuitive, and restores the ability
   to drag to dock panel edges
   https://github.com/jupyterlab/jupyterlab/pull/1762.
-  Refactor of ``RenderMime`` and associated renders to use live models.
   See https://github.com/jupyterlab/jupyterlab/pull/1709 and
   https://github.com/jupyterlab/jupyterlab/issues/1763.
-  Improvements and bug fixes for the completer widget:
   https://github.com/jupyterlab/jupyterlab/pull/1778
-  Upgrade CodeMirror to 5.23:
   https://github.com/jupyterlab/jupyterlab/pull/1764
-  Numerous style updates and bug fixes.

`v0.16.0 <https://github.com/jupyterlab/jupyterlab/releases/tag/v0.16.0>`__
----------------------------------------------------------------------------------------

Feb 09, 2017
^^^^^^^^^^^^

-  Adds a Cell Tools sidebar that allows you to edit notebook cell
   metadata.
   `#1586 <https://github.com/jupyterlab/jupyterlab/issues/1586>`__.
-  Adds keyboard shortcuts to switch between tabs (Cmd/Ctrl LeftArrow
   and Cmd/Ctrl RightArrow).
   `#1647 <https://github.com/jupyterlab/jupyterlab/issues/1647>`__
-  Upgrades to xterm.js 2.3.
   `#1664 <https://github.com/jupyterlab/jupyterlab/issues/1664>`__
-  Fixes a bug in application config, but lab extensions will need to be
   re-enabled.
   `#1607 <https://github.com/jupyterlab/jupyterlab/issues/1607>`__
-  Numerous other bug fixes and style improvements.
