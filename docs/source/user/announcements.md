% Copyright (c) Jupyter Development Team.

% Distributed under the terms of the Modified BSD License.

# Announcements

Your consent is required to get Jupyter news (this is an opt-in feature).
Once you have answered the request, you can change your decision in the _Notification_
settings.

## Configuration

The frontend plugin requesting the news and checking for the update is `@jupyterlab/apputils-extension:announcements`.
It can be disabled as any plugin by executing in a terminal prior to start JupyterLab:

```sh
jupyter labextension disable "@jupyterlab/apputils-extension:announcements"
```

### Check for updates

You can also control whether to check for updates or not at two levels:

- on the server side through a command-line option `--LabApp.check_for_updates_class="jupyterlab.NeverCheckForUpdate"`
- on the frontend through the setting _checkForUpdates_ in the _Notification_ section.

You can also provide your own class to check for updates. The abstract class to
implement is `jupyterlab.handlers.announcements.CheckForUpdateABC`.

### Jupyter news

The news are fetched from a news feed. The URL can be customized to point to any [Atom feed](https://www.rfc-editor.org/rfc/rfc5023)
using the command line option `--LabApp.news_url="<URL_TO_FEED_XML_FILE>"`.

:::{note}
An entry in a custom feed is required to have the following tags: `title`, `id`, and `updated`.
The following tags are also used but not required: `published`, `summary`, and at least one `link`.
:::

## Binder

You will find how to deactivate those features on Binder at {ref}`binder`.
