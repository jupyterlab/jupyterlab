# Zero to Extension

Welcome! The goal of this document is to walk you through setting up a development environment for writing a JupyterLab extension to iteratively improving a basic panel extension. This tutorial assumes you have nothing setup on a Linux or OSX machine for JupyterLab development: no conda environment, no NodeJS, no JupyterLab code, no JupyterLab extension cookicutter, etc. It'll describe all of the steps you need to follow to go from this state to the extension depicted below.

TODO: screenshot of the finished thing here

Ready? Let's go!

## Install conda using miniconda

Start by downloading the Python 3.x [Miniconda installer](https://conda.io/miniconda.html). Create a root conda environment in your home directory with a single command.

```bash
bash Miniconda3*.sh -b -p ~/miniconda
```

Add the miniconda binary path to your `PATH` environment variable so that running commands out of the environment does not require typing the full path.

```bash
export PATH=~/miniconda/bin:$PATH
```

Note: Add this line to your `.bashrc` or `.zshrc` or favorite shell config file if you want to make this a permanent change.

## Install NodeJS and JupyterLab in a conda environment

Next create a conda environment specifically for JupyterLab development including [NodeJS](https://nodejs.org), the JavaScript runtime used to compile the web frontend assets for JupyterLab.

```bash
conda create -n jupyterlab-ext nodejs jupyterlab cookiecutter -c conda-forge
source activate jupyterlab-ext
```

Note: You'll need to run the second command for each new terminal window you open to activate the `jupyterlab-dev` environment.

## Create an extension from the cookiecutter

Now use cookiecutter to create a new project for your extension.

```
cookiecutter https://github.com/jupyterlab/extension-cookiecutter-ts
```

When prompted, enter values for all of the cookiecutter prompts.

```
author_name []: Your Name
author_email []: your-email@somewhere.org
extension_name [jupyterlab_myextension]: jupyterlab_button
project_short_description [A JupyterLab extension.]: A button. In JupyterLab.
```

---

TODO: notes from here down while I doc for myself first

## Build and link the extension for development

```
npm install
jupyter labextension link .
```

## Try it

Open the browser, open the dev tools,


## Questions / Thoughts

* Don't want to maintain the dev setup steps here if they're also in the contributing doc and extesnion pages and ... but it's also hard as a newbie to trace through all of them. Solve this later I guess.
* Knowing how to package an extension for release is another useful tidbit this tutorial might cover, but perhaps that should be separate.
* Windows? These steps will probably work on a Windows system as well. But in the interest of brevity, only going to doc the shell commands to run.