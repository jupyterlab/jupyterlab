.. Copyright (c) Jupyter Development Team.
.. Distributed under the terms of the Modified BSD License.

Internationalization and Localization
=====================================

To internationalize your extension, the following tasks are required:

.. note::

    Please read carefully the :ref:`internationalization-rules` as they are strong constraints for internationalization to work.

1. Add the token ``ITranslator`` from ``@jupyterlab/translation`` package to your plugin dependencies.

.. code:: typescript

    const extension: JupyterFrontEndPlugin<void> = {
      id: 'jupyterlab-extension',
      autoStart: true,
      requires: [ITranslator],
      activate: (app: JupyterFrontEnd, translator: ITranslator) => {}
    };

2. Get the translation bundle from the domain on which your extension is translated.

.. code:: typescript

    const trans = translator.load('my_domain');

.. note::

    A good practice is to use your extension named using only letters, numbers and ``_``
    characters.

    Domain are normalized by replacing ``-`` with ``_`` characters.

3. Wraps all translatable strings with one of the `gettext functions <https://jupyterlab.readthedocs.io/en/latest/api/modules/translation.html#translationbundle>`_.

Examples:

.. code:: typescript

    this._trans.__('String to be translated');
    this._trans.__('%1 is argument of a translated string', adjective);
    this._trans._n('Singular string for %1', 'Plural string for %1', n);

You could also look at the following pull requests on the
`spellchecker extension <https://github.com/jupyterlab-contrib/spellchecker/pull/84/files>`_.

4. Create and publish the translation for your extension.

There are two options: you can either add your extension to the JupyterLab `language packs <https://github.com/jupyterlab/language-packs/#adding-a-new-extension>`_
or you can create a python package to distribute your extension translation (see below).

Create translation python package
---------------------------------

JupyterLab follows Gettext's approach for translation. Gettext extracts strings from source code, and compiles them with provided translation
(find more about it in the `Python documentation <https://docs.python.org/3/library/gettext.html#internationalizing-your-programs-and-modules>`_).

By using `jupyterlab-translate <https://github.com/jupyterlab/jupyterlab-translate>`_, you can extract, update, and compile your translation.

After that, you must include your compiled translation (.json, .mo) to your python package. This can be done by editing these two files.

setup.py:

.. code:: python

    from setuptools import setup

    setup(
        # ...
        entry_points={"jupyterlab.locale": ["jupyterlab_some_package = jupyterlab_some_package"]},
    )


MANIFEST.in:

.. code:: text

    recursive-include jupyterlab_some_package *.json
    recursive-include jupyterlab_some_package *.mo

.. note::
   An example is available in the `server test <https://github.com/jupyterlab/jupyterlab_server/tree/main/tests/translations/jupyterlab-some-package>`_

Settings translation
--------------------

Settings schema can also be translated. The translatable strings are extracted using regex selectors
on JSON path. By default, the following selectors are used:

- ``title``: Settings title
- ``description``: Settings description
- ``properties/.*/title``: Property titles
- ``properties/.*/description``: Property descriptions
- ``definitions/.*/properties/.*/title``: Property titles in definitions
- ``definitions/.*/properties/.*/description``: Property descriptions in definitions
- ``jupyter\.lab\.setting-icon-label``: Settings icon label in JupyterLab
- ``jupyter\.lab\.menus/.*/label``: Menu label in JupyterLab
- ``jupyter\.lab\.toolbars/.*/label``: Toolbar item label in JupyterLab

Those selectors can be configured using the ``jupyter.lab.internationalization`` key in
the schema. The following example will pick the default value for ``myprop`` property:

.. code:: json

    "jupyter.lab.internationalization": {
        "selectors": [
            "properties/myprop/default",
        ],
        "domain": "my_jlab_extension"
    }

In the example above, a specific domain in which the translations are defined is also
specified (here ``my_jlab_extension``). If no domain is specified, it defaults to
``jupyterlab``.

.. _internationalization-rules:

Rules
-----

In order for the strings to be extracted from the code, the following rules must be followed.

- Domain name are normalized by replacing ``-`` to ``_``
- Translation bundle variable must be one of:

  - ``trans``
  - ``this.trans``
  - ``this._trans``
  - ``this.props.trans``
  - ``props.trans``

Examples that work:

.. code:: typescript

    trans.__('This translatable string will be found');
    this.trans.__('This translatable string will be found');
    this._trans.__('This translatable string will be found');
    this.props.trans.__('This translatable string will be found');
    props.trans.__('This translatable string will be found');

Examples that will **not** work:

.. code:: typescript

    translator.__('This translatable string WONT be found');
    __('This translatable string WONT be found');
    this.__('This translatable string WONT be found');

To fix this issue, alter your variable to use an accepted name:

.. code:: typescript

    const trans = translator;
    trans.__('This translatable string will be found');

- String must be passed directly to the function; don't use variables or constants

Example that will **not** work:

.. code:: typescript

    const errorMessage = 'This translatable string WONT be found'
    trans.__(errorMessage);

To fix this issue, pass the string directly:

.. code:: typescript

    trans.__('This translatable string will be found');
