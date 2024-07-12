# JupyterLab About Plugin

This document describes the design of the "About JupyterLab" plugin. This document will illustrate research done using Personas from users of the Jupyter Notebook, as well as describe all of the tasks and operations that the user should be able to do with this design, as well as how our design will look visually.

## Personas

### Ricardo Godfrey

- Male 25, Full Stack Engineer

- Uses single notebook to explain a very specific topic or teach people something

  - Done with charts, graphs, tables (Matplotlib and Pandas), live code, images integrated in text

### Krista

- Female 40, Engineering Professor

- Uses the Jupyter notebooks to teach her entire college courses

  - Done with Matplotlib graphs, & embeds in notebook, live code

## Other Solutions

- Making the whole experience more visual, using GIFs to show firsthand what you can do with Jupyter Lab

  - Show that you can drag and drop tabs to rearrange, etc.

- Outline the differences between Notebook and Lab to help users who are familiar with the former better understand the latter

  - Side-by-side GIFs showing some differences

## User Tasks

Users should be able to:

- Learn how to get started using JupyterLab ("Scroll through tutorial")

  - _Mouse: Scrolling_

  - _UI: Clicking side pagination_

  - _UI: Clicking "continue" arrow_

  - _Keyboard: Arrow keys_

  - _Keyboard: Numbers_

- Easily close the page if they don’t need it

  - _Mouse: Click to close_

- Show users (with visual animation) how to perform JupyterLab actions

  - i.e. Click and drag window tabs to move and split windows

- Not be intimidated by too many words ("About" should not feel like a commitment)

- Have an **overview** of tutorial contents on "Page 1" before scrolling

- Read/Take action at the end (similar to launcher)

  - _UI: Clicking Action_

- Have a short description of JupyterLab capabilities

## Visual Design

### Layout

The new About plugin will feature a cleaner layout, with different "slides" that guide the user through the different features and actions of JupyterLab. These slides can be scrolled through like any website, but each section is automatically formatted to fit the viewport (we will be creating a framework similar to—if not using parts of—[fullpage.js](https://alvarotrigo.com/fullPage/)). We will be implementing the use of images and animations per slide to help users understand each new “feature” of JupyterLab better, and to understand how to use it.

The title slide will contain the JupyterLab logo near the top, and welcome text underneath to make the user feel at home, and to explain the current release of their JupyterLab version. After this, we’re hoping to include an overview of the "features" (i.e. Main Area, Command Palette, File Browser, etc.), by giving each feature an icon and description. This can be clicked and will ultimately be linked to that feature’s slide.

After the title slide, there will be a few more slides for each feature. Each slide will have a mini icon and title for the feature, an animated image (\_.gif or \_.gifv file) showing the user process of the feature, and a more in-depth description of the "feature".

The final slide will give the user the ability to start working with a Notebook, Console, and/or Terminal—very similar to the Launcher plugin—acting as a Call-to-Action for the user to start using JupyterLab.

Each slide will have a downwards arrow (" ╲╱ ") at the bottom of the viewport to encourage the user to continue learning about the features of JupyterLab, as well as a fixed slide pagination on the right side of the window, to help the user understand which slide they’re on and what slides are available to them.

### Typography

The About plugin will use similar Typography (Helvetica Neue, sans-serif typeface) to keep the design consistent with the rest of JupyterLab (and Jupyter as a whole). The only change to this would be the official Jupyter font in the logo (Myriad Pro typeface), but this is in an image, and will not require outside font assets.

We will continue brainstorming to determine if this choice is the most engaging for the About plugin.

### Colors

We are still discussing which choices of color would be the most effective at engaging users to learn more about the project of JupyterLab and the features of it. The About plugin will most likely feature a simple, light-themed color palette, to communicate ideas easily and pair with the theme of JupyterLab.

We will continue brainstorming and developing design renditions to determine if this choice is the most engaging for the About plugin.

### Motion

The About Plugin will feature an interactive guide for the user to scroll through. Motion will be reflected with the scrolling, slide transitions, which helps the user understand where the About content is going, and where to get more About content.

Motion will also be implemented in our animations for each feature, using a moving image format (\_.gif or \_.gifv file) of a UX demonstration of a real screen, to show users not only where and what each feature looks like, but also how to actually use each feature in real time.

---

Please let our team know if you have any questions, suggestions, or comments about the design of the About plugin. Thank you!
