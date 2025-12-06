**[Installation](#installation)** |
**[Documentation](https://jupyterlab.readthedocs.io)** |
**[Contributing](#contributing)** |
**[License](#license)** |
**[Team](#team)** |
**[Getting help](#getting-help)** |

# [JupyterLab](https://jupyterlab.readthedocs.io)

[![PyPI version](https://badge.fury.io/py/jupyterlab.svg)](https://badge.fury.io/py/jupyterlab)
[![PyPI Downloads](https://static.pepy.tech/personalized-badge/jupyterlab?period=monthly&units=INTERNATIONAL_SYSTEM&left_color=GRAY&right_color=GREEN&left_text=downloads)](https://pepy.tech/projects/jupyterlab)
[![Build Status](https://github.com/jupyterlab/jupyterlab/workflows/Linux%20Tests/badge.svg)](https://github.com/jupyterlab/jupyterlab/actions?query=branch%3Amain+workflow%3A%22Linux+Tests%22)
[![Build Status](https://github.com/jupyterlab/jupyterlab/workflows/Windows%20Tests/badge.svg)](https://github.com/jupyterlab/jupyterlab/actions?query=branch%3Amain+workflow%3A%22Windows+Tests%22)
[![Documentation Status](https://readthedocs.org/projects/jupyterlab/badge/?version=stable)](http://jupyterlab.readthedocs.io/en/stable/)
[![Crowdin](https://badges.crowdin.net/jupyterlab/localized.svg)](https://crowdin.com/project/jupyterlab)
[![OpenSSF Best Practices](https://www.bestpractices.dev/projects/8675/badge)](https://www.bestpractices.dev/projects/8675)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/jupyterlab/jupyterlab/badge)](https://scorecard.dev/viewer/?uri=github.com/jupyterlab/jupyterlab)
[![GitHub](https://img.shields.io/badge/issue_tracking-github-blue.svg)](https://github.com/jupyterlab/jupyterlab/issues)
[![Discourse](https://img.shields.io/badge/help_forum-discourse-blue.svg)](https://discourse.jupyter.org/c/jupyterlab)
[![Zulip](https://img.shields.io/badge/social_chat-zulip-blue.svg)](https://jupyter.zulipchat.com/#narrow/channel/469762-jupyterlab)

[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/jupyterlab/jupyterlab-demo/HEAD?urlpath=lab/tree/demo)

An extensible environment for interactive and reproducible computing, based on the
Jupyter Notebook and Architecture.

[JupyterLab](http://jupyterlab.readthedocs.io/en/stable/) is the next-generation user interface for [Project Jupyter](https://jupyter.org) offering
all the familiar building blocks of the classic Jupyter Notebook (notebook,
terminal, text editor, file browser, rich outputs, etc.) in a flexible and
powerful user interface.

JupyterLab can be extended using [npm](https://www.npmjs.com/) packages
that use our public APIs. The _prebuilt_ extensions can be distributed
via [PyPI](https://pypi.org/search/?q=jupyterlab&o=-created&c=Framework+%3A%3A+Jupyter),
conda, and other package managers. The _source_ extensions can be installed
directly from npm (search for [jupyterlab-extension](https://www.npmjs.com/search?q=keywords:jupyterlab-extension)) but require an additional build step.
You can also find JupyterLab extensions exploring GitHub topic [jupyterlab-extension](https://github.com/topics/jupyterlab-extension).
To learn more about extensions, see the [user documentation](https://jupyterlab.readthedocs.io/en/latest/user/extensions.html).

Read the current JupyterLab documentation on [ReadTheDocs](http://jupyterlab.readthedocs.io/en/stable/).

> [!IMPORTANT]
> JupyterLab 3 reached its end of maintenance date on May 15, 2024. Fixes for critical issues will still be backported until December 31, 2024. If you are still running JupyterLab 3, we strongly encourage you to **upgrade to JupyterLab 4 as soon as possible.** For more information, see [JupyterLab 3 end of maintenance](https://blog.jupyter.org/jupyterlab-3-end-of-maintenance-879778927db2) on the Jupyter Blog.

---

## Getting started

### Installation

If you use [conda](https://docs.conda.io/en/latest/), [mamba](https://mamba.readthedocs.io/en/latest/), or [pip](https://docs.python.org/3/installing/index.html), you can install JupyterLab with one of the following commands.

- If you use conda:
  ```shell
  conda install -c conda-forge jupyterlab
  ```
- If you use mamba:
  ```shell
  mamba install -c conda-forge jupyterlab
  ```
- If you use pip:
  ```shell
  pip install jupyterlab
  ```
  If installing using `pip install --user`, you must add the user-level `bin` directory to your `PATH` environment variable in order to launch `jupyter lab`. If you are using a Unix derivative (e.g., FreeBSD, GNU/Linux, macOS), you can do this by running `export PATH="$HOME/.local/bin:$PATH"`.

For more detailed instructions, consult the [installation guide](http://jupyterlab.readthedocs.io/en/latest/getting_started/installation.html). Project installation instructions from the git sources are available in the [contributor documentation](CONTRIBUTING.md).

#### Installing with Previous Versions of Jupyter Notebook

When using a version of Jupyter Notebook earlier than 5.3, the following command must be run after installing JupyterLab to enable the JupyterLab server extension:

```bash
jupyter serverextension enable --py jupyterlab --sys-prefix
```

### Running

Start up JupyterLab using:

```bash
jupyter lab
```

JupyterLab will open automatically in the browser. See the [documentation](http://jupyterlab.readthedocs.io/en/latest/getting_started/starting.html) for additional details.

If you encounter an error like "Command 'jupyter' not found", please make sure `PATH` environment variable is set correctly. Alternatively, you can start up JupyterLab using `~/.local/bin/jupyter lab` without changing the `PATH` environment variable.

### Prerequisites and Supported Browsers

The latest versions of the following browsers are currently _known to work_:

- Firefox
- Chrome
- Safari

See our [documentation](http://jupyterlab.readthedocs.io/en/latest/getting_started/installation.html) for additional details.

---

## Getting help

We encourage you to ask questions on the [Discourse forum](https://discourse.jupyter.org/c/jupyterlab). A question answered there can become a useful resource for others.

### Bug report

To report a bug please read the [guidelines](https://jupyterlab.readthedocs.io/en/latest/getting_started/issue.html) and then open a [Github issue](https://github.com/jupyterlab/jupyterlab/issues/new?labels=bug%2C+status%3ANeeds+Triage&template=bug_report.md). To keep resolved issues self-contained, the [lock bot](https://github.com/apps/lock) will lock closed issues as resolved after a period of inactivity. If a related discussion is still needed after an issue is locked, please open a new issue and reference the old issue.

### Feature request

We also welcome suggestions for new features as they help make the project more useful for everyone. To request a feature please use the [feature request template](https://github.com/jupyterlab/jupyterlab/issues/new?labels=enhancement%2C+status%3ANeeds+Triage&template=feature_request.md).

---

## Development

### Extending JupyterLab

To start developing an extension for JupyterLab, see the [developer documentation](https://jupyterlab.readthedocs.io/en/latest/extension/extension_dev.html) and the [API docs](https://jupyterlab.readthedocs.io/en/latest/api/).

### Contributing

To contribute code or documentation to JupyterLab itself, please read the [contributor documentation](https://jupyterlab.readthedocs.io/en/latest/developer/contributing.html).

JupyterLab follows the Jupyter [Community Guides](https://jupyter.readthedocs.io/en/latest/community/content-community.html).

### License

JupyterLab uses a shared copyright model that enables all contributors to maintain the
copyright on their contributions. All code is licensed under the terms of the revised [BSD license](https://github.com/jupyterlab/jupyterlab/blob/main/LICENSE).

### Team

JupyterLab is part of [Project Jupyter](https://jupyter.org/) and is developed by an open community. The maintenance team is assisted by a much larger group of contributors to JupyterLab and Project Jupyter as a whole.

JupyterLab's current maintainers are listed in alphabetical order, with affiliation, and main areas of contribution:

- Mehmet Bektas, Netflix (general development, extensions).
- Alex Bozarth, IBM (general development, extensions).
- Eric Charles, Datalayer, (general development, extensions).
- Frédéric Collonval, WebScIT (general development, extensions).
- Martha Cryan, Mito (general development, extensions).
- Afshin Darian, QuantStack (co-creator, application/high-level architecture,
  prolific contributions throughout the code base).
- Vidar T. Fauske, JPMorgan Chase (general development, extensions).
- Brian Granger, AWS (co-creator, strategy, vision, management, UI/UX design,
  architecture).
- Jason Grout, Databricks (co-creator, vision, general development).
- Michał Krassowski, Quansight (general development, extensions).
- Max Klein, JPMorgan Chase (UI Package, build system, general development, extensions).
- Gonzalo Peña-Castellanos, QuanSight (general development, i18n, extensions).
- Fernando Perez, UC Berkeley (co-creator, vision).
- Steven Silvester, MongoDB (co-creator, release management, packaging,
  prolific contributions throughout the code base).
- Jeremy Tuloup, QuantStack (general development, extensions).

Maintainer emeritus:

- Chris Colbert, Project Jupyter (co-creator, application/low-level architecture,
  technical leadership, vision, PhosphorJS)
- Jessica Forde, Project Jupyter (demo, documentation)
- Tim George, Cal Poly (UI/UX design, strategy, management, user needs analysis).
- Cameron Oelsen, Cal Poly (UI/UX design).
- Isabela Presedo-Floyd, QuanSight Labs (design/UX).
- Ian Rose, Quansight/City of LA (general core development, extensions).
- Andrew Schlaepfer, Bloomberg (general development, extensions).
- Saul Shanabrook, Quansight (general development, extensions)

This list is provided to give the reader context on who we are and how our team functions.
To be listed, please submit a pull request with your information.

---

### Weekly Dev Meeting

We have videoconference meetings every week where we discuss what we have been working on and get feedback from one another.

Anyone is welcome to attend, if they would like to discuss a topic or just listen in.

- When: Wednesdays 9:00 AM Pacific Time (USA)
- Where: [`jovyan` Zoom](https://zoom.us/j/95228013874?pwd=Ep7HIk8t9JP6VToxt1Wj4P7K5PshC0.1)
- What: [Meeting notes](https://hackmd.io/Y7fBMQPSQ1C08SDGI-fwtg?both)

> Notes are archived on [GitHub Jupyter Frontends team compass](https://github.com/jupyterlab/frontends-team-compass/issues).
