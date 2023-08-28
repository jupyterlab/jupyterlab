.. Copyright (c) Jupyter Development Team.
.. Distributed under the terms of the Modified BSD License.

==============================
JupyterLab Accessibility Documentation
==============================

----------------
Introduction
----------------

Welcome to the JupyterLab Accessibility Documentation, the guide for making the most of JupyterLab's inclusive features. As part of our commitment to providing an accessible and user-friendly environment, this documentation aims to empower users with insights, tips, and tools for enhancing accessibility within the JupyterLab interface.

In this guide, there is a wealth of information about key accessibility features, customization options, and best practices for navigating and interacting with JupyterLab. We are working towards ensuring that all users, regardless of their abilities, can seamlessly engage with
JupyterLab's powerful capabilities.

-----------------------------------
Key Accessibility Features
-----------------------------------

These features are carefully crafted to provide seamless navigation, interaction, and customization options making JupyterLab a versatile platform that caters to diverse user needs.

-----------------------------------
Keyboard Navigation
-----------------------------------

Keyboard navigation lies at the core of JupyterLab's accessibility approach, allowing users to efficiently interact with the interface using keystrokes. It has naturally evolved to provide a quicker alternative to mouse-based interactions by the use of multiple accessibility tools throughout the interface that will be discussed in this section.

-----------------------------------
Keyboard Shortcuts
-----------------------------------

JupyterLab offers an extensive set of keyboard shortcuts that empower users to navigate through various functions and tools. From executing code cells to managing tabs, these shortcuts streamline workflows and enhance accessibility for users who rely on keyboard input.

For a comprehensive list of available shortcuts, users can explore the advanced settings by navigating to `Settings > Advanced Settings` in the JupyterLab main menu.

.. figure:: ./desktop/quansight_labs/documentation/keyboard_shortcut_final.png
   :alt: The JupyterLab Advanced Settings Editor with the Keyboard Shortcuts section open. Under a selected keyboard shortcut listing there is a Add button to add another shortcut.

Within JupyterLab's Advanced Settings, default keyboard shortcuts are unmodifiable, though users can craft and modify their own shortcuts to align with their unique workflows. In order to create a new keyboard shortcut use the `add` button and enter the information requested,
Please note that the information can be removed and edited afterwards.

-----------------------------------
Command Palette
-----------------------------------

The `Command Palette <https://jupyterlab.readthedocs.io/en/latest/user/commands.html#command-palette>`_ acts as a list of all commands in JupyterLab, offering a text-based interface for executing commands. It can be accessed from the `View` menu or using the keyboard shortcut `Ctrl + Shift + C`. Using the shortcut `Ctrl + Shift + C` will change focus to the command palette no matter where users are in JupyterLab, so it may also be useful to move out of keyboard traps. This feature not only aids keyboard-centric users but also promotes efficiency and
accessibility, as users can swiftly access functionalities without navigating complex menus.


.. figure:: ./desktop/quansight_labs/documentation/command_palette.png
   :alt: JupyterLab notebook editor with the modal command palette opened. There is a list filter at the top and a truncated list of commands with shortcuts below.

-----------------------------------
Screen Reader Support
-----------------------------------

While JupyterLab has taken strides to support screen reader compatibility, it's important to note that there hasn't been any extensive testing of this feature. Presently, screen readers such as `NVDA <https://www.nvaccess.org/download/>`_ and `JAWS <https://www.freedomscientific.com/products/software/jaws/>`_ on Windows, as well as `VoiceOver <https://support.apple.com/en-ng/guide/voiceover/vo2682/mac#:~:text=You%20can%20also%20turn%20VoiceOver,then%20press%20the%20Space%20bar.>`_ on macOS, provide some level of compatibility. However, challenges exist, such as reading images without labels, equations, and links.

--------------------------------------------
Tab Navigation and Tab Trapping
--------------------------------------------

The JupyterLab interface allows users to cycle through focusable elements using the `Arrow keys`, `Tab key` and `Shift key`. This sequential navigation allows the exploration of buttons, input fields, and interactive components in a given order.

