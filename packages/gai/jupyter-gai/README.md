# jupyter_gai

[![Github Actions Status](https://github.com/github_username/jupyter_gai/workflows/Build/badge.svg)](https://github.com/github_username/jupyter_gai/actions/workflows/build.yml)
A generative AI extension for JupyterLab

This extension is composed of a Python package named `jupyter_gai`
for the server extension and a NPM package named `jupyter_gai`
for the frontend extension.

## Requirements

- JupyterLab >= 3.5 (not JupyterLab 4)

## Install

To install the extension, execute:

```bash
pip install jupyter_gai
```

## Uninstall

To remove the extension, execute:

```bash
pip uninstall jupyter_gai
```

## Usage with GPT-3

To use the `GPT3ModelEngine` in `jupyter_gai`, you will need an OpenAI API key.
Copy the API key and then create a Jupyter config file locally at `config.py` to
store the API key.

```python
c.GPT3ModelEngine.api_key = "<your-api-key>"
```

Finally, start a new JupyterLab instance pointing to this configuration file.

```bash
jupyter lab --config=config.py
```

If you are doing this in a Git repository, you can ensure you never commit this
file on accident by adding it to `.git/info/exclude`.

Alternately, you can also specify your API key while launching JupyterLab.

```bash
jupyter lab --GPT3ModelEngine.api_key=<api-key>
```

## Troubleshoot

If you can see the extension UI, but it is not working, check
that the server extension is enabled:

```bash
jupyter server extension list
```

If the server extension is installed and enabled, but you don't see
the extension UI, verify that the frontend extension is installed:

```bash
jupyter labextension list
```

## Contributing

### Development install

Note: You will need NodeJS to build the extension package.

The `jlpm` command is JupyterLab's pinned version of
[yarn](https://yarnpkg.com/) that is installed with JupyterLab. You may use
`yarn` or `npm` in lieu of `jlpm` below.

```bash
# Clone the repo to your local environment
# Change directory to the jupyter_gai directory
# Install package in development mode
pip install -e .
# Link your development version of the extension with JupyterLab
jupyter labextension develop . --overwrite
# Server extension must be manually installed in develop mode
jupyter server extension enable jupyter_gai
# Rebuild extension Typescript source after making changes
jlpm build
```

You can watch the source directory and run JupyterLab at the same time in different terminals to watch for changes in the extension's source and automatically rebuild the extension.

```bash
# Watch the source directory in one terminal, automatically rebuilding when needed
jlpm watch
# Run JupyterLab in another terminal
jupyter lab
```

With the watch command running, every saved change will immediately be built locally and available in your running JupyterLab. Refresh JupyterLab to load the change in your browser (you may need to wait several seconds for the extension to be rebuilt).

By default, the `jlpm build` command generates the source maps for this extension to make it easier to debug using the browser dev tools. To also generate source maps for the JupyterLab core extensions, you can run the following command:

```bash
jupyter lab build --minimize=False
```

### Development uninstall

```bash
# Server extension must be manually disabled in develop mode
jupyter server extension disable jupyter_gai
pip uninstall jupyter_gai
```

In development mode, you will also need to remove the symlink created by `jupyter labextension develop`
command. To find its location, you can run `jupyter labextension list` to figure out where the `labextensions`
folder is located. Then you can remove the symlink named `jupyter_gai` within that folder.

### Testing the extension

#### Server tests

This extension is using [Pytest](https://docs.pytest.org/) for Python code testing.

Install test dependencies (needed only once):

```sh
pip install -e ".[test]"
```

To execute them, run:

```sh
pytest -vv -r ap --cov jupyter_gai
```

#### Frontend tests

This extension is using [Jest](https://jestjs.io/) for JavaScript code testing.

To execute them, execute:

```sh
jlpm
jlpm test
```

#### Integration tests

This extension uses [Playwright](https://playwright.dev/docs/intro/) for the integration tests (aka user level tests).
More precisely, the JupyterLab helper [Galata](https://github.com/jupyterlab/jupyterlab/tree/master/galata) is used to handle testing the extension in JupyterLab.

More information are provided within the [ui-tests](./ui-tests/README.md) README.

### Packaging the extension

See [RELEASE](RELEASE.md)
