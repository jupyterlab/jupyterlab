# JupyterLab 3.x Changelog

## v3.6

### 3.6.3

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.6.2...639a54c6b8ae9e8375f952d38539a233447aca73))

#### Maintenance and upkeep improvements

- Bump lumino 1.x [#14286](https://github.com/jupyterlab/jupyterlab/pull/14286) ([@fcollonval](https://github.com/fcollonval))
- Provide @jupyterlab/shared-models as singleton [#14229](https://github.com/jupyterlab/jupyterlab/pull/14229) ([@fcollonval](https://github.com/fcollonval))

#### Documentation improvements

- Provide @jupyterlab/shared-models as singleton [#14229](https://github.com/jupyterlab/jupyterlab/pull/14229) ([@fcollonval](https://github.com/fcollonval))

#### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2023-03-20&to=2023-03-30&type=c))

[@andrii-i](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aandrii-i+updated%3A2023-03-20..2023-03-30&type=Issues) | [@bollwyvl](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Abollwyvl+updated%3A2023-03-20..2023-03-30&type=Issues) | [@brichet](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Abrichet+updated%3A2023-03-20..2023-03-30&type=Issues) | [@damiend97](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adamiend97+updated%3A2023-03-20..2023-03-30&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2023-03-20..2023-03-30&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2023-03-20..2023-03-30&type=Issues) | [@JasonWeill](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AJasonWeill+updated%3A2023-03-20..2023-03-30&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2023-03-20..2023-03-30&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2023-03-20..2023-03-30&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2023-03-20..2023-03-30&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2023-03-20..2023-03-30&type=Issues)

### 3.6.2

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.6.1...faeab2c33cf857bef14b9e26ff9ec22cf82aa9b1))

#### Bugs fixed

- Fix save as without changing the file name [#14212](https://github.com/jupyterlab/jupyterlab/pull/14212) ([@hbcarlos](https://github.com/hbcarlos))
- Fix save as in collaborative mode [#14182](https://github.com/jupyterlab/jupyterlab/pull/14182) ([@hbcarlos](https://github.com/hbcarlos))
- Fix non-document wide undo stack [#14063](https://github.com/jupyterlab/jupyterlab/pull/14063) ([@fcollonval](https://github.com/fcollonval))
- Fix code/content/ui font-size change [#14077](https://github.com/jupyterlab/jupyterlab/pull/14077) ([@FoSuCloud](https://github.com/FoSuCloud))
- Restore @jupyterlab/shared-models as proxy to @jupyter/ydoc [#14133](https://github.com/jupyterlab/jupyterlab/pull/14133) ([@fcollonval](https://github.com/fcollonval))
- Doc session [#14128](https://github.com/jupyterlab/jupyterlab/pull/14128) ([@hbcarlos](https://github.com/hbcarlos))
- Use local paths instead of driveName:path in the shared model [#13866](https://github.com/jupyterlab/jupyterlab/pull/13866) ([@hbcarlos](https://github.com/hbcarlos))
- use singleton boolean type for codemirror `lineWiseCopyCut` setting [#14055](https://github.com/jupyterlab/jupyterlab/pull/14055) ([@bollwyvl](https://github.com/bollwyvl))

#### Maintenance and upkeep improvements

- Fix integrity [#14226](https://github.com/jupyterlab/jupyterlab/pull/14226) ([@fcollonval](https://github.com/fcollonval))
- Increases timeout  [#14045](https://github.com/jupyterlab/jupyterlab/pull/14045) ([@brichet](https://github.com/brichet))
- Use Python 3.11 for js-debugger tests [#13941](https://github.com/jupyterlab/jupyterlab/pull/13941) ([@fcollonval](https://github.com/fcollonval))
- Fix verdaccio start up with nodejs 18.14.0 [#13959](https://github.com/jupyterlab/jupyterlab/pull/13959) ([@fcollonval](https://github.com/fcollonval))

#### Documentation improvements

- Add note for jest configuration and JLab 3.6 [#14207](https://github.com/jupyterlab/jupyterlab/pull/14207) ([@fcollonval](https://github.com/fcollonval))

#### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2023-02-03&to=2023-03-20&type=c))

[@andrii-i](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aandrii-i+updated%3A2023-02-03..2023-03-20&type=Issues) | [@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2023-02-03..2023-03-20&type=Issues) | [@bollwyvl](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Abollwyvl+updated%3A2023-02-03..2023-03-20&type=Issues) | [@brichet](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Abrichet+updated%3A2023-02-03..2023-03-20&type=Issues) | [@bt-](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Abt-+updated%3A2023-02-03..2023-03-20&type=Issues) | [@dlqqq](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adlqqq+updated%3A2023-02-03..2023-03-20&type=Issues) | [@domoritz](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adomoritz+updated%3A2023-02-03..2023-03-20&type=Issues) | [@echarles](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aecharles+updated%3A2023-02-03..2023-03-20&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2023-02-03..2023-03-20&type=Issues) | [@fperez](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afperez+updated%3A2023-02-03..2023-03-20&type=Issues) | [@gabalafou](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agabalafou+updated%3A2023-02-03..2023-03-20&type=Issues) | [@GabrielaVives](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AGabrielaVives+updated%3A2023-02-03..2023-03-20&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2023-02-03..2023-03-20&type=Issues) | [@goanpeca](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agoanpeca+updated%3A2023-02-03..2023-03-20&type=Issues) | [@HaudinFlorence](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AHaudinFlorence+updated%3A2023-02-03..2023-03-20&type=Issues) | [@hbcarlos](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahbcarlos+updated%3A2023-02-03..2023-03-20&type=Issues) | [@ianhi](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aianhi+updated%3A2023-02-03..2023-03-20&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2023-02-03..2023-03-20&type=Issues) | [@JasonWeill](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AJasonWeill+updated%3A2023-02-03..2023-03-20&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2023-02-03..2023-03-20&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2023-02-03..2023-03-20&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2023-02-03..2023-03-20&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2023-02-03..2023-03-20&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2023-02-03..2023-03-20&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2023-02-03..2023-03-20&type=Issues) | [@mlucool](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Amlucool+updated%3A2023-02-03..2023-03-20&type=Issues) | [@psychemedia](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Apsychemedia+updated%3A2023-02-03..2023-03-20&type=Issues) | [@telamonian](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Atelamonian+updated%3A2023-02-03..2023-03-20&type=Issues) | [@tonyfast](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Atonyfast+updated%3A2023-02-03..2023-03-20&type=Issues) | [@vidartf](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Avidartf+updated%3A2023-02-03..2023-03-20&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2023-02-03..2023-03-20&type=Issues)

### 3.6.1

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.6.0...ef12e4b9e7874489bb6bf6cda91dd08697f2b3c9))

#### Bugs fixed

- Revert target to ES2017 [#13914](https://github.com/jupyterlab/jupyterlab/pull/13914) ([@fcollonval](https://github.com/fcollonval))

#### Documentation improvements

- Revert target to ES2017 [#13914](https://github.com/jupyterlab/jupyterlab/pull/13914) ([@fcollonval](https://github.com/fcollonval))
- Fix minor typo in urls.rst [#13902](https://github.com/jupyterlab/jupyterlab/pull/13902) ([@chbrandt](https://github.com/chbrandt))

#### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2023-02-02&to=2023-02-03&type=c))

[@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2023-02-02..2023-02-03&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2023-02-02..2023-02-03&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2023-02-02..2023-02-03&type=Issues)

### 3.6.0

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.4.8...438f5733ae47999de1585733113c294264b5e062))

#### New features added

- Add copy and paste commands to terminal context menu [#13535](https://github.com/jupyterlab/jupyterlab/pull/13535) ([@krassowski](https://github.com/krassowski))
- Turn terminal links into anchors using xterm addon [#13645](https://github.com/jupyterlab/jupyterlab/pull/13645) ([@mgcth](https://github.com/mgcth))
- Allows to pause the execution during debug [#13494](https://github.com/jupyterlab/jupyterlab/pull/13494) ([@brichet](https://github.com/brichet))
- Ask confirmation when closing a document [#13489](https://github.com/jupyterlab/jupyterlab/pull/13489) ([@fcollonval](https://github.com/fcollonval))
- Add events service [#13465](https://github.com/jupyterlab/jupyterlab/pull/13465) ([@fcollonval](https://github.com/fcollonval))
- Add notification queue and display using toast [#12959](https://github.com/jupyterlab/jupyterlab/pull/12959) ([@telamonian](https://github.com/telamonian))
- Add announcements [#13444](https://github.com/jupyterlab/jupyterlab/pull/13444) ([@fcollonval](https://github.com/fcollonval))
- Add line history to Stdin cell outputs [#13431](https://github.com/jupyterlab/jupyterlab/pull/13431) ([@fcollonval](https://github.com/fcollonval))
- Add user configuration for additional schemes for the sanitizer plugin [#13419](https://github.com/jupyterlab/jupyterlab/pull/13419) ([@fcollonval](https://github.com/fcollonval))
- User service [#12926](https://github.com/jupyterlab/jupyterlab/pull/12926) ([@hbcarlos](https://github.com/hbcarlos))

#### Enhancements made

- Expose contentVisibility widget hiding mode [#13860](https://github.com/jupyterlab/jupyterlab/pull/13860) ([@fcollonval](https://github.com/fcollonval))
- `default` locale will use OS default locale [#13721](https://github.com/jupyterlab/jupyterlab/pull/13721) ([@fcollonval](https://github.com/fcollonval))
- Enable strict CSS containment for `MainAreaWidget` [#13811](https://github.com/jupyterlab/jupyterlab/pull/13811) ([@krassowski](https://github.com/krassowski))
- User defined default viewer take precedence for rendered factory [#11541](https://github.com/jupyterlab/jupyterlab/pull/11541) ([@fcollonval](https://github.com/fcollonval))
- Remove not needed `Completer.IRenderer.sanitizer` [#13700](https://github.com/jupyterlab/jupyterlab/pull/13700) ([@fcollonval](https://github.com/fcollonval))
- Contain the tabs within the tabbar (do not use translation transform) [#13671](https://github.com/jupyterlab/jupyterlab/pull/13671) ([@krassowski](https://github.com/krassowski))
- Sanitize notification message [#13510](https://github.com/jupyterlab/jupyterlab/pull/13510) ([@fcollonval](https://github.com/fcollonval))
- Use more the contextual collaborative model attribute [#13564](https://github.com/jupyterlab/jupyterlab/pull/13564) ([@fcollonval](https://github.com/fcollonval))
- Add lumino with support for plugin deactivation [#13541](https://github.com/jupyterlab/jupyterlab/pull/13541) ([@fcollonval](https://github.com/fcollonval))
- Sets whether the model is collaborative or not when registering its factory [#13526](https://github.com/jupyterlab/jupyterlab/pull/13526) ([@hbcarlos](https://github.com/hbcarlos))
- RTC: Move user name to user panel [#13517](https://github.com/jupyterlab/jupyterlab/pull/13517) ([@martinRenou](https://github.com/martinRenou))
- jupyter_server_ydoc>=0.6.0,\<0.7.0 [#13499](https://github.com/jupyterlab/jupyterlab/pull/13499) ([@fcollonval](https://github.com/fcollonval))
- Define file or activity icons color as static [#13408](https://github.com/jupyterlab/jupyterlab/pull/13408) ([@fcollonval](https://github.com/fcollonval))
- Added collaborative_document_save_de… [#13404](https://github.com/jupyterlab/jupyterlab/pull/13404) ([@fcollonval](https://github.com/fcollonval))
- Add a hover effect to plugin list entries [#13384](https://github.com/jupyterlab/jupyterlab/pull/13384) ([@krassowski](https://github.com/krassowski))
- Bump Lumino 1.x [#13378](https://github.com/jupyterlab/jupyterlab/pull/13378) ([@fcollonval](https://github.com/fcollonval))
- Store original path as returned from contents API in the `Contents.IModel` [#13216](https://github.com/jupyterlab/jupyterlab/pull/13216) ([@krassowski](https://github.com/krassowski))
- Update document dirty logic for RTC [#13364](https://github.com/jupyterlab/jupyterlab/pull/13364) ([@davidbrochart](https://github.com/davidbrochart))
- Store document info in the state not in a separate context map out of the document interface. [#13317](https://github.com/jupyterlab/jupyterlab/pull/13317) ([@fcollonval](https://github.com/fcollonval))
- Use file ID [#13246](https://github.com/jupyterlab/jupyterlab/pull/13246) ([@davidbrochart](https://github.com/davidbrochart))
- Relax doc provider API [#13214](https://github.com/jupyterlab/jupyterlab/pull/13214) ([@fcollonval](https://github.com/fcollonval))
- Avoids restoring widget in dock panel when first loading in 'single-document' mode [#13314](https://github.com/jupyterlab/jupyterlab/pull/13314) ([@brichet](https://github.com/brichet))
- Fix illegible white on yellow text of stacktrace in dark theme [#13249](https://github.com/jupyterlab/jupyterlab/pull/13249) ([@NikolayXHD](https://github.com/NikolayXHD))
- Use settings icons for 6 plugins [#13298](https://github.com/jupyterlab/jupyterlab/pull/13298) ([@krassowski](https://github.com/krassowski))
- Do not run galata in `.ipynb_checkpoints` [#13297](https://github.com/jupyterlab/jupyterlab/pull/13297) ([@krassowski](https://github.com/krassowski))
- Allow empty notebook [#13296](https://github.com/jupyterlab/jupyterlab/pull/13296) ([@martinRenou](https://github.com/martinRenou))
- Optimize text mimerenderer: ansi vs autolink  [#13202](https://github.com/jupyterlab/jupyterlab/pull/13202) ([@vidartf](https://github.com/vidartf))
- Remove Yjs locking mechanism [#13222](https://github.com/jupyterlab/jupyterlab/pull/13222) ([@davidbrochart](https://github.com/davidbrochart))

#### Bugs fixed

- Define colour and background for filebrowser edit field [#13895](https://github.com/jupyterlab/jupyterlab/pull/13895) ([@krassowski](https://github.com/krassowski))
- Reset execution indicator state when kernel restarts [#13832](https://github.com/jupyterlab/jupyterlab/pull/13832) ([@krassowski](https://github.com/krassowski))
- Restore blueprint focus overrides on 3.x branch [#13879](https://github.com/jupyterlab/jupyterlab/pull/13879) ([@krassowski](https://github.com/krassowski))
- Restore partial border effect for menu [#13878](https://github.com/jupyterlab/jupyterlab/pull/13878) ([@krassowski](https://github.com/krassowski))
- Pin `jupyter_ydoc` [#13863](https://github.com/jupyterlab/jupyterlab/pull/13863) ([@fcollonval](https://github.com/fcollonval))
- Fix `preferred_dir` for examples [#13788](https://github.com/jupyterlab/jupyterlab/pull/13788) ([@fcollonval](https://github.com/fcollonval))
- Bump canvas to version with nodejs 18 binaries [#13783](https://github.com/jupyterlab/jupyterlab/pull/13783) ([@fcollonval](https://github.com/fcollonval))
- Explain why cell model may be missing in cell toolbar [#13763](https://github.com/jupyterlab/jupyterlab/pull/13763) ([@krassowski](https://github.com/krassowski))
- Fix handling of `settingEditorType` [#13761](https://github.com/jupyterlab/jupyterlab/pull/13761) ([@jtpio](https://github.com/jtpio))
- Fix execution indicator in RTC mode [#13693](https://github.com/jupyterlab/jupyterlab/pull/13693) ([@trungleduc](https://github.com/trungleduc))
- Force jupyter-server v1 to check against notebook v6 [#13716](https://github.com/jupyterlab/jupyterlab/pull/13716) ([@fcollonval](https://github.com/fcollonval))
- Write the browser open files for test [#13634](https://github.com/jupyterlab/jupyterlab/pull/13634) ([@fcollonval](https://github.com/fcollonval))
- Add the `scaleFactor` value from the embed options when creating the PNG representation for a Vega-based chart [#13610](https://github.com/jupyterlab/jupyterlab/pull/13610) ([@joaopalmeiro](https://github.com/joaopalmeiro))
- Does not prevent default behavior when shift-clicking [#13616](https://github.com/jupyterlab/jupyterlab/pull/13616) ([@jmk89](https://github.com/jmk89))
- Do not load CSS of disabled federated extensions [#11962](https://github.com/jupyterlab/jupyterlab/pull/11962) ([@jtpio](https://github.com/jtpio))
- use jupyter_config_dir instead of config_path\[0\] for workspaces, settings [#13589](https://github.com/jupyterlab/jupyterlab/pull/13589) ([@minrk](https://github.com/minrk))
- Bump @lumino/application [#13590](https://github.com/jupyterlab/jupyterlab/pull/13590) ([@fcollonval](https://github.com/fcollonval))
- Restores the appearance of the settingeditor's input focus [#13554](https://github.com/jupyterlab/jupyterlab/pull/13554) ([@brichet](https://github.com/brichet))
- Fix a wrong argument when calling 'renderMimeVariable' [#13531](https://github.com/jupyterlab/jupyterlab/pull/13531) ([@brichet](https://github.com/brichet))
- fix size of toc running indicator [#13568](https://github.com/jupyterlab/jupyterlab/pull/13568) ([@uenot](https://github.com/uenot))
- Fixes backward-incompatible changes for 3.6 [#13560](https://github.com/jupyterlab/jupyterlab/pull/13560) ([@hbcarlos](https://github.com/hbcarlos))
- Make focus visible (mostly CSS) [#13415](https://github.com/jupyterlab/jupyterlab/pull/13415) ([@gabalafou](https://github.com/gabalafou))
- Set corrections to icons and switch colors [#13500](https://github.com/jupyterlab/jupyterlab/pull/13500) ([@HaudinFlorence](https://github.com/HaudinFlorence))
- Default `IDocumentProviderFactory.IOptions` generic to ISharedDocument [#13490](https://github.com/jupyterlab/jupyterlab/pull/13490) ([@jtpio](https://github.com/jtpio))
- Use same key for saving user info in local store [#13482](https://github.com/jupyterlab/jupyterlab/pull/13482) ([@hbcarlos](https://github.com/hbcarlos))
- Set fallback values for icons colors. [#13468](https://github.com/jupyterlab/jupyterlab/pull/13468) ([@HaudinFlorence](https://github.com/HaudinFlorence))
- Backport #13458 on branch 3.6.x (Enable document model specific collaboration) [#13480](https://github.com/jupyterlab/jupyterlab/pull/13480) ([@fcollonval](https://github.com/fcollonval))
- Share attachments [#13450](https://github.com/jupyterlab/jupyterlab/pull/13450) ([@hbcarlos](https://github.com/hbcarlos))
- Fix key name for nbformat minor version [#13377](https://github.com/jupyterlab/jupyterlab/pull/13377) ([@fcollonval](https://github.com/fcollonval))
- Remove metadata entries [#13371](https://github.com/jupyterlab/jupyterlab/pull/13371) ([@hbcarlos](https://github.com/hbcarlos))
- Updates JSONEditor's source only when there is an active cell or an active notebook panel [#13308](https://github.com/jupyterlab/jupyterlab/pull/13308) ([@hbcarlos](https://github.com/hbcarlos))
- Avoids use of @deprecated to refer to a parameter [#13309](https://github.com/jupyterlab/jupyterlab/pull/13309) ([@JasonWeill](https://github.com/JasonWeill))
- Fix border-radius does not follow css variable [#13289](https://github.com/jupyterlab/jupyterlab/pull/13289) ([@vthinkxie](https://github.com/vthinkxie))
- Set `isUntitled` to false on document path changes [#13268](https://github.com/jupyterlab/jupyterlab/pull/13268) ([@fcollonval](https://github.com/fcollonval))
- Remove some unused CSS styles and fix icon alignment in plugin list [#13255](https://github.com/jupyterlab/jupyterlab/pull/13255) ([@krassowski](https://github.com/krassowski))
- Fix notebook trust in RTC [#13274](https://github.com/jupyterlab/jupyterlab/pull/13274) ([@davidbrochart](https://github.com/davidbrochart))
- Don't dispose the notebook metadata editor on active cell change [#13259](https://github.com/jupyterlab/jupyterlab/pull/13259) ([@fcollonval](https://github.com/fcollonval))

#### Maintenance and upkeep improvements

- Bump `@lumino/widgets` to 1.37.1 on 3.6 branch [#13829](https://github.com/jupyterlab/jupyterlab/pull/13829) ([@krassowski](https://github.com/krassowski))
- Clean examples [#13812](https://github.com/jupyterlab/jupyterlab/pull/13812) ([@fcollonval](https://github.com/fcollonval))
- Added config to link ts source maps [#13765](https://github.com/jupyterlab/jupyterlab/pull/13765) ([@3coins](https://github.com/3coins))
- Fix `preferred_dir` for examples [#13788](https://github.com/jupyterlab/jupyterlab/pull/13788) ([@fcollonval](https://github.com/fcollonval))
- Bump canvas to version with nodejs 18 binaries [#13783](https://github.com/jupyterlab/jupyterlab/pull/13783) ([@fcollonval](https://github.com/fcollonval))
- Drop the dependency on `@jupyterlab/buildutils` in `@jupyterlab/builder` [#13741](https://github.com/jupyterlab/jupyterlab/pull/13741) ([@jtpio](https://github.com/jtpio))
- Remove empty button in the notebook toolbar [#13691](https://github.com/jupyterlab/jupyterlab/pull/13691) ([@trungleduc](https://github.com/trungleduc))
- Pin check release action without pyproject validation [#13714](https://github.com/jupyterlab/jupyterlab/pull/13714) ([@fcollonval](https://github.com/fcollonval))
- Update copyright date to 2023 in the about dialog [#13708](https://github.com/jupyterlab/jupyterlab/pull/13708) ([@jtpio](https://github.com/jtpio))
- Fix links in `CHANGELOG.md` [#13698](https://github.com/jupyterlab/jupyterlab/pull/13698) ([@jtpio](https://github.com/jtpio))
- Write the browser open files for test [#13634](https://github.com/jupyterlab/jupyterlab/pull/13634) ([@fcollonval](https://github.com/fcollonval))
- Bump sanitize-html to 2.7.3 [#13509](https://github.com/jupyterlab/jupyterlab/pull/13509) ([@fcollonval](https://github.com/fcollonval))
- Depend on `@jupyter/ydoc` instead of `@jupyter-notebook/ydoc` [#13506](https://github.com/jupyterlab/jupyterlab/pull/13506) ([@jtpio](https://github.com/jtpio))
- Fix Python test dependencies [#13508](https://github.com/jupyterlab/jupyterlab/pull/13508) ([@fcollonval](https://github.com/fcollonval))
- Require jupyter-server-ydoc >=0.5.1 [#13479](https://github.com/jupyterlab/jupyterlab/pull/13479) ([@fcollonval](https://github.com/fcollonval))
- Require jupyter_server_ydoc >=0.4.0 [#13437](https://github.com/jupyterlab/jupyterlab/pull/13437) ([@hbcarlos](https://github.com/hbcarlos))
- Use more consistent naming for user service [#13435](https://github.com/jupyterlab/jupyterlab/pull/13435) ([@fcollonval](https://github.com/fcollonval))
- Deprecate managing source extensions with `jupyter labextension` [#13424](https://github.com/jupyterlab/jupyterlab/pull/13424) ([@jtpio](https://github.com/jtpio))
- Bump jupyter_server_ydoc [#13407](https://github.com/jupyterlab/jupyterlab/pull/13407) ([@fcollonval](https://github.com/fcollonval))
- tomllib is in stdlib in Python 3.11+ [#13405](https://github.com/jupyterlab/jupyterlab/pull/13405) ([@fcollonval](https://github.com/fcollonval))
- Extract @jupyterlab/shared-models to @jupyter/ydoc [#13398](https://github.com/jupyterlab/jupyterlab/pull/13398) ([@fcollonval](https://github.com/fcollonval))
- Integrity check does not clean style import when emptied [#13367](https://github.com/jupyterlab/jupyterlab/pull/13367) ([@fcollonval](https://github.com/fcollonval))
- Fix the examples with jupyter-server v2 [#13336](https://github.com/jupyterlab/jupyterlab/pull/13336) ([@fcollonval](https://github.com/fcollonval))
- Check a core path is actually a package [#13346](https://github.com/jupyterlab/jupyterlab/pull/13346) ([@fcollonval](https://github.com/fcollonval))
- Removes empty requires list  [#13334](https://github.com/jupyterlab/jupyterlab/pull/13334) ([@hbcarlos](https://github.com/hbcarlos))
- Fix Binder for jupyter-server v2 [#13344](https://github.com/jupyterlab/jupyterlab/pull/13344) ([@fcollonval](https://github.com/fcollonval))
- Switch to releaser v2 [#13322](https://github.com/jupyterlab/jupyterlab/pull/13322) ([@blink1073](https://github.com/blink1073))
- Fix memory leaks [#13229](https://github.com/jupyterlab/jupyterlab/pull/13229) ([@fcollonval](https://github.com/fcollonval))
- Update branch configuration [#13220](https://github.com/jupyterlab/jupyterlab/pull/13220) ([@fcollonval](https://github.com/fcollonval))

#### Documentation improvements

- Force jupyter-server v1 to check against notebook v6 [#13716](https://github.com/jupyterlab/jupyterlab/pull/13716) ([@fcollonval](https://github.com/fcollonval))
- Fix links in `CHANGELOG.md` [#13698](https://github.com/jupyterlab/jupyterlab/pull/13698) ([@jtpio](https://github.com/jtpio))
- Do not load CSS of disabled federated extensions [#11962](https://github.com/jupyterlab/jupyterlab/pull/11962) ([@jtpio](https://github.com/jtpio))
- Copy edit for privacy policy docs [#13594](https://github.com/jupyterlab/jupyterlab/pull/13594) ([@JasonWeill](https://github.com/JasonWeill))
- Bug fixes/revisions for the Lab extension tutorial [#13593](https://github.com/jupyterlab/jupyterlab/pull/13593) ([@ericsnekbytes](https://github.com/ericsnekbytes))
- Documentation RTC and user service (#13578) [#13591](https://github.com/jupyterlab/jupyterlab/pull/13591) ([@hbcarlos](https://github.com/hbcarlos))
- Forbid using RTC mode without Jupyter Server v2. [#13472](https://github.com/jupyterlab/jupyterlab/pull/13472) ([@fcollonval](https://github.com/fcollonval))
- Remove broken URL [#13445](https://github.com/jupyterlab/jupyterlab/pull/13445) ([@fcollonval](https://github.com/fcollonval))
- Move configuration to jupyter-server-ydoc [#13425](https://github.com/jupyterlab/jupyterlab/pull/13425) ([@fcollonval](https://github.com/fcollonval))
- Update the tutorial to reflect the changes in the latest cookiecutter… [#13417](https://github.com/jupyterlab/jupyterlab/pull/13417) ([@frivas-at-navteca](https://github.com/frivas-at-navteca))
- Fix Binder for jupyter-server v2 [#13344](https://github.com/jupyterlab/jupyterlab/pull/13344) ([@fcollonval](https://github.com/fcollonval))
- Correct starting docs: working directory path sample code [#13261](https://github.com/jupyterlab/jupyterlab/pull/13261) ([@hugetim](https://github.com/hugetim))
- Backporting IUser/Collaboration PRs [#13242](https://github.com/jupyterlab/jupyterlab/pull/13242) ([@martinRenou](https://github.com/martinRenou))
- Update example documentation: `lab -> app` [#13223](https://github.com/jupyterlab/jupyterlab/pull/13223) ([@davidbrochart](https://github.com/davidbrochart))
- Remove Yjs locking mechanism [#13222](https://github.com/jupyterlab/jupyterlab/pull/13222) ([@davidbrochart](https://github.com/davidbrochart))
- Update branch configuration [#13220](https://github.com/jupyterlab/jupyterlab/pull/13220) ([@fcollonval](https://github.com/fcollonval))
- Update README.md [#13257](https://github.com/jupyterlab/jupyterlab/pull/13257) ([@liliyao2022](https://github.com/liliyao2022))

#### API and Breaking Changes

- Enable document model specific collaboration [#13480](https://github.com/jupyterlab/jupyterlab/pull/13480) ([@fcollonval](https://github.com/fcollonval))
- Improve document dirty logic for RTC [#13364](https://github.com/jupyterlab/jupyterlab/pull/13364) ([@davidbrochart](https://github.com/davidbrochart))
- Store document info in the state not in a separate context map out of the document interface. [#13317](https://github.com/jupyterlab/jupyterlab/pull/13317) ([@fcollonval](https://github.com/fcollonval))
- Remove Yjs locking mechanism [#13222](https://github.com/jupyterlab/jupyterlab/pull/13222) ([@davidbrochart](https://github.com/davidbrochart))
- Move configuration to jupyter-server-ydoc [#13425](https://github.com/jupyterlab/jupyterlab/pull/13425) ([@fcollonval](https://github.com/fcollonval))
- Extract @jupyterlab/shared-models to @jupyter/ydoc [#13398](https://github.com/jupyterlab/jupyterlab/pull/13398) ([@fcollonval](https://github.com/fcollonval))

#### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2022-10-04&to=2023-02-02&type=c))

[@afshin](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aafshin+updated%3A2022-10-04..2023-02-02&type=Issues) | [@andrii-i](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aandrii-i+updated%3A2022-10-04..2023-02-02&type=Issues) | [@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2022-10-04..2023-02-02&type=Issues) | [@bollwyvl](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Abollwyvl+updated%3A2022-10-04..2023-02-02&type=Issues) | [@brichet](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Abrichet+updated%3A2022-10-04..2023-02-02&type=Issues) | [@Carreau](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3ACarreau+updated%3A2022-10-04..2023-02-02&type=Issues) | [@davidbrochart](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adavidbrochart+updated%3A2022-10-04..2023-02-02&type=Issues) | [@echarles](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aecharles+updated%3A2022-10-04..2023-02-02&type=Issues) | [@ellisonbg](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aellisonbg+updated%3A2022-10-04..2023-02-02&type=Issues) | [@ericsnekbytes](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aericsnekbytes+updated%3A2022-10-04..2023-02-02&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2022-10-04..2023-02-02&type=Issues) | [@fperez](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afperez+updated%3A2022-10-04..2023-02-02&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2022-10-04..2023-02-02&type=Issues) | [@HaudinFlorence](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AHaudinFlorence+updated%3A2022-10-04..2023-02-02&type=Issues) | [@hbcarlos](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahbcarlos+updated%3A2022-10-04..2023-02-02&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2022-10-04..2023-02-02&type=Issues) | [@JasonWeill](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AJasonWeill+updated%3A2022-10-04..2023-02-02&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2022-10-04..2023-02-02&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2022-10-04..2023-02-02&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2022-10-04..2023-02-02&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2022-10-04..2023-02-02&type=Issues) | [@martinRenou](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AmartinRenou+updated%3A2022-10-04..2023-02-02&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2022-10-04..2023-02-02&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2022-10-04..2023-02-02&type=Issues) | [@psychemedia](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Apsychemedia+updated%3A2022-10-04..2023-02-02&type=Issues) | [@SylvainCorlay](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3ASylvainCorlay+updated%3A2022-10-04..2023-02-02&type=Issues) | [@trungleduc](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Atrungleduc+updated%3A2022-10-04..2023-02-02&type=Issues) | [@uenot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Auenot+updated%3A2022-10-04..2023-02-02&type=Issues) | [@vidartf](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Avidartf+updated%3A2022-10-04..2023-02-02&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2022-10-04..2023-02-02&type=Issues)

## v3.5

## 3.5.0

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.4.8...225e7ab0844a0284bf50a567de505eb4650ec122))

### Enhancements made

- Optimize text mimerenderer: ansi vs autolink [#13202](https://github.com/jupyterlab/jupyterlab/pull/13202) ([@vidartf](https://github.com/vidartf))
- Collapse debugger panel when disabling debugger [#13088](https://github.com/jupyterlab/jupyterlab/pull/13088) ([@yanmulin](https://github.com/yanmulin))
- File Browser: add support for filtering directories on search [#12342](https://github.com/jupyterlab/jupyterlab/pull/12342) ([@jtpio](https://github.com/jtpio))
- Prompt for renaming at first manual save [#12953](https://github.com/jupyterlab/jupyterlab/pull/12953) ([@fcollonval](https://github.com/fcollonval))
- Raise ceiling on `jupyter_server` dependency to \< 3 [#13068](https://github.com/jupyterlab/jupyterlab/pull/13068) ([@Zsailer](https://github.com/Zsailer))

### Bugs fixed

- Set `isUntitled` to false on document path changes [#13268](https://github.com/jupyterlab/jupyterlab/pull/13268) ([@fcollonval](https://github.com/fcollonval))
- Don't dispose the notebook metadata editor on active cell change [#13259](https://github.com/jupyterlab/jupyterlab/pull/13259) ([@fcollonval](https://github.com/fcollonval))
- Use keystroke format consistent with menus [#13200](https://github.com/jupyterlab/jupyterlab/pull/13200) ([@fcollonval](https://github.com/fcollonval))

### Maintenance and upkeep improvements

- Fix memory leaks [#13229](https://github.com/jupyterlab/jupyterlab/pull/13229) ([@fcollonval](https://github.com/fcollonval))
- Bump to the latest Lumino 1.x [#13190](https://github.com/jupyterlab/jupyterlab/pull/13190) ([@fcollonval](https://github.com/fcollonval))
- Update branch configuration [#13184](https://github.com/jupyterlab/jupyterlab/pull/13184) ([@fcollonval](https://github.com/fcollonval))

### Documentation improvements

- Update example documentation: `lab -> app` [#13223](https://github.com/jupyterlab/jupyterlab/pull/13223) ([@davidbrochart](https://github.com/davidbrochart))
- Prompt for renaming at first manual save [#12953](https://github.com/jupyterlab/jupyterlab/pull/12953) ([@fcollonval](https://github.com/fcollonval))
- Update branch configuration [#13184](https://github.com/jupyterlab/jupyterlab/pull/13184) ([@fcollonval](https://github.com/fcollonval))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2022-10-04&to=2022-10-24&type=c))
[@Carreau](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3ACarreau+updated%3A2022-10-04..2022-10-24&type=Issues) | [@davidbrochart](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adavidbrochart+updated%3A2022-10-04..2022-10-24&type=Issues) | [@ellisonbg](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aellisonbg+updated%3A2022-10-04..2022-10-24&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2022-10-04..2022-10-24&type=Issues) | [@hbcarlos](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahbcarlos+updated%3A2022-10-04..2022-10-24&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2022-10-04..2022-10-24&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2022-10-04..2022-10-24&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2022-10-04..2022-10-24&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2022-10-04..2022-10-24&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2022-10-04..2022-10-24&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2022-10-04..2022-10-24&type=Issues) | [@SylvainCorlay](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3ASylvainCorlay+updated%3A2022-10-04..2022-10-24&type=Issues) | [@trungleduc](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Atrungleduc+updated%3A2022-10-04..2022-10-24&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2022-10-04..2022-10-24&type=Issues)

## v3.4

## 3.4.7

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.4.6...f713e06179bb5e57fc03da5fcf49b9c8e543f684))

### Enhancements made

- Get package name from pyproject if available [#13076](https://github.com/jupyterlab/jupyterlab/pull/13076) ([@blink1073](https://github.com/blink1073))
- Fix blurry icons in Launcher at 400% Zoom [#13065](https://github.com/jupyterlab/jupyterlab/pull/13065) ([@fcollonval](https://github.com/fcollonval))

### Bugs fixed

- Added mimeType for .webp image files [#13066](https://github.com/jupyterlab/jupyterlab/pull/13066) ([@alec-kr](https://github.com/alec-kr))
- Fix URL when falling back to node-fetch [#13067](https://github.com/jupyterlab/jupyterlab/pull/13067) ([@fcollonval](https://github.com/fcollonval))
- Keep completer visible when anchor is horizontally scrolled out of view [#13046](https://github.com/jupyterlab/jupyterlab/pull/13046) ([@krassowski](https://github.com/krassowski))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2022-09-05&to=2022-09-12&type=c))

[@agoose77](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aagoose77+updated%3A2022-09-05..2022-09-12&type=Issues) | [@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2022-09-05..2022-09-12&type=Issues) | [@ellisonbg](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aellisonbg+updated%3A2022-09-05..2022-09-12&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2022-09-05..2022-09-12&type=Issues) | [@gabalafou](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agabalafou+updated%3A2022-09-05..2022-09-12&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2022-09-05..2022-09-12&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2022-09-05..2022-09-12&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2022-09-05..2022-09-12&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2022-09-05..2022-09-12&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2022-09-05..2022-09-12&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2022-09-05..2022-09-12&type=Issues)

## 3.4.6

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.4.5...76459a67511b1c54df853e52d83a7fbd3badae7b))

### Bugs fixed

- Update Python icon to be PSF Trademark compliant [#13044](https://github.com/jupyterlab/jupyterlab/pull/13044) ([@fcollonval](https://github.com/fcollonval))
- Reorder of webpackConfig merge [#13042](https://github.com/jupyterlab/jupyterlab/pull/13042) ([@fcollonval](https://github.com/fcollonval))
- Update xterm.js dependency [#13036](https://github.com/jupyterlab/jupyterlab/pull/13036) ([@fcollonval](https://github.com/fcollonval))
- Support stateStorage for API calls [#13015](https://github.com/jupyterlab/jupyterlab/pull/13015) ([@fcollonval](https://github.com/fcollonval))
- Conditional call to waitIsReady in reload [#13011](https://github.com/jupyterlab/jupyterlab/pull/13011) ([@fcollonval](https://github.com/fcollonval))
- Add scrolling to `debugger` variable renderer [#12968](https://github.com/jupyterlab/jupyterlab/pull/12968) ([@firai](https://github.com/firai))
- Fix resizing and selection of debugger variable explorer grid [#12943](https://github.com/jupyterlab/jupyterlab/pull/12943) ([@firai](https://github.com/firai))

### Maintenance and upkeep improvements

- Fix lumino API documentation links [#13021](https://github.com/jupyterlab/jupyterlab/pull/13021) ([@fcollonval](https://github.com/fcollonval))

### Documentation improvements

- Fix lumino API documentation links [#13021](https://github.com/jupyterlab/jupyterlab/pull/13021) ([@fcollonval](https://github.com/fcollonval))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2022-08-10&to=2022-09-05&type=c))

[@ajbozarth](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aajbozarth+updated%3A2022-08-10..2022-09-05&type=Issues) | [@athornton](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aathornton+updated%3A2022-08-10..2022-09-05&type=Issues) | [@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2022-08-10..2022-09-05&type=Issues) | [@ellisonbg](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aellisonbg+updated%3A2022-08-10..2022-09-05&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2022-08-10..2022-09-05&type=Issues) | [@goanpeca](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agoanpeca+updated%3A2022-08-10..2022-09-05&type=Issues) | [@ian-r-rose](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aian-r-rose+updated%3A2022-08-10..2022-09-05&type=Issues) | [@isabela-pf](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aisabela-pf+updated%3A2022-08-10..2022-09-05&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2022-08-10..2022-09-05&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2022-08-10..2022-09-05&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2022-08-10..2022-09-05&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2022-08-10..2022-09-05&type=Issues) | [@JasonWeill](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AJasonWeill+updated%3A2022-08-10..2022-09-05&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2022-08-10..2022-09-05&type=Issues) | [@KrishnaKumarHariprasannan](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AKrishnaKumarHariprasannan+updated%3A2022-08-10..2022-09-05&type=Issues) | [@malemburg](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Amalemburg+updated%3A2022-08-10..2022-09-05&type=Issues) | [@manfromjupyter](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Amanfromjupyter+updated%3A2022-08-10..2022-09-05&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2022-08-10..2022-09-05&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2022-08-10..2022-09-05&type=Issues) | [@mlucool](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Amlucool+updated%3A2022-08-10..2022-09-05&type=Issues) | [@saulshanabrook](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Asaulshanabrook+updated%3A2022-08-10..2022-09-05&type=Issues) | [@telamonian](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Atelamonian+updated%3A2022-08-10..2022-09-05&type=Issues) | [@tgeorgeux](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Atgeorgeux+updated%3A2022-08-10..2022-09-05&type=Issues) | [@trallard](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Atrallard+updated%3A2022-08-10..2022-09-05&type=Issues) | [@VersBersh](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AVersBersh+updated%3A2022-08-10..2022-09-05&type=Issues) | [@vidartf](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Avidartf+updated%3A2022-08-10..2022-09-05&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2022-08-10..2022-09-05&type=Issues)

## 3.4.5

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.4.4...385ea4be3d3e65e1f62d82e8bfedbe554736b2bb))

### Enhancements made

- Add an option to enable "fast checks" of the jupyter lab build. [#12844](https://github.com/jupyterlab/jupyterlab/pull/12844) ([@thetorpedodog](https://github.com/thetorpedodog))
- Add .webp filetype in docRegistry. [#12839](https://github.com/jupyterlab/jupyterlab/pull/12839) ([@yangql176](https://github.com/yangql176))

### Bugs fixed

- Only show "Shut Down Kernel" if kernel is running [#12919](https://github.com/jupyterlab/jupyterlab/pull/12919) ([@krassowski](https://github.com/krassowski))
- Fix JSON Settings Editor [#12892](https://github.com/jupyterlab/jupyterlab/pull/12892) ([@krassowski](https://github.com/krassowski))
- Fix progress bar not working after uploading multiple files finished [#12871](https://github.com/jupyterlab/jupyterlab/pull/12871) ([@hsuanxyz](https://github.com/hsuanxyz))
- Fix kernel in the statusbar does not match the actual [#12865](https://github.com/jupyterlab/jupyterlab/pull/12865) ([@hsuanxyz](https://github.com/hsuanxyz))
- Adjust css to not leave trace of deleted widgets [#12838](https://github.com/jupyterlab/jupyterlab/pull/12838) ([@thomasaarholt](https://github.com/thomasaarholt))

### Maintenance and upkeep improvements

- Log launcher error to console [#12909](https://github.com/jupyterlab/jupyterlab/pull/12909) ([@trungleduc](https://github.com/trungleduc))

### Documentation improvements

- Add alt text to documentation [#12879](https://github.com/jupyterlab/jupyterlab/pull/12879) ([@isabela-pf](https://github.com/isabela-pf))
- Split commands in two blocks in the contributing guide [#12898](https://github.com/jupyterlab/jupyterlab/pull/12898) ([@jtpio](https://github.com/jtpio))
- Remove reference to unmaintained nb_conda_kernels [#12878](https://github.com/jupyterlab/jupyterlab/pull/12878) ([@SylvainCorlay](https://github.com/SylvainCorlay))
- Document building JupyterLab on osx-arm64 platforms [#12882](https://github.com/jupyterlab/jupyterlab/pull/12882) ([@SylvainCorlay](https://github.com/SylvainCorlay))
- Don't suggest deprecated command [#12855](https://github.com/jupyterlab/jupyterlab/pull/12855) ([@ryanlovett](https://github.com/ryanlovett))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2022-07-21&to=2022-08-10&type=c))

[@afshin](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aafshin+updated%3A2022-07-21..2022-08-10&type=Issues) | [@agoose77](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aagoose77+updated%3A2022-07-21..2022-08-10&type=Issues) | [@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2022-07-21..2022-08-10&type=Issues) | [@davidbrochart](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adavidbrochart+updated%3A2022-07-21..2022-08-10&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2022-07-21..2022-08-10&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2022-07-21..2022-08-10&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2022-07-21..2022-08-10&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2022-07-21..2022-08-10&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2022-07-21..2022-08-10&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2022-07-21..2022-08-10&type=Issues) | [@martinRenou](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AmartinRenou+updated%3A2022-07-21..2022-08-10&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2022-07-21..2022-08-10&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2022-07-21..2022-08-10&type=Issues) | [@ryanlovett](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aryanlovett+updated%3A2022-07-21..2022-08-10&type=Issues) | [@SylvainCorlay](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3ASylvainCorlay+updated%3A2022-07-21..2022-08-10&type=Issues) | [@telamonian](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Atelamonian+updated%3A2022-07-21..2022-08-10&type=Issues) | [@trungleduc](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Atrungleduc+updated%3A2022-07-21..2022-08-10&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2022-07-21..2022-08-10&type=Issues)

## 3.4.4

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.4.3...998cf0e146fdb7c61c42d9487ebb89c16581faf8))

### Enhancements made

- Adds version maintenance policy [#12829](https://github.com/jupyterlab/jupyterlab/pull/12829) ([@JasonWeill](https://github.com/JasonWeill))
- Increase title width in simple mode [#11546](https://github.com/jupyterlab/jupyterlab/pull/11546) ([@SylvainCorlay](https://github.com/SylvainCorlay))
- Bump xtermjs to latest [#12715](https://github.com/jupyterlab/jupyterlab/pull/12715) ([@yuvipanda](https://github.com/yuvipanda))
- Debugger: Make kernel source list react based [#12751](https://github.com/jupyterlab/jupyterlab/pull/12751) ([@vidartf](https://github.com/vidartf))
- Optimize debugger editor `eachLine` loops [#12746](https://github.com/jupyterlab/jupyterlab/pull/12746) ([@vidartf](https://github.com/vidartf))
- Make password inputs not give away how many characters were typed [#12659](https://github.com/jupyterlab/jupyterlab/pull/12659) ([@jasongrout](https://github.com/jasongrout))

### Bugs fixed

- Remove drive prefix from the file path when creating the new path [#12824](https://github.com/jupyterlab/jupyterlab/pull/12824) ([@hbcarlos](https://github.com/hbcarlos))
- Use path to extract `tmpPath` [#12823](https://github.com/jupyterlab/jupyterlab/pull/12823) ([@fcollonval](https://github.com/fcollonval))
- update tab name after file rename [#12791](https://github.com/jupyterlab/jupyterlab/pull/12791) ([@RobbyPratl](https://github.com/RobbyPratl))
- Update base.css [#12783](https://github.com/jupyterlab/jupyterlab/pull/12783) ([@siddartha-10](https://github.com/siddartha-10))
- Pin nbclassic below 0.4.0 [#12767](https://github.com/jupyterlab/jupyterlab/pull/12767) ([@fcollonval](https://github.com/fcollonval))
- Set focus when active cell changes only from mouse click [#12735](https://github.com/jupyterlab/jupyterlab/pull/12735) ([@fcollonval](https://github.com/fcollonval))
- Fix staging/yarn.lock registry [#12742](https://github.com/jupyterlab/jupyterlab/pull/12742) ([@vidartf](https://github.com/vidartf))
- Debugger: Fix CSS for variables inspecting [#12749](https://github.com/jupyterlab/jupyterlab/pull/12749) ([@martinRenou](https://github.com/martinRenou))
- Translate "Default: " and "Remove" in custom fields [#12732](https://github.com/jupyterlab/jupyterlab/pull/12732) ([@krassowski](https://github.com/krassowski))
- Fix cell toolbar overlap in side-by-side render mode [#12710](https://github.com/jupyterlab/jupyterlab/pull/12710) ([@peytondmurray](https://github.com/peytondmurray))
- Remove ipywidgets message count in the execution indicator model [#12665](https://github.com/jupyterlab/jupyterlab/pull/12665) ([@trungleduc](https://github.com/trungleduc))

### Maintenance and upkeep improvements

- Update verdaccio, start registry on 0.0.0.0 [#12825](https://github.com/jupyterlab/jupyterlab/pull/12825) ([@fcollonval](https://github.com/fcollonval))
- Use Vega SVG renderer to drop canvas dependency [#12811](https://github.com/jupyterlab/jupyterlab/pull/12811) ([@fcollonval](https://github.com/fcollonval))
- Bump moment from 2.29.2 to 2.29.4 [#12781](https://github.com/jupyterlab/jupyterlab/pull/12781) ([@dependabot\[bot\]](https://github.com/apps/dependabot))
- \[memory-leaks\] Fixes following cell addition analysis [#12774](https://github.com/jupyterlab/jupyterlab/pull/12774) ([@fcollonval](https://github.com/fcollonval))
- Bump @lumino/widgets to 1.33.0 [#12777](https://github.com/jupyterlab/jupyterlab/pull/12777) ([@fcollonval](https://github.com/fcollonval))
- Fix memory leaks [#12750](https://github.com/jupyterlab/jupyterlab/pull/12750) ([@fcollonval](https://github.com/fcollonval))
- Bump version of `marked` and `@types/marked` [#12747](https://github.com/jupyterlab/jupyterlab/pull/12747) ([@krassowski](https://github.com/krassowski))
- Drop pre-commit from build dependencies (#12680) [#12706](https://github.com/jupyterlab/jupyterlab/pull/12706) ([@jtpio](https://github.com/jtpio))

### Documentation improvements

- Adds version maintenance policy [#12829](https://github.com/jupyterlab/jupyterlab/pull/12829) ([@JasonWeill](https://github.com/JasonWeill))
- Explicitly set language to `en` in `conf.py` [#12712](https://github.com/jupyterlab/jupyterlab/pull/12712) ([@jtpio](https://github.com/jtpio))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2022-06-07&to=2022-07-21&type=c))

[@afshin](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aafshin+updated%3A2022-06-07..2022-07-21&type=Issues) | [@aiqc](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aaiqc+updated%3A2022-06-07..2022-07-21&type=Issues) | [@davidbrochart](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adavidbrochart+updated%3A2022-06-07..2022-07-21&type=Issues) | [@dlqqq](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adlqqq+updated%3A2022-06-07..2022-07-21&type=Issues) | [@dmonad](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Admonad+updated%3A2022-06-07..2022-07-21&type=Issues) | [@echarles](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aecharles+updated%3A2022-06-07..2022-07-21&type=Issues) | [@ellisonbg](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aellisonbg+updated%3A2022-06-07..2022-07-21&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2022-06-07..2022-07-21&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2022-06-07..2022-07-21&type=Issues) | [@goanpeca](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agoanpeca+updated%3A2022-06-07..2022-07-21&type=Issues) | [@hbcarlos](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahbcarlos+updated%3A2022-06-07..2022-07-21&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2022-06-07..2022-07-21&type=Issues) | [@JohanMabille](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AJohanMabille+updated%3A2022-06-07..2022-07-21&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2022-06-07..2022-07-21&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2022-06-07..2022-07-21&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2022-06-07..2022-07-21&type=Issues) | [@JasonWeill](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AJasonWeill+updated%3A2022-06-07..2022-07-21&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2022-06-07..2022-07-21&type=Issues) | [@martinRenou](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AmartinRenou+updated%3A2022-06-07..2022-07-21&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2022-06-07..2022-07-21&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2022-06-07..2022-07-21&type=Issues) | [@siddartha-10](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Asiddartha-10+updated%3A2022-06-07..2022-07-21&type=Issues) | [@SylvainCorlay](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3ASylvainCorlay+updated%3A2022-06-07..2022-07-21&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2022-06-07..2022-07-21&type=Issues) | [@williamstein](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awilliamstein+updated%3A2022-06-07..2022-07-21&type=Issues)

## 3.4.3

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.4.2...b05da6fae42dcf5a5ad0dd9b46a8b75d64804799))

### New features added

- Persistent side-by-side ratio setting [#12633](https://github.com/jupyterlab/jupyterlab/pull/12633) ([@echarles](https://github.com/echarles))

### Enhancements made

- Persistent side-by-side ratio setting [#12633](https://github.com/jupyterlab/jupyterlab/pull/12633) ([@echarles](https://github.com/echarles))
- Add "Open in Simple Mode" contextMenu option [#12577](https://github.com/jupyterlab/jupyterlab/pull/12577) ([@fcollonval](https://github.com/fcollonval))

### Bugs fixed

- Always check local packages against abspath [#10662](https://github.com/jupyterlab/jupyterlab/pull/10662) ([@mlucool](https://github.com/mlucool))
- Fix arrow position on unrendered markdown cell [#12660](https://github.com/jupyterlab/jupyterlab/pull/12660) ([@fcollonval](https://github.com/fcollonval))
- Fix the side-by-side cell resize handle [#12611](https://github.com/jupyterlab/jupyterlab/pull/12611) ([@echarles](https://github.com/echarles))
- Fix loading toolbar factory twice [#12599](https://github.com/jupyterlab/jupyterlab/pull/12599) ([@fcollonval](https://github.com/fcollonval))
- Fixes behavior of `maxNumberOutputs` [#12598](https://github.com/jupyterlab/jupyterlab/pull/12598) ([@fcollonval](https://github.com/fcollonval))
- Focus not set when clicking on cell margin [#12447](https://github.com/jupyterlab/jupyterlab/pull/12447) ([@fcollonval](https://github.com/fcollonval))
- Make selected text translucent so the cursor is visible in vim mode [#12520](https://github.com/jupyterlab/jupyterlab/pull/12520) ([@Jessie-Newman](https://github.com/Jessie-Newman))
- Fix file browser search highlighting bug [#12578](https://github.com/jupyterlab/jupyterlab/pull/12578) ([@fcollonval](https://github.com/fcollonval))

### Maintenance and upkeep improvements

- Fix failing check links [#12627](https://github.com/jupyterlab/jupyterlab/pull/12627) ([@jtpio](https://github.com/jtpio))
- Force crypto resolution [#12576](https://github.com/jupyterlab/jupyterlab/pull/12576) ([@fcollonval](https://github.com/fcollonval))

### Documentation improvements

- Add more explanation for internationalization (translation python package) [#12635](https://github.com/jupyterlab/jupyterlab/pull/12635) ([@a3626a](https://github.com/a3626a))
- Add "Open in Simple Mode" contextMenu option [#12577](https://github.com/jupyterlab/jupyterlab/pull/12577) ([@fcollonval](https://github.com/fcollonval))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2022-05-13&to=2022-06-07&type=c))

[@afshin](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aafshin+updated%3A2022-05-13..2022-06-07&type=Issues) | [@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2022-05-13..2022-06-07&type=Issues) | [@bollwyvl](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Abollwyvl+updated%3A2022-05-13..2022-06-07&type=Issues) | [@davidbrochart](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adavidbrochart+updated%3A2022-05-13..2022-06-07&type=Issues) | [@dmonad](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Admonad+updated%3A2022-05-13..2022-06-07&type=Issues) | [@echarles](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aecharles+updated%3A2022-05-13..2022-06-07&type=Issues) | [@ellisonbg](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aellisonbg+updated%3A2022-05-13..2022-06-07&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2022-05-13..2022-06-07&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2022-05-13..2022-06-07&type=Issues) | [@hbcarlos](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahbcarlos+updated%3A2022-05-13..2022-06-07&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2022-05-13..2022-06-07&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2022-05-13..2022-06-07&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2022-05-13..2022-06-07&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2022-05-13..2022-06-07&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2022-05-13..2022-06-07&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2022-05-13..2022-06-07&type=Issues)

## 3.4.2

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.4.1...1c8f008679c49e74d8a4ee3c6aa0782dfa6a1d35))

### Bugs fixed

- Building extensions fail if not using latest patch [#12571](https://github.com/jupyterlab/jupyterlab/pull/12571) ([@ajbozarth](https://github.com/ajbozarth))
- fixed shouldOverwrite is never called when rename target exists [#12543](https://github.com/jupyterlab/jupyterlab/pull/12543) ([@ephes](https://github.com/ephes))

### Maintenance and upkeep improvements

- Update dependency version [#12535](https://github.com/jupyterlab/jupyterlab/pull/12535) ([@karlaspuldaro](https://github.com/karlaspuldaro))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2022-05-12&to=2022-05-12&type=c))

[@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2022-05-12..2022-05-12&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2022-05-12..2022-05-12&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2022-05-12..2022-05-12&type=Issues) | [@karlaspuldaro](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akarlaspuldaro+updated%3A2022-05-12..2022-05-12&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2022-05-12..2022-05-12&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2022-05-12..2022-05-12&type=Issues)

## 3.4.1

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.4.0...d8d94b351da08181d4d5e0493539c0eb082a1516))

### Enhancements made

- Setting to use the advanced setting editor for the settings [#12466](https://github.com/jupyterlab/jupyterlab/pull/12466) ([@echarles](https://github.com/echarles))

### Bugs fixed

- Allow users to yarn link @jupyterlab/builder [#12533](https://github.com/jupyterlab/jupyterlab/pull/12533) ([@ajbozarth](https://github.com/ajbozarth))
- Get Auto Close Brackets working consistently in Consoles [#12508](https://github.com/jupyterlab/jupyterlab/pull/12508) ([@Jessie-Newman](https://github.com/Jessie-Newman))
- Handled new dialog creation with no buttons [#12496](https://github.com/jupyterlab/jupyterlab/pull/12496) ([@Jnnamchi](https://github.com/Jnnamchi))
- Handle missing `preferredPath` from the page config [#12521](https://github.com/jupyterlab/jupyterlab/pull/12521) ([@jtpio](https://github.com/jtpio))

### Maintenance and upkeep improvements

- Add cell-toolbar to CI and labeler [#12555](https://github.com/jupyterlab/jupyterlab/pull/12555) ([@fcollonval](https://github.com/fcollonval))
- Allow bot PRs to be automatically labeled [#12509](https://github.com/jupyterlab/jupyterlab/pull/12509) ([@blink1073](https://github.com/blink1073))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2022-05-03&to=2022-05-12&type=c))

[@ajbozarth](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aajbozarth+updated%3A2022-05-03..2022-05-12&type=Issues) | [@echarles](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aecharles+updated%3A2022-05-03..2022-05-12&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2022-05-03..2022-05-12&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2022-05-03..2022-05-12&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2022-05-03..2022-05-12&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2022-05-03..2022-05-12&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2022-05-03..2022-05-12&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2022-05-03..2022-05-12&type=Issues)

## 3.4.0rc0

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.3.4...c394aa25d1845144ee7ebdce611ff12f8d962bb8))

### Enhancements made

- Display default value in setting editor for changed values [#12468](https://github.com/jupyterlab/jupyterlab/pull/12468) ([@echarles](https://github.com/echarles))
- Uses dark theme for Vega when JupyterLab theme is dark [#12411](https://github.com/jupyterlab/jupyterlab/pull/12411) ([@JasonWeill](https://github.com/JasonWeill))
- Creates cell-toolbar, cell-toolbar-extension packages and populates toolbar [#12028](https://github.com/jupyterlab/jupyterlab/pull/12028) ([@JasonWeill](https://github.com/JasonWeill))
- Customize the file browser toolbar via the settings [#12441](https://github.com/jupyterlab/jupyterlab/pull/12441) ([@fcollonval](https://github.com/fcollonval))
- Wait until file browser commands are ready before activating file browser widget [#12435](https://github.com/jupyterlab/jupyterlab/pull/12435) ([@fcollonval](https://github.com/fcollonval))
- Add a "New Tab" button that opens the launcher [#12195](https://github.com/jupyterlab/jupyterlab/pull/12195) ([@ajbozarth](https://github.com/ajbozarth))
- Simplify galata import by proxying `expect` [#12311](https://github.com/jupyterlab/jupyterlab/pull/12311) ([@fcollonval](https://github.com/fcollonval))
- Open terminal in cwd from launcher [#12250](https://github.com/jupyterlab/jupyterlab/pull/12250) ([@rccern](https://github.com/rccern))
- Add support for filtering by field names in setting editor [#12082](https://github.com/jupyterlab/jupyterlab/pull/12082) ([@marthacryan](https://github.com/marthacryan))
- Use transform to quickly switch between tabs. [#11074](https://github.com/jupyterlab/jupyterlab/pull/11074) ([@fcollonval](https://github.com/fcollonval))
- Pop up select kernel dialog when run a cell without kernel [#12379](https://github.com/jupyterlab/jupyterlab/pull/12379) ([@a3626a](https://github.com/a3626a))
- Allow LauncherModel to be more extendable [#12344](https://github.com/jupyterlab/jupyterlab/pull/12344) ([@ajbozarth](https://github.com/ajbozarth))
- Add argument `searchText` and `replaceText` to search and replace commands [#12310](https://github.com/jupyterlab/jupyterlab/pull/12310) ([@fcollonval](https://github.com/fcollonval))
- Add argument line and column to codemirror go to line command [#12204](https://github.com/jupyterlab/jupyterlab/pull/12204) ([@fcollonval](https://github.com/fcollonval))
- Default is no virtual rendering + Relax virtual notebook rendering and ensure no structural change until rendering is completed [#12258](https://github.com/jupyterlab/jupyterlab/pull/12258) ([@echarles](https://github.com/echarles))

### Bugs fixed

- Check if process is declared before optional chaining in makeSettings [#12472](https://github.com/jupyterlab/jupyterlab/pull/12472) ([@fcollonval](https://github.com/fcollonval))
- Signal should only export ISignal publicly [#12471](https://github.com/jupyterlab/jupyterlab/pull/12471) ([@fcollonval](https://github.com/fcollonval))
- Move cell toolbar below search document widget [#12467](https://github.com/jupyterlab/jupyterlab/pull/12467) ([@fcollonval](https://github.com/fcollonval))
- Use css variable for font size. [#12255](https://github.com/jupyterlab/jupyterlab/pull/12255) ([@Carreau](https://github.com/Carreau))

### Maintenance and upkeep improvements

- Only show duplicate LabIcon warning in debug mode [#12480](https://github.com/jupyterlab/jupyterlab/pull/12480) ([@ajbozarth](https://github.com/ajbozarth))
- Update copyright date to 2022 in the about dialog [#12474](https://github.com/jupyterlab/jupyterlab/pull/12474) ([@jtpio](https://github.com/jtpio))
- Fix update snapshot for 3.4.x [#12462](https://github.com/jupyterlab/jupyterlab/pull/12462) ([@fcollonval](https://github.com/fcollonval))
- Update benchmark snapshots [#12451](https://github.com/jupyterlab/jupyterlab/pull/12451) ([@fcollonval](https://github.com/fcollonval))

### Documentation improvements

- Creates cell-toolbar, cell-toolbar-extension packages and populates toolbar [#12028](https://github.com/jupyterlab/jupyterlab/pull/12028) ([@JasonWeill](https://github.com/JasonWeill))
- Customize the file browser toolbar via the settings [#12441](https://github.com/jupyterlab/jupyterlab/pull/12441) ([@fcollonval](https://github.com/fcollonval))

### Deprecated features

- Deprecate FileEditorCodeWrapper [#12381](https://github.com/jupyterlab/jupyterlab/pull/12381) ([@hbcarlos](https://github.com/hbcarlos))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2022-04-15&to=2022-04-28&type=c))

[@bollwyvl](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Abollwyvl+updated%3A2022-04-15..2022-04-28&type=Issues) | [@davidbrochart](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adavidbrochart+updated%3A2022-04-15..2022-04-28&type=Issues) | [@echarles](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aecharles+updated%3A2022-04-15..2022-04-28&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2022-04-15..2022-04-28&type=Issues) | [@gabalafou](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agabalafou+updated%3A2022-04-15..2022-04-28&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2022-04-15..2022-04-28&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2022-04-15..2022-04-28&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2022-04-15..2022-04-28&type=Issues) | [@JasonWeill](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AJasonWeill+updated%3A2022-04-15..2022-04-28&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2022-04-15..2022-04-28&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2022-04-15..2022-04-28&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2022-04-15..2022-04-28&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2022-04-15..2022-04-28&type=Issues)

## 3.4.0

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.3.4...06e043de7cc211e360711fd042b6b474e9b0037b))

### Enhancements made

- Add ability to open settings editor to specific plugin's settings [#12506](https://github.com/jupyterlab/jupyterlab/pull/12506) ([@fcollonval](https://github.com/fcollonval))
- Don't sort context menu items by selector [#12505](https://github.com/jupyterlab/jupyterlab/pull/12505) ([@fcollonval](https://github.com/fcollonval))
- Allow downstream extension to set toolbar layout [#12503](https://github.com/jupyterlab/jupyterlab/pull/12503) ([@fcollonval](https://github.com/fcollonval))
- Display default value in setting editor for changed values [#12468](https://github.com/jupyterlab/jupyterlab/pull/12468) ([@echarles](https://github.com/echarles))
- Uses dark theme for Vega when JupyterLab theme is dark [#12411](https://github.com/jupyterlab/jupyterlab/pull/12411) ([@JasonWeill](https://github.com/JasonWeill))
- Creates cell-toolbar, cell-toolbar-extension packages and populates toolbar [#12028](https://github.com/jupyterlab/jupyterlab/pull/12028) ([@JasonWeill](https://github.com/JasonWeill))
- Customize the file browser toolbar via the settings [#12441](https://github.com/jupyterlab/jupyterlab/pull/12441) ([@fcollonval](https://github.com/fcollonval))
- Wait until file browser commands are ready before activating file browser widget [#12435](https://github.com/jupyterlab/jupyterlab/pull/12435) ([@fcollonval](https://github.com/fcollonval))
- Add a "New Tab" button that opens the launcher [#12195](https://github.com/jupyterlab/jupyterlab/pull/12195) ([@ajbozarth](https://github.com/ajbozarth))
- Simplify galata import by proxying `expect` [#12311](https://github.com/jupyterlab/jupyterlab/pull/12311) ([@fcollonval](https://github.com/fcollonval))
- Open terminal in cwd from launcher [#12250](https://github.com/jupyterlab/jupyterlab/pull/12250) ([@rccern](https://github.com/rccern))
- Add support for filtering by field names in setting editor [#12082](https://github.com/jupyterlab/jupyterlab/pull/12082) ([@marthacryan](https://github.com/marthacryan))
- Use transform to quickly switch between tabs. [#11074](https://github.com/jupyterlab/jupyterlab/pull/11074) ([@fcollonval](https://github.com/fcollonval))
- Pop up select kernel dialog when run a cell without kernel [#12379](https://github.com/jupyterlab/jupyterlab/pull/12379) ([@a3626a](https://github.com/a3626a))
- Allow LauncherModel to be more extendable [#12344](https://github.com/jupyterlab/jupyterlab/pull/12344) ([@ajbozarth](https://github.com/ajbozarth))
- Add argument `searchText` and `replaceText` to search and replace commands [#12310](https://github.com/jupyterlab/jupyterlab/pull/12310) ([@fcollonval](https://github.com/fcollonval))
- Add argument line and column to codemirror go to line command [#12204](https://github.com/jupyterlab/jupyterlab/pull/12204) ([@fcollonval](https://github.com/fcollonval))
- Default is no virtual rendering + Relax virtual notebook rendering and ensure no structural change until rendering is completed [#12258](https://github.com/jupyterlab/jupyterlab/pull/12258) ([@echarles](https://github.com/echarles))

### Bugs fixed

- Ensure settings editor is attached before activation [#12507](https://github.com/jupyterlab/jupyterlab/pull/12507) ([@fcollonval](https://github.com/fcollonval))
- Setting form editor has a formState to avoid focus lost [#12470](https://github.com/jupyterlab/jupyterlab/pull/12470) ([@echarles](https://github.com/echarles))
- Check if process is declared before optional chaining in makeSettings [#12472](https://github.com/jupyterlab/jupyterlab/pull/12472) ([@fcollonval](https://github.com/fcollonval))
- Signal should only export ISignal publicly [#12471](https://github.com/jupyterlab/jupyterlab/pull/12471) ([@fcollonval](https://github.com/fcollonval))
- Move cell toolbar below search document widget [#12467](https://github.com/jupyterlab/jupyterlab/pull/12467) ([@fcollonval](https://github.com/fcollonval))
- Use css variable for font size. [#12255](https://github.com/jupyterlab/jupyterlab/pull/12255) ([@Carreau](https://github.com/Carreau))

### Maintenance and upkeep improvements

- Only show duplicate LabIcon warning in debug mode [#12480](https://github.com/jupyterlab/jupyterlab/pull/12480) ([@ajbozarth](https://github.com/ajbozarth))
- Update copyright date to 2022 in the about dialog [#12474](https://github.com/jupyterlab/jupyterlab/pull/12474) ([@jtpio](https://github.com/jtpio))
- Fix update snapshot for 3.4.x [#12462](https://github.com/jupyterlab/jupyterlab/pull/12462) ([@fcollonval](https://github.com/fcollonval))
- Update benchmark snapshots [#12451](https://github.com/jupyterlab/jupyterlab/pull/12451) ([@fcollonval](https://github.com/fcollonval))

### Documentation improvements

- Creates cell-toolbar, cell-toolbar-extension packages and populates toolbar [#12028](https://github.com/jupyterlab/jupyterlab/pull/12028) ([@JasonWeill](https://github.com/JasonWeill))
- Customize the file browser toolbar via the settings [#12441](https://github.com/jupyterlab/jupyterlab/pull/12441) ([@fcollonval](https://github.com/fcollonval))

### Deprecated features

- Deprecate FileEditorCodeWrapper [#12381](https://github.com/jupyterlab/jupyterlab/pull/12381) ([@hbcarlos](https://github.com/hbcarlos))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2022-04-15&to=2022-05-03&type=c))

[@afshin](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aafshin+updated%3A2022-04-15..2022-05-03&type=Issues) | [@bollwyvl](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Abollwyvl+updated%3A2022-04-15..2022-05-03&type=Issues) | [@davidbrochart](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adavidbrochart+updated%3A2022-04-15..2022-05-03&type=Issues) | [@echarles](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aecharles+updated%3A2022-04-15..2022-05-03&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2022-04-15..2022-05-03&type=Issues) | [@gabalafou](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agabalafou+updated%3A2022-04-15..2022-05-03&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2022-04-15..2022-05-03&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2022-04-15..2022-05-03&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2022-04-15..2022-05-03&type=Issues) | [@JasonWeill](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AJasonWeill+updated%3A2022-04-15..2022-05-03&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2022-04-15..2022-05-03&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2022-04-15..2022-05-03&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2022-04-15..2022-05-03&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2022-04-15..2022-05-03&type=Issues)

## v3.3

## 3.3.4

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.3.3...a8a438b3bd84806b8e186e7e037d73167d371c3a))

### Enhancements made

- Type-only and lazy imports of settings widgets [#12372](https://github.com/jupyterlab/jupyterlab/pull/12372) ([@fcollonval](https://github.com/fcollonval))

### Bugs fixed

- Position collapse heading button next to corresponding h tag (jupyter…) [#12412](https://github.com/jupyterlab/jupyterlab/pull/12412) ([@fcollonval](https://github.com/fcollonval))
- Toolbar items may not act on the proper target [#12368](https://github.com/jupyterlab/jupyterlab/pull/12368) ([@fcollonval](https://github.com/fcollonval))
- Add parent header to input reply kernel message [#12376](https://github.com/jupyterlab/jupyterlab/pull/12376) ([@davidbrochart](https://github.com/davidbrochart))
- fix run cells breaking on non-header markdown cells [#12027](https://github.com/jupyterlab/jupyterlab/pull/12027) ([@andrewfulton9](https://github.com/andrewfulton9))
- Fix debugger extension error when notebooks is closed quickly [#12396](https://github.com/jupyterlab/jupyterlab/pull/12396) ([@fcollonval](https://github.com/fcollonval))
- Changes Vega class name to match source code [#12378](https://github.com/jupyterlab/jupyterlab/pull/12378) ([@JasonWeill](https://github.com/JasonWeill))
- Remove circular setting of source [#12338](https://github.com/jupyterlab/jupyterlab/pull/12338) ([@hbcarlos](https://github.com/hbcarlos))
- Protect against undefined delegated label [#10972](https://github.com/jupyterlab/jupyterlab/pull/10972) ([@fcollonval](https://github.com/fcollonval))

### Maintenance and upkeep improvements

- Use pre-commit [#12404](https://github.com/jupyterlab/jupyterlab/pull/12404) ([@fcollonval](https://github.com/fcollonval))
- Update Playwright snapshots from PR comments [#12403](https://github.com/jupyterlab/jupyterlab/pull/12403) ([@fcollonval](https://github.com/fcollonval))
- Bump moment from 2.29.1 to 2.29.2 [#12389](https://github.com/jupyterlab/jupyterlab/pull/12389) ([@fcollonval](https://github.com/fcollonval))

### Documentation improvements

- Fix GitHub link [#12410](https://github.com/jupyterlab/jupyterlab/pull/12410) ([@fcollonval](https://github.com/fcollonval))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2022-04-07&to=2022-04-15&type=c))

[@aiqc](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aaiqc+updated%3A2022-04-07..2022-04-15&type=Issues) | [@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2022-04-07..2022-04-15&type=Issues) | [@echarles](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aecharles+updated%3A2022-04-07..2022-04-15&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2022-04-07..2022-04-15&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2022-04-07..2022-04-15&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2022-04-07..2022-04-15&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2022-04-07..2022-04-15&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2022-04-07..2022-04-15&type=Issues) | [@JasonWeill](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AJasonWeill+updated%3A2022-04-07..2022-04-15&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2022-04-07..2022-04-15&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2022-04-07..2022-04-15&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2022-04-07..2022-04-15&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2022-04-07..2022-04-15&type=Issues)

## 3.3.3

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.3.2...d97ff7161640634f69e70b184b9e255a68620f95))

### Enhancements made

- Add a preferred-dir icon to the file browser crumbs [#12354](https://github.com/jupyterlab/jupyterlab/pull/12354) ([@echarles](https://github.com/echarles))
- Adds preferKernel option to JupyterLab code [#12260](https://github.com/jupyterlab/jupyterlab/pull/12260) ([@JasonWeill](https://github.com/JasonWeill))
- Add aria progressbar role and data-status for testing in extensions [#12238](https://github.com/jupyterlab/jupyterlab/pull/12238) ([@krassowski](https://github.com/krassowski))

### Bugs fixed

- Fix Markdown cell generates duplicate toc content (#12312) [#12314](https://github.com/jupyterlab/jupyterlab/pull/12314) ([@yangql176](https://github.com/yangql176))
- Fix settings with `null` default not getting marked as modified [#12240](https://github.com/jupyterlab/jupyterlab/pull/12240) ([@krassowski](https://github.com/krassowski))
- Allow linear and radial gradient [#12276](https://github.com/jupyterlab/jupyterlab/pull/12276) ([@krassowski](https://github.com/krassowski))
- Don't rely on search results to filter installed extension [#12249](https://github.com/jupyterlab/jupyterlab/pull/12249) ([@fcollonval](https://github.com/fcollonval))
- Fix directory not found error when preferred_dir is set [#12220](https://github.com/jupyterlab/jupyterlab/pull/12220) ([@andrewfulton9](https://github.com/andrewfulton9))
- Fix state restoration in the notebook extension [#12218](https://github.com/jupyterlab/jupyterlab/pull/12218) ([@jtpio](https://github.com/jtpio))
- Fix sdist editable install and add tests [#12224](https://github.com/jupyterlab/jupyterlab/pull/12224) ([@blink1073](https://github.com/blink1073))

### Maintenance and upkeep improvements

- \[3.3.x\] Add git-blame-ignore-revs file [#12289](https://github.com/jupyterlab/jupyterlab/pull/12289) ([@blink1073](https://github.com/blink1073))
- \[3.3.x\] Run black [#12282](https://github.com/jupyterlab/jupyterlab/pull/12282) ([@blink1073](https://github.com/blink1073))
- Stop using py.test [#12262](https://github.com/jupyterlab/jupyterlab/pull/12262) ([@fcollonval](https://github.com/fcollonval))
- Inline `expected_http_error` function from `jupyterlab_server.tests` [#12228](https://github.com/jupyterlab/jupyterlab/pull/12228) ([@jtpio](https://github.com/jtpio))

### Documentation improvements

- \[3.3.x\] Run black [#12282](https://github.com/jupyterlab/jupyterlab/pull/12282) ([@blink1073](https://github.com/blink1073))
- Stop using py.test [#12262](https://github.com/jupyterlab/jupyterlab/pull/12262) ([@fcollonval](https://github.com/fcollonval))
- Update link to `jupyterlab-some-package` in docs [#12248](https://github.com/jupyterlab/jupyterlab/pull/12248) ([@jtpio](https://github.com/jtpio))
- Update command in Performance Testing to use the right option [#12215](https://github.com/jupyterlab/jupyterlab/pull/12215) ([@JasonWeill](https://github.com/JasonWeill))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2022-03-14&to=2022-04-07&type=c))

[@afshin](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aafshin+updated%3A2022-03-14..2022-04-07&type=Issues) | [@aiqc](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aaiqc+updated%3A2022-03-14..2022-04-07&type=Issues) | [@ajbozarth](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aajbozarth+updated%3A2022-03-14..2022-04-07&type=Issues) | [@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2022-03-14..2022-04-07&type=Issues) | [@bollwyvl](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Abollwyvl+updated%3A2022-03-14..2022-04-07&type=Issues) | [@damianavila](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adamianavila+updated%3A2022-03-14..2022-04-07&type=Issues) | [@davidbrochart](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adavidbrochart+updated%3A2022-03-14..2022-04-07&type=Issues) | [@echarles](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aecharles+updated%3A2022-03-14..2022-04-07&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2022-03-14..2022-04-07&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2022-03-14..2022-04-07&type=Issues) | [@hbcarlos](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahbcarlos+updated%3A2022-03-14..2022-04-07&type=Issues) | [@isabela-pf](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aisabela-pf+updated%3A2022-03-14..2022-04-07&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2022-03-14..2022-04-07&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2022-03-14..2022-04-07&type=Issues) | [@JasonWeill](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AJasonWeill+updated%3A2022-03-14..2022-04-07&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2022-03-14..2022-04-07&type=Issues) | [@marthacryan](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Amarthacryan+updated%3A2022-03-14..2022-04-07&type=Issues) | [@martinRenou](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AmartinRenou+updated%3A2022-03-14..2022-04-07&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2022-03-14..2022-04-07&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2022-03-14..2022-04-07&type=Issues) | [@mlucool](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Amlucool+updated%3A2022-03-14..2022-04-07&type=Issues) | [@rccern](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Arccern+updated%3A2022-03-14..2022-04-07&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2022-03-14..2022-04-07&type=Issues)

## 3.3.2

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.3.1...5abe7f69837af8c349d5448f6f3e70db6c48c6e0))

### Bugs fixed

- Remove use of ipython_genutils [#12202](https://github.com/jupyterlab/jupyterlab/pull/12202) ([@blink1073](https://github.com/blink1073))

### Documentation improvements

- Add note about `async`, `await` and `Promises` in the extension tutorial [#12199](https://github.com/jupyterlab/jupyterlab/pull/12199) ([@jtpio](https://github.com/jtpio))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2022-03-09&to=2022-03-14&type=c))

[@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2022-03-09..2022-03-14&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2022-03-09..2022-03-14&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2022-03-09..2022-03-14&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2022-03-09..2022-03-14&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2022-03-09..2022-03-14&type=Issues)

## 3.3.1

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.3.0...a51e1110263c28211ed9e8e0a4bba247c828af94))

### Enhancements made

- Add a note to command line option that collaborative mode is experimental [#12173](https://github.com/jupyterlab/jupyterlab/pull/12173) ([@jasongrout](https://github.com/jasongrout))
- Adds warning that RTC is experimental [#12171](https://github.com/jupyterlab/jupyterlab/pull/12171) ([@JasonWeill](https://github.com/JasonWeill))
- Export KernelConnection [#12156](https://github.com/jupyterlab/jupyterlab/pull/12156) ([@tkrabel-db](https://github.com/tkrabel-db))

### Bugs fixed

- Backport PR #12122: Remove duplicated shortcuts [#12181](https://github.com/jupyterlab/jupyterlab/pull/12181) ([@fcollonval](https://github.com/fcollonval))
- Correct the set item logic of `CodeCellModel.onModelDBOutputsChange` [#12147](https://github.com/jupyterlab/jupyterlab/pull/12147) ([@trungleduc](https://github.com/trungleduc))
- fix: typo in ShortcutItem component [#12161](https://github.com/jupyterlab/jupyterlab/pull/12161) ([@sparanoid](https://github.com/sparanoid))

### Documentation improvements

- Adds warning that RTC is experimental [#12171](https://github.com/jupyterlab/jupyterlab/pull/12171) ([@JasonWeill](https://github.com/JasonWeill))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2022-03-02&to=2022-03-09&type=c))

[@davidbrochart](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adavidbrochart+updated%3A2022-03-02..2022-03-09&type=Issues) | [@echarles](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aecharles+updated%3A2022-03-02..2022-03-09&type=Issues) | [@ellisonbg](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aellisonbg+updated%3A2022-03-02..2022-03-09&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2022-03-02..2022-03-09&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2022-03-02..2022-03-09&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2022-03-02..2022-03-09&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2022-03-02..2022-03-09&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2022-03-02..2022-03-09&type=Issues) | [@JasonWeill](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AJasonWeill+updated%3A2022-03-02..2022-03-09&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2022-03-02..2022-03-09&type=Issues) | [@martinRenou](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AmartinRenou+updated%3A2022-03-02..2022-03-09&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2022-03-02..2022-03-09&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2022-03-02..2022-03-09&type=Issues)

## 3.3.0

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.2.5...6e484f89df73e09c29e8608e5eca88fa48cc4267))

### Enhancements made

- Document search debounce time via setting [#12121](https://github.com/jupyterlab/jupyterlab/pull/12121) ([@fcollonval](https://github.com/fcollonval))
- Improve toggled button styles in debugger. [#12120](https://github.com/jupyterlab/jupyterlab/pull/12120) ([@fcollonval](https://github.com/fcollonval))
- Support dynamic toolbar definition [#12078](https://github.com/jupyterlab/jupyterlab/pull/12078) ([@fcollonval](https://github.com/fcollonval))
- Debounce kernel sources filter [#12068](https://github.com/jupyterlab/jupyterlab/pull/12068) ([@fcollonval](https://github.com/fcollonval))
- Settings UI gives an unreadable JSON dump [#12064](https://github.com/jupyterlab/jupyterlab/pull/12064) ([@fcollonval](https://github.com/fcollonval))
- Polish settings editor [#12061](https://github.com/jupyterlab/jupyterlab/pull/12061) ([@fcollonval](https://github.com/fcollonval))
- Show pause on exception button when not available and change caption … [#12005](https://github.com/jupyterlab/jupyterlab/pull/12005) ([@andrewfulton9](https://github.com/andrewfulton9))
- Fix contrast in dark theme of settings editor [#12004](https://github.com/jupyterlab/jupyterlab/pull/12004) ([@krassowski](https://github.com/krassowski))
- Fix for kernel reconnect [#11952](https://github.com/jupyterlab/jupyterlab/pull/11952) ([@3coins](https://github.com/3coins))
- Add settings UI [#11977](https://github.com/jupyterlab/jupyterlab/pull/11977) ([@fcollonval](https://github.com/fcollonval))
- Show the kernel sources as a debugger tab and allow the user to break in kernel sources [#11954](https://github.com/jupyterlab/jupyterlab/pull/11954) ([@echarles](https://github.com/echarles))
- Enable not showing editor for read-only Markdown cells [#11950](https://github.com/jupyterlab/jupyterlab/pull/11950) ([@fcollonval](https://github.com/fcollonval))
- Add side-by-side margin override in the notebookConfig [#11880](https://github.com/jupyterlab/jupyterlab/pull/11880) ([@echarles](https://github.com/echarles))
- Add additional `Accel Enter` keyboard shortcuts for the `notebook:run-cell` command [#11942](https://github.com/jupyterlab/jupyterlab/pull/11942) ([@jtpio](https://github.com/jtpio))
- Add execution progress indicator [#11941](https://github.com/jupyterlab/jupyterlab/pull/11941) ([@trungleduc](https://github.com/trungleduc))
- Allow to link factory to file type when adding it [#11540](https://github.com/jupyterlab/jupyterlab/pull/11540) ([@fcollonval](https://github.com/fcollonval))
- Pause on exception [#11923](https://github.com/jupyterlab/jupyterlab/pull/11923) ([@andrewfulton9](https://github.com/andrewfulton9))
- Increase color contrast in input boxes [#11922](https://github.com/jupyterlab/jupyterlab/pull/11922) ([@fcollonval](https://github.com/fcollonval))
- Add startMode setting to define the startup mode [#11881](https://github.com/jupyterlab/jupyterlab/pull/11881) ([@echarles](https://github.com/echarles))
- Update variable renderer panels [#11874](https://github.com/jupyterlab/jupyterlab/pull/11874) ([@fcollonval](https://github.com/fcollonval))
- Allow extensions and users to customize easily toolbar items. [#11873](https://github.com/jupyterlab/jupyterlab/pull/11873) ([@fcollonval](https://github.com/fcollonval))
- Add debugger variable renderer based on mime type [#11871](https://github.com/jupyterlab/jupyterlab/pull/11871) ([@fcollonval](https://github.com/fcollonval))
- Add a command to open a file from a URL [#11870](https://github.com/jupyterlab/jupyterlab/pull/11870) ([@fcollonval](https://github.com/fcollonval))
- List workspaces [#11869](https://github.com/jupyterlab/jupyterlab/pull/11869) ([@fcollonval](https://github.com/fcollonval))
- Add closeOnExit terminal option [#11868](https://github.com/jupyterlab/jupyterlab/pull/11868) ([@fcollonval](https://github.com/fcollonval))
- Mentions pip3 for macOS users in docs [#11848](https://github.com/jupyterlab/jupyterlab/pull/11848) ([@JasonWeill](https://github.com/JasonWeill))
- Toc running cell indicator [#11804](https://github.com/jupyterlab/jupyterlab/pull/11804) ([@andrewfulton9](https://github.com/andrewfulton9))
- Fix overlapped shadow for scrolling output cell [#11785](https://github.com/jupyterlab/jupyterlab/pull/11785) ([@thesinepainter](https://github.com/thesinepainter))
- Toggle side-by-side rendering for current notebook (#11793) [#11794](https://github.com/jupyterlab/jupyterlab/pull/11794) ([@fcollonval](https://github.com/fcollonval))

### Bugs fixed

- Build UMD module for @jupyterlab/services [#12141](https://github.com/jupyterlab/jupyterlab/pull/12141) ([@fcollonval](https://github.com/fcollonval))
- Fix broken link in docs [#12138](https://github.com/jupyterlab/jupyterlab/pull/12138) ([@JasonWeill](https://github.com/JasonWeill))
- Fix: Select kernel text (when open a no kernel .ipynb file) is not translated correctly (#12133) [#12135](https://github.com/jupyterlab/jupyterlab/pull/12135) ([@yangql176](https://github.com/yangql176))
- Opening keyboard shortcuts UI result in "destruction" of shortcut settings [#12112](https://github.com/jupyterlab/jupyterlab/pull/12112) ([@fcollonval](https://github.com/fcollonval))
- Fix error rendering in Advanced Settings Editor [#12107](https://github.com/jupyterlab/jupyterlab/pull/12107) ([@krassowski](https://github.com/krassowski))
- Fix json schema for kernel status settings [#11451](https://github.com/jupyterlab/jupyterlab/pull/11451) ([@fcollonval](https://github.com/fcollonval))
- Remove toolbar factory setting trick in the tests [#12096](https://github.com/jupyterlab/jupyterlab/pull/12096) ([@jtpio](https://github.com/jtpio))
- Log error on open document widget. [#12080](https://github.com/jupyterlab/jupyterlab/pull/12080) ([@trungleduc](https://github.com/trungleduc))
- update status to unknown when kernel is shutdown from running kernels tab [#12083](https://github.com/jupyterlab/jupyterlab/pull/12083) ([@akshaychitneni](https://github.com/akshaychitneni))
- Handle shutdown error [#12048](https://github.com/jupyterlab/jupyterlab/pull/12048) ([@Zsailer](https://github.com/Zsailer))
- use path-like comparison in initialize_templates() [#12024](https://github.com/jupyterlab/jupyterlab/pull/12024) ([@kellyyke](https://github.com/kellyyke))
- Fix misaligned icon and checkbox of setting editor [#11976](https://github.com/jupyterlab/jupyterlab/pull/11976) ([@trungleduc](https://github.com/trungleduc))
- overrides.json definition takes precedence [#11610](https://github.com/jupyterlab/jupyterlab/pull/11610) ([@fcollonval](https://github.com/fcollonval))
- Adjust z-index of execution progress tooltip [#11973](https://github.com/jupyterlab/jupyterlab/pull/11973) ([@Sync271](https://github.com/Sync271))
- Fix the debug modules model #11967 [#11968](https://github.com/jupyterlab/jupyterlab/pull/11968) ([@echarles](https://github.com/echarles))
- Fix autocomplete in console [#11949](https://github.com/jupyterlab/jupyterlab/pull/11949) ([@fcollonval](https://github.com/fcollonval))
- fix(docprovider): fix issue with empty notebook [#11901](https://github.com/jupyterlab/jupyterlab/pull/11901) ([@entropitor](https://github.com/entropitor))
- Ensure a single modal is opened in case of time conflict savings [#11883](https://github.com/jupyterlab/jupyterlab/pull/11883) ([@echarles](https://github.com/echarles))
- Restore line number state when stopping debugger [#11768](https://github.com/jupyterlab/jupyterlab/pull/11768) ([@fcollonval](https://github.com/fcollonval))
- Backport PR #11852 on branch 3.3.x (Add percent decoding to username) [#11865](https://github.com/jupyterlab/jupyterlab/pull/11865) ([@fcollonval](https://github.com/fcollonval))
- Fix Handling of WebSocket Startup Errors [#11358](https://github.com/jupyterlab/jupyterlab/pull/11358) ([@blink1073](https://github.com/blink1073))
- Specify an output hash function for Galata [#11830](https://github.com/jupyterlab/jupyterlab/pull/11830) ([@jasongrout](https://github.com/jasongrout))
- Preserve breakpoint gutter when cells are moved. [#11766](https://github.com/jupyterlab/jupyterlab/pull/11766) ([@fcollonval](https://github.com/fcollonval))

### Maintenance and upkeep improvements

- Parse URL parameters in user model [#12065](https://github.com/jupyterlab/jupyterlab/pull/12065) ([@fcollonval](https://github.com/fcollonval))
- Update vscode-debugprotocol to @vscode/debugprotocol [#11953](https://github.com/jupyterlab/jupyterlab/pull/11953) ([@fcollonval](https://github.com/fcollonval))
- Partly backport PR #11388 on branch 3.3.x (Add update galata snapshot step) [#11927](https://github.com/jupyterlab/jupyterlab/pull/11927) ([@fcollonval](https://github.com/fcollonval))
- Use `maintainer-tools` base setup action [#11595](https://github.com/jupyterlab/jupyterlab/pull/11595) ([@jtpio](https://github.com/jtpio))
- Drop testing Python 3.6, test on Python 3.10 [#11867](https://github.com/jupyterlab/jupyterlab/pull/11867) ([@fcollonval](https://github.com/fcollonval))
- Drop support for Python 3.6 [#11740](https://github.com/jupyterlab/jupyterlab/pull/11740) ([@jtpio](https://github.com/jtpio))
- Use the root yarn.lock in staging when making a release. [#11433](https://github.com/jupyterlab/jupyterlab/pull/11433) ([@jasongrout](https://github.com/jasongrout))
- Update reference snapshot for the completer UI test [#11846](https://github.com/jupyterlab/jupyterlab/pull/11846) ([@jtpio](https://github.com/jtpio))
- Bump version for the 3.3 prerelease [#11810](https://github.com/jupyterlab/jupyterlab/pull/11810) ([@jtpio](https://github.com/jtpio))

### Documentation improvements

- Fix broken link in docs [#12138](https://github.com/jupyterlab/jupyterlab/pull/12138) ([@JasonWeill](https://github.com/JasonWeill))
- Fix anchors and myst configuration [#12063](https://github.com/jupyterlab/jupyterlab/pull/12063) ([@fcollonval](https://github.com/fcollonval))
- docs: fix shell command with unquoted '>' [#12002](https://github.com/jupyterlab/jupyterlab/pull/12002) ([@ErikBjare](https://github.com/ErikBjare))
- Update screenshots and text for user interface docs [#11982](https://github.com/jupyterlab/jupyterlab/pull/11982) ([@fcollonval](https://github.com/fcollonval))
- Update several extensions readme files to delete old content. [#11947](https://github.com/jupyterlab/jupyterlab/pull/11947) ([@jasongrout](https://github.com/jasongrout))
- Remove theme cookiecutter from the docs [#11928](https://github.com/jupyterlab/jupyterlab/pull/11928) ([@jtpio](https://github.com/jtpio))
- Allow extensions and users to customize easily toolbar items. [#11873](https://github.com/jupyterlab/jupyterlab/pull/11873) ([@fcollonval](https://github.com/fcollonval))
- Mentions pip3 for macOS users in docs [#11848](https://github.com/jupyterlab/jupyterlab/pull/11848) ([@JasonWeill](https://github.com/JasonWeill))
- Add `3.1.19` Changelog Entry [#11842](https://github.com/jupyterlab/jupyterlab/pull/11842) ([@jtpio](https://github.com/jtpio))
- Give conda instructions for the pixman pkg-config error. [#11829](https://github.com/jupyterlab/jupyterlab/pull/11829) ([@jasongrout](https://github.com/jasongrout))

### API and Breaking Changes

- Toc running cell indicator [#11804](https://github.com/jupyterlab/jupyterlab/pull/11804) ([@andrewfulton9](https://github.com/andrewfulton9))
- Toggle side-by-side rendering for current notebook (#11793) [#11794](https://github.com/jupyterlab/jupyterlab/pull/11794) ([@fcollonval](https://github.com/fcollonval))

### Other merged PRs

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-12-10&to=2022-03-02&type=c))

[@agoose77](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aagoose77+updated%3A2021-12-10..2022-03-02&type=Issues) | [@andrewfulton9](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aandrewfulton9+updated%3A2021-12-10..2022-03-02&type=Issues) | [@baggiponte](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Abaggiponte+updated%3A2021-12-10..2022-03-02&type=Issues) | [@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2021-12-10..2022-03-02&type=Issues) | [@bollwyvl](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Abollwyvl+updated%3A2021-12-10..2022-03-02&type=Issues) | [@Carreau](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3ACarreau+updated%3A2021-12-10..2022-03-02&type=Issues) | [@davidbrochart](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adavidbrochart+updated%3A2021-12-10..2022-03-02&type=Issues) | [@dmonad](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Admonad+updated%3A2021-12-10..2022-03-02&type=Issues) | [@echarles](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aecharles+updated%3A2021-12-10..2022-03-02&type=Issues) | [@ellisonbg](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aellisonbg+updated%3A2021-12-10..2022-03-02&type=Issues) | [@ErikBjare](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AErikBjare+updated%3A2021-12-10..2022-03-02&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2021-12-10..2022-03-02&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2021-12-10..2022-03-02&type=Issues) | [@hbcarlos](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahbcarlos+updated%3A2021-12-10..2022-03-02&type=Issues) | [@isabela-pf](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aisabela-pf+updated%3A2021-12-10..2022-03-02&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2021-12-10..2022-03-02&type=Issues) | [@JohanMabille](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AJohanMabille+updated%3A2021-12-10..2022-03-02&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2021-12-10..2022-03-02&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2021-12-10..2022-03-02&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2021-12-10..2022-03-02&type=Issues) | [@JasonWeill](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AJasonWeill+updated%3A2021-12-10..2022-03-02&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2021-12-10..2022-03-02&type=Issues) | [@marthacryan](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Amarthacryan+updated%3A2021-12-10..2022-03-02&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2021-12-10..2022-03-02&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2021-12-10..2022-03-02&type=Issues) | [@mlucool](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Amlucool+updated%3A2021-12-10..2022-03-02&type=Issues) | [@schmidi314](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aschmidi314+updated%3A2021-12-10..2022-03-02&type=Issues) | [@SylvainCorlay](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3ASylvainCorlay+updated%3A2021-12-10..2022-03-02&type=Issues) | [@Sync271](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3ASync271+updated%3A2021-12-10..2022-03-02&type=Issues) | [@telamonian](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Atelamonian+updated%3A2021-12-10..2022-03-02&type=Issues) | [@thesinepainter](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Athesinepainter+updated%3A2021-12-10..2022-03-02&type=Issues) | [@trungleduc](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Atrungleduc+updated%3A2021-12-10..2022-03-02&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2021-12-10..2022-03-02&type=Issues) | [@yuvipanda](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ayuvipanda+updated%3A2021-12-10..2022-03-02&type=Issues) | [@Zsailer](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AZsailer+updated%3A2021-12-10..2022-03-02&type=Issues)

## v3.2

## 3.2.9

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.2.8...dbfc96a51c872288f16b7340398bf99a3df14b1f))

### Bugs fixed

- overrides.json definition takes precedence [#11980](https://github.com/jupyterlab/jupyterlab/pull/11980) ([@fcollonval](https://github.com/fcollonval))
- Fix autocomplete in console [#11949](https://github.com/jupyterlab/jupyterlab/pull/11949) ([@fcollonval](https://github.com/fcollonval))
- Add percent decoding to username [#11865](https://github.com/jupyterlab/jupyterlab/pull/11865) ([@fcollonval](https://github.com/fcollonval))

### Maintenance and upkeep improvements

- Use `maintainer-tools` base setup action [#11595](https://github.com/jupyterlab/jupyterlab/pull/11595) ([@jtpio](https://github.com/jtpio))
- Drop testing Python 3.6, test on Python 3.10 [#11646](https://github.com/jupyterlab/jupyterlab/pull/11646) ([@jtpio](https://github.com/jtpio))

### Documentation improvements

- Update screenshots and text for user interface docs [#11981](https://github.com/jupyterlab/jupyterlab/pull/11981) ([@fcollonval](https://github.com/fcollonval))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2022-01-13&to=2022-02-04&type=c))

[@andrewfulton9](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aandrewfulton9+updated%3A2022-01-13..2022-02-04&type=Issues) | [@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2022-01-13..2022-02-04&type=Issues) | [@bollwyvl](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Abollwyvl+updated%3A2022-01-13..2022-02-04&type=Issues) | [@echarles](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aecharles+updated%3A2022-01-13..2022-02-04&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2022-01-13..2022-02-04&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2022-01-13..2022-02-04&type=Issues) | [@hbcarlos](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahbcarlos+updated%3A2022-01-13..2022-02-04&type=Issues) | [@isabela-pf](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aisabela-pf+updated%3A2022-01-13..2022-02-04&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2022-01-13..2022-02-04&type=Issues) | [@JohanMabille](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AJohanMabille+updated%3A2022-01-13..2022-02-04&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2022-01-13..2022-02-04&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2022-01-13..2022-02-04&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2022-01-13..2022-02-04&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2022-01-13..2022-02-04&type=Issues) | [@marthacryan](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Amarthacryan+updated%3A2022-01-13..2022-02-04&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2022-01-13..2022-02-04&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2022-01-13..2022-02-04&type=Issues) | [@mlucool](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Amlucool+updated%3A2022-01-13..2022-02-04&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2022-01-13..2022-02-04&type=Issues) | [@yuvipanda](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ayuvipanda+updated%3A2022-01-13..2022-02-04&type=Issues) | [@Zsailer](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AZsailer+updated%3A2022-01-13..2022-02-04&type=Issues)

## 3.2.8

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.2.7...b2402e5b9e0db0416b5f0e5ac29c9104a69f0c83))

### Maintenance and upkeep improvements

- Use the root yarn.lock in staging when making a release. [#11433](https://github.com/jupyterlab/jupyterlab/pull/11433) ([@jasongrout](https://github.com/jasongrout))
- Update reference snapshot for the completer UI test [#11847](https://github.com/jupyterlab/jupyterlab/pull/11847) ([@jtpio](https://github.com/jtpio))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2022-01-12&to=2022-01-13&type=c))

[@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2022-01-12..2022-01-13&type=Issues) | [@hbcarlos](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahbcarlos+updated%3A2022-01-12..2022-01-13&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2022-01-12..2022-01-13&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2022-01-12..2022-01-13&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2022-01-12..2022-01-13&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2022-01-12..2022-01-13&type=Issues)

## 3.2.7

No merged PRs

## 3.2.6

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.2.5...ebce458c5e55126a7cbd5082f669446269007a34))

### Enhancements made

- Add JSX CodeMirror mode [#11666](https://github.com/jupyterlab/jupyterlab/pull/11666) ([@krassowski](https://github.com/krassowski))
- Remove leading slash from console path [#11626](https://github.com/jupyterlab/jupyterlab/pull/11626) ([@davidbrochart](https://github.com/davidbrochart))

### Bugs fixed

- Restore compact notebook layout on mobile [#11778](https://github.com/jupyterlab/jupyterlab/pull/11778) ([@jtpio](https://github.com/jtpio))
- Ensure browser attributes are set in plugin adding it [#11758](https://github.com/jupyterlab/jupyterlab/pull/11758) ([@fcollonval](https://github.com/fcollonval))
- Fix handling of disabled extensions [#11744](https://github.com/jupyterlab/jupyterlab/pull/11744) ([@jtpio](https://github.com/jtpio))
- Update debugger icon css to work with white panel background [#11688](https://github.com/jupyterlab/jupyterlab/pull/11688) ([@andrewfulton9](https://github.com/andrewfulton9))
- Ensure the dialog does not close if you drag outside by mistake [#11673](https://github.com/jupyterlab/jupyterlab/pull/11673) ([@echarles](https://github.com/echarles))
- Add JSX CodeMirror mode [#11666](https://github.com/jupyterlab/jupyterlab/pull/11666) ([@krassowski](https://github.com/krassowski))

### Maintenance and upkeep improvements

- Revert "Toggle side-by-side rendering for current notebook" [#11793](https://github.com/jupyterlab/jupyterlab/pull/11793) ([@fcollonval](https://github.com/fcollonval))
- Fix integrity failure on CI [#11770](https://github.com/jupyterlab/jupyterlab/pull/11770) ([@jtpio](https://github.com/jtpio))

### Documentation improvements

- Triage documentation [#11661](https://github.com/jupyterlab/jupyterlab/pull/11661) ([@JasonWeill](https://github.com/JasonWeill))
- Add text on how to run it in a dir other than home [#11761](https://github.com/jupyterlab/jupyterlab/pull/11761) ([@TheOtherRealm](https://github.com/TheOtherRealm))
- Encourage new contributors to send draft PR over asking for permission [#11746](https://github.com/jupyterlab/jupyterlab/pull/11746) ([@krassowski](https://github.com/krassowski))
- Fix changelog link [#11668](https://github.com/jupyterlab/jupyterlab/pull/11668) ([@krassowski](https://github.com/krassowski))

### Other merged PRs

- Toggle side-by-side rendering for current notebook [#11718](https://github.com/jupyterlab/jupyterlab/pull/11718) ([@echarles](https://github.com/echarles))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-12-10&to=2022-01-07&type=c))

[@andrewfulton9](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aandrewfulton9+updated%3A2021-12-10..2022-01-07&type=Issues) | [@bollwyvl](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Abollwyvl+updated%3A2021-12-10..2022-01-07&type=Issues) | [@davidbrochart](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adavidbrochart+updated%3A2021-12-10..2022-01-07&type=Issues) | [@echarles](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aecharles+updated%3A2021-12-10..2022-01-07&type=Issues) | [@ellisonbg](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aellisonbg+updated%3A2021-12-10..2022-01-07&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2021-12-10..2022-01-07&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2021-12-10..2022-01-07&type=Issues) | [@hbcarlos](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahbcarlos+updated%3A2021-12-10..2022-01-07&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2021-12-10..2022-01-07&type=Issues) | [@JohanMabille](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AJohanMabille+updated%3A2021-12-10..2022-01-07&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2021-12-10..2022-01-07&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2021-12-10..2022-01-07&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2021-12-10..2022-01-07&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2021-12-10..2022-01-07&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2021-12-10..2022-01-07&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2021-12-10..2022-01-07&type=Issues) | [@schmidi314](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aschmidi314+updated%3A2021-12-10..2022-01-07&type=Issues) | [@TheOtherRealm](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3ATheOtherRealm+updated%3A2021-12-10..2022-01-07&type=Issues) | [@thesinepainter](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Athesinepainter+updated%3A2021-12-10..2022-01-07&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2021-12-10..2022-01-07&type=Issues)

## 3.2.5

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.2.4...97b8069f014c51f584c86165ec0aff8c98be99cb))

### Enhancements made

- Tweak CSS for scrolled outputs [#11478](https://github.com/jupyterlab/jupyterlab/pull/11478) ([@jtpio](https://github.com/jtpio))
- Add side-by-side rendering as global setting [#11533](https://github.com/jupyterlab/jupyterlab/pull/11533) ([@jess-x](https://github.com/jess-x))

### Bugs fixed

- Fix menu items for toc [#11634](https://github.com/jupyterlab/jupyterlab/pull/11634) ([@fcollonval](https://github.com/fcollonval))
- Restore accidentally removed ToC context menu [#11617](https://github.com/jupyterlab/jupyterlab/pull/11617) ([@krassowski](https://github.com/krassowski))
- Increase notebook-cell margin in side-by-side mode [#11539](https://github.com/jupyterlab/jupyterlab/pull/11539) ([@jess-x](https://github.com/jess-x))
- Support file type extension with upper case [#11526](https://github.com/jupyterlab/jupyterlab/pull/11526) ([@fcollonval](https://github.com/fcollonval))
- Sync dirty property between clients [#11525](https://github.com/jupyterlab/jupyterlab/pull/11525) ([@hbcarlos](https://github.com/hbcarlos))
- Fix markdown benchmark snapshot [#11575](https://github.com/jupyterlab/jupyterlab/pull/11575) ([@fcollonval](https://github.com/fcollonval))
- Cell YModel: Fix setAttachment method [#11529](https://github.com/jupyterlab/jupyterlab/pull/11529) ([@martinRenou](https://github.com/martinRenou))
- Allow cross-file anchors with leading number [#11517](https://github.com/jupyterlab/jupyterlab/pull/11517) ([@loichuder](https://github.com/loichuder))
- Update ModelDB metadata when switching the shared model [#11493](https://github.com/jupyterlab/jupyterlab/pull/11493) ([@hbcarlos](https://github.com/hbcarlos))
- Connecting `toggleCollapsedSignal` to handler right at creation of Markdown [#11514](https://github.com/jupyterlab/jupyterlab/pull/11514) ([@fcollonval](https://github.com/fcollonval))
- Update `sanitize-html` pin to 3.5.3 [#11513](https://github.com/jupyterlab/jupyterlab/pull/11513) ([@fcollonval](https://github.com/fcollonval))
- Only show the head of the outputs and ensure iopub outputs are correctly displayed [#11502](https://github.com/jupyterlab/jupyterlab/pull/11502) ([@fcollonval](https://github.com/fcollonval))
- Fix Tex highlights affecting Markdown with standalone `$` [#11488](https://github.com/jupyterlab/jupyterlab/pull/11488) ([@krassowski](https://github.com/krassowski))
- Fix malformed fenced code block Markdown rendering [#11479](https://github.com/jupyterlab/jupyterlab/pull/11479) ([@krassowski](https://github.com/krassowski))

### Maintenance and upkeep improvements

- Explicitly build JupyterLab in dev-mode [#11585](https://github.com/jupyterlab/jupyterlab/pull/11585) ([@fcollonval](https://github.com/fcollonval))
- Fix markdown benchmark snapshot [#11575](https://github.com/jupyterlab/jupyterlab/pull/11575) ([@fcollonval](https://github.com/fcollonval))
- postcss 8.4.0 breaks integrity 2 CI test [#11552](https://github.com/jupyterlab/jupyterlab/pull/11552) ([@fcollonval](https://github.com/fcollonval))
- Bump tmpl from 1.0.4 to 1.0.5 [#11512](https://github.com/jupyterlab/jupyterlab/pull/11512) ([@dependabot\[bot\]](https://github.com/dependabot))
- Increase notebook markdown test robustness [#11524](https://github.com/jupyterlab/jupyterlab/pull/11524) ([@fcollonval](https://github.com/fcollonval))
- Bump semver-regex from 3.1.2 to 3.1.3 [#11511](https://github.com/jupyterlab/jupyterlab/pull/11511) ([@dependabot\[bot\]](https://github.com/dependabot))
- Run UI test on 3.2.x push [#11521](https://github.com/jupyterlab/jupyterlab/pull/11521) ([@fcollonval](https://github.com/fcollonval))
- Enforce labels on PRs [#11496](https://github.com/jupyterlab/jupyterlab/pull/11496) ([@blink1073](https://github.com/blink1073))

### Documentation

- Missing parenthesis [#11590](https://github.com/jupyterlab/jupyterlab/pull/11590) ([@davidbrochart](https://github.com/davidbrochart))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-11-17&to=2021-12-10&type=c))

[@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2021-11-17..2021-12-10&type=Issues) | [@bollwyvl](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Abollwyvl+updated%3A2021-11-17..2021-12-10&type=Issues) | [@dmonad](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Admonad+updated%3A2021-11-17..2021-12-10&type=Issues) | [@echarles](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aecharles+updated%3A2021-11-17..2021-12-10&type=Issues) | [@ellisonbg](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aellisonbg+updated%3A2021-11-17..2021-12-10&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2021-11-17..2021-12-10&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2021-11-17..2021-12-10&type=Issues) | [@hbcarlos](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahbcarlos+updated%3A2021-11-17..2021-12-10&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2021-11-17..2021-12-10&type=Issues) | [@jess-x](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajess-x+updated%3A2021-11-17..2021-12-10&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2021-11-17..2021-12-10&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2021-11-17..2021-12-10&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2021-11-17..2021-12-10&type=Issues) | [@JasonWeill](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AJasonWeill+updated%3A2021-11-17..2021-12-10&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2021-11-17..2021-12-10&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2021-11-17..2021-12-10&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2021-11-17..2021-12-10&type=Issues) | [@trungleduc](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Atrungleduc+updated%3A2021-11-17..2021-12-10&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2021-11-17..2021-12-10&type=Issues)

## 3.2.4

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.2.3...3bf36235a2521944b2b0b034e7986630ee83de18))

### Enhancements made

- Recommend trying prebuilt extension version in the build failure dialog [#11476](https://github.com/jupyterlab/jupyterlab/pull/11476) ([@krassowski](https://github.com/krassowski))
- Run comparative benchmark [#11441](https://github.com/jupyterlab/jupyterlab/pull/11441) ([@fcollonval](https://github.com/fcollonval))

### Bugs fixed

- Add background to the reference iframes to fix contrast [#11477](https://github.com/jupyterlab/jupyterlab/pull/11477) ([@krassowski](https://github.com/krassowski))
- Fix `undomanager` paste regression - fixes #10928 [#11471](https://github.com/jupyterlab/jupyterlab/pull/11471) ([@dmonad](https://github.com/dmonad))
- Regenerate server connection settings for printing [#11454](https://github.com/jupyterlab/jupyterlab/pull/11454) ([@mbektas](https://github.com/mbektas))
- Fix browser tab name [#10952](https://github.com/jupyterlab/jupyterlab/pull/10952) ([@tejasmorkar](https://github.com/tejasmorkar))
- Do not update contextual help inspector if there would be no change. [#11447](https://github.com/jupyterlab/jupyterlab/pull/11447) ([@jasongrout](https://github.com/jasongrout))

### Maintenance and upkeep improvements

- Reduce flake on non-LaTeX highlighting test [#11470](https://github.com/jupyterlab/jupyterlab/pull/11470) ([@krassowski](https://github.com/krassowski))
- Makes restorer parameter optional in `toc-extension` [#11460](https://github.com/jupyterlab/jupyterlab/pull/11460) ([@fcollonval](https://github.com/fcollonval))
- Enforce ascii-only identifiers [#11449](https://github.com/jupyterlab/jupyterlab/pull/11449) ([@jasongrout](https://github.com/jasongrout))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-11-11&to=2021-11-17&type=c))

[@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2021-11-11..2021-11-17&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2021-11-11..2021-11-17&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2021-11-11..2021-11-17&type=Issues) | [@isabela-pf](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aisabela-pf+updated%3A2021-11-11..2021-11-17&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2021-11-11..2021-11-17&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2021-11-11..2021-11-17&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2021-11-11..2021-11-17&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2021-11-11..2021-11-17&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2021-11-11..2021-11-17&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2021-11-11..2021-11-17&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2021-11-11..2021-11-17&type=Issues) | [@williamstein](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awilliamstein+updated%3A2021-11-11..2021-11-17&type=Issues)

## 3.2.3

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.2.2...49b2dfa5b74d5139dcbc55940ee5ed93b48e9db2))

### Enhancements made

- \[3.2.x\] Expose `window.jupyterapp` [#11417](https://github.com/jupyterlab/jupyterlab/pull/11417) ([@jtpio](https://github.com/jtpio))

### Bugs fixed

- Handle relative paths to `themePath` and `schemaDir` [#11427](https://github.com/jupyterlab/jupyterlab/pull/11427) ([@jtpio](https://github.com/jtpio))
- Backport PR #11398 on branch 3.2.x (fix #11377 & bump Yjs dependencies & fix modeldb overwriting yjs content) [#11408](https://github.com/jupyterlab/jupyterlab/pull/11408) ([@dmonad](https://github.com/dmonad))

### Maintenance and upkeep improvements

- Backport PR #11420 on branch 3.2.x (Makes ILabShell optional in toc extension) [#11421](https://github.com/jupyterlab/jupyterlab/pull/11421) ([@JasonWeill](https://github.com/JasonWeill))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-11-04&to=2021-11-11&type=c))

[@dmonad](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Admonad+updated%3A2021-11-04..2021-11-11&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2021-11-04..2021-11-11&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2021-11-04..2021-11-11&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2021-11-04..2021-11-11&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2021-11-04..2021-11-11&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2021-11-04..2021-11-11&type=Issues) | [@JasonWeill](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AJasonWeill+updated%3A2021-11-04..2021-11-11&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2021-11-04..2021-11-11&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2021-11-04..2021-11-11&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2021-11-04..2021-11-11&type=Issues)

## 3.2.2

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.2.1...0fcd2f5bfbe857a416dfad0c177f3f1299fef96e))

### Bugs fixed

- Make `orig_nbformat` optional #11005 [#11370](https://github.com/jupyterlab/jupyterlab/pull/11370) ([@nanoant](https://github.com/nanoant))
- Updated dialog with text to a reasonable width [#11331](https://github.com/jupyterlab/jupyterlab/pull/11331) ([@3coins](https://github.com/3coins))
- Fix for terminal theme style [#11291](https://github.com/jupyterlab/jupyterlab/pull/11291) ([@3coins](https://github.com/3coins))
- Only trigger dirty status update on value changes [#11346](https://github.com/jupyterlab/jupyterlab/pull/11346) ([@krassowski](https://github.com/krassowski))
- Run nested code cells directly from markdown headings [#11375](https://github.com/jupyterlab/jupyterlab/pull/11375) ([@jess-x](https://github.com/jess-x))

### Maintenance and upkeep improvements

- Fix `release_test` [#11390](https://github.com/jupyterlab/jupyterlab/pull/11390) ([@fcollonval](https://github.com/fcollonval))
- Removed `cat package.json` [#11372](https://github.com/jupyterlab/jupyterlab/pull/11372) ([@ceesu](https://github.com/ceesu))
- Relax `@playwright/test` dependency in Galata [#11371](https://github.com/jupyterlab/jupyterlab/pull/11371) ([@jtpio](https://github.com/jtpio))

### Documentation improvements

- Fix links [#11378](https://github.com/jupyterlab/jupyterlab/pull/11378) ([@krassowski](https://github.com/krassowski))
- Adds command to docs to install canvas dependencies [#11365](https://github.com/jupyterlab/jupyterlab/pull/11365) ([@JasonWeill](https://github.com/JasonWeill))
- Recommend providing screenshots for translators [#11357](https://github.com/jupyterlab/jupyterlab/pull/11357) ([@krassowski](https://github.com/krassowski))
- Fix outdated `clearSignalData` reference (now `Signal.clearData`) [#11339](https://github.com/jupyterlab/jupyterlab/pull/11339) ([@krassowski](https://github.com/krassowski))
- Improve documentation on galata setup [#11391](https://github.com/jupyterlab/jupyterlab/pull/11391) ([@fcollonval](https://github.com/fcollonval))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-10-20&to=2021-11-04&type=c))

[@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2021-10-20..2021-11-04&type=Issues) | [@davidbrochart](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adavidbrochart+updated%3A2021-10-20..2021-11-04&type=Issues) | [@ellisonbg](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aellisonbg+updated%3A2021-10-20..2021-11-04&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2021-10-20..2021-11-04&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2021-10-20..2021-11-04&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2021-10-20..2021-11-04&type=Issues) | [@jess-x](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajess-x+updated%3A2021-10-20..2021-11-04&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2021-10-20..2021-11-04&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2021-10-20..2021-11-04&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2021-10-20..2021-11-04&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2021-10-20..2021-11-04&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2021-10-20..2021-11-04&type=Issues) | [@trungleduc](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Atrungleduc+updated%3A2021-10-20..2021-11-04&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2021-10-20..2021-11-04&type=Issues) | [@williamstein](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awilliamstein+updated%3A2021-10-20..2021-11-04&type=Issues) | [@Zsailer](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AZsailer+updated%3A2021-10-20..2021-11-04&type=Issues)

## 3.2.1

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.2.0...2b7e4ea681ad11b2df16124b588448aac9562aef))

### Bugs fixed

- Updated button styles to accessible colors [#11321](https://github.com/jupyterlab/jupyterlab/pull/11321) ([@3coins](https://github.com/3coins))
- Fix for debugger not working for scripts [#11311](https://github.com/jupyterlab/jupyterlab/pull/11311) ([@3coins](https://github.com/3coins))
- Added handling of `'\r'` ended files [#11310](https://github.com/jupyterlab/jupyterlab/pull/11310) ([@lucabarcelos](https://github.com/lucabarcelos))
- Emit `indexChanged` on model state updates [#11298](https://github.com/jupyterlab/jupyterlab/pull/11298) ([@krassowski](https://github.com/krassowski))
- Fix ANSI vs URL conflict, prefix `www.` with `https://` [#11272](https://github.com/jupyterlab/jupyterlab/pull/11272) ([@krassowski](https://github.com/krassowski))

### Maintenance and upkeep improvements

- Pass version spec as an input [#11322](https://github.com/jupyterlab/jupyterlab/pull/11322) ([@jtpio](https://github.com/jtpio))

### Documentation improvements

- Updated button styles to accessible colors [#11321](https://github.com/jupyterlab/jupyterlab/pull/11321) ([@3coins](https://github.com/3coins))
- Add note on the server parameter for hidden files. [#11293](https://github.com/jupyterlab/jupyterlab/pull/11293) ([@fcollonval](https://github.com/fcollonval))
- Amend changelog - follow up issue 11304 [#11309](https://github.com/jupyterlab/jupyterlab/pull/11309) ([@achimgaedke](https://github.com/achimgaedke))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-10-14&to=2021-10-20&type=c))

[@3coins](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3A3coins+updated%3A2021-10-14..2021-10-20&type=Issues) | [@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2021-10-14..2021-10-20&type=Issues) | [@ellisonbg](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aellisonbg+updated%3A2021-10-14..2021-10-20&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2021-10-14..2021-10-20&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2021-10-14..2021-10-20&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2021-10-14..2021-10-20&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2021-10-14..2021-10-20&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2021-10-14..2021-10-20&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2021-10-14..2021-10-20&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2021-10-14..2021-10-20&type=Issues)

## 3.2.0

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/@jupyterlab/example-services-outputarea@3.1.9...2444ed0588adba1999a5575304d452a3b512c913))

### Enhancements made

- Add a menu entry to show/hide hidden files in the filebrowser [#11206](https://github.com/jupyterlab/jupyterlab/pull/11206) ([@loichuder](https://github.com/loichuder)) - activation instructions: [see documentation](https://jupyterlab.readthedocs.io/en/latest/user/files.html#displaying-hidden-files)
- Restore Copy shareable link use of `shareUrl` [#11188](https://github.com/jupyterlab/jupyterlab/pull/11188) ([@fcollonval](https://github.com/fcollonval))
- Add Galata in JupyterLab [#11179](https://github.com/jupyterlab/jupyterlab/pull/11179) ([@fcollonval](https://github.com/fcollonval))
- Responsive Toolbar [#11178](https://github.com/jupyterlab/jupyterlab/pull/11178) ([@3coins](https://github.com/3coins))
- Make check margin between last modified timestamps on disk and client configurable [#11153](https://github.com/jupyterlab/jupyterlab/pull/11153) ([@ph-ph](https://github.com/ph-ph))
- Reuse cell id of cut cell on cut + paste [#11138](https://github.com/jupyterlab/jupyterlab/pull/11138) ([@smacke](https://github.com/smacke))
- Add Side-by-side Rendering [#11143](https://github.com/jupyterlab/jupyterlab/pull/11143) ([@blink1073](https://github.com/blink1073))
- Add show trailing whitespace option to Notebook and Text Editor [#11131](https://github.com/jupyterlab/jupyterlab/pull/11131) ([@blink1073](https://github.com/blink1073))
- Implement Restart and debug [#11129](https://github.com/jupyterlab/jupyterlab/pull/11129) ([@blink1073](https://github.com/blink1073))
- Add `preferred-dir` handling [#10667](https://github.com/jupyterlab/jupyterlab/pull/10667) ([@goanpeca](https://github.com/goanpeca))
- Enable disabling document-wide history tracking [#10949](https://github.com/jupyterlab/jupyterlab/pull/10949) ([@echarles](https://github.com/echarles))
- Removed debug switch [#11185](https://github.com/jupyterlab/jupyterlab/pull/11185) ([@3coins](https://github.com/3coins))

### Bugs fixed

- Normalize cell source `\r` line endings [#11271](https://github.com/jupyterlab/jupyterlab/pull/11271) ([@jasongrout](https://github.com/jasongrout))
- Fix Webpack crypto handling [#11249](https://github.com/jupyterlab/jupyterlab/pull/11249) ([@blink1073](https://github.com/blink1073))
- Use standard hash type in webpack build [#11234](https://github.com/jupyterlab/jupyterlab/pull/11234) ([@blink1073](https://github.com/blink1073))
- Remove format from fetching options if null [#11229](https://github.com/jupyterlab/jupyterlab/pull/11229) ([@loichuder](https://github.com/loichuder))
- Do not continuously `cd('/')` when already in `/` [#11219](https://github.com/jupyterlab/jupyterlab/pull/11219) ([@minrk](https://github.com/minrk))
- Properly reset layout when toggling simple mode. [#11203](https://github.com/jupyterlab/jupyterlab/pull/11203) ([@jasongrout](https://github.com/jasongrout))
- Fix renaming issue in collaborative mode [#11197](https://github.com/jupyterlab/jupyterlab/pull/11197) ([@dmonad](https://github.com/dmonad))
- Restore workspace and open tree path [#11176](https://github.com/jupyterlab/jupyterlab/pull/11176) ([@blink1073](https://github.com/blink1073))
- Share notebook's metadata [#11064](https://github.com/jupyterlab/jupyterlab/pull/11064) ([@hbcarlos](https://github.com/hbcarlos))
- Normalize notebook cell line endings to `\n` [#11141](https://github.com/jupyterlab/jupyterlab/pull/11141) ([@jasongrout](https://github.com/jasongrout))
- Fix auto close brackets for console [#11137](https://github.com/jupyterlab/jupyterlab/pull/11137) ([@ohrely](https://github.com/ohrely))
- Add a guard to avoid kernel deadlock on multiple input request [#10792](https://github.com/jupyterlab/jupyterlab/pull/10792) ([@echarles](https://github.com/echarles))

### Maintenance and upkeep improvements

- Extension upgrade script: Avoid throwing exceptions for certain package.json files [#11278](https://github.com/jupyterlab/jupyterlab/pull/11278) ([@ammgws](https://github.com/ammgws))
- Run Linter [#11238](https://github.com/jupyterlab/jupyterlab/pull/11238) ([@blink1073](https://github.com/blink1073))
- Fix Release Check [#11218](https://github.com/jupyterlab/jupyterlab/pull/11218) ([@fcollonval](https://github.com/fcollonval))
- Handle case when JupyterHub returns 424 for not running server [#11205](https://github.com/jupyterlab/jupyterlab/pull/11205) ([@yuvipanda](https://github.com/yuvipanda))
- Check `i18n` will pass on zeroed patch pre-release version [#11214](https://github.com/jupyterlab/jupyterlab/pull/11214) ([@fcollonval](https://github.com/fcollonval))
- Refactor `window.open` to make it work also in desktop app [#11202](https://github.com/jupyterlab/jupyterlab/pull/11202) ([@mbektas](https://github.com/mbektas))
- Rename "JupyterLab Theme" to "Theme" [#11198](https://github.com/jupyterlab/jupyterlab/pull/11198) ([@jtpio](https://github.com/jtpio))
- Use only context and id to check i18n [#11190](https://github.com/jupyterlab/jupyterlab/pull/11190) ([@fcollonval](https://github.com/fcollonval))
- Fix the "Edit on GitHub" link [#11149](https://github.com/jupyterlab/jupyterlab/pull/11149) ([@krassowski](https://github.com/krassowski))
- Clean up notebook test utils [#11133](https://github.com/jupyterlab/jupyterlab/pull/11133) ([@blink1073](https://github.com/blink1073))
- Change "Export Notebook As" to "Save and Export Notebook As" [#11132](https://github.com/jupyterlab/jupyterlab/pull/11132) ([@blink1073](https://github.com/blink1073))
- Make Test Server Configurable [#11015](https://github.com/jupyterlab/jupyterlab/pull/11015) ([@fcollonval](https://github.com/fcollonval))
- Use disableDocumentWideUndoRedo instead of enableDocumentWideUndoRedo [#11215](https://github.com/jupyterlab/jupyterlab/pull/11215) ([@echarles](https://github.com/echarles))
- Fix kernelspec logo handling (#11175) [#11183](https://github.com/jupyterlab/jupyterlab/pull/11183) ([@jtpio](https://github.com/jtpio))

### Documentation improvements

- Fix typo in docs: `page_config.json` [#11152](https://github.com/jupyterlab/jupyterlab/pull/11152) ([@achimgaedke](https://github.com/achimgaedke))
- Add a menu entry to show/hide hidden files in the filebrowser [#11206](https://github.com/jupyterlab/jupyterlab/pull/11206) ([@loichuder](https://github.com/loichuder))
- Fix the "Edit on GitHub" link [#11149](https://github.com/jupyterlab/jupyterlab/pull/11149) ([@krassowski](https://github.com/krassowski))
- Clarify sidebar switching settings [#11270](https://github.com/jupyterlab/jupyterlab/pull/11270) ([@joelostblom](https://github.com/joelostblom))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-09-01&to=2021-10-14&type=c))

[@3coins](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3A3coins+updated%3A2021-09-01..2021-10-14&type=Issues) | [@achimgaedke](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aachimgaedke+updated%3A2021-09-01..2021-10-14&type=Issues) | [@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2021-09-01..2021-10-14&type=Issues) | [@echarles](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aecharles+updated%3A2021-09-01..2021-10-14&type=Issues) | [@ellisonbg](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aellisonbg+updated%3A2021-09-01..2021-10-14&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2021-09-01..2021-10-14&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2021-09-01..2021-10-14&type=Issues) | [@goanpeca](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agoanpeca+updated%3A2021-09-01..2021-10-14&type=Issues) | [@hbcarlos](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahbcarlos+updated%3A2021-09-01..2021-10-14&type=Issues) | [@isabela-pf](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aisabela-pf+updated%3A2021-09-01..2021-10-14&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2021-09-01..2021-10-14&type=Issues) | [@jess-x](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajess-x+updated%3A2021-09-01..2021-10-14&type=Issues) | [@joelostblom](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajoelostblom+updated%3A2021-09-01..2021-10-14&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2021-09-01..2021-10-14&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2021-09-01..2021-10-14&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2021-09-01..2021-10-14&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2021-09-01..2021-10-14&type=Issues) | [@loichuder](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aloichuder+updated%3A2021-09-01..2021-10-14&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2021-09-01..2021-10-14&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2021-09-01..2021-10-14&type=Issues) | [@SylvainCorlay](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3ASylvainCorlay+updated%3A2021-09-01..2021-10-14&type=Issues) | [@trungleduc](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Atrungleduc+updated%3A2021-09-01..2021-10-14&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2021-09-01..2021-10-14&type=Issues)

## v3.1

## 3.1.19

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.1.18...90ed111b152665357b069cf4a42590fe07d630e8))

### Bugs fixed

- Added handling of '\\r' ended files [#11310](https://github.com/jupyterlab/jupyterlab/pull/11310) ([@lucabarcelos](https://github.com/lucabarcelos))

### Maintenance and upkeep improvements

- Pass version spec as an input [#11322](https://github.com/jupyterlab/jupyterlab/pull/11322) ([@jtpio](https://github.com/jtpio))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-10-07&to=2022-01-12&type=c))

[@agoose77](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aagoose77+updated%3A2021-10-07..2022-01-12&type=Issues) | [@andrewfulton9](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aandrewfulton9+updated%3A2021-10-07..2022-01-12&type=Issues) | [@baggiponte](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Abaggiponte+updated%3A2021-10-07..2022-01-12&type=Issues) | [@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2021-10-07..2022-01-12&type=Issues) | [@bollwyvl](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Abollwyvl+updated%3A2021-10-07..2022-01-12&type=Issues) | [@Carreau](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3ACarreau+updated%3A2021-10-07..2022-01-12&type=Issues) | [@davidbrochart](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adavidbrochart+updated%3A2021-10-07..2022-01-12&type=Issues) | [@dmonad](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Admonad+updated%3A2021-10-07..2022-01-12&type=Issues) | [@echarles](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aecharles+updated%3A2021-10-07..2022-01-12&type=Issues) | [@ellisonbg](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aellisonbg+updated%3A2021-10-07..2022-01-12&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2021-10-07..2022-01-12&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2021-10-07..2022-01-12&type=Issues) | [@hbcarlos](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahbcarlos+updated%3A2021-10-07..2022-01-12&type=Issues) | [@isabela-pf](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aisabela-pf+updated%3A2021-10-07..2022-01-12&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2021-10-07..2022-01-12&type=Issues) | [@jess-x](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajess-x+updated%3A2021-10-07..2022-01-12&type=Issues) | [@JohanMabille](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AJohanMabille+updated%3A2021-10-07..2022-01-12&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2021-10-07..2022-01-12&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2021-10-07..2022-01-12&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2021-10-07..2022-01-12&type=Issues) | [@JasonWeill](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AJasonWeill+updated%3A2021-10-07..2022-01-12&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2021-10-07..2022-01-12&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2021-10-07..2022-01-12&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2021-10-07..2022-01-12&type=Issues) | [@schmidi314](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aschmidi314+updated%3A2021-10-07..2022-01-12&type=Issues) | [@SylvainCorlay](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3ASylvainCorlay+updated%3A2021-10-07..2022-01-12&type=Issues) | [@telamonian](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Atelamonian+updated%3A2021-10-07..2022-01-12&type=Issues) | [@thesinepainter](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Athesinepainter+updated%3A2021-10-07..2022-01-12&type=Issues) | [@trungleduc](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Atrungleduc+updated%3A2021-10-07..2022-01-12&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2021-10-07..2022-01-12&type=Issues) | [@williamstein](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awilliamstein+updated%3A2021-10-07..2022-01-12&type=Issues) | [@yuvipanda](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ayuvipanda+updated%3A2021-10-07..2022-01-12&type=Issues) | [@Zsailer](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AZsailer+updated%3A2021-10-07..2022-01-12&type=Issues)

## 3.1.18

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.1.17...c6dc40f16ea6fd1b5a58167dec6ed066de3304a9))

### Bugs fixed

- Backport PR #11249 on branch 3.1.x (Fix Webpack crypto handling) [#11252](https://github.com/jupyterlab/jupyterlab/pull/11252) ([@blink1073](https://github.com/blink1073))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-10-05&to=2021-10-07&type=c))

[@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2021-10-05..2021-10-07&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2021-10-05..2021-10-07&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2021-10-05..2021-10-07&type=Issues)

## 3.1.17

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.1.16...a899a8b9da2216d91a2426c4956bc2e711a93ecd))

### Bugs fixed

- Use standard hash type in webpack build [#11234](https://github.com/jupyterlab/jupyterlab/pull/11234) ([@blink1073](https://github.com/blink1073))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-10-05&to=2021-10-05&type=c))

[@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2021-10-05..2021-10-05&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2021-10-05..2021-10-05&type=Issues)

## 3.1.16

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.1.14...fc00631f2088d90655b0e09a96f14da86a02f911))

### Bugs fixed

- Do not continuously `cd('/')` when already in / [#11219](https://github.com/jupyterlab/jupyterlab/pull/11219) ([@minrk](https://github.com/minrk))
- Properly reset layout when toggling simple mode. [#11203](https://github.com/jupyterlab/jupyterlab/pull/11203) ([@jasongrout](https://github.com/jasongrout))
- Fix renaming issue in collaborative mode [#11197](https://github.com/jupyterlab/jupyterlab/pull/11197) ([@dmonad](https://github.com/dmonad))
- Restore workspace and open tree path [#11177](https://github.com/jupyterlab/jupyterlab/pull/11177) ([@blink1073](https://github.com/blink1073))
- Share notebook's metadata [#11064](https://github.com/jupyterlab/jupyterlab/pull/11064) ([@hbcarlos](https://github.com/hbcarlos))

### Maintenance and upkeep improvements

- Check `i18n` will pass on zeroed patch pre-release version [#11214](https://github.com/jupyterlab/jupyterlab/pull/11214) ([@fcollonval](https://github.com/fcollonval))
- Fix Release Check [#11218](https://github.com/jupyterlab/jupyterlab/pull/11218) ([@fcollonval](https://github.com/fcollonval))
- Handle case when JupyterHub returns 424 for not running server [#11205](https://github.com/jupyterlab/jupyterlab/pull/11205) ([@yuvipanda](https://github.com/yuvipanda))
- Use only context and id to check `i18n` [#11190](https://github.com/jupyterlab/jupyterlab/pull/11190) ([@fcollonval](https://github.com/fcollonval))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-09-27&to=2021-10-05&type=c))

[@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2021-09-27..2021-10-05&type=Issues) | [@echarles](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aecharles+updated%3A2021-09-27..2021-10-05&type=Issues) | [@ellisonbg](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aellisonbg+updated%3A2021-09-27..2021-10-05&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2021-09-27..2021-10-05&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2021-09-27..2021-10-05&type=Issues) | [@goanpeca](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agoanpeca+updated%3A2021-09-27..2021-10-05&type=Issues) | [@hbcarlos](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahbcarlos+updated%3A2021-09-27..2021-10-05&type=Issues) | [@isabela-pf](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aisabela-pf+updated%3A2021-09-27..2021-10-05&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2021-09-27..2021-10-05&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2021-09-27..2021-10-05&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2021-09-27..2021-10-05&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2021-09-27..2021-10-05&type=Issues) | [@loichuder](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aloichuder+updated%3A2021-09-27..2021-10-05&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2021-09-27..2021-10-05&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2021-09-27..2021-10-05&type=Issues) | [@SylvainCorlay](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3ASylvainCorlay+updated%3A2021-09-27..2021-10-05&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2021-09-27..2021-10-05&type=Issues)

## 3.1.15

(Skipped due to errors in release process)

## 3.1.14

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.1.13...fb6df989b70ce096c9769fc728bb158f311b48a9))

### Bugs fixed

- Normalize notebook cell line endings to \\n [#11141](https://github.com/jupyterlab/jupyterlab/pull/11141) ([@jasongrout](https://github.com/jasongrout))

### Maintenance and upkeep improvements

- Fix the "Edit on GitHub" link [#11149](https://github.com/jupyterlab/jupyterlab/pull/11149) ([@krassowski](https://github.com/krassowski))

### Documentation improvements

- Fix the "Edit on GitHub" link [#11149](https://github.com/jupyterlab/jupyterlab/pull/11149) ([@krassowski](https://github.com/krassowski))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-09-22&to=2021-09-27&type=c))

[@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2021-09-22..2021-09-27&type=Issues) | [@echarles](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aecharles+updated%3A2021-09-22..2021-09-27&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2021-09-22..2021-09-27&type=Issues) | [@goanpeca](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agoanpeca+updated%3A2021-09-22..2021-09-27&type=Issues) | [@jess-x](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajess-x+updated%3A2021-09-22..2021-09-27&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2021-09-22..2021-09-27&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2021-09-22..2021-09-27&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2021-09-22..2021-09-27&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2021-09-22..2021-09-27&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2021-09-22..2021-09-27&type=Issues)

## 3.1.13

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.1.12...a8d8f3dbceb9c852e6196b0ebd368759232e2626))

### Enhancements made

- Fetch translations via the `ServerConnection.ISettings` [#11091](https://github.com/jupyterlab/jupyterlab/pull/11091) ([@jtpio](https://github.com/jtpio))

### Bugs fixed

- Update the lock after every request [#11092](https://github.com/jupyterlab/jupyterlab/pull/11092) ([@hbcarlos](https://github.com/hbcarlos))
- use posix explicitly for PathExt [#11099](https://github.com/jupyterlab/jupyterlab/pull/11099) ([@mbektas](https://github.com/mbektas))
- Backport PR #10868 on branch 3.1.x (Fix user preferences not being considered for Text Editor) [#11087](https://github.com/jupyterlab/jupyterlab/pull/11087) ([@Mithil467](https://github.com/Mithil467))
- Indent comments (#6957) [#11063](https://github.com/jupyterlab/jupyterlab/pull/11063) ([@josephrocca](https://github.com/josephrocca))

### Maintenance and upkeep improvements

- Check changes on translatable strings [#11036](https://github.com/jupyterlab/jupyterlab/pull/11036) ([@fcollonval](https://github.com/fcollonval))
- Skip flaky debugger test [#11083](https://github.com/jupyterlab/jupyterlab/pull/11083) ([@fcollonval](https://github.com/fcollonval))

### Documentation improvements

- Add a note on the Jupyter Releaser in the extension tutorial [#11085](https://github.com/jupyterlab/jupyterlab/pull/11085) ([@jtpio](https://github.com/jtpio))

### Other merged PRs

- Remove item from changelog that slips through [#11110](https://github.com/jupyterlab/jupyterlab/pull/11110) ([@fcollonval](https://github.com/fcollonval))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-09-14&to=2021-09-22&type=c))

[@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2021-09-14..2021-09-22&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2021-09-14..2021-09-22&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2021-09-14..2021-09-22&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2021-09-14..2021-09-22&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2021-09-14..2021-09-22&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2021-09-14..2021-09-22&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2021-09-14..2021-09-22&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2021-09-14..2021-09-22&type=Issues) | [@Mithil467](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AMithil467+updated%3A2021-09-14..2021-09-22&type=Issues) | [@trungleduc](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Atrungleduc+updated%3A2021-09-14..2021-09-22&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2021-09-14..2021-09-22&type=Issues)

## 3.1.12

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.1.11...1af92c9bbae0eab61938bbbba0ae8cc5e9b59fdd))

### Bugs fixed

- Retain the rtc lock until the user releases it [#11026](https://github.com/jupyterlab/jupyterlab/pull/11026) ([@hbcarlos](https://github.com/hbcarlos))
- Backport PR #11031 on branch 3.1.x (Use posix paths explicitly) [#11045](https://github.com/jupyterlab/jupyterlab/pull/11045) ([@Mithil467](https://github.com/Mithil467))
- Adds the variable reference to the key of the component [#11029](https://github.com/jupyterlab/jupyterlab/pull/11029) ([@hbcarlos](https://github.com/hbcarlos))

### Maintenance and upkeep improvements

- Clean up bumpversion [#11056](https://github.com/jupyterlab/jupyterlab/pull/11056) ([@blink1073](https://github.com/blink1073))
- Make debugger jest test more robust [#11032](https://github.com/jupyterlab/jupyterlab/pull/11032) ([@fcollonval](https://github.com/fcollonval))

### Documentation improvements

- Added Table of contents (toc.rst) to user guide documentation [#10699](https://github.com/jupyterlab/jupyterlab/pull/10699) ([@AnudeepGunukula](https://github.com/AnudeepGunukula))

### Other merged PRs

- Remove status bar item flickering [#11065](https://github.com/jupyterlab/jupyterlab/pull/11065) ([@fcollonval](https://github.com/fcollonval))
- Backport PR #10954 on branch 3.1.x (Improve release notes for 3.1) [#11053](https://github.com/jupyterlab/jupyterlab/pull/11053) ([@Mithil467](https://github.com/Mithil467))
- use path.posix explicitly for URLs [#11048](https://github.com/jupyterlab/jupyterlab/pull/11048) ([@mbektas](https://github.com/mbektas))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-09-08&to=2021-09-14&type=c))

[@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2021-09-08..2021-09-14&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2021-09-08..2021-09-14&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2021-09-08..2021-09-14&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2021-09-08..2021-09-14&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2021-09-08..2021-09-14&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2021-09-08..2021-09-14&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2021-09-08..2021-09-14&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2021-09-08..2021-09-14&type=Issues) | [@Mithil467](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AMithil467+updated%3A2021-09-08..2021-09-14&type=Issues)

## 3.1.11

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.1.10...f04391135c11c6c5e3e8c4706ec26e675f0db4d6))

### Bugs fixed

- Revert pending input PR #10792 merged in 3.1.x branch [#11020](https://github.com/jupyterlab/jupyterlab/pull/11020) ([@echarles](https://github.com/echarles))
- fix #10997 - increase max_message_size of websocket messages [#11003](https://github.com/jupyterlab/jupyterlab/pull/11003) ([@dmonad](https://github.com/dmonad))
- use correct nbformat version - fixes #11005 [#11017](https://github.com/jupyterlab/jupyterlab/pull/11017) ([@dmonad](https://github.com/dmonad))
- Fix ignored promise leading to incorrect initial tooltip position [#11010](https://github.com/jupyterlab/jupyterlab/pull/11010) ([@krassowski](https://github.com/krassowski))
- Fix typo in nbformat dialog [#11001](https://github.com/jupyterlab/jupyterlab/pull/11001) ([@davidbrochart](https://github.com/davidbrochart))
- Backport PR #10943 on branch 3.1.x (Simplify IRankedMenu interface) [#10991](https://github.com/jupyterlab/jupyterlab/pull/10991) ([@fcollonval](https://github.com/fcollonval))
- Add a guard to avoid kernel deadlock on multiple input request [#10792](https://github.com/jupyterlab/jupyterlab/pull/10792) ([@echarles](https://github.com/echarles))

### Maintenance and upkeep improvements

- Clean up handling of npm dist tag [#10999](https://github.com/jupyterlab/jupyterlab/pull/10999) ([@fcollonval](https://github.com/fcollonval))
- Fix version regex [#10994](https://github.com/jupyterlab/jupyterlab/pull/10994) ([@fcollonval](https://github.com/fcollonval))

### Documentation improvements

- Update documentation for internationalization [#11024](https://github.com/jupyterlab/jupyterlab/pull/11024) ([@fcollonval](https://github.com/fcollonval))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-09-01&to=2021-09-08&type=c))

[@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2021-09-01..2021-09-08&type=Issues) | [@echarles](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aecharles+updated%3A2021-09-01..2021-09-08&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2021-09-01..2021-09-08&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2021-09-01..2021-09-08&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2021-09-01..2021-09-08&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2021-09-01..2021-09-08&type=Issues)

## 3.1.10

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.1.9...646b708cdb76f6d0e4e622b0546cc4dc7d2854c7))

### Bugs fixed

- Add "menu" context for translation of menu labels [#10932](https://github.com/jupyterlab/jupyterlab/pull/10932) ([@krassowski](https://github.com/krassowski))
- Fix lack of translation of part of "Saving completed" and friends [#10958](https://github.com/jupyterlab/jupyterlab/pull/10958) ([@krassowski](https://github.com/krassowski))
- Add undoManager to inserted cells [#10899](https://github.com/jupyterlab/jupyterlab/pull/10899) ([@hbcarlos](https://github.com/hbcarlos))
- Render placeholder at correct index [#10898](https://github.com/jupyterlab/jupyterlab/pull/10898) ([@echarles](https://github.com/echarles))

### Maintenance and upkeep improvements

- Backport PR #10983 on branch 3.1.x (Update to lerna 4) [#10985](https://github.com/jupyterlab/jupyterlab/pull/10985) ([@blink1073](https://github.com/blink1073))
- Clarify usage of mock in debugger test [#10979](https://github.com/jupyterlab/jupyterlab/pull/10979) ([@fcollonval](https://github.com/fcollonval))
- Restore test for kernel that does not support debugger [#10973](https://github.com/jupyterlab/jupyterlab/pull/10973) ([@fcollonval](https://github.com/fcollonval))
- Backport PR #10937: More Publish Integrity [#10938](https://github.com/jupyterlab/jupyterlab/pull/10938) ([@blink1073](https://github.com/blink1073))

### Documentation improvements

- Backport #10893 on branch 3.1.x (Add internationalization documentation) [#10974](https://github.com/jupyterlab/jupyterlab/pull/10974) ([@fcollonval](https://github.com/fcollonval))
- Fix formatting of a link in the changelog [#10945](https://github.com/jupyterlab/jupyterlab/pull/10945) ([@jtpio](https://github.com/jtpio))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-08-25&to=2021-09-01&type=c))

[@agoose77](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aagoose77+updated%3A2021-08-25..2021-09-01&type=Issues) | [@baggiponte](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Abaggiponte+updated%3A2021-08-25..2021-09-01&type=Issues) | [@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2021-08-25..2021-09-01&type=Issues) | [@echarles](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aecharles+updated%3A2021-08-25..2021-09-01&type=Issues) | [@ellisonbg](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aellisonbg+updated%3A2021-08-25..2021-09-01&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2021-08-25..2021-09-01&type=Issues) | [@goanpeca](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agoanpeca+updated%3A2021-08-25..2021-09-01&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2021-08-25..2021-09-01&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2021-08-25..2021-09-01&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2021-08-25..2021-09-01&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2021-08-25..2021-09-01&type=Issues) | [@mbektas](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ambektas+updated%3A2021-08-25..2021-09-01&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2021-08-25..2021-09-01&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2021-08-25..2021-09-01&type=Issues) | [@SarunasAzna](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3ASarunasAzna+updated%3A2021-08-25..2021-09-01&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2021-08-25..2021-09-01&type=Issues)

## 3.1.9

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.1.8...8f8cfc548c7c91e9dcf0dc51fd6eafc98f3fcfef))

### Bugs fixed

- Fix Package Publish [#10916](https://github.com/jupyterlab/jupyterlab/pull/10916) ([@afshin](https://github.com/afshin))
- Remove terminal theme menu if terminal feature is disabled [#10909](https://github.com/jupyterlab/jupyterlab/pull/10909) ([@Mithil467](https://github.com/Mithil467))

### Documentation improvements

- Correct the documentation for packaging [#10910](https://github.com/jupyterlab/jupyterlab/pull/10910) ([@fcollonval](https://github.com/fcollonval))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-08-24&to=2021-08-25&type=c))

[@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2021-08-24..2021-08-25&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2021-08-24..2021-08-25&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2021-08-24..2021-08-25&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2021-08-24..2021-08-25&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2021-08-24..2021-08-25&type=Issues)

## 3.1.8

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.1.7...ecb8be24857466a69e4643a5a708b29a062d8465))

### Bugs fixed

- Workaround invasive use of tex mode inside of code elements and blocks [#10867](https://github.com/jupyterlab/jupyterlab/pull/10867) ([@krassowski](https://github.com/krassowski))
- Keep cursor at the previous position after cell split [#10884](https://github.com/jupyterlab/jupyterlab/pull/10884) ([@krassowski](https://github.com/krassowski))
- Improve language choice menu and dialog [#10885](https://github.com/jupyterlab/jupyterlab/pull/10885) ([@krassowski](https://github.com/krassowski))
- Manual Backport PR #10865 on branch 3.1.x (Add translations for notebook mode name) [#10878](https://github.com/jupyterlab/jupyterlab/pull/10878) ([@krassowski](https://github.com/krassowski))
- Fix cell type dropdown behaviour in Firefox on 3.1.x branch [#10870](https://github.com/jupyterlab/jupyterlab/pull/10870) ([@krassowski](https://github.com/krassowski))
- Add missing link in passing translator down to kernel selector [#10864](https://github.com/jupyterlab/jupyterlab/pull/10864) ([@krassowski](https://github.com/krassowski))
- Fix code names showing up in new translations, add docs [#10860](https://github.com/jupyterlab/jupyterlab/pull/10860) ([@krassowski](https://github.com/krassowski))
- Get metadata from shared model when serializing the notebook to JSON [#10804](https://github.com/jupyterlab/jupyterlab/pull/10804) ([@hbcarlos](https://github.com/hbcarlos))
- Shutdown sessions/terminals on shutdown [#10843](https://github.com/jupyterlab/jupyterlab/pull/10843) ([@martinRenou](https://github.com/martinRenou))

### Maintenance and upkeep improvements

- Backport PR #10891 on branch 3.1.x (Publish Cleanup) [#10897](https://github.com/jupyterlab/jupyterlab/pull/10897) ([@fcollonval](https://github.com/fcollonval))
- Fix Publish Check [#10846](https://github.com/jupyterlab/jupyterlab/pull/10846) ([@afshin](https://github.com/afshin))
- Translate labels of menus and submenus [#10739](https://github.com/jupyterlab/jupyterlab/pull/10739) ([@krassowski](https://github.com/krassowski))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-08-16&to=2021-08-24&type=c))

[@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2021-08-16..2021-08-24&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2021-08-16..2021-08-24&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2021-08-16..2021-08-24&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2021-08-16..2021-08-24&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2021-08-16..2021-08-24&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2021-08-16..2021-08-24&type=Issues)

## 3.1.7

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.1.6...e0a6d74212394a40ba00a12d8043f1b49326f73d))

### Bugs fixed

- Fix link to the security documentation [#10836](https://github.com/jupyterlab/jupyterlab/pull/10836) ([@krassowski](https://github.com/krassowski))
- The dirty indicator does not get cleared up after reverting changes [#10812](https://github.com/jupyterlab/jupyterlab/pull/10812) ([@fcollonval](https://github.com/fcollonval))
- Remove session error dialog redundant error message to avoid repeated display [#10810](https://github.com/jupyterlab/jupyterlab/pull/10810) ([@franckchen](https://github.com/franckchen))
- Use nullish operator instead of OR [#10811](https://github.com/jupyterlab/jupyterlab/pull/10811) ([@fcollonval](https://github.com/fcollonval))

### Maintenance and upkeep improvements

- Remove outdated `npm-cli-login` utility from buildutils [#10828](https://github.com/jupyterlab/jupyterlab/pull/10828) ([@krassowski](https://github.com/krassowski))
- More Releaser Fixes [#10817](https://github.com/jupyterlab/jupyterlab/pull/10817) ([@afshin](https://github.com/afshin))

### Documentation improvements

- Fix documentation snippets [#10813](https://github.com/jupyterlab/jupyterlab/pull/10813) ([@fcollonval](https://github.com/fcollonval))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-08-12&to=2021-08-16&type=c))

[@3coins](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3A3coins+updated%3A2021-08-12..2021-08-16&type=Issues) | [@afshin](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aafshin+updated%3A2021-08-12..2021-08-16&type=Issues) | [@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2021-08-12..2021-08-16&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2021-08-12..2021-08-16&type=Issues) | [@goanpeca](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agoanpeca+updated%3A2021-08-12..2021-08-16&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2021-08-12..2021-08-16&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2021-08-12..2021-08-16&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2021-08-12..2021-08-16&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2021-08-12..2021-08-16&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2021-08-12..2021-08-16&type=Issues)

## 3.1.6

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.1.5...4cec12eba17eaf313241b595e98b40cb0a851e65))

### Bugs fixed

- Backport PR #10738 on branch 3.1.x [#10806](https://github.com/jupyterlab/jupyterlab/pull/10806) ([@krassowski](https://github.com/krassowski))
- Share nbformat and nbformatMinor [#10795](https://github.com/jupyterlab/jupyterlab/pull/10795) ([@hbcarlos](https://github.com/hbcarlos))
- Support collapsible headers with virtual notebook rendering [#10793](https://github.com/jupyterlab/jupyterlab/pull/10793) ([@echarles](https://github.com/echarles))

### Maintenance and upkeep improvements

- Clean up Link Caching Again [#10794](https://github.com/jupyterlab/jupyterlab/pull/10794) ([@afshin](https://github.com/afshin))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-08-09&to=2021-08-12&type=c))

[@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2021-08-09..2021-08-12&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2021-08-09..2021-08-12&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2021-08-09..2021-08-12&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2021-08-09..2021-08-12&type=Issues)

## 3.1.5

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.1.4...6d14f7f8d3a7400a5fddbbdfaf79d0b8bdd5325f))

### Bugs fixed

- Revert input guard [#10779](https://github.com/jupyterlab/jupyterlab/pull/10779) ([@echarles](https://github.com/echarles))
- Markdown url resolver no longer throws for malformed URLs in `isLocal` check [#10773](https://github.com/jupyterlab/jupyterlab/pull/10773) ([@loichuder](https://github.com/loichuder))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-08-05&to=2021-08-09&type=c))

[@echarles](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aecharles+updated%3A2021-08-05..2021-08-09&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2021-08-05..2021-08-09&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2021-08-05..2021-08-09&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2021-08-05..2021-08-09&type=Issues)

## 3.1.2

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.1.1...be8032d1a932e09f553d0343659e89a6a25a516f))

### Enhancements made

- Normalize translation domain [#10728](https://github.com/jupyterlab/jupyterlab/pull/10728) ([@fcollonval](https://github.com/fcollonval))

### Bugs fixed

- Prevent undo/redo in outputs [#10756](https://github.com/jupyterlab/jupyterlab/pull/10756) ([@hbcarlos](https://github.com/hbcarlos))
- Revert change in saveState Signal [#10741](https://github.com/jupyterlab/jupyterlab/pull/10741) ([@jess-x](https://github.com/jess-x))

### Maintenance and upkeep improvements

- Another Fix to Verdaccio Publishing [#10747](https://github.com/jupyterlab/jupyterlab/pull/10747) ([@afshin](https://github.com/afshin))
- More Cleanup of Automated Release Process [#10742](https://github.com/jupyterlab/jupyterlab/pull/10742) ([@blink1073](https://github.com/blink1073))
- Fix Verdaccio Publish [#10743](https://github.com/jupyterlab/jupyterlab/pull/10743) ([@afshin](https://github.com/afshin))
- Yet another fix for Verdaccio publish [#10759](https://github.com/jupyterlab/jupyterlab/pull/10759) ([@afshin](https://github.com/afshin))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-07-29&to=2021-08-04&type=c))

[@AnudeepGunukula](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AAnudeepGunukula+updated%3A2021-07-29..2021-08-04&type=Issues) | [@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2021-07-29..2021-08-04&type=Issues) | [@ellisonbg](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aellisonbg+updated%3A2021-07-29..2021-08-04&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2021-07-29..2021-08-04&type=Issues) | [@goanpeca](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agoanpeca+updated%3A2021-07-29..2021-08-04&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2021-07-29..2021-08-04&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2021-07-29..2021-08-04&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2021-07-29..2021-08-04&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2021-07-29..2021-08-04&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2021-07-29..2021-08-04&type=Issues)

## 3.1.1

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.1.0...6b09ac27dcde158a2dee9df1499af384fce7086a))

### Bugs fixed

- Use appName in page title when restoring workspaces (vs 3.1.x) [#10724](https://github.com/jupyterlab/jupyterlab/pull/10724) ([@bollwyvl](https://github.com/bollwyvl))

### Maintenance and upkeep improvements

- Add branch integrity handling [#10708](https://github.com/jupyterlab/jupyterlab/pull/10708) ([@afshin](https://github.com/afshin))

### Documentation improvements

- Add branch integrity handling [#10708](https://github.com/jupyterlab/jupyterlab/pull/10708) ([@afshin](https://github.com/afshin))
- Minor improvement to contributing documentation [#10713](https://github.com/jupyterlab/jupyterlab/pull/10713) ([@KrishnaKumarHariprasannan](https://github.com/KrishnaKumarHariprasannan))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-07-27&to=2021-07-29&type=c))

[@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2021-07-27..2021-07-29&type=Issues) | [@bollwyvl](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Abollwyvl+updated%3A2021-07-27..2021-07-29&type=Issues) | [@goanpeca](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agoanpeca+updated%3A2021-07-27..2021-07-29&type=Issues) | [@hbcarlos](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahbcarlos+updated%3A2021-07-27..2021-07-29&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2021-07-27..2021-07-29&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2021-07-27..2021-07-29&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2021-07-27..2021-07-29&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2021-07-27..2021-07-29&type=Issues)

## 3.1.0

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.0.6...60f37be54a714c391fad5500cb57055af1492591))

### User-facing changes

- From JupyterLab 3.1, file documents and notebooks have collaborative
  editing using the [Yjs shared editing framework](https://github.com/yjs/yjs).
  Editors are not collaborative by default; to activate it, start JupyterLab
  with the `--collaborative` flag. See full documentation on [collaboration](https://jupyterlab.readthedocs.io/en/latest/user/rtc.html).
- The undo/redo history in the notebook is now document-wide (tracking changes across all cells); the future versions will enable restoring the previous behaviour of per-cell undo/redo.
- Table of Contents received multiple new features and settings described in the [user documentation](https://jupyterlab.readthedocs.io/en/latest/user/toc.html).
- The debugger received many improvements, including basic support for evaluating code at a breakpoint, and for variable inspection.
- The closing bracket is no longer automatically added by default; the old behaviour can be re-enabled from the menu bar (`Settings` -> `Auto Close Brackets`) or from the Advanced Settings Editor.
- A new visual indicator was introduced to highlight cells in which the code changed in the editor since last execution:
  <img alt="A GIF of the visual indicator showing up after editing a cell." src="https://user-images.githubusercontent.com/21197331/120619861-ae957d80-c45c-11eb-8640-b25b8b659ad4.gif">
- Many other new features were added as documented below.

### New features added

- General: Shared editing with collaborative notebook model. [#10118](https://github.com/jupyterlab/jupyterlab/pull/10118) ([@dmonad](https://github.com/dmonad))
- Debugger: Implemented variable inspection when the debugger has started [#10025](https://github.com/jupyterlab/jupyterlab/pull/10025) ([@JohanMabille](https://github.com/JohanMabille))
- Debugger: Basic support for evaluating code at a breakpoint [#9930](https://github.com/jupyterlab/jupyterlab/pull/9930) ([@jtpio](https://github.com/jtpio))
- Notebook: Show a visual indicator that the cell has been edited [#10296](https://github.com/jupyterlab/jupyterlab/pull/10296) ([@martinRenou](https://github.com/martinRenou))
- Notebook: Find and replace within a single cell [#10067](https://github.com/jupyterlab/jupyterlab/pull/10067) ([@jess-x](https://github.com/jess-x))
- Notebook: Copy cell output to clipboard [#10282](https://github.com/jupyterlab/jupyterlab/pull/10282) ([@cameron-toy](https://github.com/cameron-toy))
- Notebook: Add support for collapsing hierarchy of headings [#10260](https://github.com/jupyterlab/jupyterlab/pull/10260) ([@marthacryan](https://github.com/marthacryan))
- File Browser: Add shortcuts [#10206](https://github.com/jupyterlab/jupyterlab/pull/10206) ([@martinRenou](https://github.com/martinRenou))
- Table of Contents: Add capacity to skip H1 Headers [#9994](https://github.com/jupyterlab/jupyterlab/pull/9994) ([@skyetim](https://github.com/skyetim))
- Table of Contents: Add context menus to sections containing runnable code cells [#10167](https://github.com/jupyterlab/jupyterlab/pull/10167) ([@jess-x](https://github.com/jess-x))
- Completer: Added tab cycling to Completer [#10147](https://github.com/jupyterlab/jupyterlab/pull/10147) ([@cameron-toy](https://github.com/cameron-toy))
- Customization: Build context menu from settings for easy customization [#10373](https://github.com/jupyterlab/jupyterlab/pull/10373) ([@fcollonval](https://github.com/fcollonval))
- Customization: Build menus from settings [#10254](https://github.com/jupyterlab/jupyterlab/pull/10254) ([@fcollonval](https://github.com/fcollonval))
- Customization: Disable `autoClosingBrackets` by default everywhere [#9488](https://github.com/jupyterlab/jupyterlab/pull/9488) ([@telamonian](https://github.com/telamonian))
- Customization: Add `cursorBlinkRate` settings for editors [#10485](https://github.com/jupyterlab/jupyterlab/pull/10485) ([@fcollonval](https://github.com/fcollonval))
- Licenses: Add a list of licenses accessible from the UI [#9779](https://github.com/jupyterlab/jupyterlab/pull/9779) ([@bollwyvl](https://github.com/bollwyvl))

### Enhancements made

- Add license-webpack-plugin [#9519](https://github.com/jupyterlab/jupyterlab/pull/9519) ([@bollwyvl](https://github.com/bollwyvl))
- Focus cells on split and leave cursor in cell with selection when splitting [#10297](https://github.com/jupyterlab/jupyterlab/pull/10297) ([@goanpeca](https://github.com/goanpeca))
- Fixes doc string for toc syncCollapseState setting [#10639](https://github.com/jupyterlab/jupyterlab/pull/10639) ([@andrewfulton9](https://github.com/andrewfulton9))
- Allow to set custom position for `Tooltip` [#10590](https://github.com/jupyterlab/jupyterlab/pull/10590) ([@krassowski](https://github.com/krassowski))
- Rename files in collaborative mode [#10564](https://github.com/jupyterlab/jupyterlab/pull/10564) ([@hbcarlos](https://github.com/hbcarlos))
- Reorganize settings menu for text editor [#10563](https://github.com/jupyterlab/jupyterlab/pull/10563) ([@fcollonval](https://github.com/fcollonval))
- Add promptCellConfig to Code Console Settings [#10555](https://github.com/jupyterlab/jupyterlab/pull/10555) ([@jess-x](https://github.com/jess-x))
- communicate heading collapse between ToC and Notebook [#10545](https://github.com/jupyterlab/jupyterlab/pull/10545) ([@andrewfulton9](https://github.com/andrewfulton9))
- feat: add options to include cell output in headings [#10537](https://github.com/jupyterlab/jupyterlab/pull/10537) ([@skyetim](https://github.com/skyetim))
- Open inspector split to the right [#10519](https://github.com/jupyterlab/jupyterlab/pull/10519) ([@legendb317](https://github.com/legendb317))
- Simple mode rename improvements 2.0 [#10518](https://github.com/jupyterlab/jupyterlab/pull/10518) ([@cameron-toy](https://github.com/cameron-toy))
- Make current kernel the default in kernel selector [#10510](https://github.com/jupyterlab/jupyterlab/pull/10510) ([@gereleth](https://github.com/gereleth))
- Add selectionExecuted and executionScheduled signals + update executed signal to include error status/info [#10493](https://github.com/jupyterlab/jupyterlab/pull/10493) ([@mwakaba2](https://github.com/mwakaba2))
- Scroll cell into view after output collapse [#10491](https://github.com/jupyterlab/jupyterlab/pull/10491) ([@gereleth](https://github.com/gereleth))
- Collaborative renaming & moving of files [#10470](https://github.com/jupyterlab/jupyterlab/pull/10470) ([@dmonad](https://github.com/dmonad))
- Update inspector open [#10449](https://github.com/jupyterlab/jupyterlab/pull/10449) ([@legendb317](https://github.com/legendb317))
- dirty cell: Store the code source as true source of output [#10438](https://github.com/jupyterlab/jupyterlab/pull/10438) ([@fcollonval](https://github.com/fcollonval))
- RTC: Anonymous user names based on the moons of Jupyter [#10411](https://github.com/jupyterlab/jupyterlab/pull/10411) ([@dmonad](https://github.com/dmonad))
- Add icon for .jl files in explorer [#10397](https://github.com/jupyterlab/jupyterlab/pull/10397) ([@shngt](https://github.com/shngt))
- Support arrow keys for button navigation [#10349](https://github.com/jupyterlab/jupyterlab/pull/10349) ([@jahn96](https://github.com/jahn96))
- Feature: select all cells with tags in toc [#10346](https://github.com/jupyterlab/jupyterlab/pull/10346) ([@NPetz](https://github.com/NPetz))
- \[licenses\] use serverSettings from serviceManager, style tweaks [#10329](https://github.com/jupyterlab/jupyterlab/pull/10329) ([@bollwyvl](https://github.com/bollwyvl))
- Filebrowser ContextMenu: Use separators [#10293](https://github.com/jupyterlab/jupyterlab/pull/10293) ([@martinRenou](https://github.com/martinRenou))
- Add a plugin to be able to swap the doc provider [#10256](https://github.com/jupyterlab/jupyterlab/pull/10256) ([@jtpio](https://github.com/jtpio))
- Completer: expose `activeIndex` and `indexChanged` [#10244](https://github.com/jupyterlab/jupyterlab/pull/10244) ([@hbcarlos](https://github.com/hbcarlos))
- DirListing: Refactor selection so that it's based on path not name [#10237](https://github.com/jupyterlab/jupyterlab/pull/10237) ([@martinRenou](https://github.com/martinRenou))
- DirListing: Allow for no sorting when clicking on headers [#10236](https://github.com/jupyterlab/jupyterlab/pull/10236) ([@martinRenou](https://github.com/martinRenou))
- Improve error handling in labextension install [#10233](https://github.com/jupyterlab/jupyterlab/pull/10233) ([@akx](https://github.com/akx))
- FileBrowser: Add protected method for creating the dirlisting [#10216](https://github.com/jupyterlab/jupyterlab/pull/10216) ([@martinRenou](https://github.com/martinRenou))
- added new command called runAllEnabled [#10215](https://github.com/jupyterlab/jupyterlab/pull/10215) ([@sarahspak](https://github.com/sarahspak))
- Filebrowser: Allow for escaping renaming [#10205](https://github.com/jupyterlab/jupyterlab/pull/10205) ([@martinRenou](https://github.com/martinRenou))
- Add new widget area below the dockpanel [#10201](https://github.com/jupyterlab/jupyterlab/pull/10201) ([@fcollonval](https://github.com/fcollonval))
- Debugger: show button shortcuts in tooltips [#10199](https://github.com/jupyterlab/jupyterlab/pull/10199) ([@jess-x](https://github.com/jess-x))
- Restore the relative sizes of areas in split panel [#10196](https://github.com/jupyterlab/jupyterlab/pull/10196) ([@krassowski](https://github.com/krassowski))
- Move open-with to its own plugin, so it can be disabled independently. [#10193](https://github.com/jupyterlab/jupyterlab/pull/10193) ([@robertpyke](https://github.com/robertpyke))
- key-bindings to codemirror search in single cell [#10184](https://github.com/jupyterlab/jupyterlab/pull/10184) ([@jess-x](https://github.com/jess-x))
- Rename at file creation [#10181](https://github.com/jupyterlab/jupyterlab/pull/10181) ([@martinRenou](https://github.com/martinRenou))
- Scroll into view on each step/frame changes/... [#10160](https://github.com/jupyterlab/jupyterlab/pull/10160) ([@mlucool](https://github.com/mlucool))
- Added support for namespace packages in labextensions. [#10150](https://github.com/jupyterlab/jupyterlab/pull/10150) ([@mellesies](https://github.com/mellesies))
- Color contrast adjustments for sidebar and command palette [#10146](https://github.com/jupyterlab/jupyterlab/pull/10146) ([@isabela-pf](https://github.com/isabela-pf))
- Rename simple interface documents from the title widget [#10140](https://github.com/jupyterlab/jupyterlab/pull/10140) ([@cameron-toy](https://github.com/cameron-toy))
- Perf: Add virtual Notebook for delayed cell rendering [#10131](https://github.com/jupyterlab/jupyterlab/pull/10131) ([@goanpeca](https://github.com/goanpeca))
- Perf: Trim notebook large output for better performance [#10129](https://github.com/jupyterlab/jupyterlab/pull/10129) ([@goanpeca](https://github.com/goanpeca))
- Perf: Codemirror performance enhancement [#10128](https://github.com/jupyterlab/jupyterlab/pull/10128) ([@goanpeca](https://github.com/goanpeca))
- Perf: Update CSS for performance enhancements [#10127](https://github.com/jupyterlab/jupyterlab/pull/10127) ([@goanpeca](https://github.com/goanpeca))
- Add Skip Link [#10126](https://github.com/jupyterlab/jupyterlab/pull/10126) ([@0618](https://github.com/0618))
- Allow Use of CDN to be Configurable for Fetching Package Metadata [#10125](https://github.com/jupyterlab/jupyterlab/pull/10125) ([@jhamet93](https://github.com/jhamet93))
- Allow NPM Registry and CDN Registry to be Configurable [#10110](https://github.com/jupyterlab/jupyterlab/pull/10110) ([@jhamet93](https://github.com/jhamet93))
- Fix last modified column toggle, allow to set it permanently [#10100](https://github.com/jupyterlab/jupyterlab/pull/10100) ([@krassowski](https://github.com/krassowski))
- TOC current position [#10099](https://github.com/jupyterlab/jupyterlab/pull/10099) ([@andrewfulton9](https://github.com/andrewfulton9))
- Add 'merge cell above/below' commands with shortcuts [#10076](https://github.com/jupyterlab/jupyterlab/pull/10076) ([@krassowska](https://github.com/krassowska))
- Disable escape key and click-outside-dialog behaviors if hasClose = false [#10049](https://github.com/jupyterlab/jupyterlab/pull/10049) ([@DianeHu](https://github.com/DianeHu))
- Name (un-renamed) file on first save [#10043](https://github.com/jupyterlab/jupyterlab/pull/10043) ([@jess-x](https://github.com/jess-x))
- Improve UX when a user restarts their Notebook server via JupyterHub [#10032](https://github.com/jupyterlab/jupyterlab/pull/10032) ([@vkaidalov-rft](https://github.com/vkaidalov-rft))
- Create New commands for common file types associated with available kernels [#10009](https://github.com/jupyterlab/jupyterlab/pull/10009) ([@ohrely](https://github.com/ohrely))
- feat: CommandLinker Support in Markdown cells [#9909](https://github.com/jupyterlab/jupyterlab/pull/9909) ([@0618](https://github.com/0618))
- Add support for Gitpod editor [#9883](https://github.com/jupyterlab/jupyterlab/pull/9883) ([@saulshanabrook](https://github.com/saulshanabrook))
- Move documentation panel rendering to renderer [#9663](https://github.com/jupyterlab/jupyterlab/pull/9663) ([@krassowski](https://github.com/krassowski))
- transition header element to div.header for accessibility [#9648](https://github.com/jupyterlab/jupyterlab/pull/9648) ([@tonyfast](https://github.com/tonyfast))
- Add aria roles and labels [#9622](https://github.com/jupyterlab/jupyterlab/pull/9622) ([@marthacryan](https://github.com/marthacryan))
- Vertical notebook cell prompts on mobile [#9464](https://github.com/jupyterlab/jupyterlab/pull/9464) ([@jtpio](https://github.com/jtpio))
- Debugger keyboard shortcuts [#9154](https://github.com/jupyterlab/jupyterlab/pull/9154) ([@mnowacki-b](https://github.com/mnowacki-b))
- Implement a guard for pending user input to avoid deadlocks [#8713](https://github.com/jupyterlab/jupyterlab/pull/8713) ([@echarles](https://github.com/echarles))
- Add null fileformat [#7596](https://github.com/jupyterlab/jupyterlab/pull/7596) ([@telamonian](https://github.com/telamonian))
- Search installed extensions [#7423](https://github.com/jupyterlab/jupyterlab/pull/7423) ([@jtpio](https://github.com/jtpio))
- Add "go-up" navigation support in filebrowser, fix other shortcuts behaviour [#6859](https://github.com/jupyterlab/jupyterlab/pull/6859) ([@krassowski](https://github.com/krassowski))

### Bugs fixed

- Workaround disappearing palette issue by using blur [#10693](https://github.com/jupyterlab/jupyterlab/pull/10693) ([@krassowski](https://github.com/krassowski))
- Set anonymous username bug [#10686](https://github.com/jupyterlab/jupyterlab/pull/10686) ([@hbcarlos](https://github.com/hbcarlos))
- Add icon and mnemonic menu attributes in settings [#10678](https://github.com/jupyterlab/jupyterlab/pull/10678) ([@fcollonval](https://github.com/fcollonval))
- Restore the focus target check removed in #10517 [#10664](https://github.com/jupyterlab/jupyterlab/pull/10664) ([@krassowski](https://github.com/krassowski))
- Fixed event handler in debugger session test [#10651](https://github.com/jupyterlab/jupyterlab/pull/10651) ([@JohanMabille](https://github.com/JohanMabille))
- Fix #10391 - incorrect cursor position after autocomplete [#10647](https://github.com/jupyterlab/jupyterlab/pull/10647) ([@dmonad](https://github.com/dmonad))
- Fix error messages when creating new dirs/files in a read only dir [#10641](https://github.com/jupyterlab/jupyterlab/pull/10641) ([@vkaidalov-rft](https://github.com/vkaidalov-rft))
- More automated release fixes [#10621](https://github.com/jupyterlab/jupyterlab/pull/10621) ([@blink1073](https://github.com/blink1073))
- Disable autoclosing brackets by default in console [#10612](https://github.com/jupyterlab/jupyterlab/pull/10612) ([@jasongrout](https://github.com/jasongrout))
- Restore current sidebar widget even if sides are switched [#10605](https://github.com/jupyterlab/jupyterlab/pull/10605) ([@afshin](https://github.com/afshin))
- Save only workspace name as metadata.id instead of full path [#10603](https://github.com/jupyterlab/jupyterlab/pull/10603) ([@afshin](https://github.com/afshin))
- Invoke onCellInserted when rendering a placeholder cell [#10602](https://github.com/jupyterlab/jupyterlab/pull/10602) ([@echarles](https://github.com/echarles))
- Fix font-weight for collaborative cursor caret [#10598](https://github.com/jupyterlab/jupyterlab/pull/10598) ([@krassowski](https://github.com/krassowski))
- Do not show tooltip when completer is active [#10588](https://github.com/jupyterlab/jupyterlab/pull/10588) ([@krassowski](https://github.com/krassowski))
- Only save and use valid user settings for the editor [#10585](https://github.com/jupyterlab/jupyterlab/pull/10585) ([@jasongrout](https://github.com/jasongrout))
- Remove `tabIndex` taking focus away from notebook [#10580](https://github.com/jupyterlab/jupyterlab/pull/10580) ([@krassowski](https://github.com/krassowski))
- Open Help menu's Jupyter Forum in a new browser tab by default [#10574](https://github.com/jupyterlab/jupyterlab/pull/10574) ([@isabela-pf](https://github.com/isabela-pf))
- Move all child cells when collapsed markdown heading is moved [#10571](https://github.com/jupyterlab/jupyterlab/pull/10571) ([@marthacryan](https://github.com/marthacryan))
- Restore JupyterLabMenu missing `menu` attribute [#10567](https://github.com/jupyterlab/jupyterlab/pull/10567) ([@fcollonval](https://github.com/fcollonval))
- Completer: Do not announce subset match selection if it did not change [#10556](https://github.com/jupyterlab/jupyterlab/pull/10556) ([@krassowski](https://github.com/krassowski))
- Fix string variable in debugger tree view [#10550](https://github.com/jupyterlab/jupyterlab/pull/10550) ([@fcollonval](https://github.com/fcollonval))
- Fix dialog windows ignoring buttons focus [#10532](https://github.com/jupyterlab/jupyterlab/pull/10532) ([@krassowski](https://github.com/krassowski))
- Fix contrast issues in command palette and file browser [#10531](https://github.com/jupyterlab/jupyterlab/pull/10531) ([@krassowski](https://github.com/krassowski))
- fix running cell when focused on output [#10517](https://github.com/jupyterlab/jupyterlab/pull/10517) ([@cameron-toy](https://github.com/cameron-toy))
- Check to make sure process.argv exists before using it. [#10507](https://github.com/jupyterlab/jupyterlab/pull/10507) ([@jasongrout](https://github.com/jasongrout))
- \[HOTFIX\] Render the correct index placeholder cell [#10505](https://github.com/jupyterlab/jupyterlab/pull/10505) ([@echarles](https://github.com/echarles))
- Remove content-visibility css prop to avoid jumpy scrollbar [#10503](https://github.com/jupyterlab/jupyterlab/pull/10503) ([@echarles](https://github.com/echarles))
- Fix checkbox styling [#10483](https://github.com/jupyterlab/jupyterlab/pull/10483) ([@fcollonval](https://github.com/fcollonval))
- Fix icons code for TOC and listings-info [#10476](https://github.com/jupyterlab/jupyterlab/pull/10476) ([@krassowski](https://github.com/krassowski))
- Fix watch mode [#10444](https://github.com/jupyterlab/jupyterlab/pull/10444) ([@fcollonval](https://github.com/fcollonval))
- Restore maxNumberOutputs removed in #10131 [#10432](https://github.com/jupyterlab/jupyterlab/pull/10432) ([@krassowski](https://github.com/krassowski))
- Fix console error when closing notebook [#10426](https://github.com/jupyterlab/jupyterlab/pull/10426) ([@marthacryan](https://github.com/marthacryan))
- Focus on "Cancel" rather than "Delete" in delete dialog [#10400](https://github.com/jupyterlab/jupyterlab/pull/10400) ([@krassowski](https://github.com/krassowski))
- Fix the `docmanager:name-on-save` command [#10355](https://github.com/jupyterlab/jupyterlab/pull/10355) ([@jtpio](https://github.com/jtpio))
- Fix codemirror options updating [#10353](https://github.com/jupyterlab/jupyterlab/pull/10353) ([@jasongrout](https://github.com/jasongrout))
- Fix incomplete transition to .path from .name [#10281](https://github.com/jupyterlab/jupyterlab/pull/10281) ([@krassowski](https://github.com/krassowski))
- Fix filebrowser focus issue [#10280](https://github.com/jupyterlab/jupyterlab/pull/10280) ([@krassowski](https://github.com/krassowski))
- Bump marked.js (and types) to pull fix for rendering [#10274](https://github.com/jupyterlab/jupyterlab/pull/10274) ([@krassowski](https://github.com/krassowski))
- Fix autocompletion issue [#10234](https://github.com/jupyterlab/jupyterlab/pull/10234) ([@dmonad](https://github.com/dmonad))
- show user dialog when attempting folder drop [#10209](https://github.com/jupyterlab/jupyterlab/pull/10209) ([@dharmaquark](https://github.com/dharmaquark))
- Workaround Chromium issue with iframe reload/href [#10185](https://github.com/jupyterlab/jupyterlab/pull/10185) ([@krassowski](https://github.com/krassowski))
- Upgrade CodeMirror to 5.61.0 (fixes indentation for Python type hints) [#10175](https://github.com/jupyterlab/jupyterlab/pull/10175) ([@krassowski](https://github.com/krassowski))
- fix document count in title [#10168](https://github.com/jupyterlab/jupyterlab/pull/10168) ([@jess-x](https://github.com/jess-x))
- Debugger: Remove all breakpoints should confirm action first [#10161](https://github.com/jupyterlab/jupyterlab/pull/10161) ([@mlucool](https://github.com/mlucool))
- fix: highlight tab focused buttons and Dir List [#10153](https://github.com/jupyterlab/jupyterlab/pull/10153) ([@0618](https://github.com/0618))
- Fix handling of mathjax in notebook example [#10134](https://github.com/jupyterlab/jupyterlab/pull/10134) ([@jtpio](https://github.com/jtpio))
- Fix dry run logic in publish script [#10068](https://github.com/jupyterlab/jupyterlab/pull/10068) ([@jtpio](https://github.com/jtpio))
- Fix #7525 by setting yarn.lock permissions [#10063](https://github.com/jupyterlab/jupyterlab/pull/10063) ([@jluttine](https://github.com/jluttine))
- Add cell id per notebook format 4.5 [#10018](https://github.com/jupyterlab/jupyterlab/pull/10018) ([@jayqi](https://github.com/jayqi))
- \[Fix\] `Copy shareable link` command - fix the filename encoding (for files with spaces in the name) [#10015](https://github.com/jupyterlab/jupyterlab/pull/10015) ([@ognjenjevremovic](https://github.com/ognjenjevremovic))
- fixed ellipsis character after menu items in UI [#10000](https://github.com/jupyterlab/jupyterlab/pull/10000) ([@RodyLipson](https://github.com/RodyLipson))
- Fix js-apputils session context tests [#9997](https://github.com/jupyterlab/jupyterlab/pull/9997) ([@jtpio](https://github.com/jtpio))
- Fix escaping of urls and paths [#9978](https://github.com/jupyterlab/jupyterlab/pull/9978) ([@jasongrout](https://github.com/jasongrout))
- Do not make unnecessary npm registry requests [#9974](https://github.com/jupyterlab/jupyterlab/pull/9974) ([@jasongrout](https://github.com/jasongrout))
- Remove lookbehind from ToC MD regex for Safari [#9962](https://github.com/jupyterlab/jupyterlab/pull/9962) ([@dge8](https://github.com/dge8))
- DocRegistry FileType pattern matching doesn't work [#9958](https://github.com/jupyterlab/jupyterlab/pull/9958) ([@ajbozarth](https://github.com/ajbozarth))
- Made disposable optional for widget extensions [#9954](https://github.com/jupyterlab/jupyterlab/pull/9954) ([@loichuder](https://github.com/loichuder))
- Fix ToC markdown bug for HTML comments [#9938](https://github.com/jupyterlab/jupyterlab/pull/9938) ([@marthacryan](https://github.com/marthacryan))
- Make Table of Contents extension not rewrite all notebook headers. [#9932](https://github.com/jupyterlab/jupyterlab/pull/9932) ([@jasongrout](https://github.com/jasongrout))
- Fix watch mode for external extensions [#9915](https://github.com/jupyterlab/jupyterlab/pull/9915) ([@ajbozarth](https://github.com/ajbozarth))
- Add websocket token auth in case of different ws domain [#9898](https://github.com/jupyterlab/jupyterlab/pull/9898) ([@darcsoel](https://github.com/darcsoel))
- Bug fix for extension watch mode behavior [#9889](https://github.com/jupyterlab/jupyterlab/pull/9889) ([@afshin](https://github.com/afshin))
- Do not display the splash screen in the application state plugin [#9875](https://github.com/jupyterlab/jupyterlab/pull/9875) ([@jasongrout](https://github.com/jasongrout))
- Allow overrides.json to override default shortcuts. [#9858](https://github.com/jupyterlab/jupyterlab/pull/9858) ([@jasongrout](https://github.com/jasongrout))
- Fix contrast of debugger icon when selected [#9851](https://github.com/jupyterlab/jupyterlab/pull/9851) ([@krassowski](https://github.com/krassowski))
- Remove the previous file_to_run logic [#9847](https://github.com/jupyterlab/jupyterlab/pull/9847) ([@jtpio](https://github.com/jtpio))
- Add missing return types to fileeditor-extension/src/commands.ts [#9844](https://github.com/jupyterlab/jupyterlab/pull/9844) ([@jtpio](https://github.com/jtpio))
- Fix example pins, don't prettier ipynb_checkpoints [#9835](https://github.com/jupyterlab/jupyterlab/pull/9835) ([@bollwyvl](https://github.com/bollwyvl))
- Remove the auto-switch to “mobile” mode, and behavior switches associated with mobile mode [#9831](https://github.com/jupyterlab/jupyterlab/pull/9831) ([@jasongrout](https://github.com/jasongrout))
- Fix the display of breakpoints on restore [#9824](https://github.com/jupyterlab/jupyterlab/pull/9824) ([@jtpio](https://github.com/jtpio))
- @jupyterlab/rendermime: upgraded `marked` dep past vulnerability [#9809](https://github.com/jupyterlab/jupyterlab/pull/9809) ([@telamonian](https://github.com/telamonian))
- Fix Services Tests [#9806](https://github.com/jupyterlab/jupyterlab/pull/9806) ([@afshin](https://github.com/afshin))
- Fix label for "Create Console for Editor" [#9794](https://github.com/jupyterlab/jupyterlab/pull/9794) ([@krassowski](https://github.com/krassowski))
- Fix mimerender test example and test in CI [#9782](https://github.com/jupyterlab/jupyterlab/pull/9782) ([@afshin](https://github.com/afshin))
- Correct synchronization of tags between metadata and tags widget [#9773](https://github.com/jupyterlab/jupyterlab/pull/9773) ([@fcollonval](https://github.com/fcollonval))
- Fix race condition in session startup [#9766](https://github.com/jupyterlab/jupyterlab/pull/9766) ([@afshin](https://github.com/afshin))
- \[BugFix\] `ArgumentConflict` is not defined [#9760](https://github.com/jupyterlab/jupyterlab/pull/9760) ([@andrewfulton9](https://github.com/andrewfulton9))
- Fix search provider not recognising text nodes [#9746](https://github.com/jupyterlab/jupyterlab/pull/9746) ([@krassowski](https://github.com/krassowski))
- Do not take focus away from search panel (for navigateToCurrentDirectory) [#9745](https://github.com/jupyterlab/jupyterlab/pull/9745) ([@krassowski](https://github.com/krassowski))
- Fix uninstallation of packages in extension manager [#9744](https://github.com/jupyterlab/jupyterlab/pull/9744) ([@afshin](https://github.com/afshin))
- Add missing default_url fields to more examples [#9737](https://github.com/jupyterlab/jupyterlab/pull/9737) ([@afshin](https://github.com/afshin))
- Add missing default_url fields to examples [#9731](https://github.com/jupyterlab/jupyterlab/pull/9731) ([@afshin](https://github.com/afshin))
- Fix debug flag handling in build command [#9715](https://github.com/jupyterlab/jupyterlab/pull/9715) ([@afshin](https://github.com/afshin))
- Use Path.resolve() to get canonical case-sensitive path names [#9709](https://github.com/jupyterlab/jupyterlab/pull/9709) ([@jasongrout](https://github.com/jasongrout))
- Fix use of hyphen in module name [#9655](https://github.com/jupyterlab/jupyterlab/pull/9655) ([@hbcarlos](https://github.com/hbcarlos))

### Maintenance and upkeep improvements

- Clean up Link Caching [#10687](https://github.com/jupyterlab/jupyterlab/pull/10687) ([@afshin](https://github.com/afshin))
- Clean up link checking [#10673](https://github.com/jupyterlab/jupyterlab/pull/10673) ([@blink1073](https://github.com/blink1073))
- Fix integrity2 test [#10660](https://github.com/jupyterlab/jupyterlab/pull/10660) ([@fcollonval](https://github.com/fcollonval))
- Context menu plugin schema [#10645](https://github.com/jupyterlab/jupyterlab/pull/10645) ([@jtpio](https://github.com/jtpio))
- Move the context menu building logic to a separate plugin [#10624](https://github.com/jupyterlab/jupyterlab/pull/10624) ([@jtpio](https://github.com/jtpio))
- Fix typo in the `dirty` plugin id [#10623](https://github.com/jupyterlab/jupyterlab/pull/10623) ([@jtpio](https://github.com/jtpio))
- More releaser fixes [#10614](https://github.com/jupyterlab/jupyterlab/pull/10614) ([@afshin](https://github.com/afshin))
- Revert name file feature [#10609](https://github.com/jupyterlab/jupyterlab/pull/10609) ([@jess-x](https://github.com/jess-x))
- Fix usage of Releaser [#10608](https://github.com/jupyterlab/jupyterlab/pull/10608) ([@afshin](https://github.com/afshin))
- Finish Releaser Integration [#10606](https://github.com/jupyterlab/jupyterlab/pull/10606) ([@afshin](https://github.com/afshin))
- Fix `js-services` test with the new ipykernel 6 [#10592](https://github.com/jupyterlab/jupyterlab/pull/10592) ([@jtpio](https://github.com/jtpio))
- Switch to using a `PromiseDelegate` in `yprovider.ts` [#10587](https://github.com/jupyterlab/jupyterlab/pull/10587) ([@jtpio](https://github.com/jtpio))
- Rename to `YjsEchoWebSocket` [#10586](https://github.com/jupyterlab/jupyterlab/pull/10586) ([@jtpio](https://github.com/jtpio))
- Give answered issues action permission to write [#10583](https://github.com/jupyterlab/jupyterlab/pull/10583) ([@jasongrout](https://github.com/jasongrout))
- Update typedoc [#10582](https://github.com/jupyterlab/jupyterlab/pull/10582) ([@jasongrout](https://github.com/jasongrout))
- Set the stale message to have an actual value. [#10575](https://github.com/jupyterlab/jupyterlab/pull/10575) ([@jasongrout](https://github.com/jasongrout))
- Move the application status check to a separate plugin [#10572](https://github.com/jupyterlab/jupyterlab/pull/10572) ([@jtpio](https://github.com/jtpio))
- Skip the ipykernel debugger test [#10569](https://github.com/jupyterlab/jupyterlab/pull/10569) ([@jtpio](https://github.com/jtpio))
- Add new file to CodeQL `path-ignore` [#10568](https://github.com/jupyterlab/jupyterlab/pull/10568) ([@jtpio](https://github.com/jtpio))
- Fix closing answered issues by setting the stale-issue-message attribute [#10553](https://github.com/jupyterlab/jupyterlab/pull/10553) ([@jasongrout](https://github.com/jasongrout))
- Switch to dev-mode for ui-tests [#10549](https://github.com/jupyterlab/jupyterlab/pull/10549) ([@fcollonval](https://github.com/fcollonval))
- Export awareness [#10539](https://github.com/jupyterlab/jupyterlab/pull/10539) ([@hbcarlos](https://github.com/hbcarlos))
- Move answered workflow file to the workflows directory [#10536](https://github.com/jupyterlab/jupyterlab/pull/10536) ([@jasongrout](https://github.com/jasongrout))
- Update skiplink implementation [#10535](https://github.com/jupyterlab/jupyterlab/pull/10535) ([@isabela-pf](https://github.com/isabela-pf))
- DirListing: Make mouse events methods protected [#10527](https://github.com/jupyterlab/jupyterlab/pull/10527) ([@martinRenou](https://github.com/martinRenou))
- Refresh yarn.lock in preparation for 3.1 [#10516](https://github.com/jupyterlab/jupyterlab/pull/10516) ([@jasongrout](https://github.com/jasongrout))
- Update webpack dependency [#10515](https://github.com/jupyterlab/jupyterlab/pull/10515) ([@jasongrout](https://github.com/jasongrout))
- Carry end-to-end tests on docker [#10498](https://github.com/jupyterlab/jupyterlab/pull/10498) ([@fcollonval](https://github.com/fcollonval))
- Add language to MarkdownCodeBlocks' "should find a block with a language" spec [#10495](https://github.com/jupyterlab/jupyterlab/pull/10495) ([@ainzzorl](https://github.com/ainzzorl))
- Add Verdaccio helper to prepare for releaser [#10494](https://github.com/jupyterlab/jupyterlab/pull/10494) ([@jtpio](https://github.com/jtpio))
- Make highlighted line in debugger readable [#10479](https://github.com/jupyterlab/jupyterlab/pull/10479) ([@krassowski](https://github.com/krassowski))
- Move filebrowser shortcuts to settings [#10466](https://github.com/jupyterlab/jupyterlab/pull/10466) ([@fcollonval](https://github.com/fcollonval))
- upgrade to galata 3.0.11-2 [#10453](https://github.com/jupyterlab/jupyterlab/pull/10453) ([@mbektas](https://github.com/mbektas))
- UI fix: clearer save message [#10430](https://github.com/jupyterlab/jupyterlab/pull/10430) ([@jess-x](https://github.com/jess-x))
- Interface pass on the name file dialog feature [#10416](https://github.com/jupyterlab/jupyterlab/pull/10416) ([@jtpio](https://github.com/jtpio))
- Split move cell test into 2 separate tests [#10410](https://github.com/jupyterlab/jupyterlab/pull/10410) ([@fcollonval](https://github.com/fcollonval))
- Fix a bug since merging arrow navigation between buttons in Dialog (#10349) [#10395](https://github.com/jupyterlab/jupyterlab/pull/10395) ([@jahn96](https://github.com/jahn96))
- Handle updating dependencies without a semver range prefix [#10393](https://github.com/jupyterlab/jupyterlab/pull/10393) ([@jasongrout](https://github.com/jasongrout))
- Restore padding on main dock panel [#10390](https://github.com/jupyterlab/jupyterlab/pull/10390) ([@fcollonval](https://github.com/fcollonval))
- Add the `ui-tests` folder to the labeler [#10386](https://github.com/jupyterlab/jupyterlab/pull/10386) ([@jtpio](https://github.com/jtpio))
- Fix completer on cell example [#10382](https://github.com/jupyterlab/jupyterlab/pull/10382) ([@hbcarlos](https://github.com/hbcarlos))
- UI Tests: Update reference screenshots [#10372](https://github.com/jupyterlab/jupyterlab/pull/10372) ([@jtpio](https://github.com/jtpio))
- Remove `mode` from the `JupyterFrontEnd.IShell` interface [#10368](https://github.com/jupyterlab/jupyterlab/pull/10368) ([@jtpio](https://github.com/jtpio))
- Allow bumpversion to work with patch [#10360](https://github.com/jupyterlab/jupyterlab/pull/10360) ([@blink1073](https://github.com/blink1073))
- Start testing the debugger with Galata [#10359](https://github.com/jupyterlab/jupyterlab/pull/10359) ([@jtpio](https://github.com/jtpio))
- Remove unused `IMainMenu` dependency [#10356](https://github.com/jupyterlab/jupyterlab/pull/10356) ([@jtpio](https://github.com/jtpio))
- tagging deprecated completer APIs [#10348](https://github.com/jupyterlab/jupyterlab/pull/10348) ([@dharmaquark](https://github.com/dharmaquark))
- Fix master UI test [#10345](https://github.com/jupyterlab/jupyterlab/pull/10345) ([@fcollonval](https://github.com/fcollonval))
- Add linter rule for sorting import [#10344](https://github.com/jupyterlab/jupyterlab/pull/10344) ([@fcollonval](https://github.com/fcollonval))
- Update labeler to use the `documentation` label for docs [#10336](https://github.com/jupyterlab/jupyterlab/pull/10336) ([@jtpio](https://github.com/jtpio))
- Fix clean-package and correct toc extension [#10332](https://github.com/jupyterlab/jupyterlab/pull/10332) ([@fcollonval](https://github.com/fcollonval))
- Automated UI testing using Galata [#10331](https://github.com/jupyterlab/jupyterlab/pull/10331) ([@mbektas](https://github.com/mbektas))
- Add permissions to the labeler workflow [#10324](https://github.com/jupyterlab/jupyterlab/pull/10324) ([@jtpio](https://github.com/jtpio))
- Fix labeler workflow [#10322](https://github.com/jupyterlab/jupyterlab/pull/10322) ([@jtpio](https://github.com/jtpio))
- fix: remove the 3-second startup delay of the kernel connection [#10321](https://github.com/jupyterlab/jupyterlab/pull/10321) ([@mariobuikhuizen](https://github.com/mariobuikhuizen))
- Update `ws` dependency [#10316](https://github.com/jupyterlab/jupyterlab/pull/10316) ([@jtpio](https://github.com/jtpio))
- Fix remote-caret rendering [#10315](https://github.com/jupyterlab/jupyterlab/pull/10315) ([@dmonad](https://github.com/dmonad))
- Add Plugin wrapper for "Open in New Browser Tab" so it can be disabled. [#10311](https://github.com/jupyterlab/jupyterlab/pull/10311) ([@robertpyke](https://github.com/robertpyke))
- Minor code style pass on `yprovider.ts` [#10308](https://github.com/jupyterlab/jupyterlab/pull/10308) ([@jtpio](https://github.com/jtpio))
- Update labeler and add auto assign to PRs [#10306](https://github.com/jupyterlab/jupyterlab/pull/10306) ([@goanpeca](https://github.com/goanpeca))
- Fix focus accept button on dialog unit test [#10303](https://github.com/jupyterlab/jupyterlab/pull/10303) ([@fcollonval](https://github.com/fcollonval))
- Add Yjs as a singleton package [#10301](https://github.com/jupyterlab/jupyterlab/pull/10301) ([@dmonad](https://github.com/dmonad))
- Remove various tab indices [#10289](https://github.com/jupyterlab/jupyterlab/pull/10289) ([@marthacryan](https://github.com/marthacryan))
- Add the new docprovider-extension to the labeler [#10288](https://github.com/jupyterlab/jupyterlab/pull/10288) ([@jtpio](https://github.com/jtpio))
- FileBrowserModel: Allow for overwriting \_onFileChanged [#10286](https://github.com/jupyterlab/jupyterlab/pull/10286) ([@martinRenou](https://github.com/martinRenou))
- Enable real time collaboration on the dev Binder [#10258](https://github.com/jupyterlab/jupyterlab/pull/10258) ([@jtpio](https://github.com/jtpio))
- Add the new packages to the labeler [#10257](https://github.com/jupyterlab/jupyterlab/pull/10257) ([@jtpio](https://github.com/jtpio))
- Update enhancement tag in the issue template [#10253](https://github.com/jupyterlab/jupyterlab/pull/10253) ([@jtpio](https://github.com/jtpio))
- DirListing: Make some methods protected [#10247](https://github.com/jupyterlab/jupyterlab/pull/10247) ([@martinRenou](https://github.com/martinRenou))
- FileBrowserModel: Make some methods protected [#10246](https://github.com/jupyterlab/jupyterlab/pull/10246) ([@martinRenou](https://github.com/martinRenou))
- FileBrowser: Make listing and crumbs accessible to subclasses [#10245](https://github.com/jupyterlab/jupyterlab/pull/10245) ([@martinRenou](https://github.com/martinRenou))
- Fix Shutdown Error in Test App [#10240](https://github.com/jupyterlab/jupyterlab/pull/10240) ([@afshin](https://github.com/afshin))
- Remove tabmanager-extension from packages list [#10232](https://github.com/jupyterlab/jupyterlab/pull/10232) ([@krassowski](https://github.com/krassowski))
- Re-enable splice source tests [#10230](https://github.com/jupyterlab/jupyterlab/pull/10230) ([@jtpio](https://github.com/jtpio))
- DirListing: Make Renderer's private method protected [#10224](https://github.com/jupyterlab/jupyterlab/pull/10224) ([@martinRenou](https://github.com/martinRenou))
- Update to `sanitize-html~=2.3.3` [#10220](https://github.com/jupyterlab/jupyterlab/pull/10220) ([@jtpio](https://github.com/jtpio))
- Update to `url-parse~=1.5.1` [#10219](https://github.com/jupyterlab/jupyterlab/pull/10219) ([@jtpio](https://github.com/jtpio))
- Remove runtime dependency on `jupyter_packaging` [#10217](https://github.com/jupyterlab/jupyterlab/pull/10217) ([@jtpio](https://github.com/jtpio))
- Replaced ... with ellipses unicode character in .ts files [#10208](https://github.com/jupyterlab/jupyterlab/pull/10208) ([@yasmin-bb](https://github.com/yasmin-bb))
- add tooltip on cell type dropdown [#10182](https://github.com/jupyterlab/jupyterlab/pull/10182) ([@fcollonval](https://github.com/fcollonval))
- Update the mock packages to jupyter-packaging 0.10 [#10177](https://github.com/jupyterlab/jupyterlab/pull/10177) ([@jtpio](https://github.com/jtpio))
- clean up unused signal in notebook search [#10169](https://github.com/jupyterlab/jupyterlab/pull/10169) ([@jess-x](https://github.com/jess-x))
- Debugger: show callstack clearer with names/ids [#10162](https://github.com/jupyterlab/jupyterlab/pull/10162) ([@mlucool](https://github.com/mlucool))
- Fix Permissions of Labeler Workflow [#10141](https://github.com/jupyterlab/jupyterlab/pull/10141) ([@jtpio](https://github.com/jtpio))
- Add Required Permission to CodeQL Workflow [#10138](https://github.com/jupyterlab/jupyterlab/pull/10138) ([@afshin](https://github.com/afshin))
- Clean up workflow permissions [#10136](https://github.com/jupyterlab/jupyterlab/pull/10136) ([@afshin](https://github.com/afshin))
- include all default\*.json in @jupyterlab/testutils distributions [#10132](https://github.com/jupyterlab/jupyterlab/pull/10132) ([@bollwyvl](https://github.com/bollwyvl))
- Clean up package integrity [#10122](https://github.com/jupyterlab/jupyterlab/pull/10122) ([@jtpio](https://github.com/jtpio))
- Update employer name [#10120](https://github.com/jupyterlab/jupyterlab/pull/10120) ([@mbektas](https://github.com/mbektas))
- Export createRendermimePlugin from @jupyterlab/application [#10117](https://github.com/jupyterlab/jupyterlab/pull/10117) ([@jtpio](https://github.com/jtpio))
- Upgrade to Jupyter Packaging 0.9 [#10096](https://github.com/jupyterlab/jupyterlab/pull/10096) ([@jtpio](https://github.com/jtpio))
- Pulled notebook export UI into separate extension so it can be disabled easily [#10094](https://github.com/jupyterlab/jupyterlab/pull/10094) ([@DianeHu](https://github.com/DianeHu))
- Add a clarifying comment for the download plugin. [#10092](https://github.com/jupyterlab/jupyterlab/pull/10092) ([@jasongrout](https://github.com/jasongrout))
- Move the about help dialog to its own plugin [#10089](https://github.com/jupyterlab/jupyterlab/pull/10089) ([@jtpio](https://github.com/jtpio))
- Move "Launch Classic Notebook" to its own plugin [#10086](https://github.com/jupyterlab/jupyterlab/pull/10086) ([@jtpio](https://github.com/jtpio))
- Add the celltags extension to the `app` example [#10078](https://github.com/jupyterlab/jupyterlab/pull/10078) ([@jtpio](https://github.com/jtpio))
- Move the main application commands to a separate plugin [#10073](https://github.com/jupyterlab/jupyterlab/pull/10073) ([@jtpio](https://github.com/jtpio))
- Pull out filebrowser context menu download UI into separate plugin so it can be disabled easily [#10066](https://github.com/jupyterlab/jupyterlab/pull/10066) ([@DianeHu](https://github.com/DianeHu))
- Pull docmanager download UI into separate plugin so that it can be disabled easily [#10065](https://github.com/jupyterlab/jupyterlab/pull/10065) ([@DianeHu](https://github.com/DianeHu))
- Add the toc extension to the `app` example [#10053](https://github.com/jupyterlab/jupyterlab/pull/10053) ([@jtpio](https://github.com/jtpio))
- Update copyright to 2021 in the about dialog [#10052](https://github.com/jupyterlab/jupyterlab/pull/10052) ([@jtpio](https://github.com/jtpio))
- Remove `buffer` dependency from `@jupyterlab/apputils` [#10050](https://github.com/jupyterlab/jupyterlab/pull/10050) ([@jtpio](https://github.com/jtpio))
- Use blobs to set the svg source of an image in the image viewer [#10029](https://github.com/jupyterlab/jupyterlab/pull/10029) ([@jasongrout](https://github.com/jasongrout))
- Show app.name in the tab title [#10023](https://github.com/jupyterlab/jupyterlab/pull/10023) ([@jtpio](https://github.com/jtpio))
- Add document name and workspaces to title Bar [#10002](https://github.com/jupyterlab/jupyterlab/pull/10002) ([@jess-x](https://github.com/jess-x))
- Loosen pin on jupyter-packaging [#9998](https://github.com/jupyterlab/jupyterlab/pull/9998) ([@afshin](https://github.com/afshin))
- Move js-services to the flaky CI workflow [#9987](https://github.com/jupyterlab/jupyterlab/pull/9987) ([@jtpio](https://github.com/jtpio))
- API for custom toolbars/headers in Notebook widgets [#9984](https://github.com/jupyterlab/jupyterlab/pull/9984) ([@fasiha](https://github.com/fasiha))
- Use Playwright and Test All Browsers [#9977](https://github.com/jupyterlab/jupyterlab/pull/9977) ([@afshin](https://github.com/afshin))
- Update console message for when fullMathjaxUrl is missing from the page config [#9970](https://github.com/jupyterlab/jupyterlab/pull/9970) ([@jtpio](https://github.com/jtpio))
- Update react-json-tree to 0.15.0 [#9949](https://github.com/jupyterlab/jupyterlab/pull/9949) ([@jtpio](https://github.com/jtpio))
- changing ... to ellipsis character in json find [#9946](https://github.com/jupyterlab/jupyterlab/pull/9946) ([@RodyLipson](https://github.com/RodyLipson))
- Update @lumino dependencies [#9939](https://github.com/jupyterlab/jupyterlab/pull/9939) ([@marthacryan](https://github.com/marthacryan))
- Move the code consoles functionalities for the notebook to a separate plugin [#9934](https://github.com/jupyterlab/jupyterlab/pull/9934) ([@jtpio](https://github.com/jtpio))
- Remove the explicit path to the mock extension used in the integrity script [#9921](https://github.com/jupyterlab/jupyterlab/pull/9921) ([@jtpio](https://github.com/jtpio))
- Automatically close “answered” issues if they have no activity for 30 days [#9920](https://github.com/jupyterlab/jupyterlab/pull/9920) ([@jasongrout](https://github.com/jasongrout))
- Added Pipfile to .gitignore [#9893](https://github.com/jupyterlab/jupyterlab/pull/9893) ([@palewire](https://github.com/palewire))
- Added Forum to help menu. Fixes #8678 [#9892](https://github.com/jupyterlab/jupyterlab/pull/9892) ([@palewire](https://github.com/palewire))
- Make the markdown plugin more reusable [#9876](https://github.com/jupyterlab/jupyterlab/pull/9876) ([@jtpio](https://github.com/jtpio))
- Turn HTML sanitizer into a plugin [#9873](https://github.com/jupyterlab/jupyterlab/pull/9873) ([@ohrely](https://github.com/ohrely))
- Cleanup unused Python imports [#9864](https://github.com/jupyterlab/jupyterlab/pull/9864) ([@jtpio](https://github.com/jtpio))
- Update @lumino dependencies [#9857](https://github.com/jupyterlab/jupyterlab/pull/9857) ([@jtpio](https://github.com/jtpio))
- Move the cloned outputs to a separate plugin [#9845](https://github.com/jupyterlab/jupyterlab/pull/9845) ([@jtpio](https://github.com/jtpio))
- Add icon to Create Console for Editor [#9843](https://github.com/jupyterlab/jupyterlab/pull/9843) ([@jtpio](https://github.com/jtpio))
- Add Markdown icon for Show Markdown Preview [#9840](https://github.com/jupyterlab/jupyterlab/pull/9840) ([@krassowski](https://github.com/krassowski))
- Enable Caching in Production Minimized Mode [#9833](https://github.com/jupyterlab/jupyterlab/pull/9833) ([@afshin](https://github.com/afshin))
- Clean up Release Scripts and Test in CI [#9821](https://github.com/jupyterlab/jupyterlab/pull/9821) ([@afshin](https://github.com/afshin))
- Update CI script timeouts [#9814](https://github.com/jupyterlab/jupyterlab/pull/9814) ([@afshin](https://github.com/afshin))
- Update MANIFEST.in to include package_data files. [#9780](https://github.com/jupyterlab/jupyterlab/pull/9780) ([@jasongrout](https://github.com/jasongrout))
- Add hash to webpack requests to enable caching [#9776](https://github.com/jupyterlab/jupyterlab/pull/9776) ([@afshin](https://github.com/afshin))
- Updates the locking configuration [#9754](https://github.com/jupyterlab/jupyterlab/pull/9754) ([@jasongrout](https://github.com/jasongrout))
- Use get_package_url from jupyterlab-server [#9743](https://github.com/jupyterlab/jupyterlab/pull/9743) ([@krassowski](https://github.com/krassowski))
- Add link for prebuilt extensions too [#9702](https://github.com/jupyterlab/jupyterlab/pull/9702) ([@flying-sheep](https://github.com/flying-sheep))
- Enable jupyter labextension build/watch to work for custom jupyterlab distributions [#9697](https://github.com/jupyterlab/jupyterlab/pull/9697) ([@jasongrout](https://github.com/jasongrout))
- Move flaky tests to a separate workflow on CI [#9677](https://github.com/jupyterlab/jupyterlab/pull/9677) ([@jtpio](https://github.com/jtpio))
- Make the filebrowser plugins more reusable [#9667](https://github.com/jupyterlab/jupyterlab/pull/9667) ([@jtpio](https://github.com/jtpio))
- fix: use process/browser module as real polyfill [#9636](https://github.com/jupyterlab/jupyterlab/pull/9636) ([@maartenbreddels](https://github.com/maartenbreddels))

### Documentation improvements

- Add alt attributes for test docs sprint [#10670](https://github.com/jupyterlab/jupyterlab/pull/10670) ([@isabela-pf](https://github.com/isabela-pf))
- Add some upgrade notes to JupyterLab 3.1 [#10654](https://github.com/jupyterlab/jupyterlab/pull/10654) ([@fcollonval](https://github.com/fcollonval))
- fixes doc string for toc syncCollapseState setting [#10639](https://github.com/jupyterlab/jupyterlab/pull/10639) ([@andrewfulton9](https://github.com/andrewfulton9))
- Mention prebuilt extensions in README and docs [#10604](https://github.com/jupyterlab/jupyterlab/pull/10604) ([@krassowski](https://github.com/krassowski))
- replace OS X -> macOS [#10599](https://github.com/jupyterlab/jupyterlab/pull/10599) ([@partev](https://github.com/partev))
- Fix documentation for `selectionExecuted` signal (copy-paste error) [#10579](https://github.com/jupyterlab/jupyterlab/pull/10579) ([@krassowski](https://github.com/krassowski))
- Documentation for Real Time Collaboration [#10547](https://github.com/jupyterlab/jupyterlab/pull/10547) ([@hbcarlos](https://github.com/hbcarlos))
- Update docs [#10543](https://github.com/jupyterlab/jupyterlab/pull/10543) ([@hbcarlos](https://github.com/hbcarlos))
- Fix a few typos, camelCase some privates [#10524](https://github.com/jupyterlab/jupyterlab/pull/10524) ([@krassowski](https://github.com/krassowski))
- Add `ipykernel` to the debugger user docs [#10512](https://github.com/jupyterlab/jupyterlab/pull/10512) ([@jtpio](https://github.com/jtpio))
- Fix two links in documentation [#10421](https://github.com/jupyterlab/jupyterlab/pull/10421) ([@blink1073](https://github.com/blink1073))
- Allow theme and style css [#10381](https://github.com/jupyterlab/jupyterlab/pull/10381) ([@jasongrout](https://github.com/jasongrout))
- Revert visual regression [#10376](https://github.com/jupyterlab/jupyterlab/pull/10376) ([@fcollonval](https://github.com/fcollonval))
- Build context menu from settings for easy customization [#10373](https://github.com/jupyterlab/jupyterlab/pull/10373) ([@fcollonval](https://github.com/fcollonval))
- Fix listing documentation [#10367](https://github.com/jupyterlab/jupyterlab/pull/10367) ([@fcollonval](https://github.com/fcollonval))
- add UI testing section to contributor documentation [#10364](https://github.com/jupyterlab/jupyterlab/pull/10364) ([@mbektas](https://github.com/mbektas))
- Add missing docstrings [#10357](https://github.com/jupyterlab/jupyterlab/pull/10357) ([@jtpio](https://github.com/jtpio))
- changed Javsacript to Javascript [#10333](https://github.com/jupyterlab/jupyterlab/pull/10333) ([@Ashish-15s](https://github.com/Ashish-15s))
- Fix clean-package and correct toc extension [#10332](https://github.com/jupyterlab/jupyterlab/pull/10332) ([@fcollonval](https://github.com/fcollonval))
- Automated UI testing using Galata [#10331](https://github.com/jupyterlab/jupyterlab/pull/10331) ([@mbektas](https://github.com/mbektas))
- fix: typo in getting_started/faq [#10330](https://github.com/jupyterlab/jupyterlab/pull/10330) ([@manavendrasen](https://github.com/manavendrasen))
- Fix documentation [#10323](https://github.com/jupyterlab/jupyterlab/pull/10323) ([@davidbrochart](https://github.com/davidbrochart))
- Update Maintainer List [#10300](https://github.com/jupyterlab/jupyterlab/pull/10300) ([@blink1073](https://github.com/blink1073))
- Add note about symlink activation on Windows. [#10292](https://github.com/jupyterlab/jupyterlab/pull/10292) ([@fcollonval](https://github.com/fcollonval))
- Add changelog entry for 3.0.16 [#10267](https://github.com/jupyterlab/jupyterlab/pull/10267) ([@blink1073](https://github.com/blink1073))
- Update `documentsearch` description in `package.json` [#10265](https://github.com/jupyterlab/jupyterlab/pull/10265) ([@jtpio](https://github.com/jtpio))
- Build menus from settings [#10254](https://github.com/jupyterlab/jupyterlab/pull/10254) ([@fcollonval](https://github.com/fcollonval))
- Add changelog entry for 3.0.15 release [#10238](https://github.com/jupyterlab/jupyterlab/pull/10238) ([@blink1073](https://github.com/blink1073))
- Update contribution docs to show how to rebuild on change [#10204](https://github.com/jupyterlab/jupyterlab/pull/10204) ([@martinRenou](https://github.com/martinRenou))
- Remove installing `notebook` from the contributing guide [#10200](https://github.com/jupyterlab/jupyterlab/pull/10200) ([@jtpio](https://github.com/jtpio))
- Improve prebuild extension docs [#10190](https://github.com/jupyterlab/jupyterlab/pull/10190) ([@hbcarlos](https://github.com/hbcarlos))
- fix(docs): corrects typo in ui-components README [#10155](https://github.com/jupyterlab/jupyterlab/pull/10155) ([@plan-do-break-fix](https://github.com/plan-do-break-fix))
- Update packaging commands in the extension tutorial [#10104](https://github.com/jupyterlab/jupyterlab/pull/10104) ([@jtpio](https://github.com/jtpio))
- Mention mamba as a means to install JupyterLab [#10093](https://github.com/jupyterlab/jupyterlab/pull/10093) ([@SylvainCorlay](https://github.com/SylvainCorlay))
- Fix changelog links for 3.0.13 [#10085](https://github.com/jupyterlab/jupyterlab/pull/10085) ([@blink1073](https://github.com/blink1073))
- Update changelog in master for 3.0.14 [#10082](https://github.com/jupyterlab/jupyterlab/pull/10082) ([@blink1073](https://github.com/blink1073))
- Fix typo in ui-components's README [#10062](https://github.com/jupyterlab/jupyterlab/pull/10062) ([@martinRenou](https://github.com/martinRenou))
- Fix changelog links [#10060](https://github.com/jupyterlab/jupyterlab/pull/10060) ([@blink1073](https://github.com/blink1073))
- Forward port changelog entries [#10058](https://github.com/jupyterlab/jupyterlab/pull/10058) ([@blink1073](https://github.com/blink1073))
- chore: update extension_tutorial [#10026](https://github.com/jupyterlab/jupyterlab/pull/10026) ([@0618](https://github.com/0618))
- Add Ability Use Source Directories in App Dir [#10024](https://github.com/jupyterlab/jupyterlab/pull/10024) ([@afshin](https://github.com/afshin))
- Use check-links-ignore to ignore pulls and issues [#10012](https://github.com/jupyterlab/jupyterlab/pull/10012) ([@afshin](https://github.com/afshin))
- Clarify where the overrides.json file should be in the docs [#9989](https://github.com/jupyterlab/jupyterlab/pull/9989) ([@jasongrout](https://github.com/jasongrout))
- Move Changelog to Standard Location [#9944](https://github.com/jupyterlab/jupyterlab/pull/9944) ([@afshin](https://github.com/afshin))
- Point the CI badges in the README to master branch [#9919](https://github.com/jupyterlab/jupyterlab/pull/9919) ([@blink1073](https://github.com/blink1073))
- Update changelog for 3.0.9 and 3.0.10 [#9917](https://github.com/jupyterlab/jupyterlab/pull/9917) ([@jasongrout](https://github.com/jasongrout))
- Update link to JupyterLab Demo Binder [#9872](https://github.com/jupyterlab/jupyterlab/pull/9872) ([@afshin](https://github.com/afshin))
- Add link to source extension list of metadata in prebuilt extensions [#9860](https://github.com/jupyterlab/jupyterlab/pull/9860) ([@bsyouness](https://github.com/bsyouness))
- fix release_test, squash all non-eslint CI warnings [#9854](https://github.com/jupyterlab/jupyterlab/pull/9854) ([@bollwyvl](https://github.com/bollwyvl))
- Convert Changelog to Markdown [#9846](https://github.com/jupyterlab/jupyterlab/pull/9846) ([@afshin](https://github.com/afshin))
- Update changelog for 3.0.8 [#9805](https://github.com/jupyterlab/jupyterlab/pull/9805) ([@blink1073](https://github.com/blink1073))
- Link to file with lab CSS variables [#9788](https://github.com/jupyterlab/jupyterlab/pull/9788) ([@yuvipanda](https://github.com/yuvipanda))
- Add "author_name" to cookiecutter [#9783](https://github.com/jupyterlab/jupyterlab/pull/9783) ([@janjagusch](https://github.com/janjagusch))
- Update extension_dev.rst [#9728](https://github.com/jupyterlab/jupyterlab/pull/9728) ([@stadlerb](https://github.com/stadlerb))
- Update changelog for 3.0.7 [#9722](https://github.com/jupyterlab/jupyterlab/pull/9722) ([@blink1073](https://github.com/blink1073))
- Remove outdated note on ipywidgets [#9707](https://github.com/jupyterlab/jupyterlab/pull/9707) ([@krassowski](https://github.com/krassowski))
- Update notebook toolbar example docs [#9705](https://github.com/jupyterlab/jupyterlab/pull/9705) ([@blink1073](https://github.com/blink1073))
- DOC: Make code block background less ugly [#9413](https://github.com/jupyterlab/jupyterlab/pull/9413) ([@mgeier](https://github.com/mgeier))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-01-28&to=2021-07-27&type=c))

[@0618](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3A0618+updated%3A2021-01-28..2021-07-27&type=Issues) | [@achandak123](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aachandak123+updated%3A2021-01-28..2021-07-27&type=Issues) | [@afonit](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aafonit+updated%3A2021-01-28..2021-07-27&type=Issues) | [@afshin](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aafshin+updated%3A2021-01-28..2021-07-27&type=Issues) | [@AgoCan](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AAgoCan+updated%3A2021-01-28..2021-07-27&type=Issues) | [@agoose77](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aagoose77+updated%3A2021-01-28..2021-07-27&type=Issues) | [@ainzzorl](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aainzzorl+updated%3A2021-01-28..2021-07-27&type=Issues) | [@aiqc](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aaiqc+updated%3A2021-01-28..2021-07-27&type=Issues) | [@ajbozarth](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aajbozarth+updated%3A2021-01-28..2021-07-27&type=Issues) | [@akx](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aakx+updated%3A2021-01-28..2021-07-27&type=Issues) | [@andrewfulton9](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aandrewfulton9+updated%3A2021-01-28..2021-07-27&type=Issues) | [@Ashish-15s](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AAshish-15s+updated%3A2021-01-28..2021-07-27&type=Issues) | [@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2021-01-28..2021-07-27&type=Issues) | [@bollwyvl](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Abollwyvl+updated%3A2021-01-28..2021-07-27&type=Issues) | [@bsyouness](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Absyouness+updated%3A2021-01-28..2021-07-27&type=Issues) | [@cameron-toy](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Acameron-toy+updated%3A2021-01-28..2021-07-27&type=Issues) | [@consideRatio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AconsideRatio+updated%3A2021-01-28..2021-07-27&type=Issues) | [@darcsoel](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adarcsoel+updated%3A2021-01-28..2021-07-27&type=Issues) | [@davidbrochart](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adavidbrochart+updated%3A2021-01-28..2021-07-27&type=Issues) | [@dge8](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adge8+updated%3A2021-01-28..2021-07-27&type=Issues) | [@dharmaquark](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adharmaquark+updated%3A2021-01-28..2021-07-27&type=Issues) | [@dhirschfeld](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adhirschfeld+updated%3A2021-01-28..2021-07-27&type=Issues) | [@DianeHu](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3ADianeHu+updated%3A2021-01-28..2021-07-27&type=Issues) | [@dmonad](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Admonad+updated%3A2021-01-28..2021-07-27&type=Issues) | [@echarles](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aecharles+updated%3A2021-01-28..2021-07-27&type=Issues) | [@ellisonbg](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aellisonbg+updated%3A2021-01-28..2021-07-27&type=Issues) | [@fasiha](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afasiha+updated%3A2021-01-28..2021-07-27&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2021-01-28..2021-07-27&type=Issues) | [@flying-sheep](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aflying-sheep+updated%3A2021-01-28..2021-07-27&type=Issues) | [@fperez](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afperez+updated%3A2021-01-28..2021-07-27&type=Issues) | [@gereleth](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agereleth+updated%3A2021-01-28..2021-07-27&type=Issues) | [@goanpeca](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agoanpeca+updated%3A2021-01-28..2021-07-27&type=Issues) | [@Guillaume-Garrigos](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AGuillaume-Garrigos+updated%3A2021-01-28..2021-07-27&type=Issues) | [@hbcarlos](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahbcarlos+updated%3A2021-01-28..2021-07-27&type=Issues) | [@ian-r-rose](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aian-r-rose+updated%3A2021-01-28..2021-07-27&type=Issues) | [@isabela-pf](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aisabela-pf+updated%3A2021-01-28..2021-07-27&type=Issues) | [@jahn96](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajahn96+updated%3A2021-01-28..2021-07-27&type=Issues) | [@janjagusch](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajanjagusch+updated%3A2021-01-28..2021-07-27&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2021-01-28..2021-07-27&type=Issues) | [@jayqi](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajayqi+updated%3A2021-01-28..2021-07-27&type=Issues) | [@jess-x](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajess-x+updated%3A2021-01-28..2021-07-27&type=Issues) | [@jhamet93](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajhamet93+updated%3A2021-01-28..2021-07-27&type=Issues) | [@jluttine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajluttine+updated%3A2021-01-28..2021-07-27&type=Issues) | [@jochym](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajochym+updated%3A2021-01-28..2021-07-27&type=Issues) | [@JohanMabille](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AJohanMabille+updated%3A2021-01-28..2021-07-27&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2021-01-28..2021-07-27&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2021-01-28..2021-07-27&type=Issues) | [@krassowska](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowska+updated%3A2021-01-28..2021-07-27&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2021-01-28..2021-07-27&type=Issues) | [@legendb317](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Alegendb317+updated%3A2021-01-28..2021-07-27&type=Issues) | [@loichuder](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aloichuder+updated%3A2021-01-28..2021-07-27&type=Issues) | [@maartenbreddels](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Amaartenbreddels+updated%3A2021-01-28..2021-07-27&type=Issues) | [@manavendrasen](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Amanavendrasen+updated%3A2021-01-28..2021-07-27&type=Issues) | [@manfromjupyter](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Amanfromjupyter+updated%3A2021-01-28..2021-07-27&type=Issues) | [@mariobuikhuizen](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Amariobuikhuizen+updated%3A2021-01-28..2021-07-27&type=Issues) | [@marthacryan](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Amarthacryan+updated%3A2021-01-28..2021-07-27&type=Issues) | [@martinRenou](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AmartinRenou+updated%3A2021-01-28..2021-07-27&type=Issues) | [@mbektas](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ambektas+updated%3A2021-01-28..2021-07-27&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2021-01-28..2021-07-27&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2021-01-28..2021-07-27&type=Issues) | [@mellesies](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Amellesies+updated%3A2021-01-28..2021-07-27&type=Issues) | [@mgeier](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Amgeier+updated%3A2021-01-28..2021-07-27&type=Issues) | [@mlucool](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Amlucool+updated%3A2021-01-28..2021-07-27&type=Issues) | [@mnowacki-b](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Amnowacki-b+updated%3A2021-01-28..2021-07-27&type=Issues) | [@mwakaba2](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Amwakaba2+updated%3A2021-01-28..2021-07-27&type=Issues) | [@NPetz](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3ANPetz+updated%3A2021-01-28..2021-07-27&type=Issues) | [@ognjenjevremovic](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aognjenjevremovic+updated%3A2021-01-28..2021-07-27&type=Issues) | [@ohrely](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aohrely+updated%3A2021-01-28..2021-07-27&type=Issues) | [@palewire](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Apalewire+updated%3A2021-01-28..2021-07-27&type=Issues) | [@paravatha](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aparavatha+updated%3A2021-01-28..2021-07-27&type=Issues) | [@partev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Apartev+updated%3A2021-01-28..2021-07-27&type=Issues) | [@plan-do-break-fix](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aplan-do-break-fix+updated%3A2021-01-28..2021-07-27&type=Issues) | [@robertpyke](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Arobertpyke+updated%3A2021-01-28..2021-07-27&type=Issues) | [@RodyLipson](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3ARodyLipson+updated%3A2021-01-28..2021-07-27&type=Issues) | [@sarahspak](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Asarahspak+updated%3A2021-01-28..2021-07-27&type=Issues) | [@saulshanabrook](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Asaulshanabrook+updated%3A2021-01-28..2021-07-27&type=Issues) | [@shngt](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ashngt+updated%3A2021-01-28..2021-07-27&type=Issues) | [@skyetim](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Askyetim+updated%3A2021-01-28..2021-07-27&type=Issues) | [@smacke](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Asmacke+updated%3A2021-01-28..2021-07-27&type=Issues) | [@stadlerb](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Astadlerb+updated%3A2021-01-28..2021-07-27&type=Issues) | [@SylvainCorlay](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3ASylvainCorlay+updated%3A2021-01-28..2021-07-27&type=Issues) | [@telamonian](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Atelamonian+updated%3A2021-01-28..2021-07-27&type=Issues) | [@tonyfast](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Atonyfast+updated%3A2021-01-28..2021-07-27&type=Issues) | [@trallard](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Atrallard+updated%3A2021-01-28..2021-07-27&type=Issues) | [@vidartf](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Avidartf+updated%3A2021-01-28..2021-07-27&type=Issues) | [@vkaidalov-rft](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Avkaidalov-rft+updated%3A2021-01-28..2021-07-27&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2021-01-28..2021-07-27&type=Issues) | [@yasmin-bb](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ayasmin-bb+updated%3A2021-01-28..2021-07-27&type=Issues) | [@yuvipanda](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ayuvipanda+updated%3A2021-01-28..2021-07-27&type=Issues)

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

- \[3.0.x\] Remove Dependency on Jupyter Packaging [#10218](https://github.com/jupyterlab/jupyterlab/pull/10218) ([@jtpio](https://github.com/jtpio))

### Documentation improvements

- \[3.0.x\] Fix changelong entries for 3.0.13 [#10087](https://github.com/jupyterlab/jupyterlab/pull/10087) ([@blink1073](https://github.com/blink1073))
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
- Require 'package' instead of 'package/' so webpack activates
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
- Remove @types/webpack (shipped with webpack 5)
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
- Port `jupyterlab/debugger` PR #527 to JupyterLab
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

- Resolve 'restarting' state on reconnect
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
- Require tornado>=6.1.0
  ([#9453](https://github.com/jupyterlab/jupyterlab/pull/9453))
- Pin to tornado>=6.1 on binder
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
- Update @types/react to ^17.0.0
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
- Changed the expression to "server unavailable or unreachable"
  instead of "server not running"
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
- Fix #9255
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
- Add a 2.x -> 3.x migration guide
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
- Rename the celltags plugin id to @jupyterlab/celltags
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
  a 'tokens.ts' file
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
- Followup #9100: made sdm switch pretty, accessible
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

- Move benchmarks to separate repo
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
- Urlext.join can't handle colon in relative paths
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
