% Copyright (c) Jupyter Development Team.

% Distributed under the terms of the Modified BSD License.

# Privacy policies

Last modified: October 29, 2025

## Introduction

As much as possible, the JupyterLab development team avoids the use of external
web services. However, to provide some features, requests to external
services are required (see below for a full list). These features are
opt-in; you need to explicitly consent to activate them.
The development team takes a proactive approach to user privacy.

This policy sets out the different areas where user privacy is concerned
and outlines the obligations and requirements of the JupyterLab
development team.

## What information do we collect?

The external web services collect some information, as described below.
The JupyterLab development team cannot access and does not collect
information that JupyterLab users provide to external web services.

## Features using external services

### Announcements plugin

The announcements plugin fetches a news feed from a GitHub page
(<https://jupyterlab.github.io/assets>) and metadata of the JupyterLab Python
package on PyPI.org (<https://pypi.org/pypi/jupyterlab/json>).

The plugin will fetch this information only if the user clicks the _Yes_
button on the notification that asks if they want to be notified with JupyterLab news.
That choice is stored as a user preference in _Notifications_ ->
_Fetch official Jupyter news_. The user can change their preference later.

Users can also disable the plugin by executing:

```bash
jupyter labextension disable "@jupyterlab/apputils-extension:announcements"
```

### Extension manager plugin

The extensions manager plugin fetches Python packages' metadata from PyPI.org
(<https://pypi.org>) and package author thumbnails from GitHub (<https://github.com>).

The plugin will fetch this information only if the user clicks on the _Yes_
button in the extensions manager side panel.
That choice is stored as a user preference in _Extension Manager_ ->
_Disclaimed Status_. The user can change their preference later.

Users can also disable the plugin by executing:

```bash
jupyter labextension disable "@jupyterlab/extensionmanager-extension:plugin"
```

## External web services

### GitHub Pages

The service hosting the <https://jupyterlab.github.io> website stores access logs.
That data is not accessible to and not readable by the JupyterLab development team.

GitHub's privacy policy can be found at <https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement> .

### JupyterLab Docs

The service hosting the <https://jupyterlab.readthedocs.io> website stores access
logs. Only aggregate statistics are made available to Project Jupyter. See the
privacy policy at
<https://docs.readthedocs.com/platform/stable/privacy-policy.html>.

Additional website statistics are collected using Plausible.io and aggregate statistics
are accessible to Project Jupyter. See the privacy policy at
<https://plausible.io/privacy> and the data policy at
<https://plausible.io/data-policy>.

### PyPI.org

The service providing Python packages' metadata (<https://pypi.org>) stores access logs.
That data is not accessible to and not readable by the JupyterLab development team.

PyPI's privacy policy can be found at <https://www.python.org/privacy/>.

## Changes to policy

Our Privacy Policy may change from time to time, and the new policy will be posted
on this page. We will never materially change our policies and practices to make
them less protective of personal information collected in the past without your
prior consent.
