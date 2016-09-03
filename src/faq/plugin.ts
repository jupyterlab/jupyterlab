// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  h, render
} from 'phosphor/lib/ui/vdom';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  ICommandPalette
} from '../commandpalette';


const basicsQuestions = [
  'What is JupyterLab?',
  'What is a Jupyter Notebook?',
  'How stable is JupyterLab?',
  'I\'m confused with the interface. How do I navigate around JupyterLab?'
];


const featuresQuestions = [
  'How do I add more kernels/languages to JupyterLab?',
  'How can I share my notebooks?'
];


const developerQuestions = [
  'How do I report a bug?',
  'I have security concerns about JupyterLab.',
  'How can I contribute?'
];


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
 * Activate the faq plugin.
 */
function activateFAQ(app: JupyterLab, palette: ICommandPalette): void {
  let widget = new Widget();
  let commandId = 'faq-jupyterlab:show';
  widget.id = 'faq-jupyterlab';
  widget.title.label = 'FAQ';
  widget.title.closable = true;

  // Create Frequently Asked Questions Header Section.
  let faqHeader =
  h.section({id: 'faq-header'},
    h.span({className: 'jp-QuestionMark jp-FAQ-QuestionMark'}),
    h.h1({className: 'jp-FAQ-h1'},
      h.span({className: 'jp-FAQ-title'},
        'Frequently Asked Questions'
      )
    )
  );

  // Create a section element that holds Table of Contents.
  let questionList =
  h.section({className: 'jp-FAQ-content', id: 'faq-questionList'},
    h.h2({className: 'jp-FAQ-h2'}, 'THE BASICS'),
    h.ul({className: 'jp-FAQ-ul'},
      h.li({className: 'jp-FAQ-question jp-FAQ-toc'}, basicsQuestions[0]),
      h.li({className: 'jp-FAQ-question jp-FAQ-toc'}, basicsQuestions[1]),
      h.li({className: 'jp-FAQ-question jp-FAQ-toc'}, basicsQuestions[2]),
      h.li({className: 'jp-FAQ-question jp-FAQ-toc'}, basicsQuestions[3])
    ),
    h.h2({className: 'jp-FAQ-h2'}, 'FEATURES'),
    h.ul({className: 'jp-FAQ-ul'},
      h.li({className: 'jp-FAQ-question jp-FAQ-toc'}, featuresQuestions[0]),
      h.li({className: 'jp-FAQ-question jp-FAQ-toc'}, featuresQuestions[1])
    ),
    h.h2({className: 'jp-FAQ-h2'}, 'DEVELOPER'),
    h.ul({className: 'jp-FAQ-ul'},
      h.li({className: 'jp-FAQ-question jp-FAQ-toc'}, developerQuestions[0]),
      h.li({className: 'jp-FAQ-question jp-FAQ-toc'}, developerQuestions[1]),
      h.li({className: 'jp-FAQ-question jp-FAQ-toc'}, developerQuestions[2])
    )
  );

  // Create a section element that all other FAQ Content will go under.
  let questionAnswerList =
  h.section({className: 'jp-FAQ-content'},
    h.h2({className: 'jp-FAQ-h2'}, 'THE BASICS'),
    // Create list of questions/answers under the Basics section.
    h.ul({className: 'jp-FAQ-ul'},
      h.li({className: 'jp-FAQ-question'}, basicsQuestions[0]),
      h.li({className: 'jp-FAQ-answer'},
        'JupyterLab allows users to arrange multiple Jupyter notebooks, '
        + 'text editors, terminals, output areas, etc. on a single page with multiple '
        + 'panels and tabs into one application. The codebase and UI of JupyterLab '
        + 'is based on a flexible plugin system that makes it easy to extend '
        + 'with new components.'
      ),
      h.li({className: 'jp-FAQ-question'}, basicsQuestions[1]),
      h.li({className: 'jp-FAQ-answer'},
        'Central to the project is the Jupyter Notebook, a web-based '
        + 'platform that allows users to combine live code, equations, narrative '
        + 'text, visualizations, interactive dashboards and other media. Together '
        + 'these building blocks make science and data reproducible across over '
        + '40 programming languages and combine to form what we call a computational '
        + 'narrative.'
      ),
      h.li({className: 'jp-FAQ-question'}, basicsQuestions[2]),
      h.li({className: 'jp-FAQ-answer'},
        'JupyterLab is currently in a alpha release and not ready for public use '
        + 'as new features and bug fixes are being added very frequently. We strongly '
        + 'recommend to backup your work before using JupyterLab. However, testing, '
        + 'development, and user feedback are greatly appreciated.'
      ),
      h.li({className: 'jp-FAQ-question'}, basicsQuestions[3]),
      h.li({className: 'jp-FAQ-answer'},
        'Check out the JupyterLab tour ',
        h.a({className: 'jp-FAQ-a',
             onclick: () => {
               app.commands.execute('about-jupyterlab:show', void 0);
             }},
          'here'
        )
      )
    ),
    h.h2({className: 'jp-FAQ-h2'}, 'FEATURES'),
    // Create list of questions/answers under the Features section.
    h.ul({className: 'jp-FAQ-ul'},
      h.li({className: 'jp-FAQ-question'}, featuresQuestions[0]),
      h.li({className: 'jp-FAQ-answer'},
        'To add more languages to the JupyterLab you must install '
        + 'a new kernel. Installing a kernel is usually fairly simple and can be '
        + 'done with a couple terminal commands. However the instructions for installing '
        + 'kernels is different for each language. For further instructions, click ',
        h.a({className: 'jp-FAQ-a',
             href: 'http://jupyter.readthedocs.io/en/latest/install-kernel.html',
             target: '_blank'},
          'this'
        ),
        ' link.'
      ),
      h.li({className: 'jp-FAQ-question'}, featuresQuestions[1]),
      h.li({className: 'jp-FAQ-answer'},
        'You can either publish your notebooks on GitHub or use a free service such as ',
        h.a({className: 'jp-FAQ-a', href: 'https://nbviewer.jupyter.org/', target: '_blank'},
          'nbviewer.org'
        ),
        ' to render your notebooks online.'
      )
    ),
    h.h2({className: 'jp-FAQ-h2'}, 'DEVELOPER'),
    // Create list of questions/answers under the Developer section.
    h.ul({className: 'jp-FAQ-ul'},
      h.li({className: 'jp-FAQ-question'}, developerQuestions[0]),
      h.li({className: 'jp-FAQ-question'}, developerQuestions[1]),
      h.li({className: 'jp-FAQ-question'}, developerQuestions[2]),

    )
  );

  // Append the Table of Contents and questions/answers.
  let paragraph = h.p(questionList, questionAnswerList);

  render([faqHeader, paragraph], widget.node);
  widget.node.style.overflowY = 'auto';

  app.commands.addCommand(commandId, {
    label: 'Frequently Asked Questions',
    execute: () => {
      if (!widget.isAttached) {
        app.shell.addToMainArea(widget);
      } else {
        app.shell.activateMain(widget.id);
      }
    }
  });

  palette.addItem({ command: commandId, category: 'Help' });
}



