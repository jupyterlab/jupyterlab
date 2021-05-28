---
github_url: 'https://github.com/jupyterlab/jupyterlab/blob/master/CHANGELOG.md'
---

# JupyterLab Changelog

## v3.0

See the [JupyterLab
3.0](https://github.com/jupyterlab/jupyterlab/milestone/48?closed=1)
milestone on GitHub for the full list of pull requests and issues
closed.

### v3.0.16

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.0.15...2badf555436063962451599a81b38b80f601a589))

### Maintenance and upkeep improvements

- Fix Shutdown Error in Test App [#10240](https://github.com/jupyterlab/jupyterlab/pull/10240) ([@afshin](https://github.com/afshin))
- Update to `codemirror~=5.58.0` [#10262](https://github.com/jupyterlab/jupyterlab/pull/10262) ([@jtpio](https://github.com/jtpio))

### v3.0.15

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.0.14...e1cda8e2fb69a6a01ec261ce13413acd306df4cb))

### Enhancements made

- Added support for namespace packages in labextensions. [#10150](https://github.com/jupyterlab/jupyterlab/pull/10150) [@mellesies](https://github.com/mellesies)

### Maintenance and upkeep improvements

- [3.0.x] Remove Dependency on Jupyter Packaging [#10218](https://github.com/jupyterlab/jupyterlab/pull/10218) ([@jtpio](https://github.com/jtpio))

### Documentation improvements

- [3.0.x] Fix changelong entries for 3.0.13 [#10087](https://github.com/jupyterlab/jupyterlab/pull/10087) ([@blink1073](https://github.com/blink1073))
- chore: update extension_tutorial [#10026](https://github.com/jupyterlab/jupyterlab/pull/10026) [@0618](https://github.com/0618)

### Other merged PRs

- Workaround Chromium issue with iframe reload/href [#10185](https://github.com/jupyterlab/jupyterlab/pull/10185) [@krassowski](https://github.com/krassowski)
- Update to `sanitize-html~=2.3.3` [#10220](https://github.com/jupyterlab/jupyterlab/pull/10220) [@jtpio](https://github.com/jtpio)
- Update to `url-parse~=1.5.1` [#10219](https://github.com/jupyterlab/jupyterlab/pull/10219) [@jtpio](https://github.com/jtpio)
- Update packaging commands in the extension tutorial [#10104](https://github.com/jupyterlab/jupyterlab/pull/10104) [@jtpio](https://github.com/jtpio)
- Mention mamba as a means to install JupyterLab [#10093](https://github.com/jupyterlab/jupyterlab/pull/10093) [@SylvainCorlay](https://github.com/SylvainCorlay)

### v3.0.14

- Clean up browser check [#10080](https://github.com/jupyterlab/jupyterlab/pull/10080)
- Loosen pin on jupyter-packaging [#9998](https://github.com/jupyterlab/jupyterlab/pull/9998)

### v3.0.13

- Add cell id per notebook format 4.5 ([#10018](https://github.com/jupyterlab/jupyterlab/pull/10018))
- Fix label for "Create Console for Editor" ([#9794](https://github.com/jupyterlab/jupyterlab/pull/9794))
- Use blobs to set the svg source of an image in the image viewer ([#10029](https://github.com/jupyterlab/jupyterlab/pull/10029))
- \[Fix\] Copy shareable link command ([#10021](https://github.com/jupyterlab/jupyterlab/pull/10021))
- Clarify where the overrides.json file should be in the docs ([#9996](https://github.com/jupyterlab/jupyterlab/pull/9996))
- Do not make unnecessary npm registry requests ([#9974](https://github.com/jupyterlab/jupyterlab/pull/9974))
- Fix escaping of urls and paths ([#9978](https://github.com/jupyterlab/jupyterlab/pull/9978))

### v3.0.12

- Fix support for Safari by changing regular expression for Table of Contents ([#9962](https://github.com/jupyterlab/jupyterlab/pull/9962))
- Fix DocRegistry FileType pattern matching ([#9958](https://github.com/jupyterlab/jupyterlab/pull/9958))

### v3.0.11

- Fix: use process/browser module as real polyfill ([#9636](https://github.com/jupyterlab/jupyterlab/pull/9636))
- Fix Table of Contents extension markdown bug for HTML comments ([#9938](https://github.com/jupyterlab/jupyterlab/pull/9938))
- Make Table of Contents extension not rewrite all notebook headers ([#9932](https://github.com/jupyterlab/jupyterlab/pull/9932))

### v3.0.10

- Fix watch mode for external extensions
  ([#9915](https://github.com/jupyterlab/jupyterlab/pull/9915))
- Bug fix for extension watch mode behavior
  ([#9889](https://github.com/jupyterlab/jupyterlab/pull/9889),
  [#9861](https://github.com/jupyterlab/jupyterlab/issues/9861))

### v3.0.9

- Remove the previous `file_to_run` logic.
  ([#9848](https://github.com/jupyterlab/jupyterlab/pull/9848))
- Enable Caching in Production Minimized Mode.
  ([#9834](https://github.com/jupyterlab/jupyterlab/pull/9834))
- Remove the auto-switch to “mobile” mode, and behavior switches associated
  with mobile mode.
  ([#9832](https://github.com/jupyterlab/jupyterlab/pull/9832))
- Fix the display of breakpoints on restore.
  ([#9828](https://github.com/jupyterlab/jupyterlab/pull/9828))
- Update CI script timeouts.
  ([#9825](https://github.com/jupyterlab/jupyterlab/pull/9825))
- Fix mimerender test example and test in CI.
  ([#9820](https://github.com/jupyterlab/jupyterlab/pull/9820))

### v3.0.8

- `@jupyterlab/rendermime`: upgraded `marked` dep past
  vulnerability.
  ([#9809](https://github.com/jupyterlab/jupyterlab/pull/9809))
- Fix Services Tests.
  ([#9806](https://github.com/jupyterlab/jupyterlab/pull/9806))
- Enable jupyter labextension build/watch to work for custom
  jupyterlab distributions.
  ([#9697](https://github.com/jupyterlab/jupyterlab/pull/9697))
- Add hash to webpack requests to enable caching.
  ([#9776](https://github.com/jupyterlab/jupyterlab/pull/9776))
- Update MANIFEST.in to include package_data files.
  ([#9780](https://github.com/jupyterlab/jupyterlab/pull/9780))
- Correct synchronization of tags between metadata and tags widget.
  ([#9773](https://github.com/jupyterlab/jupyterlab/pull/9773))
- Fix use of hyphen in module name.
  ([#9655](https://github.com/jupyterlab/jupyterlab/pull/9655))
- Add missing default_url fields to examples.
  ([#9731](https://github.com/jupyterlab/jupyterlab/pull/9731),
  [#9737](https://github.com/jupyterlab/jupyterlab/pull/9737))

### v3.0.7

- Add link for prebuilt extensions too.
  ([#9702](https://github.com/jupyterlab/jupyterlab/pull/9702))
- Remove outdated note on ipywidgets.
  ([#9707](https://github.com/jupyterlab/jupyterlab/pull/9707))
- Fix debug flag handling in build command.
  ([#9715](https://github.com/jupyterlab/jupyterlab/pull/9715))
- Update notebook toolbar example docs.
  ([#9705](https://github.com/jupyterlab/jupyterlab/pull/9705))
- Use `Path.resolve()` to get canonical case-sensitive path names.
  ([#9709](https://github.com/jupyterlab/jupyterlab/pull/9709))

### v3.0.6

- Listen for `'restarting'` instead of `'autorestarting'` from server.
  ([#9674](https://github.com/jupyterlab/jupyterlab/pull/9674))
- Use `jupyterhub make_singleuser_app` mixin when available.
  ([#9681](https://github.com/jupyterlab/jupyterlab/pull/9681))
- Remove jest version constrain.
  ([#9632](https://github.com/jupyterlab/jupyterlab/pull/9632))
- Disable large uploads for notebook server \< 5.1.
  ([#9628](https://github.com/jupyterlab/jupyterlab/pull/9628))
- Ignore timeout errors when preloading settings.
  ([#9629](https://github.com/jupyterlab/jupyterlab/pull/9629))
- Customize template branch when upgrading extension.
  ([#9630](https://github.com/jupyterlab/jupyterlab/pull/9630))
- Renamed variable that clashed with a module.
  ([#9641](https://github.com/jupyterlab/jupyterlab/pull/9641))
- Allow for lazily retrieved documentation (with a getter).
  ([#9643](https://github.com/jupyterlab/jupyterlab/pull/9643))
- Upgrade `html-webpack-plugin` to support webpack 5.
  ([#9651](https://github.com/jupyterlab/jupyterlab/pull/9651))
- Fix viewing of PDF files in Safari.
  ([#9656](https://github.com/jupyterlab/jupyterlab/pull/9656))
- Add ToC entries for all headers in markdown cells.
  ([#9358](https://github.com/jupyterlab/jupyterlab/pull/9358))
- Revert creating a new browser tab for a new launcher when in simple
  interface.
  ([#9664](https://github.com/jupyterlab/jupyterlab/pull/9664))
- Add `xeus-robot` to the debugger documentation.
  ([#9661](https://github.com/jupyterlab/jupyterlab/pull/9661))

### v3.0.5

- Enable large file uploads.
  ([#9616](https://github.com/jupyterlab/jupyterlab/pull/9616))
- Fix display of `??` help on Windows.
  ([#9617](https://github.com/jupyterlab/jupyterlab/pull/9617))
- Update app and federated examples.
  ([#9586](https://github.com/jupyterlab/jupyterlab/pull/9586))

### v3.0.4

- Do not use `??` in plain js, as it is too new.
  ([#9606](https://github.com/jupyterlab/jupyterlab/pull/9606))
- Fix handling of multiple notebooks for the debugger.
  ([#9598](https://github.com/jupyterlab/jupyterlab/pull/9598))
- Refactor labhub + CI.
  ([#9604](https://github.com/jupyterlab/jupyterlab/pull/9604))

### v3.0.3

- Move open_browser to the top level configs of classes.
  ([#9580](https://github.com/jupyterlab/jupyterlab/pull/9580))

### v3.0.2

- Manage kernel message queueing better to prevent out-of-order
  execution.
  ([#9571](https://github.com/jupyterlab/jupyterlab/pull/9571))
- Fix breadcrumb links.
  ([#9572](https://github.com/jupyterlab/jupyterlab/pull/9572))
- Fix integration with JupyterHub.
  ([#9568](https://github.com/jupyterlab/jupyterlab/pull/9568))
- Fix parsing of empty CSV files.
  ([#9557](https://github.com/jupyterlab/jupyterlab/pull/9557))
- Use tree/table buttons to display debugger variables view mode.
  ([#9502](https://github.com/jupyterlab/jupyterlab/pull/9502))
- Update tutorial for final jlab 3 release.
  ([#9562](https://github.com/jupyterlab/jupyterlab/pull/9562))
- Fix upgrade_extension.py.
  ([#9551](https://github.com/jupyterlab/jupyterlab/pull/9551),
  [#9550](https://github.com/jupyterlab/jupyterlab/pull/9550))
- Update the Binder link in the README to point to a 3.0 Binder.
  ([#9549](https://github.com/jupyterlab/jupyterlab/pull/9549))

### v3.0.1

- Fixes error when applying `jupyterlab.upgrade_extension` on Windows.
  ([#9546](https://github.com/jupyterlab/jupyterlab/pull/9509))
- Improve upgrade script to add style settings.
  ([#9515](https://github.com/jupyterlab/jupyterlab/pull/9515))
- Fixed incorrect link to GitHub milestone.
  ([#9516](https://github.com/jupyterlab/jupyterlab/pull/9516))
- Split contribution guidelines into web-based and local instructions.
  ([#9540](https://github.com/jupyterlab/jupyterlab/pull/9540))
- Remove `--checkout 3.0` in the extension tutorial.
  ([#9545](https://github.com/jupyterlab/jupyterlab/pull/9545))
- Docs updates for 3.0.
  ([#9546](https://github.com/jupyterlab/jupyterlab/pull/9546))
- Fix usage test.
  ([#9547](https://github.com/jupyterlab/jupyterlab/pull/9547))
- Remove visible 1px border for terminal.
  ([#9548](https://github.com/jupyterlab/jupyterlab/pull/9548))

### v3.0.0

### User-facing changes

#### Extensions can be installed without building JupyterLab with NodeJS

In JupyterLab 3.0, a new recommended way of distributing and installing
extensions as Python pip or conda packages is available. Installing such
extensions does not require rebuilding JupyterLab and does not require
having NodeJS installed. The previous way of distributing extensions as
npm packages requiring rebuilding JupyterLab is still available as well.
See the
[documentation](https://jupyterlab.readthedocs.io/en/latest/user/extensions.html#extensions)
for more details.

#### The JupyterLab interface supports multiple languages

JupyterLab now provides the ability to set the display language of the
user interface. See the
[documentation](https://jupyterlab.readthedocs.io/en/latest/user/language.html)
for more details.

#### A new visual debugger

JupyterLab now ships with a debugger front-end by default, available for
kernels that support the new debugging protocol. See the
[documentation](https://jupyterlab.readthedocs.io/en/latest/user/debugger.html)
for more details.

#### Improvements to Simple Interface mode and Mobile

The Simple Interface mode (previously Single Document Mode) is now more
streamlined. JupyterLab now supports showing the current file in use in
the browser URL bar, similar to the classic Jupyter Notebook.

#### Table of Contents is now in core

The popular Table of Contents extension is now part of core JupyterLab.
This core extension makes it easy to see an outline view of notebooks
and other documents.

#### Visual filter in file browser

The file browser now has a filter input which filters the list of files
using the same fuzzy matching as the command palette.

#### Property inspector moved to right sidebar

The default interface for JupyterLab now has system-wide sidebar panes
on the left side and sidebar panels that interact with a specific
document (such as the debugger or notebook property inspector) on the
right side. As always, you can move panes between the left and right
sidebars (right click on the sidebar icon, or change it in Advanced
Settings).

#### Command Palette

The command palette is now a floating window that appears on top of your
JupyterLab workspace. This enables users to quickly invoke a command
while keeping the sidebar closed or switching sidebar panels. The
command palette can be put back into the sidebar by adjusting the
default in Advanced Settings.

#### Jupyter Server

JupyterLab 3.0 now depends on [Jupyter
Server](https://jupyter-server.readthedocs.io), which is a new Jupyter
project based on the server portion of the classic Notebook server. See
the [Migration
Guide](https://jupyter-server.readthedocs.io/en/stable/operators/migrate-from-nbserver.html)
to migrate custom notebook configuration to Jupyter Server.

### For Developers

#### Prebuilt Extensions

Users will typically consume prebuilt extensions, which are Python
packages with static assets built using `JupyterLab`. See the updated
APOD tutorial for the workflow of creating a prebuilt extension from
scratch. For existing extensions, there is a new
`python -m jupyterlab.upgrade_extension` script that can be used to
upgrade extensions. The script will update the relevant dependencies and
add the boilerplate to create the Python package. For extensions that
already contained Python packages (typically server extensions), the
files are not overwritten, and some manual copying of content is
required. See the
[example](https://github.com/jupyterlab/extension-examples/pull/119),
which used this script heavily. There are two highlighted commits that
demonstrate upgrading a server extension. Prebuilt extensions are also
known as federated extensions in the changes below, since they use the
federated module capability in Webpack 5.

- Better handling of extensions that provide both prebuilt and source
  extensions.
  ([#9489](https://github.com/jupyterlab/jupyterlab/pull/9489),
  [#9277](https://github.com/jupyterlab/jupyterlab/issues/9277))
- Document new page config conventions
  ([#9454](https://github.com/jupyterlab/jupyterlab/pull/9454),
  [#9240](https://github.com/jupyterlab/jupyterlab/issues/9240))
- Use stylemodule in prebuilt extensions
  ([#9460](https://github.com/jupyterlab/jupyterlab/pull/9460),
  [#9459](https://github.com/jupyterlab/jupyterlab/issues/9459))
- Update style-loader and mini-css-extract-plugin
  ([#9451](https://github.com/jupyterlab/jupyterlab/pull/9451))
- Use a more explicit stylemodule key for js css imports
  ([#9427](https://github.com/jupyterlab/jupyterlab/pull/9427),
  [#9423](https://github.com/jupyterlab/jupyterlab/issues/9423))
- Ignore source packages when building or loading jupyterlab if there
  is a prebuilt package
  ([#9424](https://github.com/jupyterlab/jupyterlab/pull/9424),
  [#9277](https://github.com/jupyterlab/jupyterlab/issues/9277))
- Include federated extensions in extension manager from the api
  ([#9390](https://github.com/jupyterlab/jupyterlab/pull/9390),
  [#9367](https://github.com/jupyterlab/jupyterlab/issues/9367))
- Handle hyphens and switch to importlib in the develop script
  ([#9471](https://github.com/jupyterlab/jupyterlab/pull/9471))
- Chunk the jupyterlab and lumino modules together when building the
  core application
  ([#9359](https://github.com/jupyterlab/jupyterlab/pull/9359))
- Link to the documentation in the extension manager federated dialog
  ([#9327](https://github.com/jupyterlab/jupyterlab/pull/9327))
- Federated extension script: change package name logic
  ([#9326](https://github.com/jupyterlab/jupyterlab/pull/9326),
  [#9320](https://github.com/jupyterlab/jupyterlab/issues/9320))
- Do not error if requiredversion is not provided.
  ([#9321](https://github.com/jupyterlab/jupyterlab/pull/9321))
- Reinstate extension manager
  ([#9317](https://github.com/jupyterlab/jupyterlab/pull/9317))
- Built-in extensions using federated dependencies
  ([#9310](https://github.com/jupyterlab/jupyterlab/pull/9310))
- Update upgrade script to use labextension for outputdir
  ([#9306](https://github.com/jupyterlab/jupyterlab/pull/9306))
- Require \'package\' instead of \'package/\' so webpack activates
  sharing
  ([#9300](https://github.com/jupyterlab/jupyterlab/pull/9300))
- Enable using federated extensions in dev mode when a flag is set.
  ([#9286](https://github.com/jupyterlab/jupyterlab/pull/9286),
  [#9235](https://github.com/jupyterlab/jupyterlab/issues/9235))
- Update webpack to 5.3.1
  ([#9245](https://github.com/jupyterlab/jupyterlab/pull/9245))
- Adds package installation info to labextension list and uninstall
  output
  ([#9244](https://github.com/jupyterlab/jupyterlab/pull/9244))
- Restructure federated extensions to allow for package manager
  metadata
  ([#9239](https://github.com/jupyterlab/jupyterlab/pull/9239))
- List the dynamic extensions in the extension manager
  ([#9236](https://github.com/jupyterlab/jupyterlab/pull/9236),
  [#8804](https://github.com/jupyterlab/jupyterlab/issues/8804))
- Refuse to uninstall federated extensions.
  ([#9232](https://github.com/jupyterlab/jupyterlab/pull/9232),
  [#9230](https://github.com/jupyterlab/jupyterlab/issues/9230))
- Allow custom webpack config for federated extensions
  ([#9224](https://github.com/jupyterlab/jupyterlab/pull/9224),
  [#9175](https://github.com/jupyterlab/jupyterlab/issues/9175))
- Use the new webpack 5 'auto' publicpath
  ([#9062](https://github.com/jupyterlab/jupyterlab/pull/9062),
  [#9043](https://github.com/jupyterlab/jupyterlab/issues/9043))
- Bump webpack to 5.0rc1
  ([#9091](https://github.com/jupyterlab/jupyterlab/pull/9091))
- Update the upgrade script to not replace dev deps to caret
  ([#9090](https://github.com/jupyterlab/jupyterlab/pull/9090))
- Bump webpack to 5.0rc2
  ([#9103](https://github.com/jupyterlab/jupyterlab/pull/9103))
- Fix watch mode
  ([#9101](https://github.com/jupyterlab/jupyterlab/pull/9101),
  [#9089](https://github.com/jupyterlab/jupyterlab/issues/9089))
- Upgrade to webpack 5
  ([#9148](https://github.com/jupyterlab/jupyterlab/pull/9148))
- Fix watch mode
  ([#9146](https://github.com/jupyterlab/jupyterlab/pull/9146),
  [#9116](https://github.com/jupyterlab/jupyterlab/issues/9116))
- Docs: fix commands to watch
  ([#9163](https://github.com/jupyterlab/jupyterlab/pull/9163))
- Docs: update jupyter lab command in ext dev guide
  ([#9165](https://github.com/jupyterlab/jupyterlab/pull/9165),
  [#](https://github.com/jupyterlab/jupyterlab/pull/9163/issues/))
- Update release test script to also install federated extensions
  ([#9166](https://github.com/jupyterlab/jupyterlab/pull/9166),
  [#8818](https://github.com/jupyterlab/jupyterlab/issues/8818))
- Remove \@types/webpack (shipped with webpack 5)
  ([#9167](https://github.com/jupyterlab/jupyterlab/pull/9167))
- Mention jupyter-packaging and cookiecutter in migration guide
  ([#9199](https://github.com/jupyterlab/jupyterlab/pull/9199))
- Install jupyter_packaging in tutorial
  ([#9190](https://github.com/jupyterlab/jupyterlab/pull/9190),
  [#9174](https://github.com/jupyterlab/jupyterlab/issues/9174))
- Handle sharing of linked packages and locally installed extensions
  ([#9213](https://github.com/jupyterlab/jupyterlab/pull/9213),
  [#9203](https://github.com/jupyterlab/jupyterlab/issues/9203))
- Clean up federated extension install and upgrade
  ([#8974](https://github.com/jupyterlab/jupyterlab/pull/8974))
- Add `--development` and `--source-map` flags for building
  extensions.
  ([#8961](https://github.com/jupyterlab/jupyterlab/pull/8961),
  [#8952](https://github.com/jupyterlab/jupyterlab/issues/8952))
- Add extension upgrade script
  ([#8950](https://github.com/jupyterlab/jupyterlab/pull/8950),
  [#8870](https://github.com/jupyterlab/jupyterlab/issues/8870),
  [#8869](https://github.com/jupyterlab/jupyterlab/issues/8869))
- Improved handling of disabled extensions
  ([#8944](https://github.com/jupyterlab/jupyterlab/pull/8944),
  [#7481](https://github.com/jupyterlab/jupyterlab/issues/7481))
- Add development mode to lab extension build scripts
  ([#8918](https://github.com/jupyterlab/jupyterlab/pull/8918))
- Pull federated extension loading data from the webpack compilation
  ([#8913](https://github.com/jupyterlab/jupyterlab/pull/8913),
  [#8842](https://github.com/jupyterlab/jupyterlab/issues/8842))
- Update labextension build cli to include a parameter for setting the
  webpack publicpath option
  ([#8911](https://github.com/jupyterlab/jupyterlab/pull/8911))
- Update apod extension tutorial
  ([#8905](https://github.com/jupyterlab/jupyterlab/pull/8905),
  [#8859](https://github.com/jupyterlab/jupyterlab/issues/8859))
- Let webpack automatically determine the required version of
  dependencies
  ([#8875](https://github.com/jupyterlab/jupyterlab/pull/8875))
- Fix rebuild of federated extension and add discovery metadata to
  schema
  ([#8874](https://github.com/jupyterlab/jupyterlab/pull/8874))
- Fix build issues with publicpath
  ([#8871](https://github.com/jupyterlab/jupyterlab/pull/8871))
- Split buildutils into buildutils and builder
  ([#8863](https://github.com/jupyterlab/jupyterlab/pull/8863),
  [#8857](https://github.com/jupyterlab/jupyterlab/issues/8857))
- Dynamically set public path in generated extensions according to
  page config
  ([#8861](https://github.com/jupyterlab/jupyterlab/pull/8861),
  [#8827](https://github.com/jupyterlab/jupyterlab/issues/8827))
- Clean up federated extension cli
  ([#8855](https://github.com/jupyterlab/jupyterlab/pull/8855),
  [#46](https://github.com/jupyterlab/jupyterlab-module-federation/issues/46))
- Fix app example.
  ([#8852](https://github.com/jupyterlab/jupyterlab/pull/8852))
- Add lumino dependencies to buildutils so the phosphor webpack
  aliasing works
  ([#8850](https://github.com/jupyterlab/jupyterlab/pull/8850),
  [#8822](https://github.com/jupyterlab/jupyterlab/issues/8822))
- Add another federated example package.
  ([#8847](https://github.com/jupyterlab/jupyterlab/pull/8847),
  [#5](https://github.com/jupyterlab/jupyterlab-module-federation/issues/5))
- Fixes for the federated example
  ([#8846](https://github.com/jupyterlab/jupyterlab/pull/8846))
- Add slash to publicpath
  ([#8845](https://github.com/jupyterlab/jupyterlab/pull/8845))
- Update watch plugin for webpack 5
  ([#8841](https://github.com/jupyterlab/jupyterlab/pull/8841),
  [#8705](https://github.com/jupyterlab/jupyterlab/issues/8705))
- Adding a mime extension to the webpack config
  ([#8825](https://github.com/jupyterlab/jupyterlab/pull/8825))
- Fix labextension build
  ([#8821](https://github.com/jupyterlab/jupyterlab/pull/8821))
- Fix boolean error
  ([#8819](https://github.com/jupyterlab/jupyterlab/pull/8819))
- CI and extension developer cleanup
  ([#8810](https://github.com/jupyterlab/jupyterlab/pull/8810))
- Adding extension to shared modules list
  ([#8808](https://github.com/jupyterlab/jupyterlab/pull/8808))
- Module federation implementation
  ([#8802](https://github.com/jupyterlab/jupyterlab/pull/8802))
- Fix examples and update webpack
  ([#8779](https://github.com/jupyterlab/jupyterlab/pull/8779),
  [#8767](https://github.com/jupyterlab/jupyterlab/issues/8767))
- Add extension building scripts
  ([#8772](https://github.com/jupyterlab/jupyterlab/pull/8772))
- Keep the existing webpack file in staging
  ([#8673](https://github.com/jupyterlab/jupyterlab/pull/8673))
- Workaround for vega build error
  ([#8666](https://github.com/jupyterlab/jupyterlab/pull/8666))
- Add missing polyfill
  ([#8664](https://github.com/jupyterlab/jupyterlab/pull/8664),
  [#8660](https://github.com/jupyterlab/jupyterlab/issues/8660))
- Add url as a polyfill dependency for apputils.
  ([#8659](https://github.com/jupyterlab/jupyterlab/pull/8659),
  [#8657](https://github.com/jupyterlab/jupyterlab/issues/8657))
- Update to webpack 5b21
  ([#8651](https://github.com/jupyterlab/jupyterlab/pull/8651))
- Fix examples and break into separate build
  ([#8647](https://github.com/jupyterlab/jupyterlab/pull/8647),
  [#8646](https://github.com/jupyterlab/jupyterlab/issues/8646))
- Add cur extension for url-loader
  ([#8634](https://github.com/jupyterlab/jupyterlab/pull/8634))
- Experiment with module federation
  ([#8385](https://github.com/jupyterlab/jupyterlab/pull/8385))

#### Jupyter Server

JupyterLab 3.0 uses Jupyter Server instead of the classic Notebook
server. Existing server extensions will be shimmed, but it is advised to
update extensions to use
[jupyter_server](https://github.com/jupyter/jupyter_server).

- Update server(s), nbclassic, pytest fixtures
  ([#9478](https://github.com/jupyterlab/jupyterlab/pull/9478),
  [#9473](https://github.com/jupyterlab/jupyterlab/issues/9473))
- Add jupyter_core as a dependency
  ([#9251](https://github.com/jupyterlab/jupyterlab/pull/9251))
- Put exposeappinbrowser and quitbutton values back in page config
  ([#9262](https://github.com/jupyterlab/jupyterlab/pull/9262))
- Update favicon handling
  ([#9145](https://github.com/jupyterlab/jupyterlab/pull/9145),
  [#9138](https://github.com/jupyterlab/jupyterlab/issues/9138))
- Enable JupyterLab to run as an old notebook server extension
  ([#8956](https://github.com/jupyterlab/jupyterlab/pull/8956),
  [#8943](https://github.com/jupyterlab/jupyterlab/issues/8943))
- Fixed `static_url_prefix`, added classic notebook flags and aliases,
  and bumped `jupyterlab_server` dependency
  ([#8910](https://github.com/jupyterlab/jupyterlab/pull/8910))
- Use favicons provided by `jupyter_server`
  ([#8898](https://github.com/jupyterlab/jupyterlab/pull/8898),
  [#8794](https://github.com/jupyterlab/jupyterlab/issues/8794))
- Load `app_version` next to running on jupyter_server
  ([#8889](https://github.com/jupyterlab/jupyterlab/pull/8889),
  [#8812](https://github.com/jupyterlab/jupyterlab/issues/8812))
- Reinstate the labhubapp
  ([#8806](https://github.com/jupyterlab/jupyterlab/pull/8806),
  [#8704](https://github.com/jupyterlab/jupyterlab/issues/8704))
- Jupyterlab as server extension
  ([#7416](https://github.com/jupyterlab/jupyterlab/pull/7416))

#### Internationalization

The JupyterLab UI now supports translation.

- Cleanup tsconfig for the translation extension
  ([#9357](https://github.com/jupyterlab/jupyterlab/pull/9357))
- Add options to add prefix to strings
  ([#8946](https://github.com/jupyterlab/jupyterlab/pull/8946))
- Add a standalone translation manager to be used outside of plugins
  ([#8945](https://github.com/jupyterlab/jupyterlab/pull/8945))
- Add missing string fixes
  ([#8888](https://github.com/jupyterlab/jupyterlab/pull/8888))
- Add crowdin badge
  ([#8823](https://github.com/jupyterlab/jupyterlab/pull/8823))
- Change `optionsmap` to a an array of tuples to be able to localize
  the options
  ([#8820](https://github.com/jupyterlab/jupyterlab/pull/8820))
- Localize strings in jlab
  ([#8800](https://github.com/jupyterlab/jupyterlab/pull/8800))
- Add translation package
  ([#8681](https://github.com/jupyterlab/jupyterlab/pull/8681))

#### Visual Debugger

- Debugger-sidebar
  ([#9452](https://github.com/jupyterlab/jupyterlab/pull/9452))
- Handle multiple scopes in the debugger variables viewer
  ([#9346](https://github.com/jupyterlab/jupyterlab/pull/9346))
- Remove the ptvsd dependency from the debugger user docs
  ([#9344](https://github.com/jupyterlab/jupyterlab/pull/9344))
- Throws an error if the kernel cannot start the debugger
  ([#9426](https://github.com/jupyterlab/jupyterlab/pull/9426))
- Replace switch in debugger
  ([#9432](https://github.com/jupyterlab/jupyterlab/pull/9432),
  [#9354](https://github.com/jupyterlab/jupyterlab/issues/9354))
- Sets terminatedebuggee to false
  ([#9362](https://github.com/jupyterlab/jupyterlab/pull/9362))
- Add missing return signatures in debugger sidebar
  ([#9088](https://github.com/jupyterlab/jupyterlab/pull/9088))
- Fix invisible breakpoint in debugger
  ([#8908](https://github.com/jupyterlab/jupyterlab/pull/8908))
- Port `jupyterlab/debugger` PR \#527 to JupyterLab
  ([#8878](https://github.com/jupyterlab/jupyterlab/pull/8878))
- Add jupyterlab debugger to core
  ([#8747](https://github.com/jupyterlab/jupyterlab/pull/8747),
  [#75](https://github.com/jupyterlab/team-compass/issues/75))

#### Table of Contents

- Update toc ui
  ([#9275](https://github.com/jupyterlab/jupyterlab/pull/9275))
- Add tests for the toc
  ([#8757](https://github.com/jupyterlab/jupyterlab/pull/8757),
  [#8558](https://github.com/jupyterlab/jupyterlab/issues/8558))
- Change toc to use labicon
  ([#8692](https://github.com/jupyterlab/jupyterlab/pull/8692),
  [#8557](https://github.com/jupyterlab/jupyterlab/issues/8557))
- Switch from using settings registry to a signal for notebook
  collapsing behavior in toc
  ([#8601](https://github.com/jupyterlab/jupyterlab/pull/8601))
- Remove `husky` dependencies from `toc` and `toc-extension`
  ([#8571](https://github.com/jupyterlab/jupyterlab/pull/8571))
- Merge toc extension into core
  ([#8538](https://github.com/jupyterlab/jupyterlab/pull/8538))

#### Other

- Resolve \'restarting\' state on reconnect
  ([#9484](https://github.com/jupyterlab/jupyterlab/pull/9484),
  [#9008](https://github.com/jupyterlab/jupyterlab/issues/9008))
- Upgrade typedoc
  ([#9483](https://github.com/jupyterlab/jupyterlab/pull/9483))
- Update to typescript 4.1.3
  ([#9476](https://github.com/jupyterlab/jupyterlab/pull/9476))
- Disable shut down all button if there is no running kernel or
  terminal
  ([#9468](https://github.com/jupyterlab/jupyterlab/pull/9468),
  [#48](https://github.com/jtpio/jupyterlab-classic/issues/48))
- Make some dependencies optional for the code console plugin
  ([#9467](https://github.com/jupyterlab/jupyterlab/pull/9467))
- Require tornado\>=6.1.0
  ([#9453](https://github.com/jupyterlab/jupyterlab/pull/9453))
- Pin to tornado\>=6.1 on binder
  ([#9449](https://github.com/jupyterlab/jupyterlab/pull/9449))
- Fix some of the ui-components dependency warnings
  ([#9448](https://github.com/jupyterlab/jupyterlab/pull/9448))
- Fix browser test
  ([#9447](https://github.com/jupyterlab/jupyterlab/pull/9447))
- Support for lowercase search queries in the file browser
  ([#9446](https://github.com/jupyterlab/jupyterlab/pull/9446))
- Set the tabs menu title by default
  ([#9445](https://github.com/jupyterlab/jupyterlab/pull/9445))
- Add tests for interop between source and prebuilt extensions
  ([#9443](https://github.com/jupyterlab/jupyterlab/pull/9443),
  [#9333](https://github.com/jupyterlab/jupyterlab/issues/9333))
- Make itreepathupdater optional in file browser plugin
  ([#9442](https://github.com/jupyterlab/jupyterlab/pull/9442))
- Make ilabshell optional in the filebrowser factory plugin
  ([#9439](https://github.com/jupyterlab/jupyterlab/pull/9439))
- Reduce yarn timeout
  ([#9419](https://github.com/jupyterlab/jupyterlab/pull/9419))
- Remove unused requires for the tree-resolver plugin
  ([#9412](https://github.com/jupyterlab/jupyterlab/pull/9412))
- Update \@types/react to \^17.0.0
  ([#9409](https://github.com/jupyterlab/jupyterlab/pull/9409))
- Make css dependency graph of js modules
  ([#9407](https://github.com/jupyterlab/jupyterlab/pull/9407))
- Cleanup unused python imports in examples/
  ([#9404](https://github.com/jupyterlab/jupyterlab/pull/9404))
- Clear the model and the signals upon continue response
  ([#9402](https://github.com/jupyterlab/jupyterlab/pull/9402))
- Fix scroll positions when clearing outputs
  ([#9400](https://github.com/jupyterlab/jupyterlab/pull/9400),
  [#9331](https://github.com/jupyterlab/jupyterlab/issues/9331))
- Remove initial extra \_onmimetypechanged call
  ([#9394](https://github.com/jupyterlab/jupyterlab/pull/9394))
- Bump the eslint dev dependencies
  ([#9391](https://github.com/jupyterlab/jupyterlab/pull/9391))
- Reconnect to kernel on manual restart
  ([#9388](https://github.com/jupyterlab/jupyterlab/pull/9388))
- Remove the memory usage status bar item
  ([#9386](https://github.com/jupyterlab/jupyterlab/pull/9386),
  [#9363](https://github.com/jupyterlab/jupyterlab/issues/9363))
- Change user references from single-document mode to simple interface
  (mode)
  ([#9380](https://github.com/jupyterlab/jupyterlab/pull/9380),
  [#9378](https://github.com/jupyterlab/jupyterlab/issues/9378))
- Reconnect to kernel on restart action
  ([#9371](https://github.com/jupyterlab/jupyterlab/pull/9371))
- Add a polyfill for path in the base webpack config
  ([#9368](https://github.com/jupyterlab/jupyterlab/pull/9368),
  [#9345](https://github.com/jupyterlab/jupyterlab/issues/9345))
- Add reconnect to kernel main menu item, and notebook implementation.
  ([#9356](https://github.com/jupyterlab/jupyterlab/pull/9356),
  [#9353](https://github.com/jupyterlab/jupyterlab/issues/9353))
- Update blueprint dependencies
  ([#9350](https://github.com/jupyterlab/jupyterlab/pull/9350))
- Target sys-prefix by default but allow you to specify user
  ([#9347](https://github.com/jupyterlab/jupyterlab/pull/9347))
- Eliminate eager sharing
  ([#9348](https://github.com/jupyterlab/jupyterlab/pull/9348),
  [#9343](https://github.com/jupyterlab/jupyterlab/issues/9343))
- Revert opening in new tab in single-document mode
  ([#9334](https://github.com/jupyterlab/jupyterlab/pull/9334),
  [#9323](https://github.com/jupyterlab/jupyterlab/issues/9323))
- Eager share only core packages and their dependencies
  ([#9332](https://github.com/jupyterlab/jupyterlab/pull/9332),
  [#9329](https://github.com/jupyterlab/jupyterlab/issues/9329))
- Changed the expression to \"server unavailable or unreachable\"
  instead of \"server not running\"
  ([#9325](https://github.com/jupyterlab/jupyterlab/pull/9325))
- Increase the pause between publishing and using npm packages to 5
  minutes
  ([#9319](https://github.com/jupyterlab/jupyterlab/pull/9319))
- Lint extension manager
  ([#9318](https://github.com/jupyterlab/jupyterlab/pull/9318))
- Refactor build conventions
  ([#9312](https://github.com/jupyterlab/jupyterlab/pull/9312),
  [#9304](https://github.com/jupyterlab/jupyterlab/issues/9304))
- Make ilabshell optional for the launcher extension
  ([#9305](https://github.com/jupyterlab/jupyterlab/pull/9305))
- Update binder to use conda, which allows us to install our own
  nodejs.
  ([#9298](https://github.com/jupyterlab/jupyterlab/pull/9298))
- Move the single document switch to the status bar
  ([#9296](https://github.com/jupyterlab/jupyterlab/pull/9296))
- Added utf-8 encoding parameter to create process
  ([#9294](https://github.com/jupyterlab/jupyterlab/pull/9294),
  [#8600](https://github.com/%5B/issues/8600))
- Fix linting errors in github prs
  ([#9293](https://github.com/jupyterlab/jupyterlab/pull/9293))
- Enable mimedocument to use an optional specific renderer
  ([#9291](https://github.com/jupyterlab/jupyterlab/pull/9291))
- Pause after publishing packages to allow npm time to update their
  listing
  ([#9288](https://github.com/jupyterlab/jupyterlab/pull/9288))
- Sidebar width
  ([#9287](https://github.com/jupyterlab/jupyterlab/pull/9287),
  [#8938](https://github.com/jupyterlab/jupyterlab/issues/8938))
- Mybinder.org link for people who want to test their own branches in
  the developer guidelines
  ([#9284](https://github.com/jupyterlab/jupyterlab/pull/9284),
  [#9255](https://github.com/jupyterlab/jupyterlab/issues/9255))
- Remove ensure-max-old-space script
  ([#9282](https://github.com/jupyterlab/jupyterlab/pull/9282))
- Fix usage tests refusing to uninstall federated extensions
  ([#9281](https://github.com/jupyterlab/jupyterlab/pull/9281),
  [#9280](https://github.com/jupyterlab/jupyterlab/issues/9280))
- Add a new menu shell area
  ([#9274](https://github.com/jupyterlab/jupyterlab/pull/9274))
- Fix \#9255
  ([#9273](https://github.com/jupyterlab/jupyterlab/pull/9273),
  [#9255](https://github.com/jupyterlab/jupyterlab/issues/9255))
- Fix theme path in jupyterlab builder
  ([#9272](https://github.com/jupyterlab/jupyterlab/pull/9272))
- Move document mode switch to separate plugin
  ([#9270](https://github.com/jupyterlab/jupyterlab/pull/9270))
- Fix styling of single-document mode switch in menu bar
  ([#9267](https://github.com/jupyterlab/jupyterlab/pull/9267))
- Make pdf viewer extension recognize pdf files
  ([#9266](https://github.com/jupyterlab/jupyterlab/pull/9266))
- Fix relative path handling in markdown images
  ([#9264](https://github.com/jupyterlab/jupyterlab/pull/9264),
  [#9253](https://github.com/jupyterlab/jupyterlab/issues/9253),
  [#9243](https://github.com/jupyterlab/jupyterlab/issues/9243))
- Add jupyterhub to page config
  ([#9256](https://github.com/jupyterlab/jupyterlab/pull/9256),
  [#9248](https://github.com/jupyterlab/jupyterlab/issues/9248))
- Update to webpack-cli 4.1.0
  ([#9254](https://github.com/jupyterlab/jupyterlab/pull/9254))
- Upgrade to react 17
  ([#9227](https://github.com/jupyterlab/jupyterlab/pull/9227))
- Extension documentation
  ([#9221](https://github.com/jupyterlab/jupyterlab/pull/9221))
- Lint fixes
  ([#9218](https://github.com/jupyterlab/jupyterlab/pull/9218))
- Update change log
  ([#9217](https://github.com/jupyterlab/jupyterlab/pull/9217))
- Update committer list
  ([#9215](https://github.com/jupyterlab/jupyterlab/pull/9215))
- Upgrade to TypeScript 4
  ([#8883](https://github.com/jupyterlab/jupyterlab/pull/8883))
- File browser filter
  ([#8615](https://github.com/jupyterlab/jupyterlab/pull/8615))
- Update yarn.lock.
  ([#9095](https://github.com/jupyterlab/jupyterlab/pull/9095))
- Handle notebook kernel in busy state on page reload
  ([#9077](https://github.com/jupyterlab/jupyterlab/pull/9077))
- Use span element to maintain ellipsis
  ([#9075](https://github.com/jupyterlab/jupyterlab/pull/9075),
  [#9074](https://github.com/jupyterlab/jupyterlab/issues/9074))
- Add codemirror singleton plugin
  ([#9067](https://github.com/jupyterlab/jupyterlab/pull/9067))
- Support token authentication for terminal websocket communication
  ([#9080](https://github.com/jupyterlab/jupyterlab/pull/9080))
- Do not special-case logic for mainareawidget.
  ([#9094](https://github.com/jupyterlab/jupyterlab/pull/9094))
- Set an icon for the inspector main area widget
  ([#9093](https://github.com/jupyterlab/jupyterlab/pull/9093))
- Fix the open tabs handling of mainareawidget icons
  ([#9092](https://github.com/jupyterlab/jupyterlab/pull/9092),
  [#126](https://github.com/jupyterlab/extension-examples/issues/126))
- Sort completion filtering results
  ([#9098](https://github.com/jupyterlab/jupyterlab/pull/9098),
  [#9048](https://github.com/jupyterlab/jupyterlab/issues/9048),
  [#9048](https://github.com/jupyterlab/jupyterlab/issues/9048))
- Add hover scrolling to menu, like toolbar.
  ([#9097](https://github.com/jupyterlab/jupyterlab/pull/9097))
- Add codemirror simple mode addon
  ([#9123](https://github.com/jupyterlab/jupyterlab/pull/9123))
- Create codeql-analysis.yml
  ([#9119](https://github.com/jupyterlab/jupyterlab/pull/9119))
- Create ensurevimkeymap function
  ([#9161](https://github.com/jupyterlab/jupyterlab/pull/9161))
- Increase size of docstring pop up tooltip
  ([#9134](https://github.com/jupyterlab/jupyterlab/pull/9134),
  [#9085](https://github.com/jupyterlab/jupyterlab/issues/9085))
- Add a 2.x -\> 3.x migration guide
  ([#9162](https://github.com/jupyterlab/jupyterlab/pull/9162),
  [#9118](https://github.com/jupyterlab/jupyterlab/issues/9118))
- Add an offline circle icon for disconnected or unknown kernel state
  ([#9172](https://github.com/jupyterlab/jupyterlab/pull/9172))
- Include js api in sphinx docs
  ([#9179](https://github.com/jupyterlab/jupyterlab/pull/9179))
- Update rtd build
  ([#9182](https://github.com/jupyterlab/jupyterlab/pull/9182))
- Allow to substitute the default completer renderer
  ([#8930](https://github.com/jupyterlab/jupyterlab/pull/8930),
  [#8926](https://github.com/jupyterlab/jupyterlab/issues/8926))
- Update dependencies for beta
  ([#8921](https://github.com/jupyterlab/jupyterlab/pull/8921))
- Test cleanup
  ([#8894](https://github.com/jupyterlab/jupyterlab/pull/8894))
- Resize isolated iframes on content height change
  ([#8909](https://github.com/jupyterlab/jupyterlab/pull/8909),
  [#5696](https://github.com/jupyterlab/jupyterlab/issues/5696))
- Update minimum python version to python 3.6.
  ([#8903](https://github.com/jupyterlab/jupyterlab/pull/8903))
- Update yarn.lock
  ([#8862](https://github.com/jupyterlab/jupyterlab/pull/8862))
- Makes some properties and methods of class dsvmodel accessible
  outside the class.
  ([#8849](https://github.com/jupyterlab/jupyterlab/pull/8849),
  [#8848](https://github.com/jupyterlab/jupyterlab/issues/8848))
- Do not use token parameters in websocket urls
  ([#8835](https://github.com/jupyterlab/jupyterlab/pull/8835),
  [#8813](https://github.com/jupyterlab/jupyterlab/issues/8813))
- Use blocked/allowed extension naming in jupyterlab
  ([#8799](https://github.com/jupyterlab/jupyterlab/pull/8799),
  [#8533](https://github.com/jupyterlab/jupyterlab/issues/8533))
- Create icon for pdfs in the filebrowser
  ([#8791](https://github.com/jupyterlab/jupyterlab/pull/8791))
- Correctly set base_url on workspace apps
  ([#8788](https://github.com/jupyterlab/jupyterlab/pull/8788))
- Pass in isessioncontextdialogs to notebookwidgetfactory
  ([#8778](https://github.com/jupyterlab/jupyterlab/pull/8778))
- Update encoding version in vega sample.
  ([#8766](https://github.com/jupyterlab/jupyterlab/pull/8766))
- Upgrade codemirror
  ([#8739](https://github.com/jupyterlab/jupyterlab/pull/8739))
- Rename the logconsole:nboutput plugin id
  ([#8729](https://github.com/jupyterlab/jupyterlab/pull/8729))
- Rename the celltags plugin id to \@jupyterlab/celltags
  ([#8728](https://github.com/jupyterlab/jupyterlab/pull/8728))
- Uncaught typeerror when switching kernels
  ([#8727](https://github.com/jupyterlab/jupyterlab/pull/8727))
- Change inspector detail_level to 1
  ([#8725](https://github.com/jupyterlab/jupyterlab/pull/8725))
- Change main menu ranks to allow for application menu to l of file
  ([#8719](https://github.com/jupyterlab/jupyterlab/pull/8719))
- Handle errors in async browser_check
  ([#8717](https://github.com/jupyterlab/jupyterlab/pull/8717),
  [#8709](https://github.com/jupyterlab/jupyterlab/issues/8709))
- Add mehmet and andrew to contributors, fix last name order
  ([#8712](https://github.com/jupyterlab/jupyterlab/pull/8712))
- Updated puppeteer version to v4.0.0
  ([#8707](https://github.com/jupyterlab/jupyterlab/pull/8707))
- Update the singleton packages to include at least every package with
  a \'tokens.ts\' file
  ([#8703](https://github.com/jupyterlab/jupyterlab/pull/8703))
- Update link to jupyter contributing guide
  ([#8697](https://github.com/jupyterlab/jupyterlab/pull/8697),
  [#8682](https://github.com/jupyterlab/jupyterlab/issues/8682))
- Added ability to delete a document from titlebar context menu
  ([#8670](https://github.com/jupyterlab/jupyterlab/pull/8670))
- Move codemirror html tree and related css to shadow dom
  ([#8584](https://github.com/jupyterlab/jupyterlab/pull/8584))
- Support macoptionismeta option in terminal
  ([#8573](https://github.com/jupyterlab/jupyterlab/pull/8573),
  [#4236](https://github.com/jupyterlab/jupyterlab/issues/4236))
- Align output baseline with prompt
  ([#8561](https://github.com/jupyterlab/jupyterlab/pull/8561),
  [#8560](https://github.com/jupyterlab/jupyterlab/issues/8560))
- Use the same font-family for cell prompt and code
  ([#8553](https://github.com/jupyterlab/jupyterlab/pull/8553),
  [#8552](https://github.com/jupyterlab/jupyterlab/issues/8552))
- Prompt to save files before rebuild
  ([#8526](https://github.com/jupyterlab/jupyterlab/pull/8526),
  [#7372](https://github.com/jupyterlab/jupyterlab/issues/7372))
- Change json5 payload to json payload
  ([#8225](https://github.com/jupyterlab/jupyterlab/pull/8225))
- Move notebook logging plugin to notebook-extension package
  ([#7830](https://github.com/jupyterlab/jupyterlab/pull/7830))
- First pass at adding scroll to cell method
  ([#6818](https://github.com/jupyterlab/jupyterlab/pull/6818))
- Add a debugger section to the user docs and contributing guide
  ([#8977](https://github.com/jupyterlab/jupyterlab/pull/8977))

#### Single Document Mode and Mobile Enhancements

- Make the single document title widget work for widgets that are not
  main area widgets
  ([#9078](https://github.com/jupyterlab/jupyterlab/pull/9078))
- Add border at top of single-document open menus
  ([#9096](https://github.com/jupyterlab/jupyterlab/pull/9096),
  [#9065](https://github.com/jupyterlab/jupyterlab/issues/9065))
- Implement a simple checkbox for single-document mode in the menu
  bar. ([#9100](https://github.com/jupyterlab/jupyterlab/pull/9100),
  [#8292](https://github.com/jupyterlab/jupyterlab/issues/8292))
- Followup \#9100: made sdm switch pretty, accessible
  ([#9104](https://github.com/jupyterlab/jupyterlab/pull/9104))
- Improved url scheme, state, interactions for single document mode
  ([#8715](https://github.com/jupyterlab/jupyterlab/pull/8715))
- Add workspace mime handler and loading/saving workspaces manually
  ([#8691](https://github.com/jupyterlab/jupyterlab/pull/8691))
- Modify ansi color fix
  ([#8555](https://github.com/jupyterlab/jupyterlab/pull/8555),
  [#8554](https://github.com/jupyterlab/jupyterlab/issues/8554))
- Improve single document mode to address classic notebook usage cases
  ([#8531](https://github.com/jupyterlab/jupyterlab/pull/8531))
- Incrementally improve jupyterlab mobile ux
  ([#8456](https://github.com/jupyterlab/jupyterlab/pull/8456))

#### Benchmarks (now a separate repository)

- Move benchmarks to seperate repo
  ([#8795](https://github.com/jupyterlab/jupyterlab/pull/8795))
- Fix off by one error in benchmark samples
  ([#8785](https://github.com/jupyterlab/jupyterlab/pull/8785))
- Benchmark params configurable and increase timeout
  ([#8786](https://github.com/jupyterlab/jupyterlab/pull/8786))
- Benchmarks: new erroroutputs + larger timeout + notebook defs in
  subfolder
  ([#8783](https://github.com/jupyterlab/jupyterlab/pull/8783))
- Add ability to compare benchmarks
  ([#8737](https://github.com/jupyterlab/jupyterlab/pull/8737))
- Benchmark notebook loads
  ([#8020](https://github.com/jupyterlab/jupyterlab/pull/8020))

### Bugfixes

- Fix lerna warning
  ([#9061](https://github.com/jupyterlab/jupyterlab/pull/9061))
- Fix doc build
  ([#9063](https://github.com/jupyterlab/jupyterlab/pull/9063),
  [#9060](https://github.com/jupyterlab/jupyterlab/issues/9060))
- Make text settings menu work
  ([#9066](https://github.com/jupyterlab/jupyterlab/pull/9066),
  [#9042](https://github.com/jupyterlab/jupyterlab/issues/9042))
- Fix lint check for the codemirror-extension package
  ([#9087](https://github.com/jupyterlab/jupyterlab/pull/9087))
- Fix the examples ci
  ([#9150](https://github.com/jupyterlab/jupyterlab/pull/9150))
- Test: cleanup eslint jest rules and files
  ([#9125](https://github.com/jupyterlab/jupyterlab/pull/9125))
- Switch to a different murmurhash2 implementation to handle unicode
  characters
  ([#9158](https://github.com/jupyterlab/jupyterlab/pull/9158))
- Add more xxx to the mktemp command in release_test.sh
  ([#9131](https://github.com/jupyterlab/jupyterlab/pull/9131))
- Add setup.py and pyproject.toml to manifest.in
  ([#9129](https://github.com/jupyterlab/jupyterlab/pull/9129))
- Urlext.join cant handle colon in relative paths
  ([#9169](https://github.com/jupyterlab/jupyterlab/pull/9169),
  [#9159](https://github.com/jupyterlab/jupyterlab/issues/9159))
- Remove absolute document search pane width
  ([#9180](https://github.com/jupyterlab/jupyterlab/pull/9180),
  [#9178](https://github.com/jupyterlab/jupyterlab/issues/9178))
- Update session and kernel manager data only if there was a real
  change.
  ([#9189](https://github.com/jupyterlab/jupyterlab/pull/9189),
  [#9133](https://github.com/jupyterlab/jupyterlab/issues/9133))
- Update metadata recorded to align better with jupyter protocol
  ([#9206](https://github.com/jupyterlab/jupyterlab/pull/9206))
- Fix focus issues with command palette
  ([#9210](https://github.com/jupyterlab/jupyterlab/pull/9210),
  [#9121](https://github.com/jupyterlab/jupyterlab/issues/9121))
- Update mimetype for dragging files
  ([#8965](https://github.com/jupyterlab/jupyterlab/pull/8965),
  [#8934](https://github.com/jupyterlab/jupyterlab/issues/8934))
- Fix comment explaining the extension entry point.
  ([#8964](https://github.com/jupyterlab/jupyterlab/pull/8964))
- Security docs: link to jupyter-server instead of jupyter-noteboook
  ([#8954](https://github.com/jupyterlab/jupyterlab/pull/8954))
- Fix titles in the extension development docs
  ([#8948](https://github.com/jupyterlab/jupyterlab/pull/8948))
- Fix link syntax in the apod tutorial
  ([#8942](https://github.com/jupyterlab/jupyterlab/pull/8942))
- Fix codemirror text color issue with dark jupyter theme.
  ([#8919](https://github.com/jupyterlab/jupyterlab/pull/8919),
  [#8792](https://github.com/jupyterlab/jupyterlab/issues/8792))
- Remove the extension path, not the entire extension directory, when
  uninstalling an extension
  ([#8904](https://github.com/jupyterlab/jupyterlab/pull/8904))
- Header `'content-type'` should not be overwritten
  ([#8891](https://github.com/jupyterlab/jupyterlab/pull/8891),
  [#8890](https://github.com/jupyterlab/jupyterlab/issues/8890))
- Make sure adding or removing a cell tag actually replaces the tag
  list, so a changed signal is emitted for the cell metadata
  ([#8751](https://github.com/jupyterlab/jupyterlab/pull/8751),
  [#8534](https://github.com/jupyterlab/jupyterlab/issues/8534))
- Fix up ensure package and repo
  ([#8749](https://github.com/jupyterlab/jupyterlab/pull/8749),
  [#8748](https://github.com/jupyterlab/jupyterlab/issues/8748))
- Add comma in `extension_points.rst` to fix syntax error of code
  ([#8745](https://github.com/jupyterlab/jupyterlab/pull/8745))
- Fix: Contributing Guide Link is Out of Sync
  ([#8665](https://github.com/jupyterlab/jupyterlab/pull/8665))
- Fix api docs links
  ([#8624](https://github.com/jupyterlab/jupyterlab/pull/8624),
  [#8616](https://github.com/jupyterlab/jupyterlab/issues/8616))
- Fix handling of disposed widgets after closing a panel in tutorial
  ([#8623](https://github.com/jupyterlab/jupyterlab/pull/8623))
- Fix small typos in docs for developing extensions
  ([#8622](https://github.com/jupyterlab/jupyterlab/pull/8622))
- Reload the application on manual state reset
  ([#8621](https://github.com/jupyterlab/jupyterlab/pull/8621))
- Remove superfluous page reload on workspace reset
  ([#8619](https://github.com/jupyterlab/jupyterlab/pull/8619))
- Remove superfluous console log from the application shell
  ([#8618](https://github.com/jupyterlab/jupyterlab/pull/8618))
- Fix minor typos in extension tutorial
  ([#8613](https://github.com/jupyterlab/jupyterlab/pull/8613))
- Fix minor typos in docs for extensions.
  ([#8551](https://github.com/jupyterlab/jupyterlab/pull/8551))
- Fix small typo in install docs
  ([#8550](https://github.com/jupyterlab/jupyterlab/pull/8550))
- Fix more linting errors
  ([#8454](https://github.com/jupyterlab/jupyterlab/pull/8454))
- Reconnect a websocket when a kernel is restarted.
  ([#8432](https://github.com/jupyterlab/jupyterlab/pull/8432))

## [v2.2.x](https://github.com/jupyterlab/jupyterlab/milestone/53)

## [v2.2.0](https://github.com/jupyterlab/jupyterlab/releases/tag/v2.2.0)

See the [JupyterLab
2.2](https://github.com/jupyterlab/jupyterlab/milestone/53?closed=1)
milestone on GitHub for the full list of pull requests and issues
closed.

### July 2020

We are very excited to add Eric Charles to the core team this month!
([#8513](https://github.com/jupyterlab/jupyterlab/pull/8513))

### User-facing changes

- Cells can no longer be executed while kernels are terminating or
  restarting. There is a new status for these events on the Kernel
  Indicator
  ([#8562](https://github.com/jupyterlab/jupyterlab/pull/8562),
  [#8477](https://github.com/jupyterlab/jupyterlab/issues/8477))

<img src="https://user-images.githubusercontent.com/226720/84566070-966daf80-ad6e-11ea-815b-5f48136b524b.gif" class="jp-screenshot">

- Adds a visual clue for distinguishing hidden files and folders in
  the file browser window
  ([#8393](https://github.com/jupyterlab/jupyterlab/pull/8393))

<img src="https://user-images.githubusercontent.com/13181907/81358007-3b77d700-90a3-11ea-885c-31628c55744b.png" class="jp-screenshot">

- Enable horizontal scrolling for toolbars to improve mobile
  experience
  ([#8417](https://github.com/jupyterlab/jupyterlab/pull/8417))

<img src="https://user-images.githubusercontent.com/591645/81733090-bb31e700-9491-11ea-96ab-a4b1695b8e3c.gif" class="jp-screenshot">

- Improves the right-click context menu for the file editor
  ([#8425](https://github.com/jupyterlab/jupyterlab/pull/8425))

<img src="https://user-images.githubusercontent.com/25207344/84947222-d8bd2680-b0b7-11ea-98da-e4907f9131ba.png" class="jp-screenshot">

- Merge cell attachments when merging cells
  ([#8427](https://github.com/jupyterlab/jupyterlab/pull/8427),
  [#8414](https://github.com/jupyterlab/jupyterlab/issues/8414))

<img src="https://user-images.githubusercontent.com/591645/82072833-97acad80-96d8-11ea-957c-ce006731219b.gif" class="jp-screenshot">

- Add styling for high memory usage warning in status bar with
  nbresuse
  ([#8437](https://github.com/jupyterlab/jupyterlab/pull/8437))

<img src="https://user-images.githubusercontent.com/7725109/82213619-1b150b80-9932-11ea-9a53-570bd82d3d2a.png" class="jp-screenshot">

- Adds support for Python version 3.10
  ([#8445](https://github.com/jupyterlab/jupyterlab/pull/8445))
- Support live editing of SVG with updating rendering
  ([#8495](https://github.com/jupyterlab/jupyterlab/pull/8495),
  [#8494](https://github.com/jupyterlab/jupyterlab/issues/8494))

<img src="https://user-images.githubusercontent.com/45380/83218329-c8123400-a13b-11ea-9137-6b91a29dbc08.png" class="jp-screenshot">

### For developers

- Specify that we recommend typescript over javascript for extensions
  ([#8411](https://github.com/jupyterlab/jupyterlab/pull/8411))
- Lazy load codemirror theme stylesheets.
  ([#8506](https://github.com/jupyterlab/jupyterlab/pull/8506))
- Increase the link expiry to one week
  ([#8402](https://github.com/jupyterlab/jupyterlab/pull/8402))
- Add documentation on private npm registry usage
  ([#8455](https://github.com/jupyterlab/jupyterlab/pull/8455),
  [#7827](https://github.com/jupyterlab/jupyterlab/issues/7827),
  [#7660](https://github.com/jupyterlab/jupyterlab/issues/7660))
- Add feature request template + slight reorg in readme
  ([#8467](https://github.com/jupyterlab/jupyterlab/pull/8467))
- Add link to react example in extension-examples repo
  ([#8474](https://github.com/jupyterlab/jupyterlab/pull/8474))
- Update documentation of whitelist/blacklist
  ([#8540](https://github.com/jupyterlab/jupyterlab/pull/8540))
- Improve whitelist figure description in documentation
  ([#8517](https://github.com/jupyterlab/jupyterlab/pull/8517))

### Bugfixes

- Typo: fix extensino to extension
  ([#8512](https://github.com/jupyterlab/jupyterlab/pull/8512))
- Close correct tab with close tab
  ([#8529](https://github.com/jupyterlab/jupyterlab/pull/8529))
- Remove unused css rules
  ([#8547](https://github.com/jupyterlab/jupyterlab/pull/8547),
  [#8537](https://github.com/jupyterlab/jupyterlab/issues/8537))
- Fix small typo in getting started docs, proxy
  ([#8549](https://github.com/jupyterlab/jupyterlab/pull/8549))
- Fix link on CI badges
  ([#8603](https://github.com/jupyterlab/jupyterlab/pull/8603))
- Simplified multicursor backspace code
  ([#8523](https://github.com/jupyterlab/jupyterlab/pull/8523))
- Fix recent breaking changes to normalizepath in filebrowser
  ([#8383](https://github.com/jupyterlab/jupyterlab/pull/8383),
  [#8382](https://github.com/jupyterlab/jupyterlab/issues/8382))
- Fix watch mode and add ci test
  ([#8394](https://github.com/jupyterlab/jupyterlab/pull/8394))
- Address CI failures
  ([#8433](https://github.com/jupyterlab/jupyterlab/pull/8433))
- Fix lint errors in dependency graph script
  ([#8451](https://github.com/jupyterlab/jupyterlab/pull/8451))
- Fix lint complaints coming up from github actions
  ([#8452](https://github.com/jupyterlab/jupyterlab/pull/8452))
- Address CI usage test timeout
  ([#8464](https://github.com/jupyterlab/jupyterlab/pull/8464))
- Add chokidar to dev_mode/package.json
  ([#8481](https://github.com/jupyterlab/jupyterlab/pull/8481))
- Fix autolink
  ([#8496](https://github.com/jupyterlab/jupyterlab/pull/8496))
- Update phosphor aliases
  ([#8498](https://github.com/jupyterlab/jupyterlab/pull/8498))
- Fix default return in Python when extension has no version metadata
  ([#8430](https://github.com/jupyterlab/jupyterlab/pull/8430))
- Updated the installation documentation on read the docs to match the
  readme file on the repo
  ([#8386](https://github.com/jupyterlab/jupyterlab/pull/8386))
- Handle quit_button when launched as an extension
  ([#8486](https://github.com/jupyterlab/jupyterlab/pull/8486),
  [#8483](https://github.com/jupyterlab/jupyterlab/issues/8483))
- Add worker-loader
  ([#8593](https://github.com/jupyterlab/jupyterlab/pull/8593),
  [#8587](https://github.com/jupyterlab/jupyterlab/issues/8587))

## [v2.1.x](https://github.com/jupyterlab/jupyterlab/milestone/55)

### v2.1.2

- Fix icon sidebar height for third party extensions
  ([#8333](https://github.com/jupyterlab/jupyterlab/pull/8333))
- Pin JupyterLab server requirement more tightly
  ([#8330](https://github.com/jupyterlab/jupyterlab/pull/8330))
- Scrolls cells into view after deletion
  ([#8287](https://github.com/jupyterlab/jupyterlab/pull/8287))
- Sets data attribute on file type in filebrowser
  ([#8275](https://github.com/jupyterlab/jupyterlab/pull/8275))

### v2.1.1

- Pin puppeteer to fix ci
  ([#8260](https://github.com/jupyterlab/jupyterlab/pull/8260))
- Fix Save As for files without sessions
  ([#8248](https://github.com/jupyterlab/jupyterlab/pull/8248))

## [v2.1.0](https://github.com/jupyterlab/jupyterlab/releases/tag/v2.1.0)

### April 2020

See the [JupyterLab
2.1](https://github.com/jupyterlab/jupyterlab/milestone/49?closed=1)
milestone on GitHub for the full list of pull requests and issues
closed.

### User-facing changes

- Display the extension manager in the left sidebar by default. Users
  will need to acknowledge the disclaimer in the extension manager
  before using it.
  ([#8050](https://github.com/jupyterlab/jupyterlab/pull/8050),
  [#8145](https://github.com/jupyterlab/jupyterlab/pull/8145))
- Added `blacklist and whitelist support <extension_listings>` for the
  extension manager
  ([#7989](https://github.com/jupyterlab/jupyterlab/pull/7989))
- Automatically link URLs in notebook output text
  ([#8075](https://github.com/jupyterlab/jupyterlab/pull/8075),
  [#7393](https://github.com/jupyterlab/jupyterlab/issues/7393))
- Added a \"Restart Kernel and Run All Cells...\" button to the
  notebook toolbar
  ([#8024](https://github.com/jupyterlab/jupyterlab/pull/8024))

<img src="https://raw.githubusercontent.com/jupyterlab/jupyterlab/master/docs/source/getting_started/changelog_restartrunallbutton.png" class="jp-screenshot">

- Added a context menu item for opening a Markdown editor from the
  Markdown preview
  ([#7942](https://github.com/jupyterlab/jupyterlab/pull/7942))

- Support Node.js 10+
  ([#8112](https://github.com/jupyterlab/jupyterlab/pull/8112),
  [#8083](https://github.com/jupyterlab/jupyterlab/issues/8083))

- Added a command to replace the selection in an editor with text
  (inserting if there is no selection). This can be assigned a
  keyboard shortcut, as shown below. We also added a command to go
  through a series of commands and run the first enabled command.
  ([#7908](https://github.com/jupyterlab/jupyterlab/pull/7908)) Here
  is a keyboard shortcut to insert text in a currently-active notebook
  editor:

  ```js
  {
    command: "notebook:replace-selection",
    selector: ".jp-Notebook",
    keys: ["Ctrl L"],
    args: {text: "lambda x: x"}
  }
  ```

  Here is a keyboard shortcut to insert text into an editor of the
  currently active console, file editor, or notebook:

  ```js
  {
    command: "apputils:run-first-enabled",
    selector: "body",
    keys: ["Ctrl L"],
    args: {
      commands: [
        "console:replace-selection",
        "fileeditor:replace-selection",
        "notebook:replace-selection",
      ],
      args: {text: "lambda x: x"}
    }
  }
  ```

### For developers

- `NotebookWidgetFactory` is now a plugin so it can be overridden
  ([#8066](https://github.com/jupyterlab/jupyterlab/pull/8066),
  [#7996](https://github.com/jupyterlab/jupyterlab/issues/7996))
- Many improvements to `LabIcon`: work with all SVG loaders, improve
  performance, fix issue with menus from extensions
  ([#8125](https://github.com/jupyterlab/jupyterlab/pull/8125))
- Change the header application area to a box panel, which means the
  header area will display if its children set their minimum height
  ([#8059](https://github.com/jupyterlab/jupyterlab/pull/8059),
  [#7279](https://github.com/jupyterlab/jupyterlab/issues/7279))
- JupyterLab\'s custom context menu is now disabled on all descendants
  of a DOM element with a `data-jp-suppress-context-menu` attribute
  ([#7877](https://github.com/jupyterlab/jupyterlab/pull/7877),
  [#7670](https://github.com/jupyterlab/jupyterlab/issues/7670))

### Bugfixes

- Fix property inspector restoration on reload
  ([#8114](https://github.com/jupyterlab/jupyterlab/pull/8114))
- Increase the timeout for yarn
  ([#8104](https://github.com/jupyterlab/jupyterlab/pull/8104),
  [#8102](https://github.com/jupyterlab/jupyterlab/issues/8102))
- Fix find and replace with empty strings
  ([#8100](https://github.com/jupyterlab/jupyterlab/pull/8100),
  [#8098](https://github.com/jupyterlab/jupyterlab/issues/8098))
- Select search text when focusing the search overlay
  ([#8073](https://github.com/jupyterlab/jupyterlab/pull/8073),
  [#7932](https://github.com/jupyterlab/jupyterlab/pull/7932))
- Fix attaching images with spaces in their names to Markdown cells
  ([#8095](https://github.com/jupyterlab/jupyterlab/pull/8095))
- Fix build errors by distributing the `.yarnrc` configuration with
  the Python package
  ([#8045](https://github.com/jupyterlab/jupyterlab/pull/8045))
- Throttle fetch requests in the setting registry\'s data connector
  ([#7927](https://github.com/jupyterlab/jupyterlab/pull/7927))
- Close the gap between lines in notebook output
  ([#7832](https://github.com/jupyterlab/jupyterlab/pull/7832),
  [#7760](https://github.com/jupyterlab/jupyterlab/pull/7760))

## [v2.0.2](https://github.com/jupyterlab/jupyterlab/releases/tag/v2.0.2)

### April 2020

See the [JupyterLab
2.0.2](https://github.com/jupyterlab/jupyterlab/milestone/50?closed=1)
milestone on GitHub for the full list of pull requests and issues
closed.

- Fix cell execution when recording timing
  ([#8057](https://github.com/jupyterlab/jupyterlab/pull/8057),
  [#8056](https://github.com/jupyterlab/jupyterlab/issues/8056))
- Fix font settings for the editor
  ([#8004](https://github.com/jupyterlab/jupyterlab/pull/8004),
  [#7910](https://github.com/jupyterlab/jupyterlab/issues/7910))
- Avoid redundant checkpoint calls on loading a notebook
  ([#7926](https://github.com/jupyterlab/jupyterlab/pull/7926),
  [#7889](https://github.com/jupyterlab/jupyterlab/issues/7889))
- For developers: make kernel `IFuture.done` typings more correct by
  not including `undefined`
  ([#8032](https://github.com/jupyterlab/jupyterlab/pull/8032))

## [v2.0.0](https://github.com/jupyterlab/jupyterlab/releases)

### February 2020

Here are some highlights for this release. See the [JupyterLab
2.0](https://github.com/jupyterlab/jupyterlab/milestone/36?closed=1)
milestone on GitHub for the full list of pull requests and issues
closed.

### User-facing changes

- New user interface for notebook cell tags
  ([#7407](https://github.com/jupyterlab/jupyterlab/pull/7407),
  [#7786](https://github.com/jupyterlab/jupyterlab/pull/7786))

<img src="https://raw.githubusercontent.com/jupyterlab/jupyterlab/master/docs/source/getting_started/changelog_celltags.png" class="jp-screenshot">

- File info display when hovering on a file in the file browser
  ([#7485](https://github.com/jupyterlab/jupyterlab/pull/7485),
  [#7352](https://github.com/jupyterlab/jupyterlab/issues/7352))

<img src="https://raw.githubusercontent.com/jupyterlab/jupyterlab/master/docs/source/getting_started/changelog_fileinfo.png" class="jp-screenshot">

- Support for searching outputs in notebooks
  ([#7258](https://github.com/jupyterlab/jupyterlab/pull/7258))

<img src="https://raw.githubusercontent.com/jupyterlab/jupyterlab/master/docs/source/getting_started/changelog_searchoutput.png" class="jp-screenshot">

- `Ctrl Shift .` and `Ctrl Shift ,` shortcuts move focus to the next
  and previous tab bar in the main area, respectively
  ([#7673](https://github.com/jupyterlab/jupyterlab/pull/7673))

- `Shift Home` and `Shift End` shortcuts in a notebook select all
  cells from the current cell to the top or bottom of a notebook,
  respectively
  ([#7177](https://github.com/jupyterlab/jupyterlab/pull/7177))

- Explicit \"No Kernel\" button in the kernel selection dialog for new
  notebooks
  ([#7647](https://github.com/jupyterlab/jupyterlab/pull/7647))

- Notebook `recordTiming` advanced setting to control whether
  execution timing information is stored in notebook files
  ([#7578](https://github.com/jupyterlab/jupyterlab/pull/7578))

- \"Select current running or last run cell\" command added (requires
  notebook `recordTiming` advanced setting to be set to true)
  ([#7551](https://github.com/jupyterlab/jupyterlab/pull/7551))

- Codemirror `lineWiseCopyCut` advanced setting to control the
  behavior of the copy/cut keyboard shortcuts when there is no
  selection
  ([#7842](https://github.com/jupyterlab/jupyterlab/pull/7842))

- Refreshed the command palette and property inspector sidebar icons
  and user interfaces
  ([#7577](https://github.com/jupyterlab/jupyterlab/pull/7577),
  [#7038](https://github.com/jupyterlab/jupyterlab/issues/7038),
  [#7733](https://github.com/jupyterlab/jupyterlab/pull/7733),
  [#7732](https://github.com/jupyterlab/jupyterlab/issues/7732),
  [#7718](https://github.com/jupyterlab/jupyterlab/pull/7718),
  [#7686](https://github.com/jupyterlab/jupyterlab/issues/7686))

- \"New File\" and \"New Markdown File\" items in file browser context
  menu ([#7483](https://github.com/jupyterlab/jupyterlab/pull/7483),
  [#4280](https://github.com/jupyterlab/jupyterlab/issues/4280))

- \"Download\" item in File menu
  ([#7480](https://github.com/jupyterlab/jupyterlab/pull/7480))

- \"Restart Kernel and Run up to Selected Cell\" item in notebook
  Kernel menu
  ([#7789](https://github.com/jupyterlab/jupyterlab/pull/7789),
  [#6746](https://github.com/jupyterlab/jupyterlab/issues/6746))

- In extension manager, the \"enable\" button is now only shown for
  installed extensions
  ([#7482](https://github.com/jupyterlab/jupyterlab/pull/7482))

- Dialogs can now be closed by clicking outside of them
  ([#7885](https://github.com/jupyterlab/jupyterlab/pull/7885),
  [#3784](https://github.com/jupyterlab/jupyterlab/issues/3784))

- `documentsearch:startWithReplace` command to open the document find
  overlay with replace. There is not currently a default keyboard
  shortcut for this, but one can be assigned as a custom keyboard
  shortcut in Advanced Settings.
  ([#7725](https://github.com/jupyterlab/jupyterlab/pull/7725))

- `#` added to the CSV Viewer delimiter options
  ([#7367](https://github.com/jupyterlab/jupyterlab/pull/7367),
  [#6324](https://github.com/jupyterlab/jupyterlab/issues/6324))

- The JSON viewer now only displays structure hints for arrays and
  empty objects for a more streamlined feel
  ([#7227](https://github.com/jupyterlab/jupyterlab/pull/7227))

- Optional platform-aware keyboard shortcut fields `linuxKeys`,
  `macKeys`, and `winKeys` in keyboard shortcut definitions
  ([#7589](https://github.com/jupyterlab/jupyterlab/pull/7589))

  ```js
  {
    command: "application:toggle-mode",
    selector: "body",
    linuxKeys: ["Ctrl Shift M"], // only linux
    macKeys: ["Cmd Shift Z"], // only mac
    winKeys: ["Ctrl Shift B"], // only windows
    keys: ["Accel Shift U"] // default shortcut
  }
  ```

- Added options for `jupyter lab clean` to clean specific parts of the
  build, such as `--extensions`, `--settings`, `--static`, and `--all`
  ([#7583](https://github.com/jupyterlab/jupyterlab/pull/7583),
  [#6734](https://github.com/jupyterlab/jupyterlab/pull/6734))

- Removed the vega 4 and vega-lite 2 renderers (vega 5 and vega-lite 4
  is included in JupyterLab by default). These legacy renderers may be
  available via custom extensions
  ([#7650](https://github.com/jupyterlab/jupyterlab/pull/7650),
  [#7523](https://github.com/jupyterlab/jupyterlab/issues/7523),
  [#7658](https://github.com/jupyterlab/jupyterlab/pull/7658))

- JupyterHub users should use the `c.Spawner.default_url = '/lab'`
  setting instead of the deprecated and now removed `labhubapp`
  ([#7724](https://github.com/jupyterlab/jupyterlab/pull/7724))

### For developers

See `extension_migration` for help in
migrating extensions to JupyterLab 2.0.

#### Backward incompatible changes

- Switch from `@phosphor` to `@lumino` dependencies.
  ([#7582](https://github.com/jupyterlab/jupyterlab/pull/7582),
  [#7534](https://github.com/jupyterlab/jupyterlab/issues/7534),
  [#7763](https://github.com/jupyterlab/jupyterlab/pull/7763),
  [#7762](https://github.com/jupyterlab/jupyterlab/issues/7762),
  [#7595](https://github.com/jupyterlab/jupyterlab/pull/7595))
- Factor out the `settingsregistry` and `statedb` packages from
  coreutils
  ([#7681](https://github.com/jupyterlab/jupyterlab/pull/7681),
  [#7615](https://github.com/jupyterlab/jupyterlab/issues/7615))
- Rework services architecture (sessions, kernels, terminals). Among
  these changes, `ClientSession` is renamed to `SessionContext` and
  the `IKernelConnection.connectToComm` method is replaced with
  `IKernelConnection.createComm` and `IKernelConnection.hasComm`
  methods.
  ([#7252](https://github.com/jupyterlab/jupyterlab/pull/7252),
  [#7674](https://github.com/jupyterlab/jupyterlab/pull/7674),
  [#7820](https://github.com/jupyterlab/jupyterlab/pull/7820),
  [#7694](https://github.com/jupyterlab/jupyterlab/pull/7694),
  [#7690](https://github.com/jupyterlab/jupyterlab/issues/7690),
  [#7682](https://github.com/jupyterlab/jupyterlab/pull/7682))
- Upgrade to TypeScript 3.7
  ([#7522](https://github.com/jupyterlab/jupyterlab/pull/7522))
- Remove `polling` from coreutils in favor for `@lumino/polling`
  ([#7617](https://github.com/jupyterlab/jupyterlab/pull/7617))
- TypeScript strict null checking in core packages
  ([#7657](https://github.com/jupyterlab/jupyterlab/pull/7657),
  [#7607](https://github.com/jupyterlab/jupyterlab/pull/7607))
- Update state database list method to query based on namespace match.
  ([#7742](https://github.com/jupyterlab/jupyterlab/pull/7742),
  [#7257](https://github.com/jupyterlab/jupyterlab/issues/7257))
- Address code todo items and deprecations for 2.0
  ([#7720](https://github.com/jupyterlab/jupyterlab/pull/7720),
  [#7724](https://github.com/jupyterlab/jupyterlab/pull/7724))
- Update Console panel tracker widgets
  ([#7705](https://github.com/jupyterlab/jupyterlab/pull/7705),
  [#7726](https://github.com/jupyterlab/jupyterlab/issues/7726),
  [#7648](https://github.com/jupyterlab/jupyterlab/issues/7648),
  [#7645](https://github.com/jupyterlab/jupyterlab/pull/7645))
- Update contribution guide to require node v12+
  ([#7479](https://github.com/jupyterlab/jupyterlab/pull/7479))
- New API for the `Running` sidebar extension
  ([#6895](https://github.com/jupyterlab/jupyterlab/pull/6895),
  [#6876](https://github.com/jupyterlab/jupyterlab/issues/6876))
- Clean up handling of icons under unified LabIcon (
  [#7192](https://github.com/jupyterlab/jupyterlab/pull/7192)
  [#7700](https://github.com/jupyterlab/jupyterlab/pull/7700),
  [#7765](https://github.com/jupyterlab/jupyterlab/issues/7765),
  [#7767](https://github.com/jupyterlab/jupyterlab/pull/7767),
  [#7800](https://github.com/jupyterlab/jupyterlab/pull/7800),
  [#7846](https://github.com/jupyterlab/jupyterlab/pull/7846),
  [#7859](https://github.com/jupyterlab/jupyterlab/issues/7859),
  [#7864](https://github.com/jupyterlab/jupyterlab/pull/7864),
  [#7886](https://github.com/jupyterlab/jupyterlab/pull/7886))

#### Other changes

- New property inspector used to display the properties of the
  currently selected main area widget
  ([#7665](https://github.com/jupyterlab/jupyterlab/pull/7665),
  [#7664](https://github.com/jupyterlab/jupyterlab/issues/7664),
  [#7718](https://github.com/jupyterlab/jupyterlab/pull/7718),
  [#7686](https://github.com/jupyterlab/jupyterlab/issues/7686))
- Allow metadata for launcher items
  ([#7654](https://github.com/jupyterlab/jupyterlab/pull/7654),
  [#7652](https://github.com/jupyterlab/jupyterlab/issues/7652))
- Allow default file browser to restore manually.
  ([#7695](https://github.com/jupyterlab/jupyterlab/pull/7695),
  [#4009](https://github.com/jupyterlab/jupyterlab/issues/4009))
- Upgrade bundled yarn to 1.21.1
  ([#7691](https://github.com/jupyterlab/jupyterlab/pull/7691),
  [#7692](https://github.com/jupyterlab/jupyterlab/issues/7692))
- Make session dialogs configurable
  ([#7618](https://github.com/jupyterlab/jupyterlab/pull/7618),
  [#7616](https://github.com/jupyterlab/jupyterlab/issues/7616))
- Support transient editor configs
  ([#7611](https://github.com/jupyterlab/jupyterlab/pull/7611),
  [#7295](https://github.com/jupyterlab/jupyterlab/issues/7295))
- Optionally force new browser tab
  ([#7603](https://github.com/jupyterlab/jupyterlab/pull/7603),
  [#7602](https://github.com/jupyterlab/jupyterlab/issues/7602))
- Update core dependencies (e.g., `codemirror`, `xterm.js`,
  `markdown`, `fontawesome`, etc.)
  ([#7590](https://github.com/jupyterlab/jupyterlab/pull/7590),
  [#7194](https://github.com/jupyterlab/jupyterlab/issues/7194),
  [#7326](https://github.com/jupyterlab/jupyterlab/pull/7326),
  [#6479](https://github.com/jupyterlab/jupyterlab/issues/6479),
  [#7769](https://github.com/jupyterlab/jupyterlab/pull/7769))
- Add storybook to `ui-components`
  ([#7588](https://github.com/jupyterlab/jupyterlab/pull/7588),
  [#6799](https://github.com/jupyterlab/jupyterlab/issues/6799))
- Add explicit documentation encouraging people to re-use lab
  components
  ([#7543](https://github.com/jupyterlab/jupyterlab/pull/7543))
- Enable TypeScript sourcemaps for debugging locally installed
  labextensions
  ([#7541](https://github.com/jupyterlab/jupyterlab/pull/7541))
- Add `UseSignal` example to the docs
  ([#7519](https://github.com/jupyterlab/jupyterlab/pull/7519))
- Add `env` prop to kernel options
  ([#7499](https://github.com/jupyterlab/jupyterlab/pull/7499))
- Add kernelspec metadata
  ([#7229](https://github.com/jupyterlab/jupyterlab/pull/7229),
  [#7228](https://github.com/jupyterlab/jupyterlab/issues/7228))
- Allow different mimetypes for the clipboard data
  ([#7202](https://github.com/jupyterlab/jupyterlab/pull/7202))
- Add password dialog to apputils
  ([#7855](https://github.com/jupyterlab/jupyterlab/pull/7855))
- Alias phosphor packages to lumino to allow a deprecation period for
  phosphor
  ([#7893](https://github.com/jupyterlab/jupyterlab/pull/7893))
- Match react version in ui-components peerdependencies
  ([#7794](https://github.com/jupyterlab/jupyterlab/pull/7794))
- Fix lint-staged for both win and mac
  ([#7784](https://github.com/jupyterlab/jupyterlab/pull/7784))
- Update websocket workaround for node environments
  ([#7780](https://github.com/jupyterlab/jupyterlab/pull/7780),
  [#6934](https://github.com/jupyterlab/jupyterlab/pull/6934))
- Fix handling of linked extensions
  ([#7728](https://github.com/jupyterlab/jupyterlab/pull/7728),
  [#6738](https://github.com/jupyterlab/jupyterlab/issues/6738))
- Fix extension compatibility checks for prereleases and extensions
  supporting multiple major versions of JupyterLab
  ([#7723](https://github.com/jupyterlab/jupyterlab/pull/7723),
  [#7241](https://github.com/jupyterlab/jupyterlab/issues/7241),
  [#7919](https://github.com/jupyterlab/jupyterlab/pull/7919))
- Teach update-dependency about more range specifiers and make it
  adopt the current range for any tag
  ([#7709](https://github.com/jupyterlab/jupyterlab/pull/7709))
- Add support for giving a rank to items in the top area
  ([#7278](https://github.com/jupyterlab/jupyterlab/pull/7278))
- Apply all options to the initial JupyterLab application instance
  ([#7251](https://github.com/jupyterlab/jupyterlab/pull/7251))

### Bugfixes

- \"Copy Shareable Link\" in the file browser context menu now
  properly works in JupyterHub
  ([#7906](https://github.com/jupyterlab/jupyterlab/pull/7906))
- Update Mathjax CDN in the cell and console examples
  ([#7680](https://github.com/jupyterlab/jupyterlab/pull/7680))
- Revert ensure-max-old-space now that Node 12+ has better default
  memory ceilings
  ([#7677](https://github.com/jupyterlab/jupyterlab/pull/7677),
  [#7675](https://github.com/jupyterlab/jupyterlab/issues/7675))
- Resolve race condition between default file browser and tree urls.
  ([#7676](https://github.com/jupyterlab/jupyterlab/pull/7676),
  [#4009](https://github.com/jupyterlab/jupyterlab/issues/4009))
- Fix handling of code editor refresh
  ([#7672](https://github.com/jupyterlab/jupyterlab/pull/7672),
  [#7671](https://github.com/jupyterlab/jupyterlab/issues/7671))
- Start new notebooks in edit mode
  ([#7666](https://github.com/jupyterlab/jupyterlab/pull/7666),
  [#6731](https://github.com/jupyterlab/jupyterlab/issues/6731))
- Use consistent versions of React
  ([#7661](https://github.com/jupyterlab/jupyterlab/pull/7661),
  [#7655](https://github.com/jupyterlab/jupyterlab/issues/7655))
- Add scrollbar styles to nbconvert-css
  ([#7653](https://github.com/jupyterlab/jupyterlab/pull/7653))
- Close output views when corresponding notebooks are closed
  ([#7633](https://github.com/jupyterlab/jupyterlab/pull/7633),
  [#7301](https://github.com/jupyterlab/jupyterlab/issues/7301))
- Fixed incorrect white background for new command palette icon
  ([#7609](https://github.com/jupyterlab/jupyterlab/pull/7609),
  [#7577](https://github.com/jupyterlab/jupyterlab/issues/7577))
- Block fetching the settings for a plugin that is disabled
  ([#7147](https://github.com/jupyterlab/jupyterlab/pull/7147))
- When timing metadata changes, ensure signal fires
  ([#7576](https://github.com/jupyterlab/jupyterlab/pull/7576))
- Prevent memory leaks in Vega renderer
  ([#7564](https://github.com/jupyterlab/jupyterlab/pull/7564))
- Handle cell execution cancellation when cell is disposed
  ([#7555](https://github.com/jupyterlab/jupyterlab/pull/7555),
  [#7554](https://github.com/jupyterlab/jupyterlab/issues/7554))
- Fix dropdown option style issue on Windows
  ([#7513](https://github.com/jupyterlab/jupyterlab/pull/7513))
- Make sure label is linked to a control when checking for element
  type ([#7458](https://github.com/jupyterlab/jupyterlab/pull/7458))
- Refine log console message UX
  ([#7448](https://github.com/jupyterlab/jupyterlab/pull/7448),
  [#7444](https://github.com/jupyterlab/jupyterlab/issues/7444),
  [#7443](https://github.com/jupyterlab/jupyterlab/issues/7443))
- Fix multicursor backspacing
  ([#7401](https://github.com/jupyterlab/jupyterlab/pull/7401),
  [#7205](https://github.com/jupyterlab/jupyterlab/issues/7205))
- Reset log display and count when non-notebook tab gets activated
  ([#7334](https://github.com/jupyterlab/jupyterlab/pull/7334),
  [#7325](https://github.com/jupyterlab/jupyterlab/issues/7325))
- Fix Safari multiple tabs by working around a Safari bug.
  ([#7316](https://github.com/jupyterlab/jupyterlab/pull/7316),
  [#6921](https://github.com/jupyterlab/jupyterlab/issues/6921))
- Skip custom click behavior on links when the download attribute is
  set ([#7311](https://github.com/jupyterlab/jupyterlab/pull/7311),
  [#5443](https://github.com/jupyterlab/jupyterlab/issues/5443))
- Fix context menu hit test to deal with SVG nodes.
  ([#7242](https://github.com/jupyterlab/jupyterlab/pull/7242),
  [#7224](https://github.com/jupyterlab/jupyterlab/issues/7224))
- Fix overwriting of target attribute of anchors rendered by
  `IPython.display`
  ([#7215](https://github.com/jupyterlab/jupyterlab/pull/7215),
  [#6827](https://github.com/jupyterlab/jupyterlab/issues/6827))
- Fix file browser location in tree view
  ([#7155](https://github.com/jupyterlab/jupyterlab/pull/7155))
- Stop too many fetch calls in docmanager-extension
  ([#7879](https://github.com/jupyterlab/jupyterlab/pull/7879),
  [#7874](https://github.com/jupyterlab/jupyterlab/pull/7874))
- Ensures that `Shift Tab` dedent shortcut works correctly in the file
  editor
  ([#7865](https://github.com/jupyterlab/jupyterlab/pull/7865))
- Fix unexpected jump to last search result when using documentsearch
  ([#7835](https://github.com/jupyterlab/jupyterlab/pull/7835))
- Fixed refresh issue for html viewer
  ([#7824](https://github.com/jupyterlab/jupyterlab/pull/7824),
  [#7552](https://github.com/jupyterlab/jupyterlab/pull/7552))
- Fix for center-aligned images with IPython.display.image
  ([#7798](https://github.com/jupyterlab/jupyterlab/pull/7798))
- Changes to setting editor should trigger application dirty state
  ([#7774](https://github.com/jupyterlab/jupyterlab/pull/7774),
  [#7757](https://github.com/jupyterlab/jupyterlab/issues/7757))
- Move vega from \"devdependencies\" to \"dependencies\"
  ([#7699](https://github.com/jupyterlab/jupyterlab/pull/7699),
  [#7689](https://github.com/jupyterlab/jupyterlab/issues/7689))
- Restore default file browser manually.
  ([#7695](https://github.com/jupyterlab/jupyterlab/pull/7695),
  [#4009](https://github.com/jupyterlab/jupyterlab/issues/4009))
- Use default `app_dir` when `app_dir` is `''`
  ([#7268](https://github.com/jupyterlab/jupyterlab/pull/7268),
  [#7264](https://github.com/jupyterlab/jupyterlab/issues/7264))

## [v1.2.0](https://github.com/jupyterlab/jupyterlab/releases/tag/v1.2.0)

### October 29, 2019

Here are some highlights for this release. See the [JupyterLab
1.2.0](https://github.com/jupyterlab/jupyterlab/milestone/38?closed=1)
milestone on GitHub for the full list of pull requests and issues
closed.

### User-facing changes

- Select cells from the current cell to the top of the notebook with
  `Shift Home`, to the bottom of the notebook with `Shift End`
  ([#7336](https://github.com/jupyterlab/jupyterlab/pull/7336),
  [#6783](https://github.com/jupyterlab/jupyterlab/pull/6783))
- Add a log console extension to display unhandled messages and other
  activity
  ([#7318](https://github.com/jupyterlab/jupyterlab/pull/7318),
  [#7319](https://github.com/jupyterlab/jupyterlab/pull/7319),
  [#7379](https://github.com/jupyterlab/jupyterlab/pull/7379),
  [#7399](https://github.com/jupyterlab/jupyterlab/pull/7399),
  [#7406](https://github.com/jupyterlab/jupyterlab/pull/7406),
  [#7421](https://github.com/jupyterlab/jupyterlab/pull/7421))
- Allow the npm `max-old-space` option to be specified outside of
  JupyterLab
  ([#7317](https://github.com/jupyterlab/jupyterlab/pull/7317))
- Only display node structure in a JSON tree view for arrays and empty
  objects
  ([#7261](https://github.com/jupyterlab/jupyterlab/pull/7261))
- Make much smaller distribution packages by not building JavaScript
  source maps for releases.
  ([#7150](https://github.com/jupyterlab/jupyterlab/pull/7150))
- Add support for pasting cell attachments and dragging attachments
  from the file browser
  ([#5913](https://github.com/jupyterlab/jupyterlab/pull/5913),
  [#5744](https://github.com/jupyterlab/jupyterlab/issues/5744))
- Add a new `registry` configuration parameter to override the default
  yarn repository when building
  ([#7363](https://github.com/jupyterlab/jupyterlab/pull/7363),
  [#7109](https://github.com/jupyterlab/jupyterlab/pull/7109),
  [#7249](https://github.com/jupyterlab/jupyterlab/pull/7249),
  [#7248](https://github.com/jupyterlab/jupyterlab/issues/7248))

### For developers

- Update the Markdown renderer (`marked`) to 0.7.0
  ([#7328](https://github.com/jupyterlab/jupyterlab/pull/7328))
- Remove datagrid as a singleton, allowing extensions to use newer
  versions
  ([#7312](https://github.com/jupyterlab/jupyterlab/pull/7312))
- Add metadata to the kernelspec information
  ([#7234](https://github.com/jupyterlab/jupyterlab/pull/7234))
- Allow different mimetypes for the clipboard data
  ([#7233](https://github.com/jupyterlab/jupyterlab/pull/7233))
- Add inline svg icon support to toolbar buttons
  ([#7232](https://github.com/jupyterlab/jupyterlab/pull/7232))
- Add PageConfig functions to query if a plugin is deferred or
  disabled
  ([#7216](https://github.com/jupyterlab/jupyterlab/pull/7216))
- Allow for renderers for nbformat.ierror to be created
  ([#7203](https://github.com/jupyterlab/jupyterlab/pull/7203),
  [#7193](https://github.com/jupyterlab/jupyterlab/issues/7193))
- Refactor `fileeditor-extension` for modularization
  ([#6904](https://github.com/jupyterlab/jupyterlab/pull/6904))
- Add execution timing to cells
  ([#6864](https://github.com/jupyterlab/jupyterlab/pull/6864),
  [#3320](https://github.com/jupyterlab/jupyterlab/issues/3320))

### Bugfixes

- Fix the `file-browser-path` query parameter
  ([#7313](https://github.com/jupyterlab/jupyterlab/pull/7313))
- Skip custom click behavior on links when the download attribute is
  set ([#7323](https://github.com/jupyterlab/jupyterlab/pull/7323))
- Fix opening multiple browser tabs in Safari
  ([#7322](https://github.com/jupyterlab/jupyterlab/pull/7322))
- Fix context menus on SVG icons
  ([#7263](https://github.com/jupyterlab/jupyterlab/pull/7263))
- Fix overwriting of target attribute of anchors rendered by
  `IPython.display`
  ([#7231](https://github.com/jupyterlab/jupyterlab/pull/7231))
- Fix multi-cursor backspacing
  ([#7205](https://github.com/jupyterlab/jupyterlab/pull/7205),
  [#7401](https://github.com/jupyterlab/jupyterlab/pull/7401),
  [#7413](https://github.com/jupyterlab/jupyterlab/pull/7413))
- Fix mult-cursor cell splitting
  ([#7207](https://github.com/jupyterlab/jupyterlab/pull/7207),
  [#7417](https://github.com/jupyterlab/jupyterlab/pull/7417),
  [#7419](https://github.com/jupyterlab/jupyterlab/pull/7419))

## [v1.1.0](https://github.com/jupyterlab/jupyterlab/releases/tag/v1.1.0)

### August 28, 2019

Here are some highlights of what is in this release. See the [JupyterLab
1.1.0](https://github.com/jupyterlab/jupyterlab/milestone/31?closed=1)
milestone on GitHub for the full list of pull requests and issues
closed.

### User-facing changes

- `jupyter lab build` now has a `--minimize=False` option to build
  without minimization to conserve memory and time
  ([#6907](https://github.com/jupyterlab/jupyterlab/pull/6907))
- Fix workspace reset functionality
  ([#7106](https://github.com/jupyterlab/jupyterlab/pull/7106),
  [#7105](https://github.com/jupyterlab/jupyterlab/issues/7105))
- Restore behavior of the \"raises-exception\" cell tag
  ([#7020](https://github.com/jupyterlab/jupyterlab/pull/7020),
  [#7015](https://github.com/jupyterlab/jupyterlab/issues/7015))
- Add settings to override theme font sizes
  ([#6926](https://github.com/jupyterlab/jupyterlab/pull/6926))
- Accept query parameter to optionally change file browser location
  ([#6875](https://github.com/jupyterlab/jupyterlab/pull/6875))
- Pressing escape in the console should switch out of edit mode
  ([#6822](https://github.com/jupyterlab/jupyterlab/pull/6822))
- Fix file browser downloads in Google Chrome
  ([#6686](https://github.com/jupyterlab/jupyterlab/pull/6686))
- Make it possible to override the default widgets to view a file
  ([#6813](https://github.com/jupyterlab/jupyterlab/pull/6813),
  [#4048](https://github.com/jupyterlab/jupyterlab/issues/4048))
- Support installing multiple versions of the same extension
  ([#6857](https://github.com/jupyterlab/jupyterlab/pull/6857))
- Support JupyterHub server name for JupyterHub 1.0
  ([#6931](https://github.com/jupyterlab/jupyterlab/pull/6931))
- Add docs to help users diagnose issues before creating them
  ([#6971](https://github.com/jupyterlab/jupyterlab/pull/6971))
- The JupyterLab conda-forge package is now a `noarch`
  package. If you are using JupyterLab with `notebook`
  version 5.2 or earlier, you may need to manually enable the
  JupyterLab server extension. See the issue for more details
  ([#7042](https://github.com/jupyterlab/jupyterlab/issues/7042))

### For developers

- Expose install_kernel for tests so that outside projects can better
  use the testing framework
  ([#7089](https://github.com/jupyterlab/jupyterlab/pull/7089))
- Fix `comm_info_request` content to conform to the Jupyter message
  specification in a backwards-compatible way
  ([#6949](https://github.com/jupyterlab/jupyterlab/pull/6949),
  [#6947](https://github.com/jupyterlab/jupyterlab/issues/6947))
- Add yarn package resolution to build to constrain core package
  versions to patch semver ranges
  ([#6938](https://github.com/jupyterlab/jupyterlab/pull/6938))
- Make handling comm messages optional in a kernel connection.
  ([#6929](https://github.com/jupyterlab/jupyterlab/pull/6929))
- Expose icon svg to theme css
  ([#6034](https://github.com/jupyterlab/jupyterlab/pull/6034),
  [#7027](https://github.com/jupyterlab/jupyterlab/pull/7027))
- Expose convenience functions for open dialogs
  ([#6366](https://github.com/jupyterlab/jupyterlab/pull/6366),
  [#6365](https://github.com/jupyterlab/jupyterlab/issues/6365))
- Add debug messages to possible kernel messages
  ([#6704](https://github.com/jupyterlab/jupyterlab/pull/6704))
- Add server side coreconfig object
  ([#6991](https://github.com/jupyterlab/jupyterlab/pull/6991))

### Bug fixes

- Handle errors that occur during kernel selection
  ([#7094](https://github.com/jupyterlab/jupyterlab/pull/7094))
- Fix escaping issues for page config and other template variables
  ([#7016](https://github.com/jupyterlab/jupyterlab/pull/7016),
  [#7024](https://github.com/jupyterlab/jupyterlab/issues/7024),
  [#7061](https://github.com/jupyterlab/jupyterlab/pull/7061),
  [#7058](https://github.com/jupyterlab/jupyterlab/issues/7058),
  [#6858](https://github.com/jupyterlab/jupyterlab/issues/6858))
- Require jinja2 2.10+ to fix escaping issues
  ([#7055](https://github.com/jupyterlab/jupyterlab/pull/7055),
  [#7053](https://github.com/jupyterlab/jupyterlab/issues/7053))
- Increase the search debounce from 100ms to 500ms to increase
  incremental search responsiveness in large documents
  ([#7034](https://github.com/jupyterlab/jupyterlab/pull/7034))
- Fix vega downloads and download urls in general
  ([#7022](https://github.com/jupyterlab/jupyterlab/pull/7022),
  [#7017](https://github.com/jupyterlab/jupyterlab/issues/7017),
  [#7098](https://github.com/jupyterlab/jupyterlab/pull/7098),
  [#7047](https://github.com/jupyterlab/jupyterlab/issues/7047))
- Do not complain in the build about duplicate or optional packages
  ([#7013](https://github.com/jupyterlab/jupyterlab/pull/7013))
- Fix contextual help layout for R help
  ([#6933](https://github.com/jupyterlab/jupyterlab/pull/6933),
  [#6935](https://github.com/jupyterlab/jupyterlab/pull/6935))

## [v1.0.0](https://github.com/jupyterlab/jupyterlab/releases/tag/v1.0.0)

### June 28, 2019

See the [JupyterLab
1.0.0](https://github.com/jupyterlab/jupyterlab/milestone/2?closed=1)
milestone on GitHub for the full list of pull requests and issues closed
in 1.0.0, and other 1.0.x milestones for bugs fixed in patch releases.

### Find and Replace

<img src="https://raw.githubusercontent.com/jupyterlab/jupyterlab/master/docs/source/getting_started/find.png" class="jp-screenshot">

We have added first class support for find and replace across
JupyterLab. It is currently supported in notebooks and text files and is
extensible for other widgets who wish to support it.
([#6350](https://github.com/jupyterlab/jupyterlab/pull/6350),
[#6322](https://github.com/jupyterlab/jupyterlab/issues/6322),
[#6301](https://github.com/jupyterlab/jupyterlab/pull/6301),
[#6282](https://github.com/jupyterlab/jupyterlab/pull/6282),
[#6256](https://github.com/jupyterlab/jupyterlab/pull/6256),
[#6241](https://github.com/jupyterlab/jupyterlab/pull/6241),
[#6237](https://github.com/jupyterlab/jupyterlab/pull/6237),
[#6159](https://github.com/jupyterlab/jupyterlab/pull/6159),
[#6081](https://github.com/jupyterlab/jupyterlab/issues/6081),
[#6155](https://github.com/jupyterlab/jupyterlab/pull/6155),
[#6094](https://github.com/jupyterlab/jupyterlab/pull/6094),
[#6024](https://github.com/jupyterlab/jupyterlab/pull/6024),
[#5937](https://github.com/jupyterlab/jupyterlab/pull/5937),
[#5795](https://github.com/jupyterlab/jupyterlab/pull/5795),
[#1074](https://github.com/jupyterlab/jupyterlab/issues/1074))

### Status Bar

<img src="https://raw.githubusercontent.com/jupyterlab/jupyterlab/master/docs/source/getting_started/statusbar.png" class="jp-screenshot">

We have integrated the [JupyterLab Status Bar
package](https://github.com/jupyterlab/jupyterlab-statusbar) package
into the core distribution. Extensions can add their own status to it as
well ([#5577](https://github.com/jupyterlab/jupyterlab/pull/5577),
[#5525](https://github.com/jupyterlab/jupyterlab/pull/5525)
[#5990](https://github.com/jupyterlab/jupyterlab/pull/5990),
[#5982](https://github.com/jupyterlab/jupyterlab/issues/5982),
[#5514](https://github.com/jupyterlab/jupyterlab/pull/5514),
[#5508](https://github.com/jupyterlab/jupyterlab/pull/5508),
[#5352](https://github.com/jupyterlab/jupyterlab/issues/5352)).

### JupyterHub Integration

- We now include the JupyterHub extension in core JupyterLab, so you
  no longer need to install `@jupyterlab/hub-extension`.
  ([#6451](https://github.com/jupyterlab/jupyterlab/pull/6451),
  [#6428](https://github.com/jupyterlab/jupyterlab/issues/6428))
- JupyterLab now has a File \> Logout menu entry when running with
  JupyterHub
  ([#6087](https://github.com/jupyterlab/jupyterlab/pull/6087),
  [#5966](https://github.com/jupyterlab/jupyterlab/issues/5966))

### Printing

We now have a printing system that allows extensions to customize how
documents and activities are printed.
([#5850](https://github.com/jupyterlab/jupyterlab/pull/5850),
[#1314](https://github.com/jupyterlab/jupyterlab/issues/1314))

### Other User Facing Changes

- The launcher displays longer kernel names and supports keyboard
  navigation
  ([#6587](https://github.com/jupyterlab/jupyterlab/pull/6587))
- Notebook outputs without any valid MimeType renderers will not be
  displayed, instead of displaying an error
  ([#6559](https://github.com/jupyterlab/jupyterlab/pull/6559),
  [#6216](https://github.com/jupyterlab/jupyterlab/issues/6216))
- Add tooltip to file browser root breadcrumb icon showing the server
  root, if it is available
  ([#6552](https://github.com/jupyterlab/jupyterlab/pull/6552))
- Downloading a file will no longer open a new browser window
  ([#6546](https://github.com/jupyterlab/jupyterlab/pull/6546))
- Rename the help \"Inspector\" to \"Contextual Help\" and move it to
  the \"Help\" menu
  ([#6493](https://github.com/jupyterlab/jupyterlab/pull/6493),
  [#6488](https://github.com/jupyterlab/jupyterlab/issues/6488),
  [#6678](https://github.com/jupyterlab/jupyterlab/pull/6678),
  [#6671](https://github.com/jupyterlab/jupyterlab/pull/6671))
- Update many of the icons to make them more consistent
  ([#6672](https://github.com/jupyterlab/jupyterlab/pull/6672),
  [#6618](https://github.com/jupyterlab/jupyterlab/issues/6618),
  [#6664](https://github.com/jupyterlab/jupyterlab/pull/6664),
  [#6621](https://github.com/jupyterlab/jupyterlab/issues/6621))
- Update the settings UI to remove the table view
  ([#6654](https://github.com/jupyterlab/jupyterlab/pull/6654),
  [#6622](https://github.com/jupyterlab/jupyterlab/issues/6622),
  [#6653](https://github.com/jupyterlab/jupyterlab/pull/6653),
  [#6623](https://github.com/jupyterlab/jupyterlab/issues/6623),
  [#6646](https://github.com/jupyterlab/jupyterlab/pull/6646),
  [#6642](https://github.com/jupyterlab/jupyterlab/issues/6642))
- Replace FAQ Extension with link to JupyterLab documentation
  ([#6628](https://github.com/jupyterlab/jupyterlab/pull/6628),
  [#6608](https://github.com/jupyterlab/jupyterlab/issues/6608),
  [#6625](https://github.com/jupyterlab/jupyterlab/pull/6625),
  [#6610](https://github.com/jupyterlab/jupyterlab/issues/6610))
- Change the default keyboard shortcut for closing a tab to be `Alt+w`
  instead of `Cmd/Ctrl+w` to avoid conflicts with operating systems.
  ([#6486](https://github.com/jupyterlab/jupyterlab/pull/6486),
  [#6357](https://github.com/jupyterlab/jupyterlab/issues/6357))
- Show help text in Inspector window to describe you should select a
  function
  ([#6476](https://github.com/jupyterlab/jupyterlab/pull/6476))
- Fixes SVG rendering
  ([#6469](https://github.com/jupyterlab/jupyterlab/pull/6469),
  [#6295](https://github.com/jupyterlab/jupyterlab/issues/6295))
- Add support for dropping a tab in the tab bar area.
  ([#6454](https://github.com/jupyterlab/jupyterlab/pull/6454),
  [#5406](https://github.com/jupyterlab/jupyterlab/issues/5406))
- Switch some default shortcuts to use `Accel` instead of `Ctrl` so
  they are more natural for Mac users
  ([#6447](https://github.com/jupyterlab/jupyterlab/pull/6447),
  [#5023](https://github.com/jupyterlab/jupyterlab/issues/5023))
- Add ability to tell between hover and selected command palette items
  ([#6407](https://github.com/jupyterlab/jupyterlab/pull/6407),
  [#279](https://github.com/jupyterlab/jupyterlab/issues/279))
- Hide the \"Last Modified\" column when the file browser is narrow
  ([#6406](https://github.com/jupyterlab/jupyterlab/pull/6406),
  [#6093](https://github.com/jupyterlab/jupyterlab/issues/6093))
- Support copy/paste in terminal and Mac OS using `Ctrl+C` and
  `Ctrl+V`
  ([#6391](https://github.com/jupyterlab/jupyterlab/pull/6391),
  [#6385](https://github.com/jupyterlab/jupyterlab/issues/6385),
  [#1146](https://github.com/jupyterlab/jupyterlab/issues/1146))
- Support scrolling in running kernels panel
  ([#6383](https://github.com/jupyterlab/jupyterlab/pull/6383),
  [#6371](https://github.com/jupyterlab/jupyterlab/issues/6371))
- Adds ability to \"Merge Selected Cells\" in the context menu in the
  notebook
  ([#6375](https://github.com/jupyterlab/jupyterlab/pull/6375),
  [#6318](https://github.com/jupyterlab/jupyterlab/issues/6318))
- Turn On Accessibility In Xterm.js to make it more compatible for
  screen readers
  ([#6359](https://github.com/jupyterlab/jupyterlab/pull/6359))
- When selecting cells using the keyboard shortcuts, we now skip
  collapsed cells
  ([#6356](https://github.com/jupyterlab/jupyterlab/pull/6356),
  [#3233](https://github.com/jupyterlab/jupyterlab/issues/3233))
- Supporting opening `.geojson` files in JSON viewer
  ([#6349](https://github.com/jupyterlab/jupyterlab/pull/6349))
- Performance fixes for text-based progress bars
  ([#6304](https://github.com/jupyterlab/jupyterlab/pull/6304),
  [#4202](https://github.com/jupyterlab/jupyterlab/issues/4202))
- Add support for rendering Vega 5 and Vega Lite 3 while keeping the
  existing Vega 4 and Vega Lite 2 renderers
  ([#6294](https://github.com/jupyterlab/jupyterlab/pull/6294),
  [#6133](https://github.com/jupyterlab/jupyterlab/pull/6133),
  [#6128](https://github.com/jupyterlab/jupyterlab/issues/6128),
  [#6689](https://github.com/jupyterlab/jupyterlab/pull/6689),
  [#6685](https://github.com/jupyterlab/jupyterlab/pull/6685),
  [#6684](https://github.com/jupyterlab/jupyterlab/issues/6684),
  [#6675](https://github.com/jupyterlab/jupyterlab/issues/6675),
  [#6591](https://github.com/jupyterlab/jupyterlab/pull/6591),
  [#6572](https://github.com/jupyterlab/jupyterlab/issues/6572))
- Drag and drop console cells into a notebook or text editor
  ([#5585](https://github.com/jupyterlab/jupyterlab/pull/5585),
  [#4847](https://github.com/jupyterlab/jupyterlab/issues/4847))
- Drag and drop notebook cells into a console or text editor
  ([#5571](https://github.com/jupyterlab/jupyterlab/pull/5571),
  [#3732](https://github.com/jupyterlab/jupyterlab/issues/3732))
- The extension manager search now sorts extensions by the score
  assigned to them by NPM instead of alphabetically
  ([#5649](https://github.com/jupyterlab/jupyterlab/pull/5649))
- Notify the user when a kernel is automatically restarted, for
  example, if crashes from an out of memory error
  ([#6246](https://github.com/jupyterlab/jupyterlab/pull/6246),
  [#4273](https://github.com/jupyterlab/jupyterlab/issues/4273))
- Expose the extension manager in a command and menu item
  ([#6200](https://github.com/jupyterlab/jupyterlab/pull/6200))
- Add command to render all Markdown cells
  ([#6029](https://github.com/jupyterlab/jupyterlab/pull/6029),
  [#6017](https://github.com/jupyterlab/jupyterlab/issues/6017))
- Supports using shift to select text in output area
  ([#6015](https://github.com/jupyterlab/jupyterlab/pull/6015),
  [#4800](https://github.com/jupyterlab/jupyterlab/issues/4800))
- Output areas that opened in new views are restored properly now on
  reload
  ([#5981](https://github.com/jupyterlab/jupyterlab/pull/5981),
  [#5976](https://github.com/jupyterlab/jupyterlab/issues/5976))
- Add support for managing notebook metadata under a new \"Advanced
  Tools\" section in the cell tools area. The cell and notebook
  metadata now always reflect the current state of the notebook
  ([#5968](https://github.com/jupyterlab/jupyterlab/pull/5968),
  [#5200](https://github.com/jupyterlab/jupyterlab/issues/5200))
- Inherit terminal theme from core theme
  ([#5964](https://github.com/jupyterlab/jupyterlab/pull/5964))
- Adds a built-in HTML viewer so that you can view HTML files
  ([#5962](https://github.com/jupyterlab/jupyterlab/pull/5962),
  [#5855](https://github.com/jupyterlab/jupyterlab/pull/5855),
  [#2369](https://github.com/jupyterlab/jupyterlab/issues/2369))
- New workspaces are now automatically generated when you create a new
  window with the same workspace name.
  ([#5950](https://github.com/jupyterlab/jupyterlab/pull/5950),
  [#5854](https://github.com/jupyterlab/jupyterlab/issues/5854),
  [#5830](https://github.com/jupyterlab/jupyterlab/pull/5830),
  [#5214](https://github.com/jupyterlab/jupyterlab/issues/5214))
- We now add a hint to the context menu to describe how you can access
  the native browser menu
  ([#5940](https://github.com/jupyterlab/jupyterlab/pull/5940),
  [#4023](https://github.com/jupyterlab/jupyterlab/issues/4023))
- The tabs on the left panel have changed to make them more
  understandable
  ([#5920](https://github.com/jupyterlab/jupyterlab/pull/5920),
  [#5269](https://github.com/jupyterlab/jupyterlab/issues/5269))
- Start a new terminal when the page is refreshed and the old terminal
  has died
  ([#5917](https://github.com/jupyterlab/jupyterlab/pull/5917))
- Add a command to open the main menus, which can be assigned to a
  keyboard shortcut to open and navigate menus without a mouse
  ([#5910](https://github.com/jupyterlab/jupyterlab/pull/5910),
  [#3074](https://github.com/jupyterlab/jupyterlab/issues/3074))
- The contextual help now updates based on changes in the cursor from
  the mouse instead of just from the keyboard
  ([#5906](https://github.com/jupyterlab/jupyterlab/pull/5906),
  [#5899](https://github.com/jupyterlab/jupyterlab/issues/5899))
- The launcher now updates when the kernels change on the server
  ([#5904](https://github.com/jupyterlab/jupyterlab/pull/5904),
  [#5676](https://github.com/jupyterlab/jupyterlab/issues/5676))
- Retain cell auto scroll behavior even when a cell output is cleared
  ([#5817](https://github.com/jupyterlab/jupyterlab/pull/5817),
  [#4028](https://github.com/jupyterlab/jupyterlab/issues/4028))
- If you link to a relative path that is not a file in a markdown
  cell, this will now be preserved instead of changing it to a file
  URL ([#5814](https://github.com/jupyterlab/jupyterlab/pull/5814))
- Adds the ability to link to a certain row in a CSV file and have the
  viewer open to that row
  ([#5727](https://github.com/jupyterlab/jupyterlab/pull/5727),
  [#5720](https://github.com/jupyterlab/jupyterlab/issues/5720))
- We have improved the performance of switching to a large notebook
  ([#5700](https://github.com/jupyterlab/jupyterlab/pull/5700),
  [#4292](https://github.com/jupyterlab/jupyterlab/issues/4292),
  [#2639](https://github.com/jupyterlab/jupyterlab/issues/2639))
- The vdom extension now supports event handling, so that you can have
  kernel code run in response to user interaction with the UI
  ([#5670](https://github.com/jupyterlab/jupyterlab/pull/5670))
- Adds the ability to run \"Run All Code\" and \"Restart Kernel and
  Run All Code\" in code and markdown files
  ([#5641](https://github.com/jupyterlab/jupyterlab/pull/5641),
  [#5579](https://github.com/jupyterlab/jupyterlab/issues/5579))
- We now remember what line ending a text file has when loading it, so
  that files with `CRLF` line endings will properly be saved with the
  same endings
  ([#5622](https://github.com/jupyterlab/jupyterlab/pull/5622),
  [#4464](https://github.com/jupyterlab/jupyterlab/issues/4464),
  [#3901](https://github.com/jupyterlab/jupyterlab/issues/3901),
  [#3706](https://github.com/jupyterlab/jupyterlab/issues/3706))
- Fixes rendering of SVG elements in HTML MimeType output
  ([#5610](https://github.com/jupyterlab/jupyterlab/pull/5610),
  [#5610](https://github.com/jupyterlab/jupyterlab/issues/5610),
  [#5589](https://github.com/jupyterlab/jupyterlab/issues/5589))
- Allow copying files by holding down `Ctrl` when dragging them in the
  file browser
  ([#5584](https://github.com/jupyterlab/jupyterlab/pull/5584),
  [#3235](https://github.com/jupyterlab/jupyterlab/issues/3235))
- Switch the hover modified time in the file browser to use the local
  format
  ([#5567](https://github.com/jupyterlab/jupyterlab/pull/5567))
- We have added a default keyboard shortcut of `Ctrl Shift Q` for
  closing and cleaning up a file
  ([#5534](https://github.com/jupyterlab/jupyterlab/pull/5534),
  [#4390](https://github.com/jupyterlab/jupyterlab/issues/4390))
- Adds the ability to find and go to a certain line in the CSV viewer
  ([#5523](https://github.com/jupyterlab/jupyterlab/pull/5523))
- Add the ability to create new text and markdown files from the
  launcher and command palette
  ([#5512](https://github.com/jupyterlab/jupyterlab/pull/5512),
  [#5511](https://github.com/jupyterlab/jupyterlab/pull/5511))
- A \"New Folder\" option has been added to the file browser context
  menu ([#5447](https://github.com/jupyterlab/jupyterlab/pull/5447))
- The ANSI colors are now the same as those in the classic notebook
  ([#5336](https://github.com/jupyterlab/jupyterlab/pull/5336),
  [#3773](https://github.com/jupyterlab/jupyterlab/issues/3773))
- Send complete statements instead of current lines when stepping
  through code in a cell
  ([#6515](https://github.com/jupyterlab/jupyterlab/pull/6515),
  [#6063](https://github.com/jupyterlab/jupyterlab/pull/6063))
- Description list styles (`dl`, `dt`, `dd`) are improved to be
  consistent with the nteract project
  ([#5682](https://github.com/jupyterlab/jupyterlab/pull/5682),
  [#2399](https://github.com/jupyterlab/jupyterlab/issues/2399))

### Settings

- The settings system has been rewritten
  ([#5470](https://github.com/jupyterlab/jupyterlab/pull/5470),
  [#5298](https://github.com/jupyterlab/jupyterlab/issues/5298)) and
  now uses json5 as the syntax, which supports comments and other
  features for better human readability
  ([#6343](https://github.com/jupyterlab/jupyterlab/pull/6343),
  [#6199](https://github.com/jupyterlab/jupyterlab/issues/6199)).
- The keyboard shortcut system has been rewritten and now displays a
  list of system commands in the settings comments
  ([#5812](https://github.com/jupyterlab/jupyterlab/pull/5812),
  [#5562](https://github.com/jupyterlab/jupyterlab/issues/5562)).

There are new settings for many following items, including:

- Adds an option to shut down terminals and notebook kernels when they
  are closed
  ([#6285](https://github.com/jupyterlab/jupyterlab/pull/6285),
  [#6275](https://github.com/jupyterlab/jupyterlab/pull/6275))
- Scrolling past the end of a notebooks and text editor document
  ([#5542](https://github.com/jupyterlab/jupyterlab/pull/5542),
  [#5271](https://github.com/jupyterlab/jupyterlab/issues/5271),
  [#5652](https://github.com/jupyterlab/jupyterlab/pull/5652),
  [#4429](https://github.com/jupyterlab/jupyterlab/issues/4429))
- Text editor code folding, rulers, and active line highlighting
  ([#5761](https://github.com/jupyterlab/jupyterlab/pull/5761),
  [#4083](https://github.com/jupyterlab/jupyterlab/issues/4083),
  [#5750](https://github.com/jupyterlab/jupyterlab/pull/5750),
  [#4179](https://github.com/jupyterlab/jupyterlab/issues/4179),
  [#5529](https://github.com/jupyterlab/jupyterlab/pull/5529),
  [#5528](https://github.com/jupyterlab/jupyterlab/issues/5528))
- Markdown viewer options
  ([#5901](https://github.com/jupyterlab/jupyterlab/pull/5901),
  [#3940](https://github.com/jupyterlab/jupyterlab/issues/3940))
- Terminal scrollback and other settings
  ([#5609](https://github.com/jupyterlab/jupyterlab/pull/5609),
  [#3985](https://github.com/jupyterlab/jupyterlab/issues/3985))
- The autosave interval
  ([#5645](https://github.com/jupyterlab/jupyterlab/pull/5645),
  [#5619](https://github.com/jupyterlab/jupyterlab/issues/5619))
- The file browser showing the current active file
  ([#5698](https://github.com/jupyterlab/jupyterlab/pull/5698),
  [#4258](https://github.com/jupyterlab/jupyterlab/issues/4258))
- Custom scrollbar styling for dark themes
  ([#6026](https://github.com/jupyterlab/jupyterlab/pull/6026),
  [#4867](https://github.com/jupyterlab/jupyterlab/issues/4867))

### Command Line Changes

- Installing extensions will be quieter and adds a `--debug` to
  extension installing
  ([#6567](https://github.com/jupyterlab/jupyterlab/pull/6567),
  [#6499](https://github.com/jupyterlab/jupyterlab/issues/6499),
  [#5986](https://github.com/jupyterlab/jupyterlab/issues/5986))
- We now support running JupyterLab when its application directory is
  a symlink
  ([#6240](https://github.com/jupyterlab/jupyterlab/pull/6240),
  [#6166](https://github.com/jupyterlab/jupyterlab/issues/6166))
- Add `--all` flag to `labextension uninstall` to remove all
  extensions
  ([#6058](https://github.com/jupyterlab/jupyterlab/pull/6058),
  [#6006](https://github.com/jupyterlab/jupyterlab/issues/6006))
- Adds the ability to override the base URLs from the config
  ([#5518](https://github.com/jupyterlab/jupyterlab/pull/5518),
  [#5503](https://github.com/jupyterlab/jupyterlab/pull/5503))
- Updates to workspaces CLI command
  ([#6473](https://github.com/jupyterlab/jupyterlab/pull/6473),
  [#5977](https://github.com/jupyterlab/jupyterlab/issues/5977),
  [#6276](https://github.com/jupyterlab/jupyterlab/pull/6276),
  [#6234](https://github.com/jupyterlab/jupyterlab/pull/6234),
  [#6210](https://github.com/jupyterlab/jupyterlab/issues/6210),
  [#5975](https://github.com/jupyterlab/jupyterlab/pull/5975),
  [#5695](https://github.com/jupyterlab/jupyterlab/pull/5695),
  [#5694](https://github.com/jupyterlab/jupyterlab/issues/5694))

### Extension Development Changes

- We have rewritten how extensions provide keyboard shortcuts and
  interact with the settings system. If you previously defined
  keyboard shortcuts or used the settings mechanism, you will need to
  update your extension
  ([#5470](https://github.com/jupyterlab/jupyterlab/pull/5470),
  [#5298](https://github.com/jupyterlab/jupyterlab/issues/5298))
- We have renamed the plugin type from `JupyterLabPlugin` to
  `JupyterFrontEndPlugin`. The application arg is also renamed from
  `JupyterLab` to `JupyterFrontEnd` and some its functionality has
  been moved to a separate `ILabShell` plugin
  ([#5845](https://github.com/jupyterlab/jupyterlab/pull/5845),
  [#5919](https://github.com/jupyterlab/jupyterlab/pull/5919))
- The lab shell `addToMainArea`, `addToLeftArea`, `addToTopArea`,
  `addToRightArea`, and `addToBottomArea` functions have been replaced
  with a single `add()` function that takes the area as an argument.
  Replace `addToMainArea(widget, options)` with
  `add(widget, 'main', options)`, etc.
  ([#5845](https://github.com/jupyterlab/jupyterlab/pull/5845))
- Rename `pageUrl` to `appUrl` in the server connection
  ([#6509](https://github.com/jupyterlab/jupyterlab/pull/6509),
  [#6508](https://github.com/jupyterlab/jupyterlab/issues/6508),
  [#6585](https://github.com/jupyterlab/jupyterlab/pull/6585),
  [#6584](https://github.com/jupyterlab/jupyterlab/issues/6584))
- `MainAreaWidget` instances now forward update requests to their
  `content`
  ([#6586](https://github.com/jupyterlab/jupyterlab/pull/6586),
  [#6571](https://github.com/jupyterlab/jupyterlab/issues/6571))
- The theme data attributes are renamed and moved to the document body
  element. If you are relying on these attributes in CSS to
  conditionally style based on the theme, you should update their
  names. For example `data-theme-light` is now `data-jp-theme-light`.
  ([#6566](https://github.com/jupyterlab/jupyterlab/pull/6566),
  [#6554](https://github.com/jupyterlab/jupyterlab/issues/6554))
- Extensions which require CSS should no longer import their CSS files
  into their Javascript files. Instead, they should specify a root CSS
  file in the `style` attribute in their `package.json`, and
  JupyterLab will automatically import that CSS file.
  ([#6533](https://github.com/jupyterlab/jupyterlab/pull/6533),
  [#6530](https://github.com/jupyterlab/jupyterlab/issues/6530),
  [#6395](https://github.com/jupyterlab/jupyterlab/pull/6395),
  [#6390](https://github.com/jupyterlab/jupyterlab/issues/6390))
- `Dialog.prompt` has been replaced by a number of type-specific
  dialogs such as `InputDialog.getString`, `InputDialog.getBoolean`,
  etc. ([#6522](https://github.com/jupyterlab/jupyterlab/pull/6522),
  [#6378](https://github.com/jupyterlab/jupyterlab/issues/6378),
  [#6327](https://github.com/jupyterlab/jupyterlab/pull/6327),
  [#6326](https://github.com/jupyterlab/jupyterlab/issues/6326))
- When a `RenderMime` widget is re-rendered, the default behavior is
  to remove any existing content in the DOM. This can be overridden if
  needed.
  ([#6513](https://github.com/jupyterlab/jupyterlab/pull/6513),
  [#6505](https://github.com/jupyterlab/jupyterlab/issues/6505),
  [#6497](https://github.com/jupyterlab/jupyterlab/issues/6497))
- We have updated our internal TypeScript version to 3.5.1 and our
  compile target to `ES2017`. Extensions may need to upgrade their
  TypeScript version and target as well.
  ([#6440](https://github.com/jupyterlab/jupyterlab/pull/6440),
  [#6224](https://github.com/jupyterlab/jupyterlab/pull/6224))
- We have updated the typings for some of the Kernel messages so that
  they better match the spec.
  ([#6433](https://github.com/jupyterlab/jupyterlab/pull/6433))
- A `connectionFailure` signal has been added to some of the manager
  classes, which can be used to detect when a connection to the server
  is lost
  ([#6399](https://github.com/jupyterlab/jupyterlab/pull/6399),
  [#6176](https://github.com/jupyterlab/jupyterlab/issues/6176),
  [#3324](https://github.com/jupyterlab/jupyterlab/issues/3324))
- Add rate limiting and polling utilities to `coreutils` to use for
  throttling and debouncing of API requests
  ([#6345](https://github.com/jupyterlab/jupyterlab/pull/6345),
  [#6346](https://github.com/jupyterlab/jupyterlab/issues/6346),
  [#6401](https://github.com/jupyterlab/jupyterlab/pull/6401),
  [#6305](https://github.com/jupyterlab/jupyterlab/pull/6305),
  [#6157](https://github.com/jupyterlab/jupyterlab/issues/6157),
  [#6192](https://github.com/jupyterlab/jupyterlab/pull/6192),
  [#6186](https://github.com/jupyterlab/jupyterlab/pull/6186),
  [#6141](https://github.com/jupyterlab/jupyterlab/pull/6141),
  [#3929](https://github.com/jupyterlab/jupyterlab/issues/3929),
  [#6141](https://github.com/jupyterlab/jupyterlab/pull/6141),
  [#3929](https://github.com/jupyterlab/jupyterlab/issues/3929),
  [#6186](https://github.com/jupyterlab/jupyterlab/pull/6186),
  [#6192](https://github.com/jupyterlab/jupyterlab/pull/6192),
  [#6401](https://github.com/jupyterlab/jupyterlab/pull/6401)
  ,[#6305](https://github.com/jupyterlab/jupyterlab/pull/6305),
  [#6157](https://github.com/jupyterlab/jupyterlab/issues/6157))
- Require session when instantiating terminal widget
  ([#6339](https://github.com/jupyterlab/jupyterlab/pull/6339),
  [#5061](https://github.com/jupyterlab/jupyterlab/issues/5061))
- Provides a signal to see what items are opened in a directory
  listing
  ([#6270](https://github.com/jupyterlab/jupyterlab/pull/6270),
  [#6269](https://github.com/jupyterlab/jupyterlab/issues/6269))
- Ads the ability to add widget above the main work area to a top
  header area
  ([#5936](https://github.com/jupyterlab/jupyterlab/pull/5936))
- Renames `contextMenuFirst` to `contextMenuHitTest` in the
  `JupyterFrontEnd`
  ([#5932](https://github.com/jupyterlab/jupyterlab/pull/5932))
- Removes the `initialCommand` arg from the terminal creation command.
  ([#5916](https://github.com/jupyterlab/jupyterlab/pull/5916))
- Adds `--jp-code-cursor-width0`, `--jp-code-cursor-width1`, and
  `--jp-code-cursor-width2` variables to the themes to support
  changing the cursor width if you change the font size
  ([#5898](https://github.com/jupyterlab/jupyterlab/pull/5898))
- Adds the ability to insert a new item to the toolbar before or after
  another item
  ([#5896](https://github.com/jupyterlab/jupyterlab/pull/5896),
  [#5894](https://github.com/jupyterlab/jupyterlab/issues/5894))
- Adds the ability for extensions to register new CodeMirror modes
  ([#5829](https://github.com/jupyterlab/jupyterlab/pull/5829))
- We have removed the `JUPYTERLAB_xxx_LOADER` Webpack loaders, instead
  you should use the loader directly in the URL as Webpack supports it
  ([#5709](https://github.com/jupyterlab/jupyterlab/pull/5709),
  [#4406](https://github.com/jupyterlab/jupyterlab/issues/4406))
- Adds the ability to handle fragments for document widgets
  ([#5630](https://github.com/jupyterlab/jupyterlab/pull/5630),
  [#5599](https://github.com/jupyterlab/jupyterlab/issues/5599))
- We have added a `@jupyterlab/ui-components` package that contains
  reusable React components to be used internally and in extensions.
  Feel free to use this to create extension UIs with consistent styles
  ([#5538](https://github.com/jupyterlab/jupyterlab/pull/5538))
- The `showErrorMessage` function now lets you customize the buttons
  it uses
  ([#5513](https://github.com/jupyterlab/jupyterlab/pull/5513))
- We now provide helpers for using React components within JupyterLab.
  If you were previously using `ReactElementWidget` you should switch
  to using `ReactWidget`.
  ([#5479](https://github.com/jupyterlab/jupyterlab/pull/5479),
  [#5766](https://github.com/jupyterlab/jupyterlab/issues/5766),
  [#6595](https://github.com/jupyterlab/jupyterlab/pull/6595),
  [#6595](https://github.com/jupyterlab/jupyterlab/pull/6595))
- The share link command has been moved to its own extension so that
  it can be overridden
  ([#5460](https://github.com/jupyterlab/jupyterlab/pull/5460),
  [#5388](https://github.com/jupyterlab/jupyterlab/issues/5388))
- Creating a new services session now requires passing a kernel model
  instead of a kernel instance
  ([#6503](https://github.com/jupyterlab/jupyterlab/pull/6503),
  [#6142](https://github.com/jupyterlab/jupyterlab/issues/6142))
- We upgraded the Webpack raw file loader. The new version of the raw
  loader exports ES2015 modules, so this may require changes in
  extensions that import files using the raw loader. For example, if
  you did `require('myfile.md')` to get the content of
  `myfile.md` as a string, you now should import it using
  ES2015 `import` syntax, or use
  `require(\'myfile.md\').default`.
- Widget factories now can support custom cloning behavior from an
  optional source widget
  ([#6060](https://github.com/jupyterlab/jupyterlab/pull/6060),
  [#6044](https://github.com/jupyterlab/jupyterlab/issues/6044))
- We have renamed the type `InstanceTracker` to `WidgetTracker`
  ([#6569](https://github.com/jupyterlab/jupyterlab/commit/da8e7bda5eebd22319f59e5abbaaa9917872a7e8)).
- In order to add widgets to the main area (e.g. as in the old XKCD
  extension tutorial), the correct syntax is now
  `app.shell.add(widget)` or `app.shell.add(widget, 'main')`, see
  [here](https://github.com/jupyterlab/jupyterlab/blob/da8e7bda5eebd22319f59e5abbaaa9917872a7e8/packages/application/src/shell.ts#L500).

## [v0.35.0](https://github.com/jupyterlab/jupyterlab/releases/tag/v0.35.0)

### October 3, 2018

See the [JupyterLab
0.35.0](https://github.com/jupyterlab/jupyterlab/milestone/18?closed=1)
milestone on GitHub for the full list of pull requests and issues
closed.

### Features

- A notebook cell can now be readonly, reflecting its `enabled`
  metadata.
  ([#5401](https://github.com/jupyterlab/jupyterlab/pull/5401),
  [#1312](https://github.com/jupyterlab/jupyterlab/issues/1312))
- Add \"Go To Line\" in the Edit menu for text editors.
  ([#5377](https://github.com/jupyterlab/jupyterlab/pull/5377))
- Sidebar panels can now be switched between left and right sidebars.
  Right-click on a sidebar tab to move it to the other sidebar.
  ([#5347](https://github.com/jupyterlab/jupyterlab/pull/5347),
  [#5054](https://github.com/jupyterlab/jupyterlab/issues/5054),
  [#3707](https://github.com/jupyterlab/jupyterlab/issues/3707))
- Make the sidebar a bit narrower, and make the minimum width
  adjustable from a theme.
  ([#5245](https://github.com/jupyterlab/jupyterlab/pull/5245))
- Populate the File, Export Notebook As\... submenu from the server
  nbconvert capabilities.
  ([#5217](https://github.com/jupyterlab/jupyterlab/pull/5217))
- Server contents managers can now tell JupyterLab to open files as
  notebooks. For example, several custom contents managers save and
  open notebooks as Markdown files.
  ([#5247](https://github.com/jupyterlab/jupyterlab/pull/5247),
  [#4924](https://github.com/jupyterlab/jupyterlab/issues/4924))
- Add a command-line interface for managing workspaces.
  ([#5166](https://github.com/jupyterlab/jupyterlab/pull/5166))
- Allow safe inline CSS styles in Markdown.
  ([#5012](https://github.com/jupyterlab/jupyterlab/pull/5012),
  [#1812](https://github.com/jupyterlab/jupyterlab/issues/1812))
- Add Quit to File menu when appropriate.
  ([#5226](https://github.com/jupyterlab/jupyterlab/pull/5226),
  [#5252](https://github.com/jupyterlab/jupyterlab/pull/5252),
  [#5246](https://github.com/jupyterlab/jupyterlab/issues/5246),
  [#5280](https://github.com/jupyterlab/jupyterlab/pull/5280))
- Rework extension manager user experience.
  ([#5147](https://github.com/jupyterlab/jupyterlab/pull/5147),
  [#5042](https://github.com/jupyterlab/jupyterlab/issues/5042))

### Dark theme

- Show a dark splash screen when using a dark theme.
  ([#5339](https://github.com/jupyterlab/jupyterlab/pull/5339),
  [#5338](https://github.com/jupyterlab/jupyterlab/issues/5338),
  [#5403](https://github.com/jupyterlab/jupyterlab/pull/5403))
- Fix code completion menu for a dark theme.
  ([#5364](https://github.com/jupyterlab/jupyterlab/pull/5364),
  [#5349](https://github.com/jupyterlab/jupyterlab/issues/5349))
- Style CSV viewer for a dark theme.
  ([#5304](https://github.com/jupyterlab/jupyterlab/pull/5304),
  [#3456](https://github.com/jupyterlab/jupyterlab/issues/3456))
- Make Matplotlib figures legible in a dark theme.
  ([#5232](https://github.com/jupyterlab/jupyterlab/pull/5232))
- Fix notebook cell dropdown legibility in a dark theme.
  ([#5168](https://github.com/jupyterlab/jupyterlab/issues/5168))

### Bug fixes

- Various save options in the file menu and toolbar are now disabled
  when a file is not writable.
  ([#5376](https://github.com/jupyterlab/jupyterlab/pull/5376),
  [#5391](https://github.com/jupyterlab/jupyterlab/pull/5391))
- Kernel selector dialog no longer cuts off kernel names.
  ([#5260](https://github.com/jupyterlab/jupyterlab/pull/5260),
  [#5181](https://github.com/jupyterlab/jupyterlab/issues/5181))
- Fix focus issues with the toolbar.
  ([#5344](https://github.com/jupyterlab/jupyterlab/pull/5344),
  [#5324](https://github.com/jupyterlab/jupyterlab/pull/5324),
  [#2995](https://github.com/jupyterlab/jupyterlab/issues/2995),
  [#5328](https://github.com/jupyterlab/jupyterlab/pull/5328))
- Fix toolbar button enabled/disabled status.
  ([#5278](https://github.com/jupyterlab/jupyterlab/pull/5278))
- Table alignment is now respected in Markdown.
  ([#5301](https://github.com/jupyterlab/jupyterlab/pull/5301),
  [#3180](https://github.com/jupyterlab/jupyterlab/issues/3180))
- Fix syntax highlighting for Markdown lists.
  ([#5297](https://github.com/jupyterlab/jupyterlab/pull/5297),
  [#2741](https://github.com/jupyterlab/jupyterlab/issues/2741))
- Use the current filebrowser instead of the default one for various
  commands.
  ([#5390](https://github.com/jupyterlab/jupyterlab/pull/5390))
- Fix escaping in link handling to conform to Markdown syntax. This
  means that spaces in link references now need to be encoded as
  `%20`.
  ([#5383](https://github.com/jupyterlab/jupyterlab/pull/5383),
  [#5340](https://github.com/jupyterlab/jupyterlab/pull/5340),
  [#5153](https://github.com/jupyterlab/jupyterlab/issues/5153))

### Build system

- Use Typescript 3.1.
  ([#5360](https://github.com/jupyterlab/jupyterlab/pull/5360))
- Use Lerna 3.2.1.
  ([#5262](https://github.com/jupyterlab/jupyterlab/pull/5262))
- Node \>=6.11.5 is now required.
  ([#5227](https://github.com/jupyterlab/jupyterlab/pull/5227))
- Pin vega-embed version to 3.18.2.
  ([#5342](https://github.com/jupyterlab/jupyterlab/pull/5342))
- Use Jest for services tests.
  ([#5251](https://github.com/jupyterlab/jupyterlab/pull/5251),
  [#5282](https://github.com/jupyterlab/jupyterlab/pull/5282))
- Make it easier for third party extensions to use the JupyterLab test
  app and testing utilities.
  ([#5415](https://github.com/jupyterlab/jupyterlab/pull/5415))
- Fix `jupyter lab clean` on Windows.
  ([#5400](https://github.com/jupyterlab/jupyterlab/pull/5400),
  [#5397](https://github.com/jupyterlab/jupyterlab/issues/5397))
- Fix `jupyter lab build` on NFS.
  ([#5237](https://github.com/jupyterlab/jupyterlab/pull/5237),
  [#5233](https://github.com/jupyterlab/jupyterlab/issues/5233))
- Build wheels for Python 3 only.
  ([#5287](https://github.com/jupyterlab/jupyterlab/pull/5287))
- Migrate to using `jupyterlab_server` instead of
  `jupyterlab_launcher` and fix the app example.
  ([#5316](https://github.com/jupyterlab/jupyterlab/pull/5316))
- Move Mathjax 2 typesetter to a library package.
  ([#5259](https://github.com/jupyterlab/jupyterlab/pull/5259),
  [#5257](https://github.com/jupyterlab/jupyterlab/issues/5257))

### For Developers

- Default toolbar buttons can be overridden, and mime renderers can
  now specify toolbar buttons.
  ([#5398](https://github.com/jupyterlab/jupyterlab/pull/5398),
  [#5370](https://github.com/jupyterlab/jupyterlab/pull/5370),
  [#5363](https://github.com/jupyterlab/jupyterlab/issues/5363))
- A JupyterLab application instance can now be given a document
  registry, service manager, and command linker.
  ([#5291](https://github.com/jupyterlab/jupyterlab/pull/5291))

## [v0.34.0](https://github.com/jupyterlab/jupyterlab/releases/tag/v0.34.0)

### August 18, 2018

See the [JupyterLab
0.34.0](https://github.com/jupyterlab/jupyterlab/milestone/16?closed=1)
milestone on GitHub for the full list of pull requests and issues
closed.

### Key Features

- Notebooks, consoles, and text files now have access to completions
  for local tokens.
- Python 3.5+ is now required to use JupyterLab. Python 2 kernels can
  still be run within JupyterLab.
- Added the pipe (`|`) character as a CSV delimiter option.
- Added \"Open From Path\...\"\" to top level `File` menu.
- Added \"Copy Download Link\" to context menu for files.

### Changes for Developers

- Notebooks, consoles, and text files now have access to completions
  for local tokens. If a text file has a running kernel associated
  with its path (as happens with an attached console), it also gets
  completions and tooltips from that kernel.
  ([#5049](https://github.com/jupyterlab/jupyterlab/pull/5049))

- The `FileBrowser` widget has a new constructor option
  `refreshInterval`, allowing the creator to customize how often the
  widget polls the storage backend. This can be useful to prevent
  rate-limiting in certain contexts.
  ([#5048](https://github.com/jupyterlab/jupyterlab/pull/5048))

- The application shell now gets a pair of CSS data attributes
  indicating the current theme, and whether it is light or dark.
  Extension authors can write CSS rules targeting these to have their
  extension UI elements respond to the application theme. For
  instance, to write a rule targeting whether the theme is overall
  light or dark, you can use

  ```css
  [data-theme-light='true'] your-ui-class {
    background-color: white;
  }
  [data-theme-light='false'] your-ui-class {
    background-color: black;
  }
  ```

  The theme name can also be targeted by writing CSS rules for
  `data-theme-name`.
  ([#5078](https://github.com/jupyterlab/jupyterlab/pull/5078))

- The `IThemeManager` interface now exposes a signal for
  `themeChanged`, allowing extension authors to react to changes in
  the theme. Theme extensions must also provide a new boolean property
  `isLight`, declaring whether they are broadly light colored. This
  data allows third-party extensions to react better to the active
  application theme.
  ([#5078](https://github.com/jupyterlab/jupyterlab/pull/5078))

- Added a patch to update the `uploads` for each `FileBrowserModel`
  instantly whenever a file upload errors. Previously, the upload that
  erred was only being removed from uploads upon an update. This would
  allow the status bar component and other extensions that use the
  `FileBrowserModel` to be more precise.
  ([#5077](https://github.com/jupyterlab/jupyterlab/pull/5077))

- Cell IDs are now passed in the shell message as part of the cell
  metadata when a cell is executed. This helps in developing reactive
  kernels.
  ([#5033](https://github.com/jupyterlab/jupyterlab/pull/5033))

- The IDs of all deleted cells since the last run cell are now passed
  as part of the cell metadata on execution. The IDs of deleted cells
  since the last run cell are stored as `deletedCells` in
  `NotebookModel`. This helps in developing reactive kernels.
  ([#5037](https://github.com/jupyterlab/jupyterlab/pull/5037))

- The `ToolbarButton` in `apputils` has been refactored with an API
  change and now uses a React component `ToolbarButtonComponent` to
  render its children. It is now a `div` with a single `button` child,
  which in turn as two `span` elements for an icon and text label.
  Extensions that were using the `className` options should rename it
  as `iconClassName`. The `className` options still exists, but it
  used as the CSS class on the `button` element itself. The API
  changes were done to accommodate styling changes to the button.
  ([#5117](https://github.com/jupyterlab/jupyterlab/pull/5117))

- The `Toolbar.createFromCommand` function has been replaced by a
  dedicated `ToolbarButton` subclass called `CommandToolbarButton`,
  that wraps a similarly named React component.
  ([#5117](https://github.com/jupyterlab/jupyterlab/pull/5117))

- The design and styling of the right and left sidebars tabs has been
  improved to address
  [#5054](https://github.com/jupyterlab/jupyterlab/issues/50). We are
  now using icons to render tabs for the extensions we ship with
  JupyterLab and extension authors are encouraged to do the same (text
  labels still work). Icon based tabs can be used by removing
  `widget.caption` and adding
  `widget.iconClass = '<youriconclass> jp-SideBar-tabIcon';`.
  ([#5117](https://github.com/jupyterlab/jupyterlab/pull/5117))

- The style of buttons in JupyterLab has been updated to a borderless
  design.
  ([#5117](https://github.com/jupyterlab/jupyterlab/pull/5117))

- A new series of helper CSS classes for stying SVG-based icons at
  different sizes has been added: `jp-Icon`, `jp-Icon-16`,
  `jp-Icon-18`, `jp-Icon-20`.

- The rank of the default sidebar widget has been updated. The main
  change is giving the extension manager a rank of `1000` so that it
  appears at the end of the default items.

- Python 3.5+ is now required to use JupyterLab. Python 2 kernels can
  still be run within JupyterLab.
  ([#5119](https://github.com/jupyterlab/jupyterlab/pull/5119))

- JupyterLab now uses `yarn 1.9.4` (aliased as `jlpm`), which now
  allows uses to use Node 10+.
  ([#5121](https://github.com/jupyterlab/jupyterlab/pull/5121))

- Clean up handling of `baseUrl` and `wsURL` for `PageConfig` and
  `ServerConnection`.
  ([#5111](https://github.com/jupyterlab/jupyterlab/pull/5111))

### Other Changes

- Added the pipe (`|`) character as a CSV delimiter option.
  ([#5112](https://github.com/jupyterlab/jupyterlab/pull/5112))
- Added `Open From Path...` to top level `File` menu.
  ([#5108](https://github.com/jupyterlab/jupyterlab/pull/5108))
- Added a `saveState` signal to the document context object.
  ([#5096](https://github.com/jupyterlab/jupyterlab/pull/5096))
- Added \"Copy Download Link\" to context menu for files.
  ([#5089](https://github.com/jupyterlab/jupyterlab/pull/5089))
- Extensions marked as `deprecated` are no longer shown in the
  extension manager.
  ([#5058](https://github.com/jupyterlab/jupyterlab/pull/5058))
- Remove `In` and `Out` text from cell prompts. Shrunk the prompt
  width from 90px to 64px. In the light theme, set the prompt colors
  of executed console cells to active prompt colors and reduced their
  opacity to 0.5. In the dark theme, set the prompt colors of executed
  console cells to active prompt colors and set their opacity to 1.
  ([#5097](https://github.com/jupyterlab/jupyterlab/pull/5097) and
  [#5130](https://github.com/jupyterlab/jupyterlab/pull/5130))

### Bug Fixes

- Fixed a bug in the rendering of the \"New Notebook\" item of the
  command palette.
  ([#5079](https://github.com/jupyterlab/jupyterlab/pull/5079))
- We only create the extension manager widget if it is enabled. This
  prevents unnecessary network requests to `npmjs.com`.
  ([#5075](https://github.com/jupyterlab/jupyterlab/pull/5075))
- The `running` panel now shows the running sessions at startup.
  ([#5118](https://github.com/jupyterlab/jupyterlab/pull/5118))
- Double clicking a file in the file browser always opens it rather
  than sometimes selecting it for a rename.
  ([#5101](https://github.com/jupyterlab/jupyterlab/pull/5101))

## [v0.33.0](https://github.com/jupyterlab/jupyterlab/releases/tag/v0.33.0)

### July 26, 2018

See the [JupyterLab
0.33.0](https://github.com/jupyterlab/jupyterlab/milestone/12?closed=1)
milestone on GitHub for the full list of pull requests and issues
closed.

### Key Features:

- [No longer in beta](#no-longer-in-beta)
- [Workspaces](#workspaces)
- [Menu items](#menu-items)
- [Keyboard shortcuts](#keyboard-shorcuts)
- [Command palette items](#command-palette-items)
- [Settings](#settings)
- [Larger file uploads](#larger-size-uploads)
- [Extension management and installation](#extension-manager)
- [Interface changes](#interface-changes)
- [Renderers](#renderers)
- [Changes for developers](#changes-for-developers)
- [Other fixes](#other-fixes)

### No longer in beta

In JupyterLab 0.33, we removed the "Beta" label to better signal that
JupyterLab is ready for users to use on a daily basis. The extension
developer API is still being stabilized. See the release blog post for
details.
([#4898](https://github.com/jupyterlab/jupyterlab/issues/4898),
[#4920](https://github.com/jupyterlab/jupyterlab/pull/4920))

### Workspaces

We added new workspace support, which enables you to have multiple saved
layouts, including in different browser windows. See the
`workspace documentation` for more details.
([#4502](https://github.com/jupyterlab/jupyterlab/issues/4502),
[#4708](https://github.com/jupyterlab/jupyterlab/pull/4708),
[#4088](https://github.com/jupyterlab/jupyterlab/issues/4088),
[#4041](https://github.com/jupyterlab/jupyterlab/pull/4041)
[#3673](https://github.com/jupyterlab/jupyterlab/issues/3673),
[#4780](https://github.com/jupyterlab/jupyterlab/pull/4780))

### Menu items

- "Activate Previously Used Tab" added to the Tab menu
  (`Ctrl/Cmd Shift '`) to toggle between the previously active tabs in
  the main area.
  ([#4296](https://github.com/jupyterlab/jupyterlab/pull/4296))
- "Reload From Disk" added to the File menu to reload an open file
  from the state saved on disk.
  ([#4615](https://github.com/jupyterlab/jupyterlab/pull/4615))
- "Save Notebook with View State" added to the File menu to persist
  the notebook collapsed and scrolled cell state. We now read the
  `collapsed`, `scrolled`, `jupyter.source_hidden` and
  `jupyter.outputs_hidden` notebook cell metadata when opening.
  `collapsed` and `jupyter.outputs_hidden` are redundant and the
  initial collapsed state is the union of both of them. When the state
  is persisted, if an output is collapsed, both will be written with
  the value `true`, and if it is not, both will not be written.
  ([#3981](https://github.com/jupyterlab/jupyterlab/pull/3981))
- "Increase/Decrease Font Size" added to the text editor settings
  menu. ([#4811](https://github.com/jupyterlab/jupyterlab/pull/4811))
- "Show in File Browser" added to a document tab's context menu.
  ([#4500](https://github.com/jupyterlab/jupyterlab/pull/4500))
- "Open in New Browser Tab" added to the file browser context menu.
  ([#4315](https://github.com/jupyterlab/jupyterlab/pull/4315))
- "Copy Path" added to file browser context menu to copy the
  document's path to the clipboard.
  ([#4582](https://github.com/jupyterlab/jupyterlab/pull/4582))
- "Show Left Area" has been renamed to "Show Left Sidebar" for
  consistency (same for right sidebar).
  ([#3818](https://github.com/jupyterlab/jupyterlab/pull/3818))

### Keyboard shortcuts

- "Save As..." given the keyboard shortcut `Ctrl/Cmd Shift S`.
  ([#4560](https://github.com/jupyterlab/jupyterlab/pull/4560))
- "Run All Cells" given the keyboard shortcut `Ctrl/Cmd Shift Enter`.
  ([#4558](https://github.com/jupyterlab/jupyterlab/pull/4558))
- "notebook:change-to-cell-heading-X" keyboard shortcuts (and
  commands) renamed to "notebook:change-cell-to-heading-X" for
  X=1...6. This fixes the notebook command-mode keyboard shortcuts for
  changing headings.
  ([#4430](https://github.com/jupyterlab/jupyterlab/pull/4430))
- The console execute shortcut can now be set to either `Enter` or
  `Shift Enter` as a Console setting.
  ([#4054](https://github.com/jupyterlab/jupyterlab/pull/4054))

### Command palette items

- "Notebook" added to the command palette to open a new notebook.
  ([#4812](https://github.com/jupyterlab/jupyterlab/pull/4812))

- "Run Selected Text or Current Line in Console" added to the command
  palette to run the selected text or current line from a notebook in
  a console. A default keyboard shortcut for this command is not yet
  provided, but can be added by users with the
  `notebook:run-in-console` command. To add a keyboard shortcut
  `Ctrl G` for this command, use the "Settings" \| "Advanced Settings
  Editor" menu item to open the "Keyboard Shortcuts" advanced
  settings, and add the following JSON in the shortcut JSON object in
  the User Overrides pane (adjust the actual keyboard shortcut if you
  wish).
  ([#3453](https://github.com/jupyterlab/jupyterlab/issues/3453),
  [#4206](https://github.com/jupyterlab/jupyterlab/issues/4206),
  [#4330](https://github.com/jupyterlab/jupyterlab/pull/4330))

  ```json
  {
    "command": "notebook:run-in-console",
    "keys": ["Ctrl G"],
    "selector": ".jp-Notebook.jp-mod-editMode"
  }
  ```

- The command palette now renders labels, toggled state, and keyboard
  shortcuts in a more consistent and correct way.
  ([#4533](https://github.com/jupyterlab/jupyterlab/pull/4533),
  [#4510](https://github.com/jupyterlab/jupyterlab/pull/4510))

### Settings

- "fontFamily", "fontSize", and "lineHeight" settings added to the
  text editor advanced settings.
  ([#4673](https://github.com/jupyterlab/jupyterlab/pull/4673))
- Solarized dark and light text editor themes from CodeMirror.
  ([#4445](https://github.com/jupyterlab/jupyterlab/pull/4445))

### Larger file uploads

- Support for larger file uploads (\>15MB) when using Jupyter notebook
  server version \>= 5.1.
  ([#4224](https://github.com/jupyterlab/jupyterlab/pull/4224))

### Extension management and installation

- New extension manager for installing JupyterLab extensions from npm
  within the JupyterLab UI. You can enable this from the Advanced
  Settings interface.
  ([#4682](https://github.com/jupyterlab/jupyterlab/pull/4682),
  [#4925](https://github.com/jupyterlab/jupyterlab/pull/4925))
- Please note that to install extensions in JupyterLab, you must use
  NodeJS version 9 or earlier (i.e., not NodeJS version 10). We will
  upgrade yarn, with NodeJS version 10 support, when a [bug in
  yarn](https://github.com/yarnpkg/yarn/issues/5935) is fixed.
  ([#4804](https://github.com/jupyterlab/jupyterlab/pull/4804))

### Interface changes

- Wider tabs in the main working area to show longer filenames.
  ([#4801](https://github.com/jupyterlab/jupyterlab/pull/4801))
- Initial kernel selection for a notebook or console can no longer be
  canceled: the user must select a kernel.
  ([#4596](https://github.com/jupyterlab/jupyterlab/pull/4596))
- Consoles now do not display output from other clients by default. A
  new "Show All Kernel Activity" console context menu item has been
  added to show all activity from a kernel in the console.
  ([#4503](https://github.com/jupyterlab/jupyterlab/pull/4503))
- The favicon now shows the busy status of the kernels in JupyterLab.
  ([#4361](https://github.com/jupyterlab/jupyterlab/pull/4361),
  [#3957](https://github.com/jupyterlab/jupyterlab/issues/3957),
  [#4966](https://github.com/jupyterlab/jupyterlab/pull/4966))

### Renderers

- JupyterLab now ships with a Vega4 renderer by default (upgraded from
  Vega3).
  ([#4806](https://github.com/jupyterlab/jupyterlab/pull/4806))
- The HTML sanitizer now allows some extra tags in rendered HTML,
  including `kbd`, `sup`, and `sub`.
  ([#4618](https://github.com/jupyterlab/jupyterlab/pull/4618))
- JupyterLab now recognizes the `.tsv` file extension as tab-separated
  files.
  ([#4684](https://github.com/jupyterlab/jupyterlab/pull/4684))
- Javascript execution in notebook cells has been re-enabled.
  ([#4515](https://github.com/jupyterlab/jupyterlab/pull/4682))

### Changes for developers

- A new signal for observing application dirty status state changes.
  ([#4840](https://github.com/jupyterlab/jupyterlab/issues/4840))
- A new signal for observing notebook cell execution.
  ([#4740](https://github.com/jupyterlab/jupyterlab/issues/4740),
  [#4744](https://github.com/jupyterlab/jupyterlab/pull/4744))
- A new `anyMessage` signal for observing any message a kernel sends
  or receives.
  ([#4437](https://github.com/jupyterlab/jupyterlab/pull/4437))
- A generic way for different widgets to register a "Save with extras"
  command that appears in the File menu under save.
  ([#3981](https://github.com/jupyterlab/jupyterlab/pull/3981))
- A new API for removing groups from a JupyterLab menu. `addGroup` now
  returns an `IDisposable` which can be used to remove the group.
  `removeGroup` has been removed.
  ([#4890](https://github.com/jupyterlab/jupyterlab/pull/4890))
- The `Launcher` now uses commands from the application
  `CommandRegistry` to launch new activities. Extension authors that
  add items to the launcher will need to update them to use commands.
  ([#4757](https://github.com/jupyterlab/jupyterlab/pull/4757))
- There is now a top-level `addToBottomArea` function in the
  application, allowing extension authors to add bottom panel items
  like status bars.
  ([#4752](https://github.com/jupyterlab/jupyterlab/pull/4752))
- Rendermime extensions can now indicate that they are the default
  rendered widget factory for a file-type. For instance, the default
  widget for a markdown file is a text editor, but the default
  rendered widget is the markdown viewer.
  ([#4692](https://github.com/jupyterlab/jupyterlab/pull/4692))
- Add new workspace REST endpoints to `jupyterlab_server` and make
  them available in `@jupyterlab/services`.
  ([#4841](https://github.com/jupyterlab/jupyterlab/pull/4841))
- Documents created with a mimerenderer extension can now be accessed
  using an `IInstanceTracker` which tracks them. Include the token
  `IMimeDocumentTracker` in your plugin to access this. The
  `IInstanceTracker` interface has also gained convenience functions
  `find` and `filter` to simplify iterating over instances.
  ([#4762](https://github.com/jupyterlab/jupyterlab/pull/4762))
- RenderMime render errors are now displayed to the user.
  ([#4465](https://github.com/jupyterlab/jupyterlab/pull/4465))
- `getNotebookVersion` is added to the `PageConfig` object.
  ([#4224](https://github.com/jupyterlab/jupyterlab/pull/4224))
- The session `kernelChanged` signal now contains both the old kernel
  and the new kernel to make it easy to unregister things from the old
  kernel.
  ([#4834](https://github.com/jupyterlab/jupyterlab/pull/4834))
- The `connectTo` functions for connecting to kernels and sessions are
  now synchronous (returning a connection immediately rather than a
  promise). The DefaultSession `clone` and `update` methods are also
  synchronous now.
  ([#4725](https://github.com/jupyterlab/jupyterlab/pull/4725))
- Kernel message processing is now asynchronous, which guarantees the
  order of processing even if a handler is asynchronous. If a kernel
  message handler returns a promise, kernel message processing is
  paused until the promise resolves. The kernel's `anyMessage` signal
  is emitted synchronously when a message is received before
  asynchronous message handling, and the `iopubMessage` and
  `unhandledMessage` signals are emitted during asynchronous message
  handling. These changes mean that the comm `onMsg` and `onClose`
  handlers and the kernel future `onReply`, `onIOPub`, and `onStdin`
  handlers, as well as the comm target and message hook handlers, may
  be asynchronous and return promises.
  ([#4697](https://github.com/jupyterlab/jupyterlab/pull/4697))
- Kernel comm targets and message hooks now are unregistered with
  `removeCommTarget` and `removeMessageHook`, instead of using
  disposables. The corresponding `registerCommTarget` and
  `registerMessageHook` functions now return nothing.
  ([#4697](https://github.com/jupyterlab/jupyterlab/pull/4697))
- The kernel `connectToComm` function is synchronous, and now returns
  the comm rather than a promise to the comm.
  ([#4697](https://github.com/jupyterlab/jupyterlab/pull/4697))
- The `KernelFutureHandler` class `expectShell` constructor argument
  is renamed to `expectReply`.
  ([#4697](https://github.com/jupyterlab/jupyterlab/pull/4697))
- The kernel future `done` returned promise now resolves to undefined
  if there is no reply message.
  ([#4697](https://github.com/jupyterlab/jupyterlab/pull/4697))
- The `IDisplayDataMsg` is updated to have the optional `transient`
  key, and a new `IUpdateDisplayDataMsg` type was added for update
  display messages.
  ([#4697](https://github.com/jupyterlab/jupyterlab/pull/4697))
- The `uuid` function from `@jupyterlab/coreutils` is removed. Instead
  import `UUID` from `@phosphor/coreutils` and use `UUID.uuid4()` .
  ([#4604](https://github.com/jupyterlab/jupyterlab/pull/4604))
- Main area widgets like the launcher and console inherit from a
  common `MainAreaWidget` class which provides a content area
  (`.content`) and a toolbar (`.toolbar`), consistent focus handling
  and activation behavior, and a spinner displayed until the given
  `reveal` promise is resolved. Document widgets, like the notebook
  and text editor and other documents opened from the document
  manager, implement the `IDocumentWidget` interface (instead of
  `DocumentRegistry.IReadyWidget`), which builds on `MainAreaWidget`
  and adds a `.context` attribute for the document context and makes
  dirty handling consistent. Extension authors may consider inheriting
  from the `MainAreaWidget` or `DocumentWidget` class for consistency.
  Several effects from these changes are noted below.
  ([#3499](https://github.com/jupyterlab/jupyterlab/pull/3499),
  [#4453](https://github.com/jupyterlab/jupyterlab/pull/4453))
  - The notebook panel `.notebook` attribute is renamed to
    `.content`.
  - The text editor is now the `.content` of a `DocumentWidget`, so
    the top-level editor widget has a toolbar and the editor itself
    is `widget.content.editor` rather than just `widget.editor`.
  - Mime documents use a `MimeContent` widget embedded inside of a
    `DocumentWidget` now.
  - Main area widgets and document widgets now have a `revealed`
    promise which resolves when the widget has been revealed (i.e.,
    the spinner has been removed). This should be used instead of
    the `ready` promise.

Changes in the JupyterLab code infrastructure include:

- The JupyterLab TypeScript codebase is now compiled to ES2015 (ES6)
  using TypeScript 2.9. We also turned on the TypeScript
  `esModuleInterop` flag to enable more natural imports from
  non-es2015 JavaScript modules. With the update to ES2015 output,
  code generated from async/await syntax became much more manageable,
  so we have started to use async/await liberally throughout the
  codebase, especially in tests. Because we use Typedoc for API
  documentation, we still use syntax compatible with TypeScript 2.7
  where Typedoc is used. Extension authors may have some minor
  compatibility updates to make. If you are writing an extension in
  TypeScript, we recommend updating to TypeScript 2.9 and targeting
  ES2015 output as well.
  ([#4462](https://github.com/jupyterlab/jupyterlab/pull/4462),
  [#4675](https://github.com/jupyterlab/jupyterlab/pull/4675),
  [#4714](https://github.com/jupyterlab/jupyterlab/pull/4714),
  [#4797](https://github.com/jupyterlab/jupyterlab/pull/4797))
- The JupyterLab codebase is now formatted using
  [Prettier](https://github.com/prettier/prettier). By default the
  development environment installs a pre-commit hook that formats your
  staged changes.
  ([#4090](https://github.com/jupyterlab/jupyterlab/pull/4090))
- Updated build infrastructure using webpack 4 and better typing.
  ([#4702](https://github.com/jupyterlab/jupyterlab/pull/4702),
  [#4698](https://github.com/jupyterlab/jupyterlab/pull/4698))
- Upgraded yarn to version 1.6. Please note that you must use NodeJS
  version 9 or earlier with JupyterLab (i.e., not NodeJS version 10).
  We will upgrade yarn, with NodeJS version 10 support, when a [bug in
  yarn](https://github.com/yarnpkg/yarn/issues/5935) is fixed.
  ([#4804](https://github.com/jupyterlab/jupyterlab/pull/4804))
- Various process utilities were moved to `jupyterlab_server`.
  ([#4696](https://github.com/jupyterlab/jupyterlab/pull/4696))

### Other fixes

- Fixed a rendering bug with the Launcher in single-document mode.
  ([#4805](https://github.com/jupyterlab/jupyterlab/pull/4805))
- Fixed a bug where the native context menu could not be triggered in
  a notebook cell in Chrome.
  ([#4720](https://github.com/jupyterlab/jupyterlab/pull/4720))
- Fixed a bug where the cursor would not show up in the dark theme.
  ([#4699](https://github.com/jupyterlab/jupyterlab/pull/4699))
- Fixed a bug preventing relative links from working correctly in
  alternate `IDrive`s.
  ([#4613](https://github.com/jupyterlab/jupyterlab/pull/4613))
- Fixed a bug breaking the image viewer upon saving the image.
  ([#4602](https://github.com/jupyterlab/jupyterlab/pull/4602))
- Fixed the font size for code blocks in notebook Markdown headers.
  ([#4617](https://github.com/jupyterlab/jupyterlab/pull/4617))
- Prevented a memory leak when repeatedly rendering a Vega chart.
  ([#4904](https://github.com/jupyterlab/jupyterlab/pull/4904))
- Support dropped terminal connection re-connecting.
  ([#4763](https://github.com/jupyterlab/jupyterlab/issues/4763),
  [#4802](https://github.com/jupyterlab/jupyterlab/pull/4802))
- Use `require.ensure` in `vega4-extension` to lazily load
  `vega-embed` and its dependencies on first render.
  ([#4706](https://github.com/jupyterlab/jupyterlab/pull/4706))
- Relative links to documents that include anchor tags will now
  correctly scroll the document to the right place.
  ([#4692](https://github.com/jupyterlab/jupyterlab/pull/4692))
- Fix default settings JSON in setting editor.
  ([#4591](https://github.com/jupyterlab/jupyterlab/issues/4591),
  [#4595](https://github.com/jupyterlab/jupyterlab/pull/4595))
- Fix setting editor pane layout's stretch factor.
  ([#2971](https://github.com/jupyterlab/jupyterlab/issues/2971),
  [#4772](https://github.com/jupyterlab/jupyterlab/pull/4772))
- Programmatically set settings are now output with nicer formatting.
  ([#4870](https://github.com/jupyterlab/jupyterlab/pull/4870))
- Fixed a bug in displaying one-line CSV files.
  ([#4795](https://github.com/jupyterlab/jupyterlab/issues/4795),
  [#4796](https://github.com/jupyterlab/jupyterlab/pull/4796))
- Fixed a bug where JSON arrays in rich outputs were collapsed into
  strings.
  ([#4480](https://github.com/jupyterlab/jupyterlab/pull/4480))

## [Beta 2 (v0.32.0)](https://github.com/jupyterlab/jupyterlab/releases/tag/v0.32.0)

### Apr 16, 2018

This is the second in the JupyterLab Beta series of releases. It
contains many enhancements, bugfixes, and refinements, including:

- Better handling of a corrupted or invalid state database.
  ([#3619](https://github.com/jupyterlab/jupyterlab/issues/3619),
  [#3622](https://github.com/jupyterlab/jupyterlab/issues/3622),
  [#3687](https://github.com/jupyterlab/jupyterlab/issues/3687),
  [#4114](https://github.com/jupyterlab/jupyterlab/issues/4114)).
- Fixing file dirty status indicator.
  ([#3652](https://github.com/jupyterlab/jupyterlab/issues/3652)).
- New option for whether to autosave documents.
  ([#3734](https://github.com/jupyterlab/jupyterlab/issues/3734)).
- More commands in the notebook context menu.
  ([#3770](https://github.com/jupyterlab/jupyterlab/issues/3770),
  [#3909](https://github.com/jupyterlab/jupyterlab/issues/3909))
- Defensively checking for completion metadata from kernels.
  ([#3888](https://github.com/jupyterlab/jupyterlab/issues/3888))
- New "Shutdown all" button in the Running panel.
  ([#3764](https://github.com/jupyterlab/jupyterlab/issues/3764))
- Performance improvements wherein non-focused documents poll the
  server less.
  ([#3931](https://github.com/jupyterlab/jupyterlab/issues/3931))
- Changing the keyboard shortcut for singled-document-mode to
  something less easy to trigger.
  ([#3889](https://github.com/jupyterlab/jupyterlab/issues/3889))
- Performance improvements for rendering text streams, especially
  around progress bars.
  ([#4045](https://github.com/jupyterlab/jupyterlab/issues/4045)).
- Canceling a "Restart Kernel" now functions correctly.
  ([#3703](https://github.com/jupyterlab/jupyterlab/issues/3703)).
- Defer loading file contents until after the application has been
  restored.
  ([#4087](https://github.com/jupyterlab/jupyterlab/issues/4087)).
- Ability to rotate, flip, and invert images in the image viewer.
  ([#4000](https://github.com/jupyterlab/jupyterlab/issues/4000))
- Major performance improvements for large CSV viewing.
  ([#3997](https://github.com/jupyterlab/jupyterlab/issues/3997)).
- Always show the context menu in the file browser, even for an empty
  directory.
  ([#4264](https://github.com/jupyterlab/jupyterlab/issues/4264)).
- Handle asynchronous comm messages in the services library more
  correctly (Note: this means `@jupyterlab/services` is now at version
  2.0!)
  ([\[#4115\](https://github.com/jupyterlab/jupyterlab/issues/4115)](https://github.com/jupyterlab/jupyterlab/pull/4115)).
- Display the kernel banner in the console when a kernel is restarted
  to mark the restart
  ([\[#3663\](https://github.com/jupyterlab/jupyterlab/issues/3663)](https://github.com/jupyterlab/jupyterlab/pull/3663)).
- Many tweaks to the UI, as well as better error handling.

## [Beta 1 (v0.31.0)](https://github.com/jupyterlab/jupyterlab/releases/tag/v0.31.0)

### Jan 11, 2018

- Add a `/tree` handler and `Copy Shareable Link` to file listing
  right click menu:
  <https://github.com/jupyterlab/jupyterlab/pull/3396>
- Experimental support for saved workspaces:
  [#3490](https://github.com/jupyterlab/jupyterlab/issues/3490),
  [#3586](https://github.com/jupyterlab/jupyterlab/issues/3586)
- Added types information to the completer:
  [#3508](https://github.com/jupyterlab/jupyterlab/issues/3508)
- More improvements to the top level menus:
  <https://github.com/jupyterlab/jupyterlab/pull/3344>
- Editor settings for notebook cells:
  <https://github.com/jupyterlab/jupyterlab/pull/3441>
- Simplification of theme extensions:
  <https://github.com/jupyterlab/jupyterlab/pull/3423>
- New CSS variable naming scheme:
  <https://github.com/jupyterlab/jupyterlab/pull/3403>
- Improvements to cell selection and dragging:
  <https://github.com/jupyterlab/jupyterlab/pull/3414>
- Style and typography improvements:
  <https://github.com/jupyterlab/jupyterlab/pull/3468>
  <https://github.com/jupyterlab/jupyterlab/pull/3457>
  <https://github.com/jupyterlab/jupyterlab/pull/3445>
  <https://github.com/jupyterlab/jupyterlab/pull/3431>
  <https://github.com/jupyterlab/jupyterlab/pull/3428>
  <https://github.com/jupyterlab/jupyterlab/pull/3408>
  <https://github.com/jupyterlab/jupyterlab/pull/3418>

## [v0.30.0](https://github.com/jupyterlab/jupyterlab/releases/tag/v0.30.0)

### Dec 05, 2017

- Semantic menus: <https://github.com/jupyterlab/jupyterlab/pull/3182>
- Settings editor now allows comments and provides setting validation:
  <https://github.com/jupyterlab/jupyterlab/pull/3167>
- Switch to Yarn as the package manager:
  <https://github.com/jupyterlab/jupyterlab/pull/3182>
- Support for carriage return in outputs:
  [#2761](https://github.com/jupyterlab/jupyterlab/issues/2761)
- Upgrade to TypeScript 2.6:
  <https://github.com/jupyterlab/jupyterlab/pull/3288>
- Cleanup of the build, packaging, and extension systems.
  `jupyter labextension install` is now the recommended way to install
  a local directory. Local directories are considered linked to the
  application. cf <https://github.com/jupyterlab/jupyterlab/pull/3182>
- `--core-mode` and `--dev-mode` are now semantically different.
  `--core-mode` is a version of JupyterLab using released JavaScript
  packages and is what we ship in the Python package. `--dev-mode` is
  for unreleased JavaScript and shows the red banner at the top of the
  page. <https://github.com/jupyterlab/jupyterlab/pull/3270>

## [v0.29.2](https://github.com/jupyterlab/jupyterlab/releases/tag/v0.29.2)

### Nov 17, 2017

Bug fix for file browser right click handling.
<https://github.com/jupyterlab/jupyterlab/issues/3019>

## [v0.29.0](https://github.com/jupyterlab/jupyterlab/releases/tag/v0.29.0)

### Nov 09, 2017

- Create new view of cell in cell context menu.
  [#3159](https://github.com/jupyterlab/jupyterlab/issues/3159)
- New Renderers for VDOM and JSON mime types and files.
  [#3157](https://github.com/jupyterlab/jupyterlab/issues/3157)
- Switch to React for our VDOM implementation. Affects the
  `VDomRenderer` class.
  [#3133](https://github.com/jupyterlab/jupyterlab/issues/3133)
- Standalone Cell Example.
  [#3155](https://github.com/jupyterlab/jupyterlab/issues/3155)

## [v0.28.0](https://github.com/jupyterlab/jupyterlab/releases/tag/v0.28.0)

### Oct 16, 2017

This release generally focuses on developer and extension author
enhancements and general bug fixes.

- Plugin id and schema file conventions change.
  <https://github.com/jupyterlab/jupyterlab/pull/2936>.
- Theme authoring conventions change.
  [#3061](https://github.com/jupyterlab/jupyterlab/issues/3061)
- Enhancements to enabling and disabling of extensions.
  [#3078](https://github.com/jupyterlab/jupyterlab/issues/3078)
- Mime extensions API change (`name` -\> `id` and new naming
  convention).
  [#3078](https://github.com/jupyterlab/jupyterlab/issues/3078)
- Added a `jupyter lab --watch` mode for extension authors.
  [#3077](https://github.com/jupyterlab/jupyterlab/issues/3077)
- New comprehensive extension authoring tutorial.
  [#2921](https://github.com/jupyterlab/jupyterlab/issues/2921)
- Added the ability to use an alternate LaTeX renderer.
  [#2974](https://github.com/jupyterlab/jupyterlab/issues/2974)
- Numerous bug fixes and style enhancements.

## [v0.27.0](https://github.com/jupyterlab/jupyterlab/releases/tag/v0.27.0)

### Aug 23, 2017

- Added support for dynamic theme loading.
  <https://github.com/jupyterlab/jupyterlab/pull/2759>
- Added an application splash screen.
  <https://github.com/jupyterlab/jupyterlab/pull/2899>
- Enhancements to the settings editor.
  <https://github.com/jupyterlab/jupyterlab/pull/2784>
- Added a PDF viewer.
  [#2867](https://github.com/jupyterlab/jupyterlab/issues/2867)
- Numerous bug fixes and style improvements.

## [v0.26.0](https://github.com/jupyterlab/jupyterlab/releases/tag/v0.26.0)

### Jul 21, 2017

- Implemented server side handling of users settings:
  <https://github.com/jupyterlab/jupyterlab/pull/2585>
- Revamped the handling of file types in the application \* affects
  document and mime renderers:
  <https://github.com/jupyterlab/jupyterlab/pull/2701>
- Updated dialog API \* uses virtual DOM instead of raw DOM nodes and
  better use of the widget lifecycle:
  <https://github.com/jupyterlab/jupyterlab/pull/2661>

## [v0.25.0](https://github.com/jupyterlab/jupyterlab/releases/tag/v0.25.0)

### Jul 07, 2017

- Added a new extension type for mime renderers, with the
  `vega2-extension` as a built-in example. Also overhauled the
  rendermime interfaces.
  <https://github.com/jupyterlab/jupyterlab/pull/2488>
  <https://github.com/jupyterlab/jupyterlab/pull/2555>
  <https://github.com/jupyterlab/jupyterlab/pull/2595>
- Finished JSON-schema based settings system, using client-side
  storage for now.
  <https://github.com/jupyterlab/jupyterlab/pull/2411>
- Overhauled the launcher design.
  <https://github.com/jupyterlab/jupyterlab/pull/2506>
  <https://github.com/jupyterlab/jupyterlab/pull/2580>
- Numerous bug fixes and style updates.

## [v0.24.0](https://github.com/jupyterlab/jupyterlab/releases/tag/v0.24.0)

### Jun 16, 2017

- Overhaul of the launcher.
  [#2380](https://github.com/jupyterlab/jupyterlab/issues/2380)
- Initial implementation of client-side settings system.
  [#2157](https://github.com/jupyterlab/jupyterlab/issues/2157)
- Updatable outputs.
  [#2439](https://github.com/jupyterlab/jupyterlab/issues/2439)
- Use new Phosphor Datagrid for CSV viewer.
  [#2433](https://github.com/jupyterlab/jupyterlab/issues/2433)
- Added ability to enable/disable extensions without rebuilding.
  [#2409](https://github.com/jupyterlab/jupyterlab/issues/2409)
- Added language and tab settings for the file viewer.
  [#2406](https://github.com/jupyterlab/jupyterlab/issues/2406)
- Improvements to real time collaboration experience.
  [#2387](https://github.com/jupyterlab/jupyterlab/issues/2387)
  [#2333](https://github.com/jupyterlab/jupyterlab/issues/2333)
- Compatibility checking for extensions.
  [#2410](https://github.com/jupyterlab/jupyterlab/issues/2410)
- Numerous bug fixes and style improvements.

## [v0.23.0](https://github.com/jupyterlab/jupyterlab/releases/tag/v0.23.0)

### Jun 02, 2017

- Chat box feature.
  <https://github.com/jupyterlab/jupyterlab/pull/2118>
- Collaborative cursors.
  <https://github.com/jupyterlab/jupyterlab/pull/2139>
- Added concept of Drive to ContentsManager.
  <https://github.com/jupyterlab/jupyterlab/pull/2248>
- Refactored to enable switching the theme.
  <https://github.com/jupyterlab/jupyterlab/pull/2283>
- Clean up the APIs around kernel execution.
  <https://github.com/jupyterlab/jupyterlab/pull/2266>
- Various bug fixes and style improvements.

## [v0.22.0](https://github.com/jupyterlab/jupyterlab/releases/tag/v0.22.0)

### May 18, 2017

- Export To... for notebooks.
  <https://github.com/jupyterlab/jupyterlab/pull/2200>
- Change kernel by clicking on the kernel name in the notebook.
  <https://github.com/jupyterlab/jupyterlab/pull/2195>
- Improved handling of running code in text editors.
  <https://github.com/jupyterlab/jupyterlab/pull/2191>
- Can select file in file browser by typing:
  <https://github.com/jupyterlab/jupyterlab/pull/2190>
- Ability to open a console for a notebook.
  <https://github.com/jupyterlab/jupyterlab/pull/2189>
- Upgrade to Phosphor 1.2 with Command Palette fuzzy matching
  improvements.
  [#1182](https://github.com/jupyterlab/jupyterlab/issues/1182)
- Rename of widgets that had `Widget` in the name and associated
  package names. <https://github.com/jupyterlab/jupyterlab/pull/2177>
- New `jupyter labhub` command to launch JupyterLab on JupyterHub:
  <https://github.com/jupyterlab/jupyterlab/pull/2222>
- Removed the `utils` from `@jupyterlab/services` in favor of
  `PageConfig` and `ServerConnection`.
  <https://github.com/jupyterlab/jupyterlab/pull/2173>
  <https://github.com/jupyterlab/jupyterlab/pull/2185>
- Cleanup, bug fixes, and style updates.

## [v0.20.0](https://github.com/jupyterlab/jupyterlab/releases/tag/v0.20.0)

### Apr 21, 2017

Release Notes:

- Overhaul of extension handling, see updated docs for
  [users](https://github.com/jupyterlab/jupyterlab/blob/dd83a2e4be8bf23c610c163afe4b480215514764/tutorial/extensions_user.md)
  and
  [developers](https://github.com/jupyterlab/jupyterlab/blob/dd83a2e4be8bf23c610c163afe4b480215514764/tutorial/extensions_dev.md).
  <https://github.com/jupyterlab/jupyterlab/pull/2023>
- Added single document mode and a `Tabs` sidebar.
  <https://github.com/jupyterlab/jupyterlab/pull/2037>
- More work toward real time collaboration \* implemented a model
  database interface that can be in-memory by real time backends.
  <https://github.com/jupyterlab/jupyterlab/pull/2039>

Numerous bug fixes and improvements.

## [v0.19.0](https://github.com/jupyterlab/jupyterlab/releases/tag/v0.19.0)

### Apr 04, 2017

Mainly backend-focused release with compatibility with Phosphor 1.0 and
a big refactor of session handling (the ClientSession class) that
provides a simpler object for classes like notebooks, consoles,
inspectors, etc. to use to communicate with the API. Also includes
improvements to the development workflow of JupyterLab itself after the
big split.

<https://github.com/jupyterlab/jupyterlab/pull/1984>
<https://github.com/jupyterlab/jupyterlab/pull/1927>

## [v0.18.0](https://github.com/jupyterlab/jupyterlab/releases/tag/v0.18.0)

### Mar 21, 2017

- Split the repository into multiple packages that are managed using
  the lerna build tool.
  <https://github.com/jupyterlab/jupyterlab/issues/1773>
- Added restoration of main area layout on refresh.
  <https://github.com/jupyterlab/jupyterlab/pull/1880>
- Numerous bug fixes and style updates.

## [v0.17.0](https://github.com/jupyterlab/jupyterlab/releases/tag/v0.17.0)

### Mar 01, 2017

- Upgrade to new `@phosphor` packages \* brings a new Command Palette
  interaction that should be more intuitive, and restores the ability
  to drag to dock panel edges
  <https://github.com/jupyterlab/jupyterlab/pull/1762>.
- Refactor of `RenderMime` and associated renders to use live models.
  See <https://github.com/jupyterlab/jupyterlab/pull/1709> and
  <https://github.com/jupyterlab/jupyterlab/issues/1763>.
- Improvements and bug fixes for the completer widget:
  <https://github.com/jupyterlab/jupyterlab/pull/1778>
- Upgrade CodeMirror to 5.23:
  <https://github.com/jupyterlab/jupyterlab/pull/1764>
- Numerous style updates and bug fixes.

## [v0.16.0](https://github.com/jupyterlab/jupyterlab/releases/tag/v0.16.0)

### Feb 09, 2017

- Adds a Cell Tools sidebar that allows you to edit notebook cell
  metadata.
  [#1586](https://github.com/jupyterlab/jupyterlab/issues/1586).
- Adds keyboard shortcuts to switch between tabs (Cmd/Ctrl LeftArrow
  and Cmd/Ctrl RightArrow).
  [#1647](https://github.com/jupyterlab/jupyterlab/issues/1647)
- Upgrades to xterm.js 2.3.
  [#1664](https://github.com/jupyterlab/jupyterlab/issues/1664)
- Fixes a bug in application config, but lab extensions will need to
  be re-enabled.
  [#1607](https://github.com/jupyterlab/jupyterlab/issues/1607)
- Numerous other bug fixes and style improvements.
