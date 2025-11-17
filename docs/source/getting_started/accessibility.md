% Copyright (c) Jupyter Development Team.

% Distributed under the terms of the Modified BSD License.

(accessibility)=

# JupyterLab Accessibility Statement

:::{note}
This statement was last updated on the 22nd of July 2024.
:::

## Jupyter Notebook versus JupyterLab

For accessibility purposes, it is recommended to use
[Jupyter Notebook](https://jupyter-notebook.readthedocs.io/en/stable/) over JupyterLab.

A comparison of the two apps will help to explain this recommendation. Jupyter
Notebook and JupyterLab are both web apps for authoring computational notebooks.
But Jupyter Notebook has a document-centric user interface whereas JupyterLab
provides multiple panels and tabs designed to work with several notebooks and
extensions in the same interface. Jupyter Notebook is more like Google Docs, in
which each document opens in a separate browser tab. JupyterLab is more like VS
Code for the Web, in which the app provides its own, in-app tabs so that
multiple documents can be opened without having to open more browser tabs.
Because Jupyter Notebook has a simplified UI, it poses fewer accessibility
challenges than JupyterLab (in particular, it's easier to zoom in). But because
it shares the same codebase, it also benefits from all of the accessibility work
done in JupyterLab. This is why Jupyter Notebook is recommended over JupyterLab.

## Jupyter audits

This section includes audits from different stakeholders on Jupyter products.

- [JupyterLab v3.4.5 400% Zoom Audit](https://github.com/Quansight-Labs/jupyterlab-accessible-themes/issues/34) - conducted in 2022
- [JupyterLab v2.2.6 WCAG 2.1](https://github.com/jupyterlab/jupyterlab/issues/9399) - conducted in 2020
- [Jupyter Notebook WCAG 2.0](https://github.com/jupyter/accessibility/issues/7) - conducted in 2019

Many of the issues identified in these audits can be tracked in issues with the [tag:Accessibility](https://github.com/jupyterlab/jupyterlab/issues?q=is%3Aopen+is%3Aissue+label%3Atag%3AAccessibility) label.

## Accessibility Statement for JupyterLab

Edited from the [W3C accessibility statement generator](https://www.w3.org/WAI/planning/statements/generator/#create)

This is an accessibility statement for JupyterLab from Jupyter accessibility contributors.

### The current state of JupyterLab

Jupyter accessibility statements are living documents. This statement was first created for JupyterLab 3.4.4 on 16 May 2022 using the [W3C Accessibility Statement Generator Tool](https://www.w3.org/WAI/planning/statements/) with additions and edits from the Jupyter accessibility contributors community.

#### Conformance status

The [Web Content Accessibility Guidelines (WCAG)](https://www.w3.org/WAI/standards-guidelines/wcag) defines requirements for designers and developers to improve accessibility for people with disabilities. It defines three levels of conformance: Level A, Level AA, and Level AAA. JupyterLab is nonconforming with WCAG 2.0 Level AA (equivalent to Section 508 in the United States). Nonconforming means that the content does not meet the accessibility standard.

JupyterLab's accessibility does not exist in isolation. JupyterLab inherits much from the many projects it is built upon and its accessibility conformance may impact projects built off of JupyterLab or its components. The accessibility of this ecosystem is interlinked, so conformance may need to be resolved at different levels in order to impact JupyterLab positively.

#### Compatibility with browsers and assistive technology

#### JupyterLab is designed to be compatible with the following

**Operating systems:**

- Windows
- macOS
- Linux
- iOS
- Android

**Browsers (mobile and desktop):**

- Firefox
- Chrome
- Safari
- Chromium browsers

#### JupyterLab is not compatible with

**Operating systems:**

**Browsers (mobile and desktop):**

- Internet Explorer
- Edge < 79

**Assistive technology:**

- [JAWS](<https://en.wikipedia.org/wiki/JAWS_(screen_reader)>)
- [NVDA](https://assistivlabs.com/assistive-tech/screen-readers/nvda)
- [VoiceOver](https://www.apple.com/accessibility/vision/)
- Narrator
- Orca screen readers
- Voice control technology

### Technical specifications

Accessibility of JupyterLab relies on the following technologies to work with the particular combination of web browser and any assistive technologies or plugins installed on your computer:

- HTML
- WAI-ARIA
- CSS
- JavaScript

These technologies are relied upon for conformance with the accessibility standards used.

#### Limitations and alternatives

Despite our best efforts to ensure accessibility of JupyterLab, there may be some limitations. Below is a description of known limitations, and potential solutions. Please contact us if you observe an issue not listed below.

**Known limitations for JupyterLab:**

1. **Documents**: Documents written by the community may not include accessible content because we do not and cannot review every document that can be opened and edited in JupyterLab.
   To support accessible documents, we are drafting guidelines for accessible document content with an emphasis on Jupyter notebooks.
   Please report the issue to the author and [open an issue on jupyter/accessibility](https://github.com/jupyter/accessibility/issues/new)
   describing the problem and the behavior you expect, so we may integrate it into our content guidelines.
2. **JupyterLab extensions**: JupyterLab extensions written by the community may not be accessible
   because JupyterLab extensions can be written by anyone in the community and have no standard review process.
   We do not and can not review every JupyterLab extension. To support accessible extensions,
   we encourage extension authors to use existing, accessible JupyterLab components for their extensions.
   We also provide periodic opportunities for community education on accessibility.
   Please report the issue to the author and let them know the [jupyter/accessibility](https://github.com/jupyter/accessibility/) community may be able to provide guidance.

#### Assessment approach

Jupyter accessibility contributors assessed the accessibility of JupyterLab by the following approaches:

- Self-evaluation
- Automated testing (can be found at [the jupyter-a11y-testing repository](https://github.com/Quansight-Labs/jupyter-a11y-testing)).
- User feedback

#### Evaluation report

- An evaluation for JupyterLab is available at: [jupyterlab/jupyterlab/issues/9399](https://github.com/jupyterlab/jupyterlab/issues/9399).
- User reports on JupyterLab's accessibility are available at: [the jupyterlab/jupyterlab label tag:Accessibility](https://github.com/jupyterlab/jupyterlab/labels/tag%3AAccessibility).

### What the community is doing

#### Measures to support accessibility

Jupyter accessibility contributors take the following measures to ensure accessibility of JupyterLab:

- Include accessibility as part of our mission statement.
- Provide continual accessibility training for our community.
- Assign clear accessibility goals and responsibilities.
- Employ formal accessibility quality assurance methods.
- Document changes, approaches, and improvements to the above methods and to JupyterLab itself.

### Feedback and Formal complaints

We welcome your feedback and formal complaints on the accessibility status of JupyterLab.
Please let us know if you encounter accessibility barriers on JupyterLab:

- [Write an issue on jupyter/accessibility](https://github.com/jupyter/accessibility/issues/new)
- [Write an issue on jupyterlab/jupyterlab](https://github.com/jupyterlab/jupyterlab/issues/new) and request it be labeled [tag:Accessibility](https://github.com/jupyterlab/jupyterlab/labels/tag%3AAccessibility)
- If you are interested in being part of any potential research or organized feedback initiatives, please reach out via one of the many JupyterLab community channels. Gauging community interest in user research participation helps us gain the support to make it happen.

Please note there is no private way to contact us for JupyterLab accessibility issues.

Also please note that JupyterLab is an open-source project and that Jupyter accessibility contributors are a group defined on a voluntary basis. Like many other open-source projects, we cannot guarantee how long it may take to respond to and resolve an issue, though we do make an effort to do it as quickly as is possible with our resources.

Thanks for your patience and understanding.

### Links

- [jupyter-accessibility-repo](https://github.com/jupyter/accessibility)
- [jupyter-accessibility-repo-issues](https://github.com/jupyter/accessibility/issues/new)
- [jupyterlab-repo-issues](https://github.com/jupyterlab/jupyterlab/issues/new)
- [CZI - JupyterLab accessibility grant 2021-23 roadmap](https://jupyter-a11y.netlify.app/roadmap/intro.html).
