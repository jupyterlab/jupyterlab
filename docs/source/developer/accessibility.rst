.. Copyright (c) Jupyter Development Team.
.. Distributed under the terms of the Modified BSD License.

Accessibility: A JupyterLab Developer's Guide
=============================================

If you're making changes to the JupyterLab source code and you're concerned
about `accessibility <https://en.wikipedia.org/wiki/Accessibility>`__, this page
is for you.

Looking for other ways to `contribute to accessibility on Jupyter projects
<https://jupyter-accessibility.readthedocs.io/en/latest/contribute/guide.html>`__?

Where to start
--------------

Thank you for being interested in improving JupyterLab's accessibility. Whether
making accessibility-specific fixes or considering the accessibility impacts of
another contribution, your work betters JupyterLab for everyone who uses it.

A common question when accessibility-minded developers come to JupyterLab is:
where do I get started?

If you don't have a lot of time to immerse yourself in the big picture of
JupyterLab accessibility work, then the GitHub issues labelled `good first issue
and accessibility
<https://github.com/jupyterlab/jupyterlab/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22+label%3Atag%3AAccessibility>`__
are a good place to start.

If you want to more fully immerse yourself in the work of making JupyterLab (or
other Jupyter projects) more accessibile, then a good place to start would be to
join the `Jupyter accessibility meeting
<https://jupyter-accessibility.readthedocs.io/en/latest/community/index.html#team-meetings-and-notes>`__
that happens every other week. If you cannot attend the call, you can peruse the
meeting notes and find links to other resources on the `Jupyter Accessibility
<https://jupyter-accessibility.readthedocs.io/>`__ site.

Looking for a `frontend developer's orientation to the JupyterLab codebase
<https://jupyter-accessibility.readthedocs.io/en/latest/resources/map-jupyterlab-frontend-architecture/README.html>`__?

Best practices while developing
-------------------------------

JupyterLab is a web application. Therefore the following standards apply:

- WCAG - `Web Content Accessibility Guidelines
  <https://www.w3.org/WAI/standards-guidelines/wcag/>`__
- ARIA - `Accessible Rich Internet Applications
  <https://www.w3.org/WAI/standards-guidelines/aria/>`__
- ATAG - `Authoring Tool Accessibility Guidelines
  <https://www.w3.org/WAI/standards-guidelines/atag/>`__

These are good places to familiarize yourself with accessibility best practices
for developing web sites (WCAG) and web applications (ARIA). Note that although
WCAG was created primarily for static web sites, the guidelines are nonetheless
applicable to web apps like JupyterLab.

One resource that is often particularly helpful for developers looking for
examples and best practices is `ARIA Patterns
<https://www.w3.org/WAI/ARIA/apg/patterns/>`__. This web resource contains
examples of how to implement UI elements—such as menus, dialogs, breadcrumbs,
and more—in a more accessible way. However, be careful! Just because you can
implement a button using divs and aria attributes does not mean that you should!
(Most likely you should just use the button tag.) As a best practice, you should
only use ARIA when you cannot  use existing HTML elements (button, input, nav,
aside, etc.) to achieve the UX that you desire.

Finally, there is much more accessibility knowledge on the Internet than there
is in JupyterLab or Project Jupyter alone. Whatever you decide to work on,
consider exploring accessibility resources in other spaces for similar or
equivalent efforts. Accessibility communities tend to be generous with the
resources they provide to improve web accessibility. Many times, searching for
the name of the task or issue appended with `accessibility` in a search engine
will give you several results and chance to learn from the broader community
right away.

The rest of this section contains best practices specific to JupyterLab and its
development.

Use color variables from the CSS
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

When fixing contrast or other visual accessibility issues in JupyterLab, it can
be tempting to pick a color and apply it to the part of the UI that you are
working on. However, it quickly becomes unmanageable to have color values spread
throughout the app across different CSS files. Therefore, the JupyterLab
codebase defines a set of `color variables
<https://github.com/jupyterlab/jupyterlab/blob/main/packages/theme-light-extension/style/variables.css>`__
that can be used for borders, icons, and such. If you're adding any CSS that
needs a color value, please use one of the variables defined.

Upstream fixes in Lumino
^^^^^^^^^^^^^^^^^^^^^^^^

