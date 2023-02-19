<!-- The line below is MyST syntax for creating a reference to changelog -->

(changelog)=

# JupyterLab Changelog

## 4.0

<!-- <START NEW CHANGELOG ENTRY> -->

## 4.0.0a34

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v4.0.0a33...ba3913a982ef82665a448c2ffa0c06ca79e3412b))

### Enhancements made

- Update to ajv 8 and react-json-schema-form 5 [#13924](https://github.com/jupyterlab/jupyterlab/pull/13924) ([@bollwyvl](https://github.com/bollwyvl))
- Notify command explicitly [#13915](https://github.com/jupyterlab/jupyterlab/pull/13915) ([@fcollonval](https://github.com/fcollonval))
- Improve Galata [#13909](https://github.com/jupyterlab/jupyterlab/pull/13909) ([@fcollonval](https://github.com/fcollonval))
- Move RTC packages to an extension [#13907](https://github.com/jupyterlab/jupyterlab/pull/13907) ([@hbcarlos](https://github.com/hbcarlos))
- Caret operator in documentation [#13856](https://github.com/jupyterlab/jupyterlab/pull/13856) ([@JasonWeill](https://github.com/JasonWeill))
- Improve kernels pane in running sidebar [#13851](https://github.com/jupyterlab/jupyterlab/pull/13851) ([@afshin](https://github.com/afshin))
- Add languages to the command palette [#13815](https://github.com/jupyterlab/jupyterlab/pull/13815) ([@jtpio](https://github.com/jtpio))
- Expose `contentVisibility` widget hiding mode [#13652](https://github.com/jupyterlab/jupyterlab/pull/13652) ([@krassowski](https://github.com/krassowski))

### Bugs fixed

- Use node 18 for benchmark [#13982](https://github.com/jupyterlab/jupyterlab/pull/13982) ([@fcollonval](https://github.com/fcollonval))
- Dispose properly objects [#13960](https://github.com/jupyterlab/jupyterlab/pull/13960) ([@fcollonval](https://github.com/fcollonval))
- Fixes toolbar button for Restart Kernel and Run All [#13939](https://github.com/jupyterlab/jupyterlab/pull/13939) ([@JasonWeill](https://github.com/JasonWeill))
- Fix LSP adapter errors on tab close [#13918](https://github.com/jupyterlab/jupyterlab/pull/13918) ([@afshin](https://github.com/afshin))
- Define colour and background for filebrowser edit field [#13895](https://github.com/jupyterlab/jupyterlab/pull/13895) ([@krassowski](https://github.com/krassowski))
- Fix searching backwards in notebook [#13883](https://github.com/jupyterlab/jupyterlab/pull/13883) ([@krassowski](https://github.com/krassowski))
- Waits for panel reveal before measuring first cell for cell toolbar  [#13876](https://github.com/jupyterlab/jupyterlab/pull/13876) ([@JasonWeill](https://github.com/JasonWeill))
- Reset execution indicator state when kernel restarts [#13832](https://github.com/jupyterlab/jupyterlab/pull/13832) ([@krassowski](https://github.com/krassowski))

### Maintenance and upkeep improvements

- Increase galata update timeouts [#13985](https://github.com/jupyterlab/jupyterlab/pull/13985) ([@krassowski](https://github.com/krassowski))
- Use node 18 for benchmark [#13982](https://github.com/jupyterlab/jupyterlab/pull/13982) ([@fcollonval](https://github.com/fcollonval))
- Add back `@types/react` as a dependency of `@jupyterlab/apputils` [#13981](https://github.com/jupyterlab/jupyterlab/pull/13981) ([@jtpio](https://github.com/jtpio))
- Bump jupyterlab-language-pack-zh-cn from 3.5.post4 to 3.6.post0 [#13979](https://github.com/jupyterlab/jupyterlab/pull/13979) ([@dependabot](https://github.com/dependabot))
- Bump actions/cache from 2 to 3 [#13977](https://github.com/jupyterlab/jupyterlab/pull/13977) ([@dependabot](https://github.com/dependabot))
- Bump tj-actions/changed-files from 35.5.0 to 35.5.2 [#13976](https://github.com/jupyterlab/jupyterlab/pull/13976) ([@dependabot](https://github.com/dependabot))
- Relax memory-leak action [#13974](https://github.com/jupyterlab/jupyterlab/pull/13974) ([@fcollonval](https://github.com/fcollonval))
- Fix yarn.lock [#13963](https://github.com/jupyterlab/jupyterlab/pull/13963) ([@fcollonval](https://github.com/fcollonval))
- Remove rtc documentation [#13952](https://github.com/jupyterlab/jupyterlab/pull/13952) ([@hbcarlos](https://github.com/hbcarlos))
- Report benchmark status even in case of failure [#13950](https://github.com/jupyterlab/jupyterlab/pull/13950) ([@fcollonval](https://github.com/fcollonval))
- Remove vdom packages [#13949](https://github.com/jupyterlab/jupyterlab/pull/13949) ([@fcollonval](https://github.com/fcollonval))
- Import directly from jupyter_server [#13942](https://github.com/jupyterlab/jupyterlab/pull/13942) ([@fcollonval](https://github.com/fcollonval))
- Use Python 3.11 for js-debugger tests [#13941](https://github.com/jupyterlab/jupyterlab/pull/13941) ([@fcollonval](https://github.com/fcollonval))
- Update plugin name to `@jupyterlab/filebrowser-extension:default-file-browser` [#13936](https://github.com/jupyterlab/jupyterlab/pull/13936) ([@jtpio](https://github.com/jtpio))
- Bump ipython from 8.0.0 to 8.9.0 [#13935](https://github.com/jupyterlab/jupyterlab/pull/13935) ([@dependabot](https://github.com/dependabot))
- Bump black[jupyter] from 22.12.0 to 23.1.0 [#13934](https://github.com/jupyterlab/jupyterlab/pull/13934) ([@dependabot](https://github.com/dependabot))
- Bump ruff from 0.0.238 to 0.0.241 [#13933](https://github.com/jupyterlab/jupyterlab/pull/13933) ([@dependabot](https://github.com/dependabot))
- Bump tj-actions/changed-files from 35.4.4 to 35.5.0 [#13932](https://github.com/jupyterlab/jupyterlab/pull/13932) ([@dependabot](https://github.com/dependabot))
- Fix UI tests [#13931](https://github.com/jupyterlab/jupyterlab/pull/13931) ([@fcollonval](https://github.com/fcollonval))
- Bump http-cache-semantics from 4.1.0 to 4.1.1 [#13922](https://github.com/jupyterlab/jupyterlab/pull/13922) ([@dependabot](https://github.com/dependabot))
- Rename `@jupyterlab/completer-extension:tracker` to `@jupyterlab/completer-extension:manager` [#13910](https://github.com/jupyterlab/jupyterlab/pull/13910) ([@fcollonval](https://github.com/fcollonval))
- Improve Galata [#13909](https://github.com/jupyterlab/jupyterlab/pull/13909) ([@fcollonval](https://github.com/fcollonval))
- Lint fixes [#13905](https://github.com/jupyterlab/jupyterlab/pull/13905) ([@JasonWeill](https://github.com/JasonWeill))
- Switch to VEGALITE5_MIME_TYPE [#13893](https://github.com/jupyterlab/jupyterlab/pull/13893) ([@ChristopherDavisUCI](https://github.com/ChristopherDavisUCI))
- Bump altair from 4.2.0 to 4.2.2 [#13892](https://github.com/jupyterlab/jupyterlab/pull/13892) ([@dependabot](https://github.com/dependabot))
- Add more linting [#13882](https://github.com/jupyterlab/jupyterlab/pull/13882) ([@blink1073](https://github.com/blink1073))
- Bump lumino packages to `2.0.0-beta.0` [#13828](https://github.com/jupyterlab/jupyterlab/pull/13828) ([@krassowski](https://github.com/krassowski))
- Bump ipywidgets from 7.6.6 to 8.0.4 [#13820](https://github.com/jupyterlab/jupyterlab/pull/13820) ([@dependabot](https://github.com/dependabot))

### Documentation improvements

- Mention how to fix pixman, cairo missing library errors that occur while running tests in readthedocs [#13956](https://github.com/jupyterlab/jupyterlab/pull/13956) ([@andrii-i](https://github.com/andrii-i))
- Remove rtc documentation [#13952](https://github.com/jupyterlab/jupyterlab/pull/13952) ([@hbcarlos](https://github.com/hbcarlos))
- Remove vdom packages [#13949](https://github.com/jupyterlab/jupyterlab/pull/13949) ([@fcollonval](https://github.com/fcollonval))
- Fixes toolbar button for Restart Kernel and Run All [#13939](https://github.com/jupyterlab/jupyterlab/pull/13939) ([@JasonWeill](https://github.com/JasonWeill))
- Improve Galata [#13909](https://github.com/jupyterlab/jupyterlab/pull/13909) ([@fcollonval](https://github.com/fcollonval))
- Move RTC packages to an extension [#13907](https://github.com/jupyterlab/jupyterlab/pull/13907) ([@hbcarlos](https://github.com/hbcarlos))
- Fix minor typo in urls.rst [#13902](https://github.com/jupyterlab/jupyterlab/pull/13902) ([@chbrandt](https://github.com/chbrandt))
- Add more linting [#13882](https://github.com/jupyterlab/jupyterlab/pull/13882) ([@blink1073](https://github.com/blink1073))
- Update language-packs workflow [#13874](https://github.com/jupyterlab/jupyterlab/pull/13874) ([@fcollonval](https://github.com/fcollonval))
- Caret operator in documentation [#13856](https://github.com/jupyterlab/jupyterlab/pull/13856) ([@JasonWeill](https://github.com/JasonWeill))

### API and Breaking Changes

- Remove vdom packages [#13949](https://github.com/jupyterlab/jupyterlab/pull/13949) ([@fcollonval](https://github.com/fcollonval))
- Fix LSP adapter errors on tab close [#13918](https://github.com/jupyterlab/jupyterlab/pull/13918) ([@afshin](https://github.com/afshin))
- Switch to VEGALITE5_MIME_TYPE [#13893](https://github.com/jupyterlab/jupyterlab/pull/13893) ([@ChristopherDavisUCI](https://github.com/ChristopherDavisUCI))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2023-01-27&to=2023-02-14&type=c))

[@afshin](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aafshin+updated%3A2023-01-27..2023-02-14&type=Issues) | [@andrii-i](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aandrii-i+updated%3A2023-01-27..2023-02-14&type=Issues) | [@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2023-01-27..2023-02-14&type=Issues) | [@bollwyvl](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Abollwyvl+updated%3A2023-01-27..2023-02-14&type=Issues) | [@chbrandt](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Achbrandt+updated%3A2023-01-27..2023-02-14&type=Issues) | [@ChristopherDavisUCI](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AChristopherDavisUCI+updated%3A2023-01-27..2023-02-14&type=Issues) | [@dependabot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adependabot+updated%3A2023-01-27..2023-02-14&type=Issues) | [@domoritz](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adomoritz+updated%3A2023-01-27..2023-02-14&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2023-01-27..2023-02-14&type=Issues) | [@fperez](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afperez+updated%3A2023-01-27..2023-02-14&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2023-01-27..2023-02-14&type=Issues) | [@HaudinFlorence](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AHaudinFlorence+updated%3A2023-01-27..2023-02-14&type=Issues) | [@hbcarlos](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahbcarlos+updated%3A2023-01-27..2023-02-14&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2023-01-27..2023-02-14&type=Issues) | [@JasonWeill](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AJasonWeill+updated%3A2023-01-27..2023-02-14&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2023-01-27..2023-02-14&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2023-01-27..2023-02-14&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2023-01-27..2023-02-14&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2023-01-27..2023-02-14&type=Issues) | [@pre-commit-ci](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Apre-commit-ci+updated%3A2023-01-27..2023-02-14&type=Issues) | [@psychemedia](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Apsychemedia+updated%3A2023-01-27..2023-02-14&type=Issues) | [@trungleduc](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Atrungleduc+updated%3A2023-01-27..2023-02-14&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2023-01-27..2023-02-14&type=Issues)

<!-- <END NEW CHANGELOG ENTRY> -->

## 4.0.0a33

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v4.0.0a32...bd8ef2d398e0612aad334e4feafb853836b05a07))

### Enhancements made

- Improves translator API [#13834](https://github.com/jupyterlab/jupyterlab/pull/13834) ([@hbcarlos](https://github.com/hbcarlos))
- Rework sidebar styles to allow adoption of css `contain:strict` [#13831](https://github.com/jupyterlab/jupyterlab/pull/13831) ([@krassowski](https://github.com/krassowski))
- Improve form renderer registry [#13823](https://github.com/jupyterlab/jupyterlab/pull/13823) ([@fcollonval](https://github.com/fcollonval))
- Updates jupyter_ydoc, removes the docprovider and uses drives as providers [#13786](https://github.com/jupyterlab/jupyterlab/pull/13786) ([@hbcarlos](https://github.com/hbcarlos))
- Reduces the context of the form used in metadataform [#13781](https://github.com/jupyterlab/jupyterlab/pull/13781) ([@brichet](https://github.com/brichet))
- Add support for replace preserving case [#13778](https://github.com/jupyterlab/jupyterlab/pull/13778) ([@krassowski](https://github.com/krassowski))
- Add whole-word matching option in search bar [#13777](https://github.com/jupyterlab/jupyterlab/pull/13777) ([@krassowski](https://github.com/krassowski))
- Merge Component registries [#13769](https://github.com/jupyterlab/jupyterlab/pull/13769) ([@brichet](https://github.com/brichet))
- `default` locale will use OS default locale [#13721](https://github.com/jupyterlab/jupyterlab/pull/13721) ([@fcollonval](https://github.com/fcollonval))
- Upgrades Xterm to v. 5 [#13685](https://github.com/jupyterlab/jupyterlab/pull/13685) ([@JasonWeill](https://github.com/JasonWeill))
- Accessibility: role and aria-label [#13682](https://github.com/jupyterlab/jupyterlab/pull/13682) ([@brichet](https://github.com/brichet))
- Improve completer rendering performance [#13663](https://github.com/jupyterlab/jupyterlab/pull/13663) ([@krassowski](https://github.com/krassowski))
- Filtering breakpoints on exception in debugger [#13601](https://github.com/jupyterlab/jupyterlab/pull/13601) ([@brichet](https://github.com/brichet))

### Bugs fixed

- Fixes notebook's metadata in collaborative mode [#13868](https://github.com/jupyterlab/jupyterlab/pull/13868) ([@hbcarlos](https://github.com/hbcarlos))
- Use local paths instead of driveName:path in the shared model [#13866](https://github.com/jupyterlab/jupyterlab/pull/13866) ([@hbcarlos](https://github.com/hbcarlos))
- Updates jupyter_server_ydoc [#13854](https://github.com/jupyterlab/jupyterlab/pull/13854) ([@hbcarlos](https://github.com/hbcarlos))
- Fix undefined css variables [#13852](https://github.com/jupyterlab/jupyterlab/pull/13852) ([@HaudinFlorence](https://github.com/HaudinFlorence))
- Suppresses cell toolbar on collapsed input cells [#13847](https://github.com/jupyterlab/jupyterlab/pull/13847) ([@JasonWeill](https://github.com/JasonWeill))
- Removes nested A tag from extensionmanager code [#13845](https://github.com/jupyterlab/jupyterlab/pull/13845) ([@JasonWeill](https://github.com/JasonWeill))
- Fix starting search with selected text (if any) [#13802](https://github.com/jupyterlab/jupyterlab/pull/13802) ([@krassowski](https://github.com/krassowski))
- Updates to the kernel panel of the "running" sidebar [#13792](https://github.com/jupyterlab/jupyterlab/pull/13792) ([@afshin](https://github.com/afshin))
- Fix `preferred_dir` for examples [#13788](https://github.com/jupyterlab/jupyterlab/pull/13788) ([@fcollonval](https://github.com/fcollonval))
- Bump canvas to version with nodejs 18 binaries [#13783](https://github.com/jupyterlab/jupyterlab/pull/13783) ([@fcollonval](https://github.com/fcollonval))
- Explain why cell model may be missing in cell toolbar [#13763](https://github.com/jupyterlab/jupyterlab/pull/13763) ([@krassowski](https://github.com/krassowski))
- Fix handling of `settingEditorType` [#13761](https://github.com/jupyterlab/jupyterlab/pull/13761) ([@jtpio](https://github.com/jtpio))
- Updates jupyter_ydoc [#13735](https://github.com/jupyterlab/jupyterlab/pull/13735) ([@hbcarlos](https://github.com/hbcarlos))
- Wrap kernel message binary buffers in DataView [#13730](https://github.com/jupyterlab/jupyterlab/pull/13730) ([@davidbrochart](https://github.com/davidbrochart))
- Upgrades Python to 3.10, Node to 18 [#13722](https://github.com/jupyterlab/jupyterlab/pull/13722) ([@JasonWeill](https://github.com/JasonWeill))
- Faster rendering of the debugger tree [#13707](https://github.com/jupyterlab/jupyterlab/pull/13707) ([@krassowski](https://github.com/krassowski))
- Fix execution indicator in RTC mode [#13693](https://github.com/jupyterlab/jupyterlab/pull/13693) ([@trungleduc](https://github.com/trungleduc))
- Fix issue #13569: `source_hidden` not effective. [#13611](https://github.com/jupyterlab/jupyterlab/pull/13611) ([@yczhangsjtu](https://github.com/yczhangsjtu))

### Maintenance and upkeep improvements

- Update to Playwright 1.30 [#13871](https://github.com/jupyterlab/jupyterlab/pull/13871) ([@jtpio](https://github.com/jtpio))
- Update `jupyter_server_ydoc` as 0.6.2 is yanked [#13864](https://github.com/jupyterlab/jupyterlab/pull/13864) ([@fcollonval](https://github.com/fcollonval))
- Bump jupyterlab-language-pack-zh-cn from 3.2.post7 to 3.5.post4 [#13843](https://github.com/jupyterlab/jupyterlab/pull/13843) ([@dependabot](https://github.com/dependabot))
- Bump ruff from 0.0.226 to 0.0.230 [#13842](https://github.com/jupyterlab/jupyterlab/pull/13842) ([@dependabot](https://github.com/dependabot))
- Bump tj-actions/changed-files from 35.4.3 to 35.4.4 [#13840](https://github.com/jupyterlab/jupyterlab/pull/13840) ([@dependabot](https://github.com/dependabot))
- Bump matplotlib from 3.5.1 to 3.6.3 [#13821](https://github.com/jupyterlab/jupyterlab/pull/13821) ([@dependabot](https://github.com/dependabot))
- Bump ruff from 0.0.177 to 0.0.226 [#13819](https://github.com/jupyterlab/jupyterlab/pull/13819) ([@dependabot](https://github.com/dependabot))
- Bump scipy from 1.7.3 to 1.10.0 [#13818](https://github.com/jupyterlab/jupyterlab/pull/13818) ([@dependabot](https://github.com/dependabot))
- Bump pandas from 1.3.5 to 1.5.3 [#13817](https://github.com/jupyterlab/jupyterlab/pull/13817) ([@dependabot](https://github.com/dependabot))
- Bump tj-actions/changed-files from 35.4.1 to 35.4.3 [#13816](https://github.com/jupyterlab/jupyterlab/pull/13816) ([@dependabot](https://github.com/dependabot))
- Remove debug print in test [#13814](https://github.com/jupyterlab/jupyterlab/pull/13814) ([@fcollonval](https://github.com/fcollonval))
- Clean examples [#13812](https://github.com/jupyterlab/jupyterlab/pull/13812) ([@fcollonval](https://github.com/fcollonval))
- Dependabot alert on json5 [#13808](https://github.com/jupyterlab/jupyterlab/pull/13808) ([@fcollonval](https://github.com/fcollonval))
- Dependabot alert on jsonwebtoken [#13807](https://github.com/jupyterlab/jupyterlab/pull/13807) ([@fcollonval](https://github.com/fcollonval))
- Fix `preferred_dir` for examples [#13788](https://github.com/jupyterlab/jupyterlab/pull/13788) ([@fcollonval](https://github.com/fcollonval))
- Bump tj-actions/changed-files from 35.4.0 to 35.4.1 [#13785](https://github.com/jupyterlab/jupyterlab/pull/13785) ([@dependabot](https://github.com/dependabot))
- Bump canvas to version with nodejs 18 binaries [#13783](https://github.com/jupyterlab/jupyterlab/pull/13783) ([@fcollonval](https://github.com/fcollonval))
- Added config to link ts source maps [#13765](https://github.com/jupyterlab/jupyterlab/pull/13765) ([@3coins](https://github.com/3coins))
- Drop support for Python 3.7 [#13745](https://github.com/jupyterlab/jupyterlab/pull/13745) ([@jtpio](https://github.com/jtpio))
- Drop the dependency on `@jupyterlab/buildutils` in `@jupyterlab/builder` [#13741](https://github.com/jupyterlab/jupyterlab/pull/13741) ([@jtpio](https://github.com/jtpio))
- Bump toshimaru/auto-author-assign from 1.6.1 to 1.6.2 [#13738](https://github.com/jupyterlab/jupyterlab/pull/13738) ([@dependabot](https://github.com/dependabot))
- Bump tj-actions/changed-files from 35.2.1 to 35.4.0 [#13737](https://github.com/jupyterlab/jupyterlab/pull/13737) ([@dependabot](https://github.com/dependabot))
- Upgrades Python to 3.10, Node to 18 [#13722](https://github.com/jupyterlab/jupyterlab/pull/13722) ([@JasonWeill](https://github.com/JasonWeill))
- Require `jupyter_server>=2.0.1,<3` [#13718](https://github.com/jupyterlab/jupyterlab/pull/13718) ([@jtpio](https://github.com/jtpio))
- Remove empty button in the notebook toolbar [#13691](https://github.com/jupyterlab/jupyterlab/pull/13691) ([@trungleduc](https://github.com/trungleduc))
- Bump react 18 [#13607](https://github.com/jupyterlab/jupyterlab/pull/13607) ([@brichet](https://github.com/brichet))
- Adopt ruff and clean up pre-commit [#13562](https://github.com/jupyterlab/jupyterlab/pull/13562) ([@blink1073](https://github.com/blink1073))
- Drop the `moment` dependency [#13469](https://github.com/jupyterlab/jupyterlab/pull/13469) ([@jtpio](https://github.com/jtpio))

### Documentation improvements

- Bump ruff from 0.0.226 to 0.0.230 [#13842](https://github.com/jupyterlab/jupyterlab/pull/13842) ([@dependabot](https://github.com/dependabot))
- Improves translator API [#13834](https://github.com/jupyterlab/jupyterlab/pull/13834) ([@hbcarlos](https://github.com/hbcarlos))
- link nbclassic docs, note Lab 4 drop notebook dependency [#13830](https://github.com/jupyterlab/jupyterlab/pull/13830) ([@RRosio](https://github.com/RRosio))
- Improve form renderer registry [#13823](https://github.com/jupyterlab/jupyterlab/pull/13823) ([@fcollonval](https://github.com/fcollonval))
- Bump ruff from 0.0.177 to 0.0.226 [#13819](https://github.com/jupyterlab/jupyterlab/pull/13819) ([@dependabot](https://github.com/dependabot))
- Bug fixes/revisions for the Lab extension tutorial [#13813](https://github.com/jupyterlab/jupyterlab/pull/13813) ([@fcollonval](https://github.com/fcollonval))
- Updates jupyter_ydoc, removes the docprovider and uses drives as providers [#13786](https://github.com/jupyterlab/jupyterlab/pull/13786) ([@hbcarlos](https://github.com/hbcarlos))
- Merge Component registries [#13769](https://github.com/jupyterlab/jupyterlab/pull/13769) ([@brichet](https://github.com/brichet))
- Remove deprecated `window.jupyterlab` [#13767](https://github.com/jupyterlab/jupyterlab/pull/13767) ([@jtpio](https://github.com/jtpio))
- Minor improvements to update the tutorial [#13766](https://github.com/jupyterlab/jupyterlab/pull/13766) ([@fcollonval](https://github.com/fcollonval))
- Fix typo in release instructions [#13754](https://github.com/jupyterlab/jupyterlab/pull/13754) ([@jasongrout](https://github.com/jasongrout))
- Upgrades Python to 3.10, Node to 18 [#13722](https://github.com/jupyterlab/jupyterlab/pull/13722) ([@JasonWeill](https://github.com/JasonWeill))
- Upgrades Xterm to v. 5 [#13685](https://github.com/jupyterlab/jupyterlab/pull/13685) ([@JasonWeill](https://github.com/JasonWeill))
- Improve completer rendering performance [#13663](https://github.com/jupyterlab/jupyterlab/pull/13663) ([@krassowski](https://github.com/krassowski))
- Bump react 18 [#13607](https://github.com/jupyterlab/jupyterlab/pull/13607) ([@brichet](https://github.com/brichet))
- Adopt ruff and clean up pre-commit [#13562](https://github.com/jupyterlab/jupyterlab/pull/13562) ([@blink1073](https://github.com/blink1073))
- Drop the `moment` dependency [#13469](https://github.com/jupyterlab/jupyterlab/pull/13469) ([@jtpio](https://github.com/jtpio))

### API and Breaking Changes

- Improve form renderer registry [#13823](https://github.com/jupyterlab/jupyterlab/pull/13823) ([@fcollonval](https://github.com/fcollonval))
- Reduces the context of the form used in metadataform [#13781](https://github.com/jupyterlab/jupyterlab/pull/13781) ([@brichet](https://github.com/brichet))
- Merge Component registries [#13769](https://github.com/jupyterlab/jupyterlab/pull/13769) ([@brichet](https://github.com/brichet))
- Remove deprecated `window.jupyterlab` [#13767](https://github.com/jupyterlab/jupyterlab/pull/13767) ([@jtpio](https://github.com/jtpio))
- Upgrades Python to 3.10, Node to 18 [#13722](https://github.com/jupyterlab/jupyterlab/pull/13722) ([@JasonWeill](https://github.com/JasonWeill))
- Drop the `moment` dependency [#13469](https://github.com/jupyterlab/jupyterlab/pull/13469) ([@jtpio](https://github.com/jtpio))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2023-01-05&to=2023-01-27&type=c))

[@3coins](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3A3coins+updated%3A2023-01-05..2023-01-27&type=Issues) | [@afshin](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aafshin+updated%3A2023-01-05..2023-01-27&type=Issues) | [@andrii-i](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aandrii-i+updated%3A2023-01-05..2023-01-27&type=Issues) | [@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2023-01-05..2023-01-27&type=Issues) | [@bollwyvl](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Abollwyvl+updated%3A2023-01-05..2023-01-27&type=Issues) | [@brichet](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Abrichet+updated%3A2023-01-05..2023-01-27&type=Issues) | [@davidbrochart](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adavidbrochart+updated%3A2023-01-05..2023-01-27&type=Issues) | [@dependabot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adependabot+updated%3A2023-01-05..2023-01-27&type=Issues) | [@echarles](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aecharles+updated%3A2023-01-05..2023-01-27&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2023-01-05..2023-01-27&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2023-01-05..2023-01-27&type=Issues) | [@HaudinFlorence](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AHaudinFlorence+updated%3A2023-01-05..2023-01-27&type=Issues) | [@hbcarlos](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahbcarlos+updated%3A2023-01-05..2023-01-27&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2023-01-05..2023-01-27&type=Issues) | [@JasonWeill](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AJasonWeill+updated%3A2023-01-05..2023-01-27&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2023-01-05..2023-01-27&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2023-01-05..2023-01-27&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2023-01-05..2023-01-27&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2023-01-05..2023-01-27&type=Issues) | [@pre-commit-ci](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Apre-commit-ci+updated%3A2023-01-05..2023-01-27&type=Issues) | [@psychemedia](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Apsychemedia+updated%3A2023-01-05..2023-01-27&type=Issues) | [@RRosio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3ARRosio+updated%3A2023-01-05..2023-01-27&type=Issues) | [@SylvainCorlay](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3ASylvainCorlay+updated%3A2023-01-05..2023-01-27&type=Issues) | [@trungleduc](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Atrungleduc+updated%3A2023-01-05..2023-01-27&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2023-01-05..2023-01-27&type=Issues) | [@yczhangsjtu](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ayczhangsjtu+updated%3A2023-01-05..2023-01-27&type=Issues)

## 4.0.0a32

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v4.0.0a31...21edbd433af0e7da0791cc24d550eaca3bd14dee))

### New features added

- Debugger: copy value of variable to clipboard [#13670](https://github.com/jupyterlab/jupyterlab/pull/13670) ([@brichet](https://github.com/brichet))
- Add copy and paste commands to terminal context menu [#13535](https://github.com/jupyterlab/jupyterlab/pull/13535) ([@krassowski](https://github.com/krassowski))

### Enhancements made

- Remove not needed `Completer.IRenderer.sanitizer` [#13700](https://github.com/jupyterlab/jupyterlab/pull/13700) ([@fcollonval](https://github.com/fcollonval))
- Address some additional translation holes [#13696](https://github.com/jupyterlab/jupyterlab/pull/13696) ([@fcollonval](https://github.com/fcollonval))
- Contain the tabs within the tabbar (do not use translation transform) [#13671](https://github.com/jupyterlab/jupyterlab/pull/13671) ([@krassowski](https://github.com/krassowski))
- Turn terminal links into anchors using xterm addon [#13645](https://github.com/jupyterlab/jupyterlab/pull/13645) ([@mgcth](https://github.com/mgcth))
- Add an input dialog for multiple selection [#13621](https://github.com/jupyterlab/jupyterlab/pull/13621) ([@brichet](https://github.com/brichet))
- Drop typestyle [#13584](https://github.com/jupyterlab/jupyterlab/pull/13584) ([@fcollonval](https://github.com/fcollonval))
- Use more the contextual collaborative model attribute [#13564](https://github.com/jupyterlab/jupyterlab/pull/13564) ([@fcollonval](https://github.com/fcollonval))
- Add copy and paste commands to terminal context menu [#13535](https://github.com/jupyterlab/jupyterlab/pull/13535) ([@krassowski](https://github.com/krassowski))
- Set font families that were not specified. [#13533](https://github.com/jupyterlab/jupyterlab/pull/13533) ([@HaudinFlorence](https://github.com/HaudinFlorence))
- Sets whether the model is collaborative or not when registering its factory [#13526](https://github.com/jupyterlab/jupyterlab/pull/13526) ([@hbcarlos](https://github.com/hbcarlos))
- RTC: Move user name to user panel [#13517](https://github.com/jupyterlab/jupyterlab/pull/13517) ([@martinRenou](https://github.com/martinRenou))
- Sanitize notification message [#13510](https://github.com/jupyterlab/jupyterlab/pull/13510) ([@fcollonval](https://github.com/fcollonval))
- jupyter_server_ydoc>=0.6.0,\<0.7.0 [#13492](https://github.com/jupyterlab/jupyterlab/pull/13492) ([@davidbrochart](https://github.com/davidbrochart))
- Follow-on to events service [#13485](https://github.com/jupyterlab/jupyterlab/pull/13485) ([@afshin](https://github.com/afshin))
- Move the toggle file browser logic to the widget [#13466](https://github.com/jupyterlab/jupyterlab/pull/13466) ([@brichet](https://github.com/brichet))
- Check if `contentHeader` is not disposed before accessing widgets [#13453](https://github.com/jupyterlab/jupyterlab/pull/13453) ([@krassowski](https://github.com/krassowski))
- Allows to pause the execution during debug [#13433](https://github.com/jupyterlab/jupyterlab/pull/13433) ([@brichet](https://github.com/brichet))
- Add announcements [#13365](https://github.com/jupyterlab/jupyterlab/pull/13365) ([@fcollonval](https://github.com/fcollonval))
- Set font sizes with css variables [#13305](https://github.com/jupyterlab/jupyterlab/pull/13305) ([@HaudinFlorence](https://github.com/HaudinFlorence))
- Link the background colors and the ui font colors in the relevant css. [#13276](https://github.com/jupyterlab/jupyterlab/pull/13276) ([@HaudinFlorence](https://github.com/HaudinFlorence))
- Ask confirmation when closing a document [#13267](https://github.com/jupyterlab/jupyterlab/pull/13267) ([@alec-kr](https://github.com/alec-kr))
- Create a form to read and write the metadata of Notebook's cells [#13056](https://github.com/jupyterlab/jupyterlab/pull/13056) ([@brichet](https://github.com/brichet))
- Add events service [#12667](https://github.com/jupyterlab/jupyterlab/pull/12667) ([@afshin](https://github.com/afshin))

### Bugs fixed

- Fix CodeQL warning [#13712](https://github.com/jupyterlab/jupyterlab/pull/13712) ([@fcollonval](https://github.com/fcollonval))
- Update plugin ID of hub extension [#13688](https://github.com/jupyterlab/jupyterlab/pull/13688) ([@mctoohey](https://github.com/mctoohey))
- Fix contrast on the plugin list, add screenshots to catch regressions [#13661](https://github.com/jupyterlab/jupyterlab/pull/13661) ([@krassowski](https://github.com/krassowski))
- Fix `replaceSelection`, add unit test [#13657](https://github.com/jupyterlab/jupyterlab/pull/13657) ([@krassowski](https://github.com/krassowski))
- Fix `RunningTerminal` access before initialization [#13655](https://github.com/jupyterlab/jupyterlab/pull/13655) ([@krassowski](https://github.com/krassowski))
- Write the browser open files for test [#13634](https://github.com/jupyterlab/jupyterlab/pull/13634) ([@fcollonval](https://github.com/fcollonval))
- Fix select wrapping in inputDialog [#13622](https://github.com/jupyterlab/jupyterlab/pull/13622) ([@brichet](https://github.com/brichet))
- Does not prevent default behavior when shift-clicking [#13616](https://github.com/jupyterlab/jupyterlab/pull/13616) ([@jmk89](https://github.com/jmk89))
- Add the `scaleFactor` value from the embed options when creating the PNG representation for a Vega-based chart [#13610](https://github.com/jupyterlab/jupyterlab/pull/13610) ([@joaopalmeiro](https://github.com/joaopalmeiro))
- use jupyter_config_dir instead of config_path\[0\] for workspaces, settings [#13589](https://github.com/jupyterlab/jupyterlab/pull/13589) ([@minrk](https://github.com/minrk))
- Revert change to active menu bar item [#13576](https://github.com/jupyterlab/jupyterlab/pull/13576) ([@fcollonval](https://github.com/fcollonval))
- Restores the appearance of the settingeditor's input focus [#13554](https://github.com/jupyterlab/jupyterlab/pull/13554) ([@brichet](https://github.com/brichet))
- Fix a wrong argument when calling 'renderMimeVariable' [#13531](https://github.com/jupyterlab/jupyterlab/pull/13531) ([@brichet](https://github.com/brichet))
- Set corrections to icons and switch colors [#13500](https://github.com/jupyterlab/jupyterlab/pull/13500) ([@HaudinFlorence](https://github.com/HaudinFlorence))
- Default `IDocumentProviderFactory.IOptions` generic to ISharedDocument [#13490](https://github.com/jupyterlab/jupyterlab/pull/13490) ([@jtpio](https://github.com/jtpio))
- Use same key for saving user info in local store [#13482](https://github.com/jupyterlab/jupyterlab/pull/13482) ([@hbcarlos](https://github.com/hbcarlos))
- Fix syntax highlighting for JSON viewer in Jupyter Notebook [#13470](https://github.com/jupyterlab/jupyterlab/pull/13470) ([@kostyafarber](https://github.com/kostyafarber))
- Set fallback values for icons colors. [#13468](https://github.com/jupyterlab/jupyterlab/pull/13468) ([@HaudinFlorence](https://github.com/HaudinFlorence))
- enable document model specific collaboration [#13458](https://github.com/jupyterlab/jupyterlab/pull/13458) ([@dlqqq](https://github.com/dlqqq))
- Fix token based completions, restore deduplication, follow up on completer refactor [#13454](https://github.com/jupyterlab/jupyterlab/pull/13454) ([@krassowski](https://github.com/krassowski))
- Make focus visible (mostly CSS) [#13415](https://github.com/jupyterlab/jupyterlab/pull/13415) ([@gabalafou](https://github.com/gabalafou))

### Maintenance and upkeep improvements

- Fix environment activation on Gitpod [#13715](https://github.com/jupyterlab/jupyterlab/pull/13715) ([@jtpio](https://github.com/jtpio))
- Update copyright date to 2023 in the about dialog [#13708](https://github.com/jupyterlab/jupyterlab/pull/13708) ([@jtpio](https://github.com/jtpio))
- Updates documentation snapshots [#13706](https://github.com/jupyterlab/jupyterlab/pull/13706) ([@brichet](https://github.com/brichet))
- Use `DocumentWidgetOpenerMock` [#13703](https://github.com/jupyterlab/jupyterlab/pull/13703) ([@fcollonval](https://github.com/fcollonval))
- Bump tj-actions/changed-files from 35.1.0 to 35.2.1 [#13692](https://github.com/jupyterlab/jupyterlab/pull/13692) ([@dependabot](https://github.com/dependabot))
- Bump json5 from 2.2.1 to 2.2.2 [#13681](https://github.com/jupyterlab/jupyterlab/pull/13681) ([@dependabot](https://github.com/dependabot))
- Bump actions/stale from 6 to 7 [#13666](https://github.com/jupyterlab/jupyterlab/pull/13666) ([@dependabot](https://github.com/dependabot))
- Bump tj-actions/changed-files from 35.0.1 to 35.1.0 [#13665](https://github.com/jupyterlab/jupyterlab/pull/13665) ([@dependabot](https://github.com/dependabot))
- Remove empty license field in pyproject.toml [#13654](https://github.com/jupyterlab/jupyterlab/pull/13654) ([@jtpio](https://github.com/jtpio))
- Revert "Write the browser open files for test" [#13640](https://github.com/jupyterlab/jupyterlab/pull/13640) ([@fcollonval](https://github.com/fcollonval))
- Remove `skipLibCheck` in the `vega5-extension` package [#13630](https://github.com/jupyterlab/jupyterlab/pull/13630) ([@jtpio](https://github.com/jtpio))
- Update to lerna 6.2.0 [#13628](https://github.com/jupyterlab/jupyterlab/pull/13628) ([@jtpio](https://github.com/jtpio))
- Remove log file otherwise it is committed [#13627](https://github.com/jupyterlab/jupyterlab/pull/13627) ([@fcollonval](https://github.com/fcollonval))
- Use git command instead of GitHub action [#13625](https://github.com/jupyterlab/jupyterlab/pull/13625) ([@fcollonval](https://github.com/fcollonval))
- Bump tj-actions/changed-files from 34.5.3 to 35.0.1 [#13620](https://github.com/jupyterlab/jupyterlab/pull/13620) ([@dependabot](https://github.com/dependabot))
- Remove old completer API [#13615](https://github.com/jupyterlab/jupyterlab/pull/13615) ([@krassowski](https://github.com/krassowski))
- Update to Playwright 1.29 [#13612](https://github.com/jupyterlab/jupyterlab/pull/13612) ([@jtpio](https://github.com/jtpio))
- Remove old editor user caret widget (dead code) and selection style [#13586](https://github.com/jupyterlab/jupyterlab/pull/13586) ([@fcollonval](https://github.com/fcollonval))
- Drop typestyle [#13584](https://github.com/jupyterlab/jupyterlab/pull/13584) ([@fcollonval](https://github.com/fcollonval))
- Bump tj-actions/changed-files from 34.5.0 to 34.5.3 [#13574](https://github.com/jupyterlab/jupyterlab/pull/13574) ([@dependabot](https://github.com/dependabot))
- Bump dessant/lock-threads from 3 to 4 [#13540](https://github.com/jupyterlab/jupyterlab/pull/13540) ([@dependabot](https://github.com/dependabot))
- Bump tj-actions/changed-files from 34.3.0 to 34.5.0 [#13539](https://github.com/jupyterlab/jupyterlab/pull/13539) ([@dependabot](https://github.com/dependabot))
- Bump decode-uri-component from 0.2.0 to 0.2.2 [#13536](https://github.com/jupyterlab/jupyterlab/pull/13536) ([@dependabot](https://github.com/dependabot))
- Update `terser-webpack-plugin` [#13532](https://github.com/jupyterlab/jupyterlab/pull/13532) ([@jtpio](https://github.com/jtpio))
- Fix accessing owner/repo in CI [#13523](https://github.com/jupyterlab/jupyterlab/pull/13523) ([@fcollonval](https://github.com/fcollonval))
- Comment on the PR once the snapshots have been updated. [#13516](https://github.com/jupyterlab/jupyterlab/pull/13516) ([@fcollonval](https://github.com/fcollonval))
- Fix for pytest-jupyter 0.5.2+ [#13515](https://github.com/jupyterlab/jupyterlab/pull/13515) ([@fcollonval](https://github.com/fcollonval))
- Bump sanitize-html to 2.7.3 [#13509](https://github.com/jupyterlab/jupyterlab/pull/13509) ([@fcollonval](https://github.com/fcollonval))
- Fix Python test dependencies [#13508](https://github.com/jupyterlab/jupyterlab/pull/13508) ([@fcollonval](https://github.com/fcollonval))
- Depend on `@jupyter/ydoc` instead of `@jupyter-notebook/ydoc` [#13506](https://github.com/jupyterlab/jupyterlab/pull/13506) ([@jtpio](https://github.com/jtpio))
- Require jupyter-server-ydoc >=0.5.1 [#13478](https://github.com/jupyterlab/jupyterlab/pull/13478) ([@davidbrochart](https://github.com/davidbrochart))
- Test against Python 3.11 [#13474](https://github.com/jupyterlab/jupyterlab/pull/13474) ([@fcollonval](https://github.com/fcollonval))
- Force right sidebar size [#13447](https://github.com/jupyterlab/jupyterlab/pull/13447) ([@fcollonval](https://github.com/fcollonval))
- Use default URL in test mock-up [#13443](https://github.com/jupyterlab/jupyterlab/pull/13443) ([@fcollonval](https://github.com/fcollonval))
- Clean up and update dependencies [#13430](https://github.com/jupyterlab/jupyterlab/pull/13430) ([@fcollonval](https://github.com/fcollonval))
- Bump to Jest 29 [#12584](https://github.com/jupyterlab/jupyterlab/pull/12584) ([@fcollonval](https://github.com/fcollonval))
- Fix circular dependencies that pollutes version bump [#12495](https://github.com/jupyterlab/jupyterlab/pull/12495) ([@fcollonval](https://github.com/fcollonval))

### Documentation improvements

- Update notebook.rst [#13717](https://github.com/jupyterlab/jupyterlab/pull/13717) ([@gabalafou](https://github.com/gabalafou))
- Fix links in `CHANGELOG.md` [#13698](https://github.com/jupyterlab/jupyterlab/pull/13698) ([@jtpio](https://github.com/jtpio))
- update demo binder link to latest master [#13697](https://github.com/jupyterlab/jupyterlab/pull/13697) ([@akhmerov](https://github.com/akhmerov))
- Update API documentation links [#13695](https://github.com/jupyterlab/jupyterlab/pull/13695) ([@hsuanxyz](https://github.com/hsuanxyz))
- Update plugin ID of hub extension [#13688](https://github.com/jupyterlab/jupyterlab/pull/13688) ([@mctoohey](https://github.com/mctoohey))
- Add the `scaleFactor` value from the embed options when creating the PNG representation for a Vega-based chart [#13610](https://github.com/jupyterlab/jupyterlab/pull/13610) ([@joaopalmeiro](https://github.com/joaopalmeiro))
- Copy edit for privacy policy docs [#13594](https://github.com/jupyterlab/jupyterlab/pull/13594) ([@JasonWeill](https://github.com/JasonWeill))
- Remove old editor user caret widget (dead code) and selection style [#13586](https://github.com/jupyterlab/jupyterlab/pull/13586) ([@fcollonval](https://github.com/fcollonval))
- Drop typestyle [#13584](https://github.com/jupyterlab/jupyterlab/pull/13584) ([@fcollonval](https://github.com/fcollonval))
- Documentation RTC and user service [#13578](https://github.com/jupyterlab/jupyterlab/pull/13578) ([@hbcarlos](https://github.com/hbcarlos))
- Sanitize notification message [#13510](https://github.com/jupyterlab/jupyterlab/pull/13510) ([@fcollonval](https://github.com/fcollonval))
- Follow-on to events service [#13485](https://github.com/jupyterlab/jupyterlab/pull/13485) ([@afshin](https://github.com/afshin))
- Remove broken URL [#13445](https://github.com/jupyterlab/jupyterlab/pull/13445) ([@fcollonval](https://github.com/fcollonval))
- Use default URL in test mock-up [#13443](https://github.com/jupyterlab/jupyterlab/pull/13443) ([@fcollonval](https://github.com/fcollonval))
- Allows to pause the execution during debug [#13433](https://github.com/jupyterlab/jupyterlab/pull/13433) ([@brichet](https://github.com/brichet))
- Add announcements [#13365](https://github.com/jupyterlab/jupyterlab/pull/13365) ([@fcollonval](https://github.com/fcollonval))
- Fix circular dependencies that pollutes version bump [#12495](https://github.com/jupyterlab/jupyterlab/pull/12495) ([@fcollonval](https://github.com/fcollonval))

### API and Breaking Changes

- Remove not needed `Completer.IRenderer.sanitizer` [#13700](https://github.com/jupyterlab/jupyterlab/pull/13700) ([@fcollonval](https://github.com/fcollonval))
- Remove old completer API [#13615](https://github.com/jupyterlab/jupyterlab/pull/13615) ([@krassowski](https://github.com/krassowski))
- Remove old editor user caret widget (dead code) and selection style [#13586](https://github.com/jupyterlab/jupyterlab/pull/13586) ([@fcollonval](https://github.com/fcollonval))
- Move the toggle file browser logic to the widget [#13466](https://github.com/jupyterlab/jupyterlab/pull/13466) ([@brichet](https://github.com/brichet))
- enable document model specific collaboration [#13458](https://github.com/jupyterlab/jupyterlab/pull/13458) ([@dlqqq](https://github.com/dlqqq))
- Add events service [#12667](https://github.com/jupyterlab/jupyterlab/pull/12667) ([@afshin](https://github.com/afshin))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2022-11-18&to=2023-01-05&type=c))

[@afshin](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aafshin+updated%3A2022-11-18..2023-01-05&type=Issues) | [@akhmerov](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aakhmerov+updated%3A2022-11-18..2023-01-05&type=Issues) | [@alec-kr](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aalec-kr+updated%3A2022-11-18..2023-01-05&type=Issues) | [@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2022-11-18..2023-01-05&type=Issues) | [@bollwyvl](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Abollwyvl+updated%3A2022-11-18..2023-01-05&type=Issues) | [@brichet](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Abrichet+updated%3A2022-11-18..2023-01-05&type=Issues) | [@davidbrochart](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adavidbrochart+updated%3A2022-11-18..2023-01-05&type=Issues) | [@dependabot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adependabot+updated%3A2022-11-18..2023-01-05&type=Issues) | [@dlqqq](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adlqqq+updated%3A2022-11-18..2023-01-05&type=Issues) | [@echarles](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aecharles+updated%3A2022-11-18..2023-01-05&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2022-11-18..2023-01-05&type=Issues) | [@gabalafou](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agabalafou+updated%3A2022-11-18..2023-01-05&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2022-11-18..2023-01-05&type=Issues) | [@HaudinFlorence](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AHaudinFlorence+updated%3A2022-11-18..2023-01-05&type=Issues) | [@hbcarlos](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahbcarlos+updated%3A2022-11-18..2023-01-05&type=Issues) | [@hsuanxyz](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahsuanxyz+updated%3A2022-11-18..2023-01-05&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2022-11-18..2023-01-05&type=Issues) | [@JasonWeill](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AJasonWeill+updated%3A2022-11-18..2023-01-05&type=Issues) | [@jmk89](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajmk89+updated%3A2022-11-18..2023-01-05&type=Issues) | [@joaopalmeiro](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajoaopalmeiro+updated%3A2022-11-18..2023-01-05&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2022-11-18..2023-01-05&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2022-11-18..2023-01-05&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2022-11-18..2023-01-05&type=Issues) | [@kostyafarber](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akostyafarber+updated%3A2022-11-18..2023-01-05&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2022-11-18..2023-01-05&type=Issues) | [@martinRenou](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AmartinRenou+updated%3A2022-11-18..2023-01-05&type=Issues) | [@mctoohey](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Amctoohey+updated%3A2022-11-18..2023-01-05&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2022-11-18..2023-01-05&type=Issues) | [@mgcth](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Amgcth+updated%3A2022-11-18..2023-01-05&type=Issues) | [@minrk](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aminrk+updated%3A2022-11-18..2023-01-05&type=Issues) | [@pre-commit-ci](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Apre-commit-ci+updated%3A2022-11-18..2023-01-05&type=Issues) | [@vidartf](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Avidartf+updated%3A2022-11-18..2023-01-05&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2022-11-18..2023-01-05&type=Issues)

## 4.0.0a31

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v4.0.0a30...c33d6ef73933af0a701d018c24edf89f1651e3df))

### New features added

- Scroll to cell by ID based on hash fragment [#13285](https://github.com/jupyterlab/jupyterlab/pull/13285) ([@krassowski](https://github.com/krassowski))

### Enhancements made

- Fix propagating the sanitizer to the completer renderer [#13418](https://github.com/jupyterlab/jupyterlab/pull/13418) ([@fcollonval](https://github.com/fcollonval))
- Move configuration to jupyter-server-ydoc [#13413](https://github.com/jupyterlab/jupyterlab/pull/13413) ([@davidbrochart](https://github.com/davidbrochart))
- Added collaborative_document_save_delay trait [#13392](https://github.com/jupyterlab/jupyterlab/pull/13392) ([@davidbrochart](https://github.com/davidbrochart))
- Extract @jupyterlab/shared-models to @jupyter-notebook/ydoc [#13389](https://github.com/jupyterlab/jupyterlab/pull/13389) ([@fcollonval](https://github.com/fcollonval))
- Add a hover effect to plugin list entries [#13384](https://github.com/jupyterlab/jupyterlab/pull/13384) ([@krassowski](https://github.com/krassowski))
- Add user configuration for additional schemes for the sanitizer plugin [#13341](https://github.com/jupyterlab/jupyterlab/pull/13341) ([@kostyafarber](https://github.com/kostyafarber))
- Close search view on Escape [#13340](https://github.com/jupyterlab/jupyterlab/pull/13340) ([@krassowski](https://github.com/krassowski))
- Store document info in the state not in a separate context map out of the document interface. [#13317](https://github.com/jupyterlab/jupyterlab/pull/13317) ([@fcollonval](https://github.com/fcollonval))
- Reduce CI test flake due to kernel switching to busy [#13287](https://github.com/jupyterlab/jupyterlab/pull/13287) ([@krassowski](https://github.com/krassowski))
- Do not run galata in `.ipynb_checkpoints` [#13286](https://github.com/jupyterlab/jupyterlab/pull/13286) ([@krassowski](https://github.com/krassowski))
- Use settings icons for 6 plugins [#13284](https://github.com/jupyterlab/jupyterlab/pull/13284) ([@krassowski](https://github.com/krassowski))
- Define file or activity icons color as static [#13279](https://github.com/jupyterlab/jupyterlab/pull/13279) ([@HaudinFlorence](https://github.com/HaudinFlorence))
- Fix illegible white on yellow text of stacktrace in dark theme [#13249](https://github.com/jupyterlab/jupyterlab/pull/13249) ([@NikolayXHD](https://github.com/NikolayXHD))
- Drop modelDB from code editor [#13247](https://github.com/jupyterlab/jupyterlab/pull/13247) ([@fcollonval](https://github.com/fcollonval))
- Use file ID [#13246](https://github.com/jupyterlab/jupyterlab/pull/13246) ([@davidbrochart](https://github.com/davidbrochart))
- Store original path as returned from contents API in the `Contents.IModel` [#13216](https://github.com/jupyterlab/jupyterlab/pull/13216) ([@krassowski](https://github.com/krassowski))
- Optimize text mimerenderer: ansi vs autolink  [#13202](https://github.com/jupyterlab/jupyterlab/pull/13202) ([@vidartf](https://github.com/vidartf))
- Improve shared-models API [#13168](https://github.com/jupyterlab/jupyterlab/pull/13168) ([@fcollonval](https://github.com/fcollonval))
- Avoids restoring widget in dock panel when first loading in 'single-document' mode [#13037](https://github.com/jupyterlab/jupyterlab/pull/13037) ([@brichet](https://github.com/brichet))
- Add notification queue and display using toast [#12959](https://github.com/jupyterlab/jupyterlab/pull/12959) ([@telamonian](https://github.com/telamonian))
- User service [#12926](https://github.com/jupyterlab/jupyterlab/pull/12926) ([@hbcarlos](https://github.com/hbcarlos))

### Bugs fixed

- Fix `FileEditor.ready` [#13426](https://github.com/jupyterlab/jupyterlab/pull/13426) ([@krassowski](https://github.com/krassowski))
- Remove metadata entries [#13371](https://github.com/jupyterlab/jupyterlab/pull/13371) ([@hbcarlos](https://github.com/hbcarlos))
- Fix dirty propagation from shared model [#13368](https://github.com/jupyterlab/jupyterlab/pull/13368) ([@fcollonval](https://github.com/fcollonval))
- Correct `dirty` handling in notebook model [#13358](https://github.com/jupyterlab/jupyterlab/pull/13358) ([@fcollonval](https://github.com/fcollonval))
- Handle missing user service [#13353](https://github.com/jupyterlab/jupyterlab/pull/13353) ([@fcollonval](https://github.com/fcollonval))
- Avoids use of @deprecated to refer to a parameter [#13309](https://github.com/jupyterlab/jupyterlab/pull/13309) ([@JasonWeill](https://github.com/JasonWeill))
- Updates JSONEditor's source only when there is an active cell or an active notebook panel [#13308](https://github.com/jupyterlab/jupyterlab/pull/13308) ([@hbcarlos](https://github.com/hbcarlos))
- Fix border-radius does not follow css variable [#13289](https://github.com/jupyterlab/jupyterlab/pull/13289) ([@vthinkxie](https://github.com/vthinkxie))
- Fix notebook trust in RTC [#13273](https://github.com/jupyterlab/jupyterlab/pull/13273) ([@davidbrochart](https://github.com/davidbrochart))
- Set `isUntitled` to false on document path changes [#13268](https://github.com/jupyterlab/jupyterlab/pull/13268) ([@fcollonval](https://github.com/fcollonval))
- Don't dispose the notebook metadata editor on active cell change [#13259](https://github.com/jupyterlab/jupyterlab/pull/13259) ([@fcollonval](https://github.com/fcollonval))
- Remove some unused CSS styles and fix icon alignment in plugin list [#13255](https://github.com/jupyterlab/jupyterlab/pull/13255) ([@krassowski](https://github.com/krassowski))
- Do not show side panel scrollbar when not needed [#13253](https://github.com/jupyterlab/jupyterlab/pull/13253) ([@krassowski](https://github.com/krassowski))
- Added scroll to Running Panel [#13241](https://github.com/jupyterlab/jupyterlab/pull/13241) ([@kulsoomzahra](https://github.com/kulsoomzahra))
- Removes triggering an event when replacing pasted text [#13230](https://github.com/jupyterlab/jupyterlab/pull/13230) ([@hbcarlos](https://github.com/hbcarlos))
- Allow empty notebook [#13141](https://github.com/jupyterlab/jupyterlab/pull/13141) ([@hbcarlos](https://github.com/hbcarlos))
- Do not load CSS of disabled federated extensions [#11962](https://github.com/jupyterlab/jupyterlab/pull/11962) ([@jtpio](https://github.com/jtpio))

### Maintenance and upkeep improvements

- Require jupyter_server_ydoc >=0.4.0 [#13434](https://github.com/jupyterlab/jupyterlab/pull/13434) ([@davidbrochart](https://github.com/davidbrochart))
- Use more consistent naming for user service [#13428](https://github.com/jupyterlab/jupyterlab/pull/13428) ([@fcollonval](https://github.com/fcollonval))
- Remove shared-model from labeler [#13422](https://github.com/jupyterlab/jupyterlab/pull/13422) ([@fcollonval](https://github.com/fcollonval))
- tomllib is in stdlib in Python 3.11+ [#13399](https://github.com/jupyterlab/jupyterlab/pull/13399) ([@frenzymadness](https://github.com/frenzymadness))
- Bump loader-utils from 1.4.0 to 1.4.1 [#13396](https://github.com/jupyterlab/jupyterlab/pull/13396) ([@dependabot](https://github.com/dependabot))
- Bump tj-actions/changed-files from 34.0.2 to 34.3.0 [#13391](https://github.com/jupyterlab/jupyterlab/pull/13391) ([@dependabot](https://github.com/dependabot))
- Add jupyter-server-fileid [#13370](https://github.com/jupyterlab/jupyterlab/pull/13370) ([@fcollonval](https://github.com/fcollonval))
- Integrity check does not clean style import when emptied [#13367](https://github.com/jupyterlab/jupyterlab/pull/13367) ([@fcollonval](https://github.com/fcollonval))
- Bump tj-actions/changed-files from 33.0.0 to 34.0.2 [#13355](https://github.com/jupyterlab/jupyterlab/pull/13355) ([@dependabot](https://github.com/dependabot))
- Export return type of a public method [#13354](https://github.com/jupyterlab/jupyterlab/pull/13354) ([@fcollonval](https://github.com/fcollonval))
- Check a core path is actually a package [#13346](https://github.com/jupyterlab/jupyterlab/pull/13346) ([@fcollonval](https://github.com/fcollonval))
- Fix Binder for jupyter-server v2 [#13344](https://github.com/jupyterlab/jupyterlab/pull/13344) ([@fcollonval](https://github.com/fcollonval))
- Fix the examples with jupyter-server v2 [#13336](https://github.com/jupyterlab/jupyterlab/pull/13336) ([@fcollonval](https://github.com/fcollonval))
- Add mdformat plugins [#13335](https://github.com/jupyterlab/jupyterlab/pull/13335) ([@blink1073](https://github.com/blink1073))
- Removes empty requires list  [#13334](https://github.com/jupyterlab/jupyterlab/pull/13334) ([@hbcarlos](https://github.com/hbcarlos))
- Switch to releaser v2 [#13322](https://github.com/jupyterlab/jupyterlab/pull/13322) ([@blink1073](https://github.com/blink1073))
- Deprecate managing source extensions with `jupyter labextension` [#13321](https://github.com/jupyterlab/jupyterlab/pull/13321) ([@jtpio](https://github.com/jtpio))
- Reduce ILayoutRestorer API surface area [#13300](https://github.com/jupyterlab/jupyterlab/pull/13300) ([@afshin](https://github.com/afshin))
- Fix kernel snapshot in test documentation [#13295](https://github.com/jupyterlab/jupyterlab/pull/13295) ([@brichet](https://github.com/brichet))
- Bump tj-actions/changed-files from 32.1.2 to 33.0.0 [#13294](https://github.com/jupyterlab/jupyterlab/pull/13294) ([@dependabot](https://github.com/dependabot))
- Remove `generate_changelog.py` script [#13262](https://github.com/jupyterlab/jupyterlab/pull/13262) ([@jtpio](https://github.com/jtpio))
- Bump tj-actions/changed-files from 32.0.0 to 32.1.2 [#13260](https://github.com/jupyterlab/jupyterlab/pull/13260) ([@dependabot](https://github.com/dependabot))
- Check for unused file browser style rules in Galata [#13256](https://github.com/jupyterlab/jupyterlab/pull/13256) ([@krassowski](https://github.com/krassowski))
- Update to lerna 6 [#13251](https://github.com/jupyterlab/jupyterlab/pull/13251) ([@jtpio](https://github.com/jtpio))
- Fix documentation snapshot [#13244](https://github.com/jupyterlab/jupyterlab/pull/13244) ([@fcollonval](https://github.com/fcollonval))
- Enable RTC by default when starting JL in the Gitpod setup [#13239](https://github.com/jupyterlab/jupyterlab/pull/13239) ([@firai](https://github.com/firai))
- Bump memory-leak action [#13231](https://github.com/jupyterlab/jupyterlab/pull/13231) ([@fcollonval](https://github.com/fcollonval))
- Fix memory leaks [#13229](https://github.com/jupyterlab/jupyterlab/pull/13229) ([@fcollonval](https://github.com/fcollonval))

### Documentation improvements

- Update the tutorial to reflect the changes in the latest cookiecutter… [#13417](https://github.com/jupyterlab/jupyterlab/pull/13417) ([@frivas-at-navteca](https://github.com/frivas-at-navteca))
- Move configuration to jupyter-server-ydoc [#13413](https://github.com/jupyterlab/jupyterlab/pull/13413) ([@davidbrochart](https://github.com/davidbrochart))
- Suggest adding video preview in PR template [#13410](https://github.com/jupyterlab/jupyterlab/pull/13410) ([@andrii-i](https://github.com/andrii-i))
- Fix Binder for jupyter-server v2 [#13344](https://github.com/jupyterlab/jupyterlab/pull/13344) ([@fcollonval](https://github.com/fcollonval))
- Add mdformat plugins [#13335](https://github.com/jupyterlab/jupyterlab/pull/13335) ([@blink1073](https://github.com/blink1073))
- Remove duplicate changelog marker [#13325](https://github.com/jupyterlab/jupyterlab/pull/13325) ([@jtpio](https://github.com/jtpio))
- Switch to releaser v2 [#13322](https://github.com/jupyterlab/jupyterlab/pull/13322) ([@blink1073](https://github.com/blink1073))
- Backport 3.5.0 changelog on master [#13318](https://github.com/jupyterlab/jupyterlab/pull/13318) ([@fcollonval](https://github.com/fcollonval))
- Scroll to cell by ID based on hash fragment [#13285](https://github.com/jupyterlab/jupyterlab/pull/13285) ([@krassowski](https://github.com/krassowski))
- Correct starting docs: working directory path sample code [#13261](https://github.com/jupyterlab/jupyterlab/pull/13261) ([@hugetim](https://github.com/hugetim))
- Update README.md [#13257](https://github.com/jupyterlab/jupyterlab/pull/13257) ([@liliyao2022](https://github.com/liliyao2022))
- Improve documentation [#13232](https://github.com/jupyterlab/jupyterlab/pull/13232) ([@fcollonval](https://github.com/fcollonval))
- Add notification queue and display using toast [#12959](https://github.com/jupyterlab/jupyterlab/pull/12959) ([@telamonian](https://github.com/telamonian))
- Do not load CSS of disabled federated extensions [#11962](https://github.com/jupyterlab/jupyterlab/pull/11962) ([@jtpio](https://github.com/jtpio))

### API and Breaking Changes

- Store document info in the state not in a separate context map out of the document interface. [#13317](https://github.com/jupyterlab/jupyterlab/pull/13317) ([@fcollonval](https://github.com/fcollonval))
- Drop modelDB from code editor [#13247](https://github.com/jupyterlab/jupyterlab/pull/13247) ([@fcollonval](https://github.com/fcollonval))
- Improve shared-models API [#13168](https://github.com/jupyterlab/jupyterlab/pull/13168) ([@fcollonval](https://github.com/fcollonval))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2022-10-11&to=2022-11-18&type=c))

[@afshin](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aafshin+updated%3A2022-10-11..2022-11-18&type=Issues) | [@andrii-i](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aandrii-i+updated%3A2022-10-11..2022-11-18&type=Issues) | [@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2022-10-11..2022-11-18&type=Issues) | [@brichet](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Abrichet+updated%3A2022-10-11..2022-11-18&type=Issues) | [@davidbrochart](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adavidbrochart+updated%3A2022-10-11..2022-11-18&type=Issues) | [@dependabot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adependabot+updated%3A2022-10-11..2022-11-18&type=Issues) | [@ellisonbg](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aellisonbg+updated%3A2022-10-11..2022-11-18&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2022-10-11..2022-11-18&type=Issues) | [@firai](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afirai+updated%3A2022-10-11..2022-11-18&type=Issues) | [@frenzymadness](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afrenzymadness+updated%3A2022-10-11..2022-11-18&type=Issues) | [@frivas-at-navteca](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afrivas-at-navteca+updated%3A2022-10-11..2022-11-18&type=Issues) | [@HaudinFlorence](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AHaudinFlorence+updated%3A2022-10-11..2022-11-18&type=Issues) | [@hbcarlos](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahbcarlos+updated%3A2022-10-11..2022-11-18&type=Issues) | [@hugetim](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahugetim+updated%3A2022-10-11..2022-11-18&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2022-10-11..2022-11-18&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2022-10-11..2022-11-18&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2022-10-11..2022-11-18&type=Issues) | [@JasonWeill](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AJasonWeill+updated%3A2022-10-11..2022-11-18&type=Issues) | [@kostyafarber](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akostyafarber+updated%3A2022-10-11..2022-11-18&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2022-10-11..2022-11-18&type=Issues) | [@kulsoomzahra](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akulsoomzahra+updated%3A2022-10-11..2022-11-18&type=Issues) | [@liliyao2022](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aliliyao2022+updated%3A2022-10-11..2022-11-18&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2022-10-11..2022-11-18&type=Issues) | [@NikolayXHD](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3ANikolayXHD+updated%3A2022-10-11..2022-11-18&type=Issues) | [@pre-commit-ci](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Apre-commit-ci+updated%3A2022-10-11..2022-11-18&type=Issues) | [@SylvainCorlay](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3ASylvainCorlay+updated%3A2022-10-11..2022-11-18&type=Issues) | [@telamonian](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Atelamonian+updated%3A2022-10-11..2022-11-18&type=Issues) | [@vidartf](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Avidartf+updated%3A2022-10-11..2022-11-18&type=Issues) | [@vthinkxie](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Avthinkxie+updated%3A2022-10-11..2022-11-18&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2022-10-11..2022-11-18&type=Issues)

## 4.0.0a30

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v4.0.0a29...aeb646d7853eb1c4aa2033086a2c0e7cc6792841))

### Enhancements made

- Relax doc provider API [#13214](https://github.com/jupyterlab/jupyterlab/pull/13214) ([@fcollonval](https://github.com/fcollonval))
- Adjust CSS styles degrading performance in Chromium browsers [#13159](https://github.com/jupyterlab/jupyterlab/pull/13159) ([@krassowski](https://github.com/krassowski))
- Collapse debugger panel when disabling debugger [#13088](https://github.com/jupyterlab/jupyterlab/pull/13088) ([@yanmulin](https://github.com/yanmulin))
- LSP follow-up [#12899](https://github.com/jupyterlab/jupyterlab/pull/12899) ([@trungleduc](https://github.com/trungleduc))
- Split the Document Manager extension into multiple plugins [#12701](https://github.com/jupyterlab/jupyterlab/pull/12701) ([@jtpio](https://github.com/jtpio))

### Bugs fixed

- Fix cell deletion error message [#13201](https://github.com/jupyterlab/jupyterlab/pull/13201) ([@trungleduc](https://github.com/trungleduc))
- Use keystroke format consistent with menus [#13200](https://github.com/jupyterlab/jupyterlab/pull/13200) ([@fcollonval](https://github.com/fcollonval))
- Add a title to the RTC panel [#13196](https://github.com/jupyterlab/jupyterlab/pull/13196) ([@jtpio](https://github.com/jtpio))
- Fix removing out of view cells [#13194](https://github.com/jupyterlab/jupyterlab/pull/13194) ([@fcollonval](https://github.com/fcollonval))
- Fix JSON viewer syntax highlighting [#13183](https://github.com/jupyterlab/jupyterlab/pull/13183) ([@jtpio](https://github.com/jtpio))
- Always show tooltip in hover box even if edges are out of view [#13161](https://github.com/jupyterlab/jupyterlab/pull/13161) ([@krassowski](https://github.com/krassowski))
- Stop observing size disposed widget [#13137](https://github.com/jupyterlab/jupyterlab/pull/13137) ([@fcollonval](https://github.com/fcollonval))
- Fix workspace URL while cloning a workspace [#12794](https://github.com/jupyterlab/jupyterlab/pull/12794) ([@aditya211935](https://github.com/aditya211935))
- Split the Document Manager extension into multiple plugins [#12701](https://github.com/jupyterlab/jupyterlab/pull/12701) ([@jtpio](https://github.com/jtpio))

### Maintenance and upkeep improvements

- Update `pytest` and `pytest-check-links` dependencies [#13219](https://github.com/jupyterlab/jupyterlab/pull/13219) ([@jtpio](https://github.com/jtpio))
- Remove unused modelDBFactory [#13213](https://github.com/jupyterlab/jupyterlab/pull/13213) ([@fcollonval](https://github.com/fcollonval))
- Bump tj-actions/changed-files from 31.0.3 to 32.0.0 [#13212](https://github.com/jupyterlab/jupyterlab/pull/13212) ([@dependabot](https://github.com/dependabot))
- Fix typo in the "Test Minimum Version" CI step [#13210](https://github.com/jupyterlab/jupyterlab/pull/13210) ([@jtpio](https://github.com/jtpio))
- Update to Playwright 1.27 [#13205](https://github.com/jupyterlab/jupyterlab/pull/13205) ([@jtpio](https://github.com/jtpio))
- Try the GitHub Playwright reporter on CI [#13198](https://github.com/jupyterlab/jupyterlab/pull/13198) ([@jtpio](https://github.com/jtpio))
- Update RJSF to latest stable version [#13191](https://github.com/jupyterlab/jupyterlab/pull/13191) ([@brichet](https://github.com/brichet))
- Bump tj-actions/changed-files from 31.0.1 to 31.0.3 [#13171](https://github.com/jupyterlab/jupyterlab/pull/13171) ([@dependabot](https://github.com/dependabot))
- Remove `width: 100%` of `jp-WindowedPanel-inner` [#13157](https://github.com/jupyterlab/jupyterlab/pull/13157) ([@jtpio](https://github.com/jtpio))
- Remove `width: 100%` of `jp-WindowedPanel-window` [#13154](https://github.com/jupyterlab/jupyterlab/pull/13154) ([@jtpio](https://github.com/jtpio))
- Bump lerna [#13147](https://github.com/jupyterlab/jupyterlab/pull/13147) ([@fcollonval](https://github.com/fcollonval))

### Documentation improvements

- Update example documentation: `lab -> app` [#13223](https://github.com/jupyterlab/jupyterlab/pull/13223) ([@davidbrochart](https://github.com/davidbrochart))
- Relax doc provider API [#13214](https://github.com/jupyterlab/jupyterlab/pull/13214) ([@fcollonval](https://github.com/fcollonval))
- Remove unused modelDBFactory [#13213](https://github.com/jupyterlab/jupyterlab/pull/13213) ([@fcollonval](https://github.com/fcollonval))
- Update docs to `jupyter_server_config.py` [#13208](https://github.com/jupyterlab/jupyterlab/pull/13208) ([@jtpio](https://github.com/jtpio))
- Fix removing out of view cells [#13194](https://github.com/jupyterlab/jupyterlab/pull/13194) ([@fcollonval](https://github.com/fcollonval))
- Fix broken links in RELEASE.md file [#13193](https://github.com/jupyterlab/jupyterlab/pull/13193) ([@brichet](https://github.com/brichet))
- LSP follow-up [#12899](https://github.com/jupyterlab/jupyterlab/pull/12899) ([@trungleduc](https://github.com/trungleduc))
- Split the Document Manager extension into multiple plugins [#12701](https://github.com/jupyterlab/jupyterlab/pull/12701) ([@jtpio](https://github.com/jtpio))

### API and Breaking Changes

- Relax doc provider API [#13214](https://github.com/jupyterlab/jupyterlab/pull/13214) ([@fcollonval](https://github.com/fcollonval))
- Remove unused modelDBFactory [#13213](https://github.com/jupyterlab/jupyterlab/pull/13213) ([@fcollonval](https://github.com/fcollonval))
- Split the Document Manager extension into multiple plugins [#12701](https://github.com/jupyterlab/jupyterlab/pull/12701) ([@jtpio](https://github.com/jtpio))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2022-09-28&to=2022-10-11&type=c))

[@aditya211935](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aaditya211935+updated%3A2022-09-28..2022-10-11&type=Issues) | [@brichet](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Abrichet+updated%3A2022-09-28..2022-10-11&type=Issues) | [@Carreau](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3ACarreau+updated%3A2022-09-28..2022-10-11&type=Issues) | [@davidbrochart](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adavidbrochart+updated%3A2022-09-28..2022-10-11&type=Issues) | [@dependabot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adependabot+updated%3A2022-09-28..2022-10-11&type=Issues) | [@ellisonbg](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aellisonbg+updated%3A2022-09-28..2022-10-11&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2022-09-28..2022-10-11&type=Issues) | [@hbcarlos](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahbcarlos+updated%3A2022-09-28..2022-10-11&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2022-09-28..2022-10-11&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2022-09-28..2022-10-11&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2022-09-28..2022-10-11&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2022-09-28..2022-10-11&type=Issues) | [@pre-commit-ci](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Apre-commit-ci+updated%3A2022-09-28..2022-10-11&type=Issues) | [@SylvainCorlay](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3ASylvainCorlay+updated%3A2022-09-28..2022-10-11&type=Issues) | [@trungleduc](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Atrungleduc+updated%3A2022-09-28..2022-10-11&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2022-09-28..2022-10-11&type=Issues) | [@yanmulin](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ayanmulin+updated%3A2022-09-28..2022-10-11&type=Issues)

## 4.0.0a29

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v4.0.0a28...823a6ab396b4b1ef8795a67755c7f91aac52860a))

### Enhancements made

- Add a setter to TagWidget's parent [#13111](https://github.com/jupyterlab/jupyterlab/pull/13111) ([@brichet](https://github.com/brichet))
- Running panel - switch to SidePanel [#13074](https://github.com/jupyterlab/jupyterlab/pull/13074) ([@fcollonval](https://github.com/fcollonval))
- Raise ceiling on jupyter_server dependency to \< 3 [#13068](https://github.com/jupyterlab/jupyterlab/pull/13068) ([@Zsailer](https://github.com/Zsailer))
- Fix blurry icons in Launcher at 400% Zoom [#13057](https://github.com/jupyterlab/jupyterlab/pull/13057) ([@steff456](https://github.com/steff456))
- New extension manager [#12866](https://github.com/jupyterlab/jupyterlab/pull/12866) ([@fcollonval](https://github.com/fcollonval))
- Remove modeldb [#12695](https://github.com/jupyterlab/jupyterlab/pull/12695) ([@dmonad](https://github.com/dmonad))
- Windowed (Virtual) notebook [#12554](https://github.com/jupyterlab/jupyterlab/pull/12554) ([@fcollonval](https://github.com/fcollonval))

### Bugs fixed

- Resolve core_path before calling nodejs [#13126](https://github.com/jupyterlab/jupyterlab/pull/13126) ([@fcollonval](https://github.com/fcollonval))
- Pin jupyter_ydoc to 0.2 [#13124](https://github.com/jupyterlab/jupyterlab/pull/13124) ([@hbcarlos](https://github.com/hbcarlos))
- Avoid menus overflowing in small screens [#13109](https://github.com/jupyterlab/jupyterlab/pull/13109) ([@steff456](https://github.com/steff456))
- Fallback to local yarn version if jlpm does not exist [#13104](https://github.com/jupyterlab/jupyterlab/pull/13104) ([@fcollonval](https://github.com/fcollonval))
- Switch back to `display` to hide tabs [#13103](https://github.com/jupyterlab/jupyterlab/pull/13103) ([@fcollonval](https://github.com/fcollonval))
- Preserve kernel icon aspect ratio [#13090](https://github.com/jupyterlab/jupyterlab/pull/13090) ([@fcollonval](https://github.com/fcollonval))
- Added mimeType for .webp image files [#13066](https://github.com/jupyterlab/jupyterlab/pull/13066) ([@alec-kr](https://github.com/alec-kr))
- Fix cell toolbar layout [#13059](https://github.com/jupyterlab/jupyterlab/pull/13059) ([@kulsoomzahra](https://github.com/kulsoomzahra))
- Keep completer visible when anchor is horizontally scrolled out of view [#13046](https://github.com/jupyterlab/jupyterlab/pull/13046) ([@krassowski](https://github.com/krassowski))

### Maintenance and upkeep improvements

- Update to Playwright 1.26 [#13140](https://github.com/jupyterlab/jupyterlab/pull/13140) ([@jtpio](https://github.com/jtpio))
- Bump tj-actions/changed-files from 29.0.7 to 31.0.1 [#13130](https://github.com/jupyterlab/jupyterlab/pull/13130) ([@dependabot](https://github.com/dependabot))
- Bump actions/stale from 5 to 6 [#13129](https://github.com/jupyterlab/jupyterlab/pull/13129) ([@dependabot](https://github.com/dependabot))
- Remove xeus-python installation for debugger test [#13113](https://github.com/jupyterlab/jupyterlab/pull/13113) ([@fcollonval](https://github.com/fcollonval))
- Bump tj-actions/changed-files from 29.0.4 to 29.0.7 [#13106](https://github.com/jupyterlab/jupyterlab/pull/13106) ([@dependabot](https://github.com/dependabot))
- Revert "Pin hatch-jupyter-builder for now" [#13084](https://github.com/jupyterlab/jupyterlab/pull/13084) ([@fcollonval](https://github.com/fcollonval))
- Pin hatch-jupyter-builder for now [#13083](https://github.com/jupyterlab/jupyterlab/pull/13083) ([@fcollonval](https://github.com/fcollonval))
- Bump tj-actions/changed-files from 29.0.2 to 29.0.4 [#13079](https://github.com/jupyterlab/jupyterlab/pull/13079) ([@dependabot](https://github.com/dependabot))
- Remove dead code [#13077](https://github.com/jupyterlab/jupyterlab/pull/13077) ([@fcollonval](https://github.com/fcollonval))
- Remove noisy log message [#13073](https://github.com/jupyterlab/jupyterlab/pull/13073) ([@fcollonval](https://github.com/fcollonval))
- Bump to Lumino 2ᵅ⁶ [#13062](https://github.com/jupyterlab/jupyterlab/pull/13062) ([@afshin](https://github.com/afshin))
- Switch to `pull_request_target` to have write permission on forks [#13060](https://github.com/jupyterlab/jupyterlab/pull/13060) ([@fcollonval](https://github.com/fcollonval))
- Change compilation target from ES2017 to ES2018 [#13053](https://github.com/jupyterlab/jupyterlab/pull/13053) ([@afshin](https://github.com/afshin))

### Documentation improvements

- New extension manager [#12866](https://github.com/jupyterlab/jupyterlab/pull/12866) ([@fcollonval](https://github.com/fcollonval))
- Windowed (Virtual) notebook [#12554](https://github.com/jupyterlab/jupyterlab/pull/12554) ([@fcollonval](https://github.com/fcollonval))

### API and Breaking Changes

- New extension manager [#12866](https://github.com/jupyterlab/jupyterlab/pull/12866) ([@fcollonval](https://github.com/fcollonval))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2022-09-05&to=2022-09-28&type=c))

[@afshin](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aafshin+updated%3A2022-09-05..2022-09-28&type=Issues) | [@agoose77](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aagoose77+updated%3A2022-09-05..2022-09-28&type=Issues) | [@alec-kr](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aalec-kr+updated%3A2022-09-05..2022-09-28&type=Issues) | [@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2022-09-05..2022-09-28&type=Issues) | [@brichet](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Abrichet+updated%3A2022-09-05..2022-09-28&type=Issues) | [@davidbrochart](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adavidbrochart+updated%3A2022-09-05..2022-09-28&type=Issues) | [@dependabot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adependabot+updated%3A2022-09-05..2022-09-28&type=Issues) | [@dmonad](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Admonad+updated%3A2022-09-05..2022-09-28&type=Issues) | [@echarles](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aecharles+updated%3A2022-09-05..2022-09-28&type=Issues) | [@ellisonbg](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aellisonbg+updated%3A2022-09-05..2022-09-28&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2022-09-05..2022-09-28&type=Issues) | [@firai](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afirai+updated%3A2022-09-05..2022-09-28&type=Issues) | [@gabalafou](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agabalafou+updated%3A2022-09-05..2022-09-28&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2022-09-05..2022-09-28&type=Issues) | [@hbcarlos](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahbcarlos+updated%3A2022-09-05..2022-09-28&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2022-09-05..2022-09-28&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2022-09-05..2022-09-28&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2022-09-05..2022-09-28&type=Issues) | [@kulsoomzahra](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akulsoomzahra+updated%3A2022-09-05..2022-09-28&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2022-09-05..2022-09-28&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2022-09-05..2022-09-28&type=Issues) | [@pre-commit-ci](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Apre-commit-ci+updated%3A2022-09-05..2022-09-28&type=Issues) | [@steff456](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Asteff456+updated%3A2022-09-05..2022-09-28&type=Issues) | [@SylvainCorlay](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3ASylvainCorlay+updated%3A2022-09-05..2022-09-28&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2022-09-05..2022-09-28&type=Issues) | [@Zsailer](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AZsailer+updated%3A2022-09-05..2022-09-28&type=Issues)

## 4.0.0a28

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v4.0.0a27...3b83ceee09ce39ed3bf7de4e250135e5749cf3e4))

### Enhancements made

- Add a title to the debugger sidebar widget [#12987](https://github.com/jupyterlab/jupyterlab/pull/12987) ([@jtpio](https://github.com/jtpio))
- Support subprotocols in kernel restart [#12981](https://github.com/jupyterlab/jupyterlab/pull/12981) ([@davidbrochart](https://github.com/davidbrochart))
- Increase translation coverage [#12971](https://github.com/jupyterlab/jupyterlab/pull/12971) ([@fcollonval](https://github.com/fcollonval))
- Prompt for renaming at first manual save [#12953](https://github.com/jupyterlab/jupyterlab/pull/12953) ([@fcollonval](https://github.com/fcollonval))
- Add more ways to copy the currently opened file [#12870](https://github.com/jupyterlab/jupyterlab/pull/12870) ([@peytondmurray](https://github.com/peytondmurray))
- Add default shortcuts for moving cells [#9031](https://github.com/jupyterlab/jupyterlab/pull/9031) ([@KrishnaKumarHariprasannan](https://github.com/KrishnaKumarHariprasannan))

### Bugs fixed

- Reorder of webpackConfig merge [#13040](https://github.com/jupyterlab/jupyterlab/pull/13040) ([@matthewturk](https://github.com/matthewturk))
- Update Python icon to be PSF Trademark compliant [#13035](https://github.com/jupyterlab/jupyterlab/pull/13035) ([@ajbozarth](https://github.com/ajbozarth))
- Support stateStorage for API calls [#13015](https://github.com/jupyterlab/jupyterlab/pull/13015) ([@fcollonval](https://github.com/fcollonval))
- Conditional call to waitIsReady in reload [#13011](https://github.com/jupyterlab/jupyterlab/pull/13011) ([@fcollonval](https://github.com/fcollonval))
- update xterm.js dependency [#12974](https://github.com/jupyterlab/jupyterlab/pull/12974) ([@athornton](https://github.com/athornton))
- Add scrolling to `debugger` variable renderer [#12968](https://github.com/jupyterlab/jupyterlab/pull/12968) ([@firai](https://github.com/firai))
- Fix resizing and selection of debugger variable explorer grid [#12943](https://github.com/jupyterlab/jupyterlab/pull/12943) ([@firai](https://github.com/firai))
- Only show "Shut Down Kernel" if kernel is running [#12919](https://github.com/jupyterlab/jupyterlab/pull/12919) ([@krassowski](https://github.com/krassowski))

### Maintenance and upkeep improvements

- Fix GitHub script variable name [#13050](https://github.com/jupyterlab/jupyterlab/pull/13050) ([@fcollonval](https://github.com/fcollonval))
- REST API is under a namespace in github-script [#13043](https://github.com/jupyterlab/jupyterlab/pull/13043) ([@fcollonval](https://github.com/fcollonval))
- "Fix License Headers" CI check is failing [#13041](https://github.com/jupyterlab/jupyterlab/pull/13041) ([@fcollonval](https://github.com/fcollonval))
- Update the Gitpod setup to use `micromamba` to bootstrap the dev environment [#13030](https://github.com/jupyterlab/jupyterlab/pull/13030) ([@jtpio](https://github.com/jtpio))
- Drop node-fetch for galata helpers [#13029](https://github.com/jupyterlab/jupyterlab/pull/13029) ([@fcollonval](https://github.com/fcollonval))
- \[pre-commit.ci\] pre-commit autoupdate [#13026](https://github.com/jupyterlab/jupyterlab/pull/13026) ([@pre-commit-ci](https://github.com/pre-commit-ci))
- Fix lumino API documentation links [#13021](https://github.com/jupyterlab/jupyterlab/pull/13021) ([@fcollonval](https://github.com/fcollonval))
- Use `python-version` in the macos workflow [#13014](https://github.com/jupyterlab/jupyterlab/pull/13014) ([@jtpio](https://github.com/jtpio))
- Remove unneeded cm5 types in examples [#13010](https://github.com/jupyterlab/jupyterlab/pull/13010) ([@fcollonval](https://github.com/fcollonval))
- Update to Lumino 2 [#12992](https://github.com/jupyterlab/jupyterlab/pull/12992) ([@afshin](https://github.com/afshin))
- Bump tj-actions/changed-files from 24 to 28 [#12986](https://github.com/jupyterlab/jupyterlab/pull/12986) ([@dependabot](https://github.com/dependabot))
- Fix copy the reference data for final report [#12984](https://github.com/jupyterlab/jupyterlab/pull/12984) ([@fcollonval](https://github.com/fcollonval))
- Drop the pin on `jupyterlab_widgets` in the docs dependencies [#12979](https://github.com/jupyterlab/jupyterlab/pull/12979) ([@jtpio](https://github.com/jtpio))
- Add `(developer)` label to the developer facing commands [#12970](https://github.com/jupyterlab/jupyterlab/pull/12970) ([@jtpio](https://github.com/jtpio))
- Pin `jupyterlab_widgets==1.1.1` in `docs-screenshots` [#12967](https://github.com/jupyterlab/jupyterlab/pull/12967) ([@jtpio](https://github.com/jtpio))
- Update documentation welcome image [#12957](https://github.com/jupyterlab/jupyterlab/pull/12957) ([@fcollonval](https://github.com/fcollonval))
- Fix dependabot alerts for ejs and got [#12956](https://github.com/jupyterlab/jupyterlab/pull/12956) ([@fcollonval](https://github.com/fcollonval))
- Bump lerna to 5.x [#12950](https://github.com/jupyterlab/jupyterlab/pull/12950) ([@fcollonval](https://github.com/fcollonval))
- Bump yarn.js to 1.22.19 [#12949](https://github.com/jupyterlab/jupyterlab/pull/12949) ([@fcollonval](https://github.com/fcollonval))
- \[pre-commit.ci\] pre-commit autoupdate [#12923](https://github.com/jupyterlab/jupyterlab/pull/12923) ([@pre-commit-ci](https://github.com/pre-commit-ci))
- Bump toshimaru/auto-author-assign from 1.6.0 to 1.6.1 [#12922](https://github.com/jupyterlab/jupyterlab/pull/12922) ([@dependabot](https://github.com/dependabot))
- Bump tj-actions/changed-files from 28 to 29.0.2 [#13025](https://github.com/jupyterlab/jupyterlab/pull/13025) ([@dependabot](https://github.com/dependabot))

### Documentation improvements

- Drop node-fetch for galata helpers [#13029](https://github.com/jupyterlab/jupyterlab/pull/13029) ([@fcollonval](https://github.com/fcollonval))
- Fix lumino API documentation links [#13021](https://github.com/jupyterlab/jupyterlab/pull/13021) ([@fcollonval](https://github.com/fcollonval))
- Support stateStorage for API calls [#13015](https://github.com/jupyterlab/jupyterlab/pull/13015) ([@fcollonval](https://github.com/fcollonval))
- Fix customize expected reference [#13009](https://github.com/jupyterlab/jupyterlab/pull/13009) ([@fcollonval](https://github.com/fcollonval))
- Update to Lumino 2 [#12992](https://github.com/jupyterlab/jupyterlab/pull/12992) ([@afshin](https://github.com/afshin))
- Force using nbconvert v7 or higher for documentation [#12990](https://github.com/jupyterlab/jupyterlab/pull/12990) ([@fcollonval](https://github.com/fcollonval))
- Update to TypeScript 4.7 in the migration guide [#12985](https://github.com/jupyterlab/jupyterlab/pull/12985) ([@jtpio](https://github.com/jtpio))
- Prompt for renaming at first manual save [#12953](https://github.com/jupyterlab/jupyterlab/pull/12953) ([@fcollonval](https://github.com/fcollonval))
- #12717 Add a new section: automation of local dev environments [#12806](https://github.com/jupyterlab/jupyterlab/pull/12806) ([@markgreene74](https://github.com/markgreene74))

### API and Breaking Changes

- Drop node-fetch for galata helpers [#13029](https://github.com/jupyterlab/jupyterlab/pull/13029) ([@fcollonval](https://github.com/fcollonval))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2022-08-08&to=2022-09-05&type=c))

[@afshin](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aafshin+updated%3A2022-08-08..2022-09-05&type=Issues) | [@ajbozarth](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aajbozarth+updated%3A2022-08-08..2022-09-05&type=Issues) | [@athornton](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aathornton+updated%3A2022-08-08..2022-09-05&type=Issues) | [@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2022-08-08..2022-09-05&type=Issues) | [@davidbrochart](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adavidbrochart+updated%3A2022-08-08..2022-09-05&type=Issues) | [@dependabot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adependabot+updated%3A2022-08-08..2022-09-05&type=Issues) | [@ellisonbg](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aellisonbg+updated%3A2022-08-08..2022-09-05&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2022-08-08..2022-09-05&type=Issues) | [@firai](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afirai+updated%3A2022-08-08..2022-09-05&type=Issues) | [@goanpeca](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agoanpeca+updated%3A2022-08-08..2022-09-05&type=Issues) | [@ian-r-rose](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aian-r-rose+updated%3A2022-08-08..2022-09-05&type=Issues) | [@isabela-pf](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aisabela-pf+updated%3A2022-08-08..2022-09-05&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2022-08-08..2022-09-05&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2022-08-08..2022-09-05&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2022-08-08..2022-09-05&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2022-08-08..2022-09-05&type=Issues) | [@JasonWeill](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AJasonWeill+updated%3A2022-08-08..2022-09-05&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2022-08-08..2022-09-05&type=Issues) | [@KrishnaKumarHariprasannan](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AKrishnaKumarHariprasannan+updated%3A2022-08-08..2022-09-05&type=Issues) | [@malemburg](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Amalemburg+updated%3A2022-08-08..2022-09-05&type=Issues) | [@manfromjupyter](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Amanfromjupyter+updated%3A2022-08-08..2022-09-05&type=Issues) | [@markgreene74](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Amarkgreene74+updated%3A2022-08-08..2022-09-05&type=Issues) | [@matthewturk](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Amatthewturk+updated%3A2022-08-08..2022-09-05&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2022-08-08..2022-09-05&type=Issues) | [@mlucool](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Amlucool+updated%3A2022-08-08..2022-09-05&type=Issues) | [@peytondmurray](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Apeytondmurray+updated%3A2022-08-08..2022-09-05&type=Issues) | [@pre-commit-ci](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Apre-commit-ci+updated%3A2022-08-08..2022-09-05&type=Issues) | [@saulshanabrook](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Asaulshanabrook+updated%3A2022-08-08..2022-09-05&type=Issues) | [@telamonian](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Atelamonian+updated%3A2022-08-08..2022-09-05&type=Issues) | [@tgeorgeux](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Atgeorgeux+updated%3A2022-08-08..2022-09-05&type=Issues) | [@trallard](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Atrallard+updated%3A2022-08-08..2022-09-05&type=Issues) | [@VersBersh](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AVersBersh+updated%3A2022-08-08..2022-09-05&type=Issues) | [@vidartf](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Avidartf+updated%3A2022-08-08..2022-09-05&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2022-08-08..2022-09-05&type=Issues)

## 4.0.0a27

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v4.0.0a26...67900403c47675509a7f43f34ff37b57e9cb99c5))

### New features added

- Integrate `jupyterlab-lsp` into `jupyterlab` [#12534](https://github.com/jupyterlab/jupyterlab/pull/12534) ([@trungleduc](https://github.com/trungleduc))

### Enhancements made

- Set `Contents.ContentType` to string [#12875](https://github.com/jupyterlab/jupyterlab/pull/12875) ([@trungleduc](https://github.com/trungleduc))
- Add trustbydefault param to htmlviewer-extension [#12868](https://github.com/jupyterlab/jupyterlab/pull/12868) ([@oscar6echo](https://github.com/oscar6echo))
- Moved theme Map and added API to use it from other dependencies [#12861](https://github.com/jupyterlab/jupyterlab/pull/12861) ([@JohanMabille](https://github.com/JohanMabille))
- Removes info about meeting notes on Binder [#12847](https://github.com/jupyterlab/jupyterlab/pull/12847) ([@JasonWeill](https://github.com/JasonWeill))
- Add an option to enable "fast checks" of the jupyter lab build. [#12844](https://github.com/jupyterlab/jupyterlab/pull/12844) ([@thetorpedodog](https://github.com/thetorpedodog))
- Add .webp filetype in docRegistry. [#12839](https://github.com/jupyterlab/jupyterlab/pull/12839) ([@yangql176](https://github.com/yangql176))
- Adds version maintenance policy [#12829](https://github.com/jupyterlab/jupyterlab/pull/12829) ([@JasonWeill](https://github.com/JasonWeill))
- Debugger: Make kernel source list react based [#12751](https://github.com/jupyterlab/jupyterlab/pull/12751) ([@vidartf](https://github.com/vidartf))
- Optimize debugger editor `eachLine` loops [#12746](https://github.com/jupyterlab/jupyterlab/pull/12746) ([@vidartf](https://github.com/vidartf))
- Add resize handle for scrolled cell outputs [#12740](https://github.com/jupyterlab/jupyterlab/pull/12740) ([@peytondmurray](https://github.com/peytondmurray))
- Bump xtermjs to latest [#12715](https://github.com/jupyterlab/jupyterlab/pull/12715) ([@yuvipanda](https://github.com/yuvipanda))
- Edit Gitpod configuration to be able to work on the documentation [#12697](https://github.com/jupyterlab/jupyterlab/pull/12697) ([@jtpio](https://github.com/jtpio))
- remove reference to blueprint.js in css [#12663](https://github.com/jupyterlab/jupyterlab/pull/12663) ([@fcollonval](https://github.com/fcollonval))
- Integrate `jupyterlab-lsp` into `jupyterlab` [#12534](https://github.com/jupyterlab/jupyterlab/pull/12534) ([@trungleduc](https://github.com/trungleduc))
- RTC left panel [#12095](https://github.com/jupyterlab/jupyterlab/pull/12095) ([@martinRenou](https://github.com/martinRenou))
- Migrate to Codemirror 6 [#11638](https://github.com/jupyterlab/jupyterlab/pull/11638) ([@JohanMabille](https://github.com/JohanMabille))

### Bugs fixed

- Bump jupyter_server_ydoc>=0.1.9 [#12876](https://github.com/jupyterlab/jupyterlab/pull/12876) ([@davidbrochart](https://github.com/davidbrochart))
- Fix progress bar not working after uploading multiple files finished [#12871](https://github.com/jupyterlab/jupyterlab/pull/12871) ([@hsuanxyz](https://github.com/hsuanxyz))
- Fix kernel in the statusbar does not match the actual [#12865](https://github.com/jupyterlab/jupyterlab/pull/12865) ([@hsuanxyz](https://github.com/hsuanxyz))
- Store Y updates [#12852](https://github.com/jupyterlab/jupyterlab/pull/12852) ([@davidbrochart](https://github.com/davidbrochart))
- Fixes renaming files from title while using a custom drive [#12849](https://github.com/jupyterlab/jupyterlab/pull/12849) ([@hbcarlos](https://github.com/hbcarlos))
- Fix CI failures [#12843](https://github.com/jupyterlab/jupyterlab/pull/12843) ([@fcollonval](https://github.com/fcollonval))
- Adjust css to not leave trace of deleted widgets [#12838](https://github.com/jupyterlab/jupyterlab/pull/12838) ([@thomasaarholt](https://github.com/thomasaarholt))
- Remove drive prefix from the file path when creating the new path [#12824](https://github.com/jupyterlab/jupyterlab/pull/12824) ([@hbcarlos](https://github.com/hbcarlos))
- Use path to extract `tmpPath` [#12823](https://github.com/jupyterlab/jupyterlab/pull/12823) ([@fcollonval](https://github.com/fcollonval))
- Robuster UI tests [#12821](https://github.com/jupyterlab/jupyterlab/pull/12821) ([@fcollonval](https://github.com/fcollonval))
- update tab name after file rename [#12791](https://github.com/jupyterlab/jupyterlab/pull/12791) ([@RobbyPratl](https://github.com/RobbyPratl))
- Update base.css [#12783](https://github.com/jupyterlab/jupyterlab/pull/12783) ([@siddartha-10](https://github.com/siddartha-10))
- Updates ydoc [#12779](https://github.com/jupyterlab/jupyterlab/pull/12779) ([@hbcarlos](https://github.com/hbcarlos))
- Debugger: Fix CSS for variables inspecting [#12749](https://github.com/jupyterlab/jupyterlab/pull/12749) ([@martinRenou](https://github.com/martinRenou))
- Fix staging/yarn.lock registry [#12742](https://github.com/jupyterlab/jupyterlab/pull/12742) ([@vidartf](https://github.com/vidartf))
- Set focus when active cell changes only from mouse click [#12735](https://github.com/jupyterlab/jupyterlab/pull/12735) ([@fcollonval](https://github.com/fcollonval))
- Translate "Default: " and "Remove" in custom fields [#12732](https://github.com/jupyterlab/jupyterlab/pull/12732) ([@krassowski](https://github.com/krassowski))
- Fix cell toolbar overlap in side-by-side render mode [#12710](https://github.com/jupyterlab/jupyterlab/pull/12710) ([@peytondmurray](https://github.com/peytondmurray))

### Maintenance and upkeep improvements

- Remove @lumino/coreutils dependency from @jupyterlab/buildutils [#12910](https://github.com/jupyterlab/jupyterlab/pull/12910) ([@afshin](https://github.com/afshin))
- Log launcher error to console [#12909](https://github.com/jupyterlab/jupyterlab/pull/12909) ([@trungleduc](https://github.com/trungleduc))
- Add `dev_mode/style.js` to the licenser ignore list [#12902](https://github.com/jupyterlab/jupyterlab/pull/12902) ([@jtpio](https://github.com/jtpio))
- Add license header fix to git-blame-ignore [#12900](https://github.com/jupyterlab/jupyterlab/pull/12900) ([@fcollonval](https://github.com/fcollonval))
- \[pre-commit.ci\] pre-commit autoupdate [#12893](https://github.com/jupyterlab/jupyterlab/pull/12893) ([@pre-commit-ci](https://github.com/pre-commit-ci))
- Bump toshimaru/auto-author-assign from 1.5.1 to 1.6.0 [#12890](https://github.com/jupyterlab/jupyterlab/pull/12890) ([@dependabot](https://github.com/dependabot))
- Update `yjs-codemirror.next` [#12880](https://github.com/jupyterlab/jupyterlab/pull/12880) ([@jtpio](https://github.com/jtpio))
- Add license header fix job [#12872](https://github.com/jupyterlab/jupyterlab/pull/12872) ([@fcollonval](https://github.com/fcollonval))
- Bump toshimaru/auto-author-assign from 1.5.0 to 1.5.1 [#12854](https://github.com/jupyterlab/jupyterlab/pull/12854) ([@dependabot](https://github.com/dependabot))
- Bump tj-actions/changed-files from 23 to 24 [#12853](https://github.com/jupyterlab/jupyterlab/pull/12853) ([@dependabot](https://github.com/dependabot))
- Run `yarn-deduplicate` on `build:core` [#12850](https://github.com/jupyterlab/jupyterlab/pull/12850) ([@jtpio](https://github.com/jtpio))
- Update snapshots for challenger commit [#12820](https://github.com/jupyterlab/jupyterlab/pull/12820) ([@fcollonval](https://github.com/fcollonval))
- Bump terser from 4.8.0 to 4.8.1 [#12818](https://github.com/jupyterlab/jupyterlab/pull/12818) ([@dependabot](https://github.com/dependabot))
- \[pre-commit.ci\] pre-commit autoupdate [#12813](https://github.com/jupyterlab/jupyterlab/pull/12813) ([@pre-commit-ci](https://github.com/pre-commit-ci))
- Update `verdaccio`, start registry on `0.0.0.0` instead of `localhost` [#12799](https://github.com/jupyterlab/jupyterlab/pull/12799) ([@jtpio](https://github.com/jtpio))
- \[pre-commit.ci\] pre-commit autoupdate [#12796](https://github.com/jupyterlab/jupyterlab/pull/12796) ([@pre-commit-ci](https://github.com/pre-commit-ci))
- Run memory-leak tests on PR [#12789](https://github.com/jupyterlab/jupyterlab/pull/12789) ([@fcollonval](https://github.com/fcollonval))
- Use Vega SVG renderer to drop canvas dependency [#12785](https://github.com/jupyterlab/jupyterlab/pull/12785) ([@fcollonval](https://github.com/fcollonval))
- Bump moment from 2.29.2 to 2.29.4 [#12781](https://github.com/jupyterlab/jupyterlab/pull/12781) ([@dependabot](https://github.com/dependabot))
- Bump @lumino/widgets to 1.33.0 [#12777](https://github.com/jupyterlab/jupyterlab/pull/12777) ([@fcollonval](https://github.com/fcollonval))
- Removes lighthouse and markdown-loader-jest [#12776](https://github.com/jupyterlab/jupyterlab/pull/12776) ([@fcollonval](https://github.com/fcollonval))
- \[memory-leaks\] Fixes following cell addition analysis [#12774](https://github.com/jupyterlab/jupyterlab/pull/12774) ([@fcollonval](https://github.com/fcollonval))
- Bump parse-url from 6.0.0 to 6.0.2 [#12773](https://github.com/jupyterlab/jupyterlab/pull/12773) ([@dependabot](https://github.com/dependabot))
- Move YDocWebSocketHandler to jupyter-server [#12772](https://github.com/jupyterlab/jupyterlab/pull/12772) ([@davidbrochart](https://github.com/davidbrochart))
- \[pre-commit.ci\] pre-commit autoupdate [#12771](https://github.com/jupyterlab/jupyterlab/pull/12771) ([@pre-commit-ci](https://github.com/pre-commit-ci))
- Fix memory leaks [#12750](https://github.com/jupyterlab/jupyterlab/pull/12750) ([@fcollonval](https://github.com/fcollonval))
- Bump version of `marked` and `@types/marked` [#12747](https://github.com/jupyterlab/jupyterlab/pull/12747) ([@krassowski](https://github.com/krassowski))
- Bump shell-quote from 1.7.2 to 1.7.3 [#12744](https://github.com/jupyterlab/jupyterlab/pull/12744) ([@dependabot](https://github.com/dependabot))
- \[pre-commit.ci\] pre-commit autoupdate [#12741](https://github.com/jupyterlab/jupyterlab/pull/12741) ([@pre-commit-ci](https://github.com/pre-commit-ci))
- Remove unstubExtensionsSearch [#12738](https://github.com/jupyterlab/jupyterlab/pull/12738) ([@fcollonval](https://github.com/fcollonval))
- Bump actions/cache from 1 to 3 [#12722](https://github.com/jupyterlab/jupyterlab/pull/12722) ([@dependabot](https://github.com/dependabot))
- Bump actions/stale from 4 to 5 [#12721](https://github.com/jupyterlab/jupyterlab/pull/12721) ([@dependabot](https://github.com/dependabot))
- Bump actions/download-artifact from 2 to 3 [#12720](https://github.com/jupyterlab/jupyterlab/pull/12720) ([@dependabot](https://github.com/dependabot))
- stub extension search in UI test [#12714](https://github.com/jupyterlab/jupyterlab/pull/12714) ([@dlqqq](https://github.com/dlqqq))
- Update dev dependencies [#12698](https://github.com/jupyterlab/jupyterlab/pull/12698) ([@jtpio](https://github.com/jtpio))
- \[pre-commit.ci\] pre-commit autoupdate [#12694](https://github.com/jupyterlab/jupyterlab/pull/12694) ([@pre-commit-ci](https://github.com/pre-commit-ci))
- Bump actions/github-script from 3.1 to 6 [#12693](https://github.com/jupyterlab/jupyterlab/pull/12693) ([@dependabot](https://github.com/dependabot))
- Bump tj-actions/changed-files from 18.6 to 23 [#12692](https://github.com/jupyterlab/jupyterlab/pull/12692) ([@dependabot](https://github.com/dependabot))
- Bump actions/setup-python from 3 to 4 [#12691](https://github.com/jupyterlab/jupyterlab/pull/12691) ([@dependabot](https://github.com/dependabot))
- Bump pre-commit/action from 2.0.3 to 3.0.0 [#12690](https://github.com/jupyterlab/jupyterlab/pull/12690) ([@dependabot](https://github.com/dependabot))
- Bump actions/upload-artifact from 2 to 3 [#12689](https://github.com/jupyterlab/jupyterlab/pull/12689) ([@dependabot](https://github.com/dependabot))
- Update to TypeScript 4.7 [#12683](https://github.com/jupyterlab/jupyterlab/pull/12683) ([@jtpio](https://github.com/jtpio))
- Drop pre-commit from build dependencies [#12680](https://github.com/jupyterlab/jupyterlab/pull/12680) ([@fcollonval](https://github.com/fcollonval))
- default to system node version in precommit [#12679](https://github.com/jupyterlab/jupyterlab/pull/12679) ([@dlqqq](https://github.com/dlqqq))
- Switch to hatch backend [#12606](https://github.com/jupyterlab/jupyterlab/pull/12606) ([@blink1073](https://github.com/blink1073))

### Documentation improvements

- Split commands in two blocks in the contributing guide [#12898](https://github.com/jupyterlab/jupyterlab/pull/12898) ([@jtpio](https://github.com/jtpio))
- Document building JupyterLab on osx-arm64 platforms [#12882](https://github.com/jupyterlab/jupyterlab/pull/12882) ([@SylvainCorlay](https://github.com/SylvainCorlay))
- Add alt text to documentation [#12879](https://github.com/jupyterlab/jupyterlab/pull/12879) ([@isabela-pf](https://github.com/isabela-pf))
- Remove reference to unmaintained nb_conda_kernels [#12878](https://github.com/jupyterlab/jupyterlab/pull/12878) ([@SylvainCorlay](https://github.com/SylvainCorlay))
- Add license header fix job [#12872](https://github.com/jupyterlab/jupyterlab/pull/12872) ([@fcollonval](https://github.com/fcollonval))
- Don't suggest deprecated command [#12855](https://github.com/jupyterlab/jupyterlab/pull/12855) ([@ryanlovett](https://github.com/ryanlovett))
- Store Y updates [#12852](https://github.com/jupyterlab/jupyterlab/pull/12852) ([@davidbrochart](https://github.com/davidbrochart))
- Fixes renaming files from title while using a custom drive [#12849](https://github.com/jupyterlab/jupyterlab/pull/12849) ([@hbcarlos](https://github.com/hbcarlos))
- Removes info about meeting notes on Binder [#12847](https://github.com/jupyterlab/jupyterlab/pull/12847) ([@JasonWeill](https://github.com/JasonWeill))
- Adds version maintenance policy [#12829](https://github.com/jupyterlab/jupyterlab/pull/12829) ([@JasonWeill](https://github.com/JasonWeill))
- Use Vega SVG renderer to drop canvas dependency [#12785](https://github.com/jupyterlab/jupyterlab/pull/12785) ([@fcollonval](https://github.com/fcollonval))
- Removes lighthouse and markdown-loader-jest [#12776](https://github.com/jupyterlab/jupyterlab/pull/12776) ([@fcollonval](https://github.com/fcollonval))
- Explicitly set language to `en` in `conf.py` [#12707](https://github.com/jupyterlab/jupyterlab/pull/12707) ([@jtpio](https://github.com/jtpio))
- Switch to hatch backend [#12606](https://github.com/jupyterlab/jupyterlab/pull/12606) ([@blink1073](https://github.com/blink1073))
- RTC left panel [#12095](https://github.com/jupyterlab/jupyterlab/pull/12095) ([@martinRenou](https://github.com/martinRenou))

### API and Breaking Changes

- Fixes renaming files from title while using a custom drive [#12849](https://github.com/jupyterlab/jupyterlab/pull/12849) ([@hbcarlos](https://github.com/hbcarlos))
- RTC left panel [#12095](https://github.com/jupyterlab/jupyterlab/pull/12095) ([@martinRenou](https://github.com/martinRenou))
- Migrate to Codemirror 6 [#11638](https://github.com/jupyterlab/jupyterlab/pull/11638) ([@JohanMabille](https://github.com/JohanMabille))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2022-06-09&to=2022-08-08&type=c))

[@afshin](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aafshin+updated%3A2022-06-09..2022-08-08&type=Issues) | [@agoose77](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aagoose77+updated%3A2022-06-09..2022-08-08&type=Issues) | [@aiqc](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aaiqc+updated%3A2022-06-09..2022-08-08&type=Issues) | [@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2022-06-09..2022-08-08&type=Issues) | [@davidbrochart](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adavidbrochart+updated%3A2022-06-09..2022-08-08&type=Issues) | [@dependabot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adependabot+updated%3A2022-06-09..2022-08-08&type=Issues) | [@dlqqq](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adlqqq+updated%3A2022-06-09..2022-08-08&type=Issues) | [@dmonad](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Admonad+updated%3A2022-06-09..2022-08-08&type=Issues) | [@echarles](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aecharles+updated%3A2022-06-09..2022-08-08&type=Issues) | [@ellisonbg](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aellisonbg+updated%3A2022-06-09..2022-08-08&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2022-06-09..2022-08-08&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2022-06-09..2022-08-08&type=Issues) | [@goanpeca](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agoanpeca+updated%3A2022-06-09..2022-08-08&type=Issues) | [@hbcarlos](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahbcarlos+updated%3A2022-06-09..2022-08-08&type=Issues) | [@hsuanxyz](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahsuanxyz+updated%3A2022-06-09..2022-08-08&type=Issues) | [@isabela-pf](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aisabela-pf+updated%3A2022-06-09..2022-08-08&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2022-06-09..2022-08-08&type=Issues) | [@JohanMabille](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AJohanMabille+updated%3A2022-06-09..2022-08-08&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2022-06-09..2022-08-08&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2022-06-09..2022-08-08&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2022-06-09..2022-08-08&type=Issues) | [@JasonWeill](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AJasonWeill+updated%3A2022-06-09..2022-08-08&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2022-06-09..2022-08-08&type=Issues) | [@martinRenou](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AmartinRenou+updated%3A2022-06-09..2022-08-08&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2022-06-09..2022-08-08&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2022-06-09..2022-08-08&type=Issues) | [@oscar6echo](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aoscar6echo+updated%3A2022-06-09..2022-08-08&type=Issues) | [@peytondmurray](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Apeytondmurray+updated%3A2022-06-09..2022-08-08&type=Issues) | [@pre-commit-ci](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Apre-commit-ci+updated%3A2022-06-09..2022-08-08&type=Issues) | [@RobbyPratl](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3ARobbyPratl+updated%3A2022-06-09..2022-08-08&type=Issues) | [@siddartha-10](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Asiddartha-10+updated%3A2022-06-09..2022-08-08&type=Issues) | [@SylvainCorlay](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3ASylvainCorlay+updated%3A2022-06-09..2022-08-08&type=Issues) | [@thetorpedodog](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Athetorpedodog+updated%3A2022-06-09..2022-08-08&type=Issues) | [@thomasaarholt](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Athomasaarholt+updated%3A2022-06-09..2022-08-08&type=Issues) | [@trungleduc](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Atrungleduc+updated%3A2022-06-09..2022-08-08&type=Issues) | [@vidartf](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Avidartf+updated%3A2022-06-09..2022-08-08&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2022-06-09..2022-08-08&type=Issues) | [@williamstein](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awilliamstein+updated%3A2022-06-09..2022-08-08&type=Issues) | [@yangql176](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ayangql176+updated%3A2022-06-09..2022-08-08&type=Issues) | [@yuvipanda](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ayuvipanda+updated%3A2022-06-09..2022-08-08&type=Issues)

## 4.0.0a26

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v4.0.0a25...09d12a0bbfdcecbfeb410a434c7111af88547c69))

### New features added

- Persistent side-by-side ratio setting [#12633](https://github.com/jupyterlab/jupyterlab/pull/12633) ([@echarles](https://github.com/echarles))

### Enhancements made

- Make password inputs not give away how many characters were typed [#12659](https://github.com/jupyterlab/jupyterlab/pull/12659) ([@jasongrout](https://github.com/jasongrout))
- Persistent side-by-side ratio setting [#12633](https://github.com/jupyterlab/jupyterlab/pull/12633) ([@echarles](https://github.com/echarles))
- add "close all tabs" context action [#12620](https://github.com/jupyterlab/jupyterlab/pull/12620) ([@rursprung](https://github.com/rursprung))
- Fix the side-by-side cell resize handle [#12609](https://github.com/jupyterlab/jupyterlab/pull/12609) ([@echarles](https://github.com/echarles))
- Invert relationship between launcher and filebrowser [#12585](https://github.com/jupyterlab/jupyterlab/pull/12585) ([@fcollonval](https://github.com/fcollonval))

### Bugs fixed

- Remove ipywidgets message count in the execution indicator model [#12665](https://github.com/jupyterlab/jupyterlab/pull/12665) ([@trungleduc](https://github.com/trungleduc))
- Fix arrow position on unrendered markdown cell [#12650](https://github.com/jupyterlab/jupyterlab/pull/12650) ([@fcollonval](https://github.com/fcollonval))
- Fix kernel protocol serialization [#12619](https://github.com/jupyterlab/jupyterlab/pull/12619) ([@davidbrochart](https://github.com/davidbrochart))
- Break loop activeCell -> activeHeading [#12612](https://github.com/jupyterlab/jupyterlab/pull/12612) ([@fcollonval](https://github.com/fcollonval))
- Pin exactly jupyter_ydoc [#12602](https://github.com/jupyterlab/jupyterlab/pull/12602) ([@davidbrochart](https://github.com/davidbrochart))
- Always check local packages against abspath [#10662](https://github.com/jupyterlab/jupyterlab/pull/10662) ([@mlucool](https://github.com/mlucool))

### Maintenance and upkeep improvements

- \[pre-commit.ci\] pre-commit autoupdate [#12658](https://github.com/jupyterlab/jupyterlab/pull/12658) ([@pre-commit-ci](https://github.com/pre-commit-ci))
- Remove scripts linked to test [#12654](https://github.com/jupyterlab/jupyterlab/pull/12654) ([@fcollonval](https://github.com/fcollonval))
- Update codeql action from v1 to v2 [#12645](https://github.com/jupyterlab/jupyterlab/pull/12645) ([@fcollonval](https://github.com/fcollonval))
- Update snapshot for the extension manager [#12643](https://github.com/jupyterlab/jupyterlab/pull/12643) ([@jtpio](https://github.com/jtpio))
- Bump actions/setup-python from 2 to 3 [#12642](https://github.com/jupyterlab/jupyterlab/pull/12642) ([@dependabot](https://github.com/dependabot))
- Bump actions/checkout from 2 to 3 [#12641](https://github.com/jupyterlab/jupyterlab/pull/12641) ([@dependabot](https://github.com/dependabot))
- Bump toshimaru/auto-author-assign from 1.3.4 to 1.5.0 [#12640](https://github.com/jupyterlab/jupyterlab/pull/12640) ([@dependabot](https://github.com/dependabot))
- Bump dessant/lock-threads from 2 to 3 [#12639](https://github.com/jupyterlab/jupyterlab/pull/12639) ([@dependabot](https://github.com/dependabot))
- Bump actions/setup-node from 2 to 3 [#12638](https://github.com/jupyterlab/jupyterlab/pull/12638) ([@dependabot](https://github.com/dependabot))
- Bump pre-commit/action from 2.0.0 to 2.0.3 [#12637](https://github.com/jupyterlab/jupyterlab/pull/12637) ([@dependabot](https://github.com/dependabot))
- Add bot to update github actions and remove codeql temporary fix [#12634](https://github.com/jupyterlab/jupyterlab/pull/12634) ([@fcollonval](https://github.com/fcollonval))
- \[pre-commit.ci\] pre-commit autoupdate [#12626](https://github.com/jupyterlab/jupyterlab/pull/12626) ([@pre-commit-ci](https://github.com/pre-commit-ci))
- Remove unneeded build:all and test config [#12618](https://github.com/jupyterlab/jupyterlab/pull/12618) ([@fcollonval](https://github.com/fcollonval))
- Fix `documentsearch-extension` plugin id [#12604](https://github.com/jupyterlab/jupyterlab/pull/12604) ([@jtpio](https://github.com/jtpio))
- Fix GitHub user rename for check-link [#12601](https://github.com/jupyterlab/jupyterlab/pull/12601) ([@fcollonval](https://github.com/fcollonval))

### Documentation improvements

- Add more explanation for internationalization (translation python package) [#12635](https://github.com/jupyterlab/jupyterlab/pull/12635) ([@a3626a](https://github.com/a3626a))
- Fix failing check links [#12627](https://github.com/jupyterlab/jupyterlab/pull/12627) ([@jtpio](https://github.com/jtpio))
- Update README wording [#12610](https://github.com/jupyterlab/jupyterlab/pull/12610) ([@fcollonval](https://github.com/fcollonval))
- Fix `documentsearch-extension` plugin id [#12604](https://github.com/jupyterlab/jupyterlab/pull/12604) ([@jtpio](https://github.com/jtpio))
- Fix GitHub user rename for check-link [#12601](https://github.com/jupyterlab/jupyterlab/pull/12601) ([@fcollonval](https://github.com/fcollonval))
- Invert relationship between launcher and filebrowser [#12585](https://github.com/jupyterlab/jupyterlab/pull/12585) ([@fcollonval](https://github.com/fcollonval))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2022-05-19&to=2022-06-09&type=c))

[@a3626a](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aa3626a+updated%3A2022-05-19..2022-06-09&type=Issues) | [@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2022-05-19..2022-06-09&type=Issues) | [@davidbrochart](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adavidbrochart+updated%3A2022-05-19..2022-06-09&type=Issues) | [@dependabot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adependabot+updated%3A2022-05-19..2022-06-09&type=Issues) | [@echarles](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aecharles+updated%3A2022-05-19..2022-06-09&type=Issues) | [@ellisonbg](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aellisonbg+updated%3A2022-05-19..2022-06-09&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2022-05-19..2022-06-09&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2022-05-19..2022-06-09&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2022-05-19..2022-06-09&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2022-05-19..2022-06-09&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2022-05-19..2022-06-09&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2022-05-19..2022-06-09&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2022-05-19..2022-06-09&type=Issues) | [@mlucool](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Amlucool+updated%3A2022-05-19..2022-06-09&type=Issues) | [@pre-commit-ci](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Apre-commit-ci+updated%3A2022-05-19..2022-06-09&type=Issues) | [@rursprung](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Arursprung+updated%3A2022-05-19..2022-06-09&type=Issues) | [@trungleduc](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Atrungleduc+updated%3A2022-05-19..2022-06-09&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2022-05-19..2022-06-09&type=Issues)

## 4.0.0a25

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v4.0.0a24...9cfad42aac66025f5ce2f9a33f91bfc83cff5b49))

### Enhancements made

- Fix collaborative document cleanup [#12595](https://github.com/jupyterlab/jupyterlab/pull/12595) ([@davidbrochart](https://github.com/davidbrochart))
- Use customizable toolbar for topbar [#12586](https://github.com/jupyterlab/jupyterlab/pull/12586) ([@fcollonval](https://github.com/fcollonval))
- Stop creating search provider for status [#12564](https://github.com/jupyterlab/jupyterlab/pull/12564) ([@fcollonval](https://github.com/fcollonval))
- Add "Open in Simple Mode" contextMenu option [#12532](https://github.com/jupyterlab/jupyterlab/pull/12532) ([@divyansshhh](https://github.com/divyansshhh))
- Check-all checkbox should be unchecked when current directory is empty [#12510](https://github.com/jupyterlab/jupyterlab/pull/12510) ([@gabalafou](https://github.com/gabalafou))
- Add line history (via arrow up/down) to all `Stdin` widgets in cell outputs [#12502](https://github.com/jupyterlab/jupyterlab/pull/12502) ([@telamonian](https://github.com/telamonian))
- Allow downstream extension to set toolbar layout [#12499](https://github.com/jupyterlab/jupyterlab/pull/12499) ([@fcollonval](https://github.com/fcollonval))
- Display default value in setting editor for changed values [#12468](https://github.com/jupyterlab/jupyterlab/pull/12468) ([@echarles](https://github.com/echarles))
- Setting to use the advanced setting editor for the settings [#12466](https://github.com/jupyterlab/jupyterlab/pull/12466) ([@echarles](https://github.com/echarles))
- Add ability to open settings editor to specific plugin's settings [#12398](https://github.com/jupyterlab/jupyterlab/pull/12398) ([@marthacryan](https://github.com/marthacryan))
- Table of content refactor [#12374](https://github.com/jupyterlab/jupyterlab/pull/12374) ([@fcollonval](https://github.com/fcollonval))
- Add CodeViewer widget and openCodeViewer command [#12365](https://github.com/jupyterlab/jupyterlab/pull/12365) ([@ajbozarth](https://github.com/ajbozarth))
- Load/auto-save document from the back-end using y-py [#12360](https://github.com/jupyterlab/jupyterlab/pull/12360) ([@davidbrochart](https://github.com/davidbrochart))
- Notebook search based on data model [#11689](https://github.com/jupyterlab/jupyterlab/pull/11689) ([@fcollonval](https://github.com/fcollonval))
- Customize layout from settings [#11614](https://github.com/jupyterlab/jupyterlab/pull/11614) ([@fcollonval](https://github.com/fcollonval))

### Bugs fixed

- Building extensions fail if not using latest patch [#12571](https://github.com/jupyterlab/jupyterlab/pull/12571) ([@ajbozarth](https://github.com/ajbozarth))
- Fix loading toolbar factory twice [#12556](https://github.com/jupyterlab/jupyterlab/pull/12556) ([@fcollonval](https://github.com/fcollonval))
- fixed shouldOverwrite is never called when rename target exists [#12543](https://github.com/jupyterlab/jupyterlab/pull/12543) ([@ephes](https://github.com/ephes))
- Fix file browser search highlighting bug [#12538](https://github.com/jupyterlab/jupyterlab/pull/12538) ([@marthacryan](https://github.com/marthacryan))
- Allow users to yarn link @jupyterlab/builder [#12533](https://github.com/jupyterlab/jupyterlab/pull/12533) ([@ajbozarth](https://github.com/ajbozarth))
- Handle missing `preferredPath` from the page config [#12521](https://github.com/jupyterlab/jupyterlab/pull/12521) ([@jtpio](https://github.com/jtpio))
- Make selected text translucent so the cursor is visible in vim mode [#12520](https://github.com/jupyterlab/jupyterlab/pull/12520) ([@Jessie-Newman](https://github.com/Jessie-Newman))
- Get Auto Close Brackets working consistently in Consoles [#12508](https://github.com/jupyterlab/jupyterlab/pull/12508) ([@Jessie-Newman](https://github.com/Jessie-Newman))
- Ensure settings editor is attached before activation [#12507](https://github.com/jupyterlab/jupyterlab/pull/12507) ([@fcollonval](https://github.com/fcollonval))
- Fixes behavior of `maxNumberOutputs` [#12498](https://github.com/jupyterlab/jupyterlab/pull/12498) ([@telamonian](https://github.com/telamonian))
- Handled new dialog creation with no buttons [#12496](https://github.com/jupyterlab/jupyterlab/pull/12496) ([@Jnnamchi](https://github.com/Jnnamchi))
- Setting form editor has a formState to avoid focus lost [#12470](https://github.com/jupyterlab/jupyterlab/pull/12470) ([@echarles](https://github.com/echarles))
- Move cell toolbar below search document widget [#12467](https://github.com/jupyterlab/jupyterlab/pull/12467) ([@fcollonval](https://github.com/fcollonval))
- Signal should only export ISignal publicly [#12464](https://github.com/jupyterlab/jupyterlab/pull/12464) ([@fcollonval](https://github.com/fcollonval))
- Focus not set when clicking on cell margin [#12447](https://github.com/jupyterlab/jupyterlab/pull/12447) ([@fcollonval](https://github.com/fcollonval))

### Maintenance and upkeep improvements

- Add bump linters commit to blame ignore [#12594](https://github.com/jupyterlab/jupyterlab/pull/12594) ([@fcollonval](https://github.com/fcollonval))
- Remove deprecated SplitPanel [#12593](https://github.com/jupyterlab/jupyterlab/pull/12593) ([@afshin](https://github.com/afshin))
- Use error names instead of messages for validation [#12591](https://github.com/jupyterlab/jupyterlab/pull/12591) ([@afshin](https://github.com/afshin))
- \[pre-commit.ci\] pre-commit autoupdate [#12587](https://github.com/jupyterlab/jupyterlab/pull/12587) ([@pre-commit-ci](https://github.com/pre-commit-ci))
- Bump linters [#12582](https://github.com/jupyterlab/jupyterlab/pull/12582) ([@fcollonval](https://github.com/fcollonval))
- Unbump the major version of rendermime-interfaces [#12581](https://github.com/jupyterlab/jupyterlab/pull/12581) ([@fcollonval](https://github.com/fcollonval))
- Force crypto resolution [#12576](https://github.com/jupyterlab/jupyterlab/pull/12576) ([@fcollonval](https://github.com/fcollonval))
- Fix documentation UI test for extension manager search [#12552](https://github.com/jupyterlab/jupyterlab/pull/12552) ([@fcollonval](https://github.com/fcollonval))
- Add cell-toolbar to CI and labeler [#12551](https://github.com/jupyterlab/jupyterlab/pull/12551) ([@fcollonval](https://github.com/fcollonval))
- Fixes user package [#12548](https://github.com/jupyterlab/jupyterlab/pull/12548) ([@hbcarlos](https://github.com/hbcarlos))
- Re-align `cell-toolbar` version [#12528](https://github.com/jupyterlab/jupyterlab/pull/12528) ([@jtpio](https://github.com/jtpio))
- Update documentation snapshot [#12515](https://github.com/jupyterlab/jupyterlab/pull/12515) ([@fcollonval](https://github.com/fcollonval))
- Rename `registerFactory` to `addFactory` in `IToolbarWidgetRegistry` [#12513](https://github.com/jupyterlab/jupyterlab/pull/12513) ([@fcollonval](https://github.com/fcollonval))
- Deduplicates some packages in yarn.lock [#12512](https://github.com/jupyterlab/jupyterlab/pull/12512) ([@fcollonval](https://github.com/fcollonval))
- Revert "Merge branch 'commenting-extension' into master" [#12511](https://github.com/jupyterlab/jupyterlab/pull/12511) ([@jtpio](https://github.com/jtpio))
- Allow bot PRs to be automatically labeled [#12509](https://github.com/jupyterlab/jupyterlab/pull/12509) ([@blink1073](https://github.com/blink1073))
- Inverse dependencies link between translation and rendermime interfaces [#12493](https://github.com/jupyterlab/jupyterlab/pull/12493) ([@fcollonval](https://github.com/fcollonval))
- Require y-py>=0.4.6 [#12486](https://github.com/jupyterlab/jupyterlab/pull/12486) ([@davidbrochart](https://github.com/davidbrochart))
- Only show duplicate LabIcon warning in debug mode [#12480](https://github.com/jupyterlab/jupyterlab/pull/12480) ([@ajbozarth](https://github.com/ajbozarth))
- Update copyright date to 2022 in the about dialog [#12474](https://github.com/jupyterlab/jupyterlab/pull/12474) ([@jtpio](https://github.com/jtpio))
- Check data based config [#12116](https://github.com/jupyterlab/jupyterlab/pull/12116) ([@fcollonval](https://github.com/fcollonval))

### Documentation improvements

- Use customizable toolbar for topbar [#12586](https://github.com/jupyterlab/jupyterlab/pull/12586) ([@fcollonval](https://github.com/fcollonval))
- Bump linters [#12582](https://github.com/jupyterlab/jupyterlab/pull/12582) ([@fcollonval](https://github.com/fcollonval))
- Add "Open in Simple Mode" contextMenu option [#12532](https://github.com/jupyterlab/jupyterlab/pull/12532) ([@divyansshhh](https://github.com/divyansshhh))
- Rename `registerFactory` to `addFactory` in `IToolbarWidgetRegistry` [#12513](https://github.com/jupyterlab/jupyterlab/pull/12513) ([@fcollonval](https://github.com/fcollonval))
- Revert "Merge branch 'commenting-extension' into master" [#12511](https://github.com/jupyterlab/jupyterlab/pull/12511) ([@jtpio](https://github.com/jtpio))
- Inverse dependencies link between translation and rendermime interfaces [#12493](https://github.com/jupyterlab/jupyterlab/pull/12493) ([@fcollonval](https://github.com/fcollonval))
- Table of content refactor [#12374](https://github.com/jupyterlab/jupyterlab/pull/12374) ([@fcollonval](https://github.com/fcollonval))
- Load/auto-save document from the back-end using y-py [#12360](https://github.com/jupyterlab/jupyterlab/pull/12360) ([@davidbrochart](https://github.com/davidbrochart))
- Check data based config [#12116](https://github.com/jupyterlab/jupyterlab/pull/12116) ([@fcollonval](https://github.com/fcollonval))
- Customize layout from settings [#11614](https://github.com/jupyterlab/jupyterlab/pull/11614) ([@fcollonval](https://github.com/fcollonval))

### API and Breaking Changes

- Fix file browser search highlighting bug [#12538](https://github.com/jupyterlab/jupyterlab/pull/12538) ([@marthacryan](https://github.com/marthacryan))
- Rename `registerFactory` to `addFactory` in `IToolbarWidgetRegistry` [#12513](https://github.com/jupyterlab/jupyterlab/pull/12513) ([@fcollonval](https://github.com/fcollonval))
- Inverse dependencies link between translation and rendermime interfaces [#12493](https://github.com/jupyterlab/jupyterlab/pull/12493) ([@fcollonval](https://github.com/fcollonval))
- Table of content refactor [#12374](https://github.com/jupyterlab/jupyterlab/pull/12374) ([@fcollonval](https://github.com/fcollonval))
- Load/auto-save document from the back-end using y-py [#12360](https://github.com/jupyterlab/jupyterlab/pull/12360) ([@davidbrochart](https://github.com/davidbrochart))

### Deprecated features

- Rename `registerFactory` to `addFactory` in `IToolbarWidgetRegistry` [#12513](https://github.com/jupyterlab/jupyterlab/pull/12513) ([@fcollonval](https://github.com/fcollonval))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2022-04-25&to=2022-05-19&type=c))

[@afshin](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aafshin+updated%3A2022-04-25..2022-05-19&type=Issues) | [@ajbozarth](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aajbozarth+updated%3A2022-04-25..2022-05-19&type=Issues) | [@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2022-04-25..2022-05-19&type=Issues) | [@bollwyvl](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Abollwyvl+updated%3A2022-04-25..2022-05-19&type=Issues) | [@davidbrochart](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adavidbrochart+updated%3A2022-04-25..2022-05-19&type=Issues) | [@divyansshhh](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adivyansshhh+updated%3A2022-04-25..2022-05-19&type=Issues) | [@dmonad](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Admonad+updated%3A2022-04-25..2022-05-19&type=Issues) | [@echarles](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aecharles+updated%3A2022-04-25..2022-05-19&type=Issues) | [@ephes](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aephes+updated%3A2022-04-25..2022-05-19&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2022-04-25..2022-05-19&type=Issues) | [@gabalafou](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agabalafou+updated%3A2022-04-25..2022-05-19&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2022-04-25..2022-05-19&type=Issues) | [@hbcarlos](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahbcarlos+updated%3A2022-04-25..2022-05-19&type=Issues) | [@Jessie-Newman](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AJessie-Newman+updated%3A2022-04-25..2022-05-19&type=Issues) | [@Jnnamchi](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AJnnamchi+updated%3A2022-04-25..2022-05-19&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2022-04-25..2022-05-19&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2022-04-25..2022-05-19&type=Issues) | [@JasonWeill](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AJasonWeill+updated%3A2022-04-25..2022-05-19&type=Issues) | [@marthacryan](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Amarthacryan+updated%3A2022-04-25..2022-05-19&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2022-04-25..2022-05-19&type=Issues) | [@pre-commit-ci](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Apre-commit-ci+updated%3A2022-04-25..2022-05-19&type=Issues) | [@telamonian](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Atelamonian+updated%3A2022-04-25..2022-05-19&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2022-04-25..2022-05-19&type=Issues)

## 4.0.0a24

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v4.0.0a23...521ddc05627441a88e6ef4a498433ae90d0ff392))

### Enhancements made

- Uses dark theme for Vega when JupyterLab theme is dark [#12411](https://github.com/jupyterlab/jupyterlab/pull/12411) ([@JasonWeill](https://github.com/JasonWeill))
- Pop up select kernel dialog when run a cell without kernel [#12379](https://github.com/jupyterlab/jupyterlab/pull/12379) ([@a3626a](https://github.com/a3626a))
- Allow LauncherModel to be more extendable [#12344](https://github.com/jupyterlab/jupyterlab/pull/12344) ([@ajbozarth](https://github.com/ajbozarth))
- File Browser: add support for filtering directories on search [#12342](https://github.com/jupyterlab/jupyterlab/pull/12342) ([@jtpio](https://github.com/jtpio))
- Allow for an optional label for the uploader widget [#12333](https://github.com/jupyterlab/jupyterlab/pull/12333) ([@jtpio](https://github.com/jtpio))
- Add argument `searchText` and `replaceText` to search and replace commands [#12310](https://github.com/jupyterlab/jupyterlab/pull/12310) ([@fcollonval](https://github.com/fcollonval))
- Add checkboxes to file browser [#12299](https://github.com/jupyterlab/jupyterlab/pull/12299) ([@gabalafou](https://github.com/gabalafou))
- Add a preferred-dir icon to the file browser crumbs [#12297](https://github.com/jupyterlab/jupyterlab/pull/12297) ([@echarles](https://github.com/echarles))
- Use `importlib` instead of `pkg_resources` [#12293](https://github.com/jupyterlab/jupyterlab/pull/12293) ([@fcollonval](https://github.com/fcollonval))
- Default is no virtual rendering + Relax virtual notebook rendering and ensure no structural change until rendering is completed [#12258](https://github.com/jupyterlab/jupyterlab/pull/12258) ([@echarles](https://github.com/echarles))
- Open terminal in cwd from launcher [#12250](https://github.com/jupyterlab/jupyterlab/pull/12250) ([@rccern](https://github.com/rccern))
- Update completer part 3 [#12219](https://github.com/jupyterlab/jupyterlab/pull/12219) ([@trungleduc](https://github.com/trungleduc))
- Add argument line and column to codemirror go to line command [#12204](https://github.com/jupyterlab/jupyterlab/pull/12204) ([@fcollonval](https://github.com/fcollonval))
- Add support for filtering by field names in setting editor [#12082](https://github.com/jupyterlab/jupyterlab/pull/12082) ([@marthacryan](https://github.com/marthacryan))
- Creates cell-toolbar, cell-toolbar-extension packages and populates toolbar [#12028](https://github.com/jupyterlab/jupyterlab/pull/12028) ([@JasonWeill](https://github.com/JasonWeill))
- position collapse heading button next to corresponding h tag (jupyter… [#11925](https://github.com/jupyterlab/jupyterlab/pull/11925) ([@Pugio](https://github.com/Pugio))

### Bugs fixed

- Check if process is declared before optional chaining in makeSettings [#12454](https://github.com/jupyterlab/jupyterlab/pull/12454) ([@xiaochen-db](https://github.com/xiaochen-db))
- Fix debugger extension error when notebooks is closed quickly [#12393](https://github.com/jupyterlab/jupyterlab/pull/12393) ([@afshin](https://github.com/afshin))
- Changes Vega class name to match source code [#12378](https://github.com/jupyterlab/jupyterlab/pull/12378) ([@JasonWeill](https://github.com/JasonWeill))
- Add parent header to input reply kernel message [#12376](https://github.com/jupyterlab/jupyterlab/pull/12376) ([@davidbrochart](https://github.com/davidbrochart))
- Wait until file browser commands are ready before activating file browser widget [#12369](https://github.com/jupyterlab/jupyterlab/pull/12369) ([@afshin](https://github.com/afshin))
- Toolbar items may not act on the proper target [#12368](https://github.com/jupyterlab/jupyterlab/pull/12368) ([@fcollonval](https://github.com/fcollonval))
- Fix docmanager plugin name [#12356](https://github.com/jupyterlab/jupyterlab/pull/12356) ([@fcollonval](https://github.com/fcollonval))
- Fix Yjs message [#12352](https://github.com/jupyterlab/jupyterlab/pull/12352) ([@davidbrochart](https://github.com/davidbrochart))
- showDocsPanel should receive a boolean [#12346](https://github.com/jupyterlab/jupyterlab/pull/12346) ([@echarles](https://github.com/echarles))
- Remove circular setting of source [#12338](https://github.com/jupyterlab/jupyterlab/pull/12338) ([@hbcarlos](https://github.com/hbcarlos))
- Update reference snapshots for the extension manager [#12337](https://github.com/jupyterlab/jupyterlab/pull/12337) ([@jtpio](https://github.com/jtpio))
- Remove cell id before saving the notebook [#12329](https://github.com/jupyterlab/jupyterlab/pull/12329) ([@hbcarlos](https://github.com/hbcarlos))
- fix: Markdown cell generates duplicate toc content (#12312) [#12314](https://github.com/jupyterlab/jupyterlab/pull/12314) ([@yangql176](https://github.com/yangql176))
- fix run cells breaking on non-header markdown cells [#12027](https://github.com/jupyterlab/jupyterlab/pull/12027) ([@andrewfulton9](https://github.com/andrewfulton9))

### Maintenance and upkeep improvements

- Ignore the commit introducing import sort during blame [#12458](https://github.com/jupyterlab/jupyterlab/pull/12458) ([@krassowski](https://github.com/krassowski))
- Use more explicit name for the releaser dist files uploaded as artifacts [#12448](https://github.com/jupyterlab/jupyterlab/pull/12448) ([@jtpio](https://github.com/jtpio))
- Bump async from 2.6.3 to 2.6.4 [#12440](https://github.com/jupyterlab/jupyterlab/pull/12440) ([@dependabot](https://github.com/dependabot))
- Removes FileEditorCodeWrapper [#12439](https://github.com/jupyterlab/jupyterlab/pull/12439) ([@hbcarlos](https://github.com/hbcarlos))
- \[pre-commit.ci\] pre-commit autoupdate [#12438](https://github.com/jupyterlab/jupyterlab/pull/12438) ([@pre-commit-ci](https://github.com/pre-commit-ci))
- Update to webpack 5.72 [#12423](https://github.com/jupyterlab/jupyterlab/pull/12423) ([@jtpio](https://github.com/jtpio))
- Update benchmark snapshots as part of galata snapshots [#12413](https://github.com/jupyterlab/jupyterlab/pull/12413) ([@fcollonval](https://github.com/fcollonval))
- Fix UI documentation CI [#12399](https://github.com/jupyterlab/jupyterlab/pull/12399) ([@fcollonval](https://github.com/fcollonval))
- \[pre-commit.ci\] pre-commit autoupdate [#12391](https://github.com/jupyterlab/jupyterlab/pull/12391) ([@pre-commit-ci](https://github.com/pre-commit-ci))
- Bump moment from 2.29.1 to 2.29.2 [#12384](https://github.com/jupyterlab/jupyterlab/pull/12384) ([@dependabot](https://github.com/dependabot))
- type-only and lazy imports of settings widgets [#12364](https://github.com/jupyterlab/jupyterlab/pull/12364) ([@bollwyvl](https://github.com/bollwyvl))
- Fix prettier [#12362](https://github.com/jupyterlab/jupyterlab/pull/12362) ([@jtpio](https://github.com/jtpio))
- Use `execFileSync` instead of `execSync` when setting npm registry. [#12357](https://github.com/jupyterlab/jupyterlab/pull/12357) ([@max-schaefer](https://github.com/max-schaefer))
- Update `webpack` dependencies [#12353](https://github.com/jupyterlab/jupyterlab/pull/12353) ([@jtpio](https://github.com/jtpio))
- Add CI check that fails when files in the staging directory are modified [#12351](https://github.com/jupyterlab/jupyterlab/pull/12351) ([@galathinius](https://github.com/galathinius))
- webpack: switch to the asset modules [#12350](https://github.com/jupyterlab/jupyterlab/pull/12350) ([@jtpio](https://github.com/jtpio))
- Provide `IDocumentManager` in a separate plugin [#12349](https://github.com/jupyterlab/jupyterlab/pull/12349) ([@jtpio](https://github.com/jtpio))
- Update to TypeScript 4.6 [#12348](https://github.com/jupyterlab/jupyterlab/pull/12348) ([@jtpio](https://github.com/jtpio))
- \[pre-commit.ci\] pre-commit autoupdate [#12343](https://github.com/jupyterlab/jupyterlab/pull/12343) ([@pre-commit-ci](https://github.com/pre-commit-ci))
- Remove the CI workflow for flaky tests [#12341](https://github.com/jupyterlab/jupyterlab/pull/12341) ([@jtpio](https://github.com/jtpio))
- Disable `fail-fast` for the check release workflow [#12339](https://github.com/jupyterlab/jupyterlab/pull/12339) ([@jtpio](https://github.com/jtpio))
- Use y-py 0.3.0 [#12326](https://github.com/jupyterlab/jupyterlab/pull/12326) ([@davidbrochart](https://github.com/davidbrochart))

### Documentation improvements

- Fix typo: `exitOnUncaughtException` in `@jupyterlab/buildutils` [#12444](https://github.com/jupyterlab/jupyterlab/pull/12444) ([@jtpio](https://github.com/jtpio))
- Removes FileEditorCodeWrapper [#12439](https://github.com/jupyterlab/jupyterlab/pull/12439) ([@hbcarlos](https://github.com/hbcarlos))
- Update to webpack 5.72 [#12423](https://github.com/jupyterlab/jupyterlab/pull/12423) ([@jtpio](https://github.com/jtpio))
- Fix documentation links [#12407](https://github.com/jupyterlab/jupyterlab/pull/12407) ([@fcollonval](https://github.com/fcollonval))
- Deprecate FileEditorCodeWrapper [#12381](https://github.com/jupyterlab/jupyterlab/pull/12381) ([@hbcarlos](https://github.com/hbcarlos))
- Update command to `pip install -e ".[test]"` in the contribution documentation [#12373](https://github.com/jupyterlab/jupyterlab/pull/12373) ([@jtpio](https://github.com/jtpio))
- Fix broken PR link in changelog [#12334](https://github.com/jupyterlab/jupyterlab/pull/12334) ([@krassowski](https://github.com/krassowski))
- Add postmortems section to RELEASE.md [#12327](https://github.com/jupyterlab/jupyterlab/pull/12327) ([@jtpio](https://github.com/jtpio))
- Simplify galata import by proxying `expect` [#12311](https://github.com/jupyterlab/jupyterlab/pull/12311) ([@fcollonval](https://github.com/fcollonval))
- Creates cell-toolbar, cell-toolbar-extension packages and populates toolbar [#12028](https://github.com/jupyterlab/jupyterlab/pull/12028) ([@JasonWeill](https://github.com/JasonWeill))

### API and Breaking Changes

- Fix typo: `exitOnUncaughtException` in `@jupyterlab/buildutils` [#12444](https://github.com/jupyterlab/jupyterlab/pull/12444) ([@jtpio](https://github.com/jtpio))
- Removes FileEditorCodeWrapper [#12439](https://github.com/jupyterlab/jupyterlab/pull/12439) ([@hbcarlos](https://github.com/hbcarlos))
- Add parent header to input reply kernel message [#12376](https://github.com/jupyterlab/jupyterlab/pull/12376) ([@davidbrochart](https://github.com/davidbrochart))
- Provide `IDocumentManager` in a separate plugin [#12349](https://github.com/jupyterlab/jupyterlab/pull/12349) ([@jtpio](https://github.com/jtpio))

### Deprecated features

- Deprecate FileEditorCodeWrapper [#12381](https://github.com/jupyterlab/jupyterlab/pull/12381) ([@hbcarlos](https://github.com/hbcarlos))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2022-03-31&to=2022-04-25&type=c))

[@a3626a](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aa3626a+updated%3A2022-03-31..2022-04-25&type=Issues) | [@afshin](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aafshin+updated%3A2022-03-31..2022-04-25&type=Issues) | [@aiqc](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aaiqc+updated%3A2022-03-31..2022-04-25&type=Issues) | [@ajbozarth](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aajbozarth+updated%3A2022-03-31..2022-04-25&type=Issues) | [@andrewfulton9](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aandrewfulton9+updated%3A2022-03-31..2022-04-25&type=Issues) | [@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2022-03-31..2022-04-25&type=Issues) | [@bollwyvl](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Abollwyvl+updated%3A2022-03-31..2022-04-25&type=Issues) | [@davidbrochart](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adavidbrochart+updated%3A2022-03-31..2022-04-25&type=Issues) | [@dependabot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adependabot+updated%3A2022-03-31..2022-04-25&type=Issues) | [@dmonad](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Admonad+updated%3A2022-03-31..2022-04-25&type=Issues) | [@echarles](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aecharles+updated%3A2022-03-31..2022-04-25&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2022-03-31..2022-04-25&type=Issues) | [@gabalafou](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agabalafou+updated%3A2022-03-31..2022-04-25&type=Issues) | [@galathinius](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agalathinius+updated%3A2022-03-31..2022-04-25&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2022-03-31..2022-04-25&type=Issues) | [@hbcarlos](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahbcarlos+updated%3A2022-03-31..2022-04-25&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2022-03-31..2022-04-25&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2022-03-31..2022-04-25&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2022-03-31..2022-04-25&type=Issues) | [@JasonWeill](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AJasonWeill+updated%3A2022-03-31..2022-04-25&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2022-03-31..2022-04-25&type=Issues) | [@marthacryan](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Amarthacryan+updated%3A2022-03-31..2022-04-25&type=Issues) | [@martinRenou](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AmartinRenou+updated%3A2022-03-31..2022-04-25&type=Issues) | [@max-schaefer](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Amax-schaefer+updated%3A2022-03-31..2022-04-25&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2022-03-31..2022-04-25&type=Issues) | [@mlucool](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Amlucool+updated%3A2022-03-31..2022-04-25&type=Issues) | [@pre-commit-ci](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Apre-commit-ci+updated%3A2022-03-31..2022-04-25&type=Issues) | [@Pugio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3APugio+updated%3A2022-03-31..2022-04-25&type=Issues) | [@rccern](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Arccern+updated%3A2022-03-31..2022-04-25&type=Issues) | [@trungleduc](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Atrungleduc+updated%3A2022-03-31..2022-04-25&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2022-03-31..2022-04-25&type=Issues) | [@xiaochen-db](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Axiaochen-db+updated%3A2022-03-31..2022-04-25&type=Issues) | [@yangql176](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ayangql176+updated%3A2022-03-31..2022-04-25&type=Issues)

## 4.0.0a23

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v4.0.0a22...6a5e1d47e1bc0d40d3850ad8aae1b32079846a0c))

### Enhancements made

- Remove Yjs room locks [#12288](https://github.com/jupyterlab/jupyterlab/pull/12288) ([@davidbrochart](https://github.com/davidbrochart))
- Adds preferKernel option to JupyterLab code [#12260](https://github.com/jupyterlab/jupyterlab/pull/12260) ([@JasonWeill](https://github.com/JasonWeill))
- Customize the file browser toolbar via the settings [#12281](https://github.com/jupyterlab/jupyterlab/pull/12281) ([@fcollonval](https://github.com/fcollonval))
- Show kernel name on restart to avoid data loss on misclick [#12241](https://github.com/jupyterlab/jupyterlab/pull/12241) ([@krassowski](https://github.com/krassowski))
- Ignore auto-generated `.ipynb_checkpoints` directories [#12239](https://github.com/jupyterlab/jupyterlab/pull/12239) ([@krassowski](https://github.com/krassowski))
- Add aria progressbar role and data-status for testing in extensions [#12238](https://github.com/jupyterlab/jupyterlab/pull/12238) ([@krassowski](https://github.com/krassowski))
- Add a "New Tab" button that opens the launcher [#12195](https://github.com/jupyterlab/jupyterlab/pull/12195) ([@ajbozarth](https://github.com/ajbozarth))
- add "Toggle Contextual Help" command [#12091](https://github.com/jupyterlab/jupyterlab/pull/12091) ([@Josh0823](https://github.com/jgeden))
- Save document from the backend using y-py [#11599](https://github.com/jupyterlab/jupyterlab/pull/11599) ([@davidbrochart](https://github.com/davidbrochart))

### Bugs fixed

- Use Black 22.3.0 [#12285](https://github.com/jupyterlab/jupyterlab/pull/12285) ([@davidbrochart](https://github.com/davidbrochart))
- Allow linear and radial gradient [#12276](https://github.com/jupyterlab/jupyterlab/pull/12276) ([@krassowski](https://github.com/krassowski))
- Use css variable for font size. [#12255](https://github.com/jupyterlab/jupyterlab/pull/12255) ([@Carreau](https://github.com/Carreau))
- Don't rely on search results to filter installed extension [#12249](https://github.com/jupyterlab/jupyterlab/pull/12249) ([@fcollonval](https://github.com/fcollonval))
- Fix settings with `null` default not getting marked as modified [#12240](https://github.com/jupyterlab/jupyterlab/pull/12240) ([@krassowski](https://github.com/krassowski))
- fixes directory not found error when preferred_dir is set [#12220](https://github.com/jupyterlab/jupyterlab/pull/12220) ([@andrewfulton9](https://github.com/andrewfulton9))
- Filter settings with `app.hasPlugin()` [#11938](https://github.com/jupyterlab/jupyterlab/pull/11938) ([@jtpio](https://github.com/jtpio))

### Maintenance and upkeep improvements

- Fix usage of pre-commit-ci [#12304](https://github.com/jupyterlab/jupyterlab/pull/12304) ([@blink1073](https://github.com/blink1073))
- Fix documentation snapshots [#12301](https://github.com/jupyterlab/jupyterlab/pull/12301) ([@fcollonval](https://github.com/fcollonval))
- Add flake8 rules and update files [#12291](https://github.com/jupyterlab/jupyterlab/pull/12291) ([@blink1073](https://github.com/blink1073))
- Add git-blame-ignore-revs file [#12290](https://github.com/jupyterlab/jupyterlab/pull/12290) ([@blink1073](https://github.com/blink1073))
- Use pre-commit [#12279](https://github.com/jupyterlab/jupyterlab/pull/12279) ([@blink1073](https://github.com/blink1073))
- Bump minimist from 1.2.5 to 1.2.6 [#12266](https://github.com/jupyterlab/jupyterlab/pull/12266) ([@dependabot](https://github.com/dependabot))
- Stop using py.test [#12262](https://github.com/jupyterlab/jupyterlab/pull/12262) ([@fcollonval](https://github.com/fcollonval))
- Re-align version for `@jupyterlab/markedparser-extension` [#12247](https://github.com/jupyterlab/jupyterlab/pull/12247) ([@jtpio](https://github.com/jtpio))
- Make `IStatusBar` optional in the plugin providing `IPositionModel` [#12232](https://github.com/jupyterlab/jupyterlab/pull/12232) ([@jtpio](https://github.com/jtpio))

### Documentation improvements

- Update `NotebookApp` to `ServerApp` in the contributing docs [#12309](https://github.com/jupyterlab/jupyterlab/pull/12309) ([@jtpio](https://github.com/jtpio))
- Remove Yjs room locks [#12288](https://github.com/jupyterlab/jupyterlab/pull/12288) ([@davidbrochart](https://github.com/davidbrochart))
- Customize the file browser toolbar via the settings [#12281](https://github.com/jupyterlab/jupyterlab/pull/12281) ([@fcollonval](https://github.com/fcollonval))
- Use pre-commit [#12279](https://github.com/jupyterlab/jupyterlab/pull/12279) ([@blink1073](https://github.com/blink1073))
- Stop using py.test [#12262](https://github.com/jupyterlab/jupyterlab/pull/12262) ([@fcollonval](https://github.com/fcollonval))
- Update links to create new issues in README.md [#12257](https://github.com/jupyterlab/jupyterlab/pull/12257) ([@jtpio](https://github.com/jtpio))
- Update link to `jupyterlab-some-package` in docs [#12248](https://github.com/jupyterlab/jupyterlab/pull/12248) ([@jtpio](https://github.com/jtpio))

### API and Breaking Changes

- Remove Yjs room locks [#12288](https://github.com/jupyterlab/jupyterlab/pull/12288) ([@davidbrochart](https://github.com/davidbrochart))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2022-03-18&to=2022-03-31&type=c))

[@afshin](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aafshin+updated%3A2022-03-18..2022-03-31&type=Issues) | [@aiqc](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aaiqc+updated%3A2022-03-18..2022-03-31&type=Issues) | [@ajbozarth](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aajbozarth+updated%3A2022-03-18..2022-03-31&type=Issues) | [@andrewfulton9](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aandrewfulton9+updated%3A2022-03-18..2022-03-31&type=Issues) | [@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2022-03-18..2022-03-31&type=Issues) | [@Carreau](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3ACarreau+updated%3A2022-03-18..2022-03-31&type=Issues) | [@damianavila](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adamianavila+updated%3A2022-03-18..2022-03-31&type=Issues) | [@davidbrochart](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adavidbrochart+updated%3A2022-03-18..2022-03-31&type=Issues) | [@dependabot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adependabot+updated%3A2022-03-18..2022-03-31&type=Issues) | [@echarles](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aecharles+updated%3A2022-03-18..2022-03-31&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2022-03-18..2022-03-31&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2022-03-18..2022-03-31&type=Issues) | [@hbcarlos](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahbcarlos+updated%3A2022-03-18..2022-03-31&type=Issues) | [@Josh0823](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AJosh0823+updated%3A2022-03-18..2022-03-31&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2022-03-18..2022-03-31&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2022-03-18..2022-03-31&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2022-03-18..2022-03-31&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2022-03-18..2022-03-31&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2022-03-18..2022-03-31&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2022-03-18..2022-03-31&type=Issues)

## 4.0.0a22

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v4.0.0a21...0040f2649c77af0251b8c8f73aea91c26c3960c5))

### Bugs fixed

- Fix state restoration in the notebook extension [#12218](https://github.com/jupyterlab/jupyterlab/pull/12218) ([@jtpio](https://github.com/jtpio))
- Fix sdist editable install and add tests [#12208](https://github.com/jupyterlab/jupyterlab/pull/12208) ([@blink1073](https://github.com/blink1073))
- Remove use of ipython_genutils [#12202](https://github.com/jupyterlab/jupyterlab/pull/12202) ([@blink1073](https://github.com/blink1073))

### Maintenance and upkeep improvements

- Inline `expected_http_error` function from `jupyterlab_server.tests` [#12228](https://github.com/jupyterlab/jupyterlab/pull/12228) ([@jtpio](https://github.com/jtpio))

### Documentation improvements

- Update command in Performance Testing to use the right option [#12215](https://github.com/jupyterlab/jupyterlab/pull/12215) ([@JasonWeill](https://github.com/JasonWeill))
- Add note about `async`, `await` and `Promises` in the extension tutorial [#12199](https://github.com/jupyterlab/jupyterlab/pull/12199) ([@jtpio](https://github.com/jtpio))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2022-03-11&to=2022-03-18&type=c))

[@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2022-03-11..2022-03-18&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2022-03-11..2022-03-18&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2022-03-11..2022-03-18&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2022-03-11..2022-03-18&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2022-03-11..2022-03-18&type=Issues) | [@JasonWeill](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AJasonWeill+updated%3A2022-03-11..2022-03-18&type=Issues)

## 4.0.0a21

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v4.0.0a20...d7f1704307c2e345f247e1a411bdbae50f2a5708))

### Enhancements made

- Export KernelConnection [#12156](https://github.com/jupyterlab/jupyterlab/pull/12156) ([@tkrabel-db](https://github.com/tkrabel-db))
- Document search debounce time via setting [#12097](https://github.com/jupyterlab/jupyterlab/pull/12097) ([@echarles](https://github.com/echarles))
- Extract markdown parser in its own plugin. [#11971](https://github.com/jupyterlab/jupyterlab/pull/11971) ([@fcollonval](https://github.com/fcollonval))
- Protocol alignment [#11841](https://github.com/jupyterlab/jupyterlab/pull/11841) ([@davidbrochart](https://github.com/davidbrochart))
- Add users colors to the theme [#11703](https://github.com/jupyterlab/jupyterlab/pull/11703) ([@hbcarlos](https://github.com/hbcarlos))

### Bugs fixed

- Update docstring in the user model [#12175](https://github.com/jupyterlab/jupyterlab/pull/12175) ([@hbcarlos](https://github.com/hbcarlos))
- Typo in ShortcutItem component [#12161](https://github.com/jupyterlab/jupyterlab/pull/12161) ([@sparanoid](https://github.com/sparanoid))
- Correct the set item logic of `CodeCellModel.onModelDBOutputsChange` [#12147](https://github.com/jupyterlab/jupyterlab/pull/12147) ([@trungleduc](https://github.com/trungleduc))
- Build UMD module for @jupyterlab/services [#12141](https://github.com/jupyterlab/jupyterlab/pull/12141) ([@fcollonval](https://github.com/fcollonval))
- Select kernel text (when open a no kernal .ipynb file) is not translated correctly (#12133) [#12135](https://github.com/jupyterlab/jupyterlab/pull/12135) ([@yangql176](https://github.com/yangql176))
- Remove duplicated shortcuts [#12122](https://github.com/jupyterlab/jupyterlab/pull/12122) ([@fcollonval](https://github.com/fcollonval))
- Opening keyboard shortcuts UI result in "destruction" of shortcut settings [#12112](https://github.com/jupyterlab/jupyterlab/pull/12112) ([@fcollonval](https://github.com/fcollonval))

### Maintenance and upkeep improvements

- Freeze content last modified time for documentation tabs menu [#12183](https://github.com/jupyterlab/jupyterlab/pull/12183) ([@fcollonval](https://github.com/fcollonval))
- Bump url-parse from 1.5.8 to 1.5.9 [#12144](https://github.com/jupyterlab/jupyterlab/pull/12144) ([@dependabot](https://github.com/dependabot))
- Fix typos in `kernel-status` plugins [#12130](https://github.com/jupyterlab/jupyterlab/pull/12130) ([@jtpio](https://github.com/jtpio))
- Bump url-parse from 1.5.6 to 1.5.8 [#12128](https://github.com/jupyterlab/jupyterlab/pull/12128) ([@dependabot](https://github.com/dependabot))
- Set left sidebar width through mouse motion [#12123](https://github.com/jupyterlab/jupyterlab/pull/12123) ([@fcollonval](https://github.com/fcollonval))

### Documentation improvements

- Update docstring in the user model [#12175](https://github.com/jupyterlab/jupyterlab/pull/12175) ([@hbcarlos](https://github.com/hbcarlos))
- Document search debounce time via setting [#12097](https://github.com/jupyterlab/jupyterlab/pull/12097) ([@echarles](https://github.com/echarles))
- Document the JupyterLab Release Process [#12074](https://github.com/jupyterlab/jupyterlab/pull/12074) ([@jtpio](https://github.com/jtpio))
- Extract markdown parser in its own plugin. [#11971](https://github.com/jupyterlab/jupyterlab/pull/11971) ([@fcollonval](https://github.com/fcollonval))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2022-02-24&to=2022-03-11&type=c))

[@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2022-02-24..2022-03-11&type=Issues) | [@davidbrochart](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adavidbrochart+updated%3A2022-02-24..2022-03-11&type=Issues) | [@dependabot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adependabot+updated%3A2022-02-24..2022-03-11&type=Issues) | [@echarles](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aecharles+updated%3A2022-02-24..2022-03-11&type=Issues) | [@ellisonbg](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aellisonbg+updated%3A2022-02-24..2022-03-11&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2022-02-24..2022-03-11&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2022-02-24..2022-03-11&type=Issues) | [@hbcarlos](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahbcarlos+updated%3A2022-02-24..2022-03-11&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2022-02-24..2022-03-11&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2022-02-24..2022-03-11&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2022-02-24..2022-03-11&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2022-02-24..2022-03-11&type=Issues) | [@martinRenou](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AmartinRenou+updated%3A2022-02-24..2022-03-11&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2022-02-24..2022-03-11&type=Issues) | [@sparanoid](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Asparanoid+updated%3A2022-02-24..2022-03-11&type=Issues) | [@tkrabel-db](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Atkrabel-db+updated%3A2022-02-24..2022-03-11&type=Issues) | [@trungleduc](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Atrungleduc+updated%3A2022-02-24..2022-03-11&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2022-02-24..2022-03-11&type=Issues) | [@yangql176](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ayangql176+updated%3A2022-02-24..2022-03-11&type=Issues)

## 4.0.0a20

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v4.0.0a19...3468cc4990c2d0f0b3e3381c284a59a2e13f2d55))

### Enhancements made

- Settings UI gives an unreadable JSON dump [#12064](https://github.com/jupyterlab/jupyterlab/pull/12064) ([@fcollonval](https://github.com/fcollonval))
- Polish settings editor [#12045](https://github.com/jupyterlab/jupyterlab/pull/12045) ([@krassowski](https://github.com/krassowski))
- Debounce kernel sources filter [#12030](https://github.com/jupyterlab/jupyterlab/pull/12030) ([@echarles](https://github.com/echarles))
- show pause on exception button when not available and change caption … [#12005](https://github.com/jupyterlab/jupyterlab/pull/12005) ([@andrewfulton9](https://github.com/andrewfulton9))
- Fix contrast in dark theme of settings editor [#12004](https://github.com/jupyterlab/jupyterlab/pull/12004) ([@krassowski](https://github.com/krassowski))
- Update completer part 2 [#11969](https://github.com/jupyterlab/jupyterlab/pull/11969) ([@trungleduc](https://github.com/trungleduc))
- Support dynamic toolbar definition [#11963](https://github.com/jupyterlab/jupyterlab/pull/11963) ([@fcollonval](https://github.com/fcollonval))
- Fix for kernel reconnect [#11952](https://github.com/jupyterlab/jupyterlab/pull/11952) ([@3coins](https://github.com/3coins))
- Add additional `Accel Enter` keyboard shortcuts for the `notebook:run-cell` command [#11942](https://github.com/jupyterlab/jupyterlab/pull/11942) ([@jtpio](https://github.com/jtpio))
- Explicitly specifies triageLabel parameter [#11912](https://github.com/jupyterlab/jupyterlab/pull/11912) ([@JasonWeill](https://github.com/JasonWeill))
- Add spacer widget via `app.shell` instead of `ILabShell` [#11900](https://github.com/jupyterlab/jupyterlab/pull/11900) ([@jtpio](https://github.com/jtpio))
- Add startMode setting to define the startup mode [#11881](https://github.com/jupyterlab/jupyterlab/pull/11881) ([@echarles](https://github.com/echarles))
- Add side-by-side margin override in the notebookConfig [#11880](https://github.com/jupyterlab/jupyterlab/pull/11880) ([@echarles](https://github.com/echarles))
- Pause on exception [#11752](https://github.com/jupyterlab/jupyterlab/pull/11752) ([@andrewfulton9](https://github.com/andrewfulton9))
- Increase color contrast in input boxes [#11658](https://github.com/jupyterlab/jupyterlab/pull/11658) ([@isabela-pf](https://github.com/isabela-pf))
- Show the kernel sources as a debugger tab and allow the user to break in kernel sources [#11566](https://github.com/jupyterlab/jupyterlab/pull/11566) ([@echarles](https://github.com/echarles))
- Refactor status bar [#11450](https://github.com/jupyterlab/jupyterlab/pull/11450) ([@fcollonval](https://github.com/fcollonval))
- Add settings UI [#11079](https://github.com/jupyterlab/jupyterlab/pull/11079) ([@marthacryan](https://github.com/marthacryan))
- Enable not showing editor for read-only Markdown cells [#10956](https://github.com/jupyterlab/jupyterlab/pull/10956) ([@krassowska](https://github.com/krassowska))

### Bugs fixed

- Improve toggled button styles in debugger. [#12110](https://github.com/jupyterlab/jupyterlab/pull/12110) ([@fcollonval](https://github.com/fcollonval))
- Fix error rendering in Advanced Settings Editor [#12107](https://github.com/jupyterlab/jupyterlab/pull/12107) ([@krassowski](https://github.com/krassowski))
- Remove toolbar factory setting trick in the tests [#12096](https://github.com/jupyterlab/jupyterlab/pull/12096) ([@jtpio](https://github.com/jtpio))
- update status to unkown when kernel is shutdown from running kernels tab [#12083](https://github.com/jupyterlab/jupyterlab/pull/12083) ([@akshaychitneni](https://github.com/akshaychitneni))
- Log error on open document widget. [#12080](https://github.com/jupyterlab/jupyterlab/pull/12080) ([@trungleduc](https://github.com/trungleduc))
- Handle shutdown error [#12048](https://github.com/jupyterlab/jupyterlab/pull/12048) ([@Zsailer](https://github.com/Zsailer))
- Update snapshot following settings editor new wording [#12035](https://github.com/jupyterlab/jupyterlab/pull/12035) ([@fcollonval](https://github.com/fcollonval))
- use path-like comparison in initialize_templates() [#12024](https://github.com/jupyterlab/jupyterlab/pull/12024) ([@kellyyke](https://github.com/kellyyke))
- Adjust z-index of execution progress tooltip [#11973](https://github.com/jupyterlab/jupyterlab/pull/11973) ([@Sync271](https://github.com/Sync271))
- Add legacy editor to same palette category [#11978](https://github.com/jupyterlab/jupyterlab/pull/11978) ([@fcollonval](https://github.com/fcollonval))
- Fix misaligned icon and checkbox of setting editor [#11976](https://github.com/jupyterlab/jupyterlab/pull/11976) ([@trungleduc](https://github.com/trungleduc))
- Fix the debug modules model [#11967](https://github.com/jupyterlab/jupyterlab/pull/11967) ([@echarles](https://github.com/echarles))
- Fix autocomplete in console [#11949](https://github.com/jupyterlab/jupyterlab/pull/11949) ([@fcollonval](https://github.com/fcollonval))
- fix(docprovider): fix issue with empty notebook [#11901](https://github.com/jupyterlab/jupyterlab/pull/11901) ([@entropitor](https://github.com/entropitor))
- ensure a single modal is opened in case of time conflict savings [#11883](https://github.com/jupyterlab/jupyterlab/pull/11883) ([@echarles](https://github.com/echarles))
- Add percent decoding to `username` & `initials` [#11852](https://github.com/jupyterlab/jupyterlab/pull/11852) ([@HoseonRyu](https://github.com/HoseonRyu))
- Update reference snapshot for the completer UI test [#11844](https://github.com/jupyterlab/jupyterlab/pull/11844) ([@jtpio](https://github.com/jtpio))
- Specify an output hash function for Galata [#11830](https://github.com/jupyterlab/jupyterlab/pull/11830) ([@jasongrout](https://github.com/jasongrout))
- Trust dialog link styling, text changes [#11827](https://github.com/jupyterlab/jupyterlab/pull/11827) ([@JasonWeill](https://github.com/JasonWeill))
- Fixes Ctrl+Shift+ArrowLeft/Right shortcuts edit mode [#11818](https://github.com/jupyterlab/jupyterlab/pull/11818) ([@schmidi314](https://github.com/schmidi314))
- Restore line number state when stopping debugger [#11768](https://github.com/jupyterlab/jupyterlab/pull/11768) ([@fcollonval](https://github.com/fcollonval))

### Maintenance and upkeep improvements

- Bump url-parse from 1.5.4 to 1.5.6 [#12076](https://github.com/jupyterlab/jupyterlab/pull/12076) ([@dependabot](https://github.com/dependabot))
- Bump follow-redirects from 1.14.7 to 1.14.8 [#12050](https://github.com/jupyterlab/jupyterlab/pull/12050) ([@dependabot](https://github.com/dependabot))
- Parse URL parameters in user model [#12046](https://github.com/jupyterlab/jupyterlab/pull/12046) ([@hbcarlos](https://github.com/hbcarlos))
- Update to `react-json-tree@^0.16.1` [#12044](https://github.com/jupyterlab/jupyterlab/pull/12044) ([@jtpio](https://github.com/jtpio))
- Stabilize documentation CI tests [#12043](https://github.com/jupyterlab/jupyterlab/pull/12043) ([@fcollonval](https://github.com/fcollonval))
- Update Playwright snapshots from PR comments [#12040](https://github.com/jupyterlab/jupyterlab/pull/12040) ([@fcollonval](https://github.com/fcollonval))
- Mehmet employer update [#12033](https://github.com/jupyterlab/jupyterlab/pull/12033) ([@mbektas](https://github.com/mbektas))
- Bump simple-get from 3.1.0 to 3.1.1 [#12010](https://github.com/jupyterlab/jupyterlab/pull/12010) ([@dependabot](https://github.com/dependabot))
- \[squash\] Apply most auto-fixable stylelint rules [#11993](https://github.com/jupyterlab/jupyterlab/pull/11993) ([@bollwyvl](https://github.com/bollwyvl))
- Bump json-schema from 0.3.0 to 0.4.0 [#11974](https://github.com/jupyterlab/jupyterlab/pull/11974) ([@dependabot](https://github.com/dependabot))
- Fix General Welcome documentation test [#11961](https://github.com/jupyterlab/jupyterlab/pull/11961) ([@fcollonval](https://github.com/fcollonval))
- Remove tslint comment and move `Token` to `tokens.ts` [#11955](https://github.com/jupyterlab/jupyterlab/pull/11955) ([@fcollonval](https://github.com/fcollonval))
- Adopt stylelint and apply initial rules [#11944](https://github.com/jupyterlab/jupyterlab/pull/11944) ([@bollwyvl](https://github.com/bollwyvl))
- Bump node-fetch from 2.6.1 to 2.6.7 [#11918](https://github.com/jupyterlab/jupyterlab/pull/11918) ([@dependabot](https://github.com/dependabot))
- Bump nanoid from 3.1.23 to 3.2.0 [#11914](https://github.com/jupyterlab/jupyterlab/pull/11914) ([@dependabot](https://github.com/dependabot))
- Remove unused `isInit` param in `sessionContext.changeKernel()` [#11907](https://github.com/jupyterlab/jupyterlab/pull/11907) ([@jtpio](https://github.com/jtpio))
- Fix plugin id for the toolbar registry plugin [#11899](https://github.com/jupyterlab/jupyterlab/pull/11899) ([@jtpio](https://github.com/jtpio))
- Drop `nbclassic`, depend on `notebook_shim` [#11894](https://github.com/jupyterlab/jupyterlab/pull/11894) ([@jtpio](https://github.com/jtpio))
- simplify validateMimeValue regex [#11890](https://github.com/jupyterlab/jupyterlab/pull/11890) ([@minrk](https://github.com/minrk))
- Bump marked from 2.1.3 to 4.0.10 [#11879](https://github.com/jupyterlab/jupyterlab/pull/11879) ([@dependabot](https://github.com/dependabot))
- Bump follow-redirects from 1.14.1 to 1.14.7 [#11864](https://github.com/jupyterlab/jupyterlab/pull/11864) ([@dependabot](https://github.com/dependabot))
- Update to the latest lumino [#11823](https://github.com/jupyterlab/jupyterlab/pull/11823) ([@hbcarlos](https://github.com/hbcarlos))
- Use playwright to generate documentation screenshots [#11821](https://github.com/jupyterlab/jupyterlab/pull/11821) ([@fcollonval](https://github.com/fcollonval))
- Remove `url` dependency from `@jupyterlab/apputils` [#11813](https://github.com/jupyterlab/jupyterlab/pull/11813) ([@jtpio](https://github.com/jtpio))
- Ensure federated example resolutions [#11714](https://github.com/jupyterlab/jupyterlab/pull/11714) ([@jtpio](https://github.com/jtpio))
- Optional sessionContext for ConsoleHistory [#9975](https://github.com/jupyterlab/jupyterlab/pull/9975) ([@jtpio](https://github.com/jtpio))

### Documentation improvements

- Pull request must target master [#12088](https://github.com/jupyterlab/jupyterlab/pull/12088) ([@fcollonval](https://github.com/fcollonval))
- Fix anchors and myst configuration [#12063](https://github.com/jupyterlab/jupyterlab/pull/12063) ([@fcollonval](https://github.com/fcollonval))
- Update Playwright snapshots from PR comments [#12040](https://github.com/jupyterlab/jupyterlab/pull/12040) ([@fcollonval](https://github.com/fcollonval))
- Mehmet employer update [#12033](https://github.com/jupyterlab/jupyterlab/pull/12033) ([@mbektas](https://github.com/mbektas))
- docs: fix shell command with unquoted '>' [#12002](https://github.com/jupyterlab/jupyterlab/pull/12002) ([@ErikBjare](https://github.com/ErikBjare))
- Fix a bumpversion example in release markdown [#12006](https://github.com/jupyterlab/jupyterlab/pull/12006) ([@echarles](https://github.com/echarles))
- \[squash\] Apply most auto-fixable stylelint rules [#11993](https://github.com/jupyterlab/jupyterlab/pull/11993) ([@bollwyvl](https://github.com/bollwyvl))
- Remove tslint comment and move `Token` to `tokens.ts` [#11955](https://github.com/jupyterlab/jupyterlab/pull/11955) ([@fcollonval](https://github.com/fcollonval))
- Update several extensions readme files to delete old content. [#11947](https://github.com/jupyterlab/jupyterlab/pull/11947) ([@jasongrout](https://github.com/jasongrout))
- Adopt stylelint and apply initial rules [#11944](https://github.com/jupyterlab/jupyterlab/pull/11944) ([@bollwyvl](https://github.com/bollwyvl))
- Remove theme cookiecutter from the docs [#11928](https://github.com/jupyterlab/jupyterlab/pull/11928) ([@jtpio](https://github.com/jtpio))
- Updates code, documentation to use new standard terms for cell output [#11904](https://github.com/jupyterlab/jupyterlab/pull/11904) ([@JasonWeill](https://github.com/JasonWeill))
- Drop `nbclassic`, depend on `notebook_shim` [#11894](https://github.com/jupyterlab/jupyterlab/pull/11894) ([@jtpio](https://github.com/jtpio))
- DOCS: Remove custom icon link template [#11882](https://github.com/jupyterlab/jupyterlab/pull/11882) ([@choldgraf](https://github.com/choldgraf))
- Add the `3.3.0a1` Changelog Entry [#11860](https://github.com/jupyterlab/jupyterlab/pull/11860) ([@jtpio](https://github.com/jtpio))
- Add missing `v3.2` title to the changelog [#11859](https://github.com/jupyterlab/jupyterlab/pull/11859) ([@jtpio](https://github.com/jtpio))
- Give conda instructions for the pixman pkg-config error. [#11829](https://github.com/jupyterlab/jupyterlab/pull/11829) ([@jasongrout](https://github.com/jasongrout))
- Use playwright to generate documentation screenshots [#11821](https://github.com/jupyterlab/jupyterlab/pull/11821) ([@fcollonval](https://github.com/fcollonval))
- DOCS: Convert theme to pydata-sphinx-theme [#11803](https://github.com/jupyterlab/jupyterlab/pull/11803) ([@choldgraf](https://github.com/choldgraf))
- Refactor completer and completer-extension package [#11795](https://github.com/jupyterlab/jupyterlab/pull/11795) ([@trungleduc](https://github.com/trungleduc))
- Refactor status bar [#11450](https://github.com/jupyterlab/jupyterlab/pull/11450) ([@fcollonval](https://github.com/fcollonval))
- Optional sessionContext for ConsoleHistory [#9975](https://github.com/jupyterlab/jupyterlab/pull/9975) ([@jtpio](https://github.com/jtpio))

### API and Breaking Changes

- Drop `nbclassic`, depend on `notebook_shim` [#11894](https://github.com/jupyterlab/jupyterlab/pull/11894) ([@jtpio](https://github.com/jtpio))
- Refactor completer and completer-extension package [#11795](https://github.com/jupyterlab/jupyterlab/pull/11795) ([@trungleduc](https://github.com/trungleduc))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2022-01-12&to=2022-02-24&type=c))

[@3coins](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3A3coins+updated%3A2022-01-12..2022-02-24&type=Issues) | [@akshaychitneni](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aakshaychitneni+updated%3A2022-01-12..2022-02-24&type=Issues) | [@andrewfulton9](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aandrewfulton9+updated%3A2022-01-12..2022-02-24&type=Issues) | [@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2022-01-12..2022-02-24&type=Issues) | [@bollwyvl](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Abollwyvl+updated%3A2022-01-12..2022-02-24&type=Issues) | [@choldgraf](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Acholdgraf+updated%3A2022-01-12..2022-02-24&type=Issues) | [@davidbrochart](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adavidbrochart+updated%3A2022-01-12..2022-02-24&type=Issues) | [@dependabot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adependabot+updated%3A2022-01-12..2022-02-24&type=Issues) | [@echarles](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aecharles+updated%3A2022-01-12..2022-02-24&type=Issues) | [@entropitor](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aentropitor+updated%3A2022-01-12..2022-02-24&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2022-01-12..2022-02-24&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2022-01-12..2022-02-24&type=Issues) | [@hbcarlos](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahbcarlos+updated%3A2022-01-12..2022-02-24&type=Issues) | [@HoseonRyu](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AHoseonRyu+updated%3A2022-01-12..2022-02-24&type=Issues) | [@isabela-pf](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aisabela-pf+updated%3A2022-01-12..2022-02-24&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2022-01-12..2022-02-24&type=Issues) | [@JohanMabille](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AJohanMabille+updated%3A2022-01-12..2022-02-24&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2022-01-12..2022-02-24&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2022-01-12..2022-02-24&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2022-01-12..2022-02-24&type=Issues) | [@JasonWeill](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AJasonWeill+updated%3A2022-01-12..2022-02-24&type=Issues) | [@kellyyke](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akellyyke+updated%3A2022-01-12..2022-02-24&type=Issues) | [@krassowska](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowska+updated%3A2022-01-12..2022-02-24&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2022-01-12..2022-02-24&type=Issues) | [@marthacryan](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Amarthacryan+updated%3A2022-01-12..2022-02-24&type=Issues) | [@mbektas](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ambektas+updated%3A2022-01-12..2022-02-24&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2022-01-12..2022-02-24&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2022-01-12..2022-02-24&type=Issues) | [@minrk](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aminrk+updated%3A2022-01-12..2022-02-24&type=Issues) | [@mlucool](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Amlucool+updated%3A2022-01-12..2022-02-24&type=Issues) | [@schmidi314](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aschmidi314+updated%3A2022-01-12..2022-02-24&type=Issues) | [@SylvainCorlay](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3ASylvainCorlay+updated%3A2022-01-12..2022-02-24&type=Issues) | [@trungleduc](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Atrungleduc+updated%3A2022-01-12..2022-02-24&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2022-01-12..2022-02-24&type=Issues) | [@yuvipanda](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ayuvipanda+updated%3A2022-01-12..2022-02-24&type=Issues) | [@Zsailer](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AZsailer+updated%3A2022-01-12..2022-02-24&type=Issues)

## 4.0.0a19

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v4.0.0a18...fc3f1f2f75f4bb3c8df0f3fa9f8508f17d532907))

### Enhancements made

- Mentions pip3 for macOS users in docs [#11816](https://github.com/jupyterlab/jupyterlab/pull/11816) ([@JasonWeill](https://github.com/JasonWeill))
- Fix overlapped shadow for scrolling output cell [#11785](https://github.com/jupyterlab/jupyterlab/pull/11785) ([@thesinepainter](https://github.com/thesinepainter))
- Drop familyName from the ICurrentUser interface [#11774](https://github.com/jupyterlab/jupyterlab/pull/11774) ([@hbcarlos](https://github.com/hbcarlos))
- List workspaces [#11730](https://github.com/jupyterlab/jupyterlab/pull/11730) ([@fcollonval](https://github.com/fcollonval))
- Keyboard shortcuts related to collapsible headings [#11615](https://github.com/jupyterlab/jupyterlab/pull/11615) ([@schmidi314](https://github.com/schmidi314))
- Update variable renderer panels [#11171](https://github.com/jupyterlab/jupyterlab/pull/11171) ([@fcollonval](https://github.com/fcollonval))

### Bugs fixed

- Fix for Code Mirror width. Indentation changes made [#11814](https://github.com/jupyterlab/jupyterlab/pull/11814) ([@pree-T](https://github.com/pree-T))
- Preserve breakpoint gutter when cells are moved. [#11766](https://github.com/jupyterlab/jupyterlab/pull/11766) ([@fcollonval](https://github.com/fcollonval))

### Maintenance and upkeep improvements

- Update `vscode-debugprotocol` to `@vscode/debugprotocol` [#11812](https://github.com/jupyterlab/jupyterlab/pull/11812) ([@jtpio](https://github.com/jtpio))
- Remove trailing slash from translations request [#11783](https://github.com/jupyterlab/jupyterlab/pull/11783) ([@davidbrochart](https://github.com/davidbrochart))

### Documentation improvements

- Update trove classifier [#11819](https://github.com/jupyterlab/jupyterlab/pull/11819) ([@fcollonval](https://github.com/fcollonval))
- Mentions pip3 for macOS users in docs [#11816](https://github.com/jupyterlab/jupyterlab/pull/11816) ([@JasonWeill](https://github.com/JasonWeill))
- Keyboard shortcuts related to collapsible headings [#11615](https://github.com/jupyterlab/jupyterlab/pull/11615) ([@schmidi314](https://github.com/schmidi314))

### API and Breaking Changes

- Keyboard shortcuts related to collapsible headings [#11615](https://github.com/jupyterlab/jupyterlab/pull/11615) ([@schmidi314](https://github.com/schmidi314))
- Update variable renderer panels [#11171](https://github.com/jupyterlab/jupyterlab/pull/11171) ([@fcollonval](https://github.com/fcollonval))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2022-01-04&to=2022-01-12&type=c))

[@agoose77](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aagoose77+updated%3A2022-01-04..2022-01-12&type=Issues) | [@andrewfulton9](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aandrewfulton9+updated%3A2022-01-04..2022-01-12&type=Issues) | [@baggiponte](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Abaggiponte+updated%3A2022-01-04..2022-01-12&type=Issues) | [@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2022-01-04..2022-01-12&type=Issues) | [@davidbrochart](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adavidbrochart+updated%3A2022-01-04..2022-01-12&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2022-01-04..2022-01-12&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2022-01-04..2022-01-12&type=Issues) | [@hbcarlos](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahbcarlos+updated%3A2022-01-04..2022-01-12&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2022-01-04..2022-01-12&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2022-01-04..2022-01-12&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2022-01-04..2022-01-12&type=Issues) | [@JasonWeill](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AJasonWeill+updated%3A2022-01-04..2022-01-12&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2022-01-04..2022-01-12&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2022-01-04..2022-01-12&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2022-01-04..2022-01-12&type=Issues) | [@pree-T](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Apree-T+updated%3A2022-01-04..2022-01-12&type=Issues) | [@schmidi314](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aschmidi314+updated%3A2022-01-04..2022-01-12&type=Issues) | [@telamonian](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Atelamonian+updated%3A2022-01-04..2022-01-12&type=Issues) | [@thesinepainter](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Athesinepainter+updated%3A2022-01-04..2022-01-12&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2022-01-04..2022-01-12&type=Issues)

## 4.0.0a18

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v4.0.0a17...950ff2f44779f4a72433071ffee237e7e7bd84f1))

### Enhancements made

- Remove `Install`, `Update` and `Uninstall` buttons from the extension manager UI [#11751](https://github.com/jupyterlab/jupyterlab/pull/11751) ([@jtpio](https://github.com/jtpio))
- Add JSX CodeMirror mode [#11666](https://github.com/jupyterlab/jupyterlab/pull/11666) ([@krassowski](https://github.com/krassowski))
- Move the top area spacer to a different plugin [#11654](https://github.com/jupyterlab/jupyterlab/pull/11654) ([@jtpio](https://github.com/jtpio))
- Add `closeOnExit` terminal option [#11637](https://github.com/jupyterlab/jupyterlab/pull/11637) ([@davidbrochart](https://github.com/davidbrochart))
- Remove leading slash from console path [#11626](https://github.com/jupyterlab/jupyterlab/pull/11626) ([@davidbrochart](https://github.com/davidbrochart))
- Toggle side-by-side rendering for current notebook [#11608](https://github.com/jupyterlab/jupyterlab/pull/11608) ([@echarles](https://github.com/echarles))
- Allow to link factory to file type when adding it [#11540](https://github.com/jupyterlab/jupyterlab/pull/11540) ([@fcollonval](https://github.com/fcollonval))
- Use transform to quickly switch between tabs. [#11074](https://github.com/jupyterlab/jupyterlab/pull/11074) ([@fcollonval](https://github.com/fcollonval))

### Bugs fixed

- Fix semantic wrap words command [#11767](https://github.com/jupyterlab/jupyterlab/pull/11767) ([@fcollonval](https://github.com/fcollonval))
- Restore compact notebook layout on mobile [#11762](https://github.com/jupyterlab/jupyterlab/pull/11762) ([@jtpio](https://github.com/jtpio))
- Ensure browser attributes are set in plugin adding it [#11758](https://github.com/jupyterlab/jupyterlab/pull/11758) ([@fcollonval](https://github.com/fcollonval))
- Fix handling of disabled extensions [#11744](https://github.com/jupyterlab/jupyterlab/pull/11744) ([@jtpio](https://github.com/jtpio))
- Removing early bail out in ToC widget update [#11711](https://github.com/jupyterlab/jupyterlab/pull/11711) ([@schmidi314](https://github.com/schmidi314))
- updates debugger icon css to work with white panel background [#11688](https://github.com/jupyterlab/jupyterlab/pull/11688) ([@andrewfulton9](https://github.com/andrewfulton9))
- Ensure the dialog does not close if you drag outside by mistake [#11673](https://github.com/jupyterlab/jupyterlab/pull/11673) ([@echarles](https://github.com/echarles))
- Add JSX CodeMirror mode [#11666](https://github.com/jupyterlab/jupyterlab/pull/11666) ([@krassowski](https://github.com/krassowski))

### Maintenance and upkeep improvements

- Remove the `jedi` pin on CI [#11771](https://github.com/jupyterlab/jupyterlab/pull/11771) ([@jtpio](https://github.com/jtpio))
- Fix integrity failure on CI [#11770](https://github.com/jupyterlab/jupyterlab/pull/11770) ([@jtpio](https://github.com/jtpio))
- Remove deprecated `KarmaTestApp` and `JestApp` [#11742](https://github.com/jupyterlab/jupyterlab/pull/11742) ([@jtpio](https://github.com/jtpio))
- Remove the `Promise.allSettled` polyfill [#11741](https://github.com/jupyterlab/jupyterlab/pull/11741) ([@jtpio](https://github.com/jtpio))
- Drop support for Python 3.6 [#11740](https://github.com/jupyterlab/jupyterlab/pull/11740) ([@jtpio](https://github.com/jtpio))
- Update `lighthouse` dependency in `@jupyterlab/testutils` [#11739](https://github.com/jupyterlab/jupyterlab/pull/11739) ([@jtpio](https://github.com/jtpio))
- Remove custom type definitions for `sort-package-json` [#11712](https://github.com/jupyterlab/jupyterlab/pull/11712) ([@jtpio](https://github.com/jtpio))
- Update typedoc to `0.22.10` [#11707](https://github.com/jupyterlab/jupyterlab/pull/11707) ([@hbcarlos](https://github.com/hbcarlos))
- Drop support for `externalExtensions` [#11705](https://github.com/jupyterlab/jupyterlab/pull/11705) ([@jtpio](https://github.com/jtpio))
- Remove the `watch` dependency from the examples [#11697](https://github.com/jupyterlab/jupyterlab/pull/11697) ([@jtpio](https://github.com/jtpio))
- Bump nth-check from 2.0.0 to 2.0.1 [#11695](https://github.com/jupyterlab/jupyterlab/pull/11695) ([@dependabot](https://github.com/dependabot))
- Remove references to `blueprintjs` in `ensure-repo` [#11694](https://github.com/jupyterlab/jupyterlab/pull/11694) ([@jtpio](https://github.com/jtpio))
- Remove the `add:sibling` script [#11685](https://github.com/jupyterlab/jupyterlab/pull/11685) ([@jtpio](https://github.com/jtpio))
- Remove the `create:theme` script [#11683](https://github.com/jupyterlab/jupyterlab/pull/11683) ([@jtpio](https://github.com/jtpio))
- Remove Storybook [#11649](https://github.com/jupyterlab/jupyterlab/pull/11649) ([@jtpio](https://github.com/jtpio))
- Drop testing Python 3.6, test on Python 3.10 [#11646](https://github.com/jupyterlab/jupyterlab/pull/11646) ([@jtpio](https://github.com/jtpio))
- pyproject.toml: clarify build system version [#11642](https://github.com/jupyterlab/jupyterlab/pull/11642) ([@adamjstewart](https://github.com/adamjstewart))
- Add test for `benchmark.distributionChange` [#11573](https://github.com/jupyterlab/jupyterlab/pull/11573) ([@fcollonval](https://github.com/fcollonval))
- Bump `url-parse~1.5.4` [#10755](https://github.com/jupyterlab/jupyterlab/pull/10755) ([@krassowski](https://github.com/krassowski))

### Documentation improvements

- Add text on how to run it in a dir other than home [#11761](https://github.com/jupyterlab/jupyterlab/pull/11761) ([@TheOtherRealm](https://github.com/TheOtherRealm))
- Use shields.io badge for Gitpod editor [#11750](https://github.com/jupyterlab/jupyterlab/pull/11750) ([@krassowski](https://github.com/krassowski))
- Encourage new contributors to send draft PR over asking for permission [#11746](https://github.com/jupyterlab/jupyterlab/pull/11746) ([@krassowski](https://github.com/krassowski))
- Remove deprecated `KarmaTestApp` and `JestApp` [#11742](https://github.com/jupyterlab/jupyterlab/pull/11742) ([@jtpio](https://github.com/jtpio))
- Fix formatting in extension migration docs [#11706](https://github.com/jupyterlab/jupyterlab/pull/11706) ([@jtpio](https://github.com/jtpio))
- Drop support for `externalExtensions` [#11705](https://github.com/jupyterlab/jupyterlab/pull/11705) ([@jtpio](https://github.com/jtpio))
- Remove the `add:sibling` script [#11685](https://github.com/jupyterlab/jupyterlab/pull/11685) ([@jtpio](https://github.com/jtpio))
- Remove the `create:theme` script [#11683](https://github.com/jupyterlab/jupyterlab/pull/11683) ([@jtpio](https://github.com/jtpio))
- Make `ILayoutRestorer` optional in the extension tutorial [#11677](https://github.com/jupyterlab/jupyterlab/pull/11677) ([@jtpio](https://github.com/jtpio))
- Fix changelog link [#11668](https://github.com/jupyterlab/jupyterlab/pull/11668) ([@krassowski](https://github.com/krassowski))
- Triage documentation [#11661](https://github.com/jupyterlab/jupyterlab/pull/11661) ([@JasonWeill](https://github.com/JasonWeill))
- Move the top area spacer to a different plugin [#11654](https://github.com/jupyterlab/jupyterlab/pull/11654) ([@jtpio](https://github.com/jtpio))

### API and Breaking Changes

- Remove deprecated `KarmaTestApp` and `JestApp` [#11742](https://github.com/jupyterlab/jupyterlab/pull/11742) ([@jtpio](https://github.com/jtpio))
- Remove the `add:sibling` script [#11685](https://github.com/jupyterlab/jupyterlab/pull/11685) ([@jtpio](https://github.com/jtpio))
- Remove the `create:theme` script [#11683](https://github.com/jupyterlab/jupyterlab/pull/11683) ([@jtpio](https://github.com/jtpio))
- Add `closeOnExit` terminal option [#11637](https://github.com/jupyterlab/jupyterlab/pull/11637) ([@davidbrochart](https://github.com/davidbrochart))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-12-09&to=2022-01-04&type=c))

[@adamjstewart](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aadamjstewart+updated%3A2021-12-09..2022-01-04&type=Issues) | [@andrewfulton9](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aandrewfulton9+updated%3A2021-12-09..2022-01-04&type=Issues) | [@bollwyvl](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Abollwyvl+updated%3A2021-12-09..2022-01-04&type=Issues) | [@davidbrochart](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adavidbrochart+updated%3A2021-12-09..2022-01-04&type=Issues) | [@dependabot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adependabot+updated%3A2021-12-09..2022-01-04&type=Issues) | [@echarles](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aecharles+updated%3A2021-12-09..2022-01-04&type=Issues) | [@ellisonbg](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aellisonbg+updated%3A2021-12-09..2022-01-04&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2021-12-09..2022-01-04&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2021-12-09..2022-01-04&type=Issues) | [@hbcarlos](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahbcarlos+updated%3A2021-12-09..2022-01-04&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2021-12-09..2022-01-04&type=Issues) | [@JohanMabille](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AJohanMabille+updated%3A2021-12-09..2022-01-04&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2021-12-09..2022-01-04&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2021-12-09..2022-01-04&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2021-12-09..2022-01-04&type=Issues) | [@JasonWeill](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AJasonWeill+updated%3A2021-12-09..2022-01-04&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2021-12-09..2022-01-04&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2021-12-09..2022-01-04&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2021-12-09..2022-01-04&type=Issues) | [@schmidi314](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aschmidi314+updated%3A2021-12-09..2022-01-04&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2021-12-09..2022-01-04&type=Issues)

## 4.0.0a17

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v4.0.0a16...969fa5d674931a89322d60c7e8c5bf80752f6cdd))

### Enhancements made

- Specifying print CSS rules for notebooks [#11635](https://github.com/jupyterlab/jupyterlab/pull/11635) ([@SylvainCorlay](https://github.com/SylvainCorlay))
- Add a user package to represent the current connected user [#11443](https://github.com/jupyterlab/jupyterlab/pull/11443) ([@hbcarlos](https://github.com/hbcarlos))

### Bugs fixed

- Fix menu items for toc [#11622](https://github.com/jupyterlab/jupyterlab/pull/11622) ([@fcollonval](https://github.com/fcollonval))

### Maintenance and upkeep improvements

- Bump nth-check from 2.0.0 to 2.0.1 in /jupyterlab/staging [#11629](https://github.com/jupyterlab/jupyterlab/pull/11629) ([@dependabot](https://github.com/dependabot))

- Update to TypeScript 4.5 [#11594](https://github.com/jupyterlab/jupyterlab/pull/11594) ([@jtpio](https://github.com/jtpio))

- RTC shared model: Rename createCellFromType into createCellFromModel [#11538](https://github.com/jupyterlab/jupyterlab/pull/11538) ([@martinRenou](https://github.com/martinRenou))

- Make `NotebookPanel._onSave` private [#10420](https://github.com/jupyterlab/jupyterlab/pull/10420) ([@jtpio](https://github.com/jtpio))

- Fix menu items for toc [#11622](https://github.com/jupyterlab/jupyterlab/pull/11622) ([@fcollonval](https://github.com/fcollonval))

- RTC shared model: Rename createCellFromType into createCellFromModel [#11538](https://github.com/jupyterlab/jupyterlab/pull/11538) ([@martinRenou](https://github.com/martinRenou))

- Add a user package to represent the current connected user [#11443](https://github.com/jupyterlab/jupyterlab/pull/11443) ([@hbcarlos](https://github.com/hbcarlos))

- Make `NotebookPanel._onSave` private [#10420](https://github.com/jupyterlab/jupyterlab/pull/10420) ([@jtpio](https://github.com/jtpio))

### API and Breaking Changes

- Fix menu items for toc [#11622](https://github.com/jupyterlab/jupyterlab/pull/11622) ([@fcollonval](https://github.com/fcollonval))
- RTC shared model: Rename createCellFromType into createCellFromModel [#11538](https://github.com/jupyterlab/jupyterlab/pull/11538) ([@martinRenou](https://github.com/martinRenou))
- Make `NotebookPanel._onSave` private [#10420](https://github.com/jupyterlab/jupyterlab/pull/10420) ([@jtpio](https://github.com/jtpio))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-12-07&to=2021-12-09&type=c))

[@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2021-12-07..2021-12-09&type=Issues) | [@dependabot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adependabot+updated%3A2021-12-07..2021-12-09&type=Issues) | [@ellisonbg](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aellisonbg+updated%3A2021-12-07..2021-12-09&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2021-12-07..2021-12-09&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2021-12-07..2021-12-09&type=Issues) | [@hbcarlos](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahbcarlos+updated%3A2021-12-07..2021-12-09&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2021-12-07..2021-12-09&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2021-12-07..2021-12-09&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2021-12-07..2021-12-09&type=Issues) | [@martinRenou](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AmartinRenou+updated%3A2021-12-07..2021-12-09&type=Issues) | [@SylvainCorlay](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3ASylvainCorlay+updated%3A2021-12-07..2021-12-09&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2021-12-07..2021-12-09&type=Issues)

## 4.0.0a16

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v4.0.0a15...17cf5fcd5caf563a55b811e5df6377db612f6cd3))

### Enhancements made

- Increase title width in simple mode [#11546](https://github.com/jupyterlab/jupyterlab/pull/11546) ([@SylvainCorlay](https://github.com/SylvainCorlay))
- User defined default viewer take precedence for rendered factory [#11541](https://github.com/jupyterlab/jupyterlab/pull/11541) ([@fcollonval](https://github.com/fcollonval))
- Add side-by-side rendering as global setting [#11533](https://github.com/jupyterlab/jupyterlab/pull/11533) ([@jess-x](https://github.com/jess-x))
- Feature/optional hidden cells button (v2) [#11519](https://github.com/jupyterlab/jupyterlab/pull/11519) ([@schmidi314](https://github.com/schmidi314))
- Attempt removing use of flexbox in the notebook DOM [#11508](https://github.com/jupyterlab/jupyterlab/pull/11508) ([@SylvainCorlay](https://github.com/SylvainCorlay))
- Tweak CSS for scrolled outputs [#11478](https://github.com/jupyterlab/jupyterlab/pull/11478) ([@jtpio](https://github.com/jtpio))
- Recommend trying prebuilt extension version in the build failure dialog [#11476](https://github.com/jupyterlab/jupyterlab/pull/11476) ([@krassowski](https://github.com/krassowski))
- Makes restorer parameter optional in toc-extension [#11445](https://github.com/jupyterlab/jupyterlab/pull/11445) ([@JasonWeill](https://github.com/JasonWeill))
- perf: scroll active toc item into view [#11413](https://github.com/jupyterlab/jupyterlab/pull/11413) ([@skyetim](https://github.com/skyetim))
- Set default ui font to `system-ui` [#11388](https://github.com/jupyterlab/jupyterlab/pull/11388) ([@jasongrout](https://github.com/jasongrout))
- Add a command to open a file from a URL [#11387](https://github.com/jupyterlab/jupyterlab/pull/11387) ([@jtpio](https://github.com/jtpio))
- Force semantic commands to use command [#11386](https://github.com/jupyterlab/jupyterlab/pull/11386) ([@fcollonval](https://github.com/fcollonval))
- Creates a new accordion panel with toolbar in the ui-components package [#11369](https://github.com/jupyterlab/jupyterlab/pull/11369) ([@hbcarlos](https://github.com/hbcarlos))
- Toc running cell indicator [#11356](https://github.com/jupyterlab/jupyterlab/pull/11356) ([@andrewfulton9](https://github.com/andrewfulton9))

### Bugs fixed

- overrides.json definition takes precedence [#11610](https://github.com/jupyterlab/jupyterlab/pull/11610) ([@fcollonval](https://github.com/fcollonval))
- Fix markdown benchmark snapshot [#11575](https://github.com/jupyterlab/jupyterlab/pull/11575) ([@fcollonval](https://github.com/fcollonval))
- Increase notebook-cell margin in side-by-side mode [#11539](https://github.com/jupyterlab/jupyterlab/pull/11539) ([@jess-x](https://github.com/jess-x))
- Cell YModel: Fix setAttachment method [#11529](https://github.com/jupyterlab/jupyterlab/pull/11529) ([@martinRenou](https://github.com/martinRenou))
- Support file type extension with upper case [#11526](https://github.com/jupyterlab/jupyterlab/pull/11526) ([@fcollonval](https://github.com/fcollonval))
- Sync dirty property between clients [#11525](https://github.com/jupyterlab/jupyterlab/pull/11525) ([@hbcarlos](https://github.com/hbcarlos))
- Allow cross-file anchors with leading number [#11517](https://github.com/jupyterlab/jupyterlab/pull/11517) ([@loichuder](https://github.com/loichuder))
- Update `sanitize-html` pin to `3.5.3` [#11510](https://github.com/jupyterlab/jupyterlab/pull/11510) ([@krassowski](https://github.com/krassowski))
- Connecting toggleCollapsedSignal to handler right at creation of Mark… [#11505](https://github.com/jupyterlab/jupyterlab/pull/11505) ([@schmidi314](https://github.com/schmidi314))
- Update ModelDB metadata when switching the shared model [#11493](https://github.com/jupyterlab/jupyterlab/pull/11493) ([@hbcarlos](https://github.com/hbcarlos))
- Fix Tex highlights affecting Markdown with standalone `$` [#11488](https://github.com/jupyterlab/jupyterlab/pull/11488) ([@krassowski](https://github.com/krassowski))
- Fix malformed fenced code block Markdown rendering [#11479](https://github.com/jupyterlab/jupyterlab/pull/11479) ([@krassowski](https://github.com/krassowski))
- Add background to the reference iframes to fix contrast [#11477](https://github.com/jupyterlab/jupyterlab/pull/11477) ([@krassowski](https://github.com/krassowski))
- Fix `undomanager` paste regression - fixes #10928 [#11471](https://github.com/jupyterlab/jupyterlab/pull/11471) ([@dmonad](https://github.com/dmonad))
- Only show the head of the outputs and ensure iopub outputs are correctly displayed [#11457](https://github.com/jupyterlab/jupyterlab/pull/11457) ([@echarles](https://github.com/echarles))
- regenerate server connection settings for printing [#11454](https://github.com/jupyterlab/jupyterlab/pull/11454) ([@mbektas](https://github.com/mbektas))
- Fix json schema for kernel status settings [#11451](https://github.com/jupyterlab/jupyterlab/pull/11451) ([@fcollonval](https://github.com/fcollonval))
- Do not update contextual help inspector if there would be no change. [#11447](https://github.com/jupyterlab/jupyterlab/pull/11447) ([@jasongrout](https://github.com/jasongrout))
- Handle relative paths to `themePath` and `schemaDir` [#11427](https://github.com/jupyterlab/jupyterlab/pull/11427) ([@jtpio](https://github.com/jtpio))

### Maintenance and upkeep improvements

- Fix Benchmark tests (revert #11607) [#11623](https://github.com/jupyterlab/jupyterlab/pull/11623) ([@0x2b3bfa0](https://github.com/0x2b3bfa0))

- Benchmark tests broken following update of NodeJS in ubuntu image [#11607](https://github.com/jupyterlab/jupyterlab/pull/11607) ([@fcollonval](https://github.com/fcollonval))

- Small issues on tests [#11605](https://github.com/jupyterlab/jupyterlab/pull/11605) ([@hbcarlos](https://github.com/hbcarlos))

- Use `maintainer-tools` base setup action [#11595](https://github.com/jupyterlab/jupyterlab/pull/11595) ([@jtpio](https://github.com/jtpio))

- Upgrade yarn to 1.22.17 [#11592](https://github.com/jupyterlab/jupyterlab/pull/11592) ([@jtpio](https://github.com/jtpio))

- Remove `@types/webpack-env` from `ui-components` [#11587](https://github.com/jupyterlab/jupyterlab/pull/11587) ([@jtpio](https://github.com/jtpio))

- Explicitly build JupyterLab in dev-mode [#11580](https://github.com/jupyterlab/jupyterlab/pull/11580) ([@fcollonval](https://github.com/fcollonval))

- Revert "Temporary fix for release checker pinning vega-embed" [#11578](https://github.com/jupyterlab/jupyterlab/pull/11578) ([@fcollonval](https://github.com/fcollonval))

- Update some dependencies [#11576](https://github.com/jupyterlab/jupyterlab/pull/11576) ([@jtpio](https://github.com/jtpio))

- Fix markdown benchmark snapshot [#11575](https://github.com/jupyterlab/jupyterlab/pull/11575) ([@fcollonval](https://github.com/fcollonval))

- Temporary fix for release checker pinning vega-embed [#11571](https://github.com/jupyterlab/jupyterlab/pull/11571) ([@fcollonval](https://github.com/fcollonval))

- postcss 8.4.0 breaks integrity 2 CI test [#11552](https://github.com/jupyterlab/jupyterlab/pull/11552) ([@fcollonval](https://github.com/fcollonval))

- Clean up Frontend Typings [#11537](https://github.com/jupyterlab/jupyterlab/pull/11537) ([@jtpio](https://github.com/jtpio))

- Bump tar from 4.4.13 to 4.4.19 [#11536](https://github.com/jupyterlab/jupyterlab/pull/11536) ([@dependabot](https://github.com/dependabot))

- Bump tmpl from 1.0.4 to 1.0.5 [#11512](https://github.com/jupyterlab/jupyterlab/pull/11512) ([@dependabot](https://github.com/dependabot))

- Bump semver-regex from 3.1.2 to 3.1.3 [#11511](https://github.com/jupyterlab/jupyterlab/pull/11511) ([@dependabot](https://github.com/dependabot))

- Update `sanitize-html` pin to `3.5.3` [#11510](https://github.com/jupyterlab/jupyterlab/pull/11510) ([@krassowski](https://github.com/krassowski))

- Increase notebook markdown test robustness [#11507](https://github.com/jupyterlab/jupyterlab/pull/11507) ([@fcollonval](https://github.com/fcollonval))

- Enforce labels on PRs [#11496](https://github.com/jupyterlab/jupyterlab/pull/11496) ([@blink1073](https://github.com/blink1073))

- Update release instructions and add video [#11487](https://github.com/jupyterlab/jupyterlab/pull/11487) ([@blink1073](https://github.com/blink1073))

- Reduce flake on non-LaTeX highlighting test [#11470](https://github.com/jupyterlab/jupyterlab/pull/11470) ([@krassowski](https://github.com/krassowski))

- Merge duplicated namespace [#11461](https://github.com/jupyterlab/jupyterlab/pull/11461) ([@fcollonval](https://github.com/fcollonval))

- Close answered issues more quickly if there are no updates. [#11446](https://github.com/jupyterlab/jupyterlab/pull/11446) ([@jasongrout](https://github.com/jasongrout))

- Use the root yarn.lock in staging when making a release. [#11433](https://github.com/jupyterlab/jupyterlab/pull/11433) ([@jasongrout](https://github.com/jasongrout))

- Enforce ascii-only identifiers [#11432](https://github.com/jupyterlab/jupyterlab/pull/11432) ([@jasongrout](https://github.com/jasongrout))

- Update Lumino to latest versions [#11425](https://github.com/jupyterlab/jupyterlab/pull/11425) ([@jasongrout](https://github.com/jasongrout))

- Document notebook DOM structure [#11609](https://github.com/jupyterlab/jupyterlab/pull/11609) ([@SylvainCorlay](https://github.com/SylvainCorlay))

- Update Affiliations [#11596](https://github.com/jupyterlab/jupyterlab/pull/11596) ([@blink1073](https://github.com/blink1073))

- Missing parenthesis [#11590](https://github.com/jupyterlab/jupyterlab/pull/11590) ([@davidbrochart](https://github.com/davidbrochart))

- Fix some keywords in typedoc [#11542](https://github.com/jupyterlab/jupyterlab/pull/11542) ([@fcollonval](https://github.com/fcollonval))

- Clean up Frontend Typings [#11537](https://github.com/jupyterlab/jupyterlab/pull/11537) ([@jtpio](https://github.com/jtpio))

- Fix docstring for cell footer [#11503](https://github.com/jupyterlab/jupyterlab/pull/11503) ([@martinRenou](https://github.com/martinRenou))

- Update screenshots and text for user interface docs [#11499](https://github.com/jupyterlab/jupyterlab/pull/11499) ([@krassowski](https://github.com/krassowski))

- Update release instructions and add video [#11487](https://github.com/jupyterlab/jupyterlab/pull/11487) ([@blink1073](https://github.com/blink1073))

- Update the release documentation to recommend using the Jupyter Releaser [#11440](https://github.com/jupyterlab/jupyterlab/pull/11440) ([@jtpio](https://github.com/jtpio))

### API and Breaking Changes

- Creates a new accordion panel with toolbar in the ui-components package [#11369](https://github.com/jupyterlab/jupyterlab/pull/11369) ([@hbcarlos](https://github.com/hbcarlos))
- Toc running cell indicator [#11356](https://github.com/jupyterlab/jupyterlab/pull/11356) ([@andrewfulton9](https://github.com/andrewfulton9))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-11-09&to=2021-12-07&type=c))

[@0x2b3bfa0](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3A0x2b3bfa0+updated%3A2021-11-09..2021-12-07&type=Issues) | [@andrewfulton9](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aandrewfulton9+updated%3A2021-11-09..2021-12-07&type=Issues) | [@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2021-11-09..2021-12-07&type=Issues) | [@bollwyvl](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Abollwyvl+updated%3A2021-11-09..2021-12-07&type=Issues) | [@davidbrochart](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adavidbrochart+updated%3A2021-11-09..2021-12-07&type=Issues) | [@dependabot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adependabot+updated%3A2021-11-09..2021-12-07&type=Issues) | [@dmonad](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Admonad+updated%3A2021-11-09..2021-12-07&type=Issues) | [@echarles](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aecharles+updated%3A2021-11-09..2021-12-07&type=Issues) | [@ellisonbg](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aellisonbg+updated%3A2021-11-09..2021-12-07&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2021-11-09..2021-12-07&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2021-11-09..2021-12-07&type=Issues) | [@hbcarlos](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahbcarlos+updated%3A2021-11-09..2021-12-07&type=Issues) | [@isabela-pf](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aisabela-pf+updated%3A2021-11-09..2021-12-07&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2021-11-09..2021-12-07&type=Issues) | [@jess-x](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajess-x+updated%3A2021-11-09..2021-12-07&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2021-11-09..2021-12-07&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2021-11-09..2021-12-07&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2021-11-09..2021-12-07&type=Issues) | [@JasonWeill](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AJasonWeill+updated%3A2021-11-09..2021-12-07&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2021-11-09..2021-12-07&type=Issues) | [@loichuder](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aloichuder+updated%3A2021-11-09..2021-12-07&type=Issues) | [@martinRenou](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AmartinRenou+updated%3A2021-11-09..2021-12-07&type=Issues) | [@mbektas](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ambektas+updated%3A2021-11-09..2021-12-07&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2021-11-09..2021-12-07&type=Issues) | [@schmidi314](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aschmidi314+updated%3A2021-11-09..2021-12-07&type=Issues) | [@skyetim](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Askyetim+updated%3A2021-11-09..2021-12-07&type=Issues) | [@SylvainCorlay](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3ASylvainCorlay+updated%3A2021-11-09..2021-12-07&type=Issues) | [@trungleduc](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Atrungleduc+updated%3A2021-11-09..2021-12-07&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2021-11-09..2021-12-07&type=Issues) | [@williamstein](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awilliamstein+updated%3A2021-11-09..2021-12-07&type=Issues) | [@yuvipanda](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ayuvipanda+updated%3A2021-11-09..2021-12-07&type=Issues)

## 4.0.0a15

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v4.0.0a14...1d7533f0f67cb9e32307ff6b9347a8e814bb55d7))

### Enhancements made

- Remove `Blueprint` [#11173](https://github.com/jupyterlab/jupyterlab/pull/11173) ([@fcollonval](https://github.com/fcollonval))
- Add execution progress indicator [#10730](https://github.com/jupyterlab/jupyterlab/pull/10730) ([@trungleduc](https://github.com/trungleduc))

### Bugs fixed

- Bump Yjs dependencies and fix modeldb overwriting yjs content [#11398](https://github.com/jupyterlab/jupyterlab/pull/11398) ([@dmonad](https://github.com/dmonad))
- Make `orig_nbformat` optional #11005 [#11370](https://github.com/jupyterlab/jupyterlab/pull/11370) ([@nanoant](https://github.com/nanoant))
- Fix Handling of WebSocket Startup Errors [#11358](https://github.com/jupyterlab/jupyterlab/pull/11358) ([@blink1073](https://github.com/blink1073))
- Only trigger dirty status update on value changes [#11346](https://github.com/jupyterlab/jupyterlab/pull/11346) ([@krassowski](https://github.com/krassowski))
- Updated dialog with text to a reasonable width [#11331](https://github.com/jupyterlab/jupyterlab/pull/11331) ([@3coins](https://github.com/3coins))
- Fix for terminal theme style [#11291](https://github.com/jupyterlab/jupyterlab/pull/11291) ([@3coins](https://github.com/3coins))

### Maintenance and upkeep improvements

- Makes `ILabShell` optional in `toc` extension [#11420](https://github.com/jupyterlab/jupyterlab/pull/11420) ([@JasonWeill](https://github.com/JasonWeill))
- Add `jupyterlab` prefix to the `Galata` artifacts [#11405](https://github.com/jupyterlab/jupyterlab/pull/11405) ([@jtpio](https://github.com/jtpio))
- Fix rebuilding JLab in benchmark CI [#11399](https://github.com/jupyterlab/jupyterlab/pull/11399) ([@fcollonval](https://github.com/fcollonval))
- Modify dump of `webpack` config to include `RegEx` expressions [#11397](https://github.com/jupyterlab/jupyterlab/pull/11397) ([@rfox12](https://github.com/rfox12))
- Fix `release_test` [#11390](https://github.com/jupyterlab/jupyterlab/pull/11390) ([@fcollonval](https://github.com/fcollonval))
- Removed `cat package.json` [#11372](https://github.com/jupyterlab/jupyterlab/pull/11372) ([@ceesu](https://github.com/ceesu))
- Fix comment on PR action [#11354](https://github.com/jupyterlab/jupyterlab/pull/11354) ([@fcollonval](https://github.com/fcollonval))
- Relax `@playright/test` dependency in Galata [#11112](https://github.com/jupyterlab/jupyterlab/pull/11112) ([@jtpio](https://github.com/jtpio))

### Documentation improvements

- Improve documentation on galata setup [#11391](https://github.com/jupyterlab/jupyterlab/pull/11391) ([@fcollonval](https://github.com/fcollonval))
- Fix links [#11378](https://github.com/jupyterlab/jupyterlab/pull/11378) ([@krassowski](https://github.com/krassowski))
- Adds command to docs to install `canvas` dependencies [#11365](https://github.com/jupyterlab/jupyterlab/pull/11365) ([@JasonWeill](https://github.com/JasonWeill))
- Recommend providing screenshots for translators [#11357](https://github.com/jupyterlab/jupyterlab/pull/11357) ([@krassowski](https://github.com/krassowski))
- Fix outdated `clearSignalData` reference (now `Signal.clearData`) [#11339](https://github.com/jupyterlab/jupyterlab/pull/11339) ([@krassowski](https://github.com/krassowski))
- Remove `Blueprint` [#11173](https://github.com/jupyterlab/jupyterlab/pull/11173) ([@fcollonval](https://github.com/fcollonval))
- Adds recommendation to install `Prettier` extension [#11363](https://github.com/jupyterlab/jupyterlab/pull/11363) ([@JasonWeill](https://github.com/JasonWeill))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-10-20&to=2021-11-09&type=c))

[@3coins](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3A3coins+updated%3A2021-10-20..2021-11-09&type=Issues) | [@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2021-10-20..2021-11-09&type=Issues) | [@ceesu](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aceesu+updated%3A2021-10-20..2021-11-09&type=Issues) | [@davidbrochart](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adavidbrochart+updated%3A2021-10-20..2021-11-09&type=Issues) | [@dmonad](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Admonad+updated%3A2021-10-20..2021-11-09&type=Issues) | [@ellisonbg](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aellisonbg+updated%3A2021-10-20..2021-11-09&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2021-10-20..2021-11-09&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2021-10-20..2021-11-09&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2021-10-20..2021-11-09&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2021-10-20..2021-11-09&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2021-10-20..2021-11-09&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2021-10-20..2021-11-09&type=Issues) | [@JasonWeill](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AJasonWeill+updated%3A2021-10-20..2021-11-09&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2021-10-20..2021-11-09&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2021-10-20..2021-11-09&type=Issues) | [@nanoant](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ananoant+updated%3A2021-10-20..2021-11-09&type=Issues) | [@rfox12](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Arfox12+updated%3A2021-10-20..2021-11-09&type=Issues) | [@trungleduc](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Atrungleduc+updated%3A2021-10-20..2021-11-09&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2021-10-20..2021-11-09&type=Issues) | [@williamstein](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awilliamstein+updated%3A2021-10-20..2021-11-09&type=Issues) | [@Zsailer](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AZsailer+updated%3A2021-10-20..2021-11-09&type=Issues)

## 4.0.0a14

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v4.0.0a13...8c67f5949af19503e447a83584885f919e115c47))

### Enhancements made

- Added button theme variables, updated button style [#11264](https://github.com/jupyterlab/jupyterlab/pull/11264) ([@3coins](https://github.com/3coins))

### Bugs fixed

- Fix for debugger not working for scripts [#11311](https://github.com/jupyterlab/jupyterlab/pull/11311) ([@3coins](https://github.com/3coins))
- Added handling of '\\r' ended files [#11310](https://github.com/jupyterlab/jupyterlab/pull/11310) ([@lucabarcelos](https://github.com/lucabarcelos))
- Emit `indexChanged` on model state updates [#11298](https://github.com/jupyterlab/jupyterlab/pull/11298) ([@krassowski](https://github.com/krassowski))
- Fix ANSI vs URL conflict, prefix `www.` with `https://` [#11272](https://github.com/jupyterlab/jupyterlab/pull/11272) ([@krassowski](https://github.com/krassowski))
- Normalize cell source \\r line endings [#11271](https://github.com/jupyterlab/jupyterlab/pull/11271) ([@jasongrout](https://github.com/jasongrout))

### Maintenance and upkeep improvements

- Pass version spec as an input [#11322](https://github.com/jupyterlab/jupyterlab/pull/11322) ([@jtpio](https://github.com/jtpio))
- Added debugger UI tests for scripts [#11319](https://github.com/jupyterlab/jupyterlab/pull/11319) ([@3coins](https://github.com/3coins))
- Update the latest `@lumino` packages [#11281](https://github.com/jupyterlab/jupyterlab/pull/11281) ([@jtpio](https://github.com/jtpio))
- Extension upgrade script: Avoid throwing exceptions for certain package.json files [#11278](https://github.com/jupyterlab/jupyterlab/pull/11278) ([@ammgws](https://github.com/ammgws))
- UI tests for debugger [#11250](https://github.com/jupyterlab/jupyterlab/pull/11250) ([@3coins](https://github.com/3coins))
- Run comparative benchmark [#11128](https://github.com/jupyterlab/jupyterlab/pull/11128) ([@fcollonval](https://github.com/fcollonval))

### Documentation improvements

- Add note on weekly dev notes [#11317](https://github.com/jupyterlab/jupyterlab/pull/11317) ([@fcollonval](https://github.com/fcollonval))
- amend changelog - follow up issue 11304 [#11309](https://github.com/jupyterlab/jupyterlab/pull/11309) ([@achimgaedke](https://github.com/achimgaedke))
- update the binder sha to the latest demo version [#11302](https://github.com/jupyterlab/jupyterlab/pull/11302) ([@akhmerov](https://github.com/akhmerov))
- Add note on the server parameter for hidden files. [#11293](https://github.com/jupyterlab/jupyterlab/pull/11293) ([@fcollonval](https://github.com/fcollonval))
- Clarify sidebar switching settings [#11270](https://github.com/jupyterlab/jupyterlab/pull/11270) ([@joelostblom](https://github.com/joelostblom))
- Add missing changelog entry from 4.0.0a13 [#11268](https://github.com/jupyterlab/jupyterlab/pull/11268) ([@blink1073](https://github.com/blink1073))
- Run comparative benchmark [#11128](https://github.com/jupyterlab/jupyterlab/pull/11128) ([@fcollonval](https://github.com/fcollonval))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-10-08&to=2021-10-20&type=c))

[@3coins](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3A3coins+updated%3A2021-10-08..2021-10-20&type=Issues) | [@achimgaedke](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aachimgaedke+updated%3A2021-10-08..2021-10-20&type=Issues) | [@akhmerov](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aakhmerov+updated%3A2021-10-08..2021-10-20&type=Issues) | [@ammgws](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aammgws+updated%3A2021-10-08..2021-10-20&type=Issues) | [@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2021-10-08..2021-10-20&type=Issues) | [@ellisonbg](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aellisonbg+updated%3A2021-10-08..2021-10-20&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2021-10-08..2021-10-20&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2021-10-08..2021-10-20&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2021-10-08..2021-10-20&type=Issues) | [@joelostblom](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajoelostblom+updated%3A2021-10-08..2021-10-20&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2021-10-08..2021-10-20&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2021-10-08..2021-10-20&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2021-10-08..2021-10-20&type=Issues) | [@lucabarcelos](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Alucabarcelos+updated%3A2021-10-08..2021-10-20&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2021-10-08..2021-10-20&type=Issues)

## 4.0.0a13

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v4.0.0a12...e35f100082cbfed37eeca587d1b87ae79ef418ee))

### Bugs fixed

- Fix Webpack crypto handling [#11249](https://github.com/jupyterlab/jupyterlab/pull/11249) ([@blink1073](https://github.com/blink1073))

### Maintenance and upkeep improvements

- Add documentation label to markdown files [#11262](https://github.com/jupyterlab/jupyterlab/pull/11262) ([@blink1073](https://github.com/blink1073))
- Fix nbconvert compatibility with fips-enabled openssl [#11261](https://github.com/jupyterlab/jupyterlab/pull/11261) ([@blink1073](https://github.com/blink1073))

### Documentation improvements

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-10-06&to=2021-10-08&type=c))

[@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2021-10-06..2021-10-08&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2021-10-06..2021-10-08&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2021-10-06..2021-10-08&type=Issues)

## 4.0.0a12

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v4.0.0a11...cb507227fa1673c2e7d787873f639d0ac13c2023))

### Enhancements made

- Enable document wide history tracking [#10949](https://github.com/jupyterlab/jupyterlab/pull/10949) ([@echarles](https://github.com/echarles))
- Make check margin between last modified timestamps on disk and client configurable [#11153](https://github.com/jupyterlab/jupyterlab/pull/11153) ([@ph-ph](https://github.com/ph-ph))
- Add a menu entry to show/hide hidden files in the filebrowser [#10769](https://github.com/jupyterlab/jupyterlab/pull/10769) ([@loichuder](https://github.com/loichuder))
- Add option to choose checkpoint [#9670](https://github.com/jupyterlab/jupyterlab/pull/9670) ([@hMED22](https://github.com/hMED22))

### Bugs fixed

- Use standard hash type in webpack build [#11234](https://github.com/jupyterlab/jupyterlab/pull/11234) ([@blink1073](https://github.com/blink1073))
- Remove format from fetching options if null [#11229](https://github.com/jupyterlab/jupyterlab/pull/11229) ([@loichuder](https://github.com/loichuder))
- don't continuously `cd('/')` when already in / [#11219](https://github.com/jupyterlab/jupyterlab/pull/11219) ([@minrk](https://github.com/minrk))
- Properly reset layout when toggling simple mode. [#11203](https://github.com/jupyterlab/jupyterlab/pull/11203) ([@jasongrout](https://github.com/jasongrout))
- Fix renaming issue in collaborative mode [#11197](https://github.com/jupyterlab/jupyterlab/pull/11197) ([@dmonad](https://github.com/dmonad))
- Restore workspace and open _tree_ path [#11168](https://github.com/jupyterlab/jupyterlab/pull/11168) ([@fcollonval](https://github.com/fcollonval))
- Share notebook's metadata [#11064](https://github.com/jupyterlab/jupyterlab/pull/11064) ([@hbcarlos](https://github.com/hbcarlos))

### Maintenance and upkeep improvements

- Run Linter [#11238](https://github.com/jupyterlab/jupyterlab/pull/11238) ([@blink1073](https://github.com/blink1073))
- Fix Release Check [#11218](https://github.com/jupyterlab/jupyterlab/pull/11218) ([@fcollonval](https://github.com/fcollonval))
- Check i18n will pass on zeroed patch pre-release version [#11214](https://github.com/jupyterlab/jupyterlab/pull/11214) ([@fcollonval](https://github.com/fcollonval))
- Handle case when JupyterHub returns 424 for not running server [#11205](https://github.com/jupyterlab/jupyterlab/pull/11205) ([@yuvipanda](https://github.com/yuvipanda))
- refactor window.open to make it work also in desktop app [#11202](https://github.com/jupyterlab/jupyterlab/pull/11202) ([@mbektas](https://github.com/mbektas))
- Rename "JupyterLab Theme" to "Theme" [#11198](https://github.com/jupyterlab/jupyterlab/pull/11198) ([@jtpio](https://github.com/jtpio))
- Use only context and id to check i18n [#11190](https://github.com/jupyterlab/jupyterlab/pull/11190) ([@fcollonval](https://github.com/fcollonval))
- Update webpack dependencies [#11184](https://github.com/jupyterlab/jupyterlab/pull/11184) ([@jtpio](https://github.com/jtpio))
- Correct galata repository urls [#11181](https://github.com/jupyterlab/jupyterlab/pull/11181) ([@fcollonval](https://github.com/fcollonval))
- Fix kernelspec logo handling [#11175](https://github.com/jupyterlab/jupyterlab/pull/11175) ([@jtpio](https://github.com/jtpio))
- Remove unused command id in the translation extension [#11164](https://github.com/jupyterlab/jupyterlab/pull/11164) ([@jtpio](https://github.com/jtpio))
- Resolve typing errors in kernel mocks [#11159](https://github.com/jupyterlab/jupyterlab/pull/11159) ([@ph-ph](https://github.com/ph-ph))

### Documentation improvements

### Other merged PRs

- Forwardport changelog entries [#11240](https://github.com/jupyterlab/jupyterlab/pull/11240) ([@blink1073](https://github.com/blink1073))
- Use disableDocumentWideUndoRedo instead of enableDocumentWideUndoRedo [#11215](https://github.com/jupyterlab/jupyterlab/pull/11215) ([@echarles](https://github.com/echarles))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-09-27&to=2021-10-06&type=c))

[@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2021-09-27..2021-10-06&type=Issues) | [@dmonad](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Admonad+updated%3A2021-09-27..2021-10-06&type=Issues) | [@echarles](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aecharles+updated%3A2021-09-27..2021-10-06&type=Issues) | [@ellisonbg](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aellisonbg+updated%3A2021-09-27..2021-10-06&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2021-09-27..2021-10-06&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2021-09-27..2021-10-06&type=Issues) | [@goanpeca](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agoanpeca+updated%3A2021-09-27..2021-10-06&type=Issues) | [@hbcarlos](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahbcarlos+updated%3A2021-09-27..2021-10-06&type=Issues) | [@hMED22](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AhMED22+updated%3A2021-09-27..2021-10-06&type=Issues) | [@isabela-pf](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aisabela-pf+updated%3A2021-09-27..2021-10-06&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2021-09-27..2021-10-06&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2021-09-27..2021-10-06&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2021-09-27..2021-10-06&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2021-09-27..2021-10-06&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2021-09-27..2021-10-06&type=Issues) | [@loichuder](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aloichuder+updated%3A2021-09-27..2021-10-06&type=Issues) | [@mbektas](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ambektas+updated%3A2021-09-27..2021-10-06&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2021-09-27..2021-10-06&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2021-09-27..2021-10-06&type=Issues) | [@minrk](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aminrk+updated%3A2021-09-27..2021-10-06&type=Issues) | [@ph-ph](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aph-ph+updated%3A2021-09-27..2021-10-06&type=Issues) | [@SylvainCorlay](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3ASylvainCorlay+updated%3A2021-09-27..2021-10-06&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2021-09-27..2021-10-06&type=Issues) | [@yuvipanda](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ayuvipanda+updated%3A2021-09-27..2021-10-06&type=Issues)

## 4.0.0a11

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v4.0.0a10...c6b14b6efc96043fb4e6af8cec5914a68d8db113))

### Enhancements made

- reuse cell id of cut cell on cut + paste [#11138](https://github.com/jupyterlab/jupyterlab/pull/11138) ([@smacke](https://github.com/smacke))
- Add ability to hide the header bar in simple mode [#11107](https://github.com/jupyterlab/jupyterlab/pull/11107) ([@fcollonval](https://github.com/fcollonval))
- Fetch translations via the `ServerConnection.ISettings` [#11091](https://github.com/jupyterlab/jupyterlab/pull/11091) ([@jtpio](https://github.com/jtpio))
- Add Side-by-side Rendering [#10648](https://github.com/jupyterlab/jupyterlab/pull/10648) ([@jess-x](https://github.com/jess-x))

### Bugs fixed

- Normalize notebook cell line endings to \\n [#11141](https://github.com/jupyterlab/jupyterlab/pull/11141) ([@jasongrout](https://github.com/jasongrout))
- Fix auto close brackets for console [#11137](https://github.com/jupyterlab/jupyterlab/pull/11137) ([@ohrely](https://github.com/ohrely))
- Improve the reactive toolbar [#11108](https://github.com/jupyterlab/jupyterlab/pull/11108) ([@fcollonval](https://github.com/fcollonval))
- use posix explicitly for PathExt [#11099](https://github.com/jupyterlab/jupyterlab/pull/11099) ([@mbektas](https://github.com/mbektas))
- Update the lock after every request [#11092](https://github.com/jupyterlab/jupyterlab/pull/11092) ([@hbcarlos](https://github.com/hbcarlos))

### Maintenance and upkeep improvements

- Fix the "Edit on GitHub" link [#11149](https://github.com/jupyterlab/jupyterlab/pull/11149) ([@krassowski](https://github.com/krassowski))
- Refactor `BenchmarkReporter` [#11090](https://github.com/jupyterlab/jupyterlab/pull/11090) ([@trungleduc](https://github.com/trungleduc))

### Documentation improvements

- fix up #11117 - typo in docs: page_config.json [#11152](https://github.com/jupyterlab/jupyterlab/pull/11152) ([@achimgaedke](https://github.com/achimgaedke))
- Fix the "Edit on GitHub" link [#11149](https://github.com/jupyterlab/jupyterlab/pull/11149) ([@krassowski](https://github.com/krassowski))
- Remove item from changelog that slips through [#11110](https://github.com/jupyterlab/jupyterlab/pull/11110) ([@fcollonval](https://github.com/fcollonval))
- Add a note on the Jupyter Releaser in the extension tutorial [#11085](https://github.com/jupyterlab/jupyterlab/pull/11085) ([@jtpio](https://github.com/jtpio))
- Simplify installation instructions in README [#10559](https://github.com/jupyterlab/jupyterlab/pull/10559) ([@chrisyeh96](https://github.com/chrisyeh96))

### Other merged PRs

- Bump nth-check from 2.0.0 to 2.0.1 in /jupyterlab/staging [#11109](https://github.com/jupyterlab/jupyterlab/pull/11109) ([@dependabot](https://github.com/dependabot))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-09-15&to=2021-09-27&type=c))

[@achimgaedke](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aachimgaedke+updated%3A2021-09-15..2021-09-27&type=Issues) | [@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2021-09-15..2021-09-27&type=Issues) | [@chrisyeh96](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Achrisyeh96+updated%3A2021-09-15..2021-09-27&type=Issues) | [@dependabot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adependabot+updated%3A2021-09-15..2021-09-27&type=Issues) | [@echarles](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aecharles+updated%3A2021-09-15..2021-09-27&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2021-09-15..2021-09-27&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2021-09-15..2021-09-27&type=Issues) | [@goanpeca](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agoanpeca+updated%3A2021-09-15..2021-09-27&type=Issues) | [@hbcarlos](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahbcarlos+updated%3A2021-09-15..2021-09-27&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2021-09-15..2021-09-27&type=Issues) | [@jess-x](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajess-x+updated%3A2021-09-15..2021-09-27&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2021-09-15..2021-09-27&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2021-09-15..2021-09-27&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2021-09-15..2021-09-27&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2021-09-15..2021-09-27&type=Issues) | [@mbektas](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ambektas+updated%3A2021-09-15..2021-09-27&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2021-09-15..2021-09-27&type=Issues) | [@ohrely](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aohrely+updated%3A2021-09-15..2021-09-27&type=Issues) | [@smacke](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Asmacke+updated%3A2021-09-15..2021-09-27&type=Issues) | [@trungleduc](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Atrungleduc+updated%3A2021-09-15..2021-09-27&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2021-09-15..2021-09-27&type=Issues)

## 4.0.0a10

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v4.0.0a9...52f961be656da60e2a39ef502de7991ee0436e26))

### Enhancements made

- Remove retry part from test folder name [#11070](https://github.com/jupyterlab/jupyterlab/pull/11070) ([@fcollonval](https://github.com/fcollonval))

### Bugs fixed

- Indent comments (#6957) [#11063](https://github.com/jupyterlab/jupyterlab/pull/11063) ([@josephrocca](https://github.com/josephrocca))
- Retain the rtc lock until the user releases it [#11026](https://github.com/jupyterlab/jupyterlab/pull/11026) ([@hbcarlos](https://github.com/hbcarlos))
- Fix user preferences not being considered for Text Editor [#10868](https://github.com/jupyterlab/jupyterlab/pull/10868) ([@Mithil467](https://github.com/Mithil467))
- Improve resizing behavior of debugger panels [#10653](https://github.com/jupyterlab/jupyterlab/pull/10653) ([@trungleduc](https://github.com/trungleduc))

### Maintenance and upkeep improvements

- Skip flaky debugger test [#11083](https://github.com/jupyterlab/jupyterlab/pull/11083) ([@fcollonval](https://github.com/fcollonval))
- Fix/duplicate-statement [#11082](https://github.com/jupyterlab/jupyterlab/pull/11082) ([@fcollonval](https://github.com/fcollonval))
- Revert "Constrain ipykernel version on CI" [#11076](https://github.com/jupyterlab/jupyterlab/pull/11076) ([@jtpio](https://github.com/jtpio))
- Check changes on translatable strings [#11036](https://github.com/jupyterlab/jupyterlab/pull/11036) ([@fcollonval](https://github.com/fcollonval))

### Documentation improvements

- Split settings schema for inclusion in documentation [#11067](https://github.com/jupyterlab/jupyterlab/pull/11067) ([@fcollonval](https://github.com/fcollonval))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-09-13&to=2021-09-15&type=c))

[@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2021-09-13..2021-09-15&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2021-09-13..2021-09-15&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2021-09-13..2021-09-15&type=Issues) | [@hbcarlos](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahbcarlos+updated%3A2021-09-13..2021-09-15&type=Issues) | [@josephrocca](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajosephrocca+updated%3A2021-09-13..2021-09-15&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2021-09-13..2021-09-15&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2021-09-13..2021-09-15&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2021-09-13..2021-09-15&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2021-09-13..2021-09-15&type=Issues) | [@Mithil467](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AMithil467+updated%3A2021-09-13..2021-09-15&type=Issues) | [@trungleduc](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Atrungleduc+updated%3A2021-09-13..2021-09-15&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2021-09-13..2021-09-15&type=Issues)

## 4.0.0a9

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v4.0.0a8...d103ccc3d16db524bed90fb1eebb6ce7616e224f))

### Enhancements made

- update inspector label [#11049](https://github.com/jupyterlab/jupyterlab/pull/11049) ([@legendb317](https://github.com/legendb317))

### Bugs fixed

- Use posix paths explicitly [#11031](https://github.com/jupyterlab/jupyterlab/pull/11031) ([@Mithil467](https://github.com/Mithil467))
- Adds the variable reference to the key of the component [#11029](https://github.com/jupyterlab/jupyterlab/pull/11029) ([@hbcarlos](https://github.com/hbcarlos))

### Maintenance and upkeep improvements

- Clean up bumpversion [#11056](https://github.com/jupyterlab/jupyterlab/pull/11056) ([@blink1073](https://github.com/blink1073))
- Use `details` block in benchmark report [#11054](https://github.com/jupyterlab/jupyterlab/pull/11054) ([@fcollonval](https://github.com/fcollonval))
- Constrain ipykernel version on CI [#11052](https://github.com/jupyterlab/jupyterlab/pull/11052) ([@fcollonval](https://github.com/fcollonval))
- Fix benchmark PR commenting for forks [#11047](https://github.com/jupyterlab/jupyterlab/pull/11047) ([@fcollonval](https://github.com/fcollonval))
- Fix prettier error [#11043](https://github.com/jupyterlab/jupyterlab/pull/11043) ([@fcollonval](https://github.com/fcollonval))
- Use JupyterLab Probot for Binder Links [#11039](https://github.com/jupyterlab/jupyterlab/pull/11039) ([@blink1073](https://github.com/blink1073))
- Make debugger jest test more robust [#11032](https://github.com/jupyterlab/jupyterlab/pull/11032) ([@fcollonval](https://github.com/fcollonval))
- Add benchmark tests [#10936](https://github.com/jupyterlab/jupyterlab/pull/10936) ([@fcollonval](https://github.com/fcollonval))

### API and Breaking Changes

- Add benchmark tests [#10936](https://github.com/jupyterlab/jupyterlab/pull/10936) ([@fcollonval](https://github.com/fcollonval))

### Other merged PRs

- Remove status bar item flickering [#11065](https://github.com/jupyterlab/jupyterlab/pull/11065) ([@fcollonval](https://github.com/fcollonval))
- use path.posix explicitly for URLs [#11048](https://github.com/jupyterlab/jupyterlab/pull/11048) ([@mbektas](https://github.com/mbektas))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-09-08&to=2021-09-13&type=c))

[@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2021-09-08..2021-09-13&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2021-09-08..2021-09-13&type=Issues) | [@github-actions](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agithub-actions+updated%3A2021-09-08..2021-09-13&type=Issues) | [@hbcarlos](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahbcarlos+updated%3A2021-09-08..2021-09-13&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2021-09-08..2021-09-13&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2021-09-08..2021-09-13&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2021-09-08..2021-09-13&type=Issues) | [@jupyterlab-probot](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-probot+updated%3A2021-09-08..2021-09-13&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2021-09-08..2021-09-13&type=Issues) | [@legendb317](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Alegendb317+updated%3A2021-09-08..2021-09-13&type=Issues) | [@mbektas](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ambektas+updated%3A2021-09-08..2021-09-13&type=Issues) | [@Mithil467](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AMithil467+updated%3A2021-09-08..2021-09-13&type=Issues)

## 4.0.0a8

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v4.0.0a7...094056ad2d728327dbeef26aabeee29ece584487))

### Bugs fixed

- use correct nbformat version - fixes #11005 [#11017](https://github.com/jupyterlab/jupyterlab/pull/11017) ([@dmonad](https://github.com/dmonad))
- Restore Copy shareable link use of shareUrl [#11011](https://github.com/jupyterlab/jupyterlab/pull/11011) ([@fcollonval](https://github.com/fcollonval))
- Fix ignored promise leading to incorrect initial tooltip position [#11010](https://github.com/jupyterlab/jupyterlab/pull/11010) ([@krassowski](https://github.com/krassowski))
- Add a guard to avoid kernel deadlock on multiple input request [#10792](https://github.com/jupyterlab/jupyterlab/pull/10792) ([@echarles](https://github.com/echarles))
- Translate factory names by adding `label` [#11006](https://github.com/jupyterlab/jupyterlab/pull/11006) ([@krassowski](https://github.com/krassowski))
- fix #10997 - increase max_message_size of websocket messages [#11003](https://github.com/jupyterlab/jupyterlab/pull/11003) ([@dmonad](https://github.com/dmonad))
- Fix typo in nbformat dialog [#11001](https://github.com/jupyterlab/jupyterlab/pull/11001) ([@davidbrochart](https://github.com/davidbrochart))
- Fix missing translation wrappers in the debugger [#10989](https://github.com/jupyterlab/jupyterlab/pull/10989) ([@krassowski](https://github.com/krassowski))

### Maintenance and upkeep improvements

- Cache ESLint Data [#11025](https://github.com/jupyterlab/jupyterlab/pull/11025) ([@blink1073](https://github.com/blink1073))
- Clean up notebook test utils [#11021](https://github.com/jupyterlab/jupyterlab/pull/11021) ([@fcollonval](https://github.com/fcollonval))
- Make Test Server Configurable [#11015](https://github.com/jupyterlab/jupyterlab/pull/11015) ([@fcollonval](https://github.com/fcollonval))
- Clean up handling of npm dist tag [#10999](https://github.com/jupyterlab/jupyterlab/pull/10999) ([@fcollonval](https://github.com/fcollonval))
- Fix version regex [#10994](https://github.com/jupyterlab/jupyterlab/pull/10994) ([@fcollonval](https://github.com/fcollonval))
- Move RankedMenu test to ui-components [#10992](https://github.com/jupyterlab/jupyterlab/pull/10992) ([@fcollonval](https://github.com/fcollonval))
- Fix link to Playwright fixtures in the galata README [#10988](https://github.com/jupyterlab/jupyterlab/pull/10988) ([@jtpio](https://github.com/jtpio))
- Change "Export Notebook As" to "Save and Export Notebook As" [#10904](https://github.com/jupyterlab/jupyterlab/pull/10904) ([@bsyouness](https://github.com/bsyouness))

### Documentation improvements

- Update documentation for internationalization [#11024](https://github.com/jupyterlab/jupyterlab/pull/11024) ([@fcollonval](https://github.com/fcollonval))
- Configure sphinx for gettext [#11022](https://github.com/jupyterlab/jupyterlab/pull/11022) ([@fcollonval](https://github.com/fcollonval))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-09-01&to=2021-09-08&type=c))

[@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2021-09-01..2021-09-08&type=Issues) | [@bsyouness](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Absyouness+updated%3A2021-09-01..2021-09-08&type=Issues) | [@davidbrochart](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adavidbrochart+updated%3A2021-09-01..2021-09-08&type=Issues) | [@dmonad](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Admonad+updated%3A2021-09-01..2021-09-08&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2021-09-01..2021-09-08&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2021-09-01..2021-09-08&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2021-09-01..2021-09-08&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2021-09-01..2021-09-08&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2021-09-01..2021-09-08&type=Issues)

## 4.0.0a7

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v4.0.0a6...0350c6e6cafa06e0a4903507524789d938b75710))

### Enhancements made

- Add editable selector [#10957](https://github.com/jupyterlab/jupyterlab/pull/10957) ([@krassowska](https://github.com/krassowska))
- Removed debug switch, added bug button state update [#10727](https://github.com/jupyterlab/jupyterlab/pull/10727) ([@3coins](https://github.com/3coins))
- Add debugger variable renderer based on mime type [#10299](https://github.com/jupyterlab/jupyterlab/pull/10299) ([@fcollonval](https://github.com/fcollonval))

### Bugs fixed

- Remove the non-null assertion on `IDebugger.ISources` [#10976](https://github.com/jupyterlab/jupyterlab/pull/10976) ([@fcollonval](https://github.com/fcollonval))
- Protect against undefined delegated label [#10972](https://github.com/jupyterlab/jupyterlab/pull/10972) ([@fcollonval](https://github.com/fcollonval))
- ForwardPort PR #10898 on master: Render placeholder at correct index [#10959](https://github.com/jupyterlab/jupyterlab/pull/10959) ([@echarles](https://github.com/echarles))
- Fix lack of translation of part of "Saving completed" and friends [#10958](https://github.com/jupyterlab/jupyterlab/pull/10958) ([@krassowski](https://github.com/krassowski))
- Fix browser tab name [#10952](https://github.com/jupyterlab/jupyterlab/pull/10952) ([@tejasmorkar](https://github.com/tejasmorkar))
- Simplify IRankedMenu interface [#10943](https://github.com/jupyterlab/jupyterlab/pull/10943) ([@fcollonval](https://github.com/fcollonval))
- Add "menu" context for translation of menu labels [#10932](https://github.com/jupyterlab/jupyterlab/pull/10932) ([@krassowski](https://github.com/krassowski))
- Add undoManager to inserted cells [#10899](https://github.com/jupyterlab/jupyterlab/pull/10899) ([@hbcarlos](https://github.com/hbcarlos))

### Maintenance and upkeep improvements

- Update to lerna 4 [#10983](https://github.com/jupyterlab/jupyterlab/pull/10983) ([@jtpio](https://github.com/jtpio))
- Galata: Update reference screenshots [#10982](https://github.com/jupyterlab/jupyterlab/pull/10982) ([@jtpio](https://github.com/jtpio))
- Improve Galata documentation and setup [#10980](https://github.com/jupyterlab/jupyterlab/pull/10980) ([@fcollonval](https://github.com/fcollonval))
- Clarify usage of mock in debugger test [#10979](https://github.com/jupyterlab/jupyterlab/pull/10979) ([@fcollonval](https://github.com/fcollonval))
- Restore test for kernel that does not support debugger [#10973](https://github.com/jupyterlab/jupyterlab/pull/10973) ([@fcollonval](https://github.com/fcollonval))
- Chore: fix typo in comments [#10953](https://github.com/jupyterlab/jupyterlab/pull/10953) ([@agoose77](https://github.com/agoose77))
- Bump major Galata version [#10951](https://github.com/jupyterlab/jupyterlab/pull/10951) ([@fcollonval](https://github.com/fcollonval))
- More robust UI tests [#10950](https://github.com/jupyterlab/jupyterlab/pull/10950) ([@fcollonval](https://github.com/fcollonval))
- More Publish Integrity [#10937](https://github.com/jupyterlab/jupyterlab/pull/10937) ([@afshin](https://github.com/afshin))
- Add Galata in JupyterLab [#10796](https://github.com/jupyterlab/jupyterlab/pull/10796) ([@fcollonval](https://github.com/fcollonval))

### Documentation improvements

- Improve Galata documentation and setup [#10980](https://github.com/jupyterlab/jupyterlab/pull/10980) ([@fcollonval](https://github.com/fcollonval))
- Add process for adding a language [#10961](https://github.com/jupyterlab/jupyterlab/pull/10961) ([@fcollonval](https://github.com/fcollonval))
- Improve release notes for 3.1 [#10954](https://github.com/jupyterlab/jupyterlab/pull/10954) ([@krassowski](https://github.com/krassowski))
- Fix formatting of a link in the changelog [#10945](https://github.com/jupyterlab/jupyterlab/pull/10945) ([@jtpio](https://github.com/jtpio))

### API and Breaking Changes

- Add debugger variable renderer based on mime type [#10299](https://github.com/jupyterlab/jupyterlab/pull/10299) ([@fcollonval](https://github.com/fcollonval))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-08-25&to=2021-09-01&type=c))

[@3coins](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3A3coins+updated%3A2021-08-25..2021-09-01&type=Issues) | [@afshin](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aafshin+updated%3A2021-08-25..2021-09-01&type=Issues) | [@agoose77](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aagoose77+updated%3A2021-08-25..2021-09-01&type=Issues) | [@baggiponte](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Abaggiponte+updated%3A2021-08-25..2021-09-01&type=Issues) | [@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2021-08-25..2021-09-01&type=Issues) | [@echarles](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aecharles+updated%3A2021-08-25..2021-09-01&type=Issues) | [@ellisonbg](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aellisonbg+updated%3A2021-08-25..2021-09-01&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2021-08-25..2021-09-01&type=Issues) | [@goanpeca](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agoanpeca+updated%3A2021-08-25..2021-09-01&type=Issues) | [@hbcarlos](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahbcarlos+updated%3A2021-08-25..2021-09-01&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2021-08-25..2021-09-01&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2021-08-25..2021-09-01&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2021-08-25..2021-09-01&type=Issues) | [@krassowska](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowska+updated%3A2021-08-25..2021-09-01&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2021-08-25..2021-09-01&type=Issues) | [@mbektas](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ambektas+updated%3A2021-08-25..2021-09-01&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2021-08-25..2021-09-01&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2021-08-25..2021-09-01&type=Issues) | [@SarunasAzna](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3ASarunasAzna+updated%3A2021-08-25..2021-09-01&type=Issues) | [@tejasmorkar](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Atejasmorkar+updated%3A2021-08-25..2021-09-01&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2021-08-25..2021-09-01&type=Issues)

## 4.0.0a6

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v4.0.0a5...8a727b71bde05944214a2c53fe1f7e6e33864701))

### Bugs fixed

- Fix Package Publish [#10916](https://github.com/jupyterlab/jupyterlab/pull/10916) ([@afshin](https://github.com/afshin))
- Remove terminal theme menu if terminal feature is disabled [#10909](https://github.com/jupyterlab/jupyterlab/pull/10909) ([@Mithil467](https://github.com/Mithil467))

### Documentation improvements

- Correct the documentation for packaging [#10910](https://github.com/jupyterlab/jupyterlab/pull/10910) ([@fcollonval](https://github.com/fcollonval))
- Forward port 3.1.8 Changelog Entry [#10907](https://github.com/jupyterlab/jupyterlab/pull/10907) ([@blink1073](https://github.com/blink1073))
- Add internationalization documentation [#10893](https://github.com/jupyterlab/jupyterlab/pull/10893) ([@fcollonval](https://github.com/fcollonval))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-08-24&to=2021-08-25&type=c))

[@afshin](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aafshin+updated%3A2021-08-24..2021-08-25&type=Issues) | [@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2021-08-24..2021-08-25&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2021-08-24..2021-08-25&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2021-08-24..2021-08-25&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2021-08-24..2021-08-25&type=Issues) | [@Mithil467](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AMithil467+updated%3A2021-08-24..2021-08-25&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2021-08-24..2021-08-25&type=Issues)

## 4.0.0a5

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v4.0.0a4...0cf99e5d3e3881df8b406d097a46e91569a02f52))

### Bugs fixed

- Improve language choice menu and dialog [#10885](https://github.com/jupyterlab/jupyterlab/pull/10885) ([@krassowski](https://github.com/krassowski))
- Keep cursor at the previous position after cell split [#10884](https://github.com/jupyterlab/jupyterlab/pull/10884) ([@krassowski](https://github.com/krassowski))
- Compose only the needed property when transforming the settings [#10880](https://github.com/jupyterlab/jupyterlab/pull/10880) ([@fcollonval](https://github.com/fcollonval))
- Workaround invasive use of tex mode inside of code elements and blocks [#10867](https://github.com/jupyterlab/jupyterlab/pull/10867) ([@krassowski](https://github.com/krassowski))
- Add translations for notebook mode name [#10865](https://github.com/jupyterlab/jupyterlab/pull/10865) ([@krassowski](https://github.com/krassowski))
- Add missing link in passing translator down to kernel selector [#10864](https://github.com/jupyterlab/jupyterlab/pull/10864) ([@krassowski](https://github.com/krassowski))
- Fix code names showing up in new translations, add docs [#10860](https://github.com/jupyterlab/jupyterlab/pull/10860) ([@krassowski](https://github.com/krassowski))
- Added throttling for toolbar resize (#10826) [#10854](https://github.com/jupyterlab/jupyterlab/pull/10854) ([@3coins](https://github.com/3coins))
- Shutdown sessions/terminals on shutdown [#10843](https://github.com/jupyterlab/jupyterlab/pull/10843) ([@martinRenou](https://github.com/martinRenou))
- Get metadata from shared model when serializing the notebook to JSON [#10804](https://github.com/jupyterlab/jupyterlab/pull/10804) ([@hbcarlos](https://github.com/hbcarlos))

### Maintenance and upkeep improvements

- Lint Cleanup [#10900](https://github.com/jupyterlab/jupyterlab/pull/10900) ([@blink1073](https://github.com/blink1073))
- Publish Cleanup [#10891](https://github.com/jupyterlab/jupyterlab/pull/10891) ([@fcollonval](https://github.com/fcollonval))
- Edit binder ref for demo [#10877](https://github.com/jupyterlab/jupyterlab/pull/10877) ([@fcollonval](https://github.com/fcollonval))
- Fix Publish Check [#10846](https://github.com/jupyterlab/jupyterlab/pull/10846) ([@afshin](https://github.com/afshin))
- Translate labels of menus and submenus [#10739](https://github.com/jupyterlab/jupyterlab/pull/10739) ([@krassowski](https://github.com/krassowski))
- Set the `camelcase` ESLint rule to `warn` [#10500](https://github.com/jupyterlab/jupyterlab/pull/10500) ([@jtpio](https://github.com/jtpio))

### Other merged PRs

- Forwardport 3.1.7 Changelog entry [#10845](https://github.com/jupyterlab/jupyterlab/pull/10845) ([@blink1073](https://github.com/blink1073))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-08-16&to=2021-08-24&type=c))

[@3coins](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3A3coins+updated%3A2021-08-16..2021-08-24&type=Issues) | [@afshin](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aafshin+updated%3A2021-08-16..2021-08-24&type=Issues) | [@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2021-08-16..2021-08-24&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2021-08-16..2021-08-24&type=Issues) | [@hbcarlos](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahbcarlos+updated%3A2021-08-16..2021-08-24&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2021-08-16..2021-08-24&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2021-08-16..2021-08-24&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2021-08-16..2021-08-24&type=Issues) | [@martinRenou](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AmartinRenou+updated%3A2021-08-16..2021-08-24&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2021-08-16..2021-08-24&type=Issues)

## 4.0.0a4

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v4.0.0a3...26c35fef04a6b34564662965741f561701becf05))

### Enhancements made

- Don't sort context menu items by selector [#10666](https://github.com/jupyterlab/jupyterlab/pull/10666) ([@fcollonval](https://github.com/fcollonval))
- Add show trailing whitespace option to Notebook and Text Editor [#10632](https://github.com/jupyterlab/jupyterlab/pull/10632) ([@richardkang112](https://github.com/richardkang112))
- Allow extensions and users to customize easily toolbar items. [#10469](https://github.com/jupyterlab/jupyterlab/pull/10469) ([@fcollonval](https://github.com/fcollonval))
- Implemented Restart and debug [#10462](https://github.com/jupyterlab/jupyterlab/pull/10462) ([@JohanMabille](https://github.com/JohanMabille))
- Add `isConnected` to `ServiceManager`, use it in `hub-extension` [#10156](https://github.com/jupyterlab/jupyterlab/pull/10156) ([@vkaidalov-rft](https://github.com/vkaidalov-rft))

### Bugs fixed

- Fix link to the security documentation [#10836](https://github.com/jupyterlab/jupyterlab/pull/10836) ([@krassowski](https://github.com/krassowski))
- Fix missing break in switch [#10829](https://github.com/jupyterlab/jupyterlab/pull/10829) ([@fcollonval](https://github.com/fcollonval))
- The dirty indicator does not get cleared up after reverting changes [#10812](https://github.com/jupyterlab/jupyterlab/pull/10812) ([@fcollonval](https://github.com/fcollonval))
- Removed toolbar scrollbar [#10790](https://github.com/jupyterlab/jupyterlab/pull/10790) ([@3coins](https://github.com/3coins))

### Maintenance and upkeep improvements

- References are duplicated in tsconfig.test.json [#10830](https://github.com/jupyterlab/jupyterlab/pull/10830) ([@fcollonval](https://github.com/fcollonval))
- Remove outdated `npm-cli-login` utility from buildutils [#10828](https://github.com/jupyterlab/jupyterlab/pull/10828) ([@krassowski](https://github.com/krassowski))

### Documentation improvements

- Allow extensions and users to customize easily toolbar items. [#10469](https://github.com/jupyterlab/jupyterlab/pull/10469) ([@fcollonval](https://github.com/fcollonval))
- Clean up changelog [#10825](https://github.com/jupyterlab/jupyterlab/pull/10825) ([@blink1073](https://github.com/blink1073))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-08-12&to=2021-08-16&type=c))

[@3coins](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3A3coins+updated%3A2021-08-12..2021-08-16&type=Issues) | [@afshin](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aafshin+updated%3A2021-08-12..2021-08-16&type=Issues) | [@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2021-08-12..2021-08-16&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2021-08-12..2021-08-16&type=Issues) | [@goanpeca](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agoanpeca+updated%3A2021-08-12..2021-08-16&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2021-08-12..2021-08-16&type=Issues) | [@JohanMabille](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AJohanMabille+updated%3A2021-08-12..2021-08-16&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2021-08-12..2021-08-16&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2021-08-12..2021-08-16&type=Issues) | [@richardkang112](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Arichardkang112+updated%3A2021-08-12..2021-08-16&type=Issues) | [@vkaidalov-rft](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Avkaidalov-rft+updated%3A2021-08-12..2021-08-16&type=Issues)

## 4.0.0a3

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v4.0.0a2...b5a5937b0e6ab99eeeaedf80e6e1508e17629ad3))

### Bugs fixed

- Use nullish operator instead of OR [#10811](https://github.com/jupyterlab/jupyterlab/pull/10811) ([@fcollonval](https://github.com/fcollonval))
- remove session error dialog redundant error message to avoid repeated display [#10810](https://github.com/jupyterlab/jupyterlab/pull/10810) ([@franckchen](https://github.com/franckchen))

### Maintenance and upkeep improvements

- More Releaser Fixes [#10817](https://github.com/jupyterlab/jupyterlab/pull/10817) ([@afshin](https://github.com/afshin))
- Comment invalid classifiers [#10815](https://github.com/jupyterlab/jupyterlab/pull/10815) ([@fcollonval](https://github.com/fcollonval))

### Documentation improvements

- Fix documentation snippets [#10813](https://github.com/jupyterlab/jupyterlab/pull/10813) ([@fcollonval](https://github.com/fcollonval))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-08-11&to=2021-08-12&type=c))

[@afshin](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aafshin+updated%3A2021-08-11..2021-08-12&type=Issues) | [@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2021-08-11..2021-08-12&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2021-08-11..2021-08-12&type=Issues) | [@franckchen](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afranckchen+updated%3A2021-08-11..2021-08-12&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2021-08-11..2021-08-12&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2021-08-11..2021-08-12&type=Issues)

## 4.0.0a2

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v4.0.0a1...132f74afab92fb6ca063644951464811d8ae87ae))

**_NOTE_** The Python Package for this release was not published due to our trove classifiers not yet being [available](https://github.com/jupyterlab/jupyterlab/issues/9538#issuecomment-897073510).

### Bugs fixed

- Share nbformat and nbformatMinor [#10795](https://github.com/jupyterlab/jupyterlab/pull/10795) ([@hbcarlos](https://github.com/hbcarlos))
- Support collapsible headers with virtual notebook rendering [#10793](https://github.com/jupyterlab/jupyterlab/pull/10793) ([@echarles](https://github.com/echarles))
- Revert input guard [#10779](https://github.com/jupyterlab/jupyterlab/pull/10779) ([@echarles](https://github.com/echarles))

### Maintenance and upkeep improvements

- Clean up Link Caching Again [#10794](https://github.com/jupyterlab/jupyterlab/pull/10794) ([@afshin](https://github.com/afshin))
- Clean up version integrity handling [#10787](https://github.com/jupyterlab/jupyterlab/pull/10787) ([@blink1073](https://github.com/blink1073))
- Clean Up Major Version Bump Handling [#10766](https://github.com/jupyterlab/jupyterlab/pull/10766) ([@blink1073](https://github.com/blink1073))

### Documentation improvements

- Add common-lisp-jupyter kernel to debugger list [#10786](https://github.com/jupyterlab/jupyterlab/pull/10786) ([@yitzchak](https://github.com/yitzchak))
- add trove classifer docs, usage [#10731](https://github.com/jupyterlab/jupyterlab/pull/10731) ([@bollwyvl](https://github.com/bollwyvl))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-08-06&to=2021-08-11&type=c))

[@afshin](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aafshin+updated%3A2021-08-06..2021-08-11&type=Issues) | [@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2021-08-06..2021-08-11&type=Issues) | [@bollwyvl](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Abollwyvl+updated%3A2021-08-06..2021-08-11&type=Issues) | [@echarles](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aecharles+updated%3A2021-08-06..2021-08-11&type=Issues) | [@hbcarlos](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahbcarlos+updated%3A2021-08-06..2021-08-11&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2021-08-06..2021-08-11&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2021-08-06..2021-08-11&type=Issues) | [@yitzchak](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ayitzchak+updated%3A2021-08-06..2021-08-11&type=Issues)

## 4.0.0a1

([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v4.0.0a0...cb406d3ee55eedd2f0df238958b37a4473cece02))

### Enhancements made

- Responsive document toolbar [#10720](https://github.com/jupyterlab/jupyterlab/pull/10720) ([@3coins](https://github.com/3coins))
- PR: Add preferred-dir handling [#10667](https://github.com/jupyterlab/jupyterlab/pull/10667) ([@goanpeca](https://github.com/goanpeca))
- Toc: Run nested code cells directly from markdown headings [#10729](https://github.com/jupyterlab/jupyterlab/pull/10729) ([@jess-x](https://github.com/jess-x))
- Normalize translation domain [#10728](https://github.com/jupyterlab/jupyterlab/pull/10728) ([@fcollonval](https://github.com/fcollonval))
- RTC: persist rtc user color & name in state db [#10490](https://github.com/jupyterlab/jupyterlab/pull/10490) ([@jess-x](https://github.com/jess-x))

### Bugs fixed

- Prevent undo/redo in outputs [#10756](https://github.com/jupyterlab/jupyterlab/pull/10756) ([@hbcarlos](https://github.com/hbcarlos))
- Revert change in saveState Signal [#10741](https://github.com/jupyterlab/jupyterlab/pull/10741) ([@jess-x](https://github.com/jess-x))
- Add translations for kernel statuses [#10738](https://github.com/jupyterlab/jupyterlab/pull/10738) ([@krassowski](https://github.com/krassowski))
- Use appName in page title when restoring workspaces (vs master) [#10725](https://github.com/jupyterlab/jupyterlab/pull/10725) ([@bollwyvl](https://github.com/bollwyvl))
- Markdown url resolver no longer throws for malformed URLs in `isLocal` check [#10773](https://github.com/jupyterlab/jupyterlab/pull/10773) ([@loichuder](https://github.com/loichuder))

### Maintenance and upkeep improvements

- Add aria-label for notebook cells to improve screen-reader visibility [#10762](https://github.com/jupyterlab/jupyterlab/pull/10762) ([@KrishnaKumarHariprasannan](https://github.com/KrishnaKumarHariprasannan))
- Yet another fix for Verdaccio publish [#10759](https://github.com/jupyterlab/jupyterlab/pull/10759) ([@afshin](https://github.com/afshin))
- Refactor apputils widgets [#10758](https://github.com/jupyterlab/jupyterlab/pull/10758) ([@fcollonval](https://github.com/fcollonval))
- Another Fix to Verdaccio Publishing [#10747](https://github.com/jupyterlab/jupyterlab/pull/10747) ([@afshin](https://github.com/afshin))
- Fixes for Branch Integrity [#10744](https://github.com/jupyterlab/jupyterlab/pull/10744) ([@afshin](https://github.com/afshin))
- Fix Verdaccio Publish [#10743](https://github.com/jupyterlab/jupyterlab/pull/10743) ([@afshin](https://github.com/afshin))
- More Cleanup of Automated Release Process [#10742](https://github.com/jupyterlab/jupyterlab/pull/10742) ([@blink1073](https://github.com/blink1073))
- Update changelog in master to reflect 3.1 final [#10710](https://github.com/jupyterlab/jupyterlab/pull/10710) ([@blink1073](https://github.com/blink1073))
- Add branch integrity handling [#10708](https://github.com/jupyterlab/jupyterlab/pull/10708) ([@afshin](https://github.com/afshin))
- Forward port changelog entries for 3.1.1 and 3.1.2 [#10774](https://github.com/jupyterlab/jupyterlab/pull/10774) ([@blink1073](https://github.com/blink1073))
- Revert move @types/react in devDependencies of apputils [#10719](https://github.com/jupyterlab/jupyterlab/pull/10719) ([@loichuder](https://github.com/loichuder))
- Move @types/react in devDependencies of apputils [#10717](https://github.com/jupyterlab/jupyterlab/pull/10717) ([@loichuder](https://github.com/loichuder))

### Documentation improvements

- Fix documentation of the `selectionExecuted` signal [#10778](https://github.com/jupyterlab/jupyterlab/pull/10778) ([@i-aki-y](https://github.com/i-aki-y))
- Refactor apputils widgets [#10758](https://github.com/jupyterlab/jupyterlab/pull/10758) ([@fcollonval](https://github.com/fcollonval))
- Document multiple commands single shortcut functionality [#10754](https://github.com/jupyterlab/jupyterlab/pull/10754) ([@richardkang112](https://github.com/richardkang112))
- Minor improvement to contributing documentation [#10713](https://github.com/jupyterlab/jupyterlab/pull/10713) ([@KrishnaKumarHariprasannan](https://github.com/KrishnaKumarHariprasannan))
- Add branch integrity handling [#10708](https://github.com/jupyterlab/jupyterlab/pull/10708) ([@afshin](https://github.com/afshin))
- Added Table of contents (toc.rst) to user guide documentation [#10699](https://github.com/jupyterlab/jupyterlab/pull/10699) ([@AnudeepGunukula](https://github.com/AnudeepGunukula))

### Contributors to this release

([GitHub contributors page for this release](https://github.com/jupyterlab/jupyterlab/graphs/contributors?from=2021-07-27&to=2021-08-06&type=c))

[@3coins](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3A3coins+updated%3A2021-07-27..2021-08-06&type=Issues) | [@afshin](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aafshin+updated%3A2021-07-27..2021-08-06&type=Issues) | [@AnudeepGunukula](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AAnudeepGunukula+updated%3A2021-07-27..2021-08-06&type=Issues) | [@blink1073](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ablink1073+updated%3A2021-07-27..2021-08-06&type=Issues) | [@bollwyvl](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Abollwyvl+updated%3A2021-07-27..2021-08-06&type=Issues) | [@davidbrochart](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Adavidbrochart+updated%3A2021-07-27..2021-08-06&type=Issues) | [@echarles](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aecharles+updated%3A2021-07-27..2021-08-06&type=Issues) | [@ellisonbg](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aellisonbg+updated%3A2021-07-27..2021-08-06&type=Issues) | [@fcollonval](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Afcollonval+updated%3A2021-07-27..2021-08-06&type=Issues) | [@goanpeca](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Agoanpeca+updated%3A2021-07-27..2021-08-06&type=Issues) | [@hbcarlos](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ahbcarlos+updated%3A2021-07-27..2021-08-06&type=Issues) | [@i-aki-y](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ai-aki-y+updated%3A2021-07-27..2021-08-06&type=Issues) | [@jasongrout](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajasongrout+updated%3A2021-07-27..2021-08-06&type=Issues) | [@jess-x](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajess-x+updated%3A2021-07-27..2021-08-06&type=Issues) | [@jtpio](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajtpio+updated%3A2021-07-27..2021-08-06&type=Issues) | [@jupyterlab-dev-mode](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ajupyterlab-dev-mode+updated%3A2021-07-27..2021-08-06&type=Issues) | [@krassowski](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Akrassowski+updated%3A2021-07-27..2021-08-06&type=Issues) | [@KrishnaKumarHariprasannan](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3AKrishnaKumarHariprasannan+updated%3A2021-07-27..2021-08-06&type=Issues) | [@loichuder](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Aloichuder+updated%3A2021-07-27..2021-08-06&type=Issues) | [@manfromjupyter](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Amanfromjupyter+updated%3A2021-07-27..2021-08-06&type=Issues) | [@meeseeksdev](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksdev+updated%3A2021-07-27..2021-08-06&type=Issues) | [@meeseeksmachine](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Ameeseeksmachine+updated%3A2021-07-27..2021-08-06&type=Issues) | [@richardkang112](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Arichardkang112+updated%3A2021-07-27..2021-08-06&type=Issues) | [@trungleduc](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Atrungleduc+updated%3A2021-07-27..2021-08-06&type=Issues) | [@welcome](https://github.com/search?q=repo%3Ajupyterlab%2Fjupyterlab+involves%3Awelcome+updated%3A2021-07-27..2021-08-06&type=Issues)

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
- Fix: Select kernal text (when open a no kernal .ipynb file) is not translated correctly (#12133) [#12135](https://github.com/jupyterlab/jupyterlab/pull/12135) ([@yangql176](https://github.com/yangql176))
- Opening keyboard shortcuts UI result in "destruction" of shortcut settings [#12112](https://github.com/jupyterlab/jupyterlab/pull/12112) ([@fcollonval](https://github.com/fcollonval))
- Fix error rendering in Advanced Settings Editor [#12107](https://github.com/jupyterlab/jupyterlab/pull/12107) ([@krassowski](https://github.com/krassowski))
- Fix json schema for kernel status settings [#11451](https://github.com/jupyterlab/jupyterlab/pull/11451) ([@fcollonval](https://github.com/fcollonval))
- Remove toolbar factory setting trick in the tests [#12096](https://github.com/jupyterlab/jupyterlab/pull/12096) ([@jtpio](https://github.com/jtpio))
- Log error on open document widget. [#12080](https://github.com/jupyterlab/jupyterlab/pull/12080) ([@trungleduc](https://github.com/trungleduc))
- update status to unkown when kernel is shutdown from running kernels tab [#12083](https://github.com/jupyterlab/jupyterlab/pull/12083) ([@akshaychitneni](https://github.com/akshaychitneni))
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
- Relax `@playright/test` dependency in Galata [#11371](https://github.com/jupyterlab/jupyterlab/pull/11371) ([@jtpio](https://github.com/jtpio))

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
- The undo/redo history in the notebook is now document-wide (tracking changes across all cells); the future verisions will enable restoring the previous behaviour of per-cell undo/redo.
- Table of Contents recieved multiple new features and settings described in the [user documentation](https://jupyterlab.readthedocs.io/en/latest/user/toc.html).
- The debugger recived many improvements, including basic support for evaluating code at a breakpoint, and for variable inspection.
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

- Add alt attirbutes for test docs sprint [#10670](https://github.com/jupyterlab/jupyterlab/pull/10670) ([@isabela-pf](https://github.com/isabela-pf))
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

<img alt="An animation of the Jupyterlab interface that demonstrates restarting a kernel and running code cells." src="https://user-images.githubusercontent.com/226720/84566070-966daf80-ad6e-11ea-815b-5f48136b524b.gif" class="jp-screenshot">

- Adds a visual clue for distinguishing hidden files and folders in
  the file browser window
  ([#8393](https://github.com/jupyterlab/jupyterlab/pull/8393))

<img alt="A screenshot of the JupyterLab file browser." src="https://user-images.githubusercontent.com/13181907/81358007-3b77d700-90a3-11ea-885c-31628c55744b.png" class="jp-screenshot">

- Enable horizontal scrolling for toolbars to improve mobile
  experience
  ([#8417](https://github.com/jupyterlab/jupyterlab/pull/8417))

<img alt="An animation demonstrating improved scrolling and navigation on mobile." src="https://user-images.githubusercontent.com/591645/81733090-bb31e700-9491-11ea-96ab-a4b1695b8e3c.gif" class="jp-screenshot">

- Improves the right-click context menu for the file editor
  ([#8425](https://github.com/jupyterlab/jupyterlab/pull/8425))

<img alt="A context menu in a text file with options like undo and redo." src="https://user-images.githubusercontent.com/25207344/84947222-d8bd2680-b0b7-11ea-98da-e4907f9131ba.png" class="jp-screenshot">

- Merge cell attachments when merging cells
  ([#8427](https://github.com/jupyterlab/jupyterlab/pull/8427),
  [#8414](https://github.com/jupyterlab/jupyterlab/issues/8414))

<img alt="An animation demonstrating merging two cells with image outputs into one cell with both outputs." src="https://user-images.githubusercontent.com/591645/82072833-97acad80-96d8-11ea-957c-ce006731219b.gif" class="jp-screenshot">

- Add styling for high memory usage warning in status bar with
  nbresuse
  ([#8437](https://github.com/jupyterlab/jupyterlab/pull/8437))

<img alt="A status bar message that says memory 110.51 MB used out of 117.25 MB available." src="https://user-images.githubusercontent.com/7725109/82213619-1b150b80-9932-11ea-9a53-570bd82d3d2a.png" class="jp-screenshot">

- Adds support for Python version 3.10
  ([#8445](https://github.com/jupyterlab/jupyterlab/pull/8445))
- Support live editing of SVG with updating rendering
  ([#8495](https://github.com/jupyterlab/jupyterlab/pull/8495),
  [#8494](https://github.com/jupyterlab/jupyterlab/issues/8494))

<img alt="Demonstrating editing an SVG in one tab and while it is previewed live in another tab." src="https://user-images.githubusercontent.com/45380/83218329-c8123400-a13b-11ea-9137-6b91a29dbc08.png" class="jp-screenshot">

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
- Added a "Restart Kernel and Run All Cells..." button to the
  notebook toolbar
  ([#8024](https://github.com/jupyterlab/jupyterlab/pull/8024))

<img alt="The main JupyterLab toolbar with focus on the Restart Kernel and Run All Cells button." src="https://raw.githubusercontent.com/jupyterlab/jupyterlab/3.1.x/docs/source/getting_started/changelog_restartrunallbutton.png" class="jp-screenshot">

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
- JupyterLab's custom context menu is now disabled on all descendants
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
- Throttle fetch requests in the setting registry's data connector
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

<img alt="Notebook cell tags in the left sidebar next to an open notebook." src="https://raw.githubusercontent.com/jupyterlab/jupyterlab/3.1.x/docs/source/getting_started/changelog_celltags.png" class="jp-screenshot">

- File info display when hovering on a file in the file browser
  ([#7485](https://github.com/jupyterlab/jupyterlab/pull/7485),
  [#7352](https://github.com/jupyterlab/jupyterlab/issues/7352))

<img alt="The file browser with a tooltip describing a notebook's info like the name, size, and kernel." src="https://raw.githubusercontent.com/jupyterlab/jupyterlab/3.1.x/docs/source/getting_started/changelog_fileinfo.png" class="jp-screenshot">

- Support for searching outputs in notebooks
  ([#7258](https://github.com/jupyterlab/jupyterlab/pull/7258))

<img alt="A notebook with multiple cells and the cell output searching in the upper right." src="https://raw.githubusercontent.com/jupyterlab/jupyterlab/3.1.x/docs/source/getting_started/changelog_searchoutput.png" class="jp-screenshot">

- `Ctrl Shift .` and `Ctrl Shift ,` shortcuts move focus to the next
  and previous tab bar in the main area, respectively
  ([#7673](https://github.com/jupyterlab/jupyterlab/pull/7673))

- `Shift Home` and `Shift End` shortcuts in a notebook select all
  cells from the current cell to the top or bottom of a notebook,
  respectively
  ([#7177](https://github.com/jupyterlab/jupyterlab/pull/7177))

- Explicit "No Kernel" button in the kernel selection dialog for new
  notebooks
  ([#7647](https://github.com/jupyterlab/jupyterlab/pull/7647))

- Notebook `recordTiming` advanced setting to control whether
  execution timing information is stored in notebook files
  ([#7578](https://github.com/jupyterlab/jupyterlab/pull/7578))

- "Select current running or last run cell" command added (requires
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

- "New File" and "New Markdown File" items in file browser context
  menu ([#7483](https://github.com/jupyterlab/jupyterlab/pull/7483),
  [#4280](https://github.com/jupyterlab/jupyterlab/issues/4280))

- "Download" item in File menu
  ([#7480](https://github.com/jupyterlab/jupyterlab/pull/7480))

- "Restart Kernel and Run up to Selected Cell" item in notebook
  Kernel menu
  ([#7789](https://github.com/jupyterlab/jupyterlab/pull/7789),
  [#6746](https://github.com/jupyterlab/jupyterlab/issues/6746))

- In extension manager, the "enable" button is now only shown for
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

- "Copy Shareable Link" in the file browser context menu now
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
- Move vega from "devdependencies" to "dependencies"
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
- Restore behavior of the "raises-exception" cell tag
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

<img alt="A notebook with multiple cells and the find and replace interface in the upper right." src="https://raw.githubusercontent.com/jupyterlab/jupyterlab/3.1.x/docs/source/getting_started/find.png" class="jp-screenshot">

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

<img alt="A screenshot of the updated JupyterLab status bar." src="https://raw.githubusercontent.com/jupyterlab/jupyterlab/3.1.x/docs/source/getting_started/statusbar.png" class="jp-screenshot">

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
- JupyterLab now has a File > Logout menu entry when running with
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
- Rename the help "Inspector" to "Contextual Help" and move it to
  the "Help" menu
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
- Hide the "Last Modified" column when the file browser is narrow
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
- Adds ability to "Merge Selected Cells" in the context menu in the
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
- Add support for managing notebook metadata under a new "Advanced
  Tools" section in the cell tools area. The cell and notebook
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
- Adds the ability to run "Run All Code" and "Restart Kernel and
  Run All Code" in code and markdown files
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
- A "New Folder" option has been added to the file browser context
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
- Add "Go To Line" in the Edit menu for text editors.
  ([#5377](https://github.com/jupyterlab/jupyterlab/pull/5377))
- Sidebar panels can now be switched between left and right sidebars.
  Right-click on a sidebar tab to move it to the other sidebar.
  ([#5347](https://github.com/jupyterlab/jupyterlab/pull/5347),
  [#5054](https://github.com/jupyterlab/jupyterlab/issues/5054),
  [#3707](https://github.com/jupyterlab/jupyterlab/issues/3707))
- Make the sidebar a bit narrower, and make the minimum width
  adjustable from a theme.
  ([#5245](https://github.com/jupyterlab/jupyterlab/pull/5245))
- Populate the File, Export Notebook As... submenu from the server
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
- Node >=6.11.5 is now required.
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
- Added "Open From Path..."" to top level `File` menu.
- Added "Copy Download Link" to context menu for files.

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
- Added "Copy Download Link" to context menu for files.
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

- Fixed a bug in the rendering of the "New Notebook" item of the
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
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Command palette items](#command-palette-items)
- [Settings](#settings)
- [Larger file uploads](#larger-file-uploads)
- [Extension management and installation](#extension-management-and-installation)
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
  `Ctrl G` for this command, use the "Settings" | "Advanced Settings
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

- Support for larger file uploads (>15MB) when using Jupyter notebook
  server version >= 5.1.
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
  (\[[#4115](https://github.com/jupyterlab/jupyterlab/issues/4115)\](https://github.com/jupyterlab/jupyterlab/pull/4115)).
- Display the kernel banner in the console when a kernel is restarted
  to mark the restart
  (\[[#3663](https://github.com/jupyterlab/jupyterlab/issues/3663)\](https://github.com/jupyterlab/jupyterlab/pull/3663)).
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
- Mime extensions API change (`name` -> `id` and new naming
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
- Revamped the handling of file types in the application * affects
  document and mime renderers:
  <https://github.com/jupyterlab/jupyterlab/pull/2701>
- Updated dialog API * uses virtual DOM instead of raw DOM nodes and
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
- More work toward real time collaboration * implemented a model
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

- Upgrade to new `@phosphor` packages * brings a new Command Palette
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
