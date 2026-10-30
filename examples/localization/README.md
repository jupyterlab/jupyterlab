# JupyterLab localization example

This standalone application shows how to localize an interface built with JupyterLab
packages. Localization is kept in its own example because applications using JupyterLab
components are not required to provide translations.

The browser asks the example server for its available languages, loads the selected
catalog with `TranslationManager`, and renders strings from the
`jupyterlab_localization_example` domain. English uses the source strings in
`src/index.ts`; the Spanish catalog is stored in
`locale/es/LC_MESSAGES/jupyterlab_localization_example.json`.

From the repository root, build and run the example with:

```bash
jlpm
jlpm workspace @jupyterlab/example-localization build
python examples/localization/main.py
```

The interface demonstrates a simple translation, interpolation, and plural forms. It
does not reproduce JupyterLab's settings-backed language menu or require an installed
language pack.

To add another language, add it to `LANGUAGES` and `CATALOGS` in `main.py`, provide a JSON
catalog under `locale/<locale>/LC_MESSAGES/`, and extend the browser test to exercise it.
Keep source keys and placeholders identical to those in `src/index.ts`.

For production extension packaging and translation extraction, see the
[internationalization documentation](../../docs/source/extension/internationalization.md).
