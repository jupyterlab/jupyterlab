**[Installation](#installation)** |
**[Documentation](http://jupyterlab.readthedocs.io)** |
**[Contributing](#contributing)** |
**[License](#license)** |
**[Team](#team)** |
**[Getting help](#getting-help)** |

# [JupyterLab](http://jupyterlab.github.io/jupyterlab/)

[![PyPI version](https://badge.fury.io/py/jupyterlab.svg)](https://badge.fury.io/py/jupyterlab)
[![Build Status](https://travis-ci.org/jupyterlab/jupyterlab.svg?branch=master)](https://travis-ci.org/jupyterlab/jupyterlab)
[![Documentation Status](https://readthedocs.org/projects/jupyterlab/badge/?version=stable)](http://jupyterlab.readthedocs.io/en/stable/)
[![Google Group](https://img.shields.io/badge/-Google%20Group-lightgrey.svg)](https://groups.google.com/forum/#!forum/jupyter)
[![Join the Gitter Chat](https://img.shields.io/gitter/room/nwjs/nw.js.svg)](https://gitter.im/jupyterlab/jupyterlab)
[![Binder](https://mybinder.org/badge.svg)](https://mybinder.org/v2/gh/jupyterlab/jupyterlab-demo/0b0bb42e3e43ee2ebe1c0424d3a88a9b9edcd055?urlpath=lab%2Ftree%2Fdemo%2FLorenz.ipynb)

An extensible environment for interactive and reproducible computing, based on the
Jupyter Notebook and Architecture. [Currently ready for users.](https://blog.jupyter.org/jupyterlab-is-ready-for-users-5a6f039b8906)

[JupyterLab](http://jupyterlab.readthedocs.io/en/stable/) is the next-generation user interface for [Project Jupyter](https://jupyter.org). It offers
all the familiar building blocks of the classic Jupyter Notebook (notebook,
terminal, text editor, file browser, rich outputs, etc.) in a flexible and
powerful user interface.
Eventually, JupyterLab will replace the classic Jupyter Notebook.

JupyterLab can be extended using extensions that are [npm](https://www.npmjs.com/) packages
and use our public APIs. You can search for the GitHub topic [jupyterlab-extension](https://github.com/topics/jupyterlab-extension) to find extensions. To learn more about extensions, see our [user documentation](https://jupyterlab.readthedocs.io/en/latest/user/extensions.html).

The current JupyterLab releases are suitable for general
usage. For JupyterLab extension developers, the extension APIs will continue to
evolve.

Read the latest version of our documentation on [ReadTheDocs](http://jupyterlab.readthedocs.io/en/latest/).

---

## Getting started

### Installation

You can [install](http://jupyterlab.readthedocs.io/en/stable/getting_started/installation.html) JupyterLab using `conda`, `pip`, or `pipenv`. We recommend using conda if you do not have a preference.

Instructions on how to install the project from the git sources are available in our [contributor documentation](CONTRIBUTING.md).

#### conda

Conda is an open source package management system and environment management system that runs on Windows, macOS and Linux. It can package and distribute software for any language, and by default uses the Anaconda repository managed by Anaconda, Inc. If you wish to use conda and do not have it, [see the conda installation instructions](https://conda.io/docs/user-guide/install/index.html).

If you use [`conda`](https://anaconda.org/conda-forge/jupyterlab), you can install as:

```bash
conda install -c conda-forge jupyterlab
```

#### pip

pip is a package management system for installing and updating Python packages. pip comes with Python, so you get pip simply by installing Python. On Ubuntu and Fedora Linux, you can simply use your system package manager to install the `python3-pip` package. [_The Hitchhiker's Guide to Python_ provides some guidance on how to install Python on your system if it isn't already](https://docs.python-guide.org/starting/installation/); you can also [install Python directly from python.org](https://www.python.org/getit/). You might want to [upgrade pip](https://pip.pypa.io/en/stable/installing/) before using it to install other programs.

JupyterLab requires Python 3.5 or higher.

1.  If you are using Windows with Python version 3.5 or higher, use the [Python Launcher for Windows](https://docs.python.org/3/using/windows.html?highlight=shebang#python-launcher-for-windows) to use `pip` with Python version 3:
    ```bash
    py -3 -m pip install jupyterlab
    ```
2.  If your system has a `python3` command (standard on Unix-like systems), install with:
    ```bash
    python3 -m pip install jupyterlab
    ```
3.  You can also just use the `python` command directly, but this will use the _current_ version of Python in your environment (which may be version 2 or version 3 of Python if you have both installed):
    ```bash
    python -m pip install jupyterlab
    ```

Some systems have a `pip3` command that has the same effect as `python3 -m pip` and/or a `pip` command that has the same effect as `python -m pip`.

If you add `--user` after `pip install` you will install the files to a local user install directory (typically `~/.local/` or `%APPDATA%\Python` on Windows) instead of the system-wide directory. This can be helpful, especially if you are not allowed to write to the system-wide directory. However, if you do this, you must add the user-level `bin` directory to your `PATH` environment variable in order to launch `jupyter lab`.

#### pipenv

`Pipenv` is intended to provide users and developers of applications with an easy method to setup a working environment. You must have Python installed first. See the [pipenv installation documentation](https://docs.pipenv.org/install) if you wish to use it but do not have it installed.

If you use `pipenv`, you can install it as:

```bash
pipenv install jupyterlab
pipenv shell
```

or from a git checkout:

```bash
pipenv install git+git://github.com/jupyterlab/jupyterlab.git#egg=jupyterlab
pipenv shell
```

When using `pipenv`, in order to launch `jupyter lab`, you must activate the project's virtualenv. For example, in the directory where `pipenv`'s `Pipfile` and `Pipfile.lock` live (i.e., where you ran the above commands):

```bash
pipenv shell
jupyter lab
```

#### Installing with Previous Versions of Jupyter Notebook

If you are using a version of Jupyter Notebook earlier than 5.3, then you must also run the following command
after installation to enable the JupyterLab server extension:

```bash
jupyter serverextension enable --py jupyterlab --sys-prefix
```

### Running

Start up JupyterLab using:

```bash
jupyter lab
```

JupyterLab will open automatically in your browser. See our [documentation](http://jupyterlab.readthedocs.io/en/stable/getting_started/starting.html) for additional details.

### Prerequisites and Supported Browsers

Jupyter notebook version 4.3 or later. To check the notebook version:

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

If you would like to contribute to the project, please read our [contributor documentation](CONTRIBUTING.md).

JupyterLab follows the Jupyter [Community Guides](https://jupyter.readthedocs.io/en/latest/community/content-community.html).

### Extending JupyterLab

To start developing your own extension, see our [developers documentation](https://jupyterlab.readthedocs.io/en/latest/developer/extension_dev.html) and [API docs](http://jupyterlab.github.io/jupyterlab/index.html).

### License

We use a shared copyright model that enables all contributors to maintain the
copyright on their contributions. All code is licensed under the terms of the revised [BSD license](https://github.com/jupyterlab/jupyterlab/blob/master/LICENSE).

### Team

JupyterLab is part of [Project Jupyter](http://jupyter.org/) and is developed by an open community of contributors. Our maintainer team is accompanied by a much larger group of contributors to JupyterLab and Project Jupyter as a whole.

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
- Ian Rose, UC Berkeley (Real-time collaboration, document architecture).
- Saul Shanabrook, Quansight (general development, extensions)
- Steven Silvester, JPMorgan Chase (co-creator, release management, packaging,
  prolific contributions throughout the code base).

Maintainer emeritus:

- Cameron Oelsen, Cal Poly (UI/UX design).

This list is provided to help provide context about who we are and how our team functions.
If you would like to be listed, please submit a pull request with your information.

---

## Getting help

We encourage you to ask questions on the [mailing list](https://groups.google.com/forum/#!forum/jupyter),
and you may participate in development discussions or get live help on [Gitter](https://gitter.im/jupyterlab/jupyterlab). Please use our [issues page](https://github.com/jupyterlab/jupyterlab/issues) to provide feedback or submit a bug report.
