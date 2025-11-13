% Copyright (c) Jupyter Development Team.

% Distributed under the terms of the Modified BSD License.

(installation)=

# Installation

:::{hint}
JupyterLab 4.5 Release Candidate is now available and includes enhancements
to the debugger, terminal, file browser, and the overall notebook experience.
If you are an experienced user, or just would like to test out the latest
improvements, please consider installing the pre-release, for example with:

```bash
pip install --pre --upgrade jupyterlab==4.5.0rc1
```

For the full release notes please see the [Release Notes](https://jupyterlab.readthedocs.io/en/latest/getting_started/changelog.html#v4-5)
:::

JupyterLab can be installed as a terminal-launched application accessible via a web browser (default), or as a desktop application which is running in its own window and can be opened by clicking on a desktop shortcut ([JupyterLab Desktop](https://github.com/jupyterlab/jupyterlab-desktop)). This page describes installation of the default (terminal-launched) JupyterLab application using `conda`, `mamba`, `pip`, `pipenv` or `docker` and assumes basic knowledge of the terminal. For JupyterLab Desktop instructions see the [Installation section](https://github.com/jupyterlab/jupyterlab-desktop#installation) in the JupyterLab Desktop repository.

:::{warning}
New versions of JupyterLab may break backwards compatibility with extensions and other
Jupyter customizations. As noted in {ref}`versioning-notes`, JupyterLab development and
release cycles follow semantic versioning, so we recommend planning your installation and
upgrade procedures to account for possible breaking changes that may disrupt your usage
of JupyterLab and any related tools that are critical to your workflows.
:::

## conda

If you use `conda`, you can install it with:

```bash
conda install -c conda-forge jupyterlab
```

## mamba

If you use `mamba`, you can install it with:

```bash
mamba install -c conda-forge jupyterlab
```

## pip

If you use `pip`, you can install it with:

```bash
pip install jupyterlab
```

If installing using `pip install --user`, you must add the user-level
`bin` directory to your `PATH` environment variable in order to launch
`jupyter lab`. If you are using a Unix derivative (FreeBSD, GNU/Linux,
macOS), you can do this by running `export PATH="$HOME/.local/bin:$PATH"`.

## pipenv

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

When using `pipenv`, in order to launch `jupyter lab`, you must activate the project's virtualenv.
For example, in the directory where `pipenv`'s `Pipfile` and `Pipfile.lock` live (i.e., where you ran the above commands):

```bash
pipenv shell
jupyter lab
```

Alternatively, you can run `jupyter lab` inside the virtualenv with

```bash
pipenv run jupyter lab
```

## Docker

If you have [Docker installed](https://docs.docker.com/install/), you can install and use JupyterLab by selecting one
of the many [ready-to-run Docker images](https://jupyter-docker-stacks.readthedocs.io/en/latest/using/selecting.html)
maintained by the Jupyter Team. Follow the instructions in the [Quick Start Guide](https://jupyter-docker-stacks.readthedocs.io/en/latest/)
to deploy the chosen Docker image.

Ensure your docker command includes the `-e JUPYTER_ENABLE_LAB=yes` flag to ensure
JupyterLab is enabled in your container.

## Usage with JupyterHub

Read the details on our {ref}`JupyterLab on JupyterHub documentation page <jupyterhub>`.

## Usage with Jupyverse

[Jupyverse](https://github.com/jupyter-server/jupyverse/) is a next-generation Jupyter server based on
[FastAPI](https://fastapi.tiangolo.com/). It can be used instead of
[jupyter-server](https://github.com/jupyter-server/jupyter_server/), the Jupyter server installed by default with JupyterLab.
Note that `jupyter-server` extensions won't work with `jupyverse` (for which there might be equivalent plugins).

You can install `jupyverse` with `pip`:

```bash
pip install "jupyverse[auth,jupyterlab]"
```

or with `conda`:

```bash
conda install -c conda-forge jupyverse fps-auth fps-jupyterlab
```

or with `mamba`:

```bash
mamba install -c conda-forge jupyverse fps-auth fps-jupyterlab
```

And run it with:

```bash
jupyverse
```

## Supported browsers

The latest versions of the following browsers are currently known to work:

- Firefox
- Chrome
- Safari
- Edge

Earlier browser versions may also work, but come with no guarantees.

## Installation problems

If your computer is behind corporate proxy or firewall,
you may encounter HTTP and SSL errors due to the proxy or firewall blocking connections to widely-used servers. For example, you might see this error if conda cannot connect to its own repositories:

```
CondaHTTPError: HTTP 000 CONNECTION FAILED for url <https://repo.anaconda.com/pkgs/main/win-64/current_repodata.json>
```

Here are some widely-used sites that host packages in the Python and JavaScript open-source ecosystems. Your network administrator may be able to allow http and https connections to these domains:

- pypi.org
- pythonhosted.org
- continuum.io
- anaconda.com
- conda.io
- github.com
- githubusercontent.com
- npmjs.com
- yarnpkg.com

Alternatively, you can specify a proxy user (usually a domain user with password),
that is allowed to communicate via network. This can be easily achieved
by setting two common environment variables: `HTTP_PROXY` and `HTTPS_PROXY`.
These variables are automatically used by many open-source tools (like `conda`) if set correctly.

```bash
# For Windows
set HTTP_PROXY=http://USER:PWD@proxy.company.com:PORT
set HTTPS_PROXY=https://USER:PWD@proxy.company.com:PORT

# For Linux / MacOS
export HTTP_PROXY=http://USER:PWD@proxy.company.com:PORT
export HTTPS_PROXY=https://USER:PWD@proxy.company.com:PORT
```

In case you can communicate via HTTP, but installation with `conda` fails
on connectivity problems to HTTPS servers, you can disable using SSL for `conda`.

:::{warning}
Disabling SSL in communication is generally not recommended and involves potential security risks.
:::

```bash
# Configure npm to not use SSL
conda config --set ssl_verify False
```

You can do a similar thing for `pip`.
The approach here is to mark repository servers as trusted hosts,
which means SSL communication will not be required for downloading Python libraries.

```bash
# Install pandas (without SSL)
pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org pandas
```

Using the tips from above, you can handle many network problems
related to installing Python libraries.

Many Jupyter extensions require having working `npm` and `jlpm` (alias for `yarn`) commands,
which is required for downloading useful Jupyter extensions or other JavaScript dependencies. If `npm` cannot connect to its own repositories, you might see an error like:

```
ValueError: "@jupyterlab/toc" is not a valid npm package
```

You can set the proxy or registry used for npm with the following commands.

```bash
# Set proxy for NPM
npm config set proxy http://USER:PWD@proxy.company.com:PORT
npm config set proxy https://USER:PWD@proxy.company.com:PORT

# Set default registry for NPM (optional, useful in case if common JavaScript libs cannot be found)
npm config set registry http://registry.npmjs.org/
jlpm config set npmRegistryServer https://registry.yarnpkg.com/
```

In case you can communicate via HTTP, but installation with `npm` fails
on connectivity problems to HTTPS servers, you can disable using SSL for `npm`.

:::{warning}
Disabling SSL in communication is generally not recommended and involves potential security risk.
:::

```bash
# Configure npm to not use SSL
npm set strict-ssl False
```
