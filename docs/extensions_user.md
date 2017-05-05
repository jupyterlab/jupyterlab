# Extensions User Guide

JupyterLab extensions add functionality to the JupyterLab application.
They can provide new file viewer types, launcher activities, and new Notebook
output renderers for example.

The base JupyterLab application comes with core set of extensions, which 
provide the Notebook, Terminal, Text Editor, etc.  New extensions can be 
installed into the application using the command:

```
jupyter labextension install <foo>
```

Where `<foo>` is a valid JupyterLab extension specifier.  This specifier
is defined by the extension author in their installation instructions.

The currently installed extensions can be listed by running the command:

```
jupyter labextension list
```

An installed extension can be uninstalled by running the command:

```
jupyter labextension uninstall <bar>
```

Where `<bar>` is the name of the extension, as printed in the extension
list.


## Advanced usage
The behavior of the application can be customized through configuration.
The configuration is stored by default in `<sys-prefix>/etc/jupyter/labconfig/`.
In this directory, we use `build_config.json` and `page_config.json`.
The configuration directory can be overridden using `--lab-config-dir` in
any of the JupyterLab commands.
The `build_config.json` stores the location of the build directory in
`location` (defaults to `<sys-prefix>/share/jupyter/lab`), as well
as `installed_extensions` and `linked_extensions` metadata.
The `page_config.json` data is used to provide config data to the application
environment.  For example, the `ignoredPlugins` data is used to ignore registered plugins by the name of the token they provide.
