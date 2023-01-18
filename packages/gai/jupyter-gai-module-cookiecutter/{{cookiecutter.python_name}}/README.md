# {{ cookiecutter.python_name }}

This extension is composed of a Python package named `{{ cookiecutter.python_name }}`
that exposes the model engines to the Jupyter GAI server extension,
and an NPM package named `{{ cookiecutter.labextension_name }}`
that provides a frontend labextension registering inserters.

## Requirements

- JupyterLab >= 3.0

## Install

To install the extension, execute:

```bash
pip install {{ cookiecutter.python_name }}
```

## Uninstall

To remove the extension, execute:

```bash
pip uninstall {{ cookiecutter.python_name }}
```

## Contributing

### Development install

Note: You will need NodeJS to build the extension package.

The `jlpm` command is JupyterLab's pinned version of
[yarn](https://yarnpkg.com/) that is installed with JupyterLab. You may use
`yarn` or `npm` in lieu of `jlpm` below.

```bash
# Clone the repo to your local environment
# Change directory to the {{ cookiecutter.python_name }} directory
# Install package in development mode
pip install -e ".{% if cookiecutter.test.lower().startswith('y') %}[test]{% endif %}"
# Link your development version of the extension with JupyterLab
jupyter labextension develop . --overwrite
# Rebuild extension Typescript source after making changes
jlpm build
```

You can watch the source directory and run JupyterLab at the same time in
different terminals to watch for changes in the extension's source and
automatically rebuild the extension.

```bash
# Watch the source directory in one terminal, automatically rebuilding when needed
jlpm watch
# Run JupyterLab in another terminal
jupyter lab
```

With the watch command running, every saved change will immediately be built
locally and available in your running JupyterLab. Refresh JupyterLab to load the
change in your browser (you may need to wait several seconds for the extension
to be rebuilt).

By default, the `jlpm build` command generates the source maps for this
extension to make it easier to debug using the browser dev tools. To also
generate source maps for the JupyterLab core extensions, you can run the
following command:

```bash
jupyter lab build --minimize=False
```

### Development uninstall

```bash
pip uninstall {{ cookiecutter.python_name }}
```

In development mode, you will also need to remove the symlink created by `jupyter labextension develop`
command. To find its location, you can run `jupyter labextension list` to figure out where the `labextensions`
folder is located. Then you can remove the symlink named `{{ cookiecutter.labextension_name }}` within that folder.
{% if cookiecutter.test.lower().startswith('y') %}

### Testing the extension

#### Backend tests

This GAI module is using [Pytest](https://docs.pytest.org/) for Python code testing.

Install test dependencies (needed only once):

```sh
pip install -e ".[test]"
# Each time you install the Python package, you need to restore the front-end extension link
jupyter labextension develop . --overwrite
```

To execute them, run:

```sh
pytest -vv -r ap --cov {{ cookiecutter.python_name }}
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
{% endif %}

### Packaging the extension

See [RELEASE](RELEASE.md)
