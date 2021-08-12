.. _toc:

Table Of Contents
====================

The table of contents extension is built-in JupyterLab since version 3.0. This makes it easy to see and navigate the structure of a document.


Anyone using earlier JupyterLab version should install a `dedicated extension <https://github.com/jupyterlab/jupyterlab-toc>`__.


A table of contents is auto-generated in the :ref:`left sidebar
<left-sidebar>` when you have a notebook, markdown, latex or python files opened. The entries are clickable, and scroll the document to the heading in question.



In the sidebar panel, you can number headings, collapse sections, and navigate into the file.



Here is an animation showing the table of content use, with a notebook from the `Python Data Science Handbook <https://github.com/jakevdp/PythonDataScienceHandbook>`_ :



.. image:: ./images/toc/toc.gif



The table of contents tool will automatically generate a table of contents for your notebook by taking all the headings from your markdown cells. 
Because the Notebook does not utilize formal page breaks or numbers, each listed section will be hyperlinked to the actual section within your document.



Automatic section numbering will go through your Notebook and number your sections and subsection as designated by your headings. This means that if you've moved one or more big sections around several times, you won't have to go through your document and renumber it, as well as all its subsections, yourself.



------------------------------------------------------------------------------------------------------------



Automatic section numbering can be skipped for first-level headings (``h1``) by setting the ``numberingH1``
setting to ``false``. To perform that go to settings and click on Advanced Settings Editor and then go to Table of Contents section
and in User Preferences add ``numberingH1:false`` and save the settings. Here is an animation showing its use



.. image:: ./images/toc/numberingH1.gif



------------------------------------------------------------------------------------------------------------



Context menus are added to those table of contents headings having notebook sections
containing runnable code cells, and clicking the *Run Cell(s)* option will make the cells run in notebook.
Here is an animation showing its use



.. image:: ./images/toc/runcell.gif



------------------------------------------------------------------------------------------------------------



 There will be a synchronization between table of contents and notebook if the ``syncCollapseState`` attribute
 is set to ``true`` in the settings. If a heading is collapsed in the table of contents the notebook will also gets collapsed and
 similarly expanding cells in notebook will expand the table of contents. To perform that go to settings and click on Advanced Settings
 Editor and then go to Table of Contents section and in User Preferences add ``syncCollapseState:true`` and save the settings. Here is an animation showing its use



.. image:: ./images/toc/syncCollapseState.gif



------------------------------------------------------------------------------------------------------------


The headings in the cell outputs get numbered by default in the table of contents and the notebook.
This can be tuned by changing the settings ``includeOutput`` to ``false``. To perform that go to settings and click on Advanced Settings
Editor and then go to Table of Contents section and in User Preferences add ``includeOutput:false`` and save the settings. Here is an animation showing its use



.. image:: ./images/toc/includeOutput.gif






.. _Settings:

Settings
--------



The extension behavior can be modified via settings which can be set in JupyterLab's advanced settings editor.



* **collapsibleNotebooks**: enable the ability to collapse sections of notebooks from the table of contents
* **numberingH1**         : numbers the first-level headings (``h1``) if set to ``true``
* **syncCollapseState**   : synchronization of collapsing behaviour between the table of contents and notebook
* **includeOutput**       : includes the numbering for Outputs in both notebook and table of contents.
