# Making a JupyterLab release

This document guides a contributor through creating a release of JupyterLab.

Review `CONTRIBUTING.md`. Make sure all the tools needed to generate the
built JavaScript files are properly installed.

## Creating a full release

We publish the npm packages, a Python source package, and a Python universal
binary wheel. We also publish a conda package on conda-forge (see below). See
the Python docs on [package
uploading](https://packaging.python.org/guides/tool-recommendations/) for twine
setup instructions and for why twine is the recommended method.

## Getting a clean environment

For convenience, here are commands for getting a completely clean repo. This
makes sure that we don't have any extra tags or commits in our repo (especially
since we will push our tags later in the process), and that we are on the master
branch.

Note that right now, we pin tornado to version 5 because there are some
incompatibilities with tornado 6. See
https://github.com/jupyterlab/jupyterlab/issues/6131.

```bash
cd release
conda deactivate
conda remove --all -y -n jlabrelease
rm -rf jupyterlab

conda create -c conda-forge -y -n jlabrelease notebook nodejs twine 'tornado<6'
conda activate jlabrelease
git clone git@github.com:jupyterlab/jupyterlab.git
cd jupyterlab
pip install -ve .
```

## How Python and NPM versions increment

Here is an example of how version numbers progress through a release process.

| Command                            | Python Version Change | NPM Version change                 |
| ---------------------------------- | --------------------- | ---------------------------------- |
| `jlpm bumpversion minor`           | x.y.z-> x.(y+1).0.a0  | All a.b.c -> a.(b+1).0-alpha.0     |
| `jlpm bumpversion build`           | x.y.z.a0-> x.y.z.a1   | All a.b.c-alpha.0 -> a.b.c-alpha.1 |
| `jlpm bumpversion release`         | x.y.z.a1-> x.y.z.rc0  | All a.b.c-alpha.1 -> a.b.c-rc.0    |
| `jlpm bumpversion release`         | x.y.z.rc0-> x.y.z     | All a.b.c-rc0 -> a.b.c             |
| `jlpm patch:release [...packages]` | x.y.z -> x.y.(z+1)    | Selected a.b.c -> a.b.(c+1)        |

### JS major release(s)

Command:
`jlpm bump:js:major [...packages]`

Results:

- Python package is not affected.
- JS dependencies are also bumped a major version.
- Packages that have already had a major bump in this prerelease cycle are not affected.
- All affected packages changed to match the current release type of the Python package (`alpha` or `rc`).

### Publishing Packages

