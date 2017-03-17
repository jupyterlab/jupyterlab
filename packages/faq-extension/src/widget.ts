// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Message
} from '@phosphor/messaging';

import {
  h, VirtualNode
} from '@phosphor/virtualdom';

import {
  ICommandLinker, VDomModel, VDomWidget
} from '@jupyterlab/apputils';


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

/**
 * Title of the FAQ plugin.
 */
const TITLE = 'Frequently Asked Questions';

/**
 * Contain subheadings for each section.
 */
const SUBHEADINGS = ['THE BASICS', 'FEATURES', 'DEVELOPER'];

/**
 * Contain questions for `the basics` section.
 */
const BASIC_QUESTIONS = [
  'What is JupyterLab?',
  'What is a Jupyter Notebook?',
  'How stable is JupyterLab?',
  `I'm confused with the interface. How do I navigate around JupyterLab?`
];

/**
 * Contain questions for the `features` section.
 */
const FEATURES_QUESTIONS = [
  'How do I add more kernels/languages to JupyterLab?',
  'How can I share my notebooks?'
];

/**
 * Contain questions for the `developer` section.
 */
const DEVELOPER_QUESTIONS = [
  'How do I report a bug?',
  'I have security concerns about JupyterLab.',
  'How can I contribute?'
];


/**
 * FaqModel holds data which the FaqWidget will render.
 */
export
class FaqModel extends VDomModel {
  /**
   * Title of the FAQ plugin.
   */
  readonly title = TITLE;

  /**
   * Contain subheadings for each section.
   */
  readonly subheadings = SUBHEADINGS;

  /**
   * Contain questions for `the basics` section.
   */
  readonly basicsQuestions = BASIC_QUESTIONS;

  /**
   * Contain questions for the `features` section.
   */
  readonly featuresQuestions = FEATURES_QUESTIONS;

  /**
   * Contain questions for the `developer` section.
   */
  readonly developerQuestions = DEVELOPER_QUESTIONS;
}

/**
 * A virtual-DOM-based widget for the FAQ plugin.
 */
export
class FaqWidget extends VDomWidget<FaqModel> {
  /**
   * Construct a new faq widget.
   */
  constructor(options: FaqWidget.IOptions) {
    super();
    this._linker = options.linker;
    this.addClass(FAQ_CLASS);
  }