//OLD STUFF remove plz
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  VNode, h, render
} from 'phosphor/lib/ui/vdom';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  ICommandPalette
} from '../commandpalette';


const basicsQuestions = [
  'What is JupyterLab?',
  'What is a Jupyter Notebook?',
  'How stable is JupyterLab?',
  'I\'m confused with the interface. How do I navigate around JupyterLab?'
];


const featuresQuestions = [
  'How do I add more kernels/languages to JupyterLab?',
  'How can I share my notebooks?'
];


const developerQuestions = [
  'How do I report a bug?',
  'I have security concerns about JupyterLab.',
  'How can I contribute?'
];

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


// /**
//  * A widget that displays FAQ information.
//  */
// class FAQWidget extends Widget {
//   /**
//    * A handler for `after-attach` messages.
//    */
//   protected onAfterAttach(msg: Message): void {
//     let answerNodeList = this.node.querySelectorAll('li.jp-FAQ-answer');
//     let answerArray = Array.prototype.slice.call(answerNodeList);
//     for (let answerElement of answerArray) {
//       answerElement.className += ' jp-FAQ-hide';
//     }
//     $('li.jp-FAQ-question').click(function(){
//       $(this).data('clicked', false).next().slideToggle(200)
//       .siblings('li.jp-FAQ-answer').slideUp(200);
//     });
//   }
// }


