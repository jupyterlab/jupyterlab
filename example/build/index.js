/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, Jupyter Development Team.
|
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
'use strict';
var jupyter_js_notebook_1 = require('jupyter-js-notebook');
var jupyter_js_services_1 = require('jupyter-js-services');
var rendermime_1 = require('jupyter-js-ui/lib/rendermime');
var renderers_1 = require('jupyter-js-ui/lib/renderers');
var jupyter_js_utils_1 = require('jupyter-js-utils');
var phosphor_commandpalette_1 = require('phosphor-commandpalette');
var phosphor_keymap_1 = require('phosphor-keymap');
var phosphor_splitpanel_1 = require('phosphor-splitpanel');
require('jupyter-js-notebook/lib/index.css');
require('jupyter-js-notebook/lib/theme.css');
require('jupyter-js-ui/lib/dialog/index.css');
require('jupyter-js-ui/lib/dialog/theme.css');
var SERVER_URL = jupyter_js_utils_1.getBaseUrl();
var NOTEBOOK = 'test.ipynb';
function main() {
    // Initialize the keymap manager with the bindings.
    var keymap = new phosphor_keymap_1.KeymapManager();
    // Setup the keydown listener for the document.
    document.addEventListener('keydown', function (event) {
        keymap.processKeydownEvent(event);
    });
    // TODO: check out static example from the history
    // and make that a separate example.
    var contents = new jupyter_js_services_1.ContentsManager(SERVER_URL);
    var nbModel = new jupyter_js_notebook_1.NotebookModel();
    var nbManager = new jupyter_js_notebook_1.NotebookManager(nbModel, contents);
    var rendermime = new rendermime_1.RenderMime();
    var transformers = [
        new renderers_1.JavascriptRenderer(),
        new renderers_1.HTMLRenderer(),
        new renderers_1.ImageRenderer(),
        new renderers_1.SVGRenderer(),
        new renderers_1.LatexRenderer(),
        new renderers_1.ConsoleTextRenderer(),
        new renderers_1.TextRenderer()
    ];
    for (var _i = 0, transformers_1 = transformers; _i < transformers_1.length; _i++) {
        var t = transformers_1[_i];
        for (var _a = 0, _b = t.mimetypes; _a < _b.length; _a++) {
            var m = _b[_a];
            rendermime.order.push(m);
            rendermime.renderers[m] = t;
        }
    }
    var nbWidget = new jupyter_js_notebook_1.NotebookPanel(nbManager, rendermime);
    nbWidget.title.text = NOTEBOOK;
    var pModel = new phosphor_commandpalette_1.StandardPaletteModel();
    var palette = new phosphor_commandpalette_1.CommandPalette();
    palette.model = pModel;
    var panel = new phosphor_splitpanel_1.SplitPanel();
    panel.id = 'main';
    panel.orientation = phosphor_splitpanel_1.SplitPanel.Horizontal;
    phosphor_splitpanel_1.SplitPanel.setStretch(palette, 1);
    phosphor_splitpanel_1.SplitPanel.setStretch(nbWidget, 2);
    panel.attach(document.body);
    panel.addChild(palette);
    panel.addChild(nbWidget);
    window.onresize = function () { panel.update(); };
    var kernelspecs;
    var items = [
        {
            category: 'Notebook',
            text: 'Save',
            shortcut: 'Accel S',
            handler: function () { nbManager.save(); }
        },
        {
            category: 'Notebook',
            text: 'Switch Kernel',
            handler: function () {
                if (!kernelspecs) {
                    return;
                }
                jupyter_js_notebook_1.selectKernel(nbWidget.node, nbModel, kernelspecs);
            }
        },
        {
            category: 'Notebook',
            text: 'Interrupt Kernel',
            shortcut: 'I I',
            handler: function () { nbManager.interrupt(); }
        },
        {
            category: 'Notebook',
            text: 'Restart Kernel',
            shortcut: '0 0',
            handler: function () { nbManager.restart(); }
        },
        {
            category: 'Notebook',
            text: 'Trust Notebook',
            handler: function () {
                jupyter_js_notebook_1.trustNotebook(nbModel, nbWidget.node);
            }
        },
        {
            category: 'Notebook Cell',
            text: 'Run and Advance',
            shortcut: 'Shift Enter',
            handler: function () { nbManager.runAndAdvance(); }
        },
        {
            category: 'Notebook Cell',
            text: 'Run Selected',
            handler: function () { nbManager.run(); }
        },
        {
            category: 'Notebook Cell',
            text: 'Run and Insert Below',
            handler: function () { nbManager.runAndInsert(); }
        },
        {
            category: 'Notebook Cell',
            text: 'To Edit Mode',
            handler: function () { nbModel.mode = 'edit'; }
        },
        {
            category: 'Notebook Cell',
            text: 'To Command Mode',
            handler: function () { nbModel.mode = 'command'; }
        },
        {
            category: 'Notebook Cell',
            text: 'Cut Selected',
            shortcut: 'X',
            handler: function () { nbManager.cut(); }
        },
        {
            category: 'Notebook Cell',
            text: 'Copy Selected',
            shortcut: 'C',
            handler: function () { nbManager.copy(); }
        },
        {
            category: 'Notebook Cell',
            text: 'Paste',
            shortcut: 'V',
            handler: function () { nbManager.paste(); }
        },
        {
            category: 'Notebook Cell',
            text: 'Delete Selected',
            shortcut: 'D D',
            handler: function () { nbManager.delete(); }
        },
        {
            category: 'Notebook Cell',
            text: 'Undo Cell Deletion',
            shortcut: 'Z',
            handler: function () { nbManager.undelete(); }
        },
        {
            category: 'Notebook Cell',
            text: 'Insert Above',
            shortcut: 'A',
            handler: function () { nbManager.insertAbove(); }
        },
        {
            category: 'Notebook Cell',
            text: 'Insert Below',
            shortcut: 'B',
            handler: function () { nbManager.insertBelow(); }
        },
        {
            category: 'Notebook Cell',
            text: 'Merge Selected',
            shortcut: 'Shift M',
            handler: function () { nbManager.merge(); }
        },
        {
            category: 'Notebook Cell',
            text: 'To Code Type',
            shortcut: 'Y',
            handler: function () { nbManager.changeCellType('code'); }
        },
        {
            category: 'Notebook Cell',
            text: 'To Markdown Type',
            shortcut: 'M',
            handler: function () { nbManager.changeCellType('markdown'); }
        },
        {
            category: 'Notebook Cell',
            text: 'To Raw Type',
            shortcut: 'R',
            handler: function () { nbManager.changeCellType('raw'); }
        },
        {
            category: 'Notebook Cell',
            text: 'Select Previous',
            shortcut: 'ArrowUp',
            handler: function () { nbModel.activeCellIndex -= 1; }
        },
        {
            category: 'Notebook Cell',
            text: 'Select Next',
            shortcut: 'ArrowDown',
            handler: function () { nbModel.activeCellIndex += 1; }
        },
    ];
    pModel.addItems(items);
    var bindings = [
        {
            selector: '.jp-Notebook',
            sequence: ['Shift Enter'],
            handler: function () {
                nbManager.runAndAdvance();
                return true;
            }
        },
        {
            selector: '.jp-Notebook',
            sequence: ['Accel S'],
            handler: function () {
                nbManager.save();
                return true;
            }
        },
        {
            selector: '.jp-Notebook.jp-mod-commandMode',
            sequence: ['I', 'I'],
            handler: function () {
                nbManager.interrupt();
                return true;
            }
        },
        {
            selector: '.jp-Notebook.jp-mod-commandMode',
            sequence: ['0', '0'],
            handler: function () {
                nbManager.restart();
                return true;
            }
        },
        {
            selector: '.jp-Notebook.jp-mod-commandMode',
            sequence: ['Enter'],
            handler: function () {
                nbModel.mode = 'edit';
                return true;
            }
        },
        {
            selector: '.jp-Notebook.jp-mod-editMode',
            sequence: ['Escape'],
            handler: function () {
                nbModel.mode = 'command';
                return true;
            }
        },
        {
            selector: '.jp-Notebook.jp-mod-commandMode',
            sequence: ['Y'],
            handler: function () {
                nbManager.changeCellType('code');
                return true;
            }
        },
        {
            selector: '.jp-Notebook.jp-mod-commandMode',
            sequence: ['M'],
            handler: function () {
                nbManager.changeCellType('markdown');
                return true;
            }
        },
        {
            selector: '.jp-Notebook.jp-mod-commandMode',
            sequence: ['R'],
            handler: function () {
                nbManager.changeCellType('raw');
                return true;
            }
        },
        {
            selector: '.jp-Notebook.jp-mod-commandMode',
            sequence: ['X'],
            handler: function () {
                nbManager.cut();
                return true;
            }
        },
        {
            selector: '.jp-Notebook.jp-mod-commandMode',
            sequence: ['C'],
            handler: function () {
                nbManager.copy();
                return true;
            }
        },
        {
            selector: '.jp-Notebook.jp-mod-commandMode',
            sequence: ['V'],
            handler: function () {
                nbManager.paste();
                return true;
            }
        },
        {
            selector: '.jp-Notebook.jp-mod-commandMode',
            sequence: ['D', 'D'],
            handler: function () {
                nbManager.delete();
                return true;
            }
        },
        {
            selector: '.jp-Notebook.jp-mod-commandMode',
            sequence: ['Z'],
            handler: function () {
                nbManager.undelete();
                return true;
            }
        },
        {
            selector: '.jp-Notebook.jp-mod-commandMode',
            sequence: ['Shift M'],
            handler: function () {
                nbManager.merge();
                return true;
            }
        },
        {
            selector: '.jp-Notebook.jp-mod-commandMode',
            sequence: ['A'],
            handler: function () {
                nbManager.insertAbove();
                return true;
            }
        },
        {
            selector: '.jp-Notebook.jp-mod-commandMode',
            sequence: ['B'],
            handler: function () {
                nbManager.insertBelow();
                return true;
            }
        },
        {
            selector: '.jp-Notebook.jp-mod-commandMode',
            sequence: ['J'],
            handler: function () {
                nbModel.activeCellIndex += 1;
                return true;
            }
        },
        {
            selector: '.jp-Notebook.jp-mod-commandMode',
            sequence: ['ArrowDown'],
            handler: function () {
                nbModel.activeCellIndex += 1;
                return true;
            }
        },
        {
            selector: '.jp-Notebook.jp-mod-commandMode',
            sequence: ['K'],
            handler: function () {
                nbModel.activeCellIndex -= 1;
                return true;
            }
        },
        {
            selector: '.jp-Notebook.jp-mod-commandMode',
            sequence: ['ArrowUp'],
            handler: function () {
                nbModel.activeCellIndex -= 1;
                return true;
            }
        }
    ];
    keymap.add(bindings);
    contents.get(NOTEBOOK, {}).then(function (data) {
        jupyter_js_notebook_1.deserialize(data.content, nbModel);
        jupyter_js_services_1.getKernelSpecs({}).then(function (specs) {
            kernelspecs = specs;
            // start session
            jupyter_js_services_1.startNewSession({
                notebookPath: NOTEBOOK,
                kernelName: jupyter_js_notebook_1.findKernel(nbModel, specs),
                baseUrl: SERVER_URL
            }).then(function (session) {
                nbModel.session = session;
            });
        });
    });
}
window.onload = main;
