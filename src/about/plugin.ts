// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import 'jQuery';
import 'fullpage.js'; 
import 'fullpage.js/jquery.fullPage.css';

// const url = require('./about_page.html');
let options = { controlArrows: true };

import {
  Application
} from 'phosphide/lib/core/application';

import {
  Widget
} from 'phosphor-widget';


/**
 * The about page extension.
 */
 export
 const aboutExtension = {
   id: 'jupyter.extensions.about',
   activate: activateAbout
 };


 function activateAbout(app: Application): void {
   let widget = new Widget();
   // let iframe = document.createElement('iframe');
   let commandId = 'about-jupyterlab:show';
   widget.id = 'about-jupyterlab';
   widget.title.text = 'About';
   widget.title.closable = true;
   widget.addClass('fullPage-about-class');
   widget.node.innerHTML = `
   <div id="fullpage-about-jupyterlab">
   <div class="section active" id="section0"><h1>fullPage.js</h1></div>
   <div class="section" id="section1">
   <div class="slide "><h1>Simple Demo</h1></div>
   <div class="slide active"><h1>Only text</h1></div>
   <div class="slide"><h1>And text</h1></div>
   <div class="slide"><h1>And more text</h1></div>
   </div>
   <div class="section" id="section2"><h1>No wraps, no extra markup</h1></div>
   <div class="section" id="section3"><h1>Just the simplest demo ever</h1></div>
   </div>
   `;
   // widget.node.appendChild(iframe);
   // iframe.src = url as string;
   // iframe.height = '100%';
   // iframe.width = '100%';
   // widget.node.style.overflowY = 'auto';
   app.commands.add([{
     id: commandId,
     handler: () => {
       if (!widget.isAttached) app.shell.addToMainArea(widget);
       app.shell.activateMain(widget.id);
     }
   }]);

   app.palette.add([{
     command: commandId,
     text: 'About JupyterLab',
     category: 'Help'
   }]);

   app.shell.addToMainArea(widget);
   console.log(jQuery('div.p-Widget').length);
   jQuery('#fullpage-about-jupyterlab').fullpage(options);
 }
