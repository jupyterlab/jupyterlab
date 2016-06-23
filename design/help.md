# Design of the Help plugin

This document describes the design of the Help plugin. This document illustrates how
our research on personas and other solutions translates into the design decisions made to improve the Help plugin.

# Personas

## Tim Burns

Tim Burns works at Bloomberg as a marketing data scientist. He takes 
large chunks of marketing data and visualizes them.

**Goal:** Use Jupyter to help visualize data.

Some things they would use Help for:

* Learning how to initially use Jupyter
* Finding where he can start visualizing data

## Jason Shu

Jason Shu is a student majoring in computer programming. He has very 
basic knowledge of computer science and no knowledge of what Jupyter is.

**Goal:** Learn how to create new notebooks, open a new terminal, and change kernels

**Pain Points:** Finding help, unhelpful Documentation, current content offered in "Help"
isn't very helpful for beginners

# User tasks

Users should be able to:

* Have a basic understanding of how to use JupyterLab
* Find Documentation

#Research of Other Solutions

* Making the “Help” tab more prominent so it is easier to find.
* Including a “Quickstart Guide” of an easy way to start using JupyterLab (Team Callisto is incorporating this into their “About” plugin)
* Including a “FAQs” page so common questions can be easily answered

#What users should be able to do or see:

* See Help tab immediately on left menu
* More Help Content by including a Quickstart Guide and FAQs page

##All possible actions a user could take

* Click Help which opens a submenu
* Click About JupyterLab which opens a new window
* Click Launch Jupyterlab which opens a new window 
* Click Notebook basics which opens a new window
* Click FAQs
* Click Numpy Reference
* Click Scipy Reference
* Click Scipy lecture notes

#Specify the way a user could take action

* Mouse/UI: Click left menu and submenus
* Menu: submenu of more Help content

# Visual design

##Layout

* Place “Help” on the same left side bar as “Commands” and “Files”
* Remove “Help” plugin from “Commands” because it is difficult to find and should be shown when first entering JupyterLab
* “Help” tab will match the present design of the side menu “Files” and “Commands” 
* Submenu bar for “Help” will stay consistent with the present design for “Commands” and “Files” submenu

##Typography

* The typeface of the “Help” tab will stay consistent with the present typeface on the left menu (Helvetica Neue sans-serif 12px)
* As of right now, the submenu typography is the same as the items shown under “Help” in the “Commands” submenu

##Colors

* The “Help” tab colors will stay consistent with the present colors on the left menu
* The “Help” submenu colors will stay consistent with the colors used in “Commands” and “Files” submenu
* Light grey background, grey text, orange Highlight
 

