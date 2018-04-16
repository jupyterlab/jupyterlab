
# Making a JupyterLab release

This document guides a contributor through creating a release of JupyterLab.

## Check installed tools

Review ``CONTRIBUTING.md``. Make sure all the tools needed to generate the
built JavaScript files are properly installed.

## Creating a full release

We publish the npm packages, a Python source package, and a Python universal binary wheel.  We also publish a conda package on conda-forge (see below).
See the Python docs on [package uploading](https://packaging.python.org/guides/tool-recommendations/)
for twine setup instructions and for why twine is the recommended method.

## Getting a clean environment

For convenience, here are commands for getting a completely clean repo. This makes sure that we don't have any extra tags or commits in our repo (especially since we will push our tags later in the process), and that we are on the master branch.

```bash
cd release
conda remove --all -y -n jlabrelease
rm -rf jupyterlab

conda create -c conda-forge -y -n jlabrelease notebook nodejs twine
conda activate jlabrelease
git clone git@github.com:jupyterlab/jupyterlab.git
cd jupyterlab
pip install -ve .
```


### Publish the npm packages

The command below ensures the latest dependencies and built files,
then prompts you to select package versions.  When one package has an
effective major release, the packages that depend on it should also get a
major release, to prevent consumers that are using the `^` semver
requirement from getting a conflict.

```bash
jlpm run publish
```

### Publish the Python package

- Update `jupyterlab/_version.py` with an `rc` version
- Prep the static assets for release:

```bash
jlpm run build:update
```

- Commit and tag and push the tag
- Create the Python release artifacts:

```bash
rm -rf dist
python setup.py sdist
python setup.py bdist_wheel --universal
twine upload dist/*
```

- Test the `rc` in a clean environment
- Make sure the CI builds pass
  - The build will fail if we publish a new package because by default it is
    private.  Use `npm access public @jupyterlab/<name>` to make it public.
  - The build will fail if we forget to include `style/` in the `files:`
    of a package (it will fail on the `jupyter lab build` command because
    webpack cannot find the referenced styles to import.
- Update the other repos listed below
- Update the extension examples listed below
- Update the xkcd tutorial
- Update `jupyterlab/_version.py` with a final version
- Make another Python release
- Create a branch for the release and push to GitHub
- Merge the PRs on the other repos and set the default branch of the
xckd repo
- Publish to conda-forge (see below)
- Update `jupyterlab/_version.py` with a `dev` version
- Run `jlpm integrity` to update the `dev_mode` version
- Commit and push the version update to master
- Release the other repos as appropriate
- Update version for binder (see below)

### Other repos to update

- https://github.com/jupyterlab/extension-cookiecutter-js
- https://github.com/jupyterlab/extension-cookiecutter-ts
- https://github.com/jupyterlab/mimerender-cookiecutter
- https://github.com/jupyterlab/mimerender-cookiecutter-ts
- https://github.com/jupyterlab/jupyter-renderers
- https://github.com/jupyterhub/jupyterlab-hub


### Extension examples to update
- https://github.com/jupyterlab/jupyterlab/blob/master/docs/source/developer/notebook.rst#adding-a-button-to-the-toolbar


### Updating the xkcd tutorial

- Clone the repo if you don't have it

```bash
git clone git@github.com:jupyterlab/jupyterlab_xkcd.git
```

If the updates are simple, it may be enough to check out a new branch based on
the current base branch, then rebase from the root commit, editing the root
commit and other commits that involve installing packages to update to the new
versions:

```bash
git checkout -b 0.xx # whatever the new version is
git rebase -i --root
```

"Edit" the commits that involve installing packages, so you can update the
package.json. Then skip down to the step below about creating tags. If the edits
are more substantial than just updating package versions, then do the next steps
instead.

- Create a new empty branch in the xkcd repo.

```bash
git checkout --orphan name-of-branch
git rm -rf .
git clean -dfx
cookiecutter path-to-local-extension-cookiecutter-ts
# Fill in the values from the previous branch package.json initial commit
cp -r jupyterlab_xkcd/ .
rm -rf jupyterlab_xkcd
```

- Create a new PR in JupyterLab.
- Run through the tutorial in the PR, making commits and updating
the tutorial as appropriate.
- Replace the tag references in the tutorial with the new branch number,
e.g. replace `0.28-` with `0.29-`.
- Prefix the new tags with the branch name, e.g. `0.28-01-show-a-panel`
- For the publish section of the readme, use the `README`
file from the previous branch, as well as the `package.json` fields up to
`license`.
- Push the branch and set it as the default branch for the tutorial repo.
- Submit the PR to JupyterLab
- Publish the new @jupyterlab/xkcd npm package. Make sure to update the version
  number in the last commit of the branch.

If you make a mistake and need to start over, clear the tags using the
following pattern:

```bash
git tag | grep 0.xx | xargs git tag -d
```

### Publishing to conda-forge

- Get the sha256 hash for conda-forge release:

```bash
shasum -a 256 dist/*.tar.gz
```

- Fork https://github.com/conda-forge/jupyterlab-feedstock
- Create a PR with the version bump
- Update `recipe/meta.yaml` with the new version and md5 and reset the build number to 0.


## Making a patch release of a JavaScript package

- Backport the change to the previous release branch
- Make a new PR against the previous branch
- Run the following script, where the package is in `/packages/package-folder-name`:

```bash
jlpm run patch:release package-folder-name
```

- Push the resulting commit and tag.
- Create a new Python release on the previous branch
- Cherry pick the patch commit to the master branch
- Update the dev version of the master branch in `_version.py`
- Update the `package.json` file in `dev_mode` with the new JupyterLab version in the `jupyterlab` metadata section.

## Update version for binder

Each time we release JupyterLab, we should update the version of JupyterLab
used in binder and repo2docker. Here is an example PR that updates the
relevant files:

https://github.com/jupyter/repo2docker/pull/169/files

This needs to be done in both the conda and pip buildpacks in both the
frozen and non-frozen version of the files.
