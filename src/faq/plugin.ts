// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Application
} from 'phosphide/lib/core/application';

import {
  Widget
} from 'phosphor-widget';
import {
  Message
} from 'phosphor-messaging';
import {
  WidgetTracker
} from '../widgettracker';

import {
  TabPanel
} from 'phosphor-tabs';

import $ = require('jquery');

/**
 * The faq page extension.
 */
export
const faqExtension = {
  id: 'jupyter.extensions.FAQ',
  activate: activateFAQ
};

var hasBeenAttatched = false;

class FAQWidget extends Widget{
  protected onAfterAttach(msg: Message): void {
    if (!hasBeenAttatched) {
      $(document).ready(function() {
        $('li.jp-FAQ-answer').addClass('jp-FAQ-hide');
        $('li.jp-FAQ-question').click(function(){
          $(this).data('clicked', false).next().slideToggle(200).siblings('li.jp-FAQ-answer').slideUp(200);
        })
      });
      hasBeenAttatched = true;
    }
  }
}

function activateFAQ(app: Application): void {
  let widget = new FAQWidget();
  let commandId = 'faq-jupyterlab:show';
  widget.id = 'faq-jupyterlab';
  widget.title.text = 'FAQ';
  widget.title.closable = true;

  // Create Frequently Asked Questions Header Section.
  let faq = document.createElement('section');
  faq.id = 'faq-header';
  widget.node.appendChild(faq);

  let questionIcon = document.createElement('span');
  questionIcon.className = 'jp-QuestionMark jp-FAQ-QuestionMark';
  faq.appendChild(questionIcon);

  let faqHeader = document.createElement('h1');
  faqHeader.className = 'jp-FAQ-h1';
  let faqTitle = document.createElement('span');
  faqTitle.className = 'jp-FAQ-title';
  faqTitle.textContent = 'Frequently Asked Questions';
  faq.appendChild(faqHeader);
  faqHeader.appendChild(faqTitle);

  let paragraph = document.createElement('p');
  widget.node.appendChild(paragraph);

  // Create a section element that all other FAQ Content will go under.
  let faqContent = document.createElement('section');
  faqContent.id = 'faq-content';
  paragraph.appendChild(faqContent);

  // Create Basics section.
  let basicsHeading = document.createElement('h2');
  basicsHeading.className = 'jp-FAQ-h2';
  basicsHeading.textContent = 'THE BASICS';
  faqContent.appendChild(basicsHeading);

  // Create unordered list of questions/answers under the Basics section.
  let basicsQA = document.createElement('ul');
  basicsQA.className = 'jp-FAQ-ul';
  let basicsQ1 = document.createElement('li');
  basicsQ1.className = 'jp-FAQ-question';
  basicsQ1.textContent = 'What is JupyterLab?';
  let basicsQ1Ans = document.createElement('li');
  basicsQ1Ans.className = 'jp-FAQ-answer';
  basicsQ1Ans.textContent = 'JupyterLab allows users to arrange multiple jupyter notebooks, '
   + 'text editors, terminals, output areas, etc. on a single page with multiple panels '
   + 'and tabs into one application. The codebase and UI of JupyterLab is based on a flexible '
   + 'plugin system that makes it easy to extend with new components.';
  faqContent.appendChild(basicsQA);
  basicsQA.appendChild(basicsQ1);
  basicsQA.appendChild(basicsQ1Ans);

  let basicsQ2 = document.createElement('li');
  basicsQ2.className = 'jp-FAQ-question';
  basicsQ2.textContent = 'What is a Jupyter Notebook?';
  let basicsQ2Ans = document.createElement('li');
  basicsQ2Ans.className = 'jp-FAQ-answer';
  basicsQ2Ans.textContent = 'Central to the project is the Jupyter Notebook, a web-based '
   + 'platform that allows users to combine live code, equations, narrative text, '
   + 'visualizations, interactive dashboards and other media. Together these building '
   + 'blocks make science and data reproducible across over 40 programming languages and'
   + 'combine to form what we call a computational narrative.';
  basicsQA.appendChild(basicsQ2);
  basicsQA.appendChild(basicsQ2Ans);

  let basicsQ3 = document.createElement('li');
  basicsQ3.className = 'jp-FAQ-question';
  basicsQ3.textContent = 'How stable is JupyterLab?';
  let basicsQ3Ans = document.createElement('li');
  basicsQ3Ans.className = 'jp-FAQ-answer';
  basicsQ3Ans.textContent = 'JupyterLab is currently in a alpha release and not ready '
   + 'for public use as new features and bug fixes are being added very frequently. '
   + 'We strongly recommend to backup your work before using JupyterLab. However, '
   + 'testing, development, and user feedback are greatly appreciated.';
  basicsQA.appendChild(basicsQ3);
  basicsQA.appendChild(basicsQ3Ans);

  let basicsQ4 = document.createElement('li');
  basicsQ4.className = 'jp-FAQ-question';
  basicsQ4.textContent = 'I’m confused with the interface. How do I navigate around JupyterLab?';
  let basicsQ4Ans = document.createElement('li');
  basicsQ4Ans.className = 'jp-FAQ-answer';
  basicsQ4Ans.textContent = 'Checkout the Jupyter Lab tour ';
  basicsQA.appendChild(basicsQ4);
  basicsQA.appendChild(basicsQ4Ans);

  // Create a 'button' that opens the tour page.
  let tourButton = document.createElement('a');
  tourButton.className = 'jp-FAQ-a';
  let tourButtonText = document.createTextNode('here');
  tourButton.appendChild(tourButtonText);
  tourButton.addEventListener('click', () => {
    app.commands.execute('about-jupyterlab:show');
  });

  // Finish the rest of the answer.
  let basicsQ4AnsLeft = document.createTextNode('!');
  basicsQ4Ans.appendChild(tourButton);
  basicsQ4Ans.appendChild(basicsQ4AnsLeft);

  // Create Features section.
  let featuresHeading = document.createElement('h2');
  featuresHeading.className = 'jp-FAQ-h2';
  featuresHeading.textContent = 'FEATURES';
  faqContent.appendChild(featuresHeading);

  // Create unordered list of questions/answers under the Features section.
  let featuresQA = document.createElement('ul');
  featuresQA.className = 'jp-FAQ-ul';
  let featuresQ1 = document.createElement('li');
  featuresQ1.className = 'jp-FAQ-question';
  featuresQ1.textContent = 'How do I add more kernels/languages to JupyterLab?';
  let featuresQ1Ans = document.createElement('li');
  featuresQ1Ans.className = 'jp-FAQ-answer';
  featuresQ1Ans.textContent = 'To add more languages to the JupyterLab you must install '
   + 'a new kernel. Installing a kernel is usually fairly simple and can be done '
   + 'with a couple terminal commands. However the instructions for installing kernels '
   + 'is different for each language. For further instructions, click ';

  // Create a link to how to install more kernels.
  let kernelLink = document.createElement('a');
  kernelLink.className = 'jp-FAQ-a';
  let kernelLinkText = document.createTextNode('this');
  kernelLink.appendChild(kernelLinkText);
  kernelLink.href = 'http://jupyter.readthedocs.io/en/latest/install-kernel.html';
  kernelLink.target = '_blank';
  featuresQ1Ans.appendChild(kernelLink);

  let featuresQ1AnsLeft = document.createTextNode(' link');
  featuresQ1Ans.appendChild(featuresQ1AnsLeft);
  faqContent.appendChild(featuresQA);
  featuresQA.appendChild(featuresQ1);
  featuresQA.appendChild(featuresQ1Ans);

  let featuresQ2 = document.createElement('li');
  featuresQ2.className = 'jp-FAQ-question';
  featuresQ2.textContent = 'How can I share my notebooks?';
  let featuresQ2Ans = document.createElement('li');
  featuresQ2Ans.className = 'jp-FAQ-answer';
  featuresQ2Ans.textContent = 'You can either publish your notebooks on GitHub or use a '
   + 'free service such as ';

  // Create a link to NBViewer.
  let nbViewerLink = document.createElement('a');
  nbViewerLink.className = 'jp-FAQ-a';
  let nbViewerLinkText = document.createTextNode('nbviewer.org');
  nbViewerLink.appendChild(nbViewerLinkText);
  nbViewerLink.href = 'https://nbviewer.jupyter.org/';
  nbViewerLink.target = '_blank';
  featuresQ2Ans.appendChild(nbViewerLink);

  let featuresQ2AnsLeft = document.createTextNode(' to render your notebooks online.');
  featuresQ2Ans.appendChild(featuresQ2AnsLeft);
  featuresQA.appendChild(featuresQ2);
  featuresQA.appendChild(featuresQ2Ans);

  // Create Developer section.
  let developerHeading = document.createElement('h2');
  developerHeading.className = 'jp-FAQ-h2';
  developerHeading.textContent = 'DEVELOPER';
  faqContent.appendChild(developerHeading);

  // Create unordered list of questions/answers under the Developer section.
  let developerQA = document.createElement('ul');
  developerQA.className = 'jp-FAQ-ul';
  let developerQ1 = document.createElement('li');
  developerQ1.className = 'jp-FAQ-question';
  developerQ1.textContent = 'How do I report a bug?';
  let developerQ1Ans = document.createElement('li');
  developerQ1Ans.className = 'jp-FAQ-answer';
  developerQ1Ans.textContent = 'You can open an issue on our ';

  // Create a link to JupyterLab github issues.
  let issuesLink = document.createElement('a');
  issuesLink.className = 'jp-FAQ-a';
  let issuesLinkText = document.createTextNode('github repository');
  issuesLink.appendChild(issuesLinkText);
  issuesLink.href = 'https://github.com/jupyter/jupyterlab/issues';
  issuesLink.target = '_blank';
  developerQ1Ans.appendChild(issuesLink);

  let developerQ1AnsLeft = document.createTextNode('. Please check already opened issues '
   + 'before posting.');
  developerQ1Ans.appendChild(developerQ1AnsLeft);
  faqContent.appendChild(developerQA);
  developerQA.appendChild(developerQ1);
  developerQA.appendChild(developerQ1Ans);

  let developerQ2 = document.createElement('li');
  developerQ2.className = 'jp-FAQ-question';
  developerQ2.textContent = 'I have security concerns about JupyterLab.';
  let developerQ2Ans = document.createElement('li');
  developerQ2Ans.className = 'jp-FAQ-answer';
  developerQ2Ans.textContent = 'If you have any inquiries, concerns, or thought you found '
   + 'a security vulnerability, please write to us at ';

  // Create email address link for security concerns.
  let securityMailLink = document.createElement('a');
  securityMailLink.className = 'jp-FAQ-a';
  let securityMailLinkText = document.createTextNode('security@jupyter.org');
  securityMailLink.appendChild(securityMailLinkText);
  securityMailLink.href = 'mailto:security@jupyter.org';
  developerQ2Ans.appendChild(securityMailLink);

  // Finish the rest of the answer.
  let developerQ2AnsLeft = document.createTextNode('. We will do our best to respond to you promptly.');
  developerQ2Ans.appendChild(developerQ2AnsLeft);
  developerQA.appendChild(developerQ2);
  developerQA.appendChild(developerQ2Ans);

  let developerQ3 = document.createElement('li');
  developerQ3.className = 'jp-FAQ-question';
  developerQ3.textContent = 'How can I contribute?';
  let developerQ3Ans = document.createElement('li');
  developerQ3Ans.className = 'jp-FAQ-answer';
  developerQ3Ans.textContent = 'There are many ways to contribute to JupyterLab. '
   + 'Whether you are an experienced python programmer or a newcomer, any interested '
   + 'developers are welcome. You can learn about the JupyterLab codebase by going through our ';

  // Create a link to JupyterLab tutorial documentation.
  let tutorialLink = document.createElement('a');
  tutorialLink.className = 'jp-FAQ-a';
  let tutorialLinkText = document.createTextNode('tutorial walkthrough');
  tutorialLink.appendChild(tutorialLinkText);
  tutorialLink.href = 'http://jupyterlab-tutorial.readthedocs.io/en/latest/index.html';
  tutorialLink.target = '_blank';
  developerQ3Ans.appendChild(tutorialLink);

  // Finish the rest of the answer.
  let developerQ3AnsPart1 = document.createTextNode(' and ');
  developerQ3Ans.appendChild(developerQ3AnsPart1);

  let documentationLink = document.createElement('a');
  documentationLink.className = 'jp-FAQ-a';
  let documentationLinkText = document.createTextNode('documentation');
  documentationLink.appendChild(documentationLinkText);
  documentationLink.href = 'http://jupyter.org/jupyterlab/';
  documentationLink.target = '_blank';
  developerQ3Ans.appendChild(documentationLink);

  let developerQ3AnsPart2 = document.createTextNode('. Also, feel free to ask questions on our ');
  developerQ3Ans.appendChild(developerQ3AnsPart2);

  // Create a link to JupyterLab github repository.
  let githubLink = document.createElement('a');
  githubLink.className = 'jp-FAQ-a';
  let githubLinkText = document.createTextNode('github');
  githubLink.appendChild(githubLinkText);
  githubLink.href = 'https://github.com/jupyter/jupyterlab';
  githubLink.target = '_blank';
  developerQ3Ans.appendChild(githubLink);

  let developerQ3AnsPart3 = document.createTextNode(' or through any of our ');
  developerQ3Ans.appendChild(developerQ3AnsPart3);

  // Create a link to Jupyter community help resources.
  let communityLink = document.createElement('a');
  communityLink.className = 'jp-FAQ-a';
  let communityLinkText = document.createTextNode('community resources');
  communityLink.appendChild(communityLinkText);
  communityLink.href = 'http://jupyter.org/community.html';
  communityLink.target = '_blank';
  developerQ3Ans.appendChild(communityLink);

  let developerQ3AnsPart4 = document.createTextNode('.');
  developerQ3Ans.appendChild(developerQ3AnsPart4);
  developerQA.appendChild(developerQ3);
  developerQA.appendChild(developerQ3Ans);
  widget.node.style.overflowY = 'auto';

  let tracker = new WidgetTracker<FAQWidget>();
  let activeFAQ: FAQWidget;
  tracker.activeWidgetChanged.connect((sender, widget) => {
    activeFAQ = widget;
  });

  app.commands.add([{
    id: commandId,
    handler: () => {
      if (!widget.isAttached) app.shell.addToMainArea(widget);
      let stack = widget.parent;
      if (!stack) {
        return;
      }
      let tabs = stack.parent;
      if (tabs instanceof TabPanel) {
        tabs.currentWidget = widget;
      }
    }
  }]);

  app.palette.add([{
    command: commandId,
    text: 'FAQ',
    category: 'Help',
    caption: 'Frequently Asked Questions'
  }]);
}
