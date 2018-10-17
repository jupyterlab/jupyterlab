var typedoc = typedoc || {};
typedoc.search = typedoc.search || {};
typedoc.search.data = {
  kinds: {
    '1': 'External module',
    '2': 'Module',
    '4': 'Enumeration',
    '16': 'Enumeration member',
    '32': 'Variable',
    '64': 'Function',
    '128': 'Class',
    '256': 'Interface',
    '512': 'Constructor',
    '1024': 'Property',
    '2048': 'Method',
    '65536': 'Type literal',
    '262144': 'Accessor',
    '2097152': 'Object literal',
    '4194304': 'Type alias'
  },
  rows: [
    {
      id: 0,
      kind: 1,
      name: '"contexts/index"',
      url: 'modules/_contexts_index_.html',
      classes: 'tsd-kind-external-module'
    },
    {
      id: 1,
      kind: 2,
      name: 'IStatusContext',
      url: 'modules/_contexts_index_.istatuscontext.html',
      classes:
        'tsd-kind-module tsd-parent-kind-external-module tsd-has-type-parameter',
      parent: '"contexts/index"'
    },
    {
      id: 2,
      kind: 1024,
      name: 'tracker',
      url: 'modules/_contexts_index_.istatuscontext.html#tracker',
      classes: 'tsd-kind-property tsd-parent-kind-module',
      parent: '"contexts/index".IStatusContext'
    },
    {
      id: 3,
      kind: 1024,
      name: 'isEnabled',
      url: 'modules/_contexts_index_.istatuscontext.html#isenabled',
      classes: 'tsd-kind-property tsd-parent-kind-module',
      parent: '"contexts/index".IStatusContext'
    },
    {
      id: 4,
      kind: 64,
      name: 'findContext',
      url: 'modules/_contexts_index_.istatuscontext.html#findcontext',
      classes:
        'tsd-kind-function tsd-parent-kind-module tsd-has-type-parameter tsd-is-not-exported',
      parent: '"contexts/index".IStatusContext'
    },
    {
      id: 5,
      kind: 64,
      name: 'delegateActive',
      url: 'modules/_contexts_index_.istatuscontext.html#delegateactive',
      classes:
        'tsd-kind-function tsd-parent-kind-module tsd-has-type-parameter',
      parent: '"contexts/index".IStatusContext'
    },
    {
      id: 6,
      kind: 1,
      name: '"statusBar"',
      url: 'modules/_statusbar_.html',
      classes: 'tsd-kind-external-module'
    },
    {
      id: 7,
      kind: 2,
      name: 'IStatusBar',
      url: 'modules/_statusbar_.istatusbar.html',
      classes: 'tsd-kind-module tsd-parent-kind-external-module',
      parent: '"statusBar"'
    },
    {
      id: 8,
      kind: 2048,
      name: 'registerStatusItem',
      url: 'modules/_statusbar_.istatusbar.html#registerstatusitem',
      classes: 'tsd-kind-method tsd-parent-kind-module',
      parent: '"statusBar".IStatusBar'
    },
    {
      id: 9,
      kind: 128,
      name: 'StatusBar',
      url: 'classes/_statusbar_.statusbar.html',
      classes: 'tsd-kind-class tsd-parent-kind-external-module',
      parent: '"statusBar"'
    },
    {
      id: 10,
      kind: 512,
      name: 'constructor',
      url: 'classes/_statusbar_.statusbar.html#constructor',
      classes: 'tsd-kind-constructor tsd-parent-kind-class tsd-is-overwrite',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 11,
      kind: 2048,
      name: 'registerStatusItem',
      url: 'classes/_statusbar_.statusbar.html#registerstatusitem',
      classes: 'tsd-kind-method tsd-parent-kind-class',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 12,
      kind: 2048,
      name: 'dispose',
      url: 'classes/_statusbar_.statusbar.html#dispose',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 13,
      kind: 2048,
      name: 'onUpdateRequest',
      url: 'classes/_statusbar_.statusbar.html#onupdaterequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite tsd-is-protected',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 14,
      kind: 2048,
      name: '_findInsertIndex',
      url: 'classes/_statusbar_.statusbar.html#_findinsertindex',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-private',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 15,
      kind: 2048,
      name: '_refreshItem',
      url: 'classes/_statusbar_.statusbar.html#_refreshitem',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-private',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 16,
      kind: 2048,
      name: '_refreshAll',
      url: 'classes/_statusbar_.statusbar.html#_refreshall',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-private',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 17,
      kind: 2048,
      name: '_onAppShellCurrentChanged',
      url: 'classes/_statusbar_.statusbar.html#_onappshellcurrentchanged',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-private',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 18,
      kind: 2048,
      name: '_onIndividualStateChange',
      url: 'classes/_statusbar_.statusbar.html#_onindividualstatechange',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-private',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 19,
      kind: 1024,
      name: '_leftRankItems',
      url: 'classes/_statusbar_.statusbar.html#_leftrankitems',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 20,
      kind: 1024,
      name: '_rightRankItems',
      url: 'classes/_statusbar_.statusbar.html#_rightrankitems',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 21,
      kind: 1024,
      name: '_statusItems',
      url: 'classes/_statusbar_.statusbar.html#_statusitems',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 22,
      kind: 65536,
      name: '__type',
      url: 'classes/_statusbar_.statusbar.html#_statusitems.__type',
      classes:
        'tsd-kind-type-literal tsd-parent-kind-property tsd-is-not-exported',
      parent: '"statusBar".StatusBar._statusItems'
    },
    {
      id: 23,
      kind: 1024,
      name: '_statusIds',
      url: 'classes/_statusbar_.statusbar.html#_statusids',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 24,
      kind: 1024,
      name: '_host',
      url: 'classes/_statusbar_.statusbar.html#_host',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 25,
      kind: 1024,
      name: '_leftSide',
      url: 'classes/_statusbar_.statusbar.html#_leftside',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 26,
      kind: 1024,
      name: '_middlePanel',
      url: 'classes/_statusbar_.statusbar.html#_middlepanel',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 27,
      kind: 1024,
      name: '_rightSide',
      url: 'classes/_statusbar_.statusbar.html#_rightside',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 28,
      kind: 1024,
      name: 'disposed',
      url: 'classes/_statusbar_.statusbar.html#disposed',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-inherited',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 29,
      kind: 1024,
      name: 'node',
      url: 'classes/_statusbar_.statusbar.html#node',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-inherited',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 30,
      kind: 1024,
      name: 'isDisposed',
      url: 'classes/_statusbar_.statusbar.html#isdisposed',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-inherited',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 31,
      kind: 1024,
      name: 'isAttached',
      url: 'classes/_statusbar_.statusbar.html#isattached',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-inherited',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 32,
      kind: 1024,
      name: 'isHidden',
      url: 'classes/_statusbar_.statusbar.html#ishidden',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-inherited',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 33,
      kind: 1024,
      name: 'isVisible',
      url: 'classes/_statusbar_.statusbar.html#isvisible',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-inherited',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 34,
      kind: 1024,
      name: 'title',
      url: 'classes/_statusbar_.statusbar.html#title',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-inherited',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 35,
      kind: 1024,
      name: 'id',
      url: 'classes/_statusbar_.statusbar.html#id',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-inherited',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 36,
      kind: 1024,
      name: 'dataset',
      url: 'classes/_statusbar_.statusbar.html#dataset',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-inherited',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 37,
      kind: 1024,
      name: 'parent',
      url: 'classes/_statusbar_.statusbar.html#parent',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-inherited',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 38,
      kind: 1024,
      name: 'layout',
      url: 'classes/_statusbar_.statusbar.html#layout',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-inherited',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 39,
      kind: 2048,
      name: 'children',
      url: 'classes/_statusbar_.statusbar.html#children',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-inherited',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 40,
      kind: 2048,
      name: 'contains',
      url: 'classes/_statusbar_.statusbar.html#contains',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-inherited',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 41,
      kind: 2048,
      name: 'hasClass',
      url: 'classes/_statusbar_.statusbar.html#hasclass',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-inherited',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 42,
      kind: 2048,
      name: 'addClass',
      url: 'classes/_statusbar_.statusbar.html#addclass',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-inherited',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 43,
      kind: 2048,
      name: 'removeClass',
      url: 'classes/_statusbar_.statusbar.html#removeclass',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-inherited',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 44,
      kind: 2048,
      name: 'toggleClass',
      url: 'classes/_statusbar_.statusbar.html#toggleclass',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-inherited',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 45,
      kind: 2048,
      name: 'update',
      url: 'classes/_statusbar_.statusbar.html#update',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-inherited',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 46,
      kind: 2048,
      name: 'fit',
      url: 'classes/_statusbar_.statusbar.html#fit',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-inherited',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 47,
      kind: 2048,
      name: 'activate',
      url: 'classes/_statusbar_.statusbar.html#activate',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-inherited',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 48,
      kind: 2048,
      name: 'close',
      url: 'classes/_statusbar_.statusbar.html#close',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-inherited',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 49,
      kind: 2048,
      name: 'show',
      url: 'classes/_statusbar_.statusbar.html#show',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-inherited',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 50,
      kind: 2048,
      name: 'hide',
      url: 'classes/_statusbar_.statusbar.html#hide',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-inherited',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 51,
      kind: 2048,
      name: 'setHidden',
      url: 'classes/_statusbar_.statusbar.html#sethidden',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-inherited',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 52,
      kind: 2048,
      name: 'testFlag',
      url: 'classes/_statusbar_.statusbar.html#testflag',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-inherited',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 53,
      kind: 2048,
      name: 'setFlag',
      url: 'classes/_statusbar_.statusbar.html#setflag',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-inherited',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 54,
      kind: 2048,
      name: 'clearFlag',
      url: 'classes/_statusbar_.statusbar.html#clearflag',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-inherited',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 55,
      kind: 2048,
      name: 'processMessage',
      url: 'classes/_statusbar_.statusbar.html#processmessage',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-inherited',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 56,
      kind: 2048,
      name: 'notifyLayout',
      url: 'classes/_statusbar_.statusbar.html#notifylayout',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 57,
      kind: 2048,
      name: 'onCloseRequest',
      url: 'classes/_statusbar_.statusbar.html#oncloserequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 58,
      kind: 2048,
      name: 'onResize',
      url: 'classes/_statusbar_.statusbar.html#onresize',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 59,
      kind: 2048,
      name: 'onFitRequest',
      url: 'classes/_statusbar_.statusbar.html#onfitrequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 60,
      kind: 2048,
      name: 'onActivateRequest',
      url: 'classes/_statusbar_.statusbar.html#onactivaterequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 61,
      kind: 2048,
      name: 'onBeforeShow',
      url: 'classes/_statusbar_.statusbar.html#onbeforeshow',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 62,
      kind: 2048,
      name: 'onAfterShow',
      url: 'classes/_statusbar_.statusbar.html#onaftershow',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 63,
      kind: 2048,
      name: 'onBeforeHide',
      url: 'classes/_statusbar_.statusbar.html#onbeforehide',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 64,
      kind: 2048,
      name: 'onAfterHide',
      url: 'classes/_statusbar_.statusbar.html#onafterhide',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 65,
      kind: 2048,
      name: 'onBeforeAttach',
      url: 'classes/_statusbar_.statusbar.html#onbeforeattach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 66,
      kind: 2048,
      name: 'onAfterAttach',
      url: 'classes/_statusbar_.statusbar.html#onafterattach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 67,
      kind: 2048,
      name: 'onBeforeDetach',
      url: 'classes/_statusbar_.statusbar.html#onbeforedetach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 68,
      kind: 2048,
      name: 'onAfterDetach',
      url: 'classes/_statusbar_.statusbar.html#onafterdetach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 69,
      kind: 2048,
      name: 'onChildAdded',
      url: 'classes/_statusbar_.statusbar.html#onchildadded',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 70,
      kind: 2048,
      name: 'onChildRemoved',
      url: 'classes/_statusbar_.statusbar.html#onchildremoved',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 71,
      kind: 2,
      name: 'Widget',
      url: 'modules/_statusbar_.statusbar.widget.html',
      classes: 'tsd-kind-module tsd-parent-kind-class',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 72,
      kind: 256,
      name: 'IOptions',
      url: 'interfaces/_statusbar_.statusbar.widget.ioptions.html',
      classes: 'tsd-kind-interface tsd-parent-kind-module tsd-is-not-exported',
      parent: '"statusBar".StatusBar.Widget'
    },
    {
      id: 73,
      kind: 1024,
      name: 'node',
      url: 'interfaces/_statusbar_.statusbar.widget.ioptions.html#node',
      classes:
        'tsd-kind-property tsd-parent-kind-interface tsd-is-not-exported',
      parent: '"statusBar".StatusBar.Widget.IOptions'
    },
    {
      id: 74,
      kind: 4,
      name: 'Flag',
      url: 'enums/_statusbar_.statusbar.widget.flag.html',
      classes: 'tsd-kind-enum tsd-parent-kind-module tsd-is-not-exported',
      parent: '"statusBar".StatusBar.Widget'
    },
    {
      id: 75,
      kind: 16,
      name: 'IsDisposed',
      url: 'enums/_statusbar_.statusbar.widget.flag.html#isdisposed',
      classes: 'tsd-kind-enum-member tsd-parent-kind-enum tsd-is-not-exported',
      parent: '"statusBar".StatusBar.Widget.Flag'
    },
    {
      id: 76,
      kind: 16,
      name: 'IsAttached',
      url: 'enums/_statusbar_.statusbar.widget.flag.html#isattached',
      classes: 'tsd-kind-enum-member tsd-parent-kind-enum tsd-is-not-exported',
      parent: '"statusBar".StatusBar.Widget.Flag'
    },
    {
      id: 77,
      kind: 16,
      name: 'IsHidden',
      url: 'enums/_statusbar_.statusbar.widget.flag.html#ishidden',
      classes: 'tsd-kind-enum-member tsd-parent-kind-enum tsd-is-not-exported',
      parent: '"statusBar".StatusBar.Widget.Flag'
    },
    {
      id: 78,
      kind: 16,
      name: 'IsVisible',
      url: 'enums/_statusbar_.statusbar.widget.flag.html#isvisible',
      classes: 'tsd-kind-enum-member tsd-parent-kind-enum tsd-is-not-exported',
      parent: '"statusBar".StatusBar.Widget.Flag'
    },
    {
      id: 79,
      kind: 16,
      name: 'DisallowLayout',
      url: 'enums/_statusbar_.statusbar.widget.flag.html#disallowlayout',
      classes: 'tsd-kind-enum-member tsd-parent-kind-enum tsd-is-not-exported',
      parent: '"statusBar".StatusBar.Widget.Flag'
    },
    {
      id: 80,
      kind: 128,
      name: 'ChildMessage',
      url: 'classes/_statusbar_.statusbar.widget.childmessage.html',
      classes: 'tsd-kind-class tsd-parent-kind-module tsd-is-not-exported',
      parent: '"statusBar".StatusBar.Widget'
    },
    {
      id: 81,
      kind: 512,
      name: 'constructor',
      url: 'classes/_statusbar_.statusbar.widget.childmessage.html#constructor',
      classes:
        'tsd-kind-constructor tsd-parent-kind-class tsd-is-overwrite tsd-is-not-exported',
      parent: '"statusBar".StatusBar.Widget.ChildMessage'
    },
    {
      id: 82,
      kind: 1024,
      name: 'child',
      url: 'classes/_statusbar_.statusbar.widget.childmessage.html#child',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-not-exported',
      parent: '"statusBar".StatusBar.Widget.ChildMessage'
    },
    {
      id: 83,
      kind: 1024,
      name: 'type',
      url: 'classes/_statusbar_.statusbar.widget.childmessage.html#type',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"statusBar".StatusBar.Widget.ChildMessage'
    },
    {
      id: 84,
      kind: 1024,
      name: 'isConflatable',
      url:
        'classes/_statusbar_.statusbar.widget.childmessage.html#isconflatable',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"statusBar".StatusBar.Widget.ChildMessage'
    },
    {
      id: 85,
      kind: 2048,
      name: 'conflate',
      url: 'classes/_statusbar_.statusbar.widget.childmessage.html#conflate',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"statusBar".StatusBar.Widget.ChildMessage'
    },
    {
      id: 86,
      kind: 128,
      name: 'ResizeMessage',
      url: 'classes/_statusbar_.statusbar.widget.resizemessage.html',
      classes: 'tsd-kind-class tsd-parent-kind-module tsd-is-not-exported',
      parent: '"statusBar".StatusBar.Widget'
    },
    {
      id: 87,
      kind: 512,
      name: 'constructor',
      url:
        'classes/_statusbar_.statusbar.widget.resizemessage.html#constructor',
      classes: 'tsd-kind-constructor tsd-parent-kind-class tsd-is-not-exported',
      parent: '"statusBar".StatusBar.Widget.ResizeMessage'
    },
    {
      id: 88,
      kind: 1024,
      name: 'width',
      url: 'classes/_statusbar_.statusbar.widget.resizemessage.html#width',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-not-exported',
      parent: '"statusBar".StatusBar.Widget.ResizeMessage'
    },
    {
      id: 89,
      kind: 1024,
      name: 'height',
      url: 'classes/_statusbar_.statusbar.widget.resizemessage.html#height',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-not-exported',
      parent: '"statusBar".StatusBar.Widget.ResizeMessage'
    },
    {
      id: 90,
      kind: 2,
      name: 'Msg',
      url: 'modules/_statusbar_.statusbar.widget.msg.html',
      classes: 'tsd-kind-module tsd-parent-kind-module tsd-is-not-exported',
      parent: '"statusBar".StatusBar.Widget'
    },
    {
      id: 91,
      kind: 32,
      name: 'BeforeShow',
      url: 'modules/_statusbar_.statusbar.widget.msg.html#beforeshow',
      classes: 'tsd-kind-variable tsd-parent-kind-module tsd-is-not-exported',
      parent: '"statusBar".StatusBar.Widget.Msg'
    },
    {
      id: 92,
      kind: 32,
      name: 'AfterShow',
      url: 'modules/_statusbar_.statusbar.widget.msg.html#aftershow',
      classes: 'tsd-kind-variable tsd-parent-kind-module tsd-is-not-exported',
      parent: '"statusBar".StatusBar.Widget.Msg'
    },
    {
      id: 93,
      kind: 32,
      name: 'BeforeHide',
      url: 'modules/_statusbar_.statusbar.widget.msg.html#beforehide',
      classes: 'tsd-kind-variable tsd-parent-kind-module tsd-is-not-exported',
      parent: '"statusBar".StatusBar.Widget.Msg'
    },
    {
      id: 94,
      kind: 32,
      name: 'AfterHide',
      url: 'modules/_statusbar_.statusbar.widget.msg.html#afterhide',
      classes: 'tsd-kind-variable tsd-parent-kind-module tsd-is-not-exported',
      parent: '"statusBar".StatusBar.Widget.Msg'
    },
    {
      id: 95,
      kind: 32,
      name: 'BeforeAttach',
      url: 'modules/_statusbar_.statusbar.widget.msg.html#beforeattach',
      classes: 'tsd-kind-variable tsd-parent-kind-module tsd-is-not-exported',
      parent: '"statusBar".StatusBar.Widget.Msg'
    },
    {
      id: 96,
      kind: 32,
      name: 'AfterAttach',
      url: 'modules/_statusbar_.statusbar.widget.msg.html#afterattach',
      classes: 'tsd-kind-variable tsd-parent-kind-module tsd-is-not-exported',
      parent: '"statusBar".StatusBar.Widget.Msg'
    },
    {
      id: 97,
      kind: 32,
      name: 'BeforeDetach',
      url: 'modules/_statusbar_.statusbar.widget.msg.html#beforedetach',
      classes: 'tsd-kind-variable tsd-parent-kind-module tsd-is-not-exported',
      parent: '"statusBar".StatusBar.Widget.Msg'
    },
    {
      id: 98,
      kind: 32,
      name: 'AfterDetach',
      url: 'modules/_statusbar_.statusbar.widget.msg.html#afterdetach',
      classes: 'tsd-kind-variable tsd-parent-kind-module tsd-is-not-exported',
      parent: '"statusBar".StatusBar.Widget.Msg'
    },
    {
      id: 99,
      kind: 32,
      name: 'ParentChanged',
      url: 'modules/_statusbar_.statusbar.widget.msg.html#parentchanged',
      classes: 'tsd-kind-variable tsd-parent-kind-module tsd-is-not-exported',
      parent: '"statusBar".StatusBar.Widget.Msg'
    },
    {
      id: 100,
      kind: 32,
      name: 'UpdateRequest',
      url: 'modules/_statusbar_.statusbar.widget.msg.html#updaterequest',
      classes: 'tsd-kind-variable tsd-parent-kind-module tsd-is-not-exported',
      parent: '"statusBar".StatusBar.Widget.Msg'
    },
    {
      id: 101,
      kind: 32,
      name: 'FitRequest',
      url: 'modules/_statusbar_.statusbar.widget.msg.html#fitrequest',
      classes: 'tsd-kind-variable tsd-parent-kind-module tsd-is-not-exported',
      parent: '"statusBar".StatusBar.Widget.Msg'
    },
    {
      id: 102,
      kind: 32,
      name: 'ActivateRequest',
      url: 'modules/_statusbar_.statusbar.widget.msg.html#activaterequest',
      classes: 'tsd-kind-variable tsd-parent-kind-module tsd-is-not-exported',
      parent: '"statusBar".StatusBar.Widget.Msg'
    },
    {
      id: 103,
      kind: 32,
      name: 'CloseRequest',
      url: 'modules/_statusbar_.statusbar.widget.msg.html#closerequest',
      classes: 'tsd-kind-variable tsd-parent-kind-module tsd-is-not-exported',
      parent: '"statusBar".StatusBar.Widget.Msg'
    },
    {
      id: 104,
      kind: 1024,
      name: 'UnknownSize',
      url:
        'classes/_statusbar_.statusbar.widget.resizemessage.html#unknownsize',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-static tsd-is-not-exported',
      parent: '"statusBar".StatusBar.Widget.ResizeMessage'
    },
    {
      id: 105,
      kind: 64,
      name: 'attach',
      url: 'modules/_statusbar_.statusbar.widget.html#attach',
      classes: 'tsd-kind-function tsd-parent-kind-module tsd-is-not-exported',
      parent: '"statusBar".StatusBar.Widget'
    },
    {
      id: 106,
      kind: 64,
      name: 'detach',
      url: 'modules/_statusbar_.statusbar.widget.html#detach',
      classes: 'tsd-kind-function tsd-parent-kind-module tsd-is-not-exported',
      parent: '"statusBar".StatusBar.Widget'
    },
    {
      id: 107,
      kind: 256,
      name: 'IItemOptions',
      url: 'interfaces/_statusbar_.istatusbar.iitemoptions.html',
      classes: 'tsd-kind-interface tsd-parent-kind-module',
      parent: '"statusBar".IStatusBar'
    },
    {
      id: 108,
      kind: 1024,
      name: 'align',
      url: 'interfaces/_statusbar_.istatusbar.iitemoptions.html#align',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"statusBar".IStatusBar.IItemOptions'
    },
    {
      id: 109,
      kind: 1024,
      name: 'priority',
      url: 'interfaces/_statusbar_.istatusbar.iitemoptions.html#priority',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"statusBar".IStatusBar.IItemOptions'
    },
    {
      id: 110,
      kind: 1024,
      name: 'isActive',
      url: 'interfaces/_statusbar_.istatusbar.iitemoptions.html#isactive',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"statusBar".IStatusBar.IItemOptions'
    },
    {
      id: 111,
      kind: 1024,
      name: 'stateChanged',
      url: 'interfaces/_statusbar_.istatusbar.iitemoptions.html#statechanged',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"statusBar".IStatusBar.IItemOptions'
    },
    {
      id: 112,
      kind: 4194304,
      name: 'Alignment',
      url: 'modules/_statusbar_.istatusbar.html#alignment',
      classes: 'tsd-kind-type-alias tsd-parent-kind-module',
      parent: '"statusBar".IStatusBar'
    },
    {
      id: 113,
      kind: 32,
      name: 'STATUS_BAR_ID',
      url: 'modules/_statusbar_.html#status_bar_id',
      classes:
        'tsd-kind-variable tsd-parent-kind-external-module tsd-is-not-exported',
      parent: '"statusBar"'
    },
    {
      id: 114,
      kind: 256,
      name: 'IRankItem',
      url: 'interfaces/_statusbar_.statusbar.irankitem.html',
      classes: 'tsd-kind-interface tsd-parent-kind-class',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 115,
      kind: 1024,
      name: 'id',
      url: 'interfaces/_statusbar_.statusbar.irankitem.html#id',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"statusBar".StatusBar.IRankItem'
    },
    {
      id: 116,
      kind: 1024,
      name: 'priority',
      url: 'interfaces/_statusbar_.statusbar.irankitem.html#priority',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"statusBar".StatusBar.IRankItem'
    },
    {
      id: 117,
      kind: 256,
      name: 'IOptions',
      url: 'interfaces/_statusbar_.statusbar.ioptions.html',
      classes: 'tsd-kind-interface tsd-parent-kind-class',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 118,
      kind: 1024,
      name: 'host',
      url: 'interfaces/_statusbar_.statusbar.ioptions.html#host',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"statusBar".StatusBar.IOptions'
    },
    {
      id: 119,
      kind: 256,
      name: 'IItem',
      url: 'interfaces/_statusbar_.statusbar.iitem.html',
      classes: 'tsd-kind-interface tsd-parent-kind-class',
      parent: '"statusBar".StatusBar'
    },
    {
      id: 120,
      kind: 1024,
      name: 'align',
      url: 'interfaces/_statusbar_.statusbar.iitem.html#align',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"statusBar".StatusBar.IItem'
    },
    {
      id: 121,
      kind: 1024,
      name: 'priority',
      url: 'interfaces/_statusbar_.statusbar.iitem.html#priority',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"statusBar".StatusBar.IItem'
    },
    {
      id: 122,
      kind: 1024,
      name: 'widget',
      url: 'interfaces/_statusbar_.statusbar.iitem.html#widget',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"statusBar".StatusBar.IItem'
    },
    {
      id: 123,
      kind: 1024,
      name: 'isActive',
      url: 'interfaces/_statusbar_.statusbar.iitem.html#isactive',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"statusBar".StatusBar.IItem'
    },
    {
      id: 124,
      kind: 65536,
      name: '__type',
      url: 'interfaces/_statusbar_.statusbar.iitem.html#isactive.__type',
      classes:
        'tsd-kind-type-literal tsd-parent-kind-property tsd-is-not-exported',
      parent: '"statusBar".StatusBar.IItem.isActive'
    },
    {
      id: 125,
      kind: 1024,
      name: 'stateChanged',
      url: 'interfaces/_statusbar_.statusbar.iitem.html#statechanged',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"statusBar".StatusBar.IItem'
    },
    {
      id: 126,
      kind: 1024,
      name: 'changeCallback',
      url: 'interfaces/_statusbar_.statusbar.iitem.html#changecallback',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"statusBar".StatusBar.IItem'
    },
    {
      id: 127,
      kind: 1,
      name: '"defaults/notebookTrust"',
      url: 'modules/_defaults_notebooktrust_.html',
      classes: 'tsd-kind-external-module'
    },
    {
      id: 128,
      kind: 128,
      name: 'NotebookTrust',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html',
      classes:
        'tsd-kind-class tsd-parent-kind-external-module tsd-is-not-exported',
      parent: '"defaults/notebookTrust"'
    },
    {
      id: 129,
      kind: 512,
      name: 'constructor',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#constructor',
      classes:
        'tsd-kind-constructor tsd-parent-kind-class tsd-is-overwrite tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 130,
      kind: 2048,
      name: '_onNotebookChange',
      url:
        'classes/_defaults_notebooktrust_.notebooktrust.html#_onnotebookchange',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 131,
      kind: 2048,
      name: 'render',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#render',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 132,
      kind: 2048,
      name: 'dispose',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#dispose',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 133,
      kind: 1024,
      name: '_tracker',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#_tracker',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 134,
      kind: 1024,
      name: 'modelChanged',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#modelchanged',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 135,
      kind: 1024,
      name: 'model',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#model-1',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 136,
      kind: 2048,
      name: 'onUpdateRequest',
      url:
        'classes/_defaults_notebooktrust_.notebooktrust.html#onupdaterequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 137,
      kind: 2048,
      name: 'onAfterAttach',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#onafterattach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 138,
      kind: 1024,
      name: 'disposed',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#disposed',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 139,
      kind: 1024,
      name: 'node',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#node',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 140,
      kind: 1024,
      name: 'isDisposed',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#isdisposed',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 141,
      kind: 1024,
      name: 'isAttached',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#isattached',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 142,
      kind: 1024,
      name: 'isHidden',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#ishidden',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 143,
      kind: 1024,
      name: 'isVisible',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#isvisible',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 144,
      kind: 1024,
      name: 'title',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#title',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 145,
      kind: 1024,
      name: 'id',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#id',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 146,
      kind: 1024,
      name: 'dataset',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#dataset',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 147,
      kind: 1024,
      name: 'parent',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#parent',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 148,
      kind: 1024,
      name: 'layout',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#layout',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 149,
      kind: 2048,
      name: 'children',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#children',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 150,
      kind: 2048,
      name: 'contains',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#contains',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 151,
      kind: 2048,
      name: 'hasClass',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#hasclass',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 152,
      kind: 2048,
      name: 'addClass',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#addclass',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 153,
      kind: 2048,
      name: 'removeClass',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#removeclass',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 154,
      kind: 2048,
      name: 'toggleClass',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#toggleclass',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 155,
      kind: 2048,
      name: 'update',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#update',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 156,
      kind: 2048,
      name: 'fit',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#fit',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 157,
      kind: 2048,
      name: 'activate',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#activate',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 158,
      kind: 2048,
      name: 'close',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#close',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 159,
      kind: 2048,
      name: 'show',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#show',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 160,
      kind: 2048,
      name: 'hide',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#hide',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 161,
      kind: 2048,
      name: 'setHidden',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#sethidden',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 162,
      kind: 2048,
      name: 'testFlag',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#testflag',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 163,
      kind: 2048,
      name: 'setFlag',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#setflag',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 164,
      kind: 2048,
      name: 'clearFlag',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#clearflag',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 165,
      kind: 2048,
      name: 'processMessage',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#processmessage',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 166,
      kind: 2048,
      name: 'notifyLayout',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#notifylayout',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 167,
      kind: 2048,
      name: 'onCloseRequest',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#oncloserequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 168,
      kind: 2048,
      name: 'onResize',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#onresize',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 169,
      kind: 2048,
      name: 'onFitRequest',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#onfitrequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 170,
      kind: 2048,
      name: 'onActivateRequest',
      url:
        'classes/_defaults_notebooktrust_.notebooktrust.html#onactivaterequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 171,
      kind: 2048,
      name: 'onBeforeShow',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#onbeforeshow',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 172,
      kind: 2048,
      name: 'onAfterShow',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#onaftershow',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 173,
      kind: 2048,
      name: 'onBeforeHide',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#onbeforehide',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 174,
      kind: 2048,
      name: 'onAfterHide',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#onafterhide',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 175,
      kind: 2048,
      name: 'onBeforeAttach',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#onbeforeattach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 176,
      kind: 2048,
      name: 'onBeforeDetach',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#onbeforedetach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 177,
      kind: 2048,
      name: 'onAfterDetach',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#onafterdetach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 178,
      kind: 2048,
      name: 'onChildAdded',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#onchildadded',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 179,
      kind: 2048,
      name: 'onChildRemoved',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.html#onchildremoved',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 180,
      kind: 2,
      name: 'VDomRenderer',
      url: 'modules/_defaults_notebooktrust_.notebooktrust.vdomrenderer.html',
      classes: 'tsd-kind-module tsd-parent-kind-class',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 181,
      kind: 256,
      name: 'IModel',
      url:
        'interfaces/_defaults_notebooktrust_.notebooktrust.vdomrenderer.imodel.html',
      classes: 'tsd-kind-interface tsd-parent-kind-module tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust.VDomRenderer'
    },
    {
      id: 182,
      kind: 1024,
      name: 'stateChanged',
      url:
        'interfaces/_defaults_notebooktrust_.notebooktrust.vdomrenderer.imodel.html#statechanged',
      classes:
        'tsd-kind-property tsd-parent-kind-interface tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust.VDomRenderer.IModel'
    },
    {
      id: 183,
      kind: 1024,
      name: 'isDisposed',
      url:
        'interfaces/_defaults_notebooktrust_.notebooktrust.vdomrenderer.imodel.html#isdisposed',
      classes:
        'tsd-kind-property tsd-parent-kind-interface tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust.VDomRenderer.IModel'
    },
    {
      id: 184,
      kind: 2048,
      name: 'dispose',
      url:
        'interfaces/_defaults_notebooktrust_.notebooktrust.vdomrenderer.imodel.html#dispose',
      classes:
        'tsd-kind-method tsd-parent-kind-interface tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/notebookTrust".NotebookTrust.VDomRenderer.IModel'
    },
    {
      id: 185,
      kind: 2,
      name: 'INotebookTrust',
      url: 'modules/_defaults_notebooktrust_.inotebooktrust.html',
      classes: 'tsd-kind-module tsd-parent-kind-external-module',
      parent: '"defaults/notebookTrust"'
    },
    {
      id: 186,
      kind: 1024,
      name: 'model',
      url: 'modules/_defaults_notebooktrust_.inotebooktrust.html#model',
      classes: 'tsd-kind-property tsd-parent-kind-module',
      parent: '"defaults/notebookTrust".INotebookTrust'
    },
    {
      id: 187,
      kind: 1024,
      name: 'modelChanged',
      url: 'modules/_defaults_notebooktrust_.inotebooktrust.html#modelchanged',
      classes: 'tsd-kind-property tsd-parent-kind-module',
      parent: '"defaults/notebookTrust".INotebookTrust'
    },
    {
      id: 188,
      kind: 1024,
      name: 'isDisposed',
      url: 'modules/_defaults_notebooktrust_.inotebooktrust.html#isdisposed',
      classes: 'tsd-kind-property tsd-parent-kind-module tsd-is-inherited',
      parent: '"defaults/notebookTrust".INotebookTrust'
    },
    {
      id: 189,
      kind: 2048,
      name: 'dispose',
      url: 'modules/_defaults_notebooktrust_.inotebooktrust.html#dispose',
      classes: 'tsd-kind-method tsd-parent-kind-module tsd-is-inherited',
      parent: '"defaults/notebookTrust".INotebookTrust'
    },
    {
      id: 190,
      kind: 64,
      name: 'cellStatus',
      url: 'modules/_defaults_notebooktrust_.html#cellstatus',
      classes: 'tsd-kind-function tsd-parent-kind-external-module',
      parent: '"defaults/notebookTrust"'
    },
    {
      id: 191,
      kind: 2,
      name: 'NotebookTrustComponent',
      url: 'modules/_defaults_notebooktrust_.notebooktrustcomponent.html',
      classes:
        'tsd-kind-module tsd-parent-kind-external-module tsd-is-not-exported',
      parent: '"defaults/notebookTrust"'
    },
    {
      id: 192,
      kind: 256,
      name: 'IProps',
      url:
        'interfaces/_defaults_notebooktrust_.notebooktrustcomponent.iprops.html',
      classes: 'tsd-kind-interface tsd-parent-kind-module',
      parent: '"defaults/notebookTrust".NotebookTrustComponent'
    },
    {
      id: 193,
      kind: 1024,
      name: 'allCellsTrusted',
      url:
        'interfaces/_defaults_notebooktrust_.notebooktrustcomponent.iprops.html#allcellstrusted',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/notebookTrust".NotebookTrustComponent.IProps'
    },
    {
      id: 194,
      kind: 1024,
      name: 'activeCellTrusted',
      url:
        'interfaces/_defaults_notebooktrust_.notebooktrustcomponent.iprops.html#activecelltrusted',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/notebookTrust".NotebookTrustComponent.IProps'
    },
    {
      id: 195,
      kind: 1024,
      name: 'totalCells',
      url:
        'interfaces/_defaults_notebooktrust_.notebooktrustcomponent.iprops.html#totalcells',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/notebookTrust".NotebookTrustComponent.IProps'
    },
    {
      id: 196,
      kind: 1024,
      name: 'trustedCells',
      url:
        'interfaces/_defaults_notebooktrust_.notebooktrustcomponent.iprops.html#trustedcells',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/notebookTrust".NotebookTrustComponent.IProps'
    },
    {
      id: 197,
      kind: 128,
      name: 'Model',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.model.html',
      classes: 'tsd-kind-class tsd-parent-kind-class',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 198,
      kind: 512,
      name: 'constructor',
      url:
        'classes/_defaults_notebooktrust_.notebooktrust.model.html#constructor',
      classes: 'tsd-kind-constructor tsd-parent-kind-class',
      parent: '"defaults/notebookTrust".NotebookTrust.Model'
    },
    {
      id: 199,
      kind: 262144,
      name: 'trustedCells',
      url:
        'classes/_defaults_notebooktrust_.notebooktrust.model.html#trustedcells',
      classes: 'tsd-kind-get-signature tsd-parent-kind-class',
      parent: '"defaults/notebookTrust".NotebookTrust.Model'
    },
    {
      id: 200,
      kind: 262144,
      name: 'totalCells',
      url:
        'classes/_defaults_notebooktrust_.notebooktrust.model.html#totalcells',
      classes: 'tsd-kind-get-signature tsd-parent-kind-class',
      parent: '"defaults/notebookTrust".NotebookTrust.Model'
    },
    {
      id: 201,
      kind: 262144,
      name: 'activeCellTrusted',
      url:
        'classes/_defaults_notebooktrust_.notebooktrust.model.html#activecelltrusted',
      classes: 'tsd-kind-get-signature tsd-parent-kind-class',
      parent: '"defaults/notebookTrust".NotebookTrust.Model'
    },
    {
      id: 202,
      kind: 262144,
      name: 'notebook',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.model.html#notebook',
      classes: 'tsd-kind-accessor tsd-parent-kind-class',
      parent: '"defaults/notebookTrust".NotebookTrust.Model'
    },
    {
      id: 203,
      kind: 2048,
      name: '_onModelChanged',
      url:
        'classes/_defaults_notebooktrust_.notebooktrust.model.html#_onmodelchanged',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/notebookTrust".NotebookTrust.Model'
    },
    {
      id: 204,
      kind: 2048,
      name: '_onActiveCellChanged',
      url:
        'classes/_defaults_notebooktrust_.notebooktrust.model.html#_onactivecellchanged',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/notebookTrust".NotebookTrust.Model'
    },
    {
      id: 205,
      kind: 2048,
      name: '_deriveCellTrustState',
      url:
        'classes/_defaults_notebooktrust_.notebooktrust.model.html#_derivecelltruststate',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/notebookTrust".NotebookTrust.Model'
    },
    {
      id: 206,
      kind: 2048,
      name: '_getAllState',
      url:
        'classes/_defaults_notebooktrust_.notebooktrust.model.html#_getallstate',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/notebookTrust".NotebookTrust.Model'
    },
    {
      id: 207,
      kind: 2048,
      name: '_triggerChange',
      url:
        'classes/_defaults_notebooktrust_.notebooktrust.model.html#_triggerchange',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/notebookTrust".NotebookTrust.Model'
    },
    {
      id: 208,
      kind: 1024,
      name: '_trustedCells',
      url:
        'classes/_defaults_notebooktrust_.notebooktrust.model.html#_trustedcells',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/notebookTrust".NotebookTrust.Model'
    },
    {
      id: 209,
      kind: 1024,
      name: '_totalCells',
      url:
        'classes/_defaults_notebooktrust_.notebooktrust.model.html#_totalcells',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/notebookTrust".NotebookTrust.Model'
    },
    {
      id: 210,
      kind: 1024,
      name: '_activeCellTrusted',
      url:
        'classes/_defaults_notebooktrust_.notebooktrust.model.html#_activecelltrusted',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/notebookTrust".NotebookTrust.Model'
    },
    {
      id: 211,
      kind: 1024,
      name: '_notebook',
      url:
        'classes/_defaults_notebooktrust_.notebooktrust.model.html#_notebook',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/notebookTrust".NotebookTrust.Model'
    },
    {
      id: 212,
      kind: 1024,
      name: 'stateChanged',
      url:
        'classes/_defaults_notebooktrust_.notebooktrust.model.html#statechanged',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-inherited',
      parent: '"defaults/notebookTrust".NotebookTrust.Model'
    },
    {
      id: 213,
      kind: 1024,
      name: 'isDisposed',
      url:
        'classes/_defaults_notebooktrust_.notebooktrust.model.html#isdisposed',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-inherited',
      parent: '"defaults/notebookTrust".NotebookTrust.Model'
    },
    {
      id: 214,
      kind: 2048,
      name: 'dispose',
      url: 'classes/_defaults_notebooktrust_.notebooktrust.model.html#dispose',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-inherited',
      parent: '"defaults/notebookTrust".NotebookTrust.Model'
    },
    {
      id: 215,
      kind: 256,
      name: 'IOptions',
      url: 'interfaces/_defaults_notebooktrust_.notebooktrust.ioptions.html',
      classes: 'tsd-kind-interface tsd-parent-kind-class',
      parent: '"defaults/notebookTrust".NotebookTrust'
    },
    {
      id: 216,
      kind: 1024,
      name: 'tracker',
      url:
        'interfaces/_defaults_notebooktrust_.notebooktrust.ioptions.html#tracker',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/notebookTrust".NotebookTrust.IOptions'
    },
    {
      id: 217,
      kind: 256,
      name: 'IModel',
      url: 'interfaces/_defaults_notebooktrust_.inotebooktrust.imodel.html',
      classes: 'tsd-kind-interface tsd-parent-kind-module',
      parent: '"defaults/notebookTrust".INotebookTrust'
    },
    {
      id: 218,
      kind: 1024,
      name: 'trustedCells',
      url:
        'interfaces/_defaults_notebooktrust_.inotebooktrust.imodel.html#trustedcells',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/notebookTrust".INotebookTrust.IModel'
    },
    {
      id: 219,
      kind: 1024,
      name: 'totalCells',
      url:
        'interfaces/_defaults_notebooktrust_.inotebooktrust.imodel.html#totalcells',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/notebookTrust".INotebookTrust.IModel'
    },
    {
      id: 220,
      kind: 1024,
      name: 'activeCellTrusted',
      url:
        'interfaces/_defaults_notebooktrust_.inotebooktrust.imodel.html#activecelltrusted',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/notebookTrust".INotebookTrust.IModel'
    },
    {
      id: 221,
      kind: 1024,
      name: 'notebook',
      url:
        'interfaces/_defaults_notebooktrust_.inotebooktrust.imodel.html#notebook',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/notebookTrust".INotebookTrust.IModel'
    },
    {
      id: 222,
      kind: 2097152,
      name: 'notebookTrustItem',
      url: 'modules/_defaults_notebooktrust_.html#notebooktrustitem',
      classes: 'tsd-kind-object-literal tsd-parent-kind-external-module',
      parent: '"defaults/notebookTrust"'
    },
    {
      id: 223,
      kind: 32,
      name: 'id',
      url: 'modules/_defaults_notebooktrust_.html#notebooktrustitem.id',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/notebookTrust".notebookTrustItem'
    },
    {
      id: 224,
      kind: 32,
      name: 'autoStart',
      url: 'modules/_defaults_notebooktrust_.html#notebooktrustitem.autostart',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/notebookTrust".notebookTrustItem'
    },
    {
      id: 225,
      kind: 32,
      name: 'provides',
      url: 'modules/_defaults_notebooktrust_.html#notebooktrustitem.provides',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/notebookTrust".notebookTrustItem'
    },
    {
      id: 226,
      kind: 32,
      name: 'requires',
      url: 'modules/_defaults_notebooktrust_.html#notebooktrustitem.requires',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/notebookTrust".notebookTrustItem'
    },
    {
      id: 227,
      kind: 64,
      name: 'activate',
      url: 'modules/_defaults_notebooktrust_.html#notebooktrustitem.activate',
      classes: 'tsd-kind-function tsd-parent-kind-object-literal',
      parent: '"defaults/notebookTrust".notebookTrustItem'
    },
    {
      id: 228,
      kind: 1,
      name: '"defaults/lineCol"',
      url: 'modules/_defaults_linecol_.html',
      classes: 'tsd-kind-external-module'
    },
    {
      id: 229,
      kind: 128,
      name: 'LineForm',
      url: 'classes/_defaults_linecol_.lineform.html',
      classes:
        'tsd-kind-class tsd-parent-kind-external-module tsd-is-not-exported',
      parent: '"defaults/lineCol"'
    },
    {
      id: 230,
      kind: 2097152,
      name: 'state',
      url: 'classes/_defaults_linecol_.lineform.html#state',
      classes:
        'tsd-kind-object-literal tsd-parent-kind-class tsd-is-overwrite tsd-is-not-exported',
      parent: '"defaults/lineCol".LineForm'
    },
    {
      id: 231,
      kind: 32,
      name: 'value',
      url: 'classes/_defaults_linecol_.lineform.html#state.value',
      classes:
        'tsd-kind-variable tsd-parent-kind-object-literal tsd-is-not-exported',
      parent: '"defaults/lineCol".LineForm.state'
    },
    {
      id: 232,
      kind: 32,
      name: 'hasFocus',
      url: 'classes/_defaults_linecol_.lineform.html#state.hasfocus',
      classes:
        'tsd-kind-variable tsd-parent-kind-object-literal tsd-is-not-exported',
      parent: '"defaults/lineCol".LineForm.state'
    },
    {
      id: 233,
      kind: 2048,
      name: '_handleChange',
      url: 'classes/_defaults_linecol_.lineform.html#_handlechange',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/lineCol".LineForm'
    },
    {
      id: 234,
      kind: 2048,
      name: '_handleSubmit',
      url: 'classes/_defaults_linecol_.lineform.html#_handlesubmit',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/lineCol".LineForm'
    },
    {
      id: 235,
      kind: 2048,
      name: '_handleFocus',
      url: 'classes/_defaults_linecol_.lineform.html#_handlefocus',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/lineCol".LineForm'
    },
    {
      id: 236,
      kind: 2048,
      name: '_handleBlur',
      url: 'classes/_defaults_linecol_.lineform.html#_handleblur',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/lineCol".LineForm'
    },
    {
      id: 237,
      kind: 2048,
      name: 'componentDidMount',
      url: 'classes/_defaults_linecol_.lineform.html#componentdidmount',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-not-exported',
      parent: '"defaults/lineCol".LineForm'
    },
    {
      id: 238,
      kind: 2048,
      name: 'render',
      url: 'classes/_defaults_linecol_.lineform.html#render',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite tsd-is-not-exported',
      parent: '"defaults/lineCol".LineForm'
    },
    {
      id: 239,
      kind: 1024,
      name: '_textInput',
      url: 'classes/_defaults_linecol_.lineform.html#_textinput',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/lineCol".LineForm'
    },
    {
      id: 240,
      kind: 2048,
      name: 'componentWillMount',
      url: 'classes/_defaults_linecol_.lineform.html#componentwillmount',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-static tsd-is-not-exported',
      parent: '"defaults/lineCol".LineForm'
    },
    {
      id: 241,
      kind: 2048,
      name: 'componentDidMount',
      url: 'classes/_defaults_linecol_.lineform.html#componentdidmount-1',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-static tsd-is-not-exported',
      parent: '"defaults/lineCol".LineForm'
    },
    {
      id: 242,
      kind: 2048,
      name: 'componentWillReceiveProps',
      url: 'classes/_defaults_linecol_.lineform.html#componentwillreceiveprops',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-static tsd-is-not-exported',
      parent: '"defaults/lineCol".LineForm'
    },
    {
      id: 243,
      kind: 2048,
      name: 'shouldComponentUpdate',
      url: 'classes/_defaults_linecol_.lineform.html#shouldcomponentupdate',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-static tsd-is-not-exported',
      parent: '"defaults/lineCol".LineForm'
    },
    {
      id: 244,
      kind: 2048,
      name: 'componentWillUpdate',
      url: 'classes/_defaults_linecol_.lineform.html#componentwillupdate',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-static tsd-is-not-exported',
      parent: '"defaults/lineCol".LineForm'
    },
    {
      id: 245,
      kind: 2048,
      name: 'componentDidUpdate',
      url: 'classes/_defaults_linecol_.lineform.html#componentdidupdate',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-static tsd-is-not-exported',
      parent: '"defaults/lineCol".LineForm'
    },
    {
      id: 246,
      kind: 2048,
      name: 'componentWillUnmount',
      url: 'classes/_defaults_linecol_.lineform.html#componentwillunmount',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-static tsd-is-not-exported',
      parent: '"defaults/lineCol".LineForm'
    },
    {
      id: 247,
      kind: 2048,
      name: 'componentDidCatch',
      url: 'classes/_defaults_linecol_.lineform.html#componentdidcatch',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-static tsd-is-not-exported',
      parent: '"defaults/lineCol".LineForm'
    },
    {
      id: 248,
      kind: 512,
      name: 'constructor',
      url: 'classes/_defaults_linecol_.lineform.html#constructor',
      classes:
        'tsd-kind-constructor tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/lineCol".LineForm'
    },
    {
      id: 249,
      kind: 2048,
      name: 'setState',
      url: 'classes/_defaults_linecol_.lineform.html#setstate',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-has-type-parameter tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/lineCol".LineForm'
    },
    {
      id: 250,
      kind: 2048,
      name: 'forceUpdate',
      url: 'classes/_defaults_linecol_.lineform.html#forceupdate',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/lineCol".LineForm'
    },
    {
      id: 251,
      kind: 1024,
      name: 'props',
      url: 'classes/_defaults_linecol_.lineform.html#props',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/lineCol".LineForm'
    },
    {
      id: 252,
      kind: 1024,
      name: 'context',
      url: 'classes/_defaults_linecol_.lineform.html#context',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/lineCol".LineForm'
    },
    {
      id: 253,
      kind: 1024,
      name: 'refs',
      url: 'classes/_defaults_linecol_.lineform.html#refs',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/lineCol".LineForm'
    },
    {
      id: 254,
      kind: 65536,
      name: '__type',
      url: 'classes/_defaults_linecol_.lineform.html#refs.__type',
      classes:
        'tsd-kind-type-literal tsd-parent-kind-property tsd-is-not-exported',
      parent: '"defaults/lineCol".LineForm.refs'
    },
    {
      id: 255,
      kind: 128,
      name: 'LineCol',
      url: 'classes/_defaults_linecol_.linecol.html',
      classes:
        'tsd-kind-class tsd-parent-kind-external-module tsd-is-not-exported',
      parent: '"defaults/lineCol"'
    },
    {
      id: 256,
      kind: 512,
      name: 'constructor',
      url: 'classes/_defaults_linecol_.linecol.html#constructor',
      classes:
        'tsd-kind-constructor tsd-parent-kind-class tsd-is-overwrite tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 257,
      kind: 2048,
      name: 'render',
      url: 'classes/_defaults_linecol_.linecol.html#render',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 258,
      kind: 2048,
      name: 'dispose',
      url: 'classes/_defaults_linecol_.linecol.html#dispose',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 259,
      kind: 2048,
      name: 'onUpdateRequest',
      url: 'classes/_defaults_linecol_.linecol.html#onupdaterequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 260,
      kind: 2048,
      name: '_handleClick',
      url: 'classes/_defaults_linecol_.linecol.html#_handleclick',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 261,
      kind: 2048,
      name: '_handleSubmit',
      url: 'classes/_defaults_linecol_.linecol.html#_handlesubmit',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 262,
      kind: 2048,
      name: '_onActiveCellChange',
      url: 'classes/_defaults_linecol_.linecol.html#_onactivecellchange',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 263,
      kind: 2048,
      name: '_getFocusedEditor',
      url: 'classes/_defaults_linecol_.linecol.html#_getfocusededitor',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 264,
      kind: 2048,
      name: '_onMainAreaCurrentChange',
      url: 'classes/_defaults_linecol_.linecol.html#_onmainareacurrentchange',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 265,
      kind: 1024,
      name: '_notebookTracker',
      url: 'classes/_defaults_linecol_.linecol.html#_notebooktracker',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 266,
      kind: 1024,
      name: '_editorTracker',
      url: 'classes/_defaults_linecol_.linecol.html#_editortracker',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 267,
      kind: 1024,
      name: '_consoleTracker',
      url: 'classes/_defaults_linecol_.linecol.html#_consoletracker',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 268,
      kind: 1024,
      name: '_shell',
      url: 'classes/_defaults_linecol_.linecol.html#_shell',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 269,
      kind: 1024,
      name: '_popup',
      url: 'classes/_defaults_linecol_.linecol.html#_popup',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 270,
      kind: 1024,
      name: 'modelChanged',
      url: 'classes/_defaults_linecol_.linecol.html#modelchanged',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 271,
      kind: 1024,
      name: 'model',
      url: 'classes/_defaults_linecol_.linecol.html#model-1',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 272,
      kind: 2048,
      name: 'onAfterAttach',
      url: 'classes/_defaults_linecol_.linecol.html#onafterattach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 273,
      kind: 1024,
      name: 'disposed',
      url: 'classes/_defaults_linecol_.linecol.html#disposed',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 274,
      kind: 1024,
      name: 'node',
      url: 'classes/_defaults_linecol_.linecol.html#node',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 275,
      kind: 1024,
      name: 'isDisposed',
      url: 'classes/_defaults_linecol_.linecol.html#isdisposed',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 276,
      kind: 1024,
      name: 'isAttached',
      url: 'classes/_defaults_linecol_.linecol.html#isattached',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 277,
      kind: 1024,
      name: 'isHidden',
      url: 'classes/_defaults_linecol_.linecol.html#ishidden',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 278,
      kind: 1024,
      name: 'isVisible',
      url: 'classes/_defaults_linecol_.linecol.html#isvisible',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 279,
      kind: 1024,
      name: 'title',
      url: 'classes/_defaults_linecol_.linecol.html#title',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 280,
      kind: 1024,
      name: 'id',
      url: 'classes/_defaults_linecol_.linecol.html#id',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 281,
      kind: 1024,
      name: 'dataset',
      url: 'classes/_defaults_linecol_.linecol.html#dataset',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 282,
      kind: 1024,
      name: 'parent',
      url: 'classes/_defaults_linecol_.linecol.html#parent',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 283,
      kind: 1024,
      name: 'layout',
      url: 'classes/_defaults_linecol_.linecol.html#layout',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 284,
      kind: 2048,
      name: 'children',
      url: 'classes/_defaults_linecol_.linecol.html#children',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 285,
      kind: 2048,
      name: 'contains',
      url: 'classes/_defaults_linecol_.linecol.html#contains',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 286,
      kind: 2048,
      name: 'hasClass',
      url: 'classes/_defaults_linecol_.linecol.html#hasclass',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 287,
      kind: 2048,
      name: 'addClass',
      url: 'classes/_defaults_linecol_.linecol.html#addclass',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 288,
      kind: 2048,
      name: 'removeClass',
      url: 'classes/_defaults_linecol_.linecol.html#removeclass',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 289,
      kind: 2048,
      name: 'toggleClass',
      url: 'classes/_defaults_linecol_.linecol.html#toggleclass',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 290,
      kind: 2048,
      name: 'update',
      url: 'classes/_defaults_linecol_.linecol.html#update',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 291,
      kind: 2048,
      name: 'fit',
      url: 'classes/_defaults_linecol_.linecol.html#fit',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 292,
      kind: 2048,
      name: 'activate',
      url: 'classes/_defaults_linecol_.linecol.html#activate',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 293,
      kind: 2048,
      name: 'close',
      url: 'classes/_defaults_linecol_.linecol.html#close',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 294,
      kind: 2048,
      name: 'show',
      url: 'classes/_defaults_linecol_.linecol.html#show',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 295,
      kind: 2048,
      name: 'hide',
      url: 'classes/_defaults_linecol_.linecol.html#hide',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 296,
      kind: 2048,
      name: 'setHidden',
      url: 'classes/_defaults_linecol_.linecol.html#sethidden',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 297,
      kind: 2048,
      name: 'testFlag',
      url: 'classes/_defaults_linecol_.linecol.html#testflag',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 298,
      kind: 2048,
      name: 'setFlag',
      url: 'classes/_defaults_linecol_.linecol.html#setflag',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 299,
      kind: 2048,
      name: 'clearFlag',
      url: 'classes/_defaults_linecol_.linecol.html#clearflag',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 300,
      kind: 2048,
      name: 'processMessage',
      url: 'classes/_defaults_linecol_.linecol.html#processmessage',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 301,
      kind: 2048,
      name: 'notifyLayout',
      url: 'classes/_defaults_linecol_.linecol.html#notifylayout',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 302,
      kind: 2048,
      name: 'onCloseRequest',
      url: 'classes/_defaults_linecol_.linecol.html#oncloserequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 303,
      kind: 2048,
      name: 'onResize',
      url: 'classes/_defaults_linecol_.linecol.html#onresize',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 304,
      kind: 2048,
      name: 'onFitRequest',
      url: 'classes/_defaults_linecol_.linecol.html#onfitrequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 305,
      kind: 2048,
      name: 'onActivateRequest',
      url: 'classes/_defaults_linecol_.linecol.html#onactivaterequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 306,
      kind: 2048,
      name: 'onBeforeShow',
      url: 'classes/_defaults_linecol_.linecol.html#onbeforeshow',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 307,
      kind: 2048,
      name: 'onAfterShow',
      url: 'classes/_defaults_linecol_.linecol.html#onaftershow',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 308,
      kind: 2048,
      name: 'onBeforeHide',
      url: 'classes/_defaults_linecol_.linecol.html#onbeforehide',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 309,
      kind: 2048,
      name: 'onAfterHide',
      url: 'classes/_defaults_linecol_.linecol.html#onafterhide',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 310,
      kind: 2048,
      name: 'onBeforeAttach',
      url: 'classes/_defaults_linecol_.linecol.html#onbeforeattach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 311,
      kind: 2048,
      name: 'onBeforeDetach',
      url: 'classes/_defaults_linecol_.linecol.html#onbeforedetach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 312,
      kind: 2048,
      name: 'onAfterDetach',
      url: 'classes/_defaults_linecol_.linecol.html#onafterdetach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 313,
      kind: 2048,
      name: 'onChildAdded',
      url: 'classes/_defaults_linecol_.linecol.html#onchildadded',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 314,
      kind: 2048,
      name: 'onChildRemoved',
      url: 'classes/_defaults_linecol_.linecol.html#onchildremoved',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 315,
      kind: 2,
      name: 'VDomRenderer',
      url: 'modules/_defaults_linecol_.linecol.vdomrenderer.html',
      classes: 'tsd-kind-module tsd-parent-kind-class',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 316,
      kind: 256,
      name: 'IModel',
      url: 'interfaces/_defaults_linecol_.linecol.vdomrenderer.imodel.html',
      classes: 'tsd-kind-interface tsd-parent-kind-module tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol.VDomRenderer'
    },
    {
      id: 317,
      kind: 1024,
      name: 'stateChanged',
      url:
        'interfaces/_defaults_linecol_.linecol.vdomrenderer.imodel.html#statechanged',
      classes:
        'tsd-kind-property tsd-parent-kind-interface tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol.VDomRenderer.IModel'
    },
    {
      id: 318,
      kind: 1024,
      name: 'isDisposed',
      url:
        'interfaces/_defaults_linecol_.linecol.vdomrenderer.imodel.html#isdisposed',
      classes:
        'tsd-kind-property tsd-parent-kind-interface tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol.VDomRenderer.IModel'
    },
    {
      id: 319,
      kind: 2048,
      name: 'dispose',
      url:
        'interfaces/_defaults_linecol_.linecol.vdomrenderer.imodel.html#dispose',
      classes:
        'tsd-kind-method tsd-parent-kind-interface tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/lineCol".LineCol.VDomRenderer.IModel'
    },
    {
      id: 320,
      kind: 2,
      name: 'ILineCol',
      url: 'modules/_defaults_linecol_.ilinecol.html',
      classes: 'tsd-kind-module tsd-parent-kind-external-module',
      parent: '"defaults/lineCol"'
    },
    {
      id: 321,
      kind: 1024,
      name: 'model',
      url: 'modules/_defaults_linecol_.ilinecol.html#model',
      classes: 'tsd-kind-property tsd-parent-kind-module',
      parent: '"defaults/lineCol".ILineCol'
    },
    {
      id: 322,
      kind: 1024,
      name: 'modelChanged',
      url: 'modules/_defaults_linecol_.ilinecol.html#modelchanged',
      classes: 'tsd-kind-property tsd-parent-kind-module',
      parent: '"defaults/lineCol".ILineCol'
    },
    {
      id: 323,
      kind: 1024,
      name: 'isDisposed',
      url: 'modules/_defaults_linecol_.ilinecol.html#isdisposed',
      classes: 'tsd-kind-property tsd-parent-kind-module tsd-is-inherited',
      parent: '"defaults/lineCol".ILineCol'
    },
    {
      id: 324,
      kind: 2048,
      name: 'dispose',
      url: 'modules/_defaults_linecol_.ilinecol.html#dispose',
      classes: 'tsd-kind-method tsd-parent-kind-module tsd-is-inherited',
      parent: '"defaults/lineCol".ILineCol'
    },
    {
      id: 325,
      kind: 256,
      name: 'IProps',
      url: 'interfaces/_defaults_linecol_.lineform.iprops.html',
      classes: 'tsd-kind-interface tsd-parent-kind-class',
      parent: '"defaults/lineCol".LineForm'
    },
    {
      id: 326,
      kind: 1024,
      name: 'handleSubmit',
      url: 'interfaces/_defaults_linecol_.lineform.iprops.html#handlesubmit',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/lineCol".LineForm.IProps'
    },
    {
      id: 327,
      kind: 65536,
      name: '__type',
      url:
        'interfaces/_defaults_linecol_.lineform.iprops.html#handlesubmit.__type',
      classes:
        'tsd-kind-type-literal tsd-parent-kind-property tsd-is-not-exported',
      parent: '"defaults/lineCol".LineForm.IProps.handleSubmit'
    },
    {
      id: 328,
      kind: 1024,
      name: 'currentLine',
      url: 'interfaces/_defaults_linecol_.lineform.iprops.html#currentline',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/lineCol".LineForm.IProps'
    },
    {
      id: 329,
      kind: 1024,
      name: 'maxLine',
      url: 'interfaces/_defaults_linecol_.lineform.iprops.html#maxline',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/lineCol".LineForm.IProps'
    },
    {
      id: 330,
      kind: 256,
      name: 'IState',
      url: 'interfaces/_defaults_linecol_.lineform.istate.html',
      classes: 'tsd-kind-interface tsd-parent-kind-class',
      parent: '"defaults/lineCol".LineForm'
    },
    {
      id: 331,
      kind: 1024,
      name: 'value',
      url: 'interfaces/_defaults_linecol_.lineform.istate.html#value',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/lineCol".LineForm.IState'
    },
    {
      id: 332,
      kind: 1024,
      name: 'hasFocus',
      url: 'interfaces/_defaults_linecol_.lineform.istate.html#hasfocus',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/lineCol".LineForm.IState'
    },
    {
      id: 333,
      kind: 64,
      name: 'LineColComponent',
      url: 'modules/_defaults_linecol_.html#linecolcomponent',
      classes:
        'tsd-kind-function tsd-parent-kind-external-module tsd-is-not-exported',
      parent: '"defaults/lineCol"'
    },
    {
      id: 334,
      kind: 256,
      name: 'IProps',
      url: 'modules/_defaults_linecol_.html#linecolcomponent.iprops',
      classes: 'tsd-kind-interface tsd-parent-kind-function',
      parent: '"defaults/lineCol".LineColComponent'
    },
    {
      id: 335,
      kind: 1024,
      name: 'line',
      url: 'modules/_defaults_linecol_.html#linecolcomponent.iprops.line',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/lineCol".LineColComponent.IProps'
    },
    {
      id: 336,
      kind: 1024,
      name: 'column',
      url: 'modules/_defaults_linecol_.html#linecolcomponent.iprops.column',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/lineCol".LineColComponent.IProps'
    },
    {
      id: 337,
      kind: 1024,
      name: 'handleClick',
      url:
        'modules/_defaults_linecol_.html#linecolcomponent.iprops.handleclick',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/lineCol".LineColComponent.IProps'
    },
    {
      id: 338,
      kind: 65536,
      name: '__type',
      url:
        'modules/_defaults_linecol_.html#linecolcomponent.iprops.handleclick.__type',
      classes:
        'tsd-kind-type-literal tsd-parent-kind-property tsd-is-not-exported',
      parent: '"defaults/lineCol".LineColComponent.IProps.handleClick'
    },
    {
      id: 339,
      kind: 128,
      name: 'Model',
      url: 'classes/_defaults_linecol_.linecol.model.html',
      classes: 'tsd-kind-class tsd-parent-kind-class',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 340,
      kind: 512,
      name: 'constructor',
      url: 'classes/_defaults_linecol_.linecol.model.html#constructor',
      classes: 'tsd-kind-constructor tsd-parent-kind-class',
      parent: '"defaults/lineCol".LineCol.Model'
    },
    {
      id: 341,
      kind: 262144,
      name: 'editor',
      url: 'classes/_defaults_linecol_.linecol.model.html#editor',
      classes: 'tsd-kind-accessor tsd-parent-kind-class',
      parent: '"defaults/lineCol".LineCol.Model'
    },
    {
      id: 342,
      kind: 262144,
      name: 'line',
      url: 'classes/_defaults_linecol_.linecol.model.html#line',
      classes: 'tsd-kind-get-signature tsd-parent-kind-class',
      parent: '"defaults/lineCol".LineCol.Model'
    },
    {
      id: 343,
      kind: 262144,
      name: 'column',
      url: 'classes/_defaults_linecol_.linecol.model.html#column',
      classes: 'tsd-kind-get-signature tsd-parent-kind-class',
      parent: '"defaults/lineCol".LineCol.Model'
    },
    {
      id: 344,
      kind: 2048,
      name: '_onSelectionChanged',
      url: 'classes/_defaults_linecol_.linecol.model.html#_onselectionchanged',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/lineCol".LineCol.Model'
    },
    {
      id: 345,
      kind: 2048,
      name: '_getAllState',
      url: 'classes/_defaults_linecol_.linecol.model.html#_getallstate',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/lineCol".LineCol.Model'
    },
    {
      id: 346,
      kind: 2048,
      name: '_triggerChange',
      url: 'classes/_defaults_linecol_.linecol.model.html#_triggerchange',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/lineCol".LineCol.Model'
    },
    {
      id: 347,
      kind: 1024,
      name: '_line',
      url: 'classes/_defaults_linecol_.linecol.model.html#_line',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/lineCol".LineCol.Model'
    },
    {
      id: 348,
      kind: 1024,
      name: '_column',
      url: 'classes/_defaults_linecol_.linecol.model.html#_column',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/lineCol".LineCol.Model'
    },
    {
      id: 349,
      kind: 1024,
      name: '_editor',
      url: 'classes/_defaults_linecol_.linecol.model.html#_editor',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/lineCol".LineCol.Model'
    },
    {
      id: 350,
      kind: 1024,
      name: 'stateChanged',
      url: 'classes/_defaults_linecol_.linecol.model.html#statechanged',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-inherited',
      parent: '"defaults/lineCol".LineCol.Model'
    },
    {
      id: 351,
      kind: 1024,
      name: 'isDisposed',
      url: 'classes/_defaults_linecol_.linecol.model.html#isdisposed',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-inherited',
      parent: '"defaults/lineCol".LineCol.Model'
    },
    {
      id: 352,
      kind: 2048,
      name: 'dispose',
      url: 'classes/_defaults_linecol_.linecol.model.html#dispose',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-inherited',
      parent: '"defaults/lineCol".LineCol.Model'
    },
    {
      id: 353,
      kind: 256,
      name: 'IOptions',
      url: 'interfaces/_defaults_linecol_.linecol.ioptions.html',
      classes: 'tsd-kind-interface tsd-parent-kind-class',
      parent: '"defaults/lineCol".LineCol'
    },
    {
      id: 354,
      kind: 1024,
      name: 'notebookTracker',
      url:
        'interfaces/_defaults_linecol_.linecol.ioptions.html#notebooktracker',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/lineCol".LineCol.IOptions'
    },
    {
      id: 355,
      kind: 1024,
      name: 'editorTracker',
      url: 'interfaces/_defaults_linecol_.linecol.ioptions.html#editortracker',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/lineCol".LineCol.IOptions'
    },
    {
      id: 356,
      kind: 1024,
      name: 'consoleTracker',
      url: 'interfaces/_defaults_linecol_.linecol.ioptions.html#consoletracker',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/lineCol".LineCol.IOptions'
    },
    {
      id: 357,
      kind: 1024,
      name: 'shell',
      url: 'interfaces/_defaults_linecol_.linecol.ioptions.html#shell',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/lineCol".LineCol.IOptions'
    },
    {
      id: 358,
      kind: 256,
      name: 'IModel',
      url: 'interfaces/_defaults_linecol_.ilinecol.imodel.html',
      classes: 'tsd-kind-interface tsd-parent-kind-module',
      parent: '"defaults/lineCol".ILineCol'
    },
    {
      id: 359,
      kind: 1024,
      name: 'line',
      url: 'interfaces/_defaults_linecol_.ilinecol.imodel.html#line',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/lineCol".ILineCol.IModel'
    },
    {
      id: 360,
      kind: 1024,
      name: 'column',
      url: 'interfaces/_defaults_linecol_.ilinecol.imodel.html#column',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/lineCol".ILineCol.IModel'
    },
    {
      id: 361,
      kind: 1024,
      name: 'editor',
      url: 'interfaces/_defaults_linecol_.ilinecol.imodel.html#editor',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/lineCol".ILineCol.IModel'
    },
    {
      id: 362,
      kind: 2097152,
      name: 'lineColItem',
      url: 'modules/_defaults_linecol_.html#linecolitem',
      classes: 'tsd-kind-object-literal tsd-parent-kind-external-module',
      parent: '"defaults/lineCol"'
    },
    {
      id: 363,
      kind: 32,
      name: 'id',
      url: 'modules/_defaults_linecol_.html#linecolitem.id',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/lineCol".lineColItem'
    },
    {
      id: 364,
      kind: 32,
      name: 'autoStart',
      url: 'modules/_defaults_linecol_.html#linecolitem.autostart',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/lineCol".lineColItem'
    },
    {
      id: 365,
      kind: 32,
      name: 'provides',
      url: 'modules/_defaults_linecol_.html#linecolitem.provides',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/lineCol".lineColItem'
    },
    {
      id: 366,
      kind: 32,
      name: 'requires',
      url: 'modules/_defaults_linecol_.html#linecolitem.requires',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/lineCol".lineColItem'
    },
    {
      id: 367,
      kind: 64,
      name: 'activate',
      url: 'modules/_defaults_linecol_.html#linecolitem.activate',
      classes: 'tsd-kind-function tsd-parent-kind-object-literal',
      parent: '"defaults/lineCol".lineColItem'
    },
    {
      id: 368,
      kind: 1,
      name: '"defaults/fileUpload"',
      url: 'modules/_defaults_fileupload_.html',
      classes: 'tsd-kind-external-module'
    },
    {
      id: 369,
      kind: 128,
      name: 'FileUpload',
      url: 'classes/_defaults_fileupload_.fileupload.html',
      classes:
        'tsd-kind-class tsd-parent-kind-external-module tsd-is-not-exported',
      parent: '"defaults/fileUpload"'
    },
    {
      id: 370,
      kind: 512,
      name: 'constructor',
      url: 'classes/_defaults_fileupload_.fileupload.html#constructor',
      classes:
        'tsd-kind-constructor tsd-parent-kind-class tsd-is-overwrite tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 371,
      kind: 2048,
      name: 'render',
      url: 'classes/_defaults_fileupload_.fileupload.html#render',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 372,
      kind: 2048,
      name: 'dispose',
      url: 'classes/_defaults_fileupload_.fileupload.html#dispose',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 373,
      kind: 2048,
      name: '_onBrowserChange',
      url: 'classes/_defaults_fileupload_.fileupload.html#_onbrowserchange',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 374,
      kind: 1024,
      name: '_tracker',
      url: 'classes/_defaults_fileupload_.fileupload.html#_tracker',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 375,
      kind: 1024,
      name: 'modelChanged',
      url: 'classes/_defaults_fileupload_.fileupload.html#modelchanged',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 376,
      kind: 1024,
      name: 'model',
      url: 'classes/_defaults_fileupload_.fileupload.html#model-1',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 377,
      kind: 2048,
      name: 'onUpdateRequest',
      url: 'classes/_defaults_fileupload_.fileupload.html#onupdaterequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 378,
      kind: 2048,
      name: 'onAfterAttach',
      url: 'classes/_defaults_fileupload_.fileupload.html#onafterattach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 379,
      kind: 1024,
      name: 'disposed',
      url: 'classes/_defaults_fileupload_.fileupload.html#disposed',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 380,
      kind: 1024,
      name: 'node',
      url: 'classes/_defaults_fileupload_.fileupload.html#node',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 381,
      kind: 1024,
      name: 'isDisposed',
      url: 'classes/_defaults_fileupload_.fileupload.html#isdisposed',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 382,
      kind: 1024,
      name: 'isAttached',
      url: 'classes/_defaults_fileupload_.fileupload.html#isattached',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 383,
      kind: 1024,
      name: 'isHidden',
      url: 'classes/_defaults_fileupload_.fileupload.html#ishidden',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 384,
      kind: 1024,
      name: 'isVisible',
      url: 'classes/_defaults_fileupload_.fileupload.html#isvisible',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 385,
      kind: 1024,
      name: 'title',
      url: 'classes/_defaults_fileupload_.fileupload.html#title',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 386,
      kind: 1024,
      name: 'id',
      url: 'classes/_defaults_fileupload_.fileupload.html#id',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 387,
      kind: 1024,
      name: 'dataset',
      url: 'classes/_defaults_fileupload_.fileupload.html#dataset',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 388,
      kind: 1024,
      name: 'parent',
      url: 'classes/_defaults_fileupload_.fileupload.html#parent',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 389,
      kind: 1024,
      name: 'layout',
      url: 'classes/_defaults_fileupload_.fileupload.html#layout',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 390,
      kind: 2048,
      name: 'children',
      url: 'classes/_defaults_fileupload_.fileupload.html#children',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 391,
      kind: 2048,
      name: 'contains',
      url: 'classes/_defaults_fileupload_.fileupload.html#contains',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 392,
      kind: 2048,
      name: 'hasClass',
      url: 'classes/_defaults_fileupload_.fileupload.html#hasclass',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 393,
      kind: 2048,
      name: 'addClass',
      url: 'classes/_defaults_fileupload_.fileupload.html#addclass',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 394,
      kind: 2048,
      name: 'removeClass',
      url: 'classes/_defaults_fileupload_.fileupload.html#removeclass',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 395,
      kind: 2048,
      name: 'toggleClass',
      url: 'classes/_defaults_fileupload_.fileupload.html#toggleclass',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 396,
      kind: 2048,
      name: 'update',
      url: 'classes/_defaults_fileupload_.fileupload.html#update',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 397,
      kind: 2048,
      name: 'fit',
      url: 'classes/_defaults_fileupload_.fileupload.html#fit',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 398,
      kind: 2048,
      name: 'activate',
      url: 'classes/_defaults_fileupload_.fileupload.html#activate',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 399,
      kind: 2048,
      name: 'close',
      url: 'classes/_defaults_fileupload_.fileupload.html#close',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 400,
      kind: 2048,
      name: 'show',
      url: 'classes/_defaults_fileupload_.fileupload.html#show',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 401,
      kind: 2048,
      name: 'hide',
      url: 'classes/_defaults_fileupload_.fileupload.html#hide',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 402,
      kind: 2048,
      name: 'setHidden',
      url: 'classes/_defaults_fileupload_.fileupload.html#sethidden',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 403,
      kind: 2048,
      name: 'testFlag',
      url: 'classes/_defaults_fileupload_.fileupload.html#testflag',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 404,
      kind: 2048,
      name: 'setFlag',
      url: 'classes/_defaults_fileupload_.fileupload.html#setflag',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 405,
      kind: 2048,
      name: 'clearFlag',
      url: 'classes/_defaults_fileupload_.fileupload.html#clearflag',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 406,
      kind: 2048,
      name: 'processMessage',
      url: 'classes/_defaults_fileupload_.fileupload.html#processmessage',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 407,
      kind: 2048,
      name: 'notifyLayout',
      url: 'classes/_defaults_fileupload_.fileupload.html#notifylayout',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 408,
      kind: 2048,
      name: 'onCloseRequest',
      url: 'classes/_defaults_fileupload_.fileupload.html#oncloserequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 409,
      kind: 2048,
      name: 'onResize',
      url: 'classes/_defaults_fileupload_.fileupload.html#onresize',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 410,
      kind: 2048,
      name: 'onFitRequest',
      url: 'classes/_defaults_fileupload_.fileupload.html#onfitrequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 411,
      kind: 2048,
      name: 'onActivateRequest',
      url: 'classes/_defaults_fileupload_.fileupload.html#onactivaterequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 412,
      kind: 2048,
      name: 'onBeforeShow',
      url: 'classes/_defaults_fileupload_.fileupload.html#onbeforeshow',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 413,
      kind: 2048,
      name: 'onAfterShow',
      url: 'classes/_defaults_fileupload_.fileupload.html#onaftershow',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 414,
      kind: 2048,
      name: 'onBeforeHide',
      url: 'classes/_defaults_fileupload_.fileupload.html#onbeforehide',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 415,
      kind: 2048,
      name: 'onAfterHide',
      url: 'classes/_defaults_fileupload_.fileupload.html#onafterhide',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 416,
      kind: 2048,
      name: 'onBeforeAttach',
      url: 'classes/_defaults_fileupload_.fileupload.html#onbeforeattach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 417,
      kind: 2048,
      name: 'onBeforeDetach',
      url: 'classes/_defaults_fileupload_.fileupload.html#onbeforedetach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 418,
      kind: 2048,
      name: 'onAfterDetach',
      url: 'classes/_defaults_fileupload_.fileupload.html#onafterdetach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 419,
      kind: 2048,
      name: 'onChildAdded',
      url: 'classes/_defaults_fileupload_.fileupload.html#onchildadded',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 420,
      kind: 2048,
      name: 'onChildRemoved',
      url: 'classes/_defaults_fileupload_.fileupload.html#onchildremoved',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 421,
      kind: 2,
      name: 'VDomRenderer',
      url: 'modules/_defaults_fileupload_.fileupload.vdomrenderer.html',
      classes: 'tsd-kind-module tsd-parent-kind-class',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 422,
      kind: 256,
      name: 'IModel',
      url:
        'interfaces/_defaults_fileupload_.fileupload.vdomrenderer.imodel.html',
      classes: 'tsd-kind-interface tsd-parent-kind-module tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload.VDomRenderer'
    },
    {
      id: 423,
      kind: 1024,
      name: 'stateChanged',
      url:
        'interfaces/_defaults_fileupload_.fileupload.vdomrenderer.imodel.html#statechanged',
      classes:
        'tsd-kind-property tsd-parent-kind-interface tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload.VDomRenderer.IModel'
    },
    {
      id: 424,
      kind: 1024,
      name: 'isDisposed',
      url:
        'interfaces/_defaults_fileupload_.fileupload.vdomrenderer.imodel.html#isdisposed',
      classes:
        'tsd-kind-property tsd-parent-kind-interface tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload.VDomRenderer.IModel'
    },
    {
      id: 425,
      kind: 2048,
      name: 'dispose',
      url:
        'interfaces/_defaults_fileupload_.fileupload.vdomrenderer.imodel.html#dispose',
      classes:
        'tsd-kind-method tsd-parent-kind-interface tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/fileUpload".FileUpload.VDomRenderer.IModel'
    },
    {
      id: 426,
      kind: 2,
      name: 'IFileUpload',
      url: 'modules/_defaults_fileupload_.ifileupload.html',
      classes: 'tsd-kind-module tsd-parent-kind-external-module',
      parent: '"defaults/fileUpload"'
    },
    {
      id: 427,
      kind: 1024,
      name: 'model',
      url: 'modules/_defaults_fileupload_.ifileupload.html#model',
      classes: 'tsd-kind-property tsd-parent-kind-module',
      parent: '"defaults/fileUpload".IFileUpload'
    },
    {
      id: 428,
      kind: 1024,
      name: 'modelChanged',
      url: 'modules/_defaults_fileupload_.ifileupload.html#modelchanged',
      classes: 'tsd-kind-property tsd-parent-kind-module',
      parent: '"defaults/fileUpload".IFileUpload'
    },
    {
      id: 429,
      kind: 1024,
      name: 'isDisposed',
      url: 'modules/_defaults_fileupload_.ifileupload.html#isdisposed',
      classes: 'tsd-kind-property tsd-parent-kind-module tsd-is-inherited',
      parent: '"defaults/fileUpload".IFileUpload'
    },
    {
      id: 430,
      kind: 2048,
      name: 'dispose',
      url: 'modules/_defaults_fileupload_.ifileupload.html#dispose',
      classes: 'tsd-kind-method tsd-parent-kind-module tsd-is-inherited',
      parent: '"defaults/fileUpload".IFileUpload'
    },
    {
      id: 431,
      kind: 2,
      name: 'FileUploadComponent',
      url: 'modules/_defaults_fileupload_.fileuploadcomponent.html',
      classes:
        'tsd-kind-module tsd-parent-kind-external-module tsd-is-not-exported',
      parent: '"defaults/fileUpload"'
    },
    {
      id: 432,
      kind: 256,
      name: 'IProps',
      url: 'interfaces/_defaults_fileupload_.fileuploadcomponent.iprops.html',
      classes: 'tsd-kind-interface tsd-parent-kind-module',
      parent: '"defaults/fileUpload".FileUploadComponent'
    },
    {
      id: 433,
      kind: 1024,
      name: 'upload',
      url:
        'interfaces/_defaults_fileupload_.fileuploadcomponent.iprops.html#upload',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/fileUpload".FileUploadComponent.IProps'
    },
    {
      id: 434,
      kind: 32,
      name: 'UPLOAD_COMPLETE_MESSAGE_MILLIS',
      url: 'modules/_defaults_fileupload_.html#upload_complete_message_millis',
      classes:
        'tsd-kind-variable tsd-parent-kind-external-module tsd-is-not-exported',
      parent: '"defaults/fileUpload"'
    },
    {
      id: 435,
      kind: 128,
      name: 'Model',
      url: 'classes/_defaults_fileupload_.fileupload.model.html',
      classes: 'tsd-kind-class tsd-parent-kind-class',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 436,
      kind: 512,
      name: 'constructor',
      url: 'classes/_defaults_fileupload_.fileupload.model.html#constructor',
      classes: 'tsd-kind-constructor tsd-parent-kind-class',
      parent: '"defaults/fileUpload".FileUpload.Model'
    },
    {
      id: 437,
      kind: 262144,
      name: 'items',
      url: 'classes/_defaults_fileupload_.fileupload.model.html#items',
      classes: 'tsd-kind-get-signature tsd-parent-kind-class',
      parent: '"defaults/fileUpload".FileUpload.Model'
    },
    {
      id: 438,
      kind: 262144,
      name: 'browserModel',
      url: 'classes/_defaults_fileupload_.fileupload.model.html#browsermodel',
      classes: 'tsd-kind-accessor tsd-parent-kind-class',
      parent: '"defaults/fileUpload".FileUpload.Model'
    },
    {
      id: 439,
      kind: 2048,
      name: '_uploadChanged',
      url: 'classes/_defaults_fileupload_.fileupload.model.html#_uploadchanged',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/fileUpload".FileUpload.Model'
    },
    {
      id: 440,
      kind: 1024,
      name: '_items',
      url: 'classes/_defaults_fileupload_.fileupload.model.html#_items',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/fileUpload".FileUpload.Model'
    },
    {
      id: 441,
      kind: 1024,
      name: '_browserModel',
      url: 'classes/_defaults_fileupload_.fileupload.model.html#_browsermodel',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/fileUpload".FileUpload.Model'
    },
    {
      id: 442,
      kind: 1024,
      name: 'stateChanged',
      url: 'classes/_defaults_fileupload_.fileupload.model.html#statechanged',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-inherited',
      parent: '"defaults/fileUpload".FileUpload.Model'
    },
    {
      id: 443,
      kind: 1024,
      name: 'isDisposed',
      url: 'classes/_defaults_fileupload_.fileupload.model.html#isdisposed',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-inherited',
      parent: '"defaults/fileUpload".FileUpload.Model'
    },
    {
      id: 444,
      kind: 2048,
      name: 'dispose',
      url: 'classes/_defaults_fileupload_.fileupload.model.html#dispose',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-inherited',
      parent: '"defaults/fileUpload".FileUpload.Model'
    },
    {
      id: 445,
      kind: 256,
      name: 'IOptions',
      url: 'interfaces/_defaults_fileupload_.fileupload.ioptions.html',
      classes: 'tsd-kind-interface tsd-parent-kind-class',
      parent: '"defaults/fileUpload".FileUpload'
    },
    {
      id: 446,
      kind: 1024,
      name: 'tracker',
      url: 'interfaces/_defaults_fileupload_.fileupload.ioptions.html#tracker',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/fileUpload".FileUpload.IOptions'
    },
    {
      id: 447,
      kind: 256,
      name: 'IModel',
      url: 'interfaces/_defaults_fileupload_.ifileupload.imodel.html',
      classes: 'tsd-kind-interface tsd-parent-kind-module',
      parent: '"defaults/fileUpload".IFileUpload'
    },
    {
      id: 448,
      kind: 1024,
      name: 'items',
      url: 'interfaces/_defaults_fileupload_.ifileupload.imodel.html#items',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/fileUpload".IFileUpload.IModel'
    },
    {
      id: 449,
      kind: 1024,
      name: 'browserModel',
      url:
        'interfaces/_defaults_fileupload_.ifileupload.imodel.html#browsermodel',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/fileUpload".IFileUpload.IModel'
    },
    {
      id: 450,
      kind: 256,
      name: 'IItem',
      url: 'interfaces/_defaults_fileupload_.ifileupload.iitem.html',
      classes: 'tsd-kind-interface tsd-parent-kind-module',
      parent: '"defaults/fileUpload".IFileUpload'
    },
    {
      id: 451,
      kind: 1024,
      name: 'path',
      url: 'interfaces/_defaults_fileupload_.ifileupload.iitem.html#path',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/fileUpload".IFileUpload.IItem'
    },
    {
      id: 452,
      kind: 1024,
      name: 'progress',
      url: 'interfaces/_defaults_fileupload_.ifileupload.iitem.html#progress',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/fileUpload".IFileUpload.IItem'
    },
    {
      id: 453,
      kind: 1024,
      name: 'complete',
      url: 'interfaces/_defaults_fileupload_.ifileupload.iitem.html#complete',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/fileUpload".IFileUpload.IItem'
    },
    {
      id: 454,
      kind: 2097152,
      name: 'fileUploadItem',
      url: 'modules/_defaults_fileupload_.html#fileuploaditem',
      classes: 'tsd-kind-object-literal tsd-parent-kind-external-module',
      parent: '"defaults/fileUpload"'
    },
    {
      id: 455,
      kind: 32,
      name: 'id',
      url: 'modules/_defaults_fileupload_.html#fileuploaditem.id',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/fileUpload".fileUploadItem'
    },
    {
      id: 456,
      kind: 32,
      name: 'autoStart',
      url: 'modules/_defaults_fileupload_.html#fileuploaditem.autostart',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/fileUpload".fileUploadItem'
    },
    {
      id: 457,
      kind: 32,
      name: 'provides',
      url: 'modules/_defaults_fileupload_.html#fileuploaditem.provides',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/fileUpload".fileUploadItem'
    },
    {
      id: 458,
      kind: 32,
      name: 'requires',
      url: 'modules/_defaults_fileupload_.html#fileuploaditem.requires',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/fileUpload".fileUploadItem'
    },
    {
      id: 459,
      kind: 64,
      name: 'activate',
      url: 'modules/_defaults_fileupload_.html#fileuploaditem.activate',
      classes: 'tsd-kind-function tsd-parent-kind-object-literal',
      parent: '"defaults/fileUpload".fileUploadItem'
    },
    {
      id: 460,
      kind: 1,
      name: '"util/text"',
      url: 'modules/_util_text_.html',
      classes: 'tsd-kind-external-module'
    },
    {
      id: 461,
      kind: 2,
      name: 'TextExt',
      url: 'modules/_util_text_.textext.html',
      classes: 'tsd-kind-module tsd-parent-kind-external-module',
      parent: '"util/text"'
    },
    {
      id: 462,
      kind: 64,
      name: 'titleCase',
      url: 'modules/_util_text_.textext.html#titlecase',
      classes: 'tsd-kind-function tsd-parent-kind-module',
      parent: '"util/text".TextExt'
    },
    {
      id: 463,
      kind: 1,
      name: '"defaults/filePath"',
      url: 'modules/_defaults_filepath_.html',
      classes: 'tsd-kind-external-module'
    },
    {
      id: 464,
      kind: 128,
      name: 'FilePath',
      url: 'classes/_defaults_filepath_.filepath.html',
      classes:
        'tsd-kind-class tsd-parent-kind-external-module tsd-is-not-exported',
      parent: '"defaults/filePath"'
    },
    {
      id: 465,
      kind: 512,
      name: 'constructor',
      url: 'classes/_defaults_filepath_.filepath.html#constructor',
      classes:
        'tsd-kind-constructor tsd-parent-kind-class tsd-is-overwrite tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 466,
      kind: 2048,
      name: 'render',
      url: 'classes/_defaults_filepath_.filepath.html#render',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 467,
      kind: 2048,
      name: 'dispose',
      url: 'classes/_defaults_filepath_.filepath.html#dispose',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 468,
      kind: 2048,
      name: '_onShellCurrentChanged',
      url: 'classes/_defaults_filepath_.filepath.html#_onshellcurrentchanged',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 469,
      kind: 1024,
      name: '_shell',
      url: 'classes/_defaults_filepath_.filepath.html#_shell',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 470,
      kind: 1024,
      name: '_docManager',
      url: 'classes/_defaults_filepath_.filepath.html#_docmanager',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 471,
      kind: 1024,
      name: 'modelChanged',
      url: 'classes/_defaults_filepath_.filepath.html#modelchanged',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 472,
      kind: 1024,
      name: 'model',
      url: 'classes/_defaults_filepath_.filepath.html#model-1',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 473,
      kind: 2048,
      name: 'onUpdateRequest',
      url: 'classes/_defaults_filepath_.filepath.html#onupdaterequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 474,
      kind: 2048,
      name: 'onAfterAttach',
      url: 'classes/_defaults_filepath_.filepath.html#onafterattach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 475,
      kind: 1024,
      name: 'disposed',
      url: 'classes/_defaults_filepath_.filepath.html#disposed',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 476,
      kind: 1024,
      name: 'node',
      url: 'classes/_defaults_filepath_.filepath.html#node',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 477,
      kind: 1024,
      name: 'isDisposed',
      url: 'classes/_defaults_filepath_.filepath.html#isdisposed',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 478,
      kind: 1024,
      name: 'isAttached',
      url: 'classes/_defaults_filepath_.filepath.html#isattached',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 479,
      kind: 1024,
      name: 'isHidden',
      url: 'classes/_defaults_filepath_.filepath.html#ishidden',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 480,
      kind: 1024,
      name: 'isVisible',
      url: 'classes/_defaults_filepath_.filepath.html#isvisible',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 481,
      kind: 1024,
      name: 'title',
      url: 'classes/_defaults_filepath_.filepath.html#title',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 482,
      kind: 1024,
      name: 'id',
      url: 'classes/_defaults_filepath_.filepath.html#id',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 483,
      kind: 1024,
      name: 'dataset',
      url: 'classes/_defaults_filepath_.filepath.html#dataset',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 484,
      kind: 1024,
      name: 'parent',
      url: 'classes/_defaults_filepath_.filepath.html#parent',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 485,
      kind: 1024,
      name: 'layout',
      url: 'classes/_defaults_filepath_.filepath.html#layout',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 486,
      kind: 2048,
      name: 'children',
      url: 'classes/_defaults_filepath_.filepath.html#children',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 487,
      kind: 2048,
      name: 'contains',
      url: 'classes/_defaults_filepath_.filepath.html#contains',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 488,
      kind: 2048,
      name: 'hasClass',
      url: 'classes/_defaults_filepath_.filepath.html#hasclass',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 489,
      kind: 2048,
      name: 'addClass',
      url: 'classes/_defaults_filepath_.filepath.html#addclass',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 490,
      kind: 2048,
      name: 'removeClass',
      url: 'classes/_defaults_filepath_.filepath.html#removeclass',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 491,
      kind: 2048,
      name: 'toggleClass',
      url: 'classes/_defaults_filepath_.filepath.html#toggleclass',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 492,
      kind: 2048,
      name: 'update',
      url: 'classes/_defaults_filepath_.filepath.html#update',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 493,
      kind: 2048,
      name: 'fit',
      url: 'classes/_defaults_filepath_.filepath.html#fit',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 494,
      kind: 2048,
      name: 'activate',
      url: 'classes/_defaults_filepath_.filepath.html#activate',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 495,
      kind: 2048,
      name: 'close',
      url: 'classes/_defaults_filepath_.filepath.html#close',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 496,
      kind: 2048,
      name: 'show',
      url: 'classes/_defaults_filepath_.filepath.html#show',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 497,
      kind: 2048,
      name: 'hide',
      url: 'classes/_defaults_filepath_.filepath.html#hide',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 498,
      kind: 2048,
      name: 'setHidden',
      url: 'classes/_defaults_filepath_.filepath.html#sethidden',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 499,
      kind: 2048,
      name: 'testFlag',
      url: 'classes/_defaults_filepath_.filepath.html#testflag',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 500,
      kind: 2048,
      name: 'setFlag',
      url: 'classes/_defaults_filepath_.filepath.html#setflag',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 501,
      kind: 2048,
      name: 'clearFlag',
      url: 'classes/_defaults_filepath_.filepath.html#clearflag',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 502,
      kind: 2048,
      name: 'processMessage',
      url: 'classes/_defaults_filepath_.filepath.html#processmessage',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 503,
      kind: 2048,
      name: 'notifyLayout',
      url: 'classes/_defaults_filepath_.filepath.html#notifylayout',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 504,
      kind: 2048,
      name: 'onCloseRequest',
      url: 'classes/_defaults_filepath_.filepath.html#oncloserequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 505,
      kind: 2048,
      name: 'onResize',
      url: 'classes/_defaults_filepath_.filepath.html#onresize',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 506,
      kind: 2048,
      name: 'onFitRequest',
      url: 'classes/_defaults_filepath_.filepath.html#onfitrequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 507,
      kind: 2048,
      name: 'onActivateRequest',
      url: 'classes/_defaults_filepath_.filepath.html#onactivaterequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 508,
      kind: 2048,
      name: 'onBeforeShow',
      url: 'classes/_defaults_filepath_.filepath.html#onbeforeshow',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 509,
      kind: 2048,
      name: 'onAfterShow',
      url: 'classes/_defaults_filepath_.filepath.html#onaftershow',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 510,
      kind: 2048,
      name: 'onBeforeHide',
      url: 'classes/_defaults_filepath_.filepath.html#onbeforehide',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 511,
      kind: 2048,
      name: 'onAfterHide',
      url: 'classes/_defaults_filepath_.filepath.html#onafterhide',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 512,
      kind: 2048,
      name: 'onBeforeAttach',
      url: 'classes/_defaults_filepath_.filepath.html#onbeforeattach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 513,
      kind: 2048,
      name: 'onBeforeDetach',
      url: 'classes/_defaults_filepath_.filepath.html#onbeforedetach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 514,
      kind: 2048,
      name: 'onAfterDetach',
      url: 'classes/_defaults_filepath_.filepath.html#onafterdetach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 515,
      kind: 2048,
      name: 'onChildAdded',
      url: 'classes/_defaults_filepath_.filepath.html#onchildadded',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 516,
      kind: 2048,
      name: 'onChildRemoved',
      url: 'classes/_defaults_filepath_.filepath.html#onchildremoved',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 517,
      kind: 2,
      name: 'VDomRenderer',
      url: 'modules/_defaults_filepath_.filepath.vdomrenderer.html',
      classes: 'tsd-kind-module tsd-parent-kind-class',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 518,
      kind: 256,
      name: 'IModel',
      url: 'interfaces/_defaults_filepath_.filepath.vdomrenderer.imodel.html',
      classes: 'tsd-kind-interface tsd-parent-kind-module tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath.VDomRenderer'
    },
    {
      id: 519,
      kind: 1024,
      name: 'stateChanged',
      url:
        'interfaces/_defaults_filepath_.filepath.vdomrenderer.imodel.html#statechanged',
      classes:
        'tsd-kind-property tsd-parent-kind-interface tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath.VDomRenderer.IModel'
    },
    {
      id: 520,
      kind: 1024,
      name: 'isDisposed',
      url:
        'interfaces/_defaults_filepath_.filepath.vdomrenderer.imodel.html#isdisposed',
      classes:
        'tsd-kind-property tsd-parent-kind-interface tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath.VDomRenderer.IModel'
    },
    {
      id: 521,
      kind: 2048,
      name: 'dispose',
      url:
        'interfaces/_defaults_filepath_.filepath.vdomrenderer.imodel.html#dispose',
      classes:
        'tsd-kind-method tsd-parent-kind-interface tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/filePath".FilePath.VDomRenderer.IModel'
    },
    {
      id: 522,
      kind: 2,
      name: 'IFilePath',
      url: 'modules/_defaults_filepath_.ifilepath.html',
      classes: 'tsd-kind-module tsd-parent-kind-external-module',
      parent: '"defaults/filePath"'
    },
    {
      id: 523,
      kind: 1024,
      name: 'model',
      url: 'modules/_defaults_filepath_.ifilepath.html#model',
      classes: 'tsd-kind-property tsd-parent-kind-module',
      parent: '"defaults/filePath".IFilePath'
    },
    {
      id: 524,
      kind: 1024,
      name: 'modelChanged',
      url: 'modules/_defaults_filepath_.ifilepath.html#modelchanged',
      classes: 'tsd-kind-property tsd-parent-kind-module',
      parent: '"defaults/filePath".IFilePath'
    },
    {
      id: 525,
      kind: 1024,
      name: 'isDisposed',
      url: 'modules/_defaults_filepath_.ifilepath.html#isdisposed',
      classes: 'tsd-kind-property tsd-parent-kind-module tsd-is-inherited',
      parent: '"defaults/filePath".IFilePath'
    },
    {
      id: 526,
      kind: 2048,
      name: 'dispose',
      url: 'modules/_defaults_filepath_.ifilepath.html#dispose',
      classes: 'tsd-kind-method tsd-parent-kind-module tsd-is-inherited',
      parent: '"defaults/filePath".IFilePath'
    },
    {
      id: 527,
      kind: 64,
      name: 'FilePathComponent',
      url: 'modules/_defaults_filepath_.html#filepathcomponent',
      classes:
        'tsd-kind-function tsd-parent-kind-external-module tsd-is-not-exported',
      parent: '"defaults/filePath"'
    },
    {
      id: 528,
      kind: 256,
      name: 'IProps',
      url: 'modules/_defaults_filepath_.html#filepathcomponent.iprops',
      classes: 'tsd-kind-interface tsd-parent-kind-function',
      parent: '"defaults/filePath".FilePathComponent'
    },
    {
      id: 529,
      kind: 1024,
      name: 'fullPath',
      url: 'modules/_defaults_filepath_.html#filepathcomponent.iprops.fullpath',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/filePath".FilePathComponent.IProps'
    },
    {
      id: 530,
      kind: 1024,
      name: 'name',
      url: 'modules/_defaults_filepath_.html#filepathcomponent.iprops.name',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/filePath".FilePathComponent.IProps'
    },
    {
      id: 531,
      kind: 128,
      name: 'Model',
      url: 'classes/_defaults_filepath_.filepath.model.html',
      classes: 'tsd-kind-class tsd-parent-kind-class',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 532,
      kind: 512,
      name: 'constructor',
      url: 'classes/_defaults_filepath_.filepath.model.html#constructor',
      classes: 'tsd-kind-constructor tsd-parent-kind-class',
      parent: '"defaults/filePath".FilePath.Model'
    },
    {
      id: 533,
      kind: 262144,
      name: 'path',
      url: 'classes/_defaults_filepath_.filepath.model.html#path',
      classes: 'tsd-kind-get-signature tsd-parent-kind-class',
      parent: '"defaults/filePath".FilePath.Model'
    },
    {
      id: 534,
      kind: 262144,
      name: 'name',
      url: 'classes/_defaults_filepath_.filepath.model.html#name',
      classes: 'tsd-kind-get-signature tsd-parent-kind-class',
      parent: '"defaults/filePath".FilePath.Model'
    },
    {
      id: 535,
      kind: 262144,
      name: 'widget',
      url: 'classes/_defaults_filepath_.filepath.model.html#widget',
      classes: 'tsd-kind-accessor tsd-parent-kind-class',
      parent: '"defaults/filePath".FilePath.Model'
    },
    {
      id: 536,
      kind: 2048,
      name: '_onTitleChange',
      url: 'classes/_defaults_filepath_.filepath.model.html#_ontitlechange',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/filePath".FilePath.Model'
    },
    {
      id: 537,
      kind: 2048,
      name: '_onPathChange',
      url: 'classes/_defaults_filepath_.filepath.model.html#_onpathchange',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/filePath".FilePath.Model'
    },
    {
      id: 538,
      kind: 2048,
      name: '_getAllState',
      url: 'classes/_defaults_filepath_.filepath.model.html#_getallstate',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/filePath".FilePath.Model'
    },
    {
      id: 539,
      kind: 2048,
      name: '_triggerChange',
      url: 'classes/_defaults_filepath_.filepath.model.html#_triggerchange',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/filePath".FilePath.Model'
    },
    {
      id: 540,
      kind: 1024,
      name: '_path',
      url: 'classes/_defaults_filepath_.filepath.model.html#_path',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/filePath".FilePath.Model'
    },
    {
      id: 541,
      kind: 1024,
      name: '_name',
      url: 'classes/_defaults_filepath_.filepath.model.html#_name',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/filePath".FilePath.Model'
    },
    {
      id: 542,
      kind: 1024,
      name: '_widget',
      url: 'classes/_defaults_filepath_.filepath.model.html#_widget',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/filePath".FilePath.Model'
    },
    {
      id: 543,
      kind: 1024,
      name: '_docManager',
      url: 'classes/_defaults_filepath_.filepath.model.html#_docmanager',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/filePath".FilePath.Model'
    },
    {
      id: 544,
      kind: 1024,
      name: 'stateChanged',
      url: 'classes/_defaults_filepath_.filepath.model.html#statechanged',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-inherited',
      parent: '"defaults/filePath".FilePath.Model'
    },
    {
      id: 545,
      kind: 1024,
      name: 'isDisposed',
      url: 'classes/_defaults_filepath_.filepath.model.html#isdisposed',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-inherited',
      parent: '"defaults/filePath".FilePath.Model'
    },
    {
      id: 546,
      kind: 2048,
      name: 'dispose',
      url: 'classes/_defaults_filepath_.filepath.model.html#dispose',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-inherited',
      parent: '"defaults/filePath".FilePath.Model'
    },
    {
      id: 547,
      kind: 256,
      name: 'IOptions',
      url: 'interfaces/_defaults_filepath_.filepath.ioptions.html',
      classes: 'tsd-kind-interface tsd-parent-kind-class',
      parent: '"defaults/filePath".FilePath'
    },
    {
      id: 548,
      kind: 1024,
      name: 'shell',
      url: 'interfaces/_defaults_filepath_.filepath.ioptions.html#shell',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/filePath".FilePath.IOptions'
    },
    {
      id: 549,
      kind: 1024,
      name: 'docManager',
      url: 'interfaces/_defaults_filepath_.filepath.ioptions.html#docmanager',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/filePath".FilePath.IOptions'
    },
    {
      id: 550,
      kind: 256,
      name: 'IModel',
      url: 'interfaces/_defaults_filepath_.ifilepath.imodel.html',
      classes: 'tsd-kind-interface tsd-parent-kind-module',
      parent: '"defaults/filePath".IFilePath'
    },
    {
      id: 551,
      kind: 1024,
      name: 'path',
      url: 'interfaces/_defaults_filepath_.ifilepath.imodel.html#path',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/filePath".IFilePath.IModel'
    },
    {
      id: 552,
      kind: 1024,
      name: 'name',
      url: 'interfaces/_defaults_filepath_.ifilepath.imodel.html#name',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/filePath".IFilePath.IModel'
    },
    {
      id: 553,
      kind: 1024,
      name: 'widget',
      url: 'interfaces/_defaults_filepath_.ifilepath.imodel.html#widget',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/filePath".IFilePath.IModel'
    },
    {
      id: 554,
      kind: 1024,
      name: 'stateChanged',
      url: 'interfaces/_defaults_filepath_.ifilepath.imodel.html#statechanged',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/filePath".IFilePath.IModel'
    },
    {
      id: 555,
      kind: 2097152,
      name: 'filePathItem',
      url: 'modules/_defaults_filepath_.html#filepathitem',
      classes: 'tsd-kind-object-literal tsd-parent-kind-external-module',
      parent: '"defaults/filePath"'
    },
    {
      id: 556,
      kind: 32,
      name: 'id',
      url: 'modules/_defaults_filepath_.html#filepathitem.id',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/filePath".filePathItem'
    },
    {
      id: 557,
      kind: 32,
      name: 'autoStart',
      url: 'modules/_defaults_filepath_.html#filepathitem.autostart',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/filePath".filePathItem'
    },
    {
      id: 558,
      kind: 32,
      name: 'provides',
      url: 'modules/_defaults_filepath_.html#filepathitem.provides',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/filePath".filePathItem'
    },
    {
      id: 559,
      kind: 32,
      name: 'requires',
      url: 'modules/_defaults_filepath_.html#filepathitem.requires',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/filePath".filePathItem'
    },
    {
      id: 560,
      kind: 64,
      name: 'activate',
      url: 'modules/_defaults_filepath_.html#filepathitem.activate',
      classes: 'tsd-kind-function tsd-parent-kind-object-literal',
      parent: '"defaults/filePath".filePathItem'
    },
    {
      id: 561,
      kind: 1,
      name: '"defaults/kernelStatus"',
      url: 'modules/_defaults_kernelstatus_.html',
      classes: 'tsd-kind-external-module'
    },
    {
      id: 562,
      kind: 128,
      name: 'KernelStatus',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html',
      classes:
        'tsd-kind-class tsd-parent-kind-external-module tsd-is-not-exported',
      parent: '"defaults/kernelStatus"'
    },
    {
      id: 563,
      kind: 512,
      name: 'constructor',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#constructor',
      classes:
        'tsd-kind-constructor tsd-parent-kind-class tsd-is-overwrite tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 564,
      kind: 2048,
      name: 'render',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#render',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 565,
      kind: 2048,
      name: 'dispose',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#dispose',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 566,
      kind: 2048,
      name: 'onUpdateRequest',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#onupdaterequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 567,
      kind: 2048,
      name: '_handleClick',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#_handleclick',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 568,
      kind: 2048,
      name: '_onFilePathChange',
      url:
        'classes/_defaults_kernelstatus_.kernelstatus.html#_onfilepathchange',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 569,
      kind: 2048,
      name: '_getFocusedSession',
      url:
        'classes/_defaults_kernelstatus_.kernelstatus.html#_getfocusedsession',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 570,
      kind: 2048,
      name: '_onMainAreaCurrentChange',
      url:
        'classes/_defaults_kernelstatus_.kernelstatus.html#_onmainareacurrentchange',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 571,
      kind: 1024,
      name: '_notebookTracker',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#_notebooktracker',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 572,
      kind: 1024,
      name: '_consoleTracker',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#_consoletracker',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 573,
      kind: 1024,
      name: '_shell',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#_shell',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 574,
      kind: 1024,
      name: '_commands',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#_commands',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 575,
      kind: 1024,
      name: '_filePath',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#_filepath',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 576,
      kind: 1024,
      name: 'modelChanged',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#modelchanged',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 577,
      kind: 1024,
      name: 'model',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#model-1',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 578,
      kind: 2048,
      name: 'onAfterAttach',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#onafterattach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 579,
      kind: 1024,
      name: 'disposed',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#disposed',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 580,
      kind: 1024,
      name: 'node',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#node',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 581,
      kind: 1024,
      name: 'isDisposed',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#isdisposed',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 582,
      kind: 1024,
      name: 'isAttached',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#isattached',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 583,
      kind: 1024,
      name: 'isHidden',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#ishidden',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 584,
      kind: 1024,
      name: 'isVisible',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#isvisible',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 585,
      kind: 1024,
      name: 'title',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#title',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 586,
      kind: 1024,
      name: 'id',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#id',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 587,
      kind: 1024,
      name: 'dataset',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#dataset',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 588,
      kind: 1024,
      name: 'parent',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#parent',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 589,
      kind: 1024,
      name: 'layout',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#layout',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 590,
      kind: 2048,
      name: 'children',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#children',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 591,
      kind: 2048,
      name: 'contains',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#contains',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 592,
      kind: 2048,
      name: 'hasClass',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#hasclass',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 593,
      kind: 2048,
      name: 'addClass',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#addclass',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 594,
      kind: 2048,
      name: 'removeClass',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#removeclass',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 595,
      kind: 2048,
      name: 'toggleClass',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#toggleclass',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 596,
      kind: 2048,
      name: 'update',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#update',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 597,
      kind: 2048,
      name: 'fit',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#fit',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 598,
      kind: 2048,
      name: 'activate',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#activate',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 599,
      kind: 2048,
      name: 'close',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#close',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 600,
      kind: 2048,
      name: 'show',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#show',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 601,
      kind: 2048,
      name: 'hide',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#hide',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 602,
      kind: 2048,
      name: 'setHidden',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#sethidden',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 603,
      kind: 2048,
      name: 'testFlag',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#testflag',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 604,
      kind: 2048,
      name: 'setFlag',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#setflag',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 605,
      kind: 2048,
      name: 'clearFlag',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#clearflag',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 606,
      kind: 2048,
      name: 'processMessage',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#processmessage',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 607,
      kind: 2048,
      name: 'notifyLayout',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#notifylayout',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 608,
      kind: 2048,
      name: 'onCloseRequest',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#oncloserequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 609,
      kind: 2048,
      name: 'onResize',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#onresize',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 610,
      kind: 2048,
      name: 'onFitRequest',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#onfitrequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 611,
      kind: 2048,
      name: 'onActivateRequest',
      url:
        'classes/_defaults_kernelstatus_.kernelstatus.html#onactivaterequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 612,
      kind: 2048,
      name: 'onBeforeShow',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#onbeforeshow',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 613,
      kind: 2048,
      name: 'onAfterShow',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#onaftershow',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 614,
      kind: 2048,
      name: 'onBeforeHide',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#onbeforehide',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 615,
      kind: 2048,
      name: 'onAfterHide',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#onafterhide',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 616,
      kind: 2048,
      name: 'onBeforeAttach',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#onbeforeattach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 617,
      kind: 2048,
      name: 'onBeforeDetach',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#onbeforedetach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 618,
      kind: 2048,
      name: 'onAfterDetach',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#onafterdetach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 619,
      kind: 2048,
      name: 'onChildAdded',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#onchildadded',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 620,
      kind: 2048,
      name: 'onChildRemoved',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.html#onchildremoved',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 621,
      kind: 2,
      name: 'VDomRenderer',
      url: 'modules/_defaults_kernelstatus_.kernelstatus.vdomrenderer.html',
      classes: 'tsd-kind-module tsd-parent-kind-class',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 622,
      kind: 256,
      name: 'IModel',
      url:
        'interfaces/_defaults_kernelstatus_.kernelstatus.vdomrenderer.imodel.html',
      classes: 'tsd-kind-interface tsd-parent-kind-module tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus.VDomRenderer'
    },
    {
      id: 623,
      kind: 1024,
      name: 'stateChanged',
      url:
        'interfaces/_defaults_kernelstatus_.kernelstatus.vdomrenderer.imodel.html#statechanged',
      classes:
        'tsd-kind-property tsd-parent-kind-interface tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus.VDomRenderer.IModel'
    },
    {
      id: 624,
      kind: 1024,
      name: 'isDisposed',
      url:
        'interfaces/_defaults_kernelstatus_.kernelstatus.vdomrenderer.imodel.html#isdisposed',
      classes:
        'tsd-kind-property tsd-parent-kind-interface tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus.VDomRenderer.IModel'
    },
    {
      id: 625,
      kind: 2048,
      name: 'dispose',
      url:
        'interfaces/_defaults_kernelstatus_.kernelstatus.vdomrenderer.imodel.html#dispose',
      classes:
        'tsd-kind-method tsd-parent-kind-interface tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatus.VDomRenderer.IModel'
    },
    {
      id: 626,
      kind: 2,
      name: 'IKernelStatus',
      url: 'modules/_defaults_kernelstatus_.ikernelstatus.html',
      classes: 'tsd-kind-module tsd-parent-kind-external-module',
      parent: '"defaults/kernelStatus"'
    },
    {
      id: 627,
      kind: 1024,
      name: 'model',
      url: 'modules/_defaults_kernelstatus_.ikernelstatus.html#model',
      classes: 'tsd-kind-property tsd-parent-kind-module',
      parent: '"defaults/kernelStatus".IKernelStatus'
    },
    {
      id: 628,
      kind: 1024,
      name: 'modelChanged',
      url: 'modules/_defaults_kernelstatus_.ikernelstatus.html#modelchanged',
      classes: 'tsd-kind-property tsd-parent-kind-module',
      parent: '"defaults/kernelStatus".IKernelStatus'
    },
    {
      id: 629,
      kind: 1024,
      name: 'isDisposed',
      url: 'modules/_defaults_kernelstatus_.ikernelstatus.html#isdisposed',
      classes: 'tsd-kind-property tsd-parent-kind-module tsd-is-inherited',
      parent: '"defaults/kernelStatus".IKernelStatus'
    },
    {
      id: 630,
      kind: 2048,
      name: 'dispose',
      url: 'modules/_defaults_kernelstatus_.ikernelstatus.html#dispose',
      classes: 'tsd-kind-method tsd-parent-kind-module tsd-is-inherited',
      parent: '"defaults/kernelStatus".IKernelStatus'
    },
    {
      id: 631,
      kind: 2,
      name: 'KernelStatusComponent',
      url: 'modules/_defaults_kernelstatus_.kernelstatuscomponent.html',
      classes:
        'tsd-kind-module tsd-parent-kind-external-module tsd-is-not-exported',
      parent: '"defaults/kernelStatus"'
    },
    {
      id: 632,
      kind: 256,
      name: 'IProps',
      url:
        'interfaces/_defaults_kernelstatus_.kernelstatuscomponent.iprops.html',
      classes: 'tsd-kind-interface tsd-parent-kind-module',
      parent: '"defaults/kernelStatus".KernelStatusComponent'
    },
    {
      id: 633,
      kind: 1024,
      name: 'handleClick',
      url:
        'interfaces/_defaults_kernelstatus_.kernelstatuscomponent.iprops.html#handleclick',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/kernelStatus".KernelStatusComponent.IProps'
    },
    {
      id: 634,
      kind: 65536,
      name: '__type',
      url:
        'interfaces/_defaults_kernelstatus_.kernelstatuscomponent.iprops.html#handleclick.__type',
      classes:
        'tsd-kind-type-literal tsd-parent-kind-property tsd-is-not-exported',
      parent: '"defaults/kernelStatus".KernelStatusComponent.IProps.handleClick'
    },
    {
      id: 635,
      kind: 1024,
      name: 'name',
      url:
        'interfaces/_defaults_kernelstatus_.kernelstatuscomponent.iprops.html#name',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/kernelStatus".KernelStatusComponent.IProps'
    },
    {
      id: 636,
      kind: 1024,
      name: 'status',
      url:
        'interfaces/_defaults_kernelstatus_.kernelstatuscomponent.iprops.html#status',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/kernelStatus".KernelStatusComponent.IProps'
    },
    {
      id: 637,
      kind: 128,
      name: 'Model',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.model.html',
      classes: 'tsd-kind-class tsd-parent-kind-class',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 638,
      kind: 512,
      name: 'constructor',
      url:
        'classes/_defaults_kernelstatus_.kernelstatus.model.html#constructor',
      classes: 'tsd-kind-constructor tsd-parent-kind-class',
      parent: '"defaults/kernelStatus".KernelStatus.Model'
    },
    {
      id: 639,
      kind: 262144,
      name: 'name',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.model.html#name',
      classes: 'tsd-kind-get-signature tsd-parent-kind-class',
      parent: '"defaults/kernelStatus".KernelStatus.Model'
    },
    {
      id: 640,
      kind: 262144,
      name: 'status',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.model.html#status',
      classes: 'tsd-kind-get-signature tsd-parent-kind-class',
      parent: '"defaults/kernelStatus".KernelStatus.Model'
    },
    {
      id: 641,
      kind: 262144,
      name: 'type',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.model.html#type',
      classes: 'tsd-kind-get-signature tsd-parent-kind-class',
      parent: '"defaults/kernelStatus".KernelStatus.Model'
    },
    {
      id: 642,
      kind: 262144,
      name: 'session',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.model.html#session',
      classes: 'tsd-kind-accessor tsd-parent-kind-class',
      parent: '"defaults/kernelStatus".KernelStatus.Model'
    },
    {
      id: 643,
      kind: 2048,
      name: '_onKernelStatusChanged',
      url:
        'classes/_defaults_kernelstatus_.kernelstatus.model.html#_onkernelstatuschanged',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/kernelStatus".KernelStatus.Model'
    },
    {
      id: 644,
      kind: 2048,
      name: '_onKernelChanged',
      url:
        'classes/_defaults_kernelstatus_.kernelstatus.model.html#_onkernelchanged',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/kernelStatus".KernelStatus.Model'
    },
    {
      id: 645,
      kind: 2048,
      name: '_getAllState',
      url:
        'classes/_defaults_kernelstatus_.kernelstatus.model.html#_getallstate',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/kernelStatus".KernelStatus.Model'
    },
    {
      id: 646,
      kind: 2048,
      name: '_triggerChange',
      url:
        'classes/_defaults_kernelstatus_.kernelstatus.model.html#_triggerchange',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/kernelStatus".KernelStatus.Model'
    },
    {
      id: 647,
      kind: 1024,
      name: '_kernelName',
      url:
        'classes/_defaults_kernelstatus_.kernelstatus.model.html#_kernelname',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/kernelStatus".KernelStatus.Model'
    },
    {
      id: 648,
      kind: 1024,
      name: '_kernelStatus',
      url:
        'classes/_defaults_kernelstatus_.kernelstatus.model.html#_kernelstatus',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/kernelStatus".KernelStatus.Model'
    },
    {
      id: 649,
      kind: 1024,
      name: '_session',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.model.html#_session',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/kernelStatus".KernelStatus.Model'
    },
    {
      id: 650,
      kind: 1024,
      name: 'stateChanged',
      url:
        'classes/_defaults_kernelstatus_.kernelstatus.model.html#statechanged',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-inherited',
      parent: '"defaults/kernelStatus".KernelStatus.Model'
    },
    {
      id: 651,
      kind: 1024,
      name: 'isDisposed',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.model.html#isdisposed',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-inherited',
      parent: '"defaults/kernelStatus".KernelStatus.Model'
    },
    {
      id: 652,
      kind: 2048,
      name: 'dispose',
      url: 'classes/_defaults_kernelstatus_.kernelstatus.model.html#dispose',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-inherited',
      parent: '"defaults/kernelStatus".KernelStatus.Model'
    },
    {
      id: 653,
      kind: 256,
      name: 'IOptions',
      url: 'interfaces/_defaults_kernelstatus_.kernelstatus.ioptions.html',
      classes: 'tsd-kind-interface tsd-parent-kind-class',
      parent: '"defaults/kernelStatus".KernelStatus'
    },
    {
      id: 654,
      kind: 1024,
      name: 'notebookTracker',
      url:
        'interfaces/_defaults_kernelstatus_.kernelstatus.ioptions.html#notebooktracker',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/kernelStatus".KernelStatus.IOptions'
    },
    {
      id: 655,
      kind: 1024,
      name: 'consoleTracker',
      url:
        'interfaces/_defaults_kernelstatus_.kernelstatus.ioptions.html#consoletracker',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/kernelStatus".KernelStatus.IOptions'
    },
    {
      id: 656,
      kind: 1024,
      name: 'shell',
      url:
        'interfaces/_defaults_kernelstatus_.kernelstatus.ioptions.html#shell',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/kernelStatus".KernelStatus.IOptions'
    },
    {
      id: 657,
      kind: 1024,
      name: 'commands',
      url:
        'interfaces/_defaults_kernelstatus_.kernelstatus.ioptions.html#commands',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/kernelStatus".KernelStatus.IOptions'
    },
    {
      id: 658,
      kind: 1024,
      name: 'filePath',
      url:
        'interfaces/_defaults_kernelstatus_.kernelstatus.ioptions.html#filepath',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/kernelStatus".KernelStatus.IOptions'
    },
    {
      id: 659,
      kind: 256,
      name: 'IModel',
      url: 'interfaces/_defaults_kernelstatus_.ikernelstatus.imodel.html',
      classes: 'tsd-kind-interface tsd-parent-kind-module',
      parent: '"defaults/kernelStatus".IKernelStatus'
    },
    {
      id: 660,
      kind: 1024,
      name: 'name',
      url: 'interfaces/_defaults_kernelstatus_.ikernelstatus.imodel.html#name',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/kernelStatus".IKernelStatus.IModel'
    },
    {
      id: 661,
      kind: 1024,
      name: 'status',
      url:
        'interfaces/_defaults_kernelstatus_.ikernelstatus.imodel.html#status',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/kernelStatus".IKernelStatus.IModel'
    },
    {
      id: 662,
      kind: 1024,
      name: 'type',
      url: 'interfaces/_defaults_kernelstatus_.ikernelstatus.imodel.html#type',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/kernelStatus".IKernelStatus.IModel'
    },
    {
      id: 663,
      kind: 1024,
      name: 'session',
      url:
        'interfaces/_defaults_kernelstatus_.ikernelstatus.imodel.html#session',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/kernelStatus".IKernelStatus.IModel'
    },
    {
      id: 664,
      kind: 2097152,
      name: 'kernelStatusItem',
      url: 'modules/_defaults_kernelstatus_.html#kernelstatusitem',
      classes: 'tsd-kind-object-literal tsd-parent-kind-external-module',
      parent: '"defaults/kernelStatus"'
    },
    {
      id: 665,
      kind: 32,
      name: 'id',
      url: 'modules/_defaults_kernelstatus_.html#kernelstatusitem.id',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/kernelStatus".kernelStatusItem'
    },
    {
      id: 666,
      kind: 32,
      name: 'autoStart',
      url: 'modules/_defaults_kernelstatus_.html#kernelstatusitem.autostart',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/kernelStatus".kernelStatusItem'
    },
    {
      id: 667,
      kind: 32,
      name: 'requires',
      url: 'modules/_defaults_kernelstatus_.html#kernelstatusitem.requires',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/kernelStatus".kernelStatusItem'
    },
    {
      id: 668,
      kind: 64,
      name: 'activate',
      url: 'modules/_defaults_kernelstatus_.html#kernelstatusitem.activate',
      classes: 'tsd-kind-function tsd-parent-kind-object-literal',
      parent: '"defaults/kernelStatus".kernelStatusItem'
    },
    {
      id: 669,
      kind: 1,
      name: '"defaults/runningSessions"',
      url: 'modules/_defaults_runningsessions_.html',
      classes: 'tsd-kind-external-module'
    },
    {
      id: 670,
      kind: 128,
      name: 'RunningSessions',
      url: 'classes/_defaults_runningsessions_.runningsessions.html',
      classes:
        'tsd-kind-class tsd-parent-kind-external-module tsd-is-not-exported',
      parent: '"defaults/runningSessions"'
    },
    {
      id: 671,
      kind: 512,
      name: 'constructor',
      url:
        'classes/_defaults_runningsessions_.runningsessions.html#constructor',
      classes:
        'tsd-kind-constructor tsd-parent-kind-class tsd-is-overwrite tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 672,
      kind: 2048,
      name: 'render',
      url: 'classes/_defaults_runningsessions_.runningsessions.html#render',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 673,
      kind: 2048,
      name: 'dispose',
      url: 'classes/_defaults_runningsessions_.runningsessions.html#dispose',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 674,
      kind: 2048,
      name: '_onKernelsRunningChanged',
      url:
        'classes/_defaults_runningsessions_.runningsessions.html#_onkernelsrunningchanged',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 675,
      kind: 2048,
      name: '_onTerminalsRunningChanged',
      url:
        'classes/_defaults_runningsessions_.runningsessions.html#_onterminalsrunningchanged',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 676,
      kind: 2048,
      name: '_handleItemClick',
      url:
        'classes/_defaults_runningsessions_.runningsessions.html#_handleitemclick',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 677,
      kind: 1024,
      name: '_host',
      url: 'classes/_defaults_runningsessions_.runningsessions.html#_host',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 678,
      kind: 1024,
      name: '_serviceManager',
      url:
        'classes/_defaults_runningsessions_.runningsessions.html#_servicemanager',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 679,
      kind: 1024,
      name: 'modelChanged',
      url:
        'classes/_defaults_runningsessions_.runningsessions.html#modelchanged',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 680,
      kind: 1024,
      name: 'model',
      url: 'classes/_defaults_runningsessions_.runningsessions.html#model-1',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 681,
      kind: 2048,
      name: 'onUpdateRequest',
      url:
        'classes/_defaults_runningsessions_.runningsessions.html#onupdaterequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 682,
      kind: 2048,
      name: 'onAfterAttach',
      url:
        'classes/_defaults_runningsessions_.runningsessions.html#onafterattach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 683,
      kind: 1024,
      name: 'disposed',
      url: 'classes/_defaults_runningsessions_.runningsessions.html#disposed',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 684,
      kind: 1024,
      name: 'node',
      url: 'classes/_defaults_runningsessions_.runningsessions.html#node',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 685,
      kind: 1024,
      name: 'isDisposed',
      url: 'classes/_defaults_runningsessions_.runningsessions.html#isdisposed',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 686,
      kind: 1024,
      name: 'isAttached',
      url: 'classes/_defaults_runningsessions_.runningsessions.html#isattached',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 687,
      kind: 1024,
      name: 'isHidden',
      url: 'classes/_defaults_runningsessions_.runningsessions.html#ishidden',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 688,
      kind: 1024,
      name: 'isVisible',
      url: 'classes/_defaults_runningsessions_.runningsessions.html#isvisible',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 689,
      kind: 1024,
      name: 'title',
      url: 'classes/_defaults_runningsessions_.runningsessions.html#title',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 690,
      kind: 1024,
      name: 'id',
      url: 'classes/_defaults_runningsessions_.runningsessions.html#id',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 691,
      kind: 1024,
      name: 'dataset',
      url: 'classes/_defaults_runningsessions_.runningsessions.html#dataset',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 692,
      kind: 1024,
      name: 'parent',
      url: 'classes/_defaults_runningsessions_.runningsessions.html#parent',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 693,
      kind: 1024,
      name: 'layout',
      url: 'classes/_defaults_runningsessions_.runningsessions.html#layout',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 694,
      kind: 2048,
      name: 'children',
      url: 'classes/_defaults_runningsessions_.runningsessions.html#children',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 695,
      kind: 2048,
      name: 'contains',
      url: 'classes/_defaults_runningsessions_.runningsessions.html#contains',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 696,
      kind: 2048,
      name: 'hasClass',
      url: 'classes/_defaults_runningsessions_.runningsessions.html#hasclass',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 697,
      kind: 2048,
      name: 'addClass',
      url: 'classes/_defaults_runningsessions_.runningsessions.html#addclass',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 698,
      kind: 2048,
      name: 'removeClass',
      url:
        'classes/_defaults_runningsessions_.runningsessions.html#removeclass',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 699,
      kind: 2048,
      name: 'toggleClass',
      url:
        'classes/_defaults_runningsessions_.runningsessions.html#toggleclass',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 700,
      kind: 2048,
      name: 'update',
      url: 'classes/_defaults_runningsessions_.runningsessions.html#update',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 701,
      kind: 2048,
      name: 'fit',
      url: 'classes/_defaults_runningsessions_.runningsessions.html#fit',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 702,
      kind: 2048,
      name: 'activate',
      url: 'classes/_defaults_runningsessions_.runningsessions.html#activate',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 703,
      kind: 2048,
      name: 'close',
      url: 'classes/_defaults_runningsessions_.runningsessions.html#close',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 704,
      kind: 2048,
      name: 'show',
      url: 'classes/_defaults_runningsessions_.runningsessions.html#show',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 705,
      kind: 2048,
      name: 'hide',
      url: 'classes/_defaults_runningsessions_.runningsessions.html#hide',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 706,
      kind: 2048,
      name: 'setHidden',
      url: 'classes/_defaults_runningsessions_.runningsessions.html#sethidden',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 707,
      kind: 2048,
      name: 'testFlag',
      url: 'classes/_defaults_runningsessions_.runningsessions.html#testflag',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 708,
      kind: 2048,
      name: 'setFlag',
      url: 'classes/_defaults_runningsessions_.runningsessions.html#setflag',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 709,
      kind: 2048,
      name: 'clearFlag',
      url: 'classes/_defaults_runningsessions_.runningsessions.html#clearflag',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 710,
      kind: 2048,
      name: 'processMessage',
      url:
        'classes/_defaults_runningsessions_.runningsessions.html#processmessage',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 711,
      kind: 2048,
      name: 'notifyLayout',
      url:
        'classes/_defaults_runningsessions_.runningsessions.html#notifylayout',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 712,
      kind: 2048,
      name: 'onCloseRequest',
      url:
        'classes/_defaults_runningsessions_.runningsessions.html#oncloserequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 713,
      kind: 2048,
      name: 'onResize',
      url: 'classes/_defaults_runningsessions_.runningsessions.html#onresize',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 714,
      kind: 2048,
      name: 'onFitRequest',
      url:
        'classes/_defaults_runningsessions_.runningsessions.html#onfitrequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 715,
      kind: 2048,
      name: 'onActivateRequest',
      url:
        'classes/_defaults_runningsessions_.runningsessions.html#onactivaterequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 716,
      kind: 2048,
      name: 'onBeforeShow',
      url:
        'classes/_defaults_runningsessions_.runningsessions.html#onbeforeshow',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 717,
      kind: 2048,
      name: 'onAfterShow',
      url:
        'classes/_defaults_runningsessions_.runningsessions.html#onaftershow',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 718,
      kind: 2048,
      name: 'onBeforeHide',
      url:
        'classes/_defaults_runningsessions_.runningsessions.html#onbeforehide',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 719,
      kind: 2048,
      name: 'onAfterHide',
      url:
        'classes/_defaults_runningsessions_.runningsessions.html#onafterhide',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 720,
      kind: 2048,
      name: 'onBeforeAttach',
      url:
        'classes/_defaults_runningsessions_.runningsessions.html#onbeforeattach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 721,
      kind: 2048,
      name: 'onBeforeDetach',
      url:
        'classes/_defaults_runningsessions_.runningsessions.html#onbeforedetach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 722,
      kind: 2048,
      name: 'onAfterDetach',
      url:
        'classes/_defaults_runningsessions_.runningsessions.html#onafterdetach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 723,
      kind: 2048,
      name: 'onChildAdded',
      url:
        'classes/_defaults_runningsessions_.runningsessions.html#onchildadded',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 724,
      kind: 2048,
      name: 'onChildRemoved',
      url:
        'classes/_defaults_runningsessions_.runningsessions.html#onchildremoved',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 725,
      kind: 2,
      name: 'VDomRenderer',
      url:
        'modules/_defaults_runningsessions_.runningsessions.vdomrenderer.html',
      classes: 'tsd-kind-module tsd-parent-kind-class',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 726,
      kind: 256,
      name: 'IModel',
      url:
        'interfaces/_defaults_runningsessions_.runningsessions.vdomrenderer.imodel.html',
      classes: 'tsd-kind-interface tsd-parent-kind-module tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions.VDomRenderer'
    },
    {
      id: 727,
      kind: 1024,
      name: 'stateChanged',
      url:
        'interfaces/_defaults_runningsessions_.runningsessions.vdomrenderer.imodel.html#statechanged',
      classes:
        'tsd-kind-property tsd-parent-kind-interface tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions.VDomRenderer.IModel'
    },
    {
      id: 728,
      kind: 1024,
      name: 'isDisposed',
      url:
        'interfaces/_defaults_runningsessions_.runningsessions.vdomrenderer.imodel.html#isdisposed',
      classes:
        'tsd-kind-property tsd-parent-kind-interface tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions.VDomRenderer.IModel'
    },
    {
      id: 729,
      kind: 2048,
      name: 'dispose',
      url:
        'interfaces/_defaults_runningsessions_.runningsessions.vdomrenderer.imodel.html#dispose',
      classes:
        'tsd-kind-method tsd-parent-kind-interface tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/runningSessions".RunningSessions.VDomRenderer.IModel'
    },
    {
      id: 730,
      kind: 2,
      name: 'IRunningSessions',
      url: 'modules/_defaults_runningsessions_.irunningsessions.html',
      classes: 'tsd-kind-module tsd-parent-kind-external-module',
      parent: '"defaults/runningSessions"'
    },
    {
      id: 731,
      kind: 1024,
      name: 'model',
      url: 'modules/_defaults_runningsessions_.irunningsessions.html#model',
      classes: 'tsd-kind-property tsd-parent-kind-module',
      parent: '"defaults/runningSessions".IRunningSessions'
    },
    {
      id: 732,
      kind: 1024,
      name: 'modelChanged',
      url:
        'modules/_defaults_runningsessions_.irunningsessions.html#modelchanged',
      classes: 'tsd-kind-property tsd-parent-kind-module',
      parent: '"defaults/runningSessions".IRunningSessions'
    },
    {
      id: 733,
      kind: 1024,
      name: 'isDisposed',
      url:
        'modules/_defaults_runningsessions_.irunningsessions.html#isdisposed',
      classes: 'tsd-kind-property tsd-parent-kind-module tsd-is-inherited',
      parent: '"defaults/runningSessions".IRunningSessions'
    },
    {
      id: 734,
      kind: 2048,
      name: 'dispose',
      url: 'modules/_defaults_runningsessions_.irunningsessions.html#dispose',
      classes: 'tsd-kind-method tsd-parent-kind-module tsd-is-inherited',
      parent: '"defaults/runningSessions".IRunningSessions'
    },
    {
      id: 735,
      kind: 2,
      name: 'RunningSessionsComponent',
      url: 'modules/_defaults_runningsessions_.runningsessionscomponent.html',
      classes:
        'tsd-kind-module tsd-parent-kind-external-module tsd-is-not-exported',
      parent: '"defaults/runningSessions"'
    },
    {
      id: 736,
      kind: 256,
      name: 'IProps',
      url:
        'interfaces/_defaults_runningsessions_.runningsessionscomponent.iprops.html',
      classes: 'tsd-kind-interface tsd-parent-kind-module',
      parent: '"defaults/runningSessions".RunningSessionsComponent'
    },
    {
      id: 737,
      kind: 1024,
      name: 'handleClick',
      url:
        'interfaces/_defaults_runningsessions_.runningsessionscomponent.iprops.html#handleclick',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/runningSessions".RunningSessionsComponent.IProps'
    },
    {
      id: 738,
      kind: 65536,
      name: '__type',
      url:
        'interfaces/_defaults_runningsessions_.runningsessionscomponent.iprops.html#handleclick.__type',
      classes:
        'tsd-kind-type-literal tsd-parent-kind-property tsd-is-not-exported',
      parent:
        '"defaults/runningSessions".RunningSessionsComponent.IProps.handleClick'
    },
    {
      id: 739,
      kind: 1024,
      name: 'kernels',
      url:
        'interfaces/_defaults_runningsessions_.runningsessionscomponent.iprops.html#kernels',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/runningSessions".RunningSessionsComponent.IProps'
    },
    {
      id: 740,
      kind: 1024,
      name: 'terminals',
      url:
        'interfaces/_defaults_runningsessions_.runningsessionscomponent.iprops.html#terminals',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/runningSessions".RunningSessionsComponent.IProps'
    },
    {
      id: 741,
      kind: 128,
      name: 'Model',
      url: 'classes/_defaults_runningsessions_.runningsessions.model.html',
      classes: 'tsd-kind-class tsd-parent-kind-class',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 742,
      kind: 262144,
      name: 'kernels',
      url:
        'classes/_defaults_runningsessions_.runningsessions.model.html#kernels',
      classes: 'tsd-kind-accessor tsd-parent-kind-class',
      parent: '"defaults/runningSessions".RunningSessions.Model'
    },
    {
      id: 743,
      kind: 262144,
      name: 'terminals',
      url:
        'classes/_defaults_runningsessions_.runningsessions.model.html#terminals',
      classes: 'tsd-kind-accessor tsd-parent-kind-class',
      parent: '"defaults/runningSessions".RunningSessions.Model'
    },
    {
      id: 744,
      kind: 1024,
      name: '_terminals',
      url:
        'classes/_defaults_runningsessions_.runningsessions.model.html#_terminals',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/runningSessions".RunningSessions.Model'
    },
    {
      id: 745,
      kind: 1024,
      name: '_kernels',
      url:
        'classes/_defaults_runningsessions_.runningsessions.model.html#_kernels',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/runningSessions".RunningSessions.Model'
    },
    {
      id: 746,
      kind: 1024,
      name: 'stateChanged',
      url:
        'classes/_defaults_runningsessions_.runningsessions.model.html#statechanged',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-inherited',
      parent: '"defaults/runningSessions".RunningSessions.Model'
    },
    {
      id: 747,
      kind: 1024,
      name: 'isDisposed',
      url:
        'classes/_defaults_runningsessions_.runningsessions.model.html#isdisposed',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-inherited',
      parent: '"defaults/runningSessions".RunningSessions.Model'
    },
    {
      id: 748,
      kind: 2048,
      name: 'dispose',
      url:
        'classes/_defaults_runningsessions_.runningsessions.model.html#dispose',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-inherited',
      parent: '"defaults/runningSessions".RunningSessions.Model'
    },
    {
      id: 749,
      kind: 256,
      name: 'IOptions',
      url:
        'interfaces/_defaults_runningsessions_.runningsessions.ioptions.html',
      classes: 'tsd-kind-interface tsd-parent-kind-class',
      parent: '"defaults/runningSessions".RunningSessions'
    },
    {
      id: 750,
      kind: 1024,
      name: 'host',
      url:
        'interfaces/_defaults_runningsessions_.runningsessions.ioptions.html#host',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/runningSessions".RunningSessions.IOptions'
    },
    {
      id: 751,
      kind: 1024,
      name: 'serviceManager',
      url:
        'interfaces/_defaults_runningsessions_.runningsessions.ioptions.html#servicemanager',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/runningSessions".RunningSessions.IOptions'
    },
    {
      id: 752,
      kind: 256,
      name: 'IModel',
      url: 'interfaces/_defaults_runningsessions_.irunningsessions.imodel.html',
      classes: 'tsd-kind-interface tsd-parent-kind-module',
      parent: '"defaults/runningSessions".IRunningSessions'
    },
    {
      id: 753,
      kind: 1024,
      name: 'terminals',
      url:
        'interfaces/_defaults_runningsessions_.irunningsessions.imodel.html#terminals',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/runningSessions".IRunningSessions.IModel'
    },
    {
      id: 754,
      kind: 1024,
      name: 'kernels',
      url:
        'interfaces/_defaults_runningsessions_.irunningsessions.imodel.html#kernels',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/runningSessions".IRunningSessions.IModel'
    },
    {
      id: 755,
      kind: 2097152,
      name: 'runningSessionsItem',
      url: 'modules/_defaults_runningsessions_.html#runningsessionsitem',
      classes: 'tsd-kind-object-literal tsd-parent-kind-external-module',
      parent: '"defaults/runningSessions"'
    },
    {
      id: 756,
      kind: 32,
      name: 'id',
      url: 'modules/_defaults_runningsessions_.html#runningsessionsitem.id',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/runningSessions".runningSessionsItem'
    },
    {
      id: 757,
      kind: 32,
      name: 'autoStart',
      url:
        'modules/_defaults_runningsessions_.html#runningsessionsitem.autostart',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/runningSessions".runningSessionsItem'
    },
    {
      id: 758,
      kind: 32,
      name: 'provides',
      url:
        'modules/_defaults_runningsessions_.html#runningsessionsitem.provides',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/runningSessions".runningSessionsItem'
    },
    {
      id: 759,
      kind: 32,
      name: 'requires',
      url:
        'modules/_defaults_runningsessions_.html#runningsessionsitem.requires',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/runningSessions".runningSessionsItem'
    },
    {
      id: 760,
      kind: 64,
      name: 'activate',
      url:
        'modules/_defaults_runningsessions_.html#runningsessionsitem.activate',
      classes: 'tsd-kind-function tsd-parent-kind-object-literal',
      parent: '"defaults/runningSessions".runningSessionsItem'
    },
    {
      id: 761,
      kind: 1,
      name: '"util/settings"',
      url: 'modules/_util_settings_.html',
      classes: 'tsd-kind-external-module'
    },
    {
      id: 762,
      kind: 128,
      name: 'SettingsConnector',
      url: 'classes/_util_settings_.settingsconnector.html',
      classes:
        'tsd-kind-class tsd-parent-kind-external-module tsd-has-type-parameter',
      parent: '"util/settings"'
    },
    {
      id: 763,
      kind: 512,
      name: 'constructor',
      url: 'classes/_util_settings_.settingsconnector.html#constructor',
      classes: 'tsd-kind-constructor tsd-parent-kind-class',
      parent: '"util/settings".SettingsConnector'
    },
    {
      id: 764,
      kind: 262144,
      name: 'pluginId',
      url: 'classes/_util_settings_.settingsconnector.html#pluginid',
      classes: 'tsd-kind-get-signature tsd-parent-kind-class',
      parent: '"util/settings".SettingsConnector'
    },
    {
      id: 765,
      kind: 262144,
      name: 'registry',
      url: 'classes/_util_settings_.settingsconnector.html#registry',
      classes: 'tsd-kind-get-signature tsd-parent-kind-class',
      parent: '"util/settings".SettingsConnector'
    },
    {
      id: 766,
      kind: 262144,
      name: 'changed',
      url: 'classes/_util_settings_.settingsconnector.html#changed',
      classes: 'tsd-kind-get-signature tsd-parent-kind-class',
      parent: '"util/settings".SettingsConnector'
    },
    {
      id: 767,
      kind: 262144,
      name: 'currentValue',
      url: 'classes/_util_settings_.settingsconnector.html#currentvalue',
      classes: 'tsd-kind-accessor tsd-parent-kind-class',
      parent: '"util/settings".SettingsConnector'
    },
    {
      id: 768,
      kind: 262144,
      name: 'isDisposed',
      url: 'classes/_util_settings_.settingsconnector.html#isdisposed',
      classes: 'tsd-kind-get-signature tsd-parent-kind-class',
      parent: '"util/settings".SettingsConnector'
    },
    {
      id: 769,
      kind: 2048,
      name: '_onSettingsUpdated',
      url: 'classes/_util_settings_.settingsconnector.html#_onsettingsupdated',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-private',
      parent: '"util/settings".SettingsConnector'
    },
    {
      id: 770,
      kind: 2048,
      name: 'dispose',
      url: 'classes/_util_settings_.settingsconnector.html#dispose',
      classes: 'tsd-kind-method tsd-parent-kind-class',
      parent: '"util/settings".SettingsConnector'
    },
    {
      id: 771,
      kind: 1024,
      name: '_isDisposed',
      url: 'classes/_util_settings_.settingsconnector.html#_isdisposed',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"util/settings".SettingsConnector'
    },
    {
      id: 772,
      kind: 1024,
      name: '_changed',
      url: 'classes/_util_settings_.settingsconnector.html#_changed',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"util/settings".SettingsConnector'
    },
    {
      id: 773,
      kind: 1024,
      name: '_registry',
      url: 'classes/_util_settings_.settingsconnector.html#_registry',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"util/settings".SettingsConnector'
    },
    {
      id: 774,
      kind: 1024,
      name: '_settings',
      url: 'classes/_util_settings_.settingsconnector.html#_settings',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"util/settings".SettingsConnector'
    },
    {
      id: 775,
      kind: 1024,
      name: '_pluginId',
      url: 'classes/_util_settings_.settingsconnector.html#_pluginid',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"util/settings".SettingsConnector'
    },
    {
      id: 776,
      kind: 1024,
      name: '_settingKey',
      url: 'classes/_util_settings_.settingsconnector.html#_settingkey',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"util/settings".SettingsConnector'
    },
    {
      id: 777,
      kind: 1024,
      name: '_value',
      url: 'classes/_util_settings_.settingsconnector.html#_value',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"util/settings".SettingsConnector'
    },
    {
      id: 778,
      kind: 256,
      name: 'IOptions',
      url: 'interfaces/_util_settings_.settingsconnector.ioptions.html',
      classes: 'tsd-kind-interface tsd-parent-kind-class',
      parent: '"util/settings".SettingsConnector'
    },
    {
      id: 779,
      kind: 1024,
      name: 'registry',
      url:
        'interfaces/_util_settings_.settingsconnector.ioptions.html#registry',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"util/settings".SettingsConnector.IOptions'
    },
    {
      id: 780,
      kind: 1024,
      name: 'pluginId',
      url:
        'interfaces/_util_settings_.settingsconnector.ioptions.html#pluginid',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"util/settings".SettingsConnector.IOptions'
    },
    {
      id: 781,
      kind: 1024,
      name: 'settingKey',
      url:
        'interfaces/_util_settings_.settingsconnector.ioptions.html#settingkey',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"util/settings".SettingsConnector.IOptions'
    },
    {
      id: 782,
      kind: 256,
      name: 'IChangedArgs',
      url: 'interfaces/_util_settings_.settingsconnector.ichangedargs.html',
      classes:
        'tsd-kind-interface tsd-parent-kind-class tsd-has-type-parameter',
      parent: '"util/settings".SettingsConnector'
    },
    {
      id: 783,
      kind: 1024,
      name: 'newValue',
      url:
        'interfaces/_util_settings_.settingsconnector.ichangedargs.html#newvalue',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"util/settings".SettingsConnector.IChangedArgs'
    },
    {
      id: 784,
      kind: 1024,
      name: 'oldValue',
      url:
        'interfaces/_util_settings_.settingsconnector.ichangedargs.html#oldvalue',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"util/settings".SettingsConnector.IChangedArgs'
    },
    {
      id: 785,
      kind: 1,
      name: '"defaults/tabSpace"',
      url: 'modules/_defaults_tabspace_.html',
      classes: 'tsd-kind-external-module'
    },
    {
      id: 786,
      kind: 128,
      name: 'TabSpace',
      url: 'classes/_defaults_tabspace_.tabspace.html',
      classes:
        'tsd-kind-class tsd-parent-kind-external-module tsd-is-not-exported',
      parent: '"defaults/tabSpace"'
    },
    {
      id: 787,
      kind: 512,
      name: 'constructor',
      url: 'classes/_defaults_tabspace_.tabspace.html#constructor',
      classes:
        'tsd-kind-constructor tsd-parent-kind-class tsd-is-overwrite tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 788,
      kind: 2048,
      name: '_handleClick',
      url: 'classes/_defaults_tabspace_.tabspace.html#_handleclick',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 789,
      kind: 2048,
      name: 'render',
      url: 'classes/_defaults_tabspace_.tabspace.html#render',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 790,
      kind: 2048,
      name: 'dispose',
      url: 'classes/_defaults_tabspace_.tabspace.html#dispose',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 791,
      kind: 2048,
      name: 'onUpdateRequest',
      url: 'classes/_defaults_tabspace_.tabspace.html#onupdaterequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 792,
      kind: 2048,
      name: '_onActiveCellChange',
      url: 'classes/_defaults_tabspace_.tabspace.html#_onactivecellchange',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 793,
      kind: 2048,
      name: '_getFocusedSettingProvider',
      url:
        'classes/_defaults_tabspace_.tabspace.html#_getfocusedsettingprovider',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 794,
      kind: 2048,
      name: '_onMainAreaCurrentChange',
      url: 'classes/_defaults_tabspace_.tabspace.html#_onmainareacurrentchange',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 795,
      kind: 1024,
      name: '_notebookTracker',
      url: 'classes/_defaults_tabspace_.tabspace.html#_notebooktracker',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 796,
      kind: 1024,
      name: '_editorTracker',
      url: 'classes/_defaults_tabspace_.tabspace.html#_editortracker',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 797,
      kind: 1024,
      name: '_consoleTracker',
      url: 'classes/_defaults_tabspace_.tabspace.html#_consoletracker',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 798,
      kind: 1024,
      name: '_shell',
      url: 'classes/_defaults_tabspace_.tabspace.html#_shell',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 799,
      kind: 1024,
      name: '_settingsProviderData',
      url: 'classes/_defaults_tabspace_.tabspace.html#_settingsproviderdata',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 800,
      kind: 1024,
      name: 'modelChanged',
      url: 'classes/_defaults_tabspace_.tabspace.html#modelchanged',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 801,
      kind: 1024,
      name: 'model',
      url: 'classes/_defaults_tabspace_.tabspace.html#model-1',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 802,
      kind: 2048,
      name: 'onAfterAttach',
      url: 'classes/_defaults_tabspace_.tabspace.html#onafterattach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 803,
      kind: 1024,
      name: 'disposed',
      url: 'classes/_defaults_tabspace_.tabspace.html#disposed',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 804,
      kind: 1024,
      name: 'node',
      url: 'classes/_defaults_tabspace_.tabspace.html#node',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 805,
      kind: 1024,
      name: 'isDisposed',
      url: 'classes/_defaults_tabspace_.tabspace.html#isdisposed',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 806,
      kind: 1024,
      name: 'isAttached',
      url: 'classes/_defaults_tabspace_.tabspace.html#isattached',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 807,
      kind: 1024,
      name: 'isHidden',
      url: 'classes/_defaults_tabspace_.tabspace.html#ishidden',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 808,
      kind: 1024,
      name: 'isVisible',
      url: 'classes/_defaults_tabspace_.tabspace.html#isvisible',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 809,
      kind: 1024,
      name: 'title',
      url: 'classes/_defaults_tabspace_.tabspace.html#title',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 810,
      kind: 1024,
      name: 'id',
      url: 'classes/_defaults_tabspace_.tabspace.html#id',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 811,
      kind: 1024,
      name: 'dataset',
      url: 'classes/_defaults_tabspace_.tabspace.html#dataset',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 812,
      kind: 1024,
      name: 'parent',
      url: 'classes/_defaults_tabspace_.tabspace.html#parent',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 813,
      kind: 1024,
      name: 'layout',
      url: 'classes/_defaults_tabspace_.tabspace.html#layout',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 814,
      kind: 2048,
      name: 'children',
      url: 'classes/_defaults_tabspace_.tabspace.html#children',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 815,
      kind: 2048,
      name: 'contains',
      url: 'classes/_defaults_tabspace_.tabspace.html#contains',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 816,
      kind: 2048,
      name: 'hasClass',
      url: 'classes/_defaults_tabspace_.tabspace.html#hasclass',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 817,
      kind: 2048,
      name: 'addClass',
      url: 'classes/_defaults_tabspace_.tabspace.html#addclass',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 818,
      kind: 2048,
      name: 'removeClass',
      url: 'classes/_defaults_tabspace_.tabspace.html#removeclass',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 819,
      kind: 2048,
      name: 'toggleClass',
      url: 'classes/_defaults_tabspace_.tabspace.html#toggleclass',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 820,
      kind: 2048,
      name: 'update',
      url: 'classes/_defaults_tabspace_.tabspace.html#update',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 821,
      kind: 2048,
      name: 'fit',
      url: 'classes/_defaults_tabspace_.tabspace.html#fit',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 822,
      kind: 2048,
      name: 'activate',
      url: 'classes/_defaults_tabspace_.tabspace.html#activate',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 823,
      kind: 2048,
      name: 'close',
      url: 'classes/_defaults_tabspace_.tabspace.html#close',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 824,
      kind: 2048,
      name: 'show',
      url: 'classes/_defaults_tabspace_.tabspace.html#show',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 825,
      kind: 2048,
      name: 'hide',
      url: 'classes/_defaults_tabspace_.tabspace.html#hide',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 826,
      kind: 2048,
      name: 'setHidden',
      url: 'classes/_defaults_tabspace_.tabspace.html#sethidden',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 827,
      kind: 2048,
      name: 'testFlag',
      url: 'classes/_defaults_tabspace_.tabspace.html#testflag',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 828,
      kind: 2048,
      name: 'setFlag',
      url: 'classes/_defaults_tabspace_.tabspace.html#setflag',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 829,
      kind: 2048,
      name: 'clearFlag',
      url: 'classes/_defaults_tabspace_.tabspace.html#clearflag',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 830,
      kind: 2048,
      name: 'processMessage',
      url: 'classes/_defaults_tabspace_.tabspace.html#processmessage',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 831,
      kind: 2048,
      name: 'notifyLayout',
      url: 'classes/_defaults_tabspace_.tabspace.html#notifylayout',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 832,
      kind: 2048,
      name: 'onCloseRequest',
      url: 'classes/_defaults_tabspace_.tabspace.html#oncloserequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 833,
      kind: 2048,
      name: 'onResize',
      url: 'classes/_defaults_tabspace_.tabspace.html#onresize',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 834,
      kind: 2048,
      name: 'onFitRequest',
      url: 'classes/_defaults_tabspace_.tabspace.html#onfitrequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 835,
      kind: 2048,
      name: 'onActivateRequest',
      url: 'classes/_defaults_tabspace_.tabspace.html#onactivaterequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 836,
      kind: 2048,
      name: 'onBeforeShow',
      url: 'classes/_defaults_tabspace_.tabspace.html#onbeforeshow',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 837,
      kind: 2048,
      name: 'onAfterShow',
      url: 'classes/_defaults_tabspace_.tabspace.html#onaftershow',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 838,
      kind: 2048,
      name: 'onBeforeHide',
      url: 'classes/_defaults_tabspace_.tabspace.html#onbeforehide',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 839,
      kind: 2048,
      name: 'onAfterHide',
      url: 'classes/_defaults_tabspace_.tabspace.html#onafterhide',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 840,
      kind: 2048,
      name: 'onBeforeAttach',
      url: 'classes/_defaults_tabspace_.tabspace.html#onbeforeattach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 841,
      kind: 2048,
      name: 'onBeforeDetach',
      url: 'classes/_defaults_tabspace_.tabspace.html#onbeforedetach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 842,
      kind: 2048,
      name: 'onAfterDetach',
      url: 'classes/_defaults_tabspace_.tabspace.html#onafterdetach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 843,
      kind: 2048,
      name: 'onChildAdded',
      url: 'classes/_defaults_tabspace_.tabspace.html#onchildadded',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 844,
      kind: 2048,
      name: 'onChildRemoved',
      url: 'classes/_defaults_tabspace_.tabspace.html#onchildremoved',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 845,
      kind: 2,
      name: 'VDomRenderer',
      url: 'modules/_defaults_tabspace_.tabspace.vdomrenderer.html',
      classes: 'tsd-kind-module tsd-parent-kind-class',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 846,
      kind: 256,
      name: 'IModel',
      url: 'interfaces/_defaults_tabspace_.tabspace.vdomrenderer.imodel.html',
      classes: 'tsd-kind-interface tsd-parent-kind-module tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace.VDomRenderer'
    },
    {
      id: 847,
      kind: 1024,
      name: 'stateChanged',
      url:
        'interfaces/_defaults_tabspace_.tabspace.vdomrenderer.imodel.html#statechanged',
      classes:
        'tsd-kind-property tsd-parent-kind-interface tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace.VDomRenderer.IModel'
    },
    {
      id: 848,
      kind: 1024,
      name: 'isDisposed',
      url:
        'interfaces/_defaults_tabspace_.tabspace.vdomrenderer.imodel.html#isdisposed',
      classes:
        'tsd-kind-property tsd-parent-kind-interface tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace.VDomRenderer.IModel'
    },
    {
      id: 849,
      kind: 2048,
      name: 'dispose',
      url:
        'interfaces/_defaults_tabspace_.tabspace.vdomrenderer.imodel.html#dispose',
      classes:
        'tsd-kind-method tsd-parent-kind-interface tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace.VDomRenderer.IModel'
    },
    {
      id: 850,
      kind: 2,
      name: 'ITabSpace',
      url: 'modules/_defaults_tabspace_.itabspace.html',
      classes: 'tsd-kind-module tsd-parent-kind-external-module',
      parent: '"defaults/tabSpace"'
    },
    {
      id: 851,
      kind: 1024,
      name: 'model',
      url: 'modules/_defaults_tabspace_.itabspace.html#model',
      classes: 'tsd-kind-property tsd-parent-kind-module',
      parent: '"defaults/tabSpace".ITabSpace'
    },
    {
      id: 852,
      kind: 1024,
      name: 'modelChanged',
      url: 'modules/_defaults_tabspace_.itabspace.html#modelchanged',
      classes: 'tsd-kind-property tsd-parent-kind-module',
      parent: '"defaults/tabSpace".ITabSpace'
    },
    {
      id: 853,
      kind: 1024,
      name: 'isDisposed',
      url: 'modules/_defaults_tabspace_.itabspace.html#isdisposed',
      classes: 'tsd-kind-property tsd-parent-kind-module tsd-is-inherited',
      parent: '"defaults/tabSpace".ITabSpace'
    },
    {
      id: 854,
      kind: 2048,
      name: 'dispose',
      url: 'modules/_defaults_tabspace_.itabspace.html#dispose',
      classes: 'tsd-kind-method tsd-parent-kind-module tsd-is-inherited',
      parent: '"defaults/tabSpace".ITabSpace'
    },
    {
      id: 855,
      kind: 64,
      name: 'TabSpaceComponent',
      url: 'modules/_defaults_tabspace_.html#tabspacecomponent',
      classes:
        'tsd-kind-function tsd-parent-kind-external-module tsd-is-not-exported',
      parent: '"defaults/tabSpace"'
    },
    {
      id: 856,
      kind: 256,
      name: 'IProps',
      url: 'modules/_defaults_tabspace_.html#tabspacecomponent.iprops',
      classes: 'tsd-kind-interface tsd-parent-kind-function',
      parent: '"defaults/tabSpace".TabSpaceComponent'
    },
    {
      id: 857,
      kind: 1024,
      name: 'tabSpace',
      url:
        'modules/_defaults_tabspace_.html#tabspacecomponent.iprops.tabspace-1',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/tabSpace".TabSpaceComponent.IProps'
    },
    {
      id: 858,
      kind: 1024,
      name: 'isSpaces',
      url: 'modules/_defaults_tabspace_.html#tabspacecomponent.iprops.isspaces',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/tabSpace".TabSpaceComponent.IProps'
    },
    {
      id: 859,
      kind: 1024,
      name: 'handleClick',
      url:
        'modules/_defaults_tabspace_.html#tabspacecomponent.iprops.handleclick',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/tabSpace".TabSpaceComponent.IProps'
    },
    {
      id: 860,
      kind: 65536,
      name: '__type',
      url:
        'modules/_defaults_tabspace_.html#tabspacecomponent.iprops.handleclick.__type',
      classes:
        'tsd-kind-type-literal tsd-parent-kind-property tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpaceComponent.IProps.handleClick'
    },
    {
      id: 861,
      kind: 2,
      name: 'Private',
      url: 'modules/_defaults_tabspace_.private.html',
      classes:
        'tsd-kind-module tsd-parent-kind-external-module tsd-is-not-exported',
      parent: '"defaults/tabSpace"'
    },
    {
      id: 862,
      kind: 64,
      name: 'initNotebookConnectorAndMenu',
      url:
        'modules/_defaults_tabspace_.private.html#initnotebookconnectorandmenu',
      classes: 'tsd-kind-function tsd-parent-kind-module',
      parent: '"defaults/tabSpace".Private'
    },
    {
      id: 863,
      kind: 128,
      name: 'Model',
      url: 'classes/_defaults_tabspace_.tabspace.model.html',
      classes: 'tsd-kind-class tsd-parent-kind-class',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 864,
      kind: 512,
      name: 'constructor',
      url: 'classes/_defaults_tabspace_.tabspace.model.html#constructor',
      classes: 'tsd-kind-constructor tsd-parent-kind-class',
      parent: '"defaults/tabSpace".TabSpace.Model'
    },
    {
      id: 865,
      kind: 262144,
      name: 'settingConnector',
      url: 'classes/_defaults_tabspace_.tabspace.model.html#settingconnector',
      classes: 'tsd-kind-accessor tsd-parent-kind-class',
      parent: '"defaults/tabSpace".TabSpace.Model'
    },
    {
      id: 866,
      kind: 262144,
      name: 'tabSpace',
      url: 'classes/_defaults_tabspace_.tabspace.model.html#tabspace',
      classes: 'tsd-kind-get-signature tsd-parent-kind-class',
      parent: '"defaults/tabSpace".TabSpace.Model'
    },
    {
      id: 867,
      kind: 2048,
      name: '_onTabSizeChanged',
      url: 'classes/_defaults_tabspace_.tabspace.model.html#_ontabsizechanged',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/tabSpace".TabSpace.Model'
    },
    {
      id: 868,
      kind: 2048,
      name: '_triggerChange',
      url: 'classes/_defaults_tabspace_.tabspace.model.html#_triggerchange',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/tabSpace".TabSpace.Model'
    },
    {
      id: 869,
      kind: 1024,
      name: '_tabSpace',
      url: 'classes/_defaults_tabspace_.tabspace.model.html#_tabspace',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/tabSpace".TabSpace.Model'
    },
    {
      id: 870,
      kind: 1024,
      name: '_settingConnector',
      url: 'classes/_defaults_tabspace_.tabspace.model.html#_settingconnector',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/tabSpace".TabSpace.Model'
    },
    {
      id: 871,
      kind: 1024,
      name: 'stateChanged',
      url: 'classes/_defaults_tabspace_.tabspace.model.html#statechanged',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-inherited',
      parent: '"defaults/tabSpace".TabSpace.Model'
    },
    {
      id: 872,
      kind: 1024,
      name: 'isDisposed',
      url: 'classes/_defaults_tabspace_.tabspace.model.html#isdisposed',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-inherited',
      parent: '"defaults/tabSpace".TabSpace.Model'
    },
    {
      id: 873,
      kind: 2048,
      name: 'dispose',
      url: 'classes/_defaults_tabspace_.tabspace.model.html#dispose',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-inherited',
      parent: '"defaults/tabSpace".TabSpace.Model'
    },
    {
      id: 874,
      kind: 256,
      name: 'IOptions',
      url: 'interfaces/_defaults_tabspace_.tabspace.ioptions.html',
      classes: 'tsd-kind-interface tsd-parent-kind-class',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 875,
      kind: 1024,
      name: 'notebookTracker',
      url:
        'interfaces/_defaults_tabspace_.tabspace.ioptions.html#notebooktracker',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/tabSpace".TabSpace.IOptions'
    },
    {
      id: 876,
      kind: 1024,
      name: 'editorTracker',
      url:
        'interfaces/_defaults_tabspace_.tabspace.ioptions.html#editortracker',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/tabSpace".TabSpace.IOptions'
    },
    {
      id: 877,
      kind: 1024,
      name: 'consoleTracker',
      url:
        'interfaces/_defaults_tabspace_.tabspace.ioptions.html#consoletracker',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/tabSpace".TabSpace.IOptions'
    },
    {
      id: 878,
      kind: 1024,
      name: 'shell',
      url: 'interfaces/_defaults_tabspace_.tabspace.ioptions.html#shell',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/tabSpace".TabSpace.IOptions'
    },
    {
      id: 879,
      kind: 1024,
      name: 'commands',
      url: 'interfaces/_defaults_tabspace_.tabspace.ioptions.html#commands',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/tabSpace".TabSpace.IOptions'
    },
    {
      id: 880,
      kind: 1024,
      name: 'settings',
      url: 'interfaces/_defaults_tabspace_.tabspace.ioptions.html#settings',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/tabSpace".TabSpace.IOptions'
    },
    {
      id: 881,
      kind: 1024,
      name: 'settingsProviderData',
      url:
        'interfaces/_defaults_tabspace_.tabspace.ioptions.html#settingsproviderdata',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/tabSpace".TabSpace.IOptions'
    },
    {
      id: 882,
      kind: 4194304,
      name: 'SettingProvider',
      url: 'classes/_defaults_tabspace_.tabspace.html#settingprovider',
      classes: 'tsd-kind-type-alias tsd-parent-kind-class tsd-is-static',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 883,
      kind: 4194304,
      name: 'ISettingProviderData',
      url: 'classes/_defaults_tabspace_.tabspace.html#isettingproviderdata',
      classes: 'tsd-kind-type-alias tsd-parent-kind-class tsd-is-static',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 884,
      kind: 65536,
      name: '__type',
      url:
        'classes/_defaults_tabspace_.tabspace.html#isettingproviderdata.__type',
      classes:
        'tsd-kind-type-literal tsd-parent-kind-type-alias tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace.ISettingProviderData'
    },
    {
      id: 885,
      kind: 4194304,
      name: 'SettingData',
      url: 'classes/_defaults_tabspace_.tabspace.html#settingdata',
      classes: 'tsd-kind-type-alias tsd-parent-kind-class tsd-is-static',
      parent: '"defaults/tabSpace".TabSpace'
    },
    {
      id: 886,
      kind: 65536,
      name: '__type',
      url: 'classes/_defaults_tabspace_.tabspace.html#settingdata.__type-1',
      classes:
        'tsd-kind-type-literal tsd-parent-kind-type-alias tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace.SettingData'
    },
    {
      id: 887,
      kind: 32,
      name: 'tabSize',
      url:
        'classes/_defaults_tabspace_.tabspace.html#settingdata.__type-1.tabsize',
      classes:
        'tsd-kind-variable tsd-parent-kind-type-literal tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace.SettingData.__type'
    },
    {
      id: 888,
      kind: 32,
      name: 'insertSpaces',
      url:
        'classes/_defaults_tabspace_.tabspace.html#settingdata.__type-1.insertspaces',
      classes:
        'tsd-kind-variable tsd-parent-kind-type-literal tsd-is-not-exported',
      parent: '"defaults/tabSpace".TabSpace.SettingData.__type'
    },
    {
      id: 889,
      kind: 256,
      name: 'IModel',
      url: 'interfaces/_defaults_tabspace_.itabspace.imodel.html',
      classes: 'tsd-kind-interface tsd-parent-kind-module',
      parent: '"defaults/tabSpace".ITabSpace'
    },
    {
      id: 890,
      kind: 1024,
      name: 'tabSpace',
      url: 'interfaces/_defaults_tabspace_.itabspace.imodel.html#tabspace',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/tabSpace".ITabSpace.IModel'
    },
    {
      id: 891,
      kind: 1024,
      name: 'settingConnector',
      url:
        'interfaces/_defaults_tabspace_.itabspace.imodel.html#settingconnector',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/tabSpace".ITabSpace.IModel'
    },
    {
      id: 892,
      kind: 2097152,
      name: 'tabSpaceItem',
      url: 'modules/_defaults_tabspace_.html#tabspaceitem',
      classes: 'tsd-kind-object-literal tsd-parent-kind-external-module',
      parent: '"defaults/tabSpace"'
    },
    {
      id: 893,
      kind: 32,
      name: 'id',
      url: 'modules/_defaults_tabspace_.html#tabspaceitem.id',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/tabSpace".tabSpaceItem'
    },
    {
      id: 894,
      kind: 32,
      name: 'autoStart',
      url: 'modules/_defaults_tabspace_.html#tabspaceitem.autostart',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/tabSpace".tabSpaceItem'
    },
    {
      id: 895,
      kind: 32,
      name: 'provides',
      url: 'modules/_defaults_tabspace_.html#tabspaceitem.provides',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/tabSpace".tabSpaceItem'
    },
    {
      id: 896,
      kind: 32,
      name: 'requires',
      url: 'modules/_defaults_tabspace_.html#tabspaceitem.requires',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/tabSpace".tabSpaceItem'
    },
    {
      id: 897,
      kind: 64,
      name: 'activate',
      url: 'modules/_defaults_tabspace_.html#tabspaceitem.activate',
      classes: 'tsd-kind-function tsd-parent-kind-object-literal',
      parent: '"defaults/tabSpace".tabSpaceItem'
    },
    {
      id: 898,
      kind: 2,
      name: 'CommandIDs',
      url: 'modules/_defaults_tabspace_.commandids.html',
      classes:
        'tsd-kind-module tsd-parent-kind-external-module tsd-is-not-exported',
      parent: '"defaults/tabSpace"'
    },
    {
      id: 899,
      kind: 32,
      name: 'changeTabsNotebookMarkdown',
      url:
        'modules/_defaults_tabspace_.commandids.html#changetabsnotebookmarkdown',
      classes: 'tsd-kind-variable tsd-parent-kind-module',
      parent: '"defaults/tabSpace".CommandIDs'
    },
    {
      id: 900,
      kind: 32,
      name: 'changeTabsNotebookCode',
      url: 'modules/_defaults_tabspace_.commandids.html#changetabsnotebookcode',
      classes: 'tsd-kind-variable tsd-parent-kind-module',
      parent: '"defaults/tabSpace".CommandIDs'
    },
    {
      id: 901,
      kind: 32,
      name: 'changeTabsNotebookRaw',
      url: 'modules/_defaults_tabspace_.commandids.html#changetabsnotebookraw',
      classes: 'tsd-kind-variable tsd-parent-kind-module',
      parent: '"defaults/tabSpace".CommandIDs'
    },
    {
      id: 902,
      kind: 32,
      name: 'changeTabsEditor',
      url: 'modules/_defaults_tabspace_.commandids.html#changetabseditor',
      classes: 'tsd-kind-variable tsd-parent-kind-module',
      parent: '"defaults/tabSpace".CommandIDs'
    },
    {
      id: 903,
      kind: 1,
      name: '"defaults/editorSyntax"',
      url: 'modules/_defaults_editorsyntax_.html',
      classes: 'tsd-kind-external-module'
    },
    {
      id: 904,
      kind: 128,
      name: 'EditorSyntax',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html',
      classes:
        'tsd-kind-class tsd-parent-kind-external-module tsd-is-not-exported',
      parent: '"defaults/editorSyntax"'
    },
    {
      id: 905,
      kind: 512,
      name: 'constructor',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#constructor',
      classes:
        'tsd-kind-constructor tsd-parent-kind-class tsd-is-overwrite tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 906,
      kind: 2048,
      name: 'render',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#render',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 907,
      kind: 2048,
      name: 'dispose',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#dispose',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 908,
      kind: 2048,
      name: '_handleClick',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#_handleclick',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 909,
      kind: 2048,
      name: '_onEditorChange',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#_oneditorchange',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 910,
      kind: 1024,
      name: '_tracker',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#_tracker',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 911,
      kind: 1024,
      name: '_commands',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#_commands',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 912,
      kind: 1024,
      name: 'modelChanged',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#modelchanged',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 913,
      kind: 1024,
      name: 'model',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#model-1',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 914,
      kind: 2048,
      name: 'onUpdateRequest',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#onupdaterequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 915,
      kind: 2048,
      name: 'onAfterAttach',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#onafterattach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 916,
      kind: 1024,
      name: 'disposed',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#disposed',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 917,
      kind: 1024,
      name: 'node',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#node',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 918,
      kind: 1024,
      name: 'isDisposed',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#isdisposed',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 919,
      kind: 1024,
      name: 'isAttached',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#isattached',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 920,
      kind: 1024,
      name: 'isHidden',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#ishidden',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 921,
      kind: 1024,
      name: 'isVisible',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#isvisible',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 922,
      kind: 1024,
      name: 'title',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#title',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 923,
      kind: 1024,
      name: 'id',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#id',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 924,
      kind: 1024,
      name: 'dataset',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#dataset',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 925,
      kind: 1024,
      name: 'parent',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#parent',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 926,
      kind: 1024,
      name: 'layout',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#layout',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 927,
      kind: 2048,
      name: 'children',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#children',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 928,
      kind: 2048,
      name: 'contains',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#contains',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 929,
      kind: 2048,
      name: 'hasClass',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#hasclass',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 930,
      kind: 2048,
      name: 'addClass',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#addclass',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 931,
      kind: 2048,
      name: 'removeClass',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#removeclass',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 932,
      kind: 2048,
      name: 'toggleClass',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#toggleclass',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 933,
      kind: 2048,
      name: 'update',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#update',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 934,
      kind: 2048,
      name: 'fit',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#fit',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 935,
      kind: 2048,
      name: 'activate',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#activate',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 936,
      kind: 2048,
      name: 'close',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#close',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 937,
      kind: 2048,
      name: 'show',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#show',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 938,
      kind: 2048,
      name: 'hide',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#hide',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 939,
      kind: 2048,
      name: 'setHidden',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#sethidden',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 940,
      kind: 2048,
      name: 'testFlag',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#testflag',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 941,
      kind: 2048,
      name: 'setFlag',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#setflag',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 942,
      kind: 2048,
      name: 'clearFlag',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#clearflag',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 943,
      kind: 2048,
      name: 'processMessage',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#processmessage',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 944,
      kind: 2048,
      name: 'notifyLayout',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#notifylayout',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 945,
      kind: 2048,
      name: 'onCloseRequest',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#oncloserequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 946,
      kind: 2048,
      name: 'onResize',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#onresize',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 947,
      kind: 2048,
      name: 'onFitRequest',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#onfitrequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 948,
      kind: 2048,
      name: 'onActivateRequest',
      url:
        'classes/_defaults_editorsyntax_.editorsyntax.html#onactivaterequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 949,
      kind: 2048,
      name: 'onBeforeShow',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#onbeforeshow',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 950,
      kind: 2048,
      name: 'onAfterShow',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#onaftershow',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 951,
      kind: 2048,
      name: 'onBeforeHide',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#onbeforehide',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 952,
      kind: 2048,
      name: 'onAfterHide',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#onafterhide',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 953,
      kind: 2048,
      name: 'onBeforeAttach',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#onbeforeattach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 954,
      kind: 2048,
      name: 'onBeforeDetach',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#onbeforedetach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 955,
      kind: 2048,
      name: 'onAfterDetach',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#onafterdetach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 956,
      kind: 2048,
      name: 'onChildAdded',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#onchildadded',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 957,
      kind: 2048,
      name: 'onChildRemoved',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.html#onchildremoved',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 958,
      kind: 2,
      name: 'VDomRenderer',
      url: 'modules/_defaults_editorsyntax_.editorsyntax.vdomrenderer.html',
      classes: 'tsd-kind-module tsd-parent-kind-class',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 959,
      kind: 256,
      name: 'IModel',
      url:
        'interfaces/_defaults_editorsyntax_.editorsyntax.vdomrenderer.imodel.html',
      classes: 'tsd-kind-interface tsd-parent-kind-module tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax.VDomRenderer'
    },
    {
      id: 960,
      kind: 1024,
      name: 'stateChanged',
      url:
        'interfaces/_defaults_editorsyntax_.editorsyntax.vdomrenderer.imodel.html#statechanged',
      classes:
        'tsd-kind-property tsd-parent-kind-interface tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax.VDomRenderer.IModel'
    },
    {
      id: 961,
      kind: 1024,
      name: 'isDisposed',
      url:
        'interfaces/_defaults_editorsyntax_.editorsyntax.vdomrenderer.imodel.html#isdisposed',
      classes:
        'tsd-kind-property tsd-parent-kind-interface tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax.VDomRenderer.IModel'
    },
    {
      id: 962,
      kind: 2048,
      name: 'dispose',
      url:
        'interfaces/_defaults_editorsyntax_.editorsyntax.vdomrenderer.imodel.html#dispose',
      classes:
        'tsd-kind-method tsd-parent-kind-interface tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntax.VDomRenderer.IModel'
    },
    {
      id: 963,
      kind: 2,
      name: 'IEditorSyntax',
      url: 'modules/_defaults_editorsyntax_.ieditorsyntax.html',
      classes: 'tsd-kind-module tsd-parent-kind-external-module',
      parent: '"defaults/editorSyntax"'
    },
    {
      id: 964,
      kind: 1024,
      name: 'model',
      url: 'modules/_defaults_editorsyntax_.ieditorsyntax.html#model',
      classes: 'tsd-kind-property tsd-parent-kind-module',
      parent: '"defaults/editorSyntax".IEditorSyntax'
    },
    {
      id: 965,
      kind: 1024,
      name: 'modelChanged',
      url: 'modules/_defaults_editorsyntax_.ieditorsyntax.html#modelchanged',
      classes: 'tsd-kind-property tsd-parent-kind-module',
      parent: '"defaults/editorSyntax".IEditorSyntax'
    },
    {
      id: 966,
      kind: 64,
      name: 'EditorSyntaxComponent',
      url: 'modules/_defaults_editorsyntax_.html#editorsyntaxcomponent',
      classes:
        'tsd-kind-function tsd-parent-kind-external-module tsd-is-not-exported',
      parent: '"defaults/editorSyntax"'
    },
    {
      id: 967,
      kind: 256,
      name: 'IProps',
      url: 'modules/_defaults_editorsyntax_.html#editorsyntaxcomponent.iprops',
      classes: 'tsd-kind-interface tsd-parent-kind-function',
      parent: '"defaults/editorSyntax".EditorSyntaxComponent'
    },
    {
      id: 968,
      kind: 1024,
      name: 'mode',
      url:
        'modules/_defaults_editorsyntax_.html#editorsyntaxcomponent.iprops.mode',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/editorSyntax".EditorSyntaxComponent.IProps'
    },
    {
      id: 969,
      kind: 1024,
      name: 'handleClick',
      url:
        'modules/_defaults_editorsyntax_.html#editorsyntaxcomponent.iprops.handleclick',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/editorSyntax".EditorSyntaxComponent.IProps'
    },
    {
      id: 970,
      kind: 65536,
      name: '__type',
      url:
        'modules/_defaults_editorsyntax_.html#editorsyntaxcomponent.iprops.handleclick.__type',
      classes:
        'tsd-kind-type-literal tsd-parent-kind-property tsd-is-not-exported',
      parent: '"defaults/editorSyntax".EditorSyntaxComponent.IProps.handleClick'
    },
    {
      id: 971,
      kind: 128,
      name: 'Model',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.model.html',
      classes: 'tsd-kind-class tsd-parent-kind-class',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 972,
      kind: 512,
      name: 'constructor',
      url:
        'classes/_defaults_editorsyntax_.editorsyntax.model.html#constructor',
      classes: 'tsd-kind-constructor tsd-parent-kind-class',
      parent: '"defaults/editorSyntax".EditorSyntax.Model'
    },
    {
      id: 973,
      kind: 262144,
      name: 'mode',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.model.html#mode',
      classes: 'tsd-kind-get-signature tsd-parent-kind-class',
      parent: '"defaults/editorSyntax".EditorSyntax.Model'
    },
    {
      id: 974,
      kind: 262144,
      name: 'editor',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.model.html#editor',
      classes: 'tsd-kind-accessor tsd-parent-kind-class',
      parent: '"defaults/editorSyntax".EditorSyntax.Model'
    },
    {
      id: 975,
      kind: 2048,
      name: '_onMIMETypeChange',
      url:
        'classes/_defaults_editorsyntax_.editorsyntax.model.html#_onmimetypechange',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/editorSyntax".EditorSyntax.Model'
    },
    {
      id: 976,
      kind: 2048,
      name: '_getAllState',
      url:
        'classes/_defaults_editorsyntax_.editorsyntax.model.html#_getallstate',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/editorSyntax".EditorSyntax.Model'
    },
    {
      id: 977,
      kind: 2048,
      name: '_triggerChange',
      url:
        'classes/_defaults_editorsyntax_.editorsyntax.model.html#_triggerchange',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/editorSyntax".EditorSyntax.Model'
    },
    {
      id: 978,
      kind: 1024,
      name: '_mode',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.model.html#_mode',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/editorSyntax".EditorSyntax.Model'
    },
    {
      id: 979,
      kind: 1024,
      name: '_editor',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.model.html#_editor',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/editorSyntax".EditorSyntax.Model'
    },
    {
      id: 980,
      kind: 1024,
      name: 'stateChanged',
      url:
        'classes/_defaults_editorsyntax_.editorsyntax.model.html#statechanged',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-inherited',
      parent: '"defaults/editorSyntax".EditorSyntax.Model'
    },
    {
      id: 981,
      kind: 1024,
      name: 'isDisposed',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.model.html#isdisposed',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-inherited',
      parent: '"defaults/editorSyntax".EditorSyntax.Model'
    },
    {
      id: 982,
      kind: 2048,
      name: 'dispose',
      url: 'classes/_defaults_editorsyntax_.editorsyntax.model.html#dispose',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-inherited',
      parent: '"defaults/editorSyntax".EditorSyntax.Model'
    },
    {
      id: 983,
      kind: 256,
      name: 'IOptions',
      url: 'interfaces/_defaults_editorsyntax_.editorsyntax.ioptions.html',
      classes: 'tsd-kind-interface tsd-parent-kind-class',
      parent: '"defaults/editorSyntax".EditorSyntax'
    },
    {
      id: 984,
      kind: 1024,
      name: 'tracker',
      url:
        'interfaces/_defaults_editorsyntax_.editorsyntax.ioptions.html#tracker',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/editorSyntax".EditorSyntax.IOptions'
    },
    {
      id: 985,
      kind: 1024,
      name: 'commands',
      url:
        'interfaces/_defaults_editorsyntax_.editorsyntax.ioptions.html#commands',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/editorSyntax".EditorSyntax.IOptions'
    },
    {
      id: 986,
      kind: 256,
      name: 'IModel',
      url: 'interfaces/_defaults_editorsyntax_.ieditorsyntax.imodel.html',
      classes: 'tsd-kind-interface tsd-parent-kind-module',
      parent: '"defaults/editorSyntax".IEditorSyntax'
    },
    {
      id: 987,
      kind: 1024,
      name: 'mode',
      url: 'interfaces/_defaults_editorsyntax_.ieditorsyntax.imodel.html#mode',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/editorSyntax".IEditorSyntax.IModel'
    },
    {
      id: 988,
      kind: 1024,
      name: 'editor',
      url:
        'interfaces/_defaults_editorsyntax_.ieditorsyntax.imodel.html#editor',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/editorSyntax".IEditorSyntax.IModel'
    },
    {
      id: 989,
      kind: 2097152,
      name: 'editorSyntax',
      url: 'modules/_defaults_editorsyntax_.html#editorsyntax-1',
      classes: 'tsd-kind-object-literal tsd-parent-kind-external-module',
      parent: '"defaults/editorSyntax"'
    },
    {
      id: 990,
      kind: 32,
      name: 'id',
      url: 'modules/_defaults_editorsyntax_.html#editorsyntax-1.id',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/editorSyntax".editorSyntax'
    },
    {
      id: 991,
      kind: 32,
      name: 'autoStart',
      url: 'modules/_defaults_editorsyntax_.html#editorsyntax-1.autostart',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/editorSyntax".editorSyntax'
    },
    {
      id: 992,
      kind: 32,
      name: 'provides',
      url: 'modules/_defaults_editorsyntax_.html#editorsyntax-1.provides',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/editorSyntax".editorSyntax'
    },
    {
      id: 993,
      kind: 32,
      name: 'requires',
      url: 'modules/_defaults_editorsyntax_.html#editorsyntax-1.requires',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/editorSyntax".editorSyntax'
    },
    {
      id: 994,
      kind: 64,
      name: 'activate',
      url: 'modules/_defaults_editorsyntax_.html#editorsyntax-1.activate',
      classes: 'tsd-kind-function tsd-parent-kind-object-literal',
      parent: '"defaults/editorSyntax".editorSyntax'
    },
    {
      id: 995,
      kind: 1,
      name: '"defaults/memoryUsage"',
      url: 'modules/_defaults_memoryusage_.html',
      classes: 'tsd-kind-external-module'
    },
    {
      id: 996,
      kind: 128,
      name: 'MemoryUsage',
      url: 'classes/_defaults_memoryusage_.memoryusage.html',
      classes:
        'tsd-kind-class tsd-parent-kind-external-module tsd-is-not-exported',
      parent: '"defaults/memoryUsage"'
    },
    {
      id: 997,
      kind: 512,
      name: 'constructor',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#constructor',
      classes:
        'tsd-kind-constructor tsd-parent-kind-class tsd-is-overwrite tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 998,
      kind: 2048,
      name: 'render',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#render',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 999,
      kind: 1024,
      name: 'modelChanged',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#modelchanged',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1000,
      kind: 1024,
      name: 'model',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#model-1',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1001,
      kind: 2048,
      name: 'dispose',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#dispose',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1002,
      kind: 2048,
      name: 'onUpdateRequest',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#onupdaterequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1003,
      kind: 2048,
      name: 'onAfterAttach',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#onafterattach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1004,
      kind: 1024,
      name: 'disposed',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#disposed',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1005,
      kind: 1024,
      name: 'node',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#node',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1006,
      kind: 1024,
      name: 'isDisposed',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#isdisposed',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1007,
      kind: 1024,
      name: 'isAttached',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#isattached',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1008,
      kind: 1024,
      name: 'isHidden',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#ishidden',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1009,
      kind: 1024,
      name: 'isVisible',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#isvisible',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1010,
      kind: 1024,
      name: 'title',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#title',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1011,
      kind: 1024,
      name: 'id',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#id',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1012,
      kind: 1024,
      name: 'dataset',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#dataset',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1013,
      kind: 1024,
      name: 'parent',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#parent',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1014,
      kind: 1024,
      name: 'layout',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#layout',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1015,
      kind: 2048,
      name: 'children',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#children',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1016,
      kind: 2048,
      name: 'contains',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#contains',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1017,
      kind: 2048,
      name: 'hasClass',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#hasclass',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1018,
      kind: 2048,
      name: 'addClass',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#addclass',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1019,
      kind: 2048,
      name: 'removeClass',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#removeclass',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1020,
      kind: 2048,
      name: 'toggleClass',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#toggleclass',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1021,
      kind: 2048,
      name: 'update',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#update',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1022,
      kind: 2048,
      name: 'fit',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#fit',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1023,
      kind: 2048,
      name: 'activate',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#activate',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1024,
      kind: 2048,
      name: 'close',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#close',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1025,
      kind: 2048,
      name: 'show',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#show',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1026,
      kind: 2048,
      name: 'hide',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#hide',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1027,
      kind: 2048,
      name: 'setHidden',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#sethidden',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1028,
      kind: 2048,
      name: 'testFlag',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#testflag',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1029,
      kind: 2048,
      name: 'setFlag',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#setflag',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1030,
      kind: 2048,
      name: 'clearFlag',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#clearflag',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1031,
      kind: 2048,
      name: 'processMessage',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#processmessage',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1032,
      kind: 2048,
      name: 'notifyLayout',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#notifylayout',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1033,
      kind: 2048,
      name: 'onCloseRequest',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#oncloserequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1034,
      kind: 2048,
      name: 'onResize',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#onresize',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1035,
      kind: 2048,
      name: 'onFitRequest',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#onfitrequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1036,
      kind: 2048,
      name: 'onActivateRequest',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#onactivaterequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1037,
      kind: 2048,
      name: 'onBeforeShow',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#onbeforeshow',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1038,
      kind: 2048,
      name: 'onAfterShow',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#onaftershow',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1039,
      kind: 2048,
      name: 'onBeforeHide',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#onbeforehide',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1040,
      kind: 2048,
      name: 'onAfterHide',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#onafterhide',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1041,
      kind: 2048,
      name: 'onBeforeAttach',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#onbeforeattach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1042,
      kind: 2048,
      name: 'onBeforeDetach',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#onbeforedetach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1043,
      kind: 2048,
      name: 'onAfterDetach',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#onafterdetach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1044,
      kind: 2048,
      name: 'onChildAdded',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#onchildadded',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1045,
      kind: 2048,
      name: 'onChildRemoved',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#onchildremoved',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1046,
      kind: 2,
      name: 'VDomRenderer',
      url: 'modules/_defaults_memoryusage_.memoryusage.vdomrenderer.html',
      classes: 'tsd-kind-module tsd-parent-kind-class',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1047,
      kind: 256,
      name: 'IModel',
      url:
        'interfaces/_defaults_memoryusage_.memoryusage.vdomrenderer.imodel.html',
      classes: 'tsd-kind-interface tsd-parent-kind-module tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage.VDomRenderer'
    },
    {
      id: 1048,
      kind: 1024,
      name: 'stateChanged',
      url:
        'interfaces/_defaults_memoryusage_.memoryusage.vdomrenderer.imodel.html#statechanged',
      classes:
        'tsd-kind-property tsd-parent-kind-interface tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage.VDomRenderer.IModel'
    },
    {
      id: 1049,
      kind: 1024,
      name: 'isDisposed',
      url:
        'interfaces/_defaults_memoryusage_.memoryusage.vdomrenderer.imodel.html#isdisposed',
      classes:
        'tsd-kind-property tsd-parent-kind-interface tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage.VDomRenderer.IModel'
    },
    {
      id: 1050,
      kind: 2048,
      name: 'dispose',
      url:
        'interfaces/_defaults_memoryusage_.memoryusage.vdomrenderer.imodel.html#dispose',
      classes:
        'tsd-kind-method tsd-parent-kind-interface tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/memoryUsage".MemoryUsage.VDomRenderer.IModel'
    },
    {
      id: 1051,
      kind: 2,
      name: 'IMemoryUsage',
      url: 'modules/_defaults_memoryusage_.imemoryusage.html',
      classes: 'tsd-kind-module tsd-parent-kind-external-module',
      parent: '"defaults/memoryUsage"'
    },
    {
      id: 1052,
      kind: 1024,
      name: 'model',
      url: 'modules/_defaults_memoryusage_.imemoryusage.html#model',
      classes: 'tsd-kind-property tsd-parent-kind-module',
      parent: '"defaults/memoryUsage".IMemoryUsage'
    },
    {
      id: 1053,
      kind: 1024,
      name: 'modelChanged',
      url: 'modules/_defaults_memoryusage_.imemoryusage.html#modelchanged',
      classes: 'tsd-kind-property tsd-parent-kind-module',
      parent: '"defaults/memoryUsage".IMemoryUsage'
    },
    {
      id: 1054,
      kind: 1024,
      name: 'isDisposed',
      url: 'modules/_defaults_memoryusage_.imemoryusage.html#isdisposed',
      classes: 'tsd-kind-property tsd-parent-kind-module tsd-is-inherited',
      parent: '"defaults/memoryUsage".IMemoryUsage'
    },
    {
      id: 1055,
      kind: 2048,
      name: 'dispose',
      url: 'modules/_defaults_memoryusage_.imemoryusage.html#dispose',
      classes: 'tsd-kind-method tsd-parent-kind-module tsd-is-inherited',
      parent: '"defaults/memoryUsage".IMemoryUsage'
    },
    {
      id: 1056,
      kind: 128,
      name: 'Model',
      url: 'classes/_defaults_memoryusage_.memoryusage.model.html',
      classes: 'tsd-kind-class tsd-parent-kind-class',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1057,
      kind: 512,
      name: 'constructor',
      url: 'classes/_defaults_memoryusage_.memoryusage.model.html#constructor',
      classes: 'tsd-kind-constructor tsd-parent-kind-class',
      parent: '"defaults/memoryUsage".MemoryUsage.Model'
    },
    {
      id: 1058,
      kind: 262144,
      name: 'metricsAvailable',
      url:
        'classes/_defaults_memoryusage_.memoryusage.model.html#metricsavailable',
      classes: 'tsd-kind-get-signature tsd-parent-kind-class',
      parent: '"defaults/memoryUsage".MemoryUsage.Model'
    },
    {
      id: 1059,
      kind: 262144,
      name: 'currentMemory',
      url:
        'classes/_defaults_memoryusage_.memoryusage.model.html#currentmemory',
      classes: 'tsd-kind-get-signature tsd-parent-kind-class',
      parent: '"defaults/memoryUsage".MemoryUsage.Model'
    },
    {
      id: 1060,
      kind: 262144,
      name: 'memoryLimit',
      url: 'classes/_defaults_memoryusage_.memoryusage.model.html#memorylimit',
      classes: 'tsd-kind-get-signature tsd-parent-kind-class',
      parent: '"defaults/memoryUsage".MemoryUsage.Model'
    },
    {
      id: 1061,
      kind: 262144,
      name: 'units',
      url: 'classes/_defaults_memoryusage_.memoryusage.model.html#units',
      classes: 'tsd-kind-get-signature tsd-parent-kind-class',
      parent: '"defaults/memoryUsage".MemoryUsage.Model'
    },
    {
      id: 1062,
      kind: 2048,
      name: 'dispose',
      url: 'classes/_defaults_memoryusage_.memoryusage.model.html#dispose',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite',
      parent: '"defaults/memoryUsage".MemoryUsage.Model'
    },
    {
      id: 1063,
      kind: 2048,
      name: '_makeMetricRequest',
      url:
        'classes/_defaults_memoryusage_.memoryusage.model.html#_makemetricrequest',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/memoryUsage".MemoryUsage.Model'
    },
    {
      id: 1064,
      kind: 2048,
      name: '_updateMetricsValues',
      url:
        'classes/_defaults_memoryusage_.memoryusage.model.html#_updatemetricsvalues',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/memoryUsage".MemoryUsage.Model'
    },
    {
      id: 1065,
      kind: 1024,
      name: '_metricsAvailable',
      url:
        'classes/_defaults_memoryusage_.memoryusage.model.html#_metricsavailable',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/memoryUsage".MemoryUsage.Model'
    },
    {
      id: 1066,
      kind: 1024,
      name: '_currentMemory',
      url:
        'classes/_defaults_memoryusage_.memoryusage.model.html#_currentmemory',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/memoryUsage".MemoryUsage.Model'
    },
    {
      id: 1067,
      kind: 1024,
      name: '_memoryLimit',
      url: 'classes/_defaults_memoryusage_.memoryusage.model.html#_memorylimit',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/memoryUsage".MemoryUsage.Model'
    },
    {
      id: 1068,
      kind: 1024,
      name: '_units',
      url: 'classes/_defaults_memoryusage_.memoryusage.model.html#_units',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/memoryUsage".MemoryUsage.Model'
    },
    {
      id: 1069,
      kind: 1024,
      name: '_intervalId',
      url: 'classes/_defaults_memoryusage_.memoryusage.model.html#_intervalid',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/memoryUsage".MemoryUsage.Model'
    },
    {
      id: 1070,
      kind: 1024,
      name: '_refreshRate',
      url: 'classes/_defaults_memoryusage_.memoryusage.model.html#_refreshrate',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/memoryUsage".MemoryUsage.Model'
    },
    {
      id: 1071,
      kind: 1024,
      name: 'stateChanged',
      url: 'classes/_defaults_memoryusage_.memoryusage.model.html#statechanged',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-inherited',
      parent: '"defaults/memoryUsage".MemoryUsage.Model'
    },
    {
      id: 1072,
      kind: 1024,
      name: 'isDisposed',
      url: 'classes/_defaults_memoryusage_.memoryusage.model.html#isdisposed',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-inherited',
      parent: '"defaults/memoryUsage".MemoryUsage.Model'
    },
    {
      id: 1073,
      kind: 4194304,
      name: 'MemoryUnit',
      url: 'classes/_defaults_memoryusage_.memoryusage.html#memoryunit',
      classes: 'tsd-kind-type-alias tsd-parent-kind-class tsd-is-static',
      parent: '"defaults/memoryUsage".MemoryUsage'
    },
    {
      id: 1074,
      kind: 256,
      name: 'IModel',
      url: 'interfaces/_defaults_memoryusage_.imemoryusage.imodel.html',
      classes: 'tsd-kind-interface tsd-parent-kind-module',
      parent: '"defaults/memoryUsage".IMemoryUsage'
    },
    {
      id: 1075,
      kind: 1024,
      name: 'metricsAvailable',
      url:
        'interfaces/_defaults_memoryusage_.imemoryusage.imodel.html#metricsavailable',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/memoryUsage".IMemoryUsage.IModel'
    },
    {
      id: 1076,
      kind: 1024,
      name: 'currentMemory',
      url:
        'interfaces/_defaults_memoryusage_.imemoryusage.imodel.html#currentmemory',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/memoryUsage".IMemoryUsage.IModel'
    },
    {
      id: 1077,
      kind: 1024,
      name: 'memoryLimit',
      url:
        'interfaces/_defaults_memoryusage_.imemoryusage.imodel.html#memorylimit',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/memoryUsage".IMemoryUsage.IModel'
    },
    {
      id: 1078,
      kind: 1024,
      name: 'units',
      url: 'interfaces/_defaults_memoryusage_.imemoryusage.imodel.html#units',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/memoryUsage".IMemoryUsage.IModel'
    },
    {
      id: 1079,
      kind: 2,
      name: 'Private',
      url: 'modules/_defaults_memoryusage_.private.html',
      classes:
        'tsd-kind-module tsd-parent-kind-external-module tsd-is-not-exported',
      parent: '"defaults/memoryUsage"'
    },
    {
      id: 1080,
      kind: 32,
      name: 'DECIMAL_PLACES',
      url: 'modules/_defaults_memoryusage_.private.html#decimal_places',
      classes: 'tsd-kind-variable tsd-parent-kind-module',
      parent: '"defaults/memoryUsage".Private'
    },
    {
      id: 1081,
      kind: 2097152,
      name: 'MEMORY_UNIT_LIMITS',
      url: 'modules/_defaults_memoryusage_.private.html#memory_unit_limits',
      classes: 'tsd-kind-object-literal tsd-parent-kind-module',
      parent: '"defaults/memoryUsage".Private'
    },
    {
      id: 1082,
      kind: 32,
      name: 'B',
      url: 'modules/_defaults_memoryusage_.private.html#memory_unit_limits.b',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/memoryUsage".Private.MEMORY_UNIT_LIMITS'
    },
    {
      id: 1083,
      kind: 32,
      name: 'KB',
      url: 'modules/_defaults_memoryusage_.private.html#memory_unit_limits.kb',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/memoryUsage".Private.MEMORY_UNIT_LIMITS'
    },
    {
      id: 1084,
      kind: 32,
      name: 'MB',
      url: 'modules/_defaults_memoryusage_.private.html#memory_unit_limits.mb',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/memoryUsage".Private.MEMORY_UNIT_LIMITS'
    },
    {
      id: 1085,
      kind: 32,
      name: 'GB',
      url: 'modules/_defaults_memoryusage_.private.html#memory_unit_limits.gb',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/memoryUsage".Private.MEMORY_UNIT_LIMITS'
    },
    {
      id: 1086,
      kind: 32,
      name: 'TB',
      url: 'modules/_defaults_memoryusage_.private.html#memory_unit_limits.tb',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/memoryUsage".Private.MEMORY_UNIT_LIMITS'
    },
    {
      id: 1087,
      kind: 32,
      name: 'PB',
      url: 'modules/_defaults_memoryusage_.private.html#memory_unit_limits.pb',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/memoryUsage".Private.MEMORY_UNIT_LIMITS'
    },
    {
      id: 1088,
      kind: 64,
      name: 'convertToLargestUnit',
      url: 'modules/_defaults_memoryusage_.private.html#converttolargestunit',
      classes: 'tsd-kind-function tsd-parent-kind-module',
      parent: '"defaults/memoryUsage".Private'
    },
    {
      id: 1089,
      kind: 32,
      name: 'SERVER_CONNECTION_SETTINGS',
      url:
        'modules/_defaults_memoryusage_.private.html#server_connection_settings',
      classes: 'tsd-kind-variable tsd-parent-kind-module tsd-is-not-exported',
      parent: '"defaults/memoryUsage".Private'
    },
    {
      id: 1090,
      kind: 32,
      name: 'METRIC_URL',
      url: 'modules/_defaults_memoryusage_.private.html#metric_url',
      classes: 'tsd-kind-variable tsd-parent-kind-module tsd-is-not-exported',
      parent: '"defaults/memoryUsage".Private'
    },
    {
      id: 1091,
      kind: 4194304,
      name: 'MetricRequestResult',
      url: 'modules/_defaults_memoryusage_.private.html#metricrequestresult',
      classes: 'tsd-kind-type-alias tsd-parent-kind-module',
      parent: '"defaults/memoryUsage".Private'
    },
    {
      id: 1092,
      kind: 65536,
      name: '__type',
      url:
        'modules/_defaults_memoryusage_.private.html#metricrequestresult.__type',
      classes:
        'tsd-kind-type-literal tsd-parent-kind-type-alias tsd-is-not-exported',
      parent: '"defaults/memoryUsage".Private.MetricRequestResult'
    },
    {
      id: 1093,
      kind: 32,
      name: 'rss',
      url:
        'modules/_defaults_memoryusage_.private.html#metricrequestresult.__type.rss',
      classes:
        'tsd-kind-variable tsd-parent-kind-type-literal tsd-is-not-exported',
      parent: '"defaults/memoryUsage".Private.MetricRequestResult.__type'
    },
    {
      id: 1094,
      kind: 32,
      name: 'limits',
      url:
        'modules/_defaults_memoryusage_.private.html#metricrequestresult.__type.limits',
      classes:
        'tsd-kind-variable tsd-parent-kind-type-literal tsd-is-not-exported',
      parent: '"defaults/memoryUsage".Private.MetricRequestResult.__type'
    },
    {
      id: 1095,
      kind: 65536,
      name: '__type',
      url:
        'modules/_defaults_memoryusage_.private.html#metricrequestresult.__type.limits.__type-1',
      classes:
        'tsd-kind-type-literal tsd-parent-kind-variable tsd-is-not-exported',
      parent: '"defaults/memoryUsage".Private.MetricRequestResult.__type.limits'
    },
    {
      id: 1096,
      kind: 32,
      name: 'memory',
      url:
        'modules/_defaults_memoryusage_.private.html#metricrequestresult.__type.limits.__type-1.memory',
      classes:
        'tsd-kind-variable tsd-parent-kind-type-literal tsd-is-not-exported',
      parent:
        '"defaults/memoryUsage".Private.MetricRequestResult.__type.limits.__type'
    },
    {
      id: 1097,
      kind: 64,
      name: 'makeMetricsRequest',
      url: 'modules/_defaults_memoryusage_.private.html#makemetricsrequest',
      classes: 'tsd-kind-function tsd-parent-kind-module',
      parent: '"defaults/memoryUsage".Private'
    },
    {
      id: 1098,
      kind: 2097152,
      name: 'memoryUsageItem',
      url: 'modules/_defaults_memoryusage_.html#memoryusageitem',
      classes: 'tsd-kind-object-literal tsd-parent-kind-external-module',
      parent: '"defaults/memoryUsage"'
    },
    {
      id: 1099,
      kind: 32,
      name: 'id',
      url: 'modules/_defaults_memoryusage_.html#memoryusageitem.id',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/memoryUsage".memoryUsageItem'
    },
    {
      id: 1100,
      kind: 32,
      name: 'autoStart',
      url: 'modules/_defaults_memoryusage_.html#memoryusageitem.autostart',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/memoryUsage".memoryUsageItem'
    },
    {
      id: 1101,
      kind: 32,
      name: 'provides',
      url: 'modules/_defaults_memoryusage_.html#memoryusageitem.provides',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/memoryUsage".memoryUsageItem'
    },
    {
      id: 1102,
      kind: 32,
      name: 'requires',
      url: 'modules/_defaults_memoryusage_.html#memoryusageitem.requires',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/memoryUsage".memoryUsageItem'
    },
    {
      id: 1103,
      kind: 64,
      name: 'activate',
      url: 'modules/_defaults_memoryusage_.html#memoryusageitem.activate',
      classes: 'tsd-kind-function tsd-parent-kind-object-literal',
      parent: '"defaults/memoryUsage".memoryUsageItem'
    },
    {
      id: 1104,
      kind: 1,
      name: '"defaults/index"',
      url: 'modules/_defaults_index_.html',
      classes: 'tsd-kind-external-module'
    },
    {
      id: 1105,
      kind: 1,
      name: '"index"',
      url: 'modules/_index_.html',
      classes: 'tsd-kind-external-module'
    },
    {
      id: 1106,
      kind: 32,
      name: 'STATUSBAR_PLUGIN_ID',
      url: 'modules/_index_.html#statusbar_plugin_id',
      classes: 'tsd-kind-variable tsd-parent-kind-external-module',
      parent: '"index"'
    },
    {
      id: 1107,
      kind: 2097152,
      name: 'statusBar',
      url: 'modules/_index_.html#statusbar',
      classes:
        'tsd-kind-object-literal tsd-parent-kind-external-module tsd-is-not-exported',
      parent: '"index"'
    },
    {
      id: 1108,
      kind: 32,
      name: 'id',
      url: 'modules/_index_.html#statusbar.id',
      classes:
        'tsd-kind-variable tsd-parent-kind-object-literal tsd-is-not-exported',
      parent: '"index".statusBar'
    },
    {
      id: 1109,
      kind: 32,
      name: 'provides',
      url: 'modules/_index_.html#statusbar.provides',
      classes:
        'tsd-kind-variable tsd-parent-kind-object-literal tsd-is-not-exported',
      parent: '"index".statusBar'
    },
    {
      id: 1110,
      kind: 32,
      name: 'autoStart',
      url: 'modules/_index_.html#statusbar.autostart',
      classes:
        'tsd-kind-variable tsd-parent-kind-object-literal tsd-is-not-exported',
      parent: '"index".statusBar'
    },
    {
      id: 1111,
      kind: 64,
      name: 'activate',
      url: 'modules/_index_.html#statusbar.activate',
      classes:
        'tsd-kind-function tsd-parent-kind-object-literal tsd-is-not-exported',
      parent: '"index".statusBar'
    },
    {
      id: 1112,
      kind: 32,
      name: 'plugins',
      url: 'modules/_index_.html#plugins',
      classes: 'tsd-kind-variable tsd-parent-kind-external-module',
      parent: '"index"'
    },
    {
      id: 1113,
      kind: 1,
      name: '"util/set"',
      url: 'modules/_util_set_.html',
      classes: 'tsd-kind-external-module'
    },
    {
      id: 1114,
      kind: 2,
      name: 'SetExt',
      url: 'modules/_util_set_.setext.html',
      classes: 'tsd-kind-module tsd-parent-kind-external-module',
      parent: '"util/set"'
    },
    {
      id: 1115,
      kind: 64,
      name: 'union',
      url: 'modules/_util_set_.setext.html#union',
      classes:
        'tsd-kind-function tsd-parent-kind-module tsd-has-type-parameter',
      parent: '"util/set".SetExt'
    },
    {
      id: 1116,
      kind: 64,
      name: 'intersection',
      url: 'modules/_util_set_.setext.html#intersection',
      classes:
        'tsd-kind-function tsd-parent-kind-module tsd-has-type-parameter',
      parent: '"util/set".SetExt'
    },
    {
      id: 1117,
      kind: 64,
      name: 'difference',
      url: 'modules/_util_set_.setext.html#difference',
      classes:
        'tsd-kind-function tsd-parent-kind-module tsd-has-type-parameter',
      parent: '"util/set".SetExt'
    },
    {
      id: 1118,
      kind: 64,
      name: 'addAll',
      url: 'modules/_util_set_.setext.html#addall',
      classes:
        'tsd-kind-function tsd-parent-kind-module tsd-has-type-parameter',
      parent: '"util/set".SetExt'
    },
    {
      id: 1119,
      kind: 64,
      name: 'deleteAll',
      url: 'modules/_util_set_.setext.html#deleteall',
      classes:
        'tsd-kind-function tsd-parent-kind-module tsd-has-type-parameter',
      parent: '"util/set".SetExt'
    },
    {
      id: 1120,
      kind: 1,
      name: '"util/signal"',
      url: 'modules/_util_signal_.html',
      classes: 'tsd-kind-external-module'
    },
    {
      id: 1121,
      kind: 2,
      name: 'SignalExt',
      url: 'modules/_util_signal_.signalext.html',
      classes: 'tsd-kind-module tsd-parent-kind-external-module',
      parent: '"util/signal"'
    },
    {
      id: 1122,
      kind: 128,
      name: 'CombinedSignal',
      url: 'classes/_util_signal_.signalext.combinedsignal.html',
      classes: 'tsd-kind-class tsd-parent-kind-module tsd-has-type-parameter',
      parent: '"util/signal".SignalExt'
    },
    {
      id: 1123,
      kind: 512,
      name: 'constructor',
      url: 'classes/_util_signal_.signalext.combinedsignal.html#constructor',
      classes: 'tsd-kind-constructor tsd-parent-kind-class tsd-is-overwrite',
      parent: '"util/signal".SignalExt.CombinedSignal'
    },
    {
      id: 1124,
      kind: 262144,
      name: 'isDisposed',
      url: 'classes/_util_signal_.signalext.combinedsignal.html#isdisposed',
      classes: 'tsd-kind-get-signature tsd-parent-kind-class',
      parent: '"util/signal".SignalExt.CombinedSignal'
    },
    {
      id: 1125,
      kind: 2048,
      name: 'dispose',
      url: 'classes/_util_signal_.signalext.combinedsignal.html#dispose',
      classes: 'tsd-kind-method tsd-parent-kind-class',
      parent: '"util/signal".SignalExt.CombinedSignal'
    },
    {
      id: 1126,
      kind: 1024,
      name: '_forwardFunc',
      url: 'classes/_util_signal_.signalext.combinedsignal.html#_forwardfunc',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"util/signal".SignalExt.CombinedSignal'
    },
    {
      id: 1127,
      kind: 1024,
      name: '_isDisposed',
      url: 'classes/_util_signal_.signalext.combinedsignal.html#_isdisposed',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"util/signal".SignalExt.CombinedSignal'
    },
    {
      id: 1128,
      kind: 1024,
      name: '_parents',
      url: 'classes/_util_signal_.signalext.combinedsignal.html#_parents',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"util/signal".SignalExt.CombinedSignal'
    },
    {
      id: 1129,
      kind: 1024,
      name: 'sender',
      url: 'classes/_util_signal_.signalext.combinedsignal.html#sender',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-inherited',
      parent: '"util/signal".SignalExt.CombinedSignal'
    },
    {
      id: 1130,
      kind: 2048,
      name: 'connect',
      url: 'classes/_util_signal_.signalext.combinedsignal.html#connect',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-inherited',
      parent: '"util/signal".SignalExt.CombinedSignal'
    },
    {
      id: 1131,
      kind: 2048,
      name: 'disconnect',
      url: 'classes/_util_signal_.signalext.combinedsignal.html#disconnect',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-inherited',
      parent: '"util/signal".SignalExt.CombinedSignal'
    },
    {
      id: 1132,
      kind: 2048,
      name: 'emit',
      url: 'classes/_util_signal_.signalext.combinedsignal.html#emit',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-inherited',
      parent: '"util/signal".SignalExt.CombinedSignal'
    },
    {
      id: 1133,
      kind: 2,
      name: 'Signal',
      url: 'modules/_util_signal_.signalext.combinedsignal.signal.html',
      classes: 'tsd-kind-module tsd-parent-kind-class',
      parent: '"util/signal".SignalExt.CombinedSignal'
    },
    {
      id: 1134,
      kind: 64,
      name: 'disconnectBetween',
      url:
        'modules/_util_signal_.signalext.combinedsignal.signal.html#disconnectbetween',
      classes: 'tsd-kind-function tsd-parent-kind-module tsd-is-not-exported',
      parent: '"util/signal".SignalExt.CombinedSignal.Signal'
    },
    {
      id: 1135,
      kind: 64,
      name: 'disconnectSender',
      url:
        'modules/_util_signal_.signalext.combinedsignal.signal.html#disconnectsender',
      classes: 'tsd-kind-function tsd-parent-kind-module tsd-is-not-exported',
      parent: '"util/signal".SignalExt.CombinedSignal.Signal'
    },
    {
      id: 1136,
      kind: 64,
      name: 'disconnectReceiver',
      url:
        'modules/_util_signal_.signalext.combinedsignal.signal.html#disconnectreceiver',
      classes: 'tsd-kind-function tsd-parent-kind-module tsd-is-not-exported',
      parent: '"util/signal".SignalExt.CombinedSignal.Signal'
    },
    {
      id: 1137,
      kind: 64,
      name: 'disconnectAll',
      url:
        'modules/_util_signal_.signalext.combinedsignal.signal.html#disconnectall',
      classes: 'tsd-kind-function tsd-parent-kind-module tsd-is-not-exported',
      parent: '"util/signal".SignalExt.CombinedSignal.Signal'
    },
    {
      id: 1138,
      kind: 64,
      name: 'clearData',
      url:
        'modules/_util_signal_.signalext.combinedsignal.signal.html#cleardata',
      classes: 'tsd-kind-function tsd-parent-kind-module tsd-is-not-exported',
      parent: '"util/signal".SignalExt.CombinedSignal.Signal'
    },
    {
      id: 1139,
      kind: 4194304,
      name: 'ExceptionHandler',
      url:
        'modules/_util_signal_.signalext.combinedsignal.signal.html#exceptionhandler',
      classes: 'tsd-kind-type-alias tsd-parent-kind-module tsd-is-not-exported',
      parent: '"util/signal".SignalExt.CombinedSignal.Signal'
    },
    {
      id: 1140,
      kind: 65536,
      name: '__type',
      url:
        'modules/_util_signal_.signalext.combinedsignal.signal.html#exceptionhandler.__type',
      classes:
        'tsd-kind-type-literal tsd-parent-kind-type-alias tsd-is-not-exported',
      parent: '"util/signal".SignalExt.CombinedSignal.Signal.ExceptionHandler'
    },
    {
      id: 1141,
      kind: 64,
      name: 'getExceptionHandler',
      url:
        'modules/_util_signal_.signalext.combinedsignal.signal.html#getexceptionhandler',
      classes: 'tsd-kind-function tsd-parent-kind-module tsd-is-not-exported',
      parent: '"util/signal".SignalExt.CombinedSignal.Signal'
    },
    {
      id: 1142,
      kind: 64,
      name: 'setExceptionHandler',
      url:
        'modules/_util_signal_.signalext.combinedsignal.signal.html#setexceptionhandler',
      classes: 'tsd-kind-function tsd-parent-kind-module tsd-is-not-exported',
      parent: '"util/signal".SignalExt.CombinedSignal.Signal'
    },
    {
      id: 1143,
      kind: 1,
      name: '"defaults/manager"',
      url: 'modules/_defaults_manager_.html',
      classes: 'tsd-kind-external-module'
    },
    {
      id: 1144,
      kind: 2,
      name: 'IDefaultsManager',
      url: 'modules/_defaults_manager_.idefaultsmanager.html',
      classes: 'tsd-kind-module tsd-parent-kind-external-module',
      parent: '"defaults/manager"'
    },
    {
      id: 1145,
      kind: 2048,
      name: 'addDefaultStatus',
      url: 'modules/_defaults_manager_.idefaultsmanager.html#adddefaultstatus',
      classes: 'tsd-kind-method tsd-parent-kind-module',
      parent: '"defaults/manager".IDefaultsManager'
    },
    {
      id: 1146,
      kind: 128,
      name: 'DefaultsManager',
      url: 'classes/_defaults_manager_.defaultsmanager.html',
      classes:
        'tsd-kind-class tsd-parent-kind-external-module tsd-is-not-exported',
      parent: '"defaults/manager"'
    },
    {
      id: 1147,
      kind: 512,
      name: 'constructor',
      url: 'classes/_defaults_manager_.defaultsmanager.html#constructor',
      classes: 'tsd-kind-constructor tsd-parent-kind-class tsd-is-not-exported',
      parent: '"defaults/manager".DefaultsManager'
    },
    {
      id: 1148,
      kind: 2048,
      name: 'addDefaultStatus',
      url: 'classes/_defaults_manager_.defaultsmanager.html#adddefaultstatus',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-not-exported',
      parent: '"defaults/manager".DefaultsManager'
    },
    {
      id: 1149,
      kind: 262144,
      name: 'isDisposed',
      url: 'classes/_defaults_manager_.defaultsmanager.html#isdisposed',
      classes:
        'tsd-kind-get-signature tsd-parent-kind-class tsd-is-not-exported',
      parent: '"defaults/manager".DefaultsManager'
    },
    {
      id: 1150,
      kind: 2048,
      name: 'dispose',
      url: 'classes/_defaults_manager_.defaultsmanager.html#dispose',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-not-exported',
      parent: '"defaults/manager".DefaultsManager'
    },
    {
      id: 1151,
      kind: 2048,
      name: '_onSettingsUpdated',
      url: 'classes/_defaults_manager_.defaultsmanager.html#_onsettingsupdated',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/manager".DefaultsManager'
    },
    {
      id: 1152,
      kind: 1024,
      name: '_allDefaultStatusItems',
      url:
        'classes/_defaults_manager_.defaultsmanager.html#_alldefaultstatusitems',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/manager".DefaultsManager'
    },
    {
      id: 1153,
      kind: 1024,
      name: '_enabledStatusIds',
      url: 'classes/_defaults_manager_.defaultsmanager.html#_enabledstatusids',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/manager".DefaultsManager'
    },
    {
      id: 1154,
      kind: 1024,
      name: '_isDisposed',
      url: 'classes/_defaults_manager_.defaultsmanager.html#_isdisposed',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/manager".DefaultsManager'
    },
    {
      id: 1155,
      kind: 1024,
      name: '_settingsConnector',
      url: 'classes/_defaults_manager_.defaultsmanager.html#_settingsconnector',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/manager".DefaultsManager'
    },
    {
      id: 1156,
      kind: 1024,
      name: '_statusBar',
      url: 'classes/_defaults_manager_.defaultsmanager.html#_statusbar',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/manager".DefaultsManager'
    },
    {
      id: 1157,
      kind: 256,
      name: 'IItem',
      url: 'interfaces/_defaults_manager_.idefaultsmanager.iitem.html',
      classes: 'tsd-kind-interface tsd-parent-kind-module',
      parent: '"defaults/manager".IDefaultsManager'
    },
    {
      id: 1158,
      kind: 1024,
      name: 'id',
      url: 'interfaces/_defaults_manager_.idefaultsmanager.iitem.html#id',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/manager".IDefaultsManager.IItem'
    },
    {
      id: 1159,
      kind: 1024,
      name: 'item',
      url: 'interfaces/_defaults_manager_.idefaultsmanager.iitem.html#item',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/manager".IDefaultsManager.IItem'
    },
    {
      id: 1160,
      kind: 1024,
      name: 'opts',
      url: 'interfaces/_defaults_manager_.idefaultsmanager.iitem.html#opts',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/manager".IDefaultsManager.IItem'
    },
    {
      id: 1161,
      kind: 256,
      name: 'IOptions',
      url: 'interfaces/_defaults_manager_.defaultsmanager.ioptions.html',
      classes: 'tsd-kind-interface tsd-parent-kind-class',
      parent: '"defaults/manager".DefaultsManager'
    },
    {
      id: 1162,
      kind: 1024,
      name: 'settings',
      url:
        'interfaces/_defaults_manager_.defaultsmanager.ioptions.html#settings',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/manager".DefaultsManager.IOptions'
    },
    {
      id: 1163,
      kind: 1024,
      name: 'statusBar',
      url:
        'interfaces/_defaults_manager_.defaultsmanager.ioptions.html#statusbar',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/manager".DefaultsManager.IOptions'
    },
    {
      id: 1164,
      kind: 256,
      name: 'IItem',
      url: 'interfaces/_defaults_manager_.defaultsmanager.iitem.html',
      classes: 'tsd-kind-interface tsd-parent-kind-class',
      parent: '"defaults/manager".DefaultsManager'
    },
    {
      id: 1165,
      kind: 1024,
      name: 'stateChanged',
      url:
        'interfaces/_defaults_manager_.defaultsmanager.iitem.html#statechanged',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/manager".DefaultsManager.IItem'
    },
    {
      id: 1166,
      kind: 1024,
      name: 'id',
      url: 'interfaces/_defaults_manager_.defaultsmanager.iitem.html#id',
      classes: 'tsd-kind-property tsd-parent-kind-interface tsd-is-inherited',
      parent: '"defaults/manager".DefaultsManager.IItem'
    },
    {
      id: 1167,
      kind: 1024,
      name: 'item',
      url: 'interfaces/_defaults_manager_.defaultsmanager.iitem.html#item',
      classes: 'tsd-kind-property tsd-parent-kind-interface tsd-is-inherited',
      parent: '"defaults/manager".DefaultsManager.IItem'
    },
    {
      id: 1168,
      kind: 1024,
      name: 'opts',
      url: 'interfaces/_defaults_manager_.defaultsmanager.iitem.html#opts',
      classes: 'tsd-kind-property tsd-parent-kind-interface tsd-is-inherited',
      parent: '"defaults/manager".DefaultsManager.IItem'
    },
    {
      id: 1169,
      kind: 2097152,
      name: 'defaultsManager',
      url: 'modules/_defaults_manager_.html#defaultsmanager-1',
      classes: 'tsd-kind-object-literal tsd-parent-kind-external-module',
      parent: '"defaults/manager"'
    },
    {
      id: 1170,
      kind: 32,
      name: 'id',
      url: 'modules/_defaults_manager_.html#defaultsmanager-1.id',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/manager".defaultsManager'
    },
    {
      id: 1171,
      kind: 32,
      name: 'provides',
      url: 'modules/_defaults_manager_.html#defaultsmanager-1.provides',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/manager".defaultsManager'
    },
    {
      id: 1172,
      kind: 32,
      name: 'autoStart',
      url: 'modules/_defaults_manager_.html#defaultsmanager-1.autostart',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/manager".defaultsManager'
    },
    {
      id: 1173,
      kind: 32,
      name: 'requires',
      url: 'modules/_defaults_manager_.html#defaultsmanager-1.requires',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/manager".defaultsManager'
    },
    {
      id: 1174,
      kind: 64,
      name: 'activate',
      url: 'modules/_defaults_manager_.html#defaultsmanager-1.activate',
      classes: 'tsd-kind-function tsd-parent-kind-object-literal',
      parent: '"defaults/manager".defaultsManager'
    },
    {
      id: 1175,
      kind: 1,
      name: '"defaults/commandEdit"',
      url: 'modules/_defaults_commandedit_.html',
      classes: 'tsd-kind-external-module'
    },
    {
      id: 1176,
      kind: 128,
      name: 'CommandEdit',
      url: 'classes/_defaults_commandedit_.commandedit.html',
      classes:
        'tsd-kind-class tsd-parent-kind-external-module tsd-is-not-exported',
      parent: '"defaults/commandEdit"'
    },
    {
      id: 1177,
      kind: 512,
      name: 'constructor',
      url: 'classes/_defaults_commandedit_.commandedit.html#constructor',
      classes:
        'tsd-kind-constructor tsd-parent-kind-class tsd-is-overwrite tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1178,
      kind: 2048,
      name: 'render',
      url: 'classes/_defaults_commandedit_.commandedit.html#render',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1179,
      kind: 2048,
      name: 'dispose',
      url: 'classes/_defaults_commandedit_.commandedit.html#dispose',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1180,
      kind: 2048,
      name: '_onNotebookChange',
      url: 'classes/_defaults_commandedit_.commandedit.html#_onnotebookchange',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1181,
      kind: 1024,
      name: '_tracker',
      url: 'classes/_defaults_commandedit_.commandedit.html#_tracker',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-private tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1182,
      kind: 1024,
      name: 'modelChanged',
      url: 'classes/_defaults_commandedit_.commandedit.html#modelchanged',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1183,
      kind: 1024,
      name: 'model',
      url: 'classes/_defaults_commandedit_.commandedit.html#model-1',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1184,
      kind: 2048,
      name: 'onUpdateRequest',
      url: 'classes/_defaults_commandedit_.commandedit.html#onupdaterequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1185,
      kind: 2048,
      name: 'onAfterAttach',
      url: 'classes/_defaults_commandedit_.commandedit.html#onafterattach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-overwrite tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1186,
      kind: 1024,
      name: 'disposed',
      url: 'classes/_defaults_commandedit_.commandedit.html#disposed',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1187,
      kind: 1024,
      name: 'node',
      url: 'classes/_defaults_commandedit_.commandedit.html#node',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1188,
      kind: 1024,
      name: 'isDisposed',
      url: 'classes/_defaults_commandedit_.commandedit.html#isdisposed',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1189,
      kind: 1024,
      name: 'isAttached',
      url: 'classes/_defaults_commandedit_.commandedit.html#isattached',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1190,
      kind: 1024,
      name: 'isHidden',
      url: 'classes/_defaults_commandedit_.commandedit.html#ishidden',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1191,
      kind: 1024,
      name: 'isVisible',
      url: 'classes/_defaults_commandedit_.commandedit.html#isvisible',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1192,
      kind: 1024,
      name: 'title',
      url: 'classes/_defaults_commandedit_.commandedit.html#title',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1193,
      kind: 1024,
      name: 'id',
      url: 'classes/_defaults_commandedit_.commandedit.html#id',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1194,
      kind: 1024,
      name: 'dataset',
      url: 'classes/_defaults_commandedit_.commandedit.html#dataset',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1195,
      kind: 1024,
      name: 'parent',
      url: 'classes/_defaults_commandedit_.commandedit.html#parent',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1196,
      kind: 1024,
      name: 'layout',
      url: 'classes/_defaults_commandedit_.commandedit.html#layout',
      classes:
        'tsd-kind-property tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1197,
      kind: 2048,
      name: 'children',
      url: 'classes/_defaults_commandedit_.commandedit.html#children',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1198,
      kind: 2048,
      name: 'contains',
      url: 'classes/_defaults_commandedit_.commandedit.html#contains',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1199,
      kind: 2048,
      name: 'hasClass',
      url: 'classes/_defaults_commandedit_.commandedit.html#hasclass',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1200,
      kind: 2048,
      name: 'addClass',
      url: 'classes/_defaults_commandedit_.commandedit.html#addclass',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1201,
      kind: 2048,
      name: 'removeClass',
      url: 'classes/_defaults_commandedit_.commandedit.html#removeclass',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1202,
      kind: 2048,
      name: 'toggleClass',
      url: 'classes/_defaults_commandedit_.commandedit.html#toggleclass',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1203,
      kind: 2048,
      name: 'update',
      url: 'classes/_defaults_commandedit_.commandedit.html#update',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1204,
      kind: 2048,
      name: 'fit',
      url: 'classes/_defaults_commandedit_.commandedit.html#fit',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1205,
      kind: 2048,
      name: 'activate',
      url: 'classes/_defaults_commandedit_.commandedit.html#activate',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1206,
      kind: 2048,
      name: 'close',
      url: 'classes/_defaults_commandedit_.commandedit.html#close',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1207,
      kind: 2048,
      name: 'show',
      url: 'classes/_defaults_commandedit_.commandedit.html#show',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1208,
      kind: 2048,
      name: 'hide',
      url: 'classes/_defaults_commandedit_.commandedit.html#hide',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1209,
      kind: 2048,
      name: 'setHidden',
      url: 'classes/_defaults_commandedit_.commandedit.html#sethidden',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1210,
      kind: 2048,
      name: 'testFlag',
      url: 'classes/_defaults_commandedit_.commandedit.html#testflag',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1211,
      kind: 2048,
      name: 'setFlag',
      url: 'classes/_defaults_commandedit_.commandedit.html#setflag',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1212,
      kind: 2048,
      name: 'clearFlag',
      url: 'classes/_defaults_commandedit_.commandedit.html#clearflag',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1213,
      kind: 2048,
      name: 'processMessage',
      url: 'classes/_defaults_commandedit_.commandedit.html#processmessage',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1214,
      kind: 2048,
      name: 'notifyLayout',
      url: 'classes/_defaults_commandedit_.commandedit.html#notifylayout',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1215,
      kind: 2048,
      name: 'onCloseRequest',
      url: 'classes/_defaults_commandedit_.commandedit.html#oncloserequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1216,
      kind: 2048,
      name: 'onResize',
      url: 'classes/_defaults_commandedit_.commandedit.html#onresize',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1217,
      kind: 2048,
      name: 'onFitRequest',
      url: 'classes/_defaults_commandedit_.commandedit.html#onfitrequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1218,
      kind: 2048,
      name: 'onActivateRequest',
      url: 'classes/_defaults_commandedit_.commandedit.html#onactivaterequest',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1219,
      kind: 2048,
      name: 'onBeforeShow',
      url: 'classes/_defaults_commandedit_.commandedit.html#onbeforeshow',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1220,
      kind: 2048,
      name: 'onAfterShow',
      url: 'classes/_defaults_commandedit_.commandedit.html#onaftershow',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1221,
      kind: 2048,
      name: 'onBeforeHide',
      url: 'classes/_defaults_commandedit_.commandedit.html#onbeforehide',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1222,
      kind: 2048,
      name: 'onAfterHide',
      url: 'classes/_defaults_commandedit_.commandedit.html#onafterhide',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1223,
      kind: 2048,
      name: 'onBeforeAttach',
      url: 'classes/_defaults_commandedit_.commandedit.html#onbeforeattach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1224,
      kind: 2048,
      name: 'onBeforeDetach',
      url: 'classes/_defaults_commandedit_.commandedit.html#onbeforedetach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1225,
      kind: 2048,
      name: 'onAfterDetach',
      url: 'classes/_defaults_commandedit_.commandedit.html#onafterdetach',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1226,
      kind: 2048,
      name: 'onChildAdded',
      url: 'classes/_defaults_commandedit_.commandedit.html#onchildadded',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1227,
      kind: 2048,
      name: 'onChildRemoved',
      url: 'classes/_defaults_commandedit_.commandedit.html#onchildremoved',
      classes:
        'tsd-kind-method tsd-parent-kind-class tsd-is-inherited tsd-is-protected tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1228,
      kind: 2,
      name: 'VDomRenderer',
      url: 'modules/_defaults_commandedit_.commandedit.vdomrenderer.html',
      classes: 'tsd-kind-module tsd-parent-kind-class',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1229,
      kind: 256,
      name: 'IModel',
      url:
        'interfaces/_defaults_commandedit_.commandedit.vdomrenderer.imodel.html',
      classes: 'tsd-kind-interface tsd-parent-kind-module tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit.VDomRenderer'
    },
    {
      id: 1230,
      kind: 1024,
      name: 'stateChanged',
      url:
        'interfaces/_defaults_commandedit_.commandedit.vdomrenderer.imodel.html#statechanged',
      classes:
        'tsd-kind-property tsd-parent-kind-interface tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit.VDomRenderer.IModel'
    },
    {
      id: 1231,
      kind: 1024,
      name: 'isDisposed',
      url:
        'interfaces/_defaults_commandedit_.commandedit.vdomrenderer.imodel.html#isdisposed',
      classes:
        'tsd-kind-property tsd-parent-kind-interface tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit.VDomRenderer.IModel'
    },
    {
      id: 1232,
      kind: 2048,
      name: 'dispose',
      url:
        'interfaces/_defaults_commandedit_.commandedit.vdomrenderer.imodel.html#dispose',
      classes:
        'tsd-kind-method tsd-parent-kind-interface tsd-is-inherited tsd-is-not-exported',
      parent: '"defaults/commandEdit".CommandEdit.VDomRenderer.IModel'
    },
    {
      id: 1233,
      kind: 2,
      name: 'ICommandEdit',
      url: 'modules/_defaults_commandedit_.icommandedit.html',
      classes: 'tsd-kind-module tsd-parent-kind-external-module',
      parent: '"defaults/commandEdit"'
    },
    {
      id: 1234,
      kind: 1024,
      name: 'model',
      url: 'modules/_defaults_commandedit_.icommandedit.html#model',
      classes: 'tsd-kind-property tsd-parent-kind-module',
      parent: '"defaults/commandEdit".ICommandEdit'
    },
    {
      id: 1235,
      kind: 1024,
      name: 'modelChanged',
      url: 'modules/_defaults_commandedit_.icommandedit.html#modelchanged',
      classes: 'tsd-kind-property tsd-parent-kind-module',
      parent: '"defaults/commandEdit".ICommandEdit'
    },
    {
      id: 1236,
      kind: 1024,
      name: 'isDisposed',
      url: 'modules/_defaults_commandedit_.icommandedit.html#isdisposed',
      classes: 'tsd-kind-property tsd-parent-kind-module tsd-is-inherited',
      parent: '"defaults/commandEdit".ICommandEdit'
    },
    {
      id: 1237,
      kind: 2048,
      name: 'dispose',
      url: 'modules/_defaults_commandedit_.icommandedit.html#dispose',
      classes: 'tsd-kind-method tsd-parent-kind-module tsd-is-inherited',
      parent: '"defaults/commandEdit".ICommandEdit'
    },
    {
      id: 1238,
      kind: 2,
      name: 'CommandEditComponent',
      url: 'modules/_defaults_commandedit_.commandeditcomponent.html',
      classes:
        'tsd-kind-module tsd-parent-kind-external-module tsd-is-not-exported',
      parent: '"defaults/commandEdit"'
    },
    {
      id: 1239,
      kind: 256,
      name: 'IProps',
      url: 'interfaces/_defaults_commandedit_.commandeditcomponent.iprops.html',
      classes: 'tsd-kind-interface tsd-parent-kind-module',
      parent: '"defaults/commandEdit".CommandEditComponent'
    },
    {
      id: 1240,
      kind: 1024,
      name: 'notebookMode',
      url:
        'interfaces/_defaults_commandedit_.commandeditcomponent.iprops.html#notebookmode',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/commandEdit".CommandEditComponent.IProps'
    },
    {
      id: 1241,
      kind: 128,
      name: 'Model',
      url: 'classes/_defaults_commandedit_.commandedit.model.html',
      classes: 'tsd-kind-class tsd-parent-kind-class',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1242,
      kind: 512,
      name: 'constructor',
      url: 'classes/_defaults_commandedit_.commandedit.model.html#constructor',
      classes: 'tsd-kind-constructor tsd-parent-kind-class',
      parent: '"defaults/commandEdit".CommandEdit.Model'
    },
    {
      id: 1243,
      kind: 262144,
      name: 'notebookMode',
      url: 'classes/_defaults_commandedit_.commandedit.model.html#notebookmode',
      classes: 'tsd-kind-accessor tsd-parent-kind-class',
      parent: '"defaults/commandEdit".CommandEdit.Model'
    },
    {
      id: 1244,
      kind: 262144,
      name: 'notebook',
      url: 'classes/_defaults_commandedit_.commandedit.model.html#notebook',
      classes: 'tsd-kind-set-signature tsd-parent-kind-class',
      parent: '"defaults/commandEdit".CommandEdit.Model'
    },
    {
      id: 1245,
      kind: 2048,
      name: '_onChanged',
      url: 'classes/_defaults_commandedit_.commandedit.model.html#_onchanged',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/commandEdit".CommandEdit.Model'
    },
    {
      id: 1246,
      kind: 2048,
      name: '_getAllState',
      url: 'classes/_defaults_commandedit_.commandedit.model.html#_getallstate',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/commandEdit".CommandEdit.Model'
    },
    {
      id: 1247,
      kind: 2048,
      name: '_triggerChange',
      url:
        'classes/_defaults_commandedit_.commandedit.model.html#_triggerchange',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/commandEdit".CommandEdit.Model'
    },
    {
      id: 1248,
      kind: 1024,
      name: '_notebookMode',
      url:
        'classes/_defaults_commandedit_.commandedit.model.html#_notebookmode',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/commandEdit".CommandEdit.Model'
    },
    {
      id: 1249,
      kind: 1024,
      name: '_notebook',
      url: 'classes/_defaults_commandedit_.commandedit.model.html#_notebook',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-private',
      parent: '"defaults/commandEdit".CommandEdit.Model'
    },
    {
      id: 1250,
      kind: 1024,
      name: 'stateChanged',
      url: 'classes/_defaults_commandedit_.commandedit.model.html#statechanged',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-inherited',
      parent: '"defaults/commandEdit".CommandEdit.Model'
    },
    {
      id: 1251,
      kind: 1024,
      name: 'isDisposed',
      url: 'classes/_defaults_commandedit_.commandedit.model.html#isdisposed',
      classes: 'tsd-kind-property tsd-parent-kind-class tsd-is-inherited',
      parent: '"defaults/commandEdit".CommandEdit.Model'
    },
    {
      id: 1252,
      kind: 2048,
      name: 'dispose',
      url: 'classes/_defaults_commandedit_.commandedit.model.html#dispose',
      classes: 'tsd-kind-method tsd-parent-kind-class tsd-is-inherited',
      parent: '"defaults/commandEdit".CommandEdit.Model'
    },
    {
      id: 1253,
      kind: 256,
      name: 'IOptions',
      url: 'interfaces/_defaults_commandedit_.commandedit.ioptions.html',
      classes: 'tsd-kind-interface tsd-parent-kind-class',
      parent: '"defaults/commandEdit".CommandEdit'
    },
    {
      id: 1254,
      kind: 1024,
      name: 'tracker',
      url:
        'interfaces/_defaults_commandedit_.commandedit.ioptions.html#tracker',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/commandEdit".CommandEdit.IOptions'
    },
    {
      id: 1255,
      kind: 256,
      name: 'IModel',
      url: 'interfaces/_defaults_commandedit_.icommandedit.imodel.html',
      classes: 'tsd-kind-interface tsd-parent-kind-module',
      parent: '"defaults/commandEdit".ICommandEdit'
    },
    {
      id: 1256,
      kind: 1024,
      name: 'notebookMode',
      url:
        'interfaces/_defaults_commandedit_.icommandedit.imodel.html#notebookmode',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/commandEdit".ICommandEdit.IModel'
    },
    {
      id: 1257,
      kind: 1024,
      name: 'notebook',
      url:
        'interfaces/_defaults_commandedit_.icommandedit.imodel.html#notebook',
      classes: 'tsd-kind-property tsd-parent-kind-interface',
      parent: '"defaults/commandEdit".ICommandEdit.IModel'
    },
    {
      id: 1258,
      kind: 2097152,
      name: 'commandEditItem',
      url: 'modules/_defaults_commandedit_.html#commandedititem',
      classes: 'tsd-kind-object-literal tsd-parent-kind-external-module',
      parent: '"defaults/commandEdit"'
    },
    {
      id: 1259,
      kind: 32,
      name: 'id',
      url: 'modules/_defaults_commandedit_.html#commandedititem.id',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/commandEdit".commandEditItem'
    },
    {
      id: 1260,
      kind: 32,
      name: 'autoStart',
      url: 'modules/_defaults_commandedit_.html#commandedititem.autostart',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/commandEdit".commandEditItem'
    },
    {
      id: 1261,
      kind: 32,
      name: 'provides',
      url: 'modules/_defaults_commandedit_.html#commandedititem.provides',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/commandEdit".commandEditItem'
    },
    {
      id: 1262,
      kind: 32,
      name: 'requires',
      url: 'modules/_defaults_commandedit_.html#commandedititem.requires',
      classes: 'tsd-kind-variable tsd-parent-kind-object-literal',
      parent: '"defaults/commandEdit".commandEditItem'
    },
    {
      id: 1263,
      kind: 64,
      name: 'activate',
      url: 'modules/_defaults_commandedit_.html#commandedititem.activate',
      classes: 'tsd-kind-function tsd-parent-kind-object-literal',
      parent: '"defaults/commandEdit".commandEditItem'
    }
  ]
};
