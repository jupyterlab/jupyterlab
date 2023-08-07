.. Copyright (c) Jupyter Development Team.
.. Distributed under the terms of the Modified BSD License.

JupyterLab Accessibility: Developer's Guide
===========================================

If you're making changes to the JupyterLab source code and you're concerned
about `accessibility <https://en.wikipedia.org/wiki/Accessibility>`__, this page
is for you.

Looking for other ways to `contribute to accessibility on Jupyter projects
<https://jupyter-accessibility.readthedocs.io/en/latest/contribute/guide.html>`__?

Where to start
--------------

A common question when accessibility-minded developers come to JupyterLab is:
where do I get started?

If you don't have a lot of time to immerse yourself in the big picture of
JupyterLab accessibility work, then the GitHub issues labelled `good first issue
and accessibility
<https://github.com/jupyterlab/jupyterlab/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22+label%3Atag%3AAccessibility>`__
are a good place to start.

If you want to more fully immerse yourself in the work of making JupyterLab (or
other Jupyter projects) more accessibile, then a good place to start would be to
join the `bi-weekly accessibility meeting
<https://jupyter-accessibility.readthedocs.io/en/latest/community/index.html#team-meetings-and-notes>`__
that happens every other week. If you cannot attend the call, you can peruse the
meeting notes and find links to other resources on the `Jupyter Accessibility
<https://jupyter-accessibility.readthedocs.io/>`__ site.

Looking for a `frontend developer's orientation to the JupyterLab codebase
<https://jupyter-accessibility.readthedocs.io/en/latest/resources/map-jupyterlab-frontend-architecture/README.html>`__?

Best practices while developing
-------------------------------

JupyterLab is a web application, therefore the following two standards apply:

- WCAG - `Web Content Accessibility Guidelines
  <https://www.w3.org/WAI/standards-guidelines/wcag/>`__
- ARIA - `Accessible Rich Internet Applications
  <https://www.w3.org/WAI/standards-guidelines/aria/>`__
- ATAG - `Authoring Tool Accessibility Guidelines `<https://www.w3.org/WAI/standards-guidelines/atag/>`__

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

Finally, there is much more accessibility knowledge on the Internet than there is in JupyterLab or Project Jupyter alone. Whatever you decide to work on, consider exploring accessibility resources in other spaces for similar or equivalent efforts. Accessibility communities tend to be generous with the resources they provide to improve web accessibility. Many times, searching for the name of the task or issue appended with `accessibility` in a search engine will give you several results and chance to learn from the broader community right away.

The rest of this section contains other best practices.

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

JupyterLab does not use React, Vue, or Angular; it uses a front-end framework
that was built specifically for it called Lumino. So some of the accessibility
issues tracked in the JupyterLab GitHub repo actually need to be fixed in the
Lumino repo.

It's not always obvious when an accessibility issue should be fixed in the
JupyterLab versus Lumino codebase. Generally speaking, if you can fix the issue
in Lumino, it's better to fix it in Lumino because then the fix will be absorbed
in more places. However, for that same reason, because Lumino is used by more
codebases than just JupyterLab—specifically, by JupyterLab extensions—one should
be careful making changes to Lumino that might break downstream
consumers/extensions. So an additional rule of thumb is: if you can't make the
fix in Lumino without breaking dependants, then it might be better to make the
fix in JupyterLab. In this case, you might take a two-track approach, where you
fix the accessibility issue in JupyterLab and also submit a breaking fix in
Lumino that targets a future, breaking version of Lumino.

Testing
-------

If you fix an accessibility issue in the source code but you don't add a test
with your fix, then there's a strong chance that your fix will be undone by
accident by some future changes to the codebase.

Sometimes it's straightforward to unit-test an accessibility fix, such as when
`enabling keyboard shortcuts on a toolbar button
<https://github.com/jupyterlab/jupyterlab/pull/5769>`__. But often it's
difficult to unit-test accessibility fixes.

Therefore there is an effort underway to use Playwright to write user level
`accessibility tests to JupyterLab
<https://github.com/Quansight-Labs/jupyter-a11y-testing/tree/main/testing/jupyterlab>`__.
Here's how you can use it in your development process, once you've identified an
accessibility issue and how to fix it:

1. Fork the _jupyter-a11y-testing_ repo.
2. Create a new git branch. Add a test using one of the existing JupyterLab
   regression tests in the repo as a model. The idea is that this test should
   fail without your accessibility fix but pass after your fix is merged.
3. On your fork of jupyter-a11y-testing, using the instructions at the link
   above, manually dispatch the workflow to run your new test and verify that it
   fails.
4. Open a PR on Lumino or JupyterLab or both that contains your accessibility
   fix.
5. Using your _jupyter-a11y-testing_ fork, manually dispatch the workflow again,
   but this time configure the workflow so that it builds JupyterLab with your
   code fixes applied. For example, if your GitHub username is `a11ydev` and the
   name of your JupyterLab branch is `jl-a11y-fix`, then in the workflow form
   you would put `a11ydev/jupyterlab` as the repo and `a11y-fix` as the
   ref/branch/tag/SHA. If instead (or also) you have a fix for Lumino in a
   branch named `lm-a11y-fix`, then you would put `a11ydev/lumino` in the field
   for the external package repo and the name of your Lumino branch in the field
   for the external package ref.

Altogether, the form will look something like this before you submit it:

- JupyterLab repo: `a11ydev/jupyterlab`
- JupyterLab ref: `jl-a11y-fix`
- External package reo: `a11ydev/lumino`
- External package ref: `lm-a11y-fix`

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