In the main UI sections, including the notebook, console, sidebars and terminal, it is possible for users to become trapped within a specific area, limiting keyboard navigation. This is a work in progress and multiple efforts are being made to reduce the number of tab traps.

In case of encountering a Tab trap, users can use the Command Palette. By opening the Command Palette and searching for the desired command, this action enables the transition to other parts of JupyterLab's interface without relying solely on sequential tabbing.

-----------------------------------
Colour Themes
-----------------------------------

While JupyterLab provides default themes, it's important to note that these themes are not compliant with the `Web Content Accessibility Guidelines (WCAG) 2.0 <https://www.w3.org/TR/WCAG20/>`_. This means that some users might experience challenges in terms of colour contrast or readability.

Nevertheless, `Jupyterlab Accessible Themes <https://github.com/Quansight-Labs/jupyterlab-accessible-themes>`_, a third-party extension provides an additional avenue for enhancing color accessibility in JupyterLab. This extension introduces two WCAG-compliant accessible themes to the JupyterLab ecosystem. Please note that this extension is compatible with JupyterLab 3.0.

In addition to accessible third-party themes, JupyterLab grants users the freedom to create and apply custom themes. There are plenty of resources for developing a new theme including `this detailed blog post
<https://labs.quansight.org/blog/2020/12/jupyterlab-winter-theme>`_ and
the `Extension Development Guide
<https://jupyterlab.readthedocs.io/en/latest/extension/extension_dev.html>`_

-----------------------------------
Text Scaling
-----------------------------------

JupyterLab allows text scaling customization via the advanced settings for improving the legibility of certain parts of the interface like files. This enhances the experience for users with visual impairment. For changing the font size options, please navigate via the main menu to
`Settings > Advanced Settings` and locate the text editor settings on the left panel to make the necessary adjustments.

It's important to note that changes made in this setting will exclusively impact either the Markdown viewer or the text editor, based on the selected configuration. Notably, adjustments here won't influence the font size in the notebook area or in the rest of the interface.

However, users have the zoom browser functionality to increase the size of not only the text size but also the interface elements of JupyterLab. This dynamic approach is a fast route to improve readability and increase workflow efficiency in specific contexts. Take into account that some parts of the interface may fail if the zoom is greater than 200%.

-----------------------------------
Focus Indicators
-----------------------------------

Currently, JupyterLab does not provide focus indicators that fully adhere to Web Content Accessibility Guidelines (WCAG) standards. While keyboard navigation remains functional, the absence of WCAG-compliant focus indicators may impact the visual cues for users with accessibility needs.


-----------------------------------
Current Known Issues
-----------------------------------

As part of our accessibility commitment, we want to acknowledge and address the current known issues in JupyterLab's accessibility journey. While we are actively working to enhance the platform's accessibility features, some challenges may persist. Please refer to the following
links for seeing the current state and discussions taking place in the community,

-  `JupyterLab accessibility issues <https://github.com/jupyterlab/jupyterlab/issues?q=is%3Aopen+is%3Aissue+label%3Atag%3AAccessibility>`_

-  `Lumino accessibility issues <https://github.com/jupyterlab/lumino/issues?q=is%3Aopen+is%3Aissue+label%3Aaccessibility>`_

-  `JupyterLab and Notebook accessibility audits <https://jupyter-accessibility.readthedocs.io/en/latest/audits/index.html>`_

Please feel free to contribute to any of the listed projects, all the feedback will help to enhance JupyterLab's accessibility and ensure it accommodates diverse user needs.



-----------------------------------
Further Resources
-----------------------------------

-  `Jupyter accessibility documentation <https://jupyter-accessibility.readthedocs.io/en/latest/index.html>`_

-  `Jupyter accessibility community meeting <https://github.com/jupyter/accessibility/tree/main/docs/community/meeting-minutes>`_

-  `Jupyter accessible themes extension <https://github.com/Quansight-Labs/jupyterlab-accessible-themes>`_

-  `Jupyter accessible testing <https://github.com/Quansight-Labs/jupyter-a11y-testing>`_

-  `WCAG guidelines <https://www.w3.org/WAI/standards-guidelines/wcag/>`_
