# JupyterLab Changelog

## [Beta 2 (v0.32.0)](https://github.com/jupyterlab/jupyterlab/releases/tag/v0.32.0)
#### Apr 16, 2018
This is the second in the JupyterLab Beta series of releases. It contains many enhancements, bugfixes, and  refinements, including:

* Better handling of a corrupted or invalid state database ([#3619](https://github.com/jupyterlab/jupyterlab/issues/3619), [#3622](https://github.com/jupyterlab/jupyterlab/issues/3622), [#3687](https://github.com/jupyterlab/jupyterlab/issues/3687), [#4114](https://github.com/jupyterlab/jupyterlab/issues/4114)).
* Fixing file dirty status indicator ([#3652](https://github.com/jupyterlab/jupyterlab/issues/3652)).
* New option for whether to autosave documents ([#3734](https://github.com/jupyterlab/jupyterlab/issues/3734)).
* More commands in the notebook context menu ([#3770](https://github.com/jupyterlab/jupyterlab/issues/3770), [#3909](https://github.com/jupyterlab/jupyterlab/issues/3909))
* Defensively checking for completion metadata from kernels ([#3888](https://github.com/jupyterlab/jupyterlab/issues/3888))
* New "Shutdown all" button  in the Running panel ([#3764](https://github.com/jupyterlab/jupyterlab/issues/3764))
* Performance improvements wherein non-focused documents poll the server less ([#3931](https://github.com/jupyterlab/jupyterlab/issues/3931))
* Changing the keyboard shortcut for singled-document-mode to something less easy to trigger ([#3889](https://github.com/jupyterlab/jupyterlab/issues/3889))
* Performance improvements for rendering text streams, especially around progress bars ([#4045](https://github.com/jupyterlab/jupyterlab/issues/4045)).
* Canceling a "Restart Kernel" now functions correctly ([#3703](https://github.com/jupyterlab/jupyterlab/issues/3703)).
* Defer loading file contents until after the application has been restored ([#4087](https://github.com/jupyterlab/jupyterlab/issues/4087)).
* Ability to rotate, flip, and invert images in the image viewer ([#4000](https://github.com/jupyterlab/jupyterlab/issues/4000))
* Major performance improvements for large CSV viewing ([#3997](https://github.com/jupyterlab/jupyterlab/issues/3997)).
* Always show the context menu in the file browser, even for an empty directory ([#4264](https://github.com/jupyterlab/jupyterlab/issues/4264)).
* Handle asynchronous comm messages in the services library more correctly (Note: this means `@jupyterlab/services` is now at version 2.0!) ([[#4115](https://github.com/jupyterlab/jupyterlab/issues/4115)](https://github.com/jupyterlab/jupyterlab/pull/4115)).
* Display the kernel banner in the console when a kernel is restarted to mark the restart ([[#3663](https://github.com/jupyterlab/jupyterlab/issues/3663)](https://github.com/jupyterlab/jupyterlab/pull/3663)).
* Many tweaks to the UI, as well as better error handling.


## [Beta 1 (v0.31.0)](https://github.com/jupyterlab/jupyterlab/releases/tag/v0.31.0)
#### Jan 11, 2018
- Add a `/tree` handler and `Copy Shareable Link ` to file listing right click menu: https://github.com/jupyterlab/jupyterlab/pull/3396
- Experimental support for saved workspaces: [#3490](https://github.com/jupyterlab/jupyterlab/issues/3490), [#3586](https://github.com/jupyterlab/jupyterlab/issues/3586)
- Added types information to the completer: [#3508](https://github.com/jupyterlab/jupyterlab/issues/3508)
- More improvements to the top level menus: https://github.com/jupyterlab/jupyterlab/pull/3344
- Editor settings for notebook cells: https://github.com/jupyterlab/jupyterlab/pull/3441
- Simplification of theme extensions: https://github.com/jupyterlab/jupyterlab/pull/3423
- New CSS variable naming scheme: https://github.com/jupyterlab/jupyterlab/pull/3403
- Improvements to cell selection and dragging: https://github.com/jupyterlab/jupyterlab/pull/3414
- Style and typography improvements: https://github.com/jupyterlab/jupyterlab/pull/3468 https://github.com/jupyterlab/jupyterlab/pull/3457 https://github.com/jupyterlab/jupyterlab/pull/3445 https://github.com/jupyterlab/jupyterlab/pull/3431 https://github.com/jupyterlab/jupyterlab/pull/3428 https://github.com/jupyterlab/jupyterlab/pull/3408 https://github.com/jupyterlab/jupyterlab/pull/3418


## [v0.30.0](https://github.com/jupyterlab/jupyterlab/releases/tag/v0.30.0)
#### Dec 05, 2017
- Semantic menus: https://github.com/jupyterlab/jupyterlab/pull/3182
- Settings editor now allows comments and provides setting validation: https://github.com/jupyterlab/jupyterlab/pull/3167
- Switch to Yarn as the package manager: https://github.com/jupyterlab/jupyterlab/pull/3182
- Support for carriage return in outputs: [#2761](https://github.com/jupyterlab/jupyterlab/issues/2761)
- Upgrade to TypeScript 2.6: https://github.com/jupyterlab/jupyterlab/pull/3288
- Cleanup of the build, packaging, and extension systems.  `jupyter labextension install` is now the recommended way to install a local directory.  Local directories are considered linked to the application. cf https://github.com/jupyterlab/jupyterlab/pull/3182
- `--core-mode` and `--dev-mode` are now semantically different.  `--core-mode` is a version of JupyterLab using released JavaScript packages and is what we ship in the Python package.  `--dev-mode` is for unreleased JavaScript and shows the red banner at the top of the page.  https://github.com/jupyterlab/jupyterlab/pull/3270


## [v0.29.2](https://github.com/jupyterlab/jupyterlab/releases/tag/v0.29.2)
#### Nov 17, 2017
Bug fix for file browser right click handling.  https://github.com/jupyterlab/jupyterlab/issues/3019

## [v0.29.0](https://github.com/jupyterlab/jupyterlab/releases/tag/v0.29.0)
#### Nov 09, 2017
- Create new view of cell in cell context menu.  [#3159](https://github.com/jupyterlab/jupyterlab/issues/3159) 
- New Renderers for VDOM and JSON mime types and files.  [#3157](https://github.com/jupyterlab/jupyterlab/issues/3157) 
- Switch to React for our VDOM implementation.  Affects the `VDomRenderer` class.  [#3133](https://github.com/jupyterlab/jupyterlab/issues/3133)
- Standalone Cell Example. [#3155](https://github.com/jupyterlab/jupyterlab/issues/3155)

## [v0.28.0](https://github.com/jupyterlab/jupyterlab/releases/tag/v0.28.0)
#### Oct 16, 2017
This release generally focuses on developer and extension author enhancements and general bug fixes.

- Plugin id and schema file conventions change.  https://github.com/jupyterlab/jupyterlab/pull/2936.
- Theme authoring conventions change. [#3061](https://github.com/jupyterlab/jupyterlab/issues/3061)
- Enhancements to enabling and disabling of extensions.  [#3078](https://github.com/jupyterlab/jupyterlab/issues/3078) 
- Mime extensions API change (`name` -> `id` and new naming convention).  [#3078](https://github.com/jupyterlab/jupyterlab/issues/3078)
- Added a `jupyter lab --watch` mode for extension authors.  [#3077](https://github.com/jupyterlab/jupyterlab/issues/3077)
- New comprehensive extension authoring tutorial.  [#2921](https://github.com/jupyterlab/jupyterlab/issues/2921)
- Added the ability to use an alternate LaTeX renderer.  [#2974](https://github.com/jupyterlab/jupyterlab/issues/2974)
- Numerous bug fixes and style enhancements.

## [v0.27.0](https://github.com/jupyterlab/jupyterlab/releases/tag/v0.27.0)
#### Aug 23, 2017
- Added support for dynamic theme loading.  https://github.com/jupyterlab/jupyterlab/pull/2759
- Added an application splash screen.  https://github.com/jupyterlab/jupyterlab/pull/2899
- Enhancements to the settings editor.   https://github.com/jupyterlab/jupyterlab/pull/2784
- Added a PDF viewer.  [#2867](https://github.com/jupyterlab/jupyterlab/issues/2867)
- Numerous bug fixes and style improvements.


## [v0.26.0](https://github.com/jupyterlab/jupyterlab/releases/tag/v0.26.0)
#### Jul 21, 2017
- Implemented server side handling of users settings: https://github.com/jupyterlab/jupyterlab/pull/2585
- Revamped the handling of file types in the application - affects document and mime renderers: https://github.com/jupyterlab/jupyterlab/pull/2701
- Updated dialog API - uses virtual DOM instead of raw DOM nodes and better use of the widget lifecycle: https://github.com/jupyterlab/jupyterlab/pull/2661

## [v0.25.0](https://github.com/jupyterlab/jupyterlab/releases/tag/v0.25.0)
#### Jul 07, 2017
- Added a new extension type for mime renderers, with the `vega2-extension` as a built-in example.  Also overhauled the rendermime interfaces.
https://github.com/jupyterlab/jupyterlab/pull/2488
https://github.com/jupyterlab/jupyterlab/pull/2555
https://github.com/jupyterlab/jupyterlab/pull/2595
- Finished JSON-schema based settings system, using client-side storage for now.
https://github.com/jupyterlab/jupyterlab/pull/2411
- Overhauled the launcher design.
https://github.com/jupyterlab/jupyterlab/pull/2506
https://github.com/jupyterlab/jupyterlab/pull/2580
- Numerous bug fixes and style updates.

## [v0.24.0](https://github.com/jupyterlab/jupyterlab/releases/tag/v0.24.0)
#### Jun 16, 2017
- Overhaul of the launcher. [#2380](https://github.com/jupyterlab/jupyterlab/issues/2380)
- Initial implementation of client-side settings system. [#2157](https://github.com/jupyterlab/jupyterlab/issues/2157)
- Updatable outputs. [#2439](https://github.com/jupyterlab/jupyterlab/issues/2439) 
- Use new Phosphor Datagrid for CSV viewer. [#2433](https://github.com/jupyterlab/jupyterlab/issues/2433) 
- Added ability to enable/disable extensions without rebuilding.   [#2409](https://github.com/jupyterlab/jupyterlab/issues/2409)
- Added language and tab settings for the file viewer. [#2406](https://github.com/jupyterlab/jupyterlab/issues/2406) 
- Improvements to real time collaboration experience.  [#2387](https://github.com/jupyterlab/jupyterlab/issues/2387)  [#2333](https://github.com/jupyterlab/jupyterlab/issues/2333)
- Compatibility checking for extensions. [#2410](https://github.com/jupyterlab/jupyterlab/issues/2410)
- Numerous bug fixes and style improvements.

## [v0.23.0](https://github.com/jupyterlab/jupyterlab/releases/tag/v0.23.0)
#### Jun 02, 2017
- Chat box feature. https://github.com/jupyterlab/jupyterlab/pull/2118
- Collaborative cursors. https://github.com/jupyterlab/jupyterlab/pull/2139
- Added concept of Drive to ContentsManager. https://github.com/jupyterlab/jupyterlab/pull/2248
- Refactored to enable switching the theme.  https://github.com/jupyterlab/jupyterlab/pull/2283
- Clean up the APIs around kernel execution. https://github.com/jupyterlab/jupyterlab/pull/2266
- Various bug fixes and style improvements.

## [0.22.0 (v0.22.0)](https://github.com/jupyterlab/jupyterlab/releases/tag/v0.22.0)
#### May 18, 2017
- Export To... for notebooks. https://github.com/jupyterlab/jupyterlab/pull/2200
- Change kernel by clicking on the kernel name in the notebook.  https://github.com/jupyterlab/jupyterlab/pull/2195
- Improved handling of running code in text editors.  https://github.com/jupyterlab/jupyterlab/pull/2191
- Can select file in file browser by typing: https://github.com/jupyterlab/jupyterlab/pull/2190
- Ability to open a console for a notebook. https://github.com/jupyterlab/jupyterlab/pull/2189
- Upgrade to Phosphor 1.2 with Command Palette fuzzy matching improvements.  [#1182](https://github.com/jupyterlab/jupyterlab/issues/1182)
- Rename of widgets that had `Widget` in the name and associated package names.  https://github.com/jupyterlab/jupyterlab/pull/2177
- New `jupyter labhub` command to launch JupyterLab on JupyterHub: https://github.com/jupyterlab/jupyterlab/pull/2222
- Removed the `utils` from `@jupyterlab/services` in favor of `PageConfig` and `ServerConnection`.  https://github.com/jupyterlab/jupyterlab/pull/2173 https://github.com/jupyterlab/jupyterlab/pull/2185
- Cleanup, bug fixes, and style updates.

## [0.20.0 (v0.20.0)](https://github.com/jupyterlab/jupyterlab/releases/tag/v0.20.0)
#### Apr 21, 2017
Release Notes:

- Overhaul of extension handling, see updated docs for [users](https://github.com/jupyterlab/jupyterlab/blob/dd83a2e4be8bf23c610c163afe4b480215514764/tutorial/extensions_user.md) and [developers](https://github.com/jupyterlab/jupyterlab/blob/dd83a2e4be8bf23c610c163afe4b480215514764/tutorial/extensions_dev.md).  https://github.com/jupyterlab/jupyterlab/pull/2023
- Added single document mode and a `Tabs` sidebar.  https://github.com/jupyterlab/jupyterlab/pull/2037
- More work toward real time collaboration - implemented a model database interface that can be in-memory by real time backends.  https://github.com/jupyterlab/jupyterlab/pull/2039

Numerous bug fixes and improvements.

## [Release 0.19 (v0.19.0)](https://github.com/jupyterlab/jupyterlab/releases/tag/v0.19.0)
#### Apr 04, 2017
Mainly backend-focused release with compatibility with Phosphor 1.0 and a big refactor of session handling (the ClientSession class) that provides a simpler object for classes like notebooks, consoles, inspectors, etc. to use to communicate with the API.  Also includes improvements to the development workflow of JupyterLab itself after the big split.

https://github.com/jupyterlab/jupyterlab/pull/1984
https://github.com/jupyterlab/jupyterlab/pull/1927

## [Version 0.18 (v0.18.0)](https://github.com/jupyterlab/jupyterlab/releases/tag/v0.18.0)
#### Mar 21, 2017
- Split the repository into multiple packages that are managed using the
lerna build tool. https://github.com/jupyterlab/jupyterlab/issues/1773
- Added restoration of main area layout on refresh.  https://github.com/jupyterlab/jupyterlab/pull/1880
- Numerous bug fixes and style updates.

## [0.17.0 (v0.17.0)](https://github.com/jupyterlab/jupyterlab/releases/tag/v0.17.0)
#### Mar 01, 2017
- Upgrade to new `@phosphor` packages - brings a new Command Palette interaction that should be more intuitive, and restores the ability to drag to dock panel edges  https://github.com/jupyterlab/jupyterlab/pull/1762.
- Refactor of `RenderMime` and associated renders to use live models.  See https://github.com/jupyterlab/jupyterlab/pull/1709 and https://github.com/jupyterlab/jupyterlab/issues/1763.
- Improvements and bug fixes for the completer widget: https://github.com/jupyterlab/jupyterlab/pull/1778
- Upgrade CodeMirror to 5.23: https://github.com/jupyterlab/jupyterlab/pull/1764
- Numerous style updates and bug fixes.


## [Version 16 (v0.16.0)](https://github.com/jupyterlab/jupyterlab/releases/tag/v0.16.0)
#### Feb 09, 2017
- Adds a Cell Tools sidebar that allows you to edit notebook cell metadata.  [#1586](https://github.com/jupyterlab/jupyterlab/issues/1586).
- Adds keyboard shortcuts to switch between tabs (Cmd/Ctrl LeftArrow and Cmd/Ctrl RightArrow).  [#1647](https://github.com/jupyterlab/jupyterlab/issues/1647)
- Upgrades to xterm.js 2.3. [#1664](https://github.com/jupyterlab/jupyterlab/issues/1664)
- Fixes a bug in application config, but lab extensions will need to be re-enabled.  [#1607](https://github.com/jupyterlab/jupyterlab/issues/1607)
- Numerous other bug fixes and style improvements.