We use [bump2version](https://github.com/c4urself/bump2version) to manage the Python
version, and we keep the JS versions and tags in sync with the release cycle.
For a backwards-incompatible changes to JS packages, bump the major version number(s)
using `jlpm run bump:js:major` with the package name(s). For a major release of
JupyterLab itself, run `jlpm run bumpversion major`.

- Run `jlpm run bumpversion build` to create a new `alpha` version.
- Push the commits and tags as prompted.
- Run `jlpm run publish:all` to publish the JS and Python packages.
  Execute the suggested commands after doing a quick sanity check.
  If there is a network error during JS publish, run `jlpm run publish:all --skip-build` to resume publish without requiring another
  clean and build phase of the JS packages.
- Run `jlpm run bumpversion release` to switch to an `rc` version.
  (running `jlpm run bumpversion build` will then increment `rc` versions).

### Post release candidate checklist

- [ ] Modify and run `python scripts/milestone_check.py` to check the issues assigned to this milestone
- [ ] Write [release highlights](https://github.com/jupyterlab/jupyterlab/blob/master/docs/source/getting_started/changelog.rst), starting with:
  ```bash
  loghub jupyterlab/jupyterlab -m XXX -t $GITHUB_TOKEN --template scripts/release_template.txt
  ```
- [ ] Test the release candidate in a clean environment
- [ ] Make sure the CI builds pass
  - The build will fail if we publish a new package because by default it is
    private. Use `npm access public @jupyterlab/<name>` to make it public.
  - The build will fail if we forget to include `style/` in the `files:`
    of a package (it will fail on the `jupyter lab build` command because
    webpack cannot find the referenced styles to import.
- [ ] Update the other repos:
  - [ ] https://github.com/jupyterlab/extension-cookiecutter-js
  - [ ] https://github.com/jupyterlab/extension-cookiecutter-ts
  - [ ] https://github.com/jupyterlab/mimerender-cookiecutter
  - [ ] https://github.com/jupyterlab/mimerender-cookiecutter-ts
  - [ ] https://github.com/jupyterlab/jupyter-renderers
  - [ ] https://github.com/jupyterhub/jupyterlab-hub
- [ ] Add a tag to [ts cookiecutter](https://github.com/jupyterlab/extension-cookiecutter-ts) with the new JupyterLab version
- [ ] Update the extension examples:
  - [ ] [Notebook toolbar button](https://github.com/jupyterlab/jupyterlab/blob/master/docs/source/developer/notebook.rst#adding-a-button-to-the-toolbar)
- [ ] Update the [xkcd tutorial](https://github.com/jupyterlab/jupyterlab/blob/master/RELEASE.md#updating-the-xkcd-tutorial)
- [ ] At this point, there may have been some more commits merged. Run `python scripts/milestone_check.py` to check the issues assigned to this milestone one more time. Update changelog if necessary.

Now do the actual final release:

- [ ] Run `jlpm run bumpversion release` to switch to final release
- [ ] Push the commit and tags to master
- [ ] Run `jlpm run publish:all` to publish the packages
- [ ] Create a branch for the release and push to GitHub
- [ ] Merge the PRs on the other repos and set the default branch of the
      xckd repo
- [ ] Publish to [conda-forge](https://github.com/jupyterlab/jupyterlab/blob/master/RELEASE.md#publishing-to-conda-forge).

After a few days (to allow for possible patch releases), set up development for
the next release:

- [ ] Run `jlpm run bumpversion minor` to bump to alpha for the next alpha release
- [ ] Put the commit and tags to master
- [ ] Run `jlpm run publish:all` to publish the packages
- [ ] Release the other repos as appropriate
- [ ] Update version for [binder](https://github.com/jupyterlab/jupyterlab/blob/master/RELEASE.md#update-version-for-binder)

### Updating the xkcd tutorial

- Clone the repo if you don't have it

```bash
git clone git@github.com:jupyterlab/jupyterlab_xkcd.git
```

#### Simple updates by rebasing

If the updates are simple, it may be enough to check out a new branch based on
the current base branch, then rebase from the root commit, editing the root
commit and other commits that involve installing packages to update to the new
versions:

```bash
git checkout -b 0.XX # whatever the new version is
git rebase -i --root
```

"Edit" the commits that involve installing packages, so you can update the
`package.json`. Amend the last commit to bump the version number in package.json
in preparation for publishing to npm. Then skip down to the step below about
publishing the xkcd tutorial. If the edits are more substantial than just
updating package versions, then do the next steps instead.

#### Creating the tutorial from scratch

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
- For the publish section of the readme, use the `README`
  file from the previous branch, as well as the `package.json` fields up to
  `license`. Bump the version number in preparation for publishing to npm.

#### Publishing xkcd tutorial changes

- Replace the tag references in the tutorial with the new branch number, e.g.
  replace `0.28-` with `0.29-`. Prefix the new tags with the branch name, e.g.
  `0.28-01-show-a-panel`
  ```bash
  git tag 0.XX-01-show-a-panel HEAD~5
  git tag 0.XX-02-show-a-comic HEAD~4
  git tag 0.XX-03-style-and-attribute HEAD~3
  git tag 0.XX-04-refactor-and-refresh HEAD~2
  git tag 0.XX-05-restore-panel-state HEAD~1
  git tag 0.XX-06-prepare-to-publish HEAD
  ```
- Push the branch with the new tags
  ```bash
  git push origin 0.XX --tags
  ```
  Set the branch as the default branch (see `github.com/jupyterlab/jupyterlab_xkcd/settings/branches`).
- If there were changes to the example in the documentation, submit a PR to JupyterLab
- Publish the new `@jupyterlab/xkcd` npm package. Make sure to update the version
  number in the last commit of the branch.
  ```bash
  npm publish
  ```

If you make a mistake and need to start over, clear the tags using the
following pattern:

```bash
git tag | grep 0.XX | xargs git tag -d
```

### Publishing to conda-forge

- If no requirements have changed, wait for the conda-forge autotick-bot.
- Otherwise:
- Get the sha256 hash for conda-forge release:

```bash
shasum -a 256 dist/*.tar.gz
```

- Fork https://github.com/conda-forge/jupyterlab-feedstock
- Create a PR with the version bump
- Update `recipe/meta.yaml` with the new version and md5 and reset the build number to 0.

## Making a patch release

- Backport the change to the previous release branch
- Run the following script, where the package is in `/packages/package-folder-name` (note that multiple packages can be given, or no packages for a Python-only patch release):

```bash
jlpm run patch:release package-folder-name
```

- Push the resulting commit and tag

## Update version for binder

Each time we release JupyterLab, we should update the version of JupyterLab
used in binder and repo2docker. Here is an example PR that updates the
relevant files:

https://github.com/jupyter/repo2docker/pull/169/files

This needs to be done in both the conda and pip buildpacks in both the
frozen and non-frozen version of the files.
