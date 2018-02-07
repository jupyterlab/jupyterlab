**[Installation](#installation)** |
**[Documentation](#documentation)** |
**[Contributing](#contributing)** |
**[License](#license)** |
**[Team](#team)** |
**[Getting help](#getting-help)** |


# [JupyterLab](http://jupyterlab.github.io/jupyterlab/)

[![Build Status](https://travis-ci.org/jupyterlab/jupyterlab.svg?branch=master)](https://travis-ci.org/jupyterlab/jupyterlab)
[![Documentation Status](https://readthedocs.org/projects/jupyterlab/badge/?version=stable)](https://readthedocs.org/projects/jupyterlab/badge/?version=stable)
[![Google Group](https://img.shields.io/badge/-Google%20Group-lightgrey.svg)](https://groups.google.com/forum/#!forum/jupyter)
[![Join the Gitter Chat](https://img.shields.io/gitter/room/nwjs/nw.js.svg)](https://gitter.im/jupyterlab/jupyterlab)


An extensible environment for interactive and reproducible computing, based on the
Jupyter Notebook and Architecture.

JupyterLab is the next-generation user interface for Project Jupyter. It offers
all the familiar building blocks of the classic Jupyter Notebook (notebook,
terminal, text editor, file browser, rich outputs, etc.) in a flexible and
powerful user inteface that can be extended through third party extensions.
Eventually, JupyterLab will replace the classic Jupyter Notebook after
JupyterLab reaches 1.0.

**JupyterLab is currently in beta.** The beta releases are suitable for general
usage. For JupyterLab extension developers, the extension APIs will continue to
evolve until the 1.0 release.

For a good overview of JupyterLab, please see [this link](https://channel9.msdn.com/Events/PyData/Seattle2017/BRK11) to a recent talk we gave about JupyterLab at PyData Seattle (2017).

----

## Getting started

### Installation

If you use ``conda``, you can install as:

```bash
conda install -c conda-forge jupyterlab
```

If you use ``pip``, you can install it as:

```bash
pip install jupyterlab
```

Note: For all methods of installation, if you are using a version of Jupyter Notebook earlier than 5.3, then you must also run the following command
after installation to enable the JupyterLab server extension:

```bash
jupyter serverextension enable --py jupyterlab --sys-prefix
```

Instructions on how to install the project from the git sources are available in our [contributor documentation](CONTRIBUTING.md).

Note: If installing using `pip install --user`, you must add the user-level
 `bin` directory to your `PATH` environment variable in order to launch
 `jupyter lab`.

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

### Running

Start up JupyterLab using:

```bash
jupyter lab
```

JupyterLab will open automatically in your browser. You may also access
JupyterLab by entering the notebook server's URL (`http://localhost:8888`) in
the browser.

### Prerequisites

Jupyter notebook version 4.3 or later. To check the notebook version:

```bash
jupyter notebook --version
```

### Supported runtimes

The runtime versions which are currently *known to work*:

- Firefox Latest
- Chrome Latest
- Safari Latest

Earlier browser versions may also work, but come with no guarantees.

JupyterLab uses CSS Variables for styling, which is one reason for the
minimum versions listed above.  IE 11+ or Edge 14 do not support
CSS Variables, and are not directly supported at this time.
A tool like [postcss](http://postcss.org/) can be used to convert the CSS files in the
`jupyterlab/build` directory manually if desired.

----

## Documentation

Read our documentation on [ReadTheDocs](http://jupyterlab.readthedocs.io/en/latest/).

----

## Development

### Contributing

If you would like to contribute to the project, please read our [contributor documentation](CONTRIBUTING.md).

JupyterLab follows the official [Jupyter Code of Conduct](https://github.com/jupyter/governance/blob/master/conduct/code_of_conduct.md).

### Extensions

JupyterLab can be extended using extensions that are [npm](https://www.npmjs.com/) packages
and use our public APIs. See our documentation
for [users](https://jupyterlab.readthedocs.io/en/latest/user/extensions.html) and [developers](https://jupyterlab.readthedocs.io/en/latest/developer/extension_dev.html).

### License

We use a shared copyright model that enables all contributors to maintain the
copyright on their contributions. All code is licensed under the terms of the revised BSD license.

### Team

JupyterLab is part of [Project Jupyter](http://jupyter.org/) and is developed by an open community of contributors. JupyterLab's current maintainers are as follows:

(listed in alphabetical order, with affiliation, and main areas of contribution)

* Chris Colbert, Project Jupyter (co-creator, application/low-level architecture,
  technical leadership, vision, phosphor.js)
* Afshin Darian, Project Jupyter (co-creator, settings, inspector, completer,
  prolific contributions throughout the code base).
* Jessica Forde, Project Jupyter (demo, documentation)
* Brian Granger, Cal Poly (co-creator, strategy, vision, management, UI/UX design,
  architecture).
* Jason Grout, Bloomberg (co-creator, vision, general development).
* Cameron Oelsen, Cal Poly (UI/UX design).
* Fernando Perez, UC Berkeley (co-creator, vision).
* Ian Rose, UC Berkeley (Real-time collaboration, document architecture).
* Steven Silvester, Quansight (co-creator, release management, packaging,
  prolific contributions throughout the code base).

This list is provided to help provide context about who we are and how our team functions.
This team is accompanied by a much larger group of contributors to JupyterLab and Project Jupyter as a whole. If you would like to be listed here, please submit a pull request with
your information.

----

## Getting help

We encourage you to ask questions on the [mailing list](https://groups.google.com/forum/#!forum/jupyter),
and you may participate in development discussions or get live help on [Gitter](https://gitter.im/jupyterlab/jupyterlab).


## Resources

- [Reporting Issues](https://github.com/jupyterlab/jupyterlab/issues)
- [Architecture tutorial](https://jupyterlab.readthedocs.io/en/latest/index.html)
- [API Docs](http://jupyterlab.github.io/jupyterlab/globals.html)
- [Documentation for Project Jupyter](https://jupyter.readthedocs.io/en/latest/index.html) | [PDF](https://media.readthedocs.org/pdf/jupyter/latest/jupyter.pdf)
- [Project Jupyter website](https://jupyter.org)
