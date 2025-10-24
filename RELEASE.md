# Making a JupyterLab release

This document guides a contributor through creating a release of JupyterLab.

## The JupyterLab Release Process

JupyterLab follows [semver](https://semver.org/) for the versioning of the Python and JavaScript packages.

### Release Timeline

Although the commitments listed below are "best effort", the JupyterLab team tries to follow a couple of guidelines:

- one major version per year, which usually includes API breaking changes
- several minor versions per year that include new features but no API breaking changes
- support and bug fixes on a couple of final releases (by backporting PRs and releasing from release branches)

Release Plans are tracked in dedicated issues, and are closed when the final release. See the following two issues as an example:

- [3.3 Release Plan](https://github.com/jupyterlab/jupyterlab/issues/11643)
- [4.0 Release Plan](https://github.com/jupyterlab/jupyterlab/issues/9647)

### Alpha Releases

Alpha releases have a fairly low bar. Their purpose is to start putting the new JupyterLab version into the hands of users and extension authors.

The requirements for an alpha release should be that JupyterLab can be installed and run. Bugs and breaking changes are accepted.

### Beta Releases

Beta releases usually try to not have breaking changes in the API, although breaking changes can sometimes happen during that phase if they were missed during the alpha stage.

The recommended time period for the Beta phase is a minimum of 2 weeks.

The draft changelog describing user-facing changes will be published with the first Beta release.

The community of extension developers and active users will be invited to commence testing the new Beta release including the draft user-facing changelog, and an invitation to open issues for any major:

- regressions,
- usability problems
- points needing clarification (or inclusion) in the changelog, and
- points needing clarification in the extension porting guide.

The start of the Beta-testing period will be announced on Jupyter mailing group and Jupyter Discourse for major releases, and only via a Discourse post for minor releases.

All bug reports raised during the Beta-testing period should be triaged (but not necessarily addressed) before releasing the first release candidate.

### Release Candidates

Release Candidates (RC) are a signal to the extension developer community that they should start migrating to the new version to test it. At that point we consider the software stable.

The RC stage is often a good time to address final release documentation changes or minor UX tweaks. During the RC phase, the JupyterLab developers and maintainers start updating third-party extensions over to the new version to test it. This work during the RC phase, and giving time for feedback from extension developers, can take up to a couple of weeks.

The recommended time period for the Release Candidate phase is a minimum of 1 week for minor releases, and 2 weeks for major releases.

## Automated Releases with the Jupyter Releaser

The recommended way to make a release is to use [`jupyter_releaser`](https://jupyter-releaser.readthedocs.io/en/latest/how_to_guides/convert_repo_from_repo.html).

### Workflow

The full process is documented in https://jupyter-releaser.readthedocs.io/en/latest/get_started/making_release_from_repo.html. There is a recording of the full workflow on [YouTube](https://youtu.be/cdRvvyZvYKM).

Here is a quick summary of the different steps.

#### Communicate on Zulip

It is good practice to let other maintainers and users know when starting a new release.

For this we usually leave a small message in the "Release Coordination" topic of the `jupyterlab` channel on Zulip: https://jupyter.zulipchat.com/#narrow/channel/469762-jupyterlab/topic/Release.20coordination.
Once the release is done, we also post a message with a link to the release notes, which include the changelog.

#### 1. Prep Release

The first step is to generate a new changelog entry for the upcoming release.

We use the "Prep Release" workflow as documented here: https://jupyter-releaser.readthedocs.io/en/latest/get_started/making_release_from_repo.html#prep-release

Go the Actions tab of the JupyterLab Repo and click on the `1. Prep Release` workflow: https://github.com/jupyterlab/jupyterlab/actions

The workflow takes a couple of input parameters. Here is an overview with example values:

| Input        | Description                                             | Example Value           |
| ------------ | ------------------------------------------------------- | ----------------------- |
| Target       | The owner/repo GitHub target                            | `jupyterlab/jupyterlab` |
| Branch       | The branch to target                                    | `main`                  |
| Version Spec | New Version Spec                                        | `next`                  |
| Since        | Use PRs since activity since this date or git reference | `v4.0.0a15`             |

The version spec follows the specification documented below in the [Bump Version](#bump-version) section.

We can use `next` when making a `patch` release or a `build` pre-release.

Click on "Run workflow", then once completed:

1. Go to the Releases: https://github.com/jupyterlab/jupyterlab/releases
1. Check the draft GitHub Release has been created
1. Make edits to the changelog if needed. ⚠️ If you make edits to the content of the GitHub Release, then don't forget to click on "Save Draft" and not "Publish Release".

### 2. Publish Release

#### PyPI and npm tokens

Before running the "Publish Release" workflow, make sure you have been added to:

- the `jupyterlab` project on PyPI: https://pypi.org/project/jupyterlab/
- the `@jupyterlab` organization on npm: https://www.npmjs.com/settings/jupyterlab/packages

Then create the PyPI and npm tokens. Check out the links in the [Jupyter Releaser Setup Documentation](https://jupyter-releaser.readthedocs.io/en/stable/get_started/making_release_from_releaser.html#set-up) for more information.

#### Running the workflow

On the [Actions](https://github.com/jupyterlab/jupyterlab/actions) page, select the "2. Publish Release" workflow.

Fill in the information as mentioned in the body of the changelog PR, for example:

| Input                                 | Value |
| ------------------------------------- | ----- |
| The target branch                     | main  |
| The URL of the draft GitHub release   |       |
| Comma separated list of steps to skip |       |

The "Publish Release" workflow:

- builds and uploads the `jupyterlab` Python package to PyPI
- builds the `@jupyterlab/*` packages and uploads them to `npm`
- creates a new GitHub Release with the new changelog entry as release notes
- creates a PR to forward port the new changelog entry to the main branch (when releasing from a branch that is not the default)

Then follow the [Post release candidate checklist](#post-release-candidate-checklist) if applicable.

## Manual Release Process

Review `CONTRIBUTING.md`. Make sure all the tools needed to generate the
built JavaScript files are properly installed.

### Creating a full release

We publish the npm packages, a Python source package, and a Python universal
binary wheel. We also publish a conda package on conda-forge (see below). See
the Python docs on [package
uploading](https://packaging.python.org/guides/tool-recommendations/) for twine
setup instructions and for why twine is the recommended method.

### Getting a clean environment

For convenience, here is a script for getting a completely clean repo. This
makes sure that we don't have any extra tags or commits in our repo (especially
since we will push our tags later in the process), and that we are on the correct branch. The script creates a conda env, pulls down a git checkout with the
appropriate branch, and installs JupyterLab with `pip install -e .`.

Make sure you are running an sh-compatible shell, and it is set up to be able to do `conda activate`. Then do:

```bash
source scripts/release_prep.sh <branch_name>
```

### Bump version

The next step is to bump the appropriate version numbers. We use
[bump2version](https://github.com/c4urself/bump2version) to manage the Python
version, and we keep the JS versions and tags in sync with the release cycle.

Here is an example of how version numbers progress through a release process.
Choose and run an appropriate command to bump version numbers for this release.

| Command                    | Python Version Change | NPM Version change                 |
| -------------------------- | --------------------- | ---------------------------------- |
| `jlpm bumpversion major`   | x.y.z-> (x+1).0.0.a0  | All a.b.c -> a.(b+10).0-alpha.0    |
| `jlpm bumpversion minor`   | x.y.z-> x.(y+1).0.a0  | All a.b.c -> a.(b+1).0-alpha.0     |
| `jlpm bumpversion build`   | x.y.z.a0-> x.y.z.a1   | All a.b.c-alpha.0 -> a.b.c-alpha.1 |
| `jlpm bumpversion release` | x.y.z.a1-> x.y.z.b0   | All a.b.c-alpha.1 -> a.b.c-beta.0  |
| `jlpm bumpversion release` | x.y.z.b1-> x.y.z.rc0  | All a.b.c-beta.1 -> a.b.c-rc.0     |
| `jlpm bumpversion release` | x.y.z.rc0-> x.y.z     | All a.b.c-rc0 -> a.b.c             |
| `jlpm bumpversion patch`   | x.y.z -> x.y.(z+1)    | Changed a.b.c -> a.b.(c+1)         |

Note: For a major release, we bump the JS packages by 10 versions so that
we are not competing amongst the minor releases for version numbers.
We are essentially sub-dividing semver to allow us to bump minor versions
of the JS packages as many times as we need to for minor releases of the
top level JupyterLab application.

#### JS major release(s)

In a major Python release, we can have one or more JavaScript packages also have
a major bump. During the prerelease stage of a major release, if there is a
backwards-incompatible change to a JS package, bump the major version number for
that JS package:

`jlpm bump:js:major [...packages]`

**NOTE** You should rebase before running `jlpm bump:js:major` to avoid a cascade of merge conflicts.

Results:

- Python package is not affected.
- JS dependencies are also bumped a major version.
- Packages that have already had a major bump in this prerelease cycle are not affected.
- All affected packages changed to match the current release type of the Python package (`alpha`, `beta`, or `rc`).

### Publishing Packages

Now publish the JS packages

```bash
npm run publish:js
```

If there is a network error during JS publish, run `npm run publish:js --skip-build` to resume publish without requiring another clean and build phase of the JS packages.

Note that the use of `npm` instead of `jlpm` is [significant on Windows](https://github.com/jupyterlab/jupyterlab/issues/6733).

Next, prepare the python release by running:

```bash
npm run prepare:python-release
```

This will update the Python package to use the new JS packages and
create the Python release assets. Note: sometimes the npm registry
is slow to update with the new packages, so this script tries to fetch
the packages until they are available.

At this point, run the `./scripts/release_test.sh` to test the wheel in
a fresh conda environment with and without extensions installed. Open and run
the Outputs notebook and verify everything runs properly. Also add a cell with the following code and make sure the widget renders:

```python
from ipywidgets import IntSlider
IntSlider()
```

### Finish

Follow instructions printed at the end of the publish step above:

```bash
twine upload dist/*
git push origin --tags <BRANCH>
```

These lines:

- upload to pypi with twine
- double-check what branch you are on, then push changes to the correct upstream branch with the `--tags` option.

## Post release candidate checklist

- [ ] Modify and run `python scripts/milestone_check.py` to check the issues assigned to this milestone
- [ ] Write [release highlights](CHANGELOG.md), starting with:
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
  - [ ] https://github.com/jupyterlab/extension-template
  - [ ] https://github.com/jupyterlab/jupyter-renderers
- [ ] Publish a release (with a **updated tag**) to the [extension template](https://github.com/jupyterlab/extension-template/releases) with the new JupyterLab version
- [ ] Update the extension examples:
  - [ ] [Notebook toolbar button](https://github.com/jupyterlab/jupyterlab/blob/main/docs/source/extension/notebook.rst#adding-a-button-to-the-toolbar)
  - [ ] [Notebook widget](https://github.com/jupyterlab/jupyterlab/blob/main/docs/source/extension/notebook.rst#adding-a-widget-to-the-notebook-header)
- [ ] Update the [extension tutorial](https://github.com/jupyterlab/jupyterlab/blob/main/RELEASE.md#updating-the-extension-tutorial)
- [ ] At this point, there may have been some more commits merged. Run `python scripts/milestone_check.py` to check the issues assigned to this milestone one more time. Update changelog if necessary.

Now do the actual final release:

- [ ] Run `jlpm run bumpversion release` to switch to final release
- [ ] Push the commit and tags to main
- [ ] Run `npm run publish:all` to publish the packages
- [ ] Create a branch for the release and push to GitHub
- [ ] Update the API [docs](#updating-api-docs)
- [ ] Merge the PRs on the other repos and set the default branch of the
      xckd repo
- [ ] Publish to [conda-forge](https://github.com/jupyterlab/jupyterlab/blob/main/RELEASE.md#publishing-to-conda-forge).

After a few days (to allow for possible patch releases), set up development for
the next release:

- [ ] Run `jlpm run bumpversion minor` to bump to alpha for the next alpha release
- [ ] Put the commit and tags to main
- [ ] Run `npm run publish:all` to publish the packages
- [ ] Release the other repos as appropriate
- [ ] Update version for [binder](https://github.com/jupyterlab/jupyterlab/blob/main/RELEASE.md#update-version-for-binder)

### Updating the extension tutorial

- Clone the repo if you don't have it

```bash
git clone git@github.com:jupyterlab/jupyterlab_apod.git
```

#### Simple updates by rebasing

If the updates are simple, it may be enough to check out a new branch based on
the current base branch, then rebase from the root commit, editing the root
commit and other commits that involve installing packages to update to the new
versions:

```bash
git checkout -b BRANCH # whatever the new version is, e.g., 1.0
git rebase -i --root
```

To seed the latest version of the extension template (first commit), you
can execute (assuming you are editing the first commit):

```sh
copier copy --UNSAFE https://github.com/jupyterlab/extension-template .
# Fix any conflicts
git commit --amend '-S'
```

"Edit" the commits that involve installing packages, so you can update the
`package.json`. Amend the last commit to bump the version number in package.json
in preparation for publishing to npm. Then skip down to the step below about
publishing the extension tutorial. If the edits are more substantial than just
updating package versions, then do the next steps instead.

#### Creating the tutorial from scratch

- Create a new empty branch in the extension repo.

```bash
git checkout --orphan name-of-branch
git rm -rf .
git clean -dfx
copier copy --UNSAFE https://github.com/jupyterlab/extension-template .
```

- Create a new PR in JupyterLab.
- Run through the tutorial in the PR, making commits and updating
  the tutorial as appropriate.
- For the publish section of the readme, use the `README`
  file from the previous branch, as well as the `package.json` fields up to
  `license`. Bump the version number in preparation for publishing to npm.

#### Publishing extension tutorial changes

- Tag commits in the branch with the appropriate `branch-step` tag. If you are at the final commit, you can tag all commits with the below, setting `BRANCH` with the branch name (e.g., `1.0-01-show-a-panel`)

  ```bash
  export BRANCH=<branch-name>
  git tag ${BRANCH}-01-show-a-panel HEAD~4
  git tag ${BRANCH}-02-show-an-image HEAD~3
  git tag ${BRANCH}-03-style-and-attribute HEAD~2
  git tag ${BRANCH}-04-refactor-and-refresh HEAD~1
  git tag ${BRANCH}-05-restore-panel-state HEAD
  ```

- Push the branch with the new tags

  ```bash
  git push origin ${BRANCH} --tags
  ```

  Set the branch as the default branch (see `github.com/jupyterlab/jupyterlab_apod/settings/branches`).

- If there were changes to the example in the documentation, submit a PR to JupyterLab

- Publish the new `jupyterlab_apod` python package. Make sure to update the version
  number in the last commit of the branch.

  ```bash
  twine upload dist/*
  ```

If you make a mistake and need to start over, clear the tags using the
following pattern:

```bash
git tag | grep ${BRANCH} | xargs git tag -d
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
- Update `recipe/meta.yaml` with the new version and sha256 and reset the build number to 0.

## Making a manual patch release

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

## Making a Minor Release

### Planning

- Create a pinned issue
- Create a milestone
- Decide on a scope for the release and set a target final release date

## Alpha and Beta Phase

- Create a new branch from the previous release branch
- Use a ".x" in the branch name so we can continue to use it for patches
- Update branch and RTD config in `ensure_repo.ts` and run `jlpm integrity` to update links - source should be the previous release branch
- Update readthedocs branch config as appropriate
- Automated Release using "minor" - edit changelog for new section
- Move through alpha and beta phases as appropriate

### RC Phase

- Roll up the release notes using the "Use PRs with activity since the last stable git tag" option when running the workflows
- Update the release issue with an updated date

### Final Release

- Roll up the release notes using the "Use PRs with activity since the last stable git tag" option when running the workflows
- Close the release issue
- Rename milestone to use ".x"
- Make an announcement on Discourse

## Making a Major Release

### Planning

- Create a pinned issue
- Create a milestone
- Decide on a scope for the release and set a target final release date

### Alpha and Beta Phase

- Update branch and RTD config in `ensure_repo.ts` and `jlpm integrity` to update links - source should be the previous branch
- Update readthedocs branch config as appropriate
- Automated Release using "major" - edit changelog for new section
- Move through alpha and beta phases as appropriate

### RC Phase

- Roll up the release notes using the "Use PRs with activity since the last stable git tag" option when running the workflows
- Create a new branch from the default branch with ".x" in the name so we can continue to use it for patches
- Update the release issue with an updated date

### Final Release

- Roll up the release notes using the "Use PRs with activity since the last stable git tag" option when running the workflows
- Close the release issue and rename milestone to use ".x"
- Make an announcement on Discourse
- Make a blog post

## Postmortems

Here is a list of previous issues that happened while releasing JupyterLab, that can be used as reference in case
new issues show up in the future:

- HTTP Error 502: Bad Gateway (JupyterLab `4.0.0a23`): https://github.com/jupyterlab/jupyterlab/issues/12324
- Degraded performance of npm publish (JupyterLab `4.0.0b2`): https://github.com/jupyterlab/jupyterlab/issues/14431
- Wrong URLs break publishing to npm with provenance: https://github.com/jupyterlab/jupyterlab/pull/15462
- Release team missing privileges on packages removed in 4.0: https://github.com/jupyterlab/jupyterlab/issues/15677
- Issue publishing `4.3.0rc0`: Project size too large on PyPI: https://github.com/jupyterlab/jupyterlab/issues/16857
- Issue publishing `4.4.0a0`: 403 Client Error: Server failed to authenticate the request: https://github.com/jupyterlab/jupyterlab/issues/16976