JupyterLab uses a front-end framework that was built specifically for it called
Lumino. Lumino is similar in some ways to React, Vue, and Angular, but it also
provides a number of UI widgets like menu bars, tab bars, and dock panels. As a
result, some of the accessibility issues reported in the JupyterLab GitHub repo
need to be fixed in the Lumino repo. A good resource for learning Lumino:
`PhosphorJS (now Lumino) Mentor Sessions
<https://www.youtube.com/playlist?list=PLFx5GKe0BTjQyCKtiK9TI-ekSuSn_8a3J>`__.
PhosphorJS was Lumino's previous name. There is a page with `notes from the
PhosphorJS sessions
<https://gist.github.com/blink1073/1c21ec077acbb9178e01e14936ddda1b>`__ that
also has a link to some additional videos that were not uploaded to YouTube.

It's not always obvious when an accessibility issue should be fixed in the
JupyterLab versus Lumino codebase. Some guidance to help you identify where your
change should be made:

- Generally speaking, if you can fix the issue in Lumino, it's better to fix it
  in Lumino because then the fix will be absorbed in more places.
- However, for that same reason, because Lumino is used by more codebases than
  just JupyterLab—specifically, by JupyterLab extensions—one should be careful
  making changes to Lumino that might break downstream consumers/extensions.
- So an additional rule of thumb is: if you can't make the fix in Lumino without
  breaking dependants, then it might be better to make the fix in JupyterLab. In
  this case, you might take a two-track approach, where you fix the
  accessibility issue in JupyterLab and also submit a breaking fix in Lumino
  that targets a future, breaking version of Lumino.

PR Review and Manual Testing
----------------------------

When reviewing code, documentation, or other contributions, you can use manual
testing to help prevent accessibility bugs. Typically you try and complete a
task related to your fix or contribution using an accessibility accommodation or
setting. Common options include:

- Using a `screen reader <https://en.wikipedia.org/wiki/Screen_reader>`__.
- Zooming the page up to 400% via your browser.
- Unplugging or not using your mouse. Navigate only with the keyboard.
- `Emulating vision deficiencies
  <https://learn.microsoft.com/en-us/microsoft-edge/devtools-guide-chromium/accessibility/emulate-vision-deficiencies#open-the-rendering-tool>`__
  (Chrome, Edge, and Firefox all provide built-in tools to do this.)

While testing, take note of what happens and compare it to what you can do to
complete the task without your chosen accessibility accommodation. If there is
anything you cannot complete, then you have a blocking accessibility issue. Even
though your use of assistive tech or an accessibility accommodation will likely
differ from someone who uses them regularly, knowing the results is helpful to
tell if JupyterLab is behaving as you expect.

GitPod
^^^^^^

If you have a `GitPod <https://www.gitpod.io/>`__ account and you have submitted
a PR to JupyterLab, you can manually test it by copying the GitHub URL to your
PR and then by going to gitpod.io/#<full-url-to-your-GitHub-PR>. Your PR must be
in the jupyterlab/jupyterlab repo—in other words, your PR's URL must look like
https://github.com/jupyterlab/jupyterlab/pull/<number>. GitPod will build
JupyterLab from source with your PR applied and then will allow you to load the
UI in your browser.

Useful tools for development
----------------------------

Here is a list of some apps that developers have found useful while doing
accessibility work in JupyterLab:

- Chrome Dev Tools for `discovering and fixing low contrast text
  <https://developer.chrome.com/docs/devtools/accessibility/contrast/>`__ and
  for `viewing the accessibility tree
  <https://developer.chrome.com/docs/devtools/accessibility/reference/#tree>`__
- `Axe DevTools
  <https://chrome.google.com/webstore/detail/axe-devtools-web-accessib/lhdoppojpmngadmnindnejefpokejbdd>`__,
  extension for Chrome Dev Tools
- `Color Contrast Analyzer <https://www.tpgi.com/color-contrast-checker/>`__,
  desktop App for Windows and Mac
- `Polypane <https://polypane.app/>`__, desktop browser with some dev tools
  built in (note it's not free but it does have a free trial)
- `Axe Accessibility Linter
  <https://marketplace.visualstudio.com/items?itemName=deque-systems.vscode-axe-linter>`__,
  extension for VS Code
- GitPod: See the GitPod section under the Testing section above.
- And of course, screen readers such as JAWS, NVDA, and VoiceOver.
