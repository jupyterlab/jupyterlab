% Copyright (c) Jupyter Development Team.

% Distributed under the terms of the Modified BSD License.

(extension-tutorial)=

# Extension Tutorial

JupyterLab extensions add features to the user experience. This page
describes how to create one type of extension, an _application plugin_,
that:

- Adds a "Random [Astronomy Picture](https://apod.nasa.gov/apod/astropix.html)" command to the
  _command palette_ sidebar
- Fetches the image and metadata when activated
- Shows the image and metadata in a tab panel

By working through this tutorial, you'll learn:

- How to set up an extension development environment from scratch on a
  Linux or OSX machine. (You'll need to modify the commands slightly if you are on Windows.)
- How to start an extension project from
  [jupyterlab/extension-template](https://github.com/jupyterlab/extension-template)
- How to iteratively code, build, and load your extension in JupyterLab
- How to version control your work with git
- How to release your extension for others to enjoy

:::{figure} images/extension_tutorial_complete.png
:align: center
:alt: The completed extension, showing the Astronomy Picture of the Day for 24 Jul
: 2015.
:class: jp-screenshot

The completed extension, showing the [Astronomy Picture of the Day for 24 Jul 2015](https://apod.nasa.gov/apod/ap150724.html).
:::

:::{note}
Prefer trying the tutorial in the browser first?

- [Step 0: Template baseline][apod-playground-00]
- [Step 1: Show a panel][apod-playground-01]
- [Step 2: Show an image][apod-playground-02]
- [Step 3: Style and attribution][apod-playground-03]
- [Step 4: Refactor and refresh][apod-playground-04]
- [Step 5: Restore panel state (final tutorial state)][apod-playground-05]

After opening a step, run `Load Current File As Extension` from the command palette.
You can also launch the playground on Binder:
[Lab](https://mybinder.org/v2/gh/jupyterlab/plugin-playground/main?urlpath=lab),
[Notebook v7](https://mybinder.org/v2/gh/jupyterlab/plugin-playground/main?urlpath=tree).
:::

```{raw} html
<div class="jp-plugin-playground-embed">
  <p class="jp-plugin-playground-description">
    Interactive example for the final APOD tutorial state.
  </p>
  <div class="jp-plugin-playground-actions">
    <button type="button" class="jp-plugin-playground-load">
      Load Interactive Example
    </button>
    <a class="jp-plugin-playground-open" href="https://jupyterlab-plugin-playground.readthedocs.io/en/latest/lite/lab/index.html?plugin=1.g.H4sIAAAAAAAAE51XbW_bNhD-K6xRTHLqyM0-KnE2L87WbE0TNAGGYh0SVjrbbCRSJakkXur_vuObXux4LVYEqEwej8-9PXd8GtyDVEzwQXowGsxZAe9oCYN0wHgOj4lWg9FAiVpmdq2shNTk6SMn5OwtXYlavwelhQQ5Mmu_19VKg_xVCq5Pef7c2mVRLxj_yNdkLkVJop8_u_2CfhrTqipYRjWiiQ4_olDvvhNRlhQV0AK0Bqv7nDI-lUD_ZPkCtF1yn9eSZncgd15Ta1ao_h3-JGlOFHXJuBg_2OUgzFHHnGZAppcXM7S9ElyBA5iJaiXZYqlTorRkfHFoVnOqobcAj1VBuTWyt15CzuiNXlUoHt2zHEREvpKIlXQBkZXQTBd9XbUsOr_XFmJWUKUsPG8QPGrguQr2WazjvT3z3x45Qfxa1pkmlHB4sOeIMzmxEmNnmpcSMh46DYSougL8aS81v_WSqYTm-YkBEEflap9WIne3Rq3YeEymeU4oJ9Y0AgWUwDXRAjUAqSiHoqOQlQsyIbnIaiOVZBhtDafuTIzeWVjVjTgXOSQYYLT4ZMmKPA5KtgGgAZhQcvUtBEFsN4rqezB4NU5y7cA0YbjGe_vuQB-KjOEtOYZDLy2yrbggjFzwYoVnFyl5c33-9swo8cAOn7kkGKMxK_7nXV6Fu--SSrqQtFruuPMNVmwBpK5MHaCOLzXyhSJzIZ-_haoVz7y4yUVrTzxMySUWJVNwdC9YfmxS0DncZibq9YU4IfSBMk3moLNlfLvUulLpGCueJZwqmizE_diUH2i0YGzy8yfcu7mD1WR2en5x88fphx_M1ZOXTzZoEuGLcoYr8XB92-YQm5P4Rbg1EXdNUQREqIQ2aBrBz0rwOOSK02IEE5BSyI6OfuYljHOQ1yZiE9LKJyUohd5p1K0xoIGMvqGlQaQ01bUyq62a8CFB15L79XXf4_9lHwaxR489r1n8LdeRyWQSSK7jAKzRS1HVhUkaHWojbIaSTpTMgkeQCQ-39i1hBgn7oy-z07992QZ2w_DfE6pXE3JL4pNwhLx86utYD283Xb4ZwJ0go_c2Lx1b21w3pYtu50I3zJpEbei2Gec3MJTv8ts2Kd9HCOPkA_7bPz_fn81MoZa0RwOdigi9JyB2qYEpJQ1I006s3I-vD16PyAH-hdR3gsiPXbH-ZntPV8bqTkyDZyWeIK9wBNBLX6bxcC9GnZ3tfbJxYBgucbnduSXR4uzq4sraEw8ThYMIxAb264axrQutA_fINNPsPmRnp2m6bmvmKfSZ8di85pnp9YT6EzF2hnRrUsKuY8eadGvOMdVlJ6x0c-TC8YDXRTEM4wdXooCkEIs48urf0k8tINKOQDeG-QhTDaj8RdOhsfRmgEOEBMwPb9Q9lYx-KmwFIiq_nG7MX0ft0HHcKvPNvjPbIVRrYTNZhIUmnzDDDcJUYA91WYzHEy_lhgz3Hfu1UUhBNA5wJmoKBBUKLsoVuWQZRhyikZODR8hq427MkslxW3KW2L3VX7-G_sTUjCGXKch7lR_A41DIQ8a3PugQPQmOdDJ9t8VPXsN6-0DC8uCM_TZ80bacZazEWm8ObNu960hWCGVCi6dwwoPtLmA9ot08nSypit3xYc8TGGc7cttyMD0FiJh3Orxt-IbNpU9nmwgdDvX6MbJB_w4kTUSmWlPDe5s43Hr3bj_Xleh18iDkHcHcpkYb05GjTNyW0GoxyaaWUBQdPCMSGQXRM7g8JB_FZGt4afqfw9dlDnc07Hbu9UK_rM4CAEyFYY_Qh_0aM-p8NbSTrKUQy97hGy0601DGT6QpHaxKWAgz0UXXNcaG0SLqqXehNYo9F3W9a6MdiMHH0ed57y12tJssjmMfQo5PT1Xh8yp1OR81hrroBypsYh4WEv8RewCj7jzmzAy_zR2h7NtLmmt6PI998owzjQ5h_zjqsnNPmF43CbXL_bZdOoKo7JN3i_PdS9gPtBMHmCEHRq1a-4JylJWDyiSr3LMxulqKh7Z9v5teTbepLlTgjK5MU6ek0xTsGydxminG_Mq0ydQywMgN-19qhj5NyV8b_ehvuy8sEFqY_X5Tcvshf9PmKzxP8flrnts5zGldBN_gzmD9L3Xs4XiKEAAA" target="_blank" rel="noopener noreferrer">
      Open in new tab
    </a>
  </div>
  <div class="jp-plugin-playground-frame" hidden>
    <iframe
      class="jp-plugin-playground-iframe"
      title="JupyterLab extension tutorial interactive example"
      loading="lazy"
      referrerpolicy="no-referrer"
      allow="clipboard-read; clipboard-write"
    ></iframe>
  </div>
</div>
```

Sound like fun? Excellent. Here we go!

## Set up a development environment

### Install conda using miniconda

Start by installing miniconda, following
[Conda's installation documentation](https://docs.conda.io/projects/conda/en/latest/user-guide/install/index.html).

(install-nodejs-jupyterlab-etc-in-a-conda-environment)=

### Install NodeJS, JupyterLab, etc. in a conda environment

Next create a conda environment that includes:

1. The latest release of JupyterLab
2. [copier](https://copier.readthedocs.io) and some dependencies, the tool
   you'll use to bootstrap your extension project structure (this is a Python tool
   which we'll install using conda below).
3. [NodeJS](https://nodejs.org), the JavaScript runtime you'll use to
   compile the web assets (e.g., TypeScript, CSS) for your extension
4. [git](https://git-scm.com), a version control system you'll use to
   take snapshots of your work as you progress through this tutorial

It's a best practice to leave the root conda environment (i.e., the environment created
by the miniconda installer) untouched and install your project-specific
dependencies in a named conda environment. Run this command to create a
new environment named `jupyterlab-ext`.

```bash
conda create -n jupyterlab-ext --override-channels --strict-channel-priority -c conda-forge -c nodefaults jupyterlab=4 nodejs=20 git copier=9 jinja2-time --yes
```

Now activate the new environment so that all further commands you run
work out of that environment.

```bash
conda activate jupyterlab-ext
```

Note: You'll need to run the command above in each new terminal you open
before you can work with the tools you installed in the
`jupyterlab-ext` environment.

## Create a repository

Create a new repository for your extension (see, for example, the
[GitHub instructions](https://docs.github.com/en/get-started/quickstart/create-a-repo)). This is an
optional step, but highly recommended if you want to share your
extension.

## Create an extension project

### Initialize the project from the template

Next use copier to create a new project for your extension.
This will create a new folder for your extension in your current directory.

```bash
mkdir my_first_extension
cd my_first_extension
copier copy --trust https://github.com/jupyterlab/extension-template .
```

When prompted, enter values like the following for all of the template
prompts (`apod` stands for Astronomy Picture of the Day, the NASA service we
are using to fetch pictures).

```bash
What is your extension kind?
(Use arrow keys)
 frontend
Extension author name
 Your Name
Extension author email
 your@name.org
JavaScript package name
 jupyterlab_apod
Python package name
 jupyterlab_apod
Extension short description
 Show a random NASA Astronomy Picture of the Day in a JupyterLab panel
Does the extension have user settings?
 N
Do you want to set up Binder example?
 Y
Do you want to set up test for the extension?
 Y
Git remote repository URL
 https://github.com/github_username/jupyterlab_apod
```

:::{note}

- If you are not using a repository, leave the repository field blank. You can come back and edit the repository field in the `package.json` file later.
- If you are using the latest version of the template, you will notice that tests are included in the template. If you don't want to include them just answer `n` to the test prompt.
  :::

List the files.

```shell
ls -a
```

You should see a list like the following.

```
.copier-answers.yml  .github          .gitignore      .prettierignore     .yarnrc.yml
babel.config.js      jest.config.js   pyproject.toml  src                 ui-tests
binder               jupyterlab_apod  README.md       style               yarn.lock
CHANGELOG.md         LICENSE          RELEASE.md      tsconfig.json
install.json         package.json     setup.py        tsconfig.test.json
```

### Commit what you have to git

Run the following commands in your `jupyterlab_apod` folder to
initialize it as a git repository and commit the current code.

```bash
git init
git add .
git commit -m 'Seed apod project from extension template'
```

You can also open this seed state in [Plugin Playground][apod-playground-00].

:::{note}
This step is not technically necessary, but it is good practice to
track changes in version control system in case you need to rollback to
an earlier version or want to collaborate with others. You
can compare your work throughout this tutorial with the commits in a
reference version of `jupyterlab_apod` on GitHub at
<https://github.com/jupyterlab/jupyterlab_apod>.
:::

### Build and install the extension for development

Your new extension project has enough code in it to see it working in your
JupyterLab. Run the following commands to install the initial project
dependencies and install the extension into the JupyterLab environment.

```bash
pip install -ve .
```

The above command copies the frontend part of the extension into JupyterLab.
We can run this `pip install` command again every time we make a change to
copy the change into JupyterLab. Even better, we can use
the `develop` command to create a symbolic link from JupyterLab to our
source directory. This means our changes are automatically available in
JupyterLab:

```bash
jupyter labextension develop --overwrite .
```

(important-for-windows-users)=

### Important for Windows users

:::{important}
On Windows, symbolic links need to be activated on Windows 10 or above for Python version 3.8 or higher
by activating the 'Developer Mode'. That may not be allowed by your administrators.
See [Activate Developer Mode on Windows](https://docs.microsoft.com/en-us/windows/apps/get-started/enable-your-device-for-development)
for instructions.
:::

% Note: The same important section is present in the developer/contributing.md section too. If you modify it here, ensure to update it there as well.

### See the initial extension in action

After the install completes, open a second terminal. Run these commands to
activate the `jupyterlab-ext` environment and start JupyterLab in your
default web browser.

```bash
conda activate jupyterlab-ext
jupyter lab
```

In that browser window, open the JavaScript console
by following the instructions for your browser:

- [Accessing the DevTools in Google
  Chrome](https://developer.chrome.com/devtools#access)
- [Opening the Web Console in
  Firefox](https://developer.mozilla.org/en-US/docs/Tools/Web_Console/Opening_the_Web_Console)

After you reload the page with the console open, you should see a message that says
`JupyterLab extension jupyterlab_apod is activated!` in the console.
If you do, congratulations, you're ready to start modifying the extension!
If not, go back make sure you didn't miss a step, and [reach
out](https://github.com/jupyterlab/jupyterlab/blob/main/README.md#getting-help) if you're stuck.

:::{note}
Leave the terminal running the `jupyter lab` command open and running
JupyterLab to see the effects of changes below.
:::

## Add an Astronomy Picture of the Day widget

### Show an empty panel

The _command palette_ is the primary view of all commands available to
you in JupyterLab. For your first addition, you're going to add a
_Random Astronomy Picture_ command to the palette and get it to show an _Astronomy Picture_
tab panel when invoked.

Fire up your favorite text editor and open the `src/index.ts` file in your
extension project. Change the import at the top of the file to get a reference
to the command palette interface and the `JupyterFrontEnd` instance.

```{code-block} typescript
:emphasize-lines: 6

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ICommandPalette } from '@jupyterlab/apputils';
```

Locate the `plugin` object of type {ts:type}`application.JupyterFrontEndPlugin`.
Change the definition so that it reads like so:

```{code-block} typescript
:emphasize-lines: 5,8-9,11

/**
 * Initialization data for the jupyterlab_apod extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-apod',
  description: 'Show a random NASA Astronomy Picture of the Day in a JupyterLab panel.',
  autoStart: true,
  requires: [ICommandPalette],
  activate: (app: JupyterFrontEnd, palette: ICommandPalette) => {
    console.log('JupyterLab extension jupyterlab_apod is activated!');
    console.log('ICommandPalette:', palette);
  }
};
```

The `requires` attribute states that your plugin needs an object that
implements the {ts:interface}`apputils.ICommandPalette` interface when it starts. JupyterLab
will pass an instance of `apputils.ICommandPalette` as the second parameter of
`activate` in order to satisfy this requirement. Defining
`palette: ICommandPalette` makes this instance available to your code
in that function. The second `console.log` line exists only so that
you can immediately check that your changes work.

Now you will need to install these dependencies. Run the following commands in the
repository root folder to install the dependencies and save them to your
`package.json`:

```bash
jlpm add @jupyterlab/apputils @jupyterlab/application
```

Finally, run the following to rebuild your extension.

```bash
jlpm run build
```

:::{note}
This tutorial uses `jlpm` to install Javascript packages and
run build commands, which is JupyterLab's bundled
version of `yarn`. If you prefer, you can use another Javascript
package manager like `npm` or `yarn` itself.
:::

After the extension build finishes, return to the browser tab that opened when
you started JupyterLab. Refresh it and look in the console. You should see the
same activation message as before, plus the new message about the
ICommandPalette instance you just added. If you don't, check the output of the
build command for errors and correct your code.

```
JupyterLab extension jupyterlab_apod is activated!
ICommandPalette: Palette {_palette: CommandPalette}
```

Note that we had to run `jlpm run build` in order for the bundle to
update. This command does two things: compiles the TypeScript files in `` src/` ``
into JavaScript files in `lib/` (`jlpm run build`), then bundles the
JavaScript files in `lib/` into a JupyterLab extension in
`jupyterlab_apod/static` (`jlpm run build:extension`). If you wish to avoid
running `jlpm run build` after each change, you can open a third terminal,
activate the `jupyterlab-ext` environment, and run the `jlpm run watch`
command from your extension directory, which will automatically compile the
TypeScript files as they are changed and saved.

Now return to your editor. Modify the imports at the top of the file to add a
few more imports:

```{code-block} typescript
:emphasize-lines: 1, 3

import { ICommandPalette, MainAreaWidget } from '@jupyterlab/apputils';

import { Widget } from '@lumino/widgets';
```

Install this new dependency as well:

```bash
jlpm add @lumino/widgets
```

Then modify the `activate` function inside the plugin object again so that
it has the following code _(the highlighted lines show the activate function, you're
only modifying the contents of that function, so make sure your braces match,
and leave the_ `export default plugin` _part lower down intact)_:

```{code-block} typescript
:emphasize-lines: 6-42

const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-apod',
  description: 'Show a random NASA Astronomy Picture of the Day in a JupyterLab panel.',
  autoStart: true,
  requires: [ICommandPalette],
  activate: (app: JupyterFrontEnd, palette: ICommandPalette) => {
    console.log('JupyterLab extension jupyterlab_apod is activated!');

    // Define a widget creator function,
    // then call it to make a new widget
    const newWidget = () => {
      // Create a blank content widget inside of a MainAreaWidget
      const content = new Widget();
      const widget = new MainAreaWidget({ content });
      widget.id = 'apod-jupyterlab';
      widget.title.label = 'Astronomy Picture';
      widget.title.closable = true;
      return widget;
    }
    let widget = newWidget();

    // Add an application command
    const command: string = 'apod:open';
    app.commands.addCommand(command, {
      label: 'Random Astronomy Picture',
      execute: () => {
        // Regenerate the widget if disposed
        if (widget.isDisposed) {
          widget = newWidget();
        }
        if (!widget.isAttached) {
          // Attach the widget to the main work area if it's not there
          app.shell.add(widget, 'main');
        }
        // Activate the widget
        app.shell.activateById(widget.id);
      }
    });

    // Add the command to the palette.
    palette.addItem({ command, category: 'Tutorial' });
  }
};

export default plugin;
```

The first new block of code defines (and calls) a reusable widget creator
function. That function returns a `MainAreaWidget` instance that has an
empty content `Widget` as its child. It also assigns the main area widget a
unique ID, gives it a label that will appear as its tab title, and makes the
tab closable by the user. The second block of code adds a new command with id
`apod:open` and label _Random Astronomy Picture_ to JupyterLab. When the
command executes, it checks that the widget isn't disposed, attaches the widget
to the main display area if it is not already present and then makes it the
active tab. The last new line of code uses the command id to add the command
to the command palette in a section called _Tutorial_.

Build your extension again using `jlpm run build` (unless you are using
`jlpm run watch` already) and refresh the browser tab. Open the command
palette by clicking on _Commands_ from the View menu or using the keyboard
shortcut `Command/Ctrl Shift C` and type _Astronomy_ in the search box. Your
_Random Astronomy Picture_ command should appear. Click it or select it with
the keyboard and press _Enter_. You should see a new, blank panel appear with
the tab title _Astronomy Picture_. Click the _x_ on the tab to close it and
activate the command again. The tab should reappear. Finally, click one of the
launcher tabs so that the _Astronomy Picture_ panel is still open but no
longer active. Now run the _Random Astronomy Picture_ command one more time.
The single _Astronomy Picture_ tab should come to the foreground.

:::{figure} images/extension_tutorial_empty.png
:align: center
:alt: The in-progress extension, showing a blank panel.
:class: jp-screenshot

The in-progress extension, showing a blank panel.
:::

If your widget is not behaving, compare your code with the reference
project state at the [01-show-a-panel
tag](https://github.com/jupyterlab/jupyterlab_apod/tree/4.0-01-show-a-panel).
You can also open this state in [Plugin Playground][apod-playground-01].
Once you've got everything working properly, git commit your changes and
carry on.

```bash
git add package.json src/index.ts
git commit -m 'Show Astronomy Picture command in palette'
```

### Show a picture in the panel

You now have an empty panel. It's time to add a picture to it. Go back to
your code editor. Add the following code in the widget creator function below
the lines that create a `MainAreaWidget` instance and above the line that
returns the new widget.

```typescript
// Add an image element to the content
let img = document.createElement('img');
content.node.appendChild(img);

// Get a random date string in YYYY-MM-DD format
function randomDate() {
  const start = new Date(2010, 1, 1);
  const end = new Date();
  const randomDate = new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
  return randomDate.toISOString().slice(0, 10);
}

// Fetch info about a random picture
const response = await fetch(
  `https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY&date=${randomDate()}`
);
const data = (await response.json()) as APODResponse;

if (data.media_type === 'image') {
  // Populate the image
  img.src = data.url;
  img.title = data.title;
} else {
  console.log('Random APOD was not a picture.');
}
```

The first two lines create a new HTML `<img>` element and add it to
the widget DOM node. The next lines define a function get a random date in the form `YYYY-MM-DD` format, and then the function is used to make a request using the HTML
[fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)
API that returns information about the Astronomy Picture of the Day for that date. Finally, we set the
image source and title attributes based on the response.

Now define the `APODResponse` type that was introduced in the code above. Put
this definition just under the imports at the top of the file.

```typescript
interface APODResponse {
  copyright: string;
  date: string;
  explanation: string;
  media_type: 'video' | 'image';
  title: string;
  url: string;
}
```

Then we need to add `async` and `await` to a few places in our code since
we're using `await` in our widget creator function.

First, update the `activate` method to be `async`:

```typescript
activate: async (app: JupyterFrontEnd, palette: ICommandPalette) => {
```

Next, update the `newWidget` function to be `async`:

```typescript
const newWidget = async () => {
```

Finally, add `await` to both of the `newWidget` function calls, and
`async` to the execute function:

```{code-block} typescript
:emphasize-lines: 1,7,10

  let widget = await newWidget();

  // Add an application command
  const command: string = 'apod:open';
  app.commands.addCommand(command, {
    label: 'Random Astronomy Picture',
    execute: async () => {
      // Regenerate the widget if disposed
      if (widget.isDisposed) {
        widget = await newWidget();
      }
      if (!widget.isAttached) {
        // Attach the widget to the main work area if it's not there
        app.shell.add(widget, 'main');
      }
      // Activate the widget
      app.shell.activateById(widget.id);
    }
  });
```

:::{note}
If you are new to JavaScript / TypeScript and want to learn more about `async`, `await`,
and `Promises`, you can check out the following [tutorial on MDN](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous/Promises)

Be sure to also refer to the other resources in the
[See Also](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous/Promises#see_also)
section for more materials.
:::

Rebuild your extension if necessary (`jlpm run build`), refresh your browser
tab, and run the _Random Astronomy Picture_ command again. You should now see a
picture in the panel when it opens (if that random date had a picture and not a
video).

:::{figure} images/extension_tutorial_single.png
:align: center
:class: jp-screenshot

The in-progress extension, showing the [Astronomy Picture of the Day for 19 Jan 2014](https://apod.nasa.gov/apod/ap140119.html).
:::

Note that the image is not centered in the panel nor does the panel
scroll if the image is larger than the panel area. You'll address both
of these problems in the upcoming sections.

If you don't see a image at all, compare your code with the
[02-show-an-image
tag](https://github.com/jupyterlab/jupyterlab_apod/tree/4.0-02-show-an-image)
in the reference project. You can also open this state in
[Plugin Playground][apod-playground-02]. When it's working, make another git
commit.

```bash
git add src/index.ts
git commit -m 'Show a picture in the panel'
```

## Improve the widget behavior

### Center the image, add attribution, and error messaging

Open `style/base.css` in our extension project directory for editing.
Add the following lines to it.

```css
.my-apodWidget {
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: auto;
}
```

This CSS stacks content vertically within the widget panel and lets the panel
scroll when the content overflows. This CSS file is included on the page
automatically by JupyterLab because the `package.json` file has a `style`
field pointing to it. In general, you should import all of your styles into a
single CSS file, such as this `index.css` file, and put the path to that CSS
file in the `package.json` file `style` field.

Return to the `index.ts` file. Modify the `activate` function to apply the
CSS classes, the copyright information, and error handling for the API response.
You will be updating and replacing/removing some lines, so the beginning of the
function should read like the following:

```{code-block} typescript
:emphasize-lines: 9,19-20,32-53

activate: async (app: JupyterFrontEnd, palette: ICommandPalette) => {
  console.log('JupyterLab extension jupyterlab_apod is activated!');

  // Define a widget creator function,
  // then call it to make a new widget
  const newWidget = async () => {
    // Create a blank content widget inside of a MainAreaWidget
    const content = new Widget();
    content.addClass('my-apodWidget');
    const widget = new MainAreaWidget({ content });
    widget.id = 'apod-jupyterlab';
    widget.title.label = 'Astronomy Picture';
    widget.title.closable = true;

    // Add an image element to the content
    let img = document.createElement('img');
    content.node.appendChild(img);

    let summary = document.createElement('p');
    content.node.appendChild(summary);

    // Get a random date string in YYYY-MM-DD format
    function randomDate() {
      const start = new Date(2010, 1, 1);
      const end = new Date();
      const randomDate = new Date(start.getTime() + Math.random()*(end.getTime() - start.getTime()));
      return randomDate.toISOString().slice(0, 10);
    }

    // Fetch info about a random picture
    const response = await fetch(`https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY&date=${randomDate()}`);
    if (!response.ok) {
      const data = await response.json();
      if (data.error) {
        summary.innerText = data.error.message;
      } else {
        summary.innerText = response.statusText;
      }
    } else {
      const data = await response.json() as APODResponse;

      if (data.media_type === 'image') {
        // Populate the image
        img.src = data.url;
        img.title = data.title;
        summary.innerText = data.title;
        if (data.copyright) {
          summary.innerText += ` (Copyright ${data.copyright})`;
        }
      } else {
        summary.innerText = 'Random APOD fetched was not an image.';
      }
    }

    return widget;
  }
  // Keep all the remaining lines below the newWidget function
  // definition the same as before from here down ...
```

:::{note}
If your image panel keeps showing an error message, you may need to update
your NASA API Key (too many image requests can max out your limit)
:::

Build your extension if necessary (`jlpm run build`) and refresh your
JupyterLab browser tab. Invoke the _Random Astronomy Picture_ command and
confirm the image is centered with the copyright information below it. Resize
the browser window or the panel so that the image is larger than the
available area. Make sure you can scroll the panel over the entire area
of the image.

If anything is not working correctly, compare your code with the reference project
[03-style-and-attribute
tag](https://github.com/jupyterlab/jupyterlab_apod/tree/4.0-03-style-and-attribute).
You can also open this state in [Plugin Playground][apod-playground-03].
When everything is working as expected, make another commit.

```bash
git add style/base.css src/index.ts
git commit -m 'Add styling, attribution, error handling'
```

### Show a new image on demand

The `activate` function has grown quite long, and there's still more
functionality to add. Let's refactor the code into two separate
parts:

1. An `APODWidget` that encapsulates the Astronomy Picture panel elements,
   configuration, and soon-to-be-added update behavior
2. An `activate` function that adds the widget instance to the UI and
   decide when the picture should refresh

Start by refactoring the widget code into the new `APODWidget` class.

Add the class just below the definition of `APODResponse` in the `index.ts`
file.

```typescript
class APODWidget extends Widget {
  /**
   * Construct a new APOD widget.
   */
  constructor() {
    super();

    this.addClass('my-apodWidget');

    // Add an image element to the panel
    this.img = document.createElement('img');
    this.node.appendChild(this.img);

    // Add a summary element to the panel
    this.summary = document.createElement('p');
    this.node.appendChild(this.summary);
  }

  /**
   * The image element associated with the widget.
   */
  readonly img: HTMLImageElement;

  /**
   * The summary text element associated with the widget.
   */
  readonly summary: HTMLParagraphElement;

  /**
   * Handle update requests for the widget.
   */
  async updateAPODImage(): Promise<void> {
    const response = await fetch(
      `https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY&date=${this.randomDate()}`
    );

    if (!response.ok) {
      const data = await response.json();
      if (data.error) {
        this.summary.innerText = data.error.message;
      } else {
        this.summary.innerText = response.statusText;
      }
      return;
    }

    const data = (await response.json()) as APODResponse;

    if (data.media_type === 'image') {
      // Populate the image
      this.img.src = data.url;
      this.img.title = data.title;
      this.summary.innerText = data.title;
      if (data.copyright) {
        this.summary.innerText += ` (Copyright ${data.copyright})`;
      }
    } else {
      this.summary.innerText = 'Random APOD fetched was not an image.';
    }
  }

  /**
   * Get a random date string in YYYY-MM-DD format.
   */
  randomDate(): string {
    const start = new Date(2010, 1, 1);
    const end = new Date();
    const randomDate = new Date(
      start.getTime() + Math.random() * (end.getTime() - start.getTime())
    );
    return randomDate.toISOString().slice(0, 10);
  }
}
```

You've written all of the code before. All you've done is restructure it
to use instance variables and move the image request to its own
function.

Next move the remaining logic in `activate` to a new, top-level
function just below the `APODWidget` class definition. Modify the code
to create a widget when one does not exist in the main JupyterLab area
or to refresh the image in the existing widget when the command runs again.
The code for the `activate` function should read as follows after
these changes:

```typescript
/**
 * Activate the APOD widget extension.
 */
function activate(app: JupyterFrontEnd, palette: ICommandPalette) {
  console.log('JupyterLab extension jupyterlab_apod is activated!');

  // Define a widget creator function
  const newWidget = () => {
    const content = new APODWidget();
    const widget = new MainAreaWidget({ content });
    widget.id = 'apod-jupyterlab';
    widget.title.label = 'Astronomy Picture';
    widget.title.closable = true;
    return widget;
  };

  // Create a single widget
  let widget = newWidget();

  // Add an application command
  const command: string = 'apod:open';
  app.commands.addCommand(command, {
    label: 'Random Astronomy Picture',
    execute: () => {
      // Regenerate the widget if disposed
      if (widget.isDisposed) {
        widget = newWidget();
      }
      if (!widget.isAttached) {
        // Attach the widget to the main work area if it's not there
        app.shell.add(widget, 'main');
      }
      // Refresh the picture in the widget
      widget.content.updateAPODImage();
      // Activate the widget
      app.shell.activateById(widget.id);
    }
  });

  // Add the command to the palette.
  palette.addItem({ command, category: 'Tutorial' });
}
```

Remove the `activate` function definition from the
`JupyterFrontEndPlugin` object and refer instead to the top-level function
like this:

```typescript
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab_apod',
  autoStart: true,
  requires: [ICommandPalette],
  activate: activate
};
```

Make sure you retain the `export default plugin;` line in the file.
Now build the extension again and refresh the JupyterLab browser tab.
Run the _Random Astronomy Picture_ command more than once without closing the
panel. The picture should update each time you execute the command. Close
the panel, run the command, and it should both reappear and show a new
image.

If anything is not working correctly, compare your code with the
[04-refactor-and-refresh
tag](https://github.com/jupyterlab/jupyterlab_apod/tree/4.0-04-refactor-and-refresh).
You can also open this state in [Plugin Playground][apod-playground-04]
to debug. Once it is working properly, commit it.

```bash
git add src/index.ts
git commit -m 'Refactor, refresh image'
```

### Restore panel state when the browser refreshes

You may notice that every time you refresh your browser tab, the Astronomy Picture
panel disappears, even if it was open before you refreshed. Other open
panels, like notebooks, terminals, and text editors, all reappear and
return to where you left them in the panel layout. You can make your
extension behave this way too.

Update the imports at the top of your `index.ts` file so that the
entire list of import statements looks like the following (Adding
{ts:interface}`application.ILayoutRestorer` and {ts:class}`apputils.WidgetTracker`):

```{code-block} typescript
:emphasize-lines: 2,7-11

import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette,
  MainAreaWidget,
  WidgetTracker
} from '@jupyterlab/apputils';

import { Widget } from '@lumino/widgets';
```

Then add the `ILayoutRestorer` interface to the `JupyterFrontEndPlugin`
definition as `optional`. This addition passes the global `LayoutRestorer` as the
third parameter of the `activate` function.

```{code-block} typescript
:emphasize-lines: 6

const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-apod',
  description: 'Show a random NASA Astronomy Picture of the Day in a JupyterLab panel.',
  autoStart: true,
  requires: [ICommandPalette],
  optional: [ILayoutRestorer],
  activate: activate
};
```

Here `ILayoutRestorer` is specified as an `optional` token, as the corresponding service might
not be available in a customized JupyterLab distribution that does not provide layout restoration
functionalities. Having it `optional` make it a nice to have, and enable your extension to be loaded
in more JupyterLab based applications.

:::{note}
You can learn more about `requires` and `optional` in the {ref}`tokens` section
of the Extension Developer Guide.
:::

Finally, rewrite the `activate` function so that it:

1. Declares a widget variable, but does not create an instance
   immediately.
2. Adds the global `LayoutRestorer` as the third parameter of the `activate` function.
   This parameter is declared as `ILayoutRestorer | null` since the token is specified as `optional`.
3. Constructs a `WidgetTracker` and tells the `ILayoutRestorer`
   to use it to save/restore panel state.
4. Creates, tracks, shows, and refreshes the widget panel appropriately.

```typescript
function activate(
  app: JupyterFrontEnd,
  palette: ICommandPalette,
  restorer: ILayoutRestorer | null
) {
  console.log('JupyterLab extension jupyterlab_apod is activated!');

  // Declare a widget variable
  let widget: MainAreaWidget<APODWidget>;

  // Add an application command
  const command: string = 'apod:open';
  app.commands.addCommand(command, {
    label: 'Random Astronomy Picture',
    execute: () => {
      if (!widget || widget.isDisposed) {
        const content = new APODWidget();
        widget = new MainAreaWidget({ content });
        widget.id = 'apod-jupyterlab';
        widget.title.label = 'Astronomy Picture';
        widget.title.closable = true;
      }
      if (!tracker.has(widget)) {
        // Track the state of the widget for later restoration
        tracker.add(widget);
      }
      if (!widget.isAttached) {
        // Attach the widget to the main work area if it's not there
        app.shell.add(widget, 'main');
      }
      widget.content.updateAPODImage();

      // Activate the widget
      app.shell.activateById(widget.id);
    }
  });

  // Add the command to the palette.
  palette.addItem({ command, category: 'Tutorial' });

  // Track and restore the widget state
  let tracker = new WidgetTracker<MainAreaWidget<APODWidget>>({
    namespace: 'apod'
  });
  if (restorer) {
    restorer.restore(tracker, {
      command,
      name: () => 'apod'
    });
  }
}
```

Rebuild your extension one last time and refresh your browser tab.
Execute the _Random Astronomy Picture_ command and validate that the panel
appears with an image in it. Refresh the browser tab again. You should
see an Astronomy Picture panel reappear immediately without running the command. Close
the panel and refresh the browser tab. You should then not see an Astronomy Picture tab
after the refresh.

:::{figure} images/extension_tutorial_complete.png
:align: center
:alt: The completed extension, showing the Astronomy Picture of the Day for 24 Jul
: 2015.
:class: jp-screenshot

The completed extension, showing the [Astronomy Picture of the Day for 24 Jul 2015](https://apod.nasa.gov/apod/ap150724.html).
:::

Refer to the [05-restore-panel-state
tag](https://github.com/jupyterlab/jupyterlab_apod/tree/4.0-05-restore-panel-state)
or open this state in [Plugin Playground][apod-playground-05]
if your extension is not working correctly. Make a commit when the state of your
extension persists properly.

```bash
git add src/index.ts
git commit -m 'Restore panel state'
```

Congratulations! You've implemented all of the behaviors laid out at the start
of this tutorial.

(packaging-your-extension)=

## Packaging your extension

JupyterLab extensions for JupyterLab 3.0 and above can be distributed as Python
packages. The extension template we used contains all of the Python
packaging instructions in the `pyproject.toml` file to wrap your extension in a
Python package. Before generating a package, we first need to install `build`.

```bash
pip install build
```

To create a Python source package (`.tar.gz`) in the `dist/` directory, do:

```bash
python -m build -s
```

To create a Python wheel package (`.whl`) in the `dist/` directory, do:

```bash
python -m build
```

Both of these commands will build the JavaScript into a bundle in the
`jupyterlab_apod/labextension/static` directory, which is then distributed with the
Python package. This bundle will include any necessary JavaScript dependencies
as well. You may want to check in the `jupyterlab_apod/labextension/static` directory to
retain a record of what JavaScript is distributed in your package, or you may
want to keep this "build artifact" out of your source repository history.

You can now try installing your extension as a user would. Open a new terminal
and run the following commands to create a new environment and install your
extension.

```bash
conda create -n jupyterlab-apod jupyterlab
conda activate jupyterlab-apod
pip install jupyterlab_apod/dist/jupyterlab_apod-0.1.0-py3-none-any.whl
jupyter lab
```

You should see a fresh JupyterLab browser tab appear. When it does,
execute the _Random Astronomy Picture_ command to check that your extension
works.

(extension-tutorial-publish)=

## Publishing your extension

You can publish your Python package to the [PyPI](https://pypi.org) or
[conda-forge](https://conda-forge.org) repositories so users can easily
install the extension using `pip` or `conda`.

You may want to also publish your extension as a JavaScript package to the
[npm](https://www.npmjs.com) package repository for several reasons:

1. Distributing an extension as an npm package allows users to compile the
   extension into JupyterLab explicitly (similar to how was done in JupyterLab
   versions 1 and 2), which leads to a more optimal JupyterLab package.
2. As we saw above, JupyterLab enables extensions to use services provided by
   other extensions. For example, our extension above uses the `ICommandPalette`
   and `ILayoutRestorer` services provided by core extensions in
   JupyterLab. We were able to tell JupyterLab we required these services by
   importing their tokens from the `@jupyterlab/apputils` and
   `@jupyterlab/application` npm packages and listing them in our plugin
   definition. If you want to provide a service to the JupyterLab system
   for other extensions to use, you will need to publish your JavaScript
   package to npm so other extensions can depend on it and import and require
   your token.

### Automated Releases

If you used the template to bootstrap your extension, the repository should already
be compatible with the [Jupyter Releaser](https://github.com/jupyter-server/jupyter_releaser).

The Jupyter Releaser provides a set of GitHub Actions Workflows to:

- Generate a new entry in the Changelog
- Draft a new release
- Publish the release to `PyPI` and `npm`

For more information on how to run the release workflows,
check out the documentation: <https://github.com/jupyter-server/jupyter_releaser>

## Learn more

You've completed the tutorial. Nicely done! If you want to keep
learning, here are some suggestions about what to try next:

- Add the image description that comes in the API response to the panel.
- Assign a default hotkey to the _Random Astronomy Picture_ command.
- Make the image a link to the picture on the NASA website (URLs are of the form `https://apod.nasa.gov/apod/apYYMMDD.html`).
- Make the image title and description update after the image loads so that the picture and description are always synced.
- Give users the ability to pin pictures in separate, permanent panels.
- Add a setting for the user to put in their [API key](https://api.nasa.gov/#authentication) so they can make many more requests per hour than the demo key allows.
- Push your extension git repository to GitHub.
- Learn how to write {ref}`other kinds of extensions <developer-extensions>`.

<!-- Plugin Playground URLs generated from jupyterlab/jupyterlab_apod 4.0 refs. -->

[apod-playground-00]: https://jupyterlab-plugin-playground.readthedocs.io/en/latest/lite/lab/index.html?plugin=1.g.H4sIAAz502kC_21R0WrCQBD8le29REUifY1VKrSFliKCr0JZcxvdcrk7LhurFf-9l6S1pfq6szM7M3tUOwoVO6uy26Eq2NAcS1KZYqtpn0qlhqpydcjbWeldEDiuLMBL7Q9C4Sk4K49WD6_MFqbesF3ZExTBlZDcv3e4wfUIvTeco8TLyXgVl0aDQZQYwLNlYTT82WKgURAKF0C2BL_8N_ROA-2FbGM-baijlc2drQR8eze7budu51hPYdKlYJ1B8k826_hJG0lTlQf2jZe4udy6D0AIaHUMNJ8tZzCrJOq78gALzqUOBK5ozT7gAdjG7W8br7gGj5ZM2iljLW4pGCQDCTV1s1x4h0IZ9GJBFwn6MJl2vgGaqM5Qatyml_w5ce7koi2uzvr6JumPG51T_E5bP-3b12oqsDY_FUZEnb4A0_xLlyICAAA
[apod-playground-01]: https://jupyterlab-plugin-playground.readthedocs.io/en/latest/lite/lab/index.html?plugin=1.g.H4sIAAAAAAAAE3VVXW_bMAz8K2xenBZugr16S7Gs3YAMW1GsA_awDoNiMalWWfJkuklW5L-PkuWPJu1TYOp4JI8n5Wn0iK5S1oyyN-lopTReiwJH2UgZidsJVaN0VNna5SFWlNYRPN0ZgM91uSN0n5w19NHI9IXYja7XytyZPaycLSB5_6c512I5FWWpVS6IKydv7xjUcsPi0haF4GyhkQhT-CqUmTsUP5RcI8ErbDUpXR1QHWboulDGTjchHMHTszNu_QwWRpESWv0LPYEUJGBlHdA9Ql_ptyitBNwSGi_axKdO70xuTUVQhnmzl2V492iVvIBZo56SGSQ97bmnTYKGEqvcqdI3wZDbe7sBAY714Amu57dzmFfExLbYwY3KqXYIdhW6vBI7UIbRsf4XsYRSGNSThlnUZG9JOMqAXI0h5vBvrRxWGfw80P1Xk5OTehSEGYxZ46PRUi4Q0Nnh2k5hdtGMCuDVsRon2q7HyaC5TsYjgVXVVZYnyWlYlGeaTuEKV8ogT9lsEXJ2BvGeVrXJvWhph2RNDORCa1AEZKEQDz7P4Cbm9t2Rj0a3zGA8bD5QXfoiPnmphXnwKdw5tS0oHkKGNYgDs7YUTY02bRZ6aBBjP9wQtGm78JjnbOOnjmLfpzUJEyU5J_HqnfdqJocoUuQXIZaoPfzIS68k5NpWYqmRc7x1OpBDTjIRG6P75odd8GyWwbjdhuZSgmDH9m8BDxhcNFxNDGXAzSqzbsfMbImm7ZcpJhFXTYSU0YzjGEv7bYbZ-WZ9a67UsQJpi8Qt5nWw_nM_hNa_4RoNOu8Kf_daJ6xAqqq0FcoezcFxu6TqKh6fDvngNaXa4_1ztpOObk4k8vsjOq9tOBk2x1fAfxXsKdhY9wCCneX5FCUVGEv-2OGQx8ta3aPWXtM4RAqJp0he6c-Xjld3ULw_H1BG2IfdQnYCyZ42ku6PLONp42LboeIzNGlw7Rc3vSAswr2JPmCb4dq6HTvgO7-Hjp_8pL1NXHAfauE2_IFIXIlat-86n4z2_wHm0KNZLwcAAA
[apod-playground-02]: https://jupyterlab-plugin-playground.readthedocs.io/en/latest/lite/lab/index.html?plugin=1.g.H4sIAAAAAAAAE31Wa2_bNhT9K7fGMMmZI6f76MzdvDgdsi1NkBQYimVIGfHKZkORGkXF9TL_911Soh52siCAIfI-z7kPPo-e0JRCq9Hs7WSUCYkfWI6j2Ugojl8TW44mo1JXJvVneaGNhec7BfBrVWwtmvdGK3uu-OSFs2tZrYS6UzvIjM4h-ulLfS_Zw5QVhRQps-Q5Or0joWAbLs50njPSZhKtxQlcMqEWBtkfgq_QwivWKitkuWdqX0NWuVB6uvHHQViRjYylCIvrq-UNloVWJdY5prrYGrFa2xmU1gi1OnWnnFkcHODXQjLlcxmc58gFu7fbgsSjJ8FRR_AvRCJnK4y8hBVWDm1VRva-dz7E6dERXR3BhRJWMCn-8a5cHAwybcCuETow7lmhOcVkUTleE6c6vVMppWWh8JTMXmbqhyct-DuY18kLTlF3Zo-d2cjTzLFMjSjqfKPbtd4AA0OUEcgfFrcLWFACWul8C9citZVB0JmPcsm2IBRJN_5_Zw9QMIUyqS2zyupbywwBbk2F_szg35UwWM7gz73S-KvWSa148pSwcqtSiKkYDhKckBuvM9uvrzHM39UJO75VqSUmUq_iqBdiC-YBzKJs_fM30djT5SxNp7DETCikXOtyg5RK2BJbWaVSB92klSRkFKRMShAWrIacPTo9hZtGt4vOutOmrOch4X4K3uCZc-VMPFBdPjpFit-GQASlwj0lbK-3gonaU1Cb-0hqiXh8OhTahFiczNBa_Nya2HVqtUIiOOlEDsPjDtNoX8r3R0I3KJ34QV29opBKXbIHiaTjyqhlxYOz4ByYAt-FgBJzFyCh7uqziTdIS4dWviIzXKeVE0w8i3heq8XUy6toAIlTT5TmmFAZouJnayF5TGLjYRS_kOm2adxEaZretccn-ju-vDxeLl1756yNJ5ROo7ckNSK_ZT5wUroOaijxMt-fvD2ZwFv672INwhRjX_RQoPPVl_M-EoL8o8hdEN8R-Xad1MLx-Cgmu73rY9hTGPcdGSQy-1klVl_cXt16ROJxUtKqwNilcNKp7QZ4vkebrgm8TAN70FUP3KIulWHZmjDnqYk2jNouc_rx57W1RTmb0kIRiWIlS1b6aeqmO1L426mr1x_p7v4Rt_Pl-eXV_W_nn7519M2_ee6Tsvu83yh-WgdvwX3ypdSK4GHlYPv0SkVkEDvVpFsmMJ_PwxYZsE8wXOuiko4qV81epLumIkxKk7pqdgZp05wOL33zhGv_0YFNnRK2YpdVOytvaqhdDrChZJR2BDTIJ9GLpDWk143bCOzqH9d37WCpEWvHXjwYsk0z914TFJgf7_2Z2RyFxRomz0xTh4YRQiaSRq5MGOfNloibs0mXux9HtPhC0gdDaRIk8SumVW8zDQe1T-AGV6jQBMrCiM6AC6qFEnmPIiqFMD3LZXM9KAD4f9SC0G5o801rdGEtS9cHRh3O_qYfYjMxcxr5sNHmERhNRmdP2KguALo22LfjIC7XKKXDt0llApEzEb0Sn3Pd7Nee8-6-Z7IR-3l7wVuY-KDy_M9B-dRz35MckmreCkktF74o6AuLuV9rTU1QyeFKmy1Vw0d6uhh6nUVh2e3C842eh-45yjFjlQxPMLoZ7f4DhuHLNn0LAAA
[apod-playground-03]: https://jupyterlab-plugin-playground.readthedocs.io/en/latest/lite/lab/index.html?plugin=1.g.H4sIAAAAAAAAE5VXbVMbNxD-KxtPpncm5pz0o6nTUkw7tCVhQmY6mdIBcVrbCjrpKukgLvV_70p3uhebpCnDDFh69tG-PKuVH0f3aKzQajR7NRkthcQ3rMDRbCQUx0-Zs6PJyOrK5GGtKLVx8HilAH6pyo1D85PRyp0qPnli7UJWK6Gu1BaWRheQ_PCx3pfsdsrKUoqcOTo5OboiUOSGsxNdFIysmUTncALnTKhjg-x3wVfo4DNslRPS7lDtWsiqEEpPH8JyBCviWLIc4fji7eId2lIri3WMuS43RqzWbgbWGaFWR36VM4eDBfxUSqZCLIP1Arlg125TEjy5Fxx1Av9AIgq2wiQgnHByyFUZ2fu8DS5ODw5o6wDOlHCCSfF3OMr7wWCpDbg1QpeMa1ZqTj45VL6umTedXqmcwnJQhpLMnq7Ud_da8Ncwr4MXnLzuaA89bRLKzNHmRpR1vMnlWj8AA0MloyS_Ob48hmMKQCtdbOBC5K4yCHoZvFywDQhF6Ob839gtlEyhzGpmVjl96ZihhDtTYVgz-FclDNoZ_LEjjT9rm9yJ-1ASZjcqh5TEsBfghI4JNrNdfY1h_roO2NdbWS0xk3qVJj0X22TupVnY9nz-LBmHcnmm6RQWuBQKKdZabpCThB1Va1mp3Kdu0iIpMwpyJiUIB05Dwe68ncKHxrbzzvnVRtbzGHA_hEB44o_yFLekyztvSP676IigUHgoCdvprUhRnxTN5sGTGpGOj3ogv50xzk8kszZNik0QSY1MBkjbnl6zDc9NH9vDtp1ZbZAJTjaJJz7ssp_sokInZbSD0sP3FPgZg1xqy24lko0XXFu_kMZjzoEpCP0KKLHwDlJ9vJIbfyNa-rwWK6LhOq88MAv1xtPaLKWuXyX7yVOaY0aCRcVP1kLylGDjnhee11akV7P5Anf5NcwNzXgY4890QNu8_mZrLh_fph_o5_D8_HCx8NdMwdpoo4QbuwWZkQhbBcaKW9_JTcED5tuXr15O4BX9dv5GMPnZh-4DurP6uHBGRgV9LwrvxAuSlltnNTgdH6TE29s-hB2Dcf8ggySVflSZ02eXby9DRtJxZmlkYepDeNmZbQf5_AldvqbkLTWwW131klvWQhw2hYnzhpr5gVH7L719erN2rrSzKQ02kSlmWbbS91M_ZZDc30x9N3xPe9d3uJkvTs_fXv96-uEbX77588d-UbY3naNiCemzeGCm756oWBgp0ZUW-tFqNSiIZ_LQDI3RZsADUa6ZUArNe7o6vXBbcFagtdRPPbYt9VacuF8iaf2hErrK-tU-S1uPPbr_jo1u0sH47_VIL9punsN8Po-DfCd80sCFLivpdeovigDqA6jDM2vymBUa-Ee72-FuioDw4eirMrwPbX1vnzI77j7F9mION5CeRAt4_jik2I5vBods_38tk3d1U_ik15pHDg9UBaVde-dmyZP17WrT9Gt9ozfYBucvznbi1DVvJ2c6mNPNLd97kJJgwguhP3abpfg2iyNppumCjW4SRdbgbBiL9f9pszbp0hLm1KzLwt60mkQkfsK86j1uhrM-BPAOV0iZjYKLU34JXJCaLfKhlONYtYtme0cRX8zaEyUP10pLeuwc88Xc74p6p-9iM0oLegvAgzZ3wGiseT7hkloJtG0GzeNTbNcopc9vE8oEEk-RfMY_f3TzROsd3u33KBvYj5sz3qaJD2768GdPPvWDIBQ5BtU8N7MaFz-R02cOi_DeaTRBksOVNhtSw3t6_Rp64CfxFbSN3wDoG4b_RsNxySoZX_G0M9r-Cwg0j-HADQAA
[apod-playground-04]: https://jupyterlab-plugin-playground.readthedocs.io/en/latest/lite/lab/index.html?plugin=1.g.H4sIAAAAAAAAE51XbW_bNhD-K1ejmOTUkdt9VOZuXpyt2Zo2aAIMxTokrHS22UqkKlJJvMz_fcc3vdjJWiwIEok8PrzX5073oxusFZdilL6YjJa8wDesxFE64iLHu0Sr0WSkZFNndq2sZK3h_oMA-K2pNhrrX2op9InIJw-snRfNiosPYgvLWpYQ_fTJ7Rfs45RVVcEzpunm6OgDCQVsOD2WZcnoNCtQa5zAGeNiXiP7g-cr1PAIWqN5oXagdk8UTcmFnN7a5SAsCGPJMoT5-dvFO1SVFAqdjZmsNjVfrXUKStdcrI7Mas40DhbwriqYsLYM1kvMObvSm4rEoxueo4zgH4h4yVYYWQnNdTHEauqi9761KmYFU8qq5w3CO40iV8E-q-v04MD8O4Bj0l_XTaaBgcBbew6cyYmVmDrTvJSs47FDAFBNhfRqLzXves1VwvL82CgQR-XmkFUyd7dGndh0CvM8BybAmgZYYIlCg5aEgFAxgUUPkJcrmEEus8ZIJRmFVuOJOxOTd1YWuhUXMseEAkwWH695kccBZF8BMoBSp958TYMg9rgW1bfo4GGc5NYp04bhku4duoN8KDNOt-QUDr22mu3FhdTIpSg2dHaVwqvLs9enBsQrdvTAJcEYTVnxP-_yEO6-c1azVc2q9SN3vqLaLBCaytQBYXxpUGkFS1k_fAtTG5F5cZOL1p54nMI5FSVX-MON5PlLk4LO4TYzCdcX4gzYLeMalqizdXy91rpS6ZQqnieCKZas5M3UlB9qsmBq8vNH2rv6jJvZ4uTs7dXvJ--_M1fPnt7boNWkviwXtBKPt9ddDvElxE_CrYn83BZF0IhAWKtNK_hJSRGHXHEoRjDBupZ1D2OYeQkXAutLE7EZdPJJiUqRd1q4LQU0kNFXUFqNlGa6UWa1gwkPNeqmFn59O_T4f9lHQRzQ48BrVv-O62A2mwWS6zmAavRcVk1hkkaH2giboaQTVWfBI8SER3v7ljCDhH0Zyjzq36Fsq3bL8N8SqmczuIb4OByBp_dDjO34etfluwF8VMnonc1Lx9Y2103pktuF1C2zJlEXun3G-RUN5bv8tk3K9xHgAt7Tz-HZ2eFiYQq1ZAMa6FVE6D1BY5calFK1UdK0Eyv3_fMXzyfwgn5D6jtB4se-2HCzu6cvY7ETooxLXtIJeEb9Xq99mcbjg5gwe9uHsHNgHC5xud27JdHy9OLthbUnHieK5g2MjdrPW8a2LrQOPIB5pvlNyM5e03Td1oxI5DPjsWUjMtPrgfkTMXWGdG8goq5jB5h0d6IZh-FCKFlgUshVHPnDr9nH7jroBpwrw2vAVXtl_qTtv1RYC1xygRR8r7FtZsTHQdO24Ru3-6FhBuTN2cthoOmvNu1j1k4OTnonkrcBwkgNx7P43mNswxHfELjJjMjYcdjZFQ1lbJEmtI6FEZ5TLkohyw2c84yCiw-KZ4VU7KNlBRpocJgNTnLQoKdwbHu9GRcoM4rQsswmxWdgXM96f9YPOr3xlXxio9s52S-0teTtTiXND84EOp54KTdguefYr01CVKwr0o4c9hwycXJ4h1ljUm0QU6vwO1wh0UxIbG8dEWDOicsV5n1ODLFSC785oMVHPLPTY2wjbYHmWjPDZQMg40e73lfJz2olpRPcyvozMAqTQeM6cjRI2zV2KMaJao1FYTzoVZ9AZACiB_SyvlhSY3O3Vs6Dhhw7JYKsV9-ncrI3vBz1QAe8MYTpaeiFft6c5q2X8_GAzneyzMD5fOjmWEsglrvDM9l-qrGM76FNHspLXEkzz0WXDfEAZ0Xk4Du-o35xKrimLf63S2Pb_8MUt0s9fQ60bcNlemW_8Pa4z334-cFu5iLPqR6iDtZ-Sbj0zVFlNa_c51N0sZa3XRt7M7-Y76c9yKXVcsE2Jn4MevRpZ_3EITOy_sK0i9RSw8QNvV8aTlmQwp87vPyXO-MjlbZP4TOMPvPMZ2WOS9YUwXbaGW3_BTQ2cLtFDwAA
[apod-playground-05]: https://jupyterlab-plugin-playground.readthedocs.io/en/latest/lite/lab/index.html?plugin=1.g.H4sIAAAAAAAAE51XbW_bNhD-K6xRTHLqyM0-KnE2L87WbE0TNAGGYh0SVjrbbCRSJakkXur_vuObXux4LVYEqEwej8-9PXd8GtyDVEzwQXowGsxZAe9oCYN0wHgOj4lWg9FAiVpmdq2shNTk6SMn5OwtXYlavwelhQQ5Mmu_19VKg_xVCq5Pef7c2mVRLxj_yNdkLkVJop8_u_2CfhrTqipYRjWiiQ4_olDvvhNRlhQV0AK0Bqv7nDI-lUD_ZPkCtF1yn9eSZncgd15Ta1ao_h3-JGlOFHXJuBg_2OUgzFHHnGZAppcXM7S9ElyBA5iJaiXZYqlTorRkfHFoVnOqobcAj1VBuTWyt15CzuiNXlUoHt2zHEREvpKIlXQBkZXQTBd9XbUsOr_XFmJWUKUsPG8QPGrguQr2WazjvT3z3x45Qfxa1pkmlHB4sOeIMzmxEmNnmpcSMh46DYSougL8aS81v_WSqYTm-YkBEEflap9WIne3Rq3YeEymeU4oJ9Y0AgWUwDXRAjUAqSiHoqOQlQsyIbnIaiOVZBhtDafuTIzeWVjVjTgXOSQYYLT4ZMmKPA5KtgGgAZhQcvUtBEFsN4rqezB4NU5y7cA0YbjGe_vuQB-KjOEtOYZDLy2yrbggjFzwYoVnFyl5c33-9swo8cAOn7kkGKMxK_7nXV6Fu--SSrqQtFruuPMNVmwBpK5MHaCOLzXyhSJzIZ-_haoVz7y4yUVrTzxMySUWJVNwdC9YfmxS0DncZibq9YU4IfSBMk3moLNlfLvUulLpGCueJZwqmizE_diUH2i0YGzy8yfcu7mD1WR2en5x88fphx_M1ZOXTzZoEuGLcoYr8XB92-YQm5P4Rbg1EXdNUQREqIQ2aBrBz0rwOOSK02IEE5BSyI6OfuYljHOQ1yZiE9LKJyUohd5p1K0xoIGMvqGlQaQ01bUyq62a8CFB15L79XXf4_9lHwaxR489r1n8LdeRyWQSSK7jAKzRS1HVhUkaHWojbIaSTpTMgkeQCQ-39i1hBgn7oy-z07992QZ2w_DfE6pXE3JL4pNwhLx86utYD283Xb4ZwJ0go_c2Lx1b21w3pYtu50I3zJpEbei2Gec3MJTv8ts2Kd9HCOPkA_7bPz_fn81MoZa0RwOdigi9JyB2qYEpJQ1I006s3I-vD16PyAH-hdR3gsiPXbH-ZntPV8bqTkyDZyWeIK9wBNBLX6bxcC9GnZ3tfbJxYBgucbnduSXR4uzq4sraEw8ThYMIxAb264axrQutA_fINNPsPmRnp2m6bmvmKfSZ8di85pnp9YT6EzF2hnRrUsKuY8eadGvOMdVlJ6x0c-TC8YDXRTEM4wdXooCkEIs48urf0k8tINKOQDeG-QhTDaj8RdOhsfRmgEOEBMwPb9Q9lYx-KmwFIiq_nG7MX0ft0HHcKvPNvjPbIVRrYTNZhIUmnzDDDcJUYA91WYzHEy_lhgz3Hfu1UUhBNA5wJmoKBBUKLsoVuWQZRhyikZODR8hq427MkslxW3KW2L3VX7-G_sTUjCGXKch7lR_A41DIQ8a3PugQPQmOdDJ9t8VPXsN6-0DC8uCM_TZ80bacZazEWm8ObNu960hWCGVCi6dwwoPtLmA9ot08nSypit3xYc8TGGc7cttyMD0FiJh3Orxt-IbNpU9nmwgdDvX6MbJB_w4kTUSmWlPDe5s43Hr3bj_Xleh18iDkHcHcpkYb05GjTNyW0GoxyaaWUBQdPCMSGQXRM7g8JB_FZGt4afqfw9dlDnc07Hbu9UK_rM4CAEyFYY_Qh_0aM-p8NbSTrKUQy97hGy0601DGT6QpHaxKWAgz0UXXNcaG0SLqqXehNYo9F3W9a6MdiMHH0ed57y12tJssjmMfQo5PT1Xh8yp1OR81hrroBypsYh4WEv8RewCj7jzmzAy_zR2h7NtLmmt6PI998owzjQ5h_zjqsnNPmF43CbXL_bZdOoKo7JN3i_PdS9gPtBMHmCEHRq1a-4JylJWDyiSr3LMxulqKh7Z9v5teTbepLlTgjK5MU6ek0xTsGydxminG_Mq0ydQywMgN-19qhj5NyV8b_ehvuy8sEFqY_X5Tcvshf9PmKzxP8flrnts5zGldBN_gzmD9L3Xs4XiKEAAA
