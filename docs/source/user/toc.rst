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



The Table of Contents tool will automatically generate a table of contents for your notebook by taking all your Header Cell titles and ordering them in a list.  
Because your Notebook does not utilize formal page breaks or numbers, each listed section will be hyperlinked to the actual section within your document.



Automatic section numbering will go through your Notebook and number your sections and subsection as designated by your Header Cells. This means that if you've moved one or more big sections around several times, you won't have to go through your paper and renumber it, as well as all its subsections, yourself.



------------------------------------------------------------------------------------------------------------



Automatic section numbering can be skipped for h1 headers by setting the ``numberingH1``
parameter to false, Here is an animation showing its use



.. image:: ./images/toc/numberingH1.gif



------------------------------------------------------------------------------------------------------------



Context menus are added to those toc headings having notebook sections
containing runnable code cells, and clicking the *Run Cell(s)* option will make the cells run in notebook.
Here is an animation showing its use



.. image:: ./images/toc/runcell.gif



------------------------------------------------------------------------------------------------------------



 There will be a synchronization between Table of Contents and notebook if the ``syncCollapseState`` attribute
 is made to true in the settings. If a heading is collapsed in the table of contents the notebook will also gets collapsed and
 similarly expanding cells in notebook will expand the table of contents. Here is and animation showing its use



.. image:: ./images/toc/syncCollapseState.gif



------------------------------------------------------------------------------------------------------------


The cell outputs get numbered by default in the table of contents and the notebook.
In the settings by making the attribute to false will not give numbering to outputs. Here is an animation showing its use



.. image:: ./images/toc/includeOutput.gif


The collapsing of the table of contents is now having the blue bar rather than caret up/down icons as you can see from above all the demos.


.. _prerequisites:

Prerequisites
-------------
* JupyterLab >=2.0
* NodeJS 12+


.. _Installation:

Installation
------------
.. code:: bash

   jupyter labextension install @jupyterlab/toc


.. _Settings:

Settings
--------



Once installed, extension behavior can be modified via the following settings which can be set in JupyterLab's advanced settings editor.



* **collapsibleNotebooks**: enable the ability to collapse sections of notebooks from the ToC
* **numberingH1**         : numbers the h1 sections if set to true
* **syncCollapseState**   : synchronization of collapsing behaviour between the table of contents and notebook
* **includeOutput**       : includes the numbering for Outputs in both notebook and table of contents.
