
Making a JupyterLab release
===========================

This document guides a contributor through creating a release of JupyterLab.

Check installed tools
---------------------

Review ``CONTRIBUTING.md``. Make sure all the tools needed to generate the
built JavaScript files are properly installed.

Clean the repository
--------------------

You can remove all non-tracked files with:

```bash
git clean -xfdi
```

This would ask you for confirmation before removing all untracked files. Make
sure the ``dist/`` folder is clean and avoid stale build from
previous attempts.

Create the release
------------------

We publish the npm packages, a Python source package, and a Python universal binary wheel.  We also publish a conda package on conda-forge (see below).
See the Python docs on [package uploading](https://packaging.python.org/distributing/#uploading-your-project-to-pypi)
for twine setup instructions and for why twine is the recommended method.

```bash
# this ensures the latest builds of everything,
# then prompts you to select package versions.  When one package has an 
# effective major release, the packages that depend on it should also get a 
# major release, to prevent consumers that are using the `^` semver 
# requirement from getting a conflict.
yarn publish  
rm -rf dist
python setup.py sdist
python setup.py bdist_wheel --universal
twine upload dist/*
shasum -a 256 dist/*.tar.gz  # get the sha256 hash for conda-forge install
```

Publish on conda-forge

- Fork https://github.com/conda-forge/jupyterlab-feedstock
- Create a PR with the version bump
- Update `recipe/meta.yaml` with the new version and md5 and reset the build number to 0.
