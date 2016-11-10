// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  h, VNode
} from 'phosphor/lib/ui/vdom';

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  ICommandPalette
} from '../commandpalette';

import {
  VDomModel, VDomWidget
} from '../common/vdom';


/**
 * The faq page extension.
 */
export
const faqExtension: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.faq',
  requires: [ICommandPalette],
  activate: activateFAQ,
  autoStart: true
};

/**
 * The class name added to the FAQ plugin.
 */
const FAQ_CLASS = 'jp-FAQ';

/**
 * The id name added to the header section element.
 */
const HEADER_ID = 'faq-header';

/**
 * The class name added to the title.
 */
const TITLE_CLASS = 'jp-FAQ-title';

/**
 * The class name added to h1 elements.
 */
const HEADER_CLASS = 'jp-FAQ-h1';

/**
 * The class name added to h2 elements.
 */
const SUBHEADER_CLASS = 'jp-FAQ-h2';

/**
 * The class name added for the question mark icon from default-theme.
 */
const QUESTIONMARK_ICON_CLASS = 'jp-QuestionMark';

/**
 * The class named added the question mark icon.
 */
const QUESTIONMARK_CLASS = 'jp-FAQ-QuestionMark';

/**
 * The class name added to faq content.
 */
const CONTENT_CLASS = 'jp-FAQ-content';

/**
 * The class name added to unordered list elements.
 */
const FAQ_LIST_CLASS = 'jp-FAQ-ul';

/**
 * The class name added to table of contents elements.
 */
const TOC_CLASS = 'jp-FAQ-toc';

/**
 * The class name added to questions.
 */
const QUESTION_CLASS = 'jp-FAQ-question';

/**
 * The class name added to answers.
 */
const ANSWER_CLASS = 'jp-FAQ-answer';

/**
 * The class name added to anchor elements.
 */
const ANCHOR_CLASS = 'jp-FAQ-a';


class FaqModel extends VDomModel {
  constructor() {
    super();
    this._title = 'Frequently Asked Questions';
    this._subHeadings = [
      'THE BASICS',
      'FEATURES',
      'DEVELOPER'
    ];
    this._basicsQuestions = [
      'What is JupyterLab?',
      'What is a Jupyter Notebook?',
      'How stable is JupyterLab?',
      'I\'m confused with the interface. How do I navigate around JupyterLab?'
    ];
    this._featuresQuestions = [
      'How do I add more kernels/languages to JupyterLab?',
      'How can I share my notebooks?'
    ];
    this._developerQuestions = [
      'How do I report a bug?',
      'I have security concerns about JupyterLab.',
      'How can I contribute?'
    ];
  }

  get title(): string {
    return this._title;
  }

  get subHeadings(): string[] {
    return this._subHeadings;
  }

  get basicsQuestions(): string[] {
    return this._basicsQuestions;
  }

  get featuresQuestions(): string[] {
    return this._featuresQuestions;
  }

  get developerQuestions(): string[] {
    return this._developerQuestions;
  }


  private _title: string;
  private _subHeadings: string[];
  private _basicsQuestions: string[];
  private _featuresQuestions: string[];
  private _developerQuestions: string[];
}

class FaqWidget extends VDomWidget<FaqModel> {
  constructor(app: JupyterLab) {
    super();
    this._app = app;
    this.addClass(FAQ_CLASS);
  }

