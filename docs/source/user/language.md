% Copyright (c) Jupyter Development Team.

% Distributed under the terms of the Modified BSD License.

(language)=

# Localization and language

Staring with version 3.0, JupyterLab provides the ability to set
the display language of the user interface.

## Language packs

To be able to provide a new display language, you will need to
install a language pack.

Visit the [language packs repository](https://github.com/jupyterlab/language-packs/)
for a list of available packs.

### Installing

Language packs are identified by the four letter code of the language and
variant they provide. For example, for Simplified Chinese the language
pack code is `zh-CN` and you can install it with `conda` or `pip`.

If you use conda with conda-forge packages:

```bash
conda install -c conda-forge jupyterlab-language-pack-zh-CN
```

If you use Pip:

```bash
pip install jupyterlab-language-pack-zh-CN
```

## Changing the display language

To change the interface language, select the Settings menu and then
select the desired language in the Language submenu.

The Language submenu will only list any previously installed language
packs.

```{image} ../images/language-settings.png
:align: center
:class: jp-screenshot
```

Selecting the new language will prompt for confirmation.

```{image} ../images/language-change.png
:align: center
:class: jp-screenshot
```

Once you accept, the browser will refresh and the interface will
now be shown, for this example in Simplified Chinese.

```{image} ../images/language-chinese.png
:align: center
:class: jp-screenshot
```
