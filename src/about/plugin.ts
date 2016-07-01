// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import 'jQuery';
import 'fullpage.js'; 
import 'fullpage.js/jquery.fullPage.css';

const url = require('./about_page.html');
let options = { controlArrows: true };
jQuery('about-jupyterlab').fullpage(options);

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
   let iframe = document.createElement('iframe');
   let commandId = 'about-jupyterlab:show';
   widget.id = 'about-jupyterlab';
   widget.title.text = 'About';
   widget.title.closable = true;
   widget.addClass('fullPage-about-class');
   widget.node.appendChild(iframe);
   iframe.src = url as string;
   iframe.height = '100%';
   iframe.width = '100%';
   widget.node.style.overflowY = 'auto';
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
 }
