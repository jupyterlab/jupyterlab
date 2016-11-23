import {
    Menu
} from 'phosphor/lib/ui/menu';

import {
    JupyterLab, JupyterLabPlugin
} from '../../application';

import {
    InstanceTracker
} from '../../common/instancetracker';

import {
    IDocumentRegistry
} from '../../docregistry';

import {
    EditorWidgetFactory, EditorWidget
} from '../../editorwidget/widget';

import {
    ICommandPalette
} from '../../commandpalette';

import {
    IMainMenu
} from '../../mainmenu';

import {
    IStateDB
} from '../../statedb';

import {
    IEditorTracker
} from '../../editorwidget/index';

import {
    IEditorFactory
} from '../../codeeditor';

import {
    MonacoCodeEditor
} from '../../monaco';

/**
 * The class name for all main area portrait tab icons.
 */
const PORTRAIT_ICON_CLASS = 'jp-MainAreaPortraitIcon';

/**
 * The class name for the text editor icon from the default theme.
 */
const EDITOR_ICON_CLASS = 'jp-ImageTextEditor';

/**
 * The state database namespace for editor widgets.
 */
const NAMESPACE = 'editorwidgets';

/**
 * The map of command ids used by the editor.
 */
const cmdIds = {
    lineNumbers: 'editor:line-numbers',
    closeAll: 'editor:close-all',
    changeTheme: 'editor:change-theme'
};

export const DEFAULT_THEME = 'default-theme';

export const THEMES = [
    'vs', 'vs-dark', 'hc-black'
];

/**
 * The editor widget instance tracker.
 */
const tracker = new InstanceTracker<EditorWidget>();

/**
 * The editor handler extension.
 */
export const editorHandlerProvider: JupyterLabPlugin<IEditorTracker> = {
    id: 'ride.services.editor-handler',
    requires: [IDocumentRegistry, IMainMenu, ICommandPalette, IStateDB, IEditorFactory],
    provides: IEditorTracker,
    activate: activateEditorHandler,
    autoStart: true
};

/**
 * Sets up the editor widget
 */
function activateEditorHandler(app: JupyterLab, registry: IDocumentRegistry, mainMenu: IMainMenu, palette: ICommandPalette, state: IStateDB, editorFactory: IEditorFactory): IEditorTracker {
    let widgetFactory = new EditorWidgetFactory(editorFactory,
        {
            name: 'Editor',
            fileExtensions: ['*'],
            defaultFor: ['*']
        });

    // Sync tracker with currently focused widget.
    app.shell.currentChanged.connect((sender, args) => {
        tracker.sync(args.newValue);
    });

    widgetFactory.widgetCreated.connect((sender, widget) => {
        widget.title.icon = `${PORTRAIT_ICON_CLASS} ${EDITOR_ICON_CLASS}`;
        // Add the file path to the state database.
        let key = `${NAMESPACE}:${widget.context.path}`;
        state.save(key, { path: widget.context.path });
        // Remove the file path from the state database on disposal.
        widget.disposed.connect(() => { state.remove(key); });
        // Keep track of path changes in the state database.
        widget.context.pathChanged.connect((sender, path) => {
            state.remove(key);
            key = `${NAMESPACE}:${path}`;
            state.save(key, { path });
        });
        tracker.add(widget);
    });
    registry.addWidgetFactory(widgetFactory);

    mainMenu.addMenu(createMenu(app), { rank: 30 });

    let commands = app.commands;

    commands.addCommand(cmdIds.lineNumbers, {
        execute: () => { toggleLineNums(); },
        label: 'Toggle Line Numbers',
    });

    commands.addCommand(cmdIds.closeAll, {
        execute: () => { closeAllFiles(); },
        label: 'Close all files'
    });

    [
        cmdIds.lineNumbers,
        cmdIds.closeAll
    ].forEach(command => palette.addItem({ command, category: 'Editor' }));

    // Reload any editor widgets whose state has been stored.
    Promise.all([state.fetchNamespace(NAMESPACE), app.started])
        .then(([items]) => {
            let open = 'file-operations:open';
            items.forEach(item => { app.commands.execute(open, item.value); });
        });

    return tracker;
}


/**
 * Toggle editor line numbers
 */
function toggleLineNums() {
    if (tracker.currentWidget) {
        const editor = tracker.currentWidget.editor;
        editor.lineNumbers = !editor.lineNumbers;
    }
}

/**
 * Close all currently open text editor files
 */
function closeAllFiles() {
    tracker.forEach(widget => { widget.close(); });
}

/**
 * Create a menu for the editor.
 */
function createMenu(app: JupyterLab): Menu {
    let { commands, keymap } = app;
    let settings = new Menu({ commands, keymap });
    let themeMenu = new Menu({ commands, keymap });
    let menu = new Menu({ commands, keymap });

    menu.title.label = 'Editor';
    settings.title.label = 'Settings';
    themeMenu.title.label = 'Theme';

    settings.addItem({ command: cmdIds.lineNumbers });

    commands.addCommand(cmdIds.changeTheme, {
        label: args => {
            return args['theme'] as string;
        },
        execute: args => {
            let name: string = args['theme'] as string || DEFAULT_THEME;
            tracker.forEach(widget => {
                const editor = widget.editor as MonacoCodeEditor;
                editor.editor.updateOptions({
                    theme: name
                });
            });
        }
    });

    for (const theme of THEMES) {
        themeMenu.addItem({
            command: cmdIds.changeTheme,
            args: { theme }
        });
    }

    menu.addItem({ command: cmdIds.closeAll });
    menu.addItem({ type: 'separator' });
    menu.addItem({ type: 'submenu', menu: settings });
    menu.addItem({ type: 'submenu', menu: themeMenu });

    return menu;
}