  /**
   * Render the faq plugin to virtual DOM nodes.
   */
  protected render(): VirtualNode[] {
    let linker = this._linker;
    let subheadings = this.model.subheadings;
    let basicsQuestions = this.model.basicsQuestions;
    let featuresQuestions = this.model.featuresQuestions;
    let developerQuestions = this.model.developerQuestions;

    // Create Frequently Asked Questions Header Section.
    let faqHeader =
    h.section({ id: HEADER_ID },
      h.span({
        className: QUESTIONMARK_ICON_CLASS + ' ' + QUESTIONMARK_CLASS
      }),
      h.h1({ className: HEADER_CLASS },
        h.span({ className: TITLE_CLASS }, this.model.title)
      )
    );

    // Create a section element that holds Table of Contents.
    let questionList =
    h.section({ className: CONTENT_CLASS },
      h.h2({ className: SUBHEADER_CLASS }, subheadings[0]),
      h.ul({ className: FAQ_LIST_CLASS },
        h.li({ className: QUESTION_CLASS + ' ' + TOC_CLASS },
          h.a({ href: '#basicsQ1' }, basicsQuestions[0])
        ),
        h.li({ className: QUESTION_CLASS + ' ' + TOC_CLASS },
          h.a({ href: '#basicsQ2' }, basicsQuestions[1])
        ),
        h.li({ className: QUESTION_CLASS + ' ' + TOC_CLASS },
          h.a({ href: '#basicsQ3' }, basicsQuestions[2])
        ),
        h.li({ className: QUESTION_CLASS + ' ' + TOC_CLASS },
          h.a({ href: '#basicsQ4' }, basicsQuestions[3])
        )
      ),
      h.h2({ className: SUBHEADER_CLASS }, subheadings[1]),
      h.ul({ className: FAQ_LIST_CLASS },
        h.li({ className: QUESTION_CLASS + ' ' + TOC_CLASS },
          h.a({ href: '#featuresQ1' }, featuresQuestions[0])
        ),
        h.li({ className: QUESTION_CLASS + ' ' + TOC_CLASS },
          h.a({ href: '#featuresQ2' }, featuresQuestions[1])
        )
      ),
      h.h2({ className: SUBHEADER_CLASS }, subheadings[2]),
      h.ul({ className: FAQ_LIST_CLASS },
        h.li({ className: QUESTION_CLASS + ' ' + TOC_CLASS },
          h.a({ href: '#developerQ1' }, developerQuestions[0])
        ),
        h.li({ className: QUESTION_CLASS + ' ' + TOC_CLASS },
          h.a({ href: '#developerQ2' }, developerQuestions[1])
        ),
        h.li({ className: QUESTION_CLASS + ' ' + TOC_CLASS },
          h.a({ href: '#developerQ3' }, developerQuestions[2])
        )
      )
    );

    // Create a section element that all other FAQ Content will go under.
    let questionAnswerList =
    h.section({ className: CONTENT_CLASS },
      h.h2({ className: SUBHEADER_CLASS }, subheadings[0]),
      // Create list of questions/answers under the Basics section.
      h.ul({ className: FAQ_LIST_CLASS },
        h.li({ className: QUESTION_CLASS, id: 'basicsQ1' }, basicsQuestions[0]),
        h.li({ className: ANSWER_CLASS },
          `JupyterLab allows users to arrange multiple Jupyter notebooks,
          text editors, terminals, output areas, etc. on a single page with
          multiple panels and tabs into one application. The codebase and UI of
          JupyterLab is based on a flexible plugin system that makes it easy to
          extend with new components.`
        ),
        h.li({ className: QUESTION_CLASS, id: 'basicsQ2' }, basicsQuestions[1]),
        h.li({ className: ANSWER_CLASS },
          `Central to the project is the Jupyter Notebook, a web-based
          platform that allows users to combine live code, equations, narrative
          text, visualizations, interactive dashboards and other media. Together
          these building blocks make science and data reproducible across over
          40 programming languages and combine to form what we call a
          computational narrative.`
        ),
        h.li({ className: QUESTION_CLASS, id: 'basicsQ3' }, basicsQuestions[2]),
        h.li({ className: ANSWER_CLASS },
          `JupyterLab is currently in an alpha release and not ready for public
          use as new features and bug fixes are being added very frequently. We
          strongly recommend to back up your work before using JupyterLab.
          However, testing, development, and user feedback are greatly
          appreciated.`
        ),
        h.li({ className: QUESTION_CLASS, id: 'basicsQ4' }, basicsQuestions[3]),
        h.li({ className: ANSWER_CLASS },
          'Check out the JupyterLab tour ',
          h.a({
            className: ANCHOR_CLASS,
            dataset: linker.populateVNodeDataset('about-jupyterlab:open', null)
          }, 'here')
        )
      ),
      h.h2({ className: SUBHEADER_CLASS }, subheadings[1]),
      // Create list of questions/answers under the Features section.
      h.ul({ className: FAQ_LIST_CLASS },
        h.li({
          className: QUESTION_CLASS,
          id: 'featuresQ1'
        }, featuresQuestions[0]),
        h.li({ className: ANSWER_CLASS },
          `To add more languages to the JupyterLab you must install a new
          kernel. Installing a kernel is usually fairly simple and can be done
          with a couple terminal commands. However the instructions for
          installing kernels is different for each language. For further
          instructions, click`,
          h.a({
            className: ANCHOR_CLASS,
            href: 'https://jupyter.readthedocs.io/en/latest/install-kernel.html',
            target: '_blank'
          }, 'this'),
          ' link.'
        ),
        h.li({
          className: QUESTION_CLASS,
          id: 'featuresQ2'
        }, featuresQuestions[1]),
        h.li({ className: ANSWER_CLASS },
          `You can either publish your notebooks on GitHub or use a free service
          such as `,
          h.a({
            className: ANCHOR_CLASS,
            href: 'https://nbviewer.jupyter.org/',
            target: '_blank'
          }, 'nbviewer.org'),
          ' to render your notebooks online.'
        )
      ),
      h.h2({ className: SUBHEADER_CLASS }, subheadings[2]),
      // Create list of questions/answers under the Developer section.
      h.ul({ className: FAQ_LIST_CLASS },
        h.li({
          className: QUESTION_CLASS,
          id: 'developerQ1'
        }, developerQuestions[0]),
        h.li({ className: ANSWER_CLASS },
          'You can open an issue on our ',
          h.a({
            className: ANCHOR_CLASS,
            href: 'https://github.com/jupyterlab/jupyterlab/issues',
            target: '_blank'
          }, 'GitHub repository'),
          '. Please check already opened issues before posting.'
        ),
        h.li({
          className: QUESTION_CLASS,
          id: 'developerQ2'
        }, developerQuestions[1]),
        h.li({ className: ANSWER_CLASS },
          `If you have any inquiries, concerns, or thought you found a security
          vulnerability, please write to use at `,
          h.a({
            className: ANCHOR_CLASS,
            href: 'mailto:security@jupyter.org'
          }, 'security@jupyter.org'),
          '. We will do our best to repond to you promptly.'
        ),
        h.li({
          className: QUESTION_CLASS,
          id: 'developerQ3'
        }, developerQuestions[2]),
        h.li({ className: ANSWER_CLASS },
          `There are many ways to contribute to JupyterLab. Whether you are an
          experienced Python programmer or a newcomer, any interested developers
          are welcome. You can learn about the JupyterLab codebase by going
          through our`,
          h.a({
            className: ANCHOR_CLASS,
            href: 'https://jupyterlab-tutorial.readthedocs.io/en/latest/index.html',
            target: '_blank'
          }, 'tutorial walkthrough' ),
          ' and ',
          h.a({
            className: ANCHOR_CLASS,
            href: 'https://jupyterlab.github.io/jupyterlab/',
            target: '_blank'
          }, 'documentation'),
          '. Also, feel free to ask questions on our ',
          h.a({
            className: ANCHOR_CLASS,
            href: 'https://github.com/jupyterlab/jupyterlab',
            target: '_blank'
          }, 'github'),
          ' or through any of our ',
          h.a({
            className: ANCHOR_CLASS,
            href: 'http://jupyter.org/community.html',
            target: '_blank'
          }, 'community resources'),
          '.'
        )
      )
    );
    return [faqHeader, questionList, questionAnswerList];
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.node.tabIndex = -1;
    this.node.focus();
  }

  /**
   * Handle `'close-request'` messages.
   */
  protected onCloseRequest(msg: Message): void {
    super.onCloseRequest(msg);
    this.dispose();
  }

  private _linker: ICommandLinker;
}


/**
 * A namespace for `FaqWidget` statics.
 */
export
namespace FaqWidget {
  /**
   * Instantiation options for the FAQ widget.
   */
  export
  interface IOptions {
    /**
     * A command linker instance.
     */
    linker: ICommandLinker;
  }
}