/**
 * Activate the faq plugin.
 */
function activateFAQ(app: JupyterLab, palette: ICommandPalette): void {
  let widget = new Widget();
  let commandId = 'faq-jupyterlab:show';
  widget.id = 'faq-jupyterlab';
  widget.title.label = 'FAQ';
  widget.title.closable = true;
  let domTree: VNode[] = [];
  let subSection: VNode[] = [];

  // Create Frequently Asked Questions Header Section.
  let questionIcon = h.span({className: 'jp-QuestionMark jp-FAQ-QuestionMark'});
  let faqTitle = h.h1({className: 'jp-FAQ-h1'},
                   h.span({className: 'jp-FAQ-title'},
                     'Frequently Asked Questions'
                   )
                 );
  let faqHeader = h.section({id: 'faq-header'}, questionIcon, faqTitle);
  domTree.push(faqHeader);

  // Create Basics Section.
  let basicsQAList: VNode[] = [];
  let basicsHeading = h.h2({className: 'jp-FAQ-h2'}, 'THE BASICS');
  subSection.push(basicsHeading);

  // Create list of questions/answers under the Basics section.
  let basicsQ1 = h.li({className: 'jp-FAQ-question'}, basicsQuestions[0]);
  let basicsQ1Ans = h.li({className: 'jp-FAQ-answer'},
    'JupyterLab allows users to arrange multiple Jupyter notebooks, '
    + 'text editors, terminals, output areas, etc. on a single page with multiple panels '
    + 'and tabs into one application. The codebase and UI of JupyterLab is based on a flexible '
    + 'plugin system that makes it easy to extend with new components.');
  basicsQAList.push(basicsQ1, basicsQ1Ans);
  let basicsQ2 = h.li({className: 'jp-FAQ-question'}, basicsQuestions[1]);
  let basicsQ2Ans = h.li({className: 'jp-FAQ-answer'},
    'Central to the project is the Jupyter Notebook, a web-based '
    + 'platform that allows users to combine live code, equations, narrative text, '
    + 'visualizations, interactive dashboards and other media. Together these building '
    + 'blocks make science and data reproducible across over 40 programming languages and'
    + 'combine to form what we call a computational narrative.');
  basicsQAList.push(basicsQ2, basicsQ2Ans);
  let basicsQ3 = h.li({className: 'jp-FAQ-question'}, basicsQuestions[2]);
  let basicsQ3Ans = h.li({className: 'jp-FAQ-answer'},
    'JupyterLab is currently in a alpha release and not ready '
    + 'for public use as new features and bug fixes are being added very frequently. '
    + 'We strongly recommend to backup your work before using JupyterLab. However, '
    + 'testing, development, and user feedback are greatly appreciated.');
  basicsQAList.push(basicsQ3, basicsQ3Ans);
  let basicsQ4 = h.li({className: 'jp-FAQ-question'}, basicsQuestions[3]);
  let basicsQ4Ans = h.li({className: 'jp-FAQ-answer'},
                      'Check out the JupyterLab tour ',
                      h.a({className: 'jp-FAQ-a',
                           onclick: () => {
                             app.commands.execute('about-jupyterlab:show', void 0);
                           }},
                        'here')
                    );
  basicsQAList.push(basicsQ4, basicsQ4Ans);

  // Add list of questiions/answers to an unordered list.
  let basicsQA = h.ul({className: 'jp-FAQ-ul'}, basicsQAList);
  subSection.push(basicsQA);

  // Create Features Section.
  let featuresQAList: VNode[] = [];
  let featuresHeading = h.h2({className: 'jp-FAQ-h2'}, 'FEATURES');
  subSection.push(featuresHeading);

  // Create list of questions/answers under the Features section.
  let featuresQ1 = h.li({className: 'jp-FAQ-question'}, featuresQuestions[0]);
  let featuresQ1Ans = h.li({className: 'jp-FAQ-answer'},
    'To add more languages to the JupyterLab you must install '
    + 'a new kernel. Installing a kernel is usually fairly simple and can be done '
    + 'with a couple terminal commands. However the instructions for installing kernels '
    + 'is different for each language. For further instructions, click ',
    h.a({className: 'jp-FAQ-a', href: 'http://jupyter.readthedocs.io/en/latest/install-kernel.html',
         target: '_blank'},
      'this'),
    ' link.'
  );
  featuresQAList.push(featuresQ1, featuresQ1Ans);
  let featuresQ2 = h.li({className: 'jp-FAQ-question'}, featuresQuestions[1]);
  let featuresQ2Ans = h.li({className: 'jp-FAQ-answer'},
    'You can either publish your notebooks on GitHub or use a free service such as ',
    h.a({className: 'jp-FAQ-a', href: 'https://nbviewer.jupyter.org/', target: '_blank'},
      'nbviewer.org'),
    ' to render your notebooks online.'
  );
  featuresQAList.push(featuresQ2, featuresQ2Ans);

  // Add list of questiions/answers to an unordered list.
  let featuresQA = h.ul({className: 'jp-FAQ-ul'}, featuresQAList);
  subSection.push(featuresQA);

  // Create Developer section.
  let developerQAList: VNode[] = [];
  let developerHeading = h.h2({className: 'jp-FAQ-h2'}, 'DEVELOPER');
  subSection.push(developerHeading);

  // Create list of questions/answers under the Developer section.
  let developerQ1 = h.li({className: 'jp-FAQ-question'}, developerQuestions[0]);
  let developerQ1Ans = h.li({className: 'jp-FAQ-answer'},
    'You can open an issue on our ',
    h.a({className: 'jp-FAQ-a', href: 'https://github.com/jupyter/jupyterlab/issues',
    target: '_blank'},
      'github repository'),
    '. Please check already opened issues before posting.'
  );
  developerQAList.push(developerQ1, developerQ1Ans);
  let developerQ2 = h.li({className: 'jp-FAQ-question'}, developerQuestions[1]);
  let developerQ2Ans = h.li({className: 'jp-FAQ-answer'},
    'If you have any inquiries, concerns, or thought you found a security vulnerability,'
    + ' please write to use at ',
    h.a({className: 'jp-FAQ-a', href: 'mailto:security@jupyter.org'},
      'security@jupyter.org'),
  '. We will do our best to respond to you promptly.'
  );
  developerQAList.push(developerQ2, developerQ2Ans);
  let developerQ3 = h.li({className: 'jp-FAQ-question'}, developerQuestions[2]);
  let developerQ3Ans = h.li({className: 'jp-FAQ-answer'},
    'There are many ways to contribute to JupyterLab. '
    + 'Whether you are an experienced python programmer or a newcomer, any interested '
    + 'developers are welcome. You can learn about the JupyterLab codebase by going through our ',
    h.a({className: 'jp-FAQ-a', href: 'http://jupyterlab-tutorial.readthedocs.io/en/latest/index.html',
    target: '_blank'},
      'tutorial walkthrough'),
    ' and ',
    h.a({className: 'jp-FAQ-a', href: 'http://jupyter.org/jupyterlab/', target: '_blank'},
      'documentation'),
    '. Also, feel free to ask questions on our ',
    h.a({className: 'jp-FAQ-a', href: 'https://github.com/jupyter/jupyterlab', target: '_blank'},
      'github'),
    ' or through any of our ',
    h.a({className: 'jp-FAQ-a', href: 'http://jupyter.org/community.html', target: '_blank'},
      'community resources'),
    '.'
  );
  developerQAList.push(developerQ3, developerQ3Ans);

  // Add list of questiions/answers to an unordered list.
  let developerQA = h.ul({className: 'jp-FAQ-h2'}, developerQAList);
  subSection.push(developerQA);

  // Create a section element that all other FAQ Content will go under.
  let faqContent = h.section({id: 'faq-content'}, subSection);
  let paragraph = h.p(faqContent);
  domTree.push(paragraph);

  render(domTree, widget.node);
  widget.node.style.overflowY = 'auto';

  app.commands.addCommand(commandId, {
    label: 'Frequently Asked Questions',
    execute: () => {
      if (!widget.isAttached) {
        app.shell.addToMainArea(widget);
      } else {
        app.shell.activateMain(widget.id);
      }
    }
  });


  palette.addItem({ command: commandId, category: 'Help' });
}
