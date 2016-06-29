# Design of the Notebook Plugin

This document describes the design of the notebook. This document illustrates how our research on personas and other solutions
translates into the design decisions made to improve the notebook plugin.

## Personas

### Experienced Data Scientist

The experienced data scientist is familiar with the Jupyter Notebook and uses it regularly. He has become accustomed to the shortcuts
and toolbars. He uses the notebook to take measurements from plants and identify the species based on those measurements alone.

**Goal:** Use the Notebook to display his various visualizations for his data

Some things they would in the notebook include:
* Create a scatterplot matrix
* Import data into a pandas DataFrame
* Convert measurements in the data with programming
* Cleaning up the data
* Program the mean imputation
* Save the data file
* Save a copy

### Student using the notebook in a programming class

The student is a first-year cs major who is taking a course where the professor wants his students to use JupyterLab to write
their code and print it out. He has never used the Jupyter notebook or JupyterLab before.

**Goal:** Make it easy for this student to learn how to use the Jupyter notebook to complete his assignments

Some things they would do in the notebook include:
* Write basic programs and output them
* Save the notebook
* Print it out

## User Tasks

Users should be able to:
* Save the file
* Download the file as
* Print the file

## Other Solutions

The Jupyter Notebook currently has a top menu bar that allows you to save the file, download the file as, print the file, etc. 

Display explanatory text should be displayed faster. 

An alert when the file has been saved similar to the Jupyter Notebook.

Section off the different tools according to their category to make it easier for the user to find the button they want to use.

## What users should be able to see or do

* Easily identify what the icon actions do
* When “New Notebook” command is selected, "Create New Notebook" popup appears

## Visual Design

### Layout

Section the icon tools off according to their category using dividers like the ones around the dropdown menu for “Code”.

Make the Kernel label on the top right of the notebook a dropdown menu where you can select to switch kernels.

Include an indicator that the file is being saved on the toolbar. 

Popup for creating a new notebook fades the background to dark grey. Popup appears in the center of the screen.

### Typography

Typeface will stay consistent with current typeface on the Jupyter Notebook.

### Colors

Colors will stay consistent with current color theme.

### Motion

Speed of explanatory text should increase when hovering over icons.
