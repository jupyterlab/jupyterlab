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
        $('li.faqanswer').addClass('hide');
        $('li.faqquestion').click(function(){
          $(this).data('clicked', false).next().slideToggle(200).siblings('li.faqanswer').slideUp(200);

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
  widget.node.innerHTML = `
  <body>
    <section id="faqheader">
      <svg width="49px" height="49px" viewBox="0 0 49 49" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
          <!-- Generator: Sketch 3.8.3 (29802) - http://www.bohemiancoding.com/sketch -->
          <title>Group 2</title>
          <desc>Created with Sketch.</desc>
          <defs>
              <linearGradient x1="50%" y1="0%" x2="50%" y2="100%" id="linearGradient-1">
                  <stop stop-color="#90CAF9" offset="0%"></stop>
                  <stop stop-color="#2196F3" offset="100%"></stop>
              </linearGradient>
          </defs>
          <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
              <g id="JupyterLab---Main" transform="translate(-638.000000, -156.000000)">
                  <g id="FAQ-Window" transform="translate(321.000000, 4.000000)">
                      <g id="FAQ-Text-Normal" transform="translate(0.000000, 24.000000)">
                          <g id="Group-9" transform="translate(317.000000, 128.000000)">
                              <g id="Group-2">
                                  <path d="M24.5,49 C38.0309764,49 49,38.0309764 49,24.5 C49,10.9690236 38.0309764,0 24.5,0 C10.9690236,0 0,10.9690236 0,24.5 C0,38.0309764 10.9690236,49 24.5,49 Z" id="Oval-1" fill="url(#linearGradient-1)"></path>
                                  <path d="M26.2142159,38.4121298 C26.2142159,37.1812999 25.221611,36.188695 23.9510769,36.188695 C22.7202469,36.188695 21.7276421,37.1812999 21.7276421,38.4121298 C21.7276421,39.682664 22.7202469,40.6752688 23.9510769,40.6752688 C25.221611,40.6752688 26.2142159,39.682664 26.2142159,38.4121298 L26.2142159,38.4121298 Z M25.9759907,33.6476267 C25.9362865,32.0991632 26.2142159,30.5904039 26.8097788,29.2801655 C27.5244542,27.6919978 28.517059,26.7788014 29.5890722,25.865605 C30.8596064,24.7141834 32.3286615,23.4436492 32.9639286,21.0216935 C33.3609705,19.6320467 33.4006747,18.5203293 33.1624496,17.0909784 C32.844816,15.5028107 32.1698448,14.0337556 31.1772399,12.882334 C30.1846351,11.7309124 28.9538052,10.8971243 27.5244542,10.3809698 C26.4127368,9.98392791 25.420132,9.86481533 24.7848649,9.82511114 C24.4275272,9.78540694 23.2761056,9.74570275 21.8070505,10.1030405 C19.861545,10.619195 18.193969,11.651504 16.9234348,13.0808549 C15.6529006,14.5896143 14.8588168,16.4954155 14.7,18.4806251 L18.7895318,18.8776671 C18.8689402,18.1629916 19.1071654,16.7336407 20.060066,15.5028107 C21.7673463,13.3190801 24.387823,13.4778969 24.5069356,13.4778969 C25.1819069,13.5176011 26.8891871,13.7955304 28.0406087,15.2645855 C28.5567632,15.9395568 28.914101,16.813049 29.0729177,17.7659497 C29.2317345,18.6791461 29.2317345,19.2350048 28.9935094,20.108497 C28.6758758,21.4584396 27.9214961,22.173115 26.8494829,23.2451282 C25.618653,24.436254 24.1495978,25.1509295 23.0378805,27.5728852 C22.2040924,29.4389823 21.8070505,31.4638961 21.8467547,33.6476267 L25.9759907,33.6476267 Z" id="?" fill="#FFFFFF"></path>
                              </g>
                          </g>
                      </g>
                  </g>
              </g>
          </g>
      </svg>
        <h1 class="faqh1">
          <span class="short-faq">FAQ</span><span class="long-faq">Frequently Asked Questions</span>
        </h1>
    </section>
    <p>
      <section id="faqcontent" >
        <h2 class="faqh2">
          THE BASICS
        </h2>
        <ul class="faqul">
          <li class="faqquestion"> What is JupyterLab? </li>
          <li class="faqanswer"> JupyterLab allows users to arrange multiple jupyter notebooks, text editors, terminals, output areas, etc. on a single page with multiple panels and tabs into one application. The codebase and UI of JupyterLab is based on a flexible plugin system that makes it easy to extend with new components.</li>
          <li class="faqquestion"> What is a Jupyter Notebook? </li>
          <li class="faqanswer"> Central to the project is the Jupyter Notebook, a web-based platform that allows users to combine live code, equations, narrative text, visualizations, interactive dashboards and other media. Together these building blocks make science and data reproducible across over 40 programming languages and combine to form what we call a computational narrative.</li>
          <li class="faqquestion"> How stable is JupyterLab? </li>
          <li class="faqanswer"> JupyterLab is currently in a alpha release and not ready for public use as new features and bug fixes are being added very frequently. We strongly recommend to backup your work before using JupyterLab. However, testing, development, and user feedback are greatly appreciated. </li>
          <li class="faqquestion"> I’m confused with the interface. How do I navigate around JupyterLab? </li>
          <li class="faqanswer"> Checkout the Jupyter Lab tour (look in the help section). </li>
        </ul>
        <h2 class="faqh2">
          FEATURES
        </h2>
        <ul class="faqul">
          <li class="faqquestion"> How do I add more kernels/languages to JupyterLab? </li>
          <li class="faqanswer"> To add more languages to the JupyterLab you must install a new kernel. Installing a kernel is usually fairly simple and can be done with a couple terminal commands. However the instructions for installing kernels is different for each language. For further instructions, click this <a class="faqa" target="_blank" href="http://jupyter.readthedocs.io/en/latest/install-kernel.html">link</a>. </li>
          <li class="faqquestion"> How can I share my notebooks? </li>
          <li class="faqanswer"> You can either publish your notebooks on GitHub or use a free service such as <a class="faqa" target="_blank" href="https://nbviewer.jupyter.org/">nbviewer.org</a> to render your notebooks online. </li>
        </ul>
        <h2 class="faqh2">
        DEVELOPER
        </h2>
        <ul class="faqul">
        <li class="faqquestion"> How do I report a bug? </li>
        <li class="faqanswer"> You can open an issue on our <a class="faqa" target="_blank" href="https://github.com/jupyter/jupyterlab/issues">github repository</a>. Please check already opened issues before posting. </li>
        <li class="faqquestion"> I have security concerns about JupyterLab.</li>
        <li class="faqanswer"> If you have any inquiries, concerns, or thought you found a security vulnerability, please write to us at <a class="faqa" href="mailto:security@jupyter.org">security@jupyter.org</a>. We will do our best to respond to you promptly.  </li>
        <li class="faqquestion"> How can I contribute? </li>
        <li class="faqanswer"> There are many ways to contribute to JupyterLab. Whether you are an experienced python programmer or a newcomer, any interested developers are welcome. You can learn about the JupyterLab codebase by watching [Brian Granger’s Keynote] and [talk] at scipy 2016, as well as our tutorial walkthrough and documentation. Also, feel free to ask questions on our <a class="faqa" target="_blank" href="https://github.com/jupyter/jupyterlab">github</a> or through any of our <a class="faqa" target="_blank" href="http://jupyter.org/community.html">community resources</a>. </li>
        </ul>
    </section>
    </p>
  </body>
  `;
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
