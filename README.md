**[Installation](#installation)** |
**[Documentation](#documentation)** |
**[Contributing](#contributing)** |
**[License](#license)** |
**[Team](#team)** |
**[Getting help](#getting-help)** |


# [JupyterLab](http://jupyterlab.github.io/jupyterlab/)

[![Build Status](https://travis-ci.org/jupyterlab/jupyterlab.svg?branch=master)](https://travis-ci.org/jupyterlab/jupyterlab)
[![Documentation Status](https://readthedocs.org/projects/jupyterlab/badge/?version=stable)](http://jupyterlab.readthedocs.io/en/stable/)
[![Google Group](https://img.shields.io/badge/-Google%20Group-lightgrey.svg)](https://groups.google.com/forum/#!forum/jupyter)
[![Join the Gitter Chat](https://img.shields.io/gitter/room/nwjs/nw.js.svg)](https://gitter.im/jupyterlab/jupyterlab)
[![Binder](https://mybinder.org/badge.svg)](https://mybinder.org/v2/gh/jupyterlab/jupyterlab-demo/18a9793b58ba86660b5ab964e1aeaf7324d667c8?urlpath=lab%2Ftree%2Fdemo%2FLorenz.ipynb)


An extensible environment for interactive and reproducible computing, based on the
Jupyter Notebook and Architecture.  [Currently in beta.](https://blog.jupyter.org/jupyterlab-is-ready-for-users-5a6f039b8906)

[JupyterLab](http://jupyterlab.readthedocs.io/en/stable/) is the next-generation user interface for [Project Jupyter](https://jupyter.org). It offers
all the familiar building blocks of the classic Jupyter Notebook (notebook,
terminal, text editor, file browser, rich outputs, etc.) in a flexible and
powerful user inteface.
Eventually, JupyterLab will replace the classic Jupyter Notebook after
JupyterLab reaches 1.0.

JupyterLab can be extended using extensions that are [npm](https://www.npmjs.com/) packages
and use our public APIs. You can search for the GitHub topic [jupyterlab-extension](https://github.com/topics/jupyterlab-extension) to find extensions. To learn more about extensions, see our  [user documentation](https://jupyterlab.readthedocs.io/en/latest/user/extensions.html).

The beta releases are suitable for general
usage. For JupyterLab extension developers, the extension APIs will continue to
evolve until the 1.0 release.

Read the latest version of our documentation on [ReadTheDocs](http://jupyterlab.readthedocs.io/en/latest/).

----

## Getting started

### Installation

You can [install](http://jupyterlab.readthedocs.io/en/stable/getting_started/installation.html) JupyterLab using `conda`, `pip`, or `pipenv`.

Instructions on how to install the project from the git sources are available in our [contributor documentation](CONTRIBUTING.md).

#### conda

If you use ``conda``, you can install as:


```bash
conda install -c conda-forge jupyterlab
```

#### pip

If you use ``pip``, you can install it as:


```bash
pip install jupyterlab
```

If installing using `pip install --user`, you must add the user-level
 `bin` directory to your `PATH` environment variable in order to launch
 `jupyter lab`.

#### pipenv

If you use ``pipenv``, you can install it as:

```bash
pipenv install jupyterlab
pipenv shell
```

or from a git checkout:

```bash
pipenv install git+git://github.com/jupyterlab/jupyterlab.git#egg=jupyterlab
pipenv shell
```

When using ``pipenv``, in order to launch `jupyter lab`, you must activate the project's virtualenv. For example, in the directory where ``pipenv``'s `Pipfile` and `Pipfile.lock` live (i.e., where you ran the above commands):

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
The latest versions of the following browsers are currently *known to work*:

- Firefox
- Chrome
- Safari

See our [documentation](http://jupyterlab.readthedocs.io/en/latest/getting_started/installation.html) for additional details.

----

## Development

### Contributing

If you would like to contribute to the project, please read our [contributor documentation](CONTRIBUTING.md).

JupyterLab follows the official [Jupyter Code of Conduct](https://github.com/jupyter/governance/blob/master/conduct/code_of_conduct.md).

### Extending JupyterLab

To start developing your own extension, see our [developers documentation](https://jupyterlab.readthedocs.io/en/latest/developer/extension_dev.html) and [API docs](http://jupyterlab.github.io/jupyterlab/globals.html).

### License

We use a shared copyright model that enables all contributors to maintain the
copyright on their contributions. All code is licensed under the terms of the revised [BSD license](https://github.com/jupyterlab/jupyterlab/blob/master/LICENSE).

### Team

JupyterLab is part of [Project Jupyter](http://jupyter.org/) and is developed by an open community of contributors. Our maintainer team is accompanied by a much larger group of contributors to JupyterLab and Project Jupyter as a whole.

JupyterLab's current maintainers are listed in alphabetical order, with affiliation, and main areas of contribution:

* Chris Colbert, Project Jupyter (co-creator, application/low-level architecture,
  technical leadership, vision, phosphor.js)
* Afshin Darian, Project Jupyter (co-creator, settings, inspector, completer,
  prolific contributions throughout the code base).
* Jessica Forde, Project Jupyter (demo, documentation)
* Tim George, Cal Poly (UI/UX design, strategy, management, user needs analysis)
* Brian Granger, Cal Poly (co-creator, strategy, vision, management, UI/UX design,
  architecture).
* Jason Grout, Bloomberg (co-creator, vision, general development).
* Fernando Perez, UC Berkeley (co-creator, vision).
* Ian Rose, UC Berkeley (Real-time collaboration, document architecture).
* Saul Shanabrook, Quansight (general development, extensions)
* Steven Silvester, JPMorgan Chase (co-creator, release management, packaging,
  prolific contributions throughout the code base).
  
 Maintainer emeritus:
 
 * Cameron Oelsen, Cal Poly (UI/UX design).

This list is provided to help provide context about who we are and how our team functions.
If you would like to be listed, please submit a pull request with your information.

----

## Getting help

We encourage you to ask questions on the [mailing list](https://groups.google.com/forum/#!forum/jupyter),
and you may participate in development discussions or get live help on [Gitter](https://gitter.im/jupyterlab/jupyterlab).  Please use our [issues page](https://github.com/jupyterlab/jupyterlab/issues) to provide feedback or submit a bug report.
