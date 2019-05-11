**[Installation](#installation)** |
**[Documentation](http://jupyterlab.readthedocs.io)** |
**[Contributing](#contributing)** |
**[License](#license)** |
**[Team](#team)** |
**[Getting help](#getting-help)** |

# [JupyterLab](http://jupyterlab.github.io/jupyterlab/)

[![PyPI version](https://badge.fury.io/py/jupyterlab.svg)](https://badge.fury.io/py/jupyterlab)
[![Downloads](https://pepy.tech/badge/jupyterlab/month)](https://pepy.tech/project/jupyterlab/month)
[![Build Status](https://dev.azure.com/jupyterlab/jupyterlab/_apis/build/status/jupyterlab.jupyterlab?branchName=master)](https://dev.azure.com/jupyterlab/jupyterlab/_build/latest?definitionId=1&branchName=master)
[![Documentation Status](https://readthedocs.org/projects/jupyterlab/badge/?version=stable)](http://jupyterlab.readthedocs.io/en/stable/)
[![GitHub](https://img.shields.io/badge/issue_tracking-github-blue.svg)](https://github.com/jupyterlab/jupyterlab/issues)
[![Discourse](https://img.shields.io/badge/help_forum-discourse-blue.svg)](https://discourse.jupyter.org/c/jupyterlab)
[![Gitter](https://img.shields.io/badge/social_chat-gitter-blue.svg)](https://gitter.im/jupyterlab/jupyterlab)

[![Binder](https://mybinder.org/badge_logo.svg)](https://mybinder.org/v2/gh/jupyterlab/jupyterlab-demo/master?urlpath=lab/tree/demo)

An extensible environment for interactive and reproducible computing, based on the
Jupyter Notebook and Architecture. [Currently ready for users.](https://blog.jupyter.org/jupyterlab-is-ready-for-users-5a6f039b8906)

[JupyterLab](http://jupyterlab.readthedocs.io/en/stable/) is the next-generation user interface for [Project Jupyter](https://jupyter.org) offering
all the familiar building blocks of the classic Jupyter Notebook (notebook,
terminal, text editor, file browser, rich outputs, etc.) in a flexible and
powerful user interface.
JupyterLab will eventually replace the classic Jupyter Notebook.

JupyterLab can be extended using [npm](https://www.npmjs.com/) packages
that use our public APIs. To find JupyterLab extensions, search for the npm keyword [jupyterlab-extension](https://www.npmjs.com/search?q=keywords:jupyterlab-extension) or the GitHub topic [jupyterlab-extension](https://github.com/topics/jupyterlab-extension). To learn more about extensions, see the [user documentation](https://jupyterlab.readthedocs.io/en/latest/user/extensions.html).

The current JupyterLab releases are suitable for general
usage, and the extension APIs will continue to
evolve for JupyterLab extension developers.

Read the latest version's documentation on [ReadTheDocs](http://jupyterlab.readthedocs.io/en/latest/).

---

## Getting started

### Installation

[install](http://jupyterlab.readthedocs.io/en/stable/getting_started/installation.html) JupyterLab using `conda`, `pip`, or `pipenv`. Conda is recommended if you have no installation preference.

Project installation instructions from the git sources are available in the [contributor documentation](CONTRIBUTING.md).

#### conda

Conda is an open source package management system and environment management system that runs on Windows, macOS, and Linux. Conda packages and distributes software for any language, and by default uses the Anaconda repository managed by Anaconda Inc. To install conda, please [see the conda installation instructions](https://docs.conda.io/projects/conda/en/latest/user-guide/install/index.html).

Install the [JupyterLab `conda` package](https://anaconda.org/conda-forge/jupyterlab) with:

```bash
conda install -c conda-forge jupyterlab
```

#### pip

pip is a package management system for installing and updating Python packages, and comes with any Python installation. On Ubuntu, SUSE Enterprise Linux, openSUSE, and Fedora Linux, use the system package manager to install the `python3-pip` package. [\_The Hitchhiker's Guide to Python_provides guidance on how to install Python](https://docs.python-guide.org/starting/installation/); Another option is to [install Python directly from python.org](https://www.python.org/getit/). We suggest you [upgrade pip](https://pip.pypa.io/en/stable/installing/) before using it to install other programs.

JupyterLab requires Python 3.5 or higher.

1.  When using Windows with Python version 3.5 or higher, use the [Python Launcher for Windows](https://docs.python.org/3/using/windows.html?highlight=shebang#python-launcher-for-windows) to use `pip` with Python version 3:
    ```bash
    py -3 -m pip install jupyterlab
    ```
2.  If the system has a `python3` command (standard on Unix-like systems), install with the comand:
    ```bash
    python3 -m pip install jupyterlab
    ```
3.  Using the `python` command directly is another option, but this will use the _current_ version of Python (which may be Python version 2 or version 3 if both are installed):
    ```bash
    python -m pip install jupyterlab
    ```

Some systems have a `pip3` command that has the same effect as `python3 -m pip` and/or a `pip` command that behaves the same as `python -m pip`.

Adding `--user` after `pip install` will install the files to a local user install directory (typically `~/.local/` or `%APPDATA%\Python` on Windows) instead of the system-wide directory. This can be helpful, especially if writing to the system-wide directory is not permitted. However, the user-level `bin` directory must be added to the `PATH` environment variable in order to launch `jupyter lab`.

#### pipenv

`Pipenv` provides users and developers of applications with an easy method to setup a working environment, however Python must be installed first. See the [pipenv installation documentation](https://docs.pipenv.org/en/latest/install/) to use Pipenv if it is not installed.

`pipenv` can be installed as:

```bash
pipenv install jupyterlab
pipenv shell
```

or from a git checkout:

```bash
pipenv install git+git://github.com/jupyterlab/jupyterlab.git#egg=jupyterlab
pipenv shell
```

When using `pipenv`, in order to launch `jupyter lab`, activate the project's virtualenv. For example, in the directory where `pipenv`'s `Pipfile` and `Pipfile.lock` live (i.e., where the above commands were run):

```bash
pipenv shell
jupyter lab
```

#### Installing with Previous Versions of Jupyter Notebook

When using a version of Jupyter Notebook earlier than 5.3, the following command must be run
after installation to enable the JupyterLab server extension:

```bash
jupyter serverextension enable --py jupyterlab --sys-prefix
```

### Running

Start up JupyterLab using:

```bash
jupyter lab
```

JupyterLab will open automatically in the browser. See the [documentation](http://jupyterlab.readthedocs.io/en/stable/getting_started/starting.html) for additional details.

### Prerequisites and Supported Browsers

Jupyter notebook version 4.3 or later is required. To check the notebook version, run the command:

```bash
jupyter notebook --version
```

The latest versions of the following browsers are currently _known to work_:

- Firefox
- Chrome
- Safari

See our [documentation](http://jupyterlab.readthedocs.io/en/latest/getting_started/installation.html) for additional details.

---

## Development

### Contributing

To contribute to the project, please read the [contributor documentation](CONTRIBUTING.md).

JupyterLab follows the Jupyter [Community Guides](https://jupyter.readthedocs.io/en/latest/community/content-community.html).

### Extending JupyterLab

To start developing an extension, see the [developer documentation](https://jupyterlab.readthedocs.io/en/latest/developer/extension_dev.html) and the [API docs](http://jupyterlab.github.io/jupyterlab/index.html).

### License

JupyterLab uses a shared copyright model that enables all contributors to maintain the
copyright on their contributions. All code is licensed under the terms of the revised [BSD license](https://github.com/jupyterlab/jupyterlab/blob/master/LICENSE).

### Team

JupyterLab is part of [Project Jupyter](http://jupyter.org/) and is developed by an open community. The maintenance team is assisted by a much larger group of contributors to JupyterLab and Project Jupyter as a whole.

JupyterLab's current maintainers are listed in alphabetical order, with affiliation, and main areas of contribution:

- Chris Colbert, Project Jupyter (co-creator, application/low-level architecture,
  technical leadership, vision, PhosphorJS)
- Afshin Darian, Two Sigma (co-creator, application/high-level architecture,
  prolific contributions throughout the code base).
- Jessica Forde, Project Jupyter (demo, documentation)
- Tim George, Cal Poly (UI/UX design, strategy, management, user needs analysis)
- Brian Granger, Cal Poly (co-creator, strategy, vision, management, UI/UX design,
  architecture).
- Jason Grout, Bloomberg (co-creator, vision, general development).
- Fernando Perez, UC Berkeley (co-creator, vision).
- Ian Rose, Quansight/City of LA (general core development, extensions).
- Saul Shanabrook, Quansight (general development, extensions)
- Steven Silvester, JPMorgan Chase (co-creator, release management, packaging,
  prolific contributions throughout the code base).

Maintainer emeritus:

- Cameron Oelsen, Cal Poly (UI/UX design).

This list is provided to give the reader context on who we are and how our team functions.
To be listed, please submit a pull request with your information.

---

## Getting help

We encourage you to ask questions on the [Discourse forum](https://discourse.jupyter.org/c/jupyterlab). A question answered there can become a useful resource for others.

Please use the [GitHub issues page](https://github.com/jupyterlab/jupyterlab/issues) to provide feedback or submit a bug report.

### Weekly Dev Meeting

We have videoconference meetings every week where we discuss what we have been working on and get feedback from one another.

Anyone is welcome to attend, if they would like to discuss a topic or just to listen in.

- When: Wednesdays [9AM Pacific Time](https://www.thetimezoneconverter.com/?t=9%3A00%20am&tz=San%20Francisco&)
- Where: [`calpoly/jupyter` Zoom](https://calpoly.zoom.us/my/jupyter)
- What: [Meeting notes on Dropbox Paper](https://paper.dropbox.com/doc/JLab-Dev-Meeting-Minutes-2019--AZlv6L3jnv8ntl6kJK88y5M5Ag-Lj0P4kI2JrbA0eXHZSdY5)
