# F.A.Q.

Here are a couple of common questions about JupyterLab and the transition from
the classic Notebook interface.

## Is the classic notebook going away ?

No, at least not yet, it will though get way less updates. There will be a
transition period from Classic notebook to JupyterLab. Currently the notebook
server you get when you install Jupyter comes with Classic Notebook
preinstalled. JupyterLab is an extension. When you install JupyterLab, the
notebook server runs both classic notebook and JupyterLab. 

When JupyterLab has been widely adopted, the server will come with Lab by
default, and the classic notebook will be an extension. 

## What will happen to my notebook files ?

JupyterLab still use the same file format. You can open the same notebook both
in JupyterLab and classic notebook. Notebook will still work on nbviewer, be
rendered on GitHub... etc. JupyterLab is just a new interface. 

## I like the notebook interface, I do not want to migrate to JupyterLab.

The notebook interface is still present in JupyterLab, and unlike in classic
notebook you can drag and drop between notebooks, have multiple notebook side
by side, and a couple of other features not possible in classic notebook.
JupyterLab also support more file formats. For example you can execute
code in a markdown document or render GeoJson. Some libraries may need some time
to update to work correctly to JupyterLab, but for most users the transition
should be seamless. If you have any complications, feel free to open an issue. 

## How can I run JupyterLab and Classic Notebook side by side ?

Nothing particular, the webserver should automatically run both. Look in the
Help menu in Lab to access the classic server. The classic server will also get
an option to start lab once lab is out of beta.

Try not to get the same file opened in JupyterLab and Classic notebook at the
same time. Like other editor when saving the files will overwrite each other.

## How to get Lab to work with JupyterHub ?

It should work out of the box. JupyterHub does not really care whether it is
running JupyterLab, Classic Notebook, or anything else like RStudio. If
JupyterLab is installed you may need to change the default URL JupyterHub points
to.

## Feature X is not available in JupyterLab, but is in Classic Notebook.

That's either in the roadmap, or a bug. Search if there is an issue about that,
and if not open one. You can also send us a Pull Request !

## Lab have Y, when is it coming to classic notebook ?

It's likely not coming to classic notebook (unless you write the code to do it).
We're sunsetting Classic notebook – which is an old code base in favor of
JupyterLab which has all the features of JupyterLab and more.

## My question is not here !

Ask on the bug tracker, and if you get a satisfying response, please send a PR
completing the FAQ !





