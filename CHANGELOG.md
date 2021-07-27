Skip to content
Search or jump to…

Pull requests
Issues
Marketplace
Explore
 
@blink1073 
jupyterlab
/
jupyterlab
336
11.2k
2k
Code
Issues
1.8k
Pull requests
71
Actions
Projects
4
Wiki
Security
101
Insights
Settings
jupyterlab
/
CHANGELOG.md
in
3.1.x
 

Spaces

2

Soft wrap
1
---
2
github_url: 'https://github.com/jupyterlab/jupyterlab/blob/master/CHANGELOG.md'
3
---
4
​
5
# JupyterLab Changelog
6
​
7
## v3.1
8
​
9
<!-- <START NEW CHANGELOG ENTRY> -->
10
​
11
## 3.1.0
12
​
13
([Full Changelog](https://github.com/jupyterlab/jupyterlab/compare/v3.0.6...60f37be54a714c391fad5500cb57055af1492591))
14
​
15
From JupyterLab 3.1, file documents and notebooks have collaborative
16
editing using the `Yjs shared editing framework <https://github.com/yjs/yjs>`\_.
17
Editors are not collaborative by default; to activate it, start JupyterLab
18
with the `--collaborative` flag. See full documentation on [collaboration](https://jupyterlab.readthedocs.io/en/latest/user/rtc.html).
19
​
20
### New features added
21
​
22
- Focus cells on split and leave cursor in cell with selection when splitting [#10297](https://github.com/jupyterlab/jupyterlab/pull/10297) ([@goanpeca](https://github.com/goanpeca))
23
- Debugger: show button shortcuts in tooltips [#10199](https://github.com/jupyterlab/jupyterlab/pull/10199) ([@jess-x](https://github.com/jess-x))
24
- Shared editing with collaborative notebook model. [#10118](https://github.com/jupyterlab/jupyterlab/pull/10118) ([@dmonad](https://github.com/dmonad))
25
​
26
### Enhancements made
27
​
28
- Fixes doc string for toc syncCollapseState setting [#10639](https://github.com/jupyterlab/jupyterlab/pull/10639) ([@andrewfulton9](https://github.com/andrewfulton9))
29
- Allow to set custom position for `Tooltip` [#10590](https://github.com/jupyterlab/jupyterlab/pull/10590) ([@krassowski](https://github.com/krassowski))
30
- Rename files in collaborative mode [#10564](https://github.com/jupyterlab/jupyterlab/pull/10564) ([@hbcarlos](https://github.com/hbcarlos))
31
- Reorganize settings menu for text editor [#10563](https://github.com/jupyterlab/jupyterlab/pull/10563) ([@fcollonval](https://github.com/fcollonval))
32
- Add promptCellConfig to Code Console Settings [#10555](https://github.com/jupyterlab/jupyterlab/pull/10555) ([@jess-x](https://github.com/jess-x))
33
- communicate heading collapse between ToC and Notebook [#10545](https://github.com/jupyterlab/jupyterlab/pull/10545) ([@andrewfulton9](https://github.com/andrewfulton9))
34
- feat: add options to include cell output in headings [#10537](https://github.com/jupyterlab/jupyterlab/pull/10537) ([@skyetim](https://github.com/skyetim))
35
- Open inspector split to the right [#10519](https://github.com/jupyterlab/jupyterlab/pull/10519) ([@legendb317](https://github.com/legendb317))
36
- Simple mode rename improvements 2.0 [#10518](https://github.com/jupyterlab/jupyterlab/pull/10518) ([@cameron-toy](https://github.com/cameron-toy))
37
- Make current kernel the default in kernel selector [#10510](https://github.com/jupyterlab/jupyterlab/pull/10510) ([@gereleth](https://github.com/gereleth))
38
- Add selectionExecuted and executionScheduled signals + update executed signal to include error status/info [#10493](https://github.com/jupyterlab/jupyterlab/pull/10493) ([@mwakaba2](https://github.com/mwakaba2))
39
- Scroll cell into view after output collapse [#10491](https://github.com/jupyterlab/jupyterlab/pull/10491) ([@gereleth](https://github.com/gereleth))
40
- Add cursorBlinkRate settings for editors [#10485](https://github.com/jupyterlab/jupyterlab/pull/10485) ([@fcollonval](https://github.com/fcollonval))
41
- Collaborative renaming & moving of files [#10470](https://github.com/jupyterlab/jupyterlab/pull/10470) ([@dmonad](https://github.com/dmonad))
42
- Update inspector open [#10449](https://github.com/jupyterlab/jupyterlab/pull/10449) ([@legendb317](https://github.com/legendb317))
No file chosen
Attach files by dragging & dropping, selecting or pasting them.
@blink1073
Commit changes
Commit summary
Create CHANGELOG.md
Optional extended description
Add an optional extended description…

steven.silvester@ieee.org
Choose which email address to associate with this commit

 Commit directly to the 3.1.x branch.
 Create a new branch for this commit and start a pull request. Learn more about pull requests.
 
© 2021 GitHub, Inc.
Terms
Privacy
Security
Status
Docs
Contact GitHub
Pricing
API
Training
Blog
About
