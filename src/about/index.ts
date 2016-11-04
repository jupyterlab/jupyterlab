// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  h, VNode
} from 'phosphor/lib/ui/vdom';

import {
  VDomModel, VDomWidget
} from '../common/vdom';

export
class AboutModel extends VDomModel {
  constructor() {
    super();
  }

}

export
class AboutWidget extends VDomWidget<AboutModel> {
  constructor() {
    super();
  }

  protected render(): VNode {

    let headerRow =
    h.div({className: 'row'},
      h.div({className: 'column'},
        h.span({className: 'jp-img jp-About-logo'}),
        h.p({className: 'header'}, 'Welcome to the JupyterLab Alpha preview'),
        h.div({className: 'desc-one'},
          h.p('Click on the Launcher tab......'),
          h.p('This demo gives an alpa-level....',
            h.b('It is not ready for general usage yet')
          ),
          h.p('Here is a brief description....')
        )
      )
    );

    let mainAreaCommandPaletteRow =
    h.div({className: 'row'},
      h.div({className: 'one-half column'},
        h.p({className: 'desc-two-header'},
          h.a({href: '#main-area'},
            h.span({className: 'jp-img jp-About-hero-mainarea'}),
            'Main Area'
          )
        ),
        h.p({className: 'desc-two'}, 'Open tabs and drag and drop them to rearrange them'
        )
      ),
      h.div({className: 'one-half column'},
        h.p({className: 'desc-two-header'},
          h.a({href: '#command'},
            h.span({className: 'jp-img jp-About-hero-command'}),
            'Command Palette'
          )
        ),
        h.p({className: 'desc-two'},
         'View list of commands and keyboard shortcuts'
        )
      )
    );

    let filebrowserNotebookRow =
    h.div({className: 'row'},
      h.div({className: 'one-half column'},
        h.p({className: 'desc-two-header'},
          h.a({className: '#filebrowser'},
            h.span({className: 'jp-img jp-About-hero-filebrowser'}),
            'File Browser'
          )
        ),
        h.p({className: 'desc-two'},
          'Navigate and organize your files'
        ),
      ),
      h.div({className: 'one-half column'},
        h.p({className: 'desc-two-header'},
          h.a({href: '#notebook'},
            h.span({className: 'jp-img jp-About-hero-notebook'}),
            'Notebook'
          )
        ),
        h.p({className: 'desc-two'}, 'Dedicate a tab to running a classic notebook')
      )
    );

    let mainAreaPage =
    h.div({className: 'section'},
      h.a({id: 'main-area'}),
      h.div({className: 'sectioncenter'},
        h.p({className: 'header content'},
          h.span({className: 'jp-img jp-About-hero-mainarea'}),
          'Main Area'
        ),
        h.span({className: 'jp-img jp-About-mainarea'}),
        h.p({className: 'content-desc'}, 'Hello'),
        h.p({className: 'content-desc'}, 'Hello Again'),
        h.a({href: '#command'},
          h.span({className: 'nav-button'})
        )
      )
    );

    let commandPalettePage =
    h.div({className: 'section'},
      h.a({id: 'command'}),
      h.div({className: 'sectioncenter'},
        h.p({className: 'header content'},
          h.span({className: 'jp-img jp-About-hero-command'}),
          'Command Palette'
        ),
        h.span({className: 'jp-img jp-About-command'}),
        h.p({className: 'content-desc'}, 'Command content here'),
        h.div({className: 'content-desc'},
          h.p('Here is some text'),
          h.ul(
            h.li('1'),
            h.li('2'),
            h.li('3'),
            h.li('4'),
            h.li('5')
          )
        ),
        h.a({href: '#filebrowser'},
          h.span({className: 'nav-button'})
        )
      )
    );

    let filebrowserPage =
    h.div({className: 'section'},
      h.a({id: 'filebrowser'}),
      h.div({className: 'sectioncenter'},
        h.p({className: 'header content'},
          h.span({className: 'jp-img jp-About-hero-filebrowser'}),
          'File Browser'
        ),
        h.span({className: 'jp-img jp-About-fb'}),
        h.p({className: 'content-desc'}, 'File browser content goes here'),
        h.a({href: '#notebook'},
          h.span({className: 'nav-button'})
        )
      )
    );

    let notebookPage =
    h.div({className: 'section'},
      h.a({id: 'notebook'}),
      h.div({className: 'sectioncenter'},
        h.p({className: 'header content'},
          h.span({className: 'jp-img jp-About-hero-notebook'}),
          'Notebook'
        ),
        h.span({className: 'jp-img jp-About-nb'}),
        h.p({className: 'content-desc'}, 'Notebook Content goes here')
      )
    );

    let domTree =
    h.div({id: 'about'},
      h.div({className: 'section'},
      // check here for extra code
        h.a({id: '#'}),
        h.div({className: 'sectioncenter'},
          h.div({className: 'container'},
            headerRow,
            mainAreaCommandPaletteRow,
            filebrowserNotebookRow
          )
        )
      ),
      mainAreaPage,
      commandPalettePage,
      filebrowserPage,
      notebookPage
    );
    return domTree;
  }
}
