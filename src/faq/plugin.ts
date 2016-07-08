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

import 'jquery';
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
        <svg class="faqsvg" width="40px" height="40px" viewBox="0 0 40 40" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" >
            <!-- Generator: Sketch 3.8.3 (29802) - http://www.bohemiancoding.com/sketch -->
            <title>Group 2</title>
            <desc>Created with Sketch.</desc>
            <defs>
                <linearGradient x1="50%" y1="0%" x2="50%" y2="100%" id="linearGradient-1">
                    <stop stop-color="#FCAD3C" offset="0%"></stop>
                    <stop stop-color="#F4770A" offset="100%"></stop>
                </linearGradient>
                <path d="M20,40 C31.045695,40 40,31.045695 40,20 C40,8.954305 31.045695,0 20,0 C8.954305,0 0,8.954305 0,20 C0,31.045695 8.954305,40 20,40 Z" id="path-2"></path>
            </defs>
            <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                <g id="Artboard-1" transform="translate(-83.000000, -167.000000)">
                    <g id="Group-2" transform="translate(83.000000, 167.000000)">
                        <g id="Oval-1">
                            <use fill="#FCAE3E" xlink:href="#path-2"></use>
                            <use fill="url(#linearGradient-1)" xlink:href="#path-2"></use>
                        </g>
                        <path d="M21.3993599,31.3568407 C21.3993599,30.3520815 20.5890702,29.5417919 19.5518995,29.5417919 C18.5471403,29.5417919 17.7368507,30.3520815 17.7368507,31.3568407 C17.7368507,32.3940114 18.5471403,33.2043011 19.5518995,33.2043011 C20.5890702,33.2043011 21.3993599,32.3940114 21.3993599,31.3568407 L21.3993599,31.3568407 Z M21.2048904,27.4674504 C21.1724788,26.2033985 21.3993599,24.9717583 21.8855337,23.9021759 C22.4689422,22.6057125 23.2792319,21.860246 24.1543447,21.1147796 C25.1915154,20.1748436 26.3907441,19.1376728 26.9093295,17.1605661 C27.2334453,16.0261606 27.2658569,15.1186362 27.0713874,13.9518191 C26.8120947,12.6553557 26.2610978,11.456127 25.4508081,10.516191 C24.6405185,9.57625501 23.6357593,8.8956117 22.4689422,8.47426109 C21.5614178,8.15014523 20.7511282,8.05291047 20.2325428,8.02049889 C19.9408385,7.9880873 19.0009025,7.95567572 17.8016739,8.24737999 C16.2135062,8.6687306 14.8522196,9.51143183 13.8150488,10.6782489 C12.7778781,11.9098892 12.1296463,13.4656453 12,15.0862246 L15.3383933,15.4103405 C15.4032165,14.8269319 15.597686,13.6601148 16.3755641,12.6553557 C17.7692623,10.8727184 19.9084269,11.0023648 20.0056617,11.0023648 C20.5566587,11.0347764 21.9503568,11.2616575 22.8902928,12.4608861 C23.3116435,13.0118831 23.6033477,13.724938 23.7329941,14.5028161 C23.8626404,15.2482825 23.8626404,15.7020447 23.6681709,16.4150996 C23.4088782,17.5170935 22.7930581,18.1005021 21.9179453,18.9756149 C20.9131861,19.9479625 19.7139574,20.531371 18.806433,22.5084778 C18.1257897,24.0318223 17.8016739,25.6848132 17.8340854,27.4674504 L21.2048904,27.4674504 Z" id="?" fill="#FFFFFF"></path>
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
          <li class="faqanswer"> Central to the project is the Jupyter Notebook, a web-based platform that allows users to combine live code, equations, narrative text, visualizations, interactive dashboards and other media. Together these building blocks make science and data reproducible across over 40 programming languages and combine to form what we call a computational narrative. </li>
          <li class="faqquestion"> How is JupyterLab different from the Jupyter Notebook? </li>
          <li class="faqanswer"> JupyterLab allows users to arrange multiple jupyter notebooks, text editors, terminals, output areas, etc. on a single page with multiple panels and tabs into one application. The codebase and UI of JupyterLab is based on a flexible plugin system that makes it easy to extend with new components.
          </li>
        </ul>
        <h2 class="faqh2">
          FEATURES
        </h2>
        <ul class="faqul">
          <li class="faqquestion"> How do I add more kernels/languages to JupyterLab? </li>
          <li class="faqanswer"> To add more languages to the JupyterLab you must install a new kernel. Installing a kernel is usually fairly simple and can be done with a couple terminal commands. For further instructions, click this <a class="faqa" target="_blank" href="https://ipython.readthedocs.io/en/latest/install/kernel_install.html">link</a>. </li>
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
      app.shell.activateMain(widget.id);
      tracker.addWidget(widget);
    }
  }]);

  app.palette.add([{
    command: commandId,
    text: 'FAQ',
    category: 'Help',
    caption: 'Frequently Asked Questions'
  }]);
}
