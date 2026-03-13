% Copyright (c) Jupyter Development Team.

% Distributed under the terms of the Modified BSD License.

# Accessibility: A JupyterLab Developer's Guide

If you're making changes to the JupyterLab source code and you're concerned
about [accessibility](https://en.wikipedia.org/wiki/Accessibility), this page
is for you.

Looking for other ways to [contribute to accessibility on Jupyter projects](https://jupyter-accessibility.readthedocs.io/en/latest/contribute/guide.html)?

## Where to start

Thank you for being interested in improving JupyterLab's accessibility. Whether
making accessibility-specific fixes or considering the accessibility impacts of
another contribution, your work betters JupyterLab for everyone who uses it.

A common question when accessibility-minded developers come to JupyterLab is:
where do I get started?

If you don't have a lot of time to immerse yourself in the big picture of
JupyterLab accessibility work, then the GitHub issues labeled [good first issue
and accessibility](https://github.com/jupyterlab/jupyterlab/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22+label%3Atag%3AAccessibility)
are a good place to start.

If you want to more fully immerse yourself in the work of making JupyterLab (or
other Jupyter projects) more accessible, then a good place to start would be to
join the [Jupyter accessibility meeting](https://jupyter-accessibility.readthedocs.io/en/latest/community/index.html#team-meetings-and-notes)
that happens every other week. If you cannot attend the call, you can peruse the
meeting notes and find links to other resources on the [Jupyter Accessibility](https://jupyter-accessibility.readthedocs.io/) site.

Looking for a [frontend developer's orientation to the JupyterLab codebase](https://jupyter-accessibility.readthedocs.io/en/latest/resources/map-jupyterlab-frontend-architecture/README.html)?

## Best practices while developing

JupyterLab is a web application and authoring tool. Therefore the following
standards apply:

- WCAG - [Web Content Accessibility Guidelines](https://www.w3.org/WAI/standards-guidelines/wcag/)
- ARIA - [Accessible Rich Internet Applications](https://www.w3.org/WAI/standards-guidelines/aria/)
- ATAG - [Authoring Tool Accessibility Guidelines](https://www.w3.org/WAI/standards-guidelines/atag/)

These are good places to familiarize yourself with accessibility best practices
for developing websites (WCAG) and web applications (ARIA). Note that although
WCAG was created primarily for static websites, the guidelines are nonetheless
applicable to web apps like JupyterLab.

One resource that is often particularly helpful for developers looking for
examples and best practices is [ARIA Patterns](https://www.w3.org/WAI/ARIA/apg/patterns/). This web resource contains
examples of how to implement UI elements—such as menus, dialogs, breadcrumbs,
and more—in a more accessible way. However, be careful! Just because you can
implement a button using divs and aria attributes does not mean that you should!
(Most likely you should just use the button tag.) As a best practice, you should
only use ARIA when you cannot use existing HTML elements (button, input, nav,
aside, etc.) to achieve the UX that you desire.

Finally, there is much more accessibility knowledge on the Internet than there
is in JupyterLab or Project Jupyter alone. Whatever you decide to work on,
consider exploring accessibility resources in other spaces for similar or
equivalent efforts. Accessibility communities tend to be generous with the
resources they provide to improve web accessibility. Many times, searching for
the name of the task or issue appended with `accessibility` in a search engine
will give you several results and a chance to learn from the broader community
right away.

The rest of this section contains best practices specific to JupyterLab and its
development.

### Use color variables from the CSS

When fixing contrast or other visual accessibility issues in JupyterLab, it can
be tempting to pick a color and apply it to the part of the UI that you are
working on. However, it quickly becomes unmanageable to have color values spread
throughout the app across different CSS files. Therefore, the JupyterLab
codebase defines a set of [color variables](https://github.com/jupyterlab/jupyterlab/blob/main/packages/theme-light-extension/style/variables.css)
that can be used for borders, icons, and such. If you're adding any CSS that
needs a color value, please use one of the variables defined.

### Upstream fixes in Lumino

JupyterLab uses a front-end framework that was built specifically for it called
Lumino. Lumino is similar in some ways to React, Vue, and Angular, but it also
provides a number of UI widgets like menu bars, tab bars, and dock panels. As a
result, some of the accessibility issues reported in the JupyterLab GitHub repo
need to be fixed in the Lumino repo. A good resource for learning Lumino:
[PhosphorJS (now Lumino) Mentor Sessions](https://www.youtube.com/playlist?list=PLFx5GKe0BTjQyCKtiK9TI-ekSuSn_8a3J).
PhosphorJS was Lumino's previous name. There is a page with [notes from the
PhosphorJS sessions](https://gist.github.com/blink1073/1c21ec077acbb9178e01e14936ddda1b) that
also has a link to some additional videos that were not uploaded to YouTube.

It's not always obvious when an accessibility issue should be fixed in
JupyterLab or Lumino. Some guidance to help you identify where your change
should be made:

- Generally speaking, if you can fix the issue in Lumino, it's better to fix it
  in Lumino because then the fix will be absorbed in more places.
- However, for that same reason, because Lumino is used by more codebases than
  just JupyterLab—specifically, by JupyterLab extensions—one should be careful
  making changes to Lumino that might break downstream consumers/extensions.
- So an additional rule of thumb is: if you can't make the fix in Lumino without
  breaking dependants, then it might be better to make the fix in JupyterLab. In
  this case, you might take a two-track approach, where you fix the
  accessibility issue in JupyterLab and also submit a breaking fix in Lumino
  that targets a future, major, API-breaking release/version of Lumino.

## Automated Regression Testing

If you fix an accessibility issue in the source code but you don't add a test
with your fix, then there's a strong chance that your fix will be undone
accidentally by some future changes to the codebase.

Sometimes it's straightforward to unit-test an accessibility fix, such as when
[enabling keyboard shortcuts on a toolbar button](https://github.com/jupyterlab/jupyterlab/pull/5769). But often it's
difficult to unit-test accessibility fixes.

Therefore there is an effort underway to use [Playwright](https://playwright.dev) to write user-level [accessibility tests to
JupyterLab](https://github.com/Quansight-Labs/jupyter-a11y-testing/tree/main/testing/jupyterlab).
To illustrate how to use it within your development process, let's walk through
an example.

This example will involve three separate GitHub repos:

1. [Quansight-Labs/jupyter-a11y-testing](https://github.com/Quansight-Labs/jupyter-a11y-testing)
2. [jupyterlab/lumino](https://github.com/jupyterlab/lumino)
3. [jupyterlab/jupyterlab](https://github.com/jupyterlab/jupyterlab)

This is a real world example, taken from actual past work.

Let's say you do an accessibility audit of the start page of the JupyterLab UI
and find a tab trap in the top menu bar, meaning the user can press the tab key
to get into the menu bar but cannot easily get past it using only the keyboard.

You dig in further and discover that the [tab trap bug is in the
jupyterlab/lumino repo](https://github.com/jupyterlab/lumino/pull/373), so
you fork the jupyterlab/lumino repo, create a new branch called
`fix-tab-trap`, and open a pull request.

You decide that you want to write a test. This is one of those cases where writing a unit test would be a straightforward task. However, a unit test would only check the
top menu bar, so it would not prevent a reappearance of the issue that you
decided you want to fix once and for all, namely: you don't want any tab traps
anywhere on the JupyterLab start page.

So you decide that you want to [add a regression test to the
Quansight-Labs/jupyter-a11y-testing repo](https://github.com/Quansight-Labs/jupyter-a11y-testing/blob/f36bf5b2e8cb87613c637fc5aa03401c92ec58d0/testing/jupyterlab/tests/regression-tests/no-tab-trap-initial-page.test.ts).
This test checks that there are no tab traps on the JupyterLab start page by
using Playwright to open JupyterLab and press the tab key repeatedly. So as with
the Lumino repo before, you fork the Quansight-Labs/jupyter-a11y-testing repo,
create a branch called `test-tab-trap`, and open a pull request. The important
thing in this step is that you save your test file with a `.test.ts` extension
next to the other regression test files.

Now you want to run your test. Specifically, you want to run the test against a
build of JupyterLab that incorporates your Lumino fix. Here's how you would do
that.

Let's pretend that your GitHub username is _a11ydev_ and you've forked the
Lumino and testing repos and created the following branches on those forks, one
with your bug fix and the other with your test:

1. `a11ydev/lumino:fix-tab-trap`
2. `a11ydev/jupyter-a11y-testing:test-tab-trap`

On GitHub, go to your fork of the testing repo, _a11ydev/jupyter-a11y-testing_.
Make sure that you are on your `test-tab-trap` branch, which contains the
`.test.ts` file that you added. Then go to Actions and click on the workflow
titled "Run accessibility tests on JupyterLab." Click "Run workflow." This will
open a form to configure the workflow.

Here's how you should fill out the form:

1. Use workflow from: `test-tab-trap`
2. JupyterLab repo: `jupyterlab/jupyterlab`
3. Branch/tag/SHA: `main`
4. Test suite: leave blank
5. External package repo: `a11ydev/lumino`
6. External package ref: `fix-tab-trap`

Then press the "Run workflow" button. A GitHub action should then build
JupyterLab from source, linking your Lumino fork and branch, then run the test
suite, including your test, and then finally show the test results, hopefully
with your test passing.

Note that in this example you did not fork the jupyterlab/jupyterlab repo or
change the branch name to something other than "main" in the workflow config
form. This is because you did not need to modify the JupyterLab codebase to fix this issue. But if you were working on an issue that required you
to modify the JupyterLab codebase, you would do the same thing that you did
earlier with Lumino: fork the repo, create a branch with your fix, and then
enter your fork and branch in the workflow config form before running the
workflow. That should cause it to build a version of JupyterLab based on your
changes and then run the test suite against it. The workflow is flexible enough
to allow you to test against changes in JupyterLab or Lumino or both at the same
time if needed.

:::{note}
There are more [detailed instructions for how to use the GitHub workflow](https://github.com/Quansight-Labs/jupyter-a11y-testing/blob/main/testing/jupyterlab/README.md#running-the-accessibility-tests-) in the testing repo.
:::

## PR Review and Manual Testing

When reviewing code, documentation, or other contributions, you can use manual
testing to help prevent accessibility bugs. Typically you try and complete a
task related to your fix or contribution using an accessibility accommodation or
setting. Common options include:

- Using a [screen reader](https://en.wikipedia.org/wiki/Screen_reader).
- Zooming the page up to 400% via your browser.
- Unplugging or not using your mouse. Navigate only with the keyboard.
- [Emulating vision deficiencies](https://learn.microsoft.com/en-us/microsoft-edge/devtools-guide-chromium/accessibility/emulate-vision-deficiencies#open-the-rendering-tool)
  (Chrome, Edge, and Firefox all provide built-in tools to do this.)

While testing, take note of what happens and compare it to what you can do to
complete the task without your chosen accessibility accommodation. If there is
anything you cannot complete, then you have a blocking accessibility issue. Even
though your use of assistive tech or an accessibility accommodation will likely
differ from someone who uses them regularly, knowing the results is helpful to
tell if JupyterLab is behaving as you expect.

## Useful tools for development

Here is a list of some apps that developers have found useful while doing
accessibility work in JupyterLab:

- Chrome Dev Tools for [discovering and fixing low contrast text](https://developer.chrome.com/docs/devtools/accessibility/contrast/) and
  for [viewing the accessibility tree](https://developer.chrome.com/docs/devtools/accessibility/reference/#tree)
- [Axe DevTools](https://chrome.google.com/webstore/detail/axe-devtools-web-accessib/lhdoppojpmngadmnindnejefpokejbdd),
  extension for Chrome Dev Tools
- [Color Contrast Analyzer](https://www.tpgi.com/color-contrast-checker/),
  desktop app for Windows and Mac
- [Polypane](https://polypane.app/), desktop browser with some dev tools
  built in (note it's not free but it does have a free trial)
- [Axe Accessibility Linter](https://marketplace.visualstudio.com/items?itemName=deque-systems.vscode-axe-linter),
  extension for VS Code
- And of course, screen readers such as JAWS, NVDA, and VoiceOver.