  protected render(): VNode[] {
    let subHeadings = this.model.subHeadings;
    let basicsQuestions = this.model.basicsQuestions;
    let featuresQuestions = this.model.featuresQuestions;
    let developerQuestions = this.model.developerQuestions;

    // Create Frequently Asked Questions Header Section.
    let faqHeader =
    h.section({id: HEADER_ID},
      h.span({className: QUESTIONMARK_ICON_CLASS + ' ' + QUESTIONMARK_CLASS}),
      h.h1({className: HEADER_CLASS},
        h.span({className: TITLE_CLASS},
          this.model.title
        )
      )
    );

    // Create a section element that holds Table of Contents.
    let questionList =
    h.section({className: CONTENT_CLASS},
      h.h2({className: SUBHEADER_CLASS}, subHeadings[0]),
      h.ul({className: FAQ_LIST_CLASS},
        h.li({className: QUESTION_CLASS + ' ' + TOC_CLASS},
          h.a({href: '#basicsQ1'}, basicsQuestions[0])
        ),
        h.li({className: QUESTION_CLASS + ' ' + TOC_CLASS},
          h.a({href: '#basicsQ2'}, basicsQuestions[1])
        ),
        h.li({className: QUESTION_CLASS + ' ' + TOC_CLASS},
          h.a({href: '#basicsQ3'}, basicsQuestions[2])
        ),
        h.li({className: QUESTION_CLASS + ' ' + TOC_CLASS},
          h.a({href: '#basicsQ4'}, basicsQuestions[3])
        )
      ),
      h.h2({className: SUBHEADER_CLASS}, subHeadings[1]),
      h.ul({className: FAQ_LIST_CLASS},
        h.li({className: QUESTION_CLASS + ' ' + TOC_CLASS},
          h.a({href: '#featuresQ1'}, featuresQuestions[0])
        ),
        h.li({className: QUESTION_CLASS + ' ' + TOC_CLASS},
          h.a({href: '#featuresQ2'}, featuresQuestions[1])
        )
      ),
      h.h2({className: SUBHEADER_CLASS}, subHeadings[2]),
      h.ul({className: FAQ_LIST_CLASS},
        h.li({className: QUESTION_CLASS + ' ' + TOC_CLASS},
          h.a({href: '#developerQ1'}, developerQuestions[0])
        ),
        h.li({className: QUESTION_CLASS + ' ' + TOC_CLASS},
          h.a({href: '#developerQ2'}, developerQuestions[1])
        ),
        h.li({className: QUESTION_CLASS + ' ' + TOC_CLASS},
          h.a({href: '#developerQ3'}, developerQuestions[2])
        )
      )
    );

    // Create a section element that all other FAQ Content will go under.
    let questionAnswerList =
    h.section({className: CONTENT_CLASS},
      h.h2({className: SUBHEADER_CLASS}, subHeadings[0]),
      // Create list of questions/answers under the Basics section.
      h.ul({className: FAQ_LIST_CLASS},
        h.li({className: QUESTION_CLASS, id: 'basicsQ1'}, basicsQuestions[0]),
        h.li({className: ANSWER_CLASS},
          'JupyterLab allows users to arrange multiple Jupyter notebooks, '
          + 'text editors, terminals, output areas, etc. on a single page with multiple '
          + 'panels and tabs into one application. The codebase and UI of JupyterLab '
          + 'is based on a flexible plugin system that makes it easy to extend '
          + 'with new components.'
        ),
        h.li({className: QUESTION_CLASS, id: 'basicsQ2'}, basicsQuestions[1]),
        h.li({className: ANSWER_CLASS},
          'Central to the project is the Jupyter Notebook, a web-based '
          + 'platform that allows users to combine live code, equations, narrative '
          + 'text, visualizations, interactive dashboards and other media. Together '
          + 'these building blocks make science and data reproducible across over '
          + '40 programming languages and combine to form what we call a computational '
          + 'narrative.'
        ),
        h.li({className: QUESTION_CLASS, id: 'basicsQ3'}, basicsQuestions[2]),
        h.li({className: ANSWER_CLASS},
          'JupyterLab is currently in a alpha release and not ready for public use '
          + 'as new features and bug fixes are being added very frequently. We strongly '
          + 'recommend to backup your work before using JupyterLab. However, testing, '
          + 'development, and user feedback are greatly appreciated.'
        ),
        h.li({className: QUESTION_CLASS, id: 'basicsQ4'}, basicsQuestions[3]),
        h.li({className: ANSWER_CLASS},
          'Check out the JupyterLab tour ',
          h.a({className: ANCHOR_CLASS,
               onclick: () => {
                 this._app.commands.execute('about-jupyterlab:show', void 0);
               }},
            'here'
          )
        )
      ),
      h.h2({className: SUBHEADER_CLASS}, subHeadings[1]),
      // Create list of questions/answers under the Features section.
      h.ul({className: FAQ_LIST_CLASS},
        h.li({className: QUESTION_CLASS, id: 'featuresQ1'}, featuresQuestions[0]),
        h.li({className: ANSWER_CLASS},
          'To add more languages to the JupyterLab you must install '
          + 'a new kernel. Installing a kernel is usually fairly simple and can be '
          + 'done with a couple terminal commands. However the instructions for installing '
          + 'kernels is different for each language. For further instructions, click ',
          h.a({className: ANCHOR_CLASS,
               href: 'https://jupyter.readthedocs.io/en/latest/install-kernel.html',
               target: '_blank'},
            'this'
          ),
          ' link.'
        ),
        h.li({className: QUESTION_CLASS, id: 'featuresQ2'}, featuresQuestions[1]),
        h.li({className: ANSWER_CLASS},
          'You can either publish your notebooks on GitHub or use a free service such as ',
          h.a({className: ANCHOR_CLASS, href: 'https://nbviewer.jupyter.org/', target: '_blank'},
            'nbviewer.org'
          ),
          ' to render your notebooks online.'
        )
      ),
      h.h2({className: SUBHEADER_CLASS}, subHeadings[2]),
      // Create list of questions/answers under the Developer section.
      h.ul({className: FAQ_LIST_CLASS},
        h.li({className: QUESTION_CLASS, id: 'developerQ1'}, developerQuestions[0]),
        h.li({className: ANSWER_CLASS},
          'You can open an issue on our ',
          h.a({className: ANCHOR_CLASS,
               href: 'https://github.com/jupyterlab/jupyterlab/issues',
               target: '_blank'},
            'github repository'
          ),
          '. Please check already opened issues before posting.'
        ),
        h.li({className: QUESTION_CLASS, id: 'developerQ2'}, developerQuestions[1]),
        h.li({className: ANSWER_CLASS},
          'If you have any inquiries, concerns, or thought you found a security '
          + 'vulnerability, please write to use at ',
          h.a({className: ANCHOR_CLASS, href: 'mailto:security@jupyter.org'},
            'security@jupyter.org'
          ),
          '. We will do our best to repond to you promptly.'
        ),
        h.li({className: QUESTION_CLASS, id: 'developerQ3'}, developerQuestions[2]),
        h.li({className: ANSWER_CLASS},
          'There are many ways to contribute to JupyterLab. '
          + 'Whether you are an experienced python programmer or a newcomer, any '
          + 'interested developers are welcome. You can learn about the JupyterLab '
          + 'codebase by going through our ',
          h.a({className: ANCHOR_CLASS,
               href: 'https://jupyterlab-tutorial.readthedocs.io/en/latest/index.html',
               target: '_blank'},
            'tutorial walkthrough'
          ),
          ' and ',
          h.a({className: ANCHOR_CLASS,
               href: 'http://jupyter.org/jupyterlab/',
               target: '_blank'},
               'documentation'
          ),
          '. Also, feel free to ask questions on our ',
          h.a({className: ANCHOR_CLASS,
               href: 'https://github.com/jupyterlab/jupyterlab',
               target: '_blank'},
               'github'
          ),
          ' or through any of our ',
          h.a({className: ANCHOR_CLASS,
               href: 'http://jupyter.org/community.html',
               target: '_blank'},
            'community resources'
          ),
          '.'
        )
      )
    );
    let domTree = [faqHeader, questionList, questionAnswerList];
    return domTree;
  }

  private _app: JupyterLab;
}

/**
 * Activate the faq plugin.
 */
function activateFAQ(app: JupyterLab, palette: ICommandPalette): void {
  let faqModel = new FaqModel();
  let widget = new FaqWidget(app);
  let commandId = 'faq-jupyterlab:show';
  widget.model = faqModel;
  widget.id = 'faq-jupyterlab';
  widget.title.label = 'FAQ';
  widget.title.closable = true;
  widget.node.style.overflowY = 'auto';

  app.commands.addCommand(commandId, {
    label: 'Frequently Asked Questions',
    execute: () => {
      if (!widget.isAttached) {
        app.shell.addToMainArea(widget);
      }
      app.shell.activateMain(widget.id);
    }
  });

  palette.addItem({ command: commandId, category: 'Help' });
}
