/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

require(['jquery', '@jupyterlab/services'], function($, services) {
  /* eslint-disable no-console */
  console.log('Starting example');
  const kernelManager = new services.KernelManager();

  const kernelOptions = {
    name: 'python'
  };

  // start a single kernel for the page
  kernelManager.startNew(kernelOptions).then(function(kernel) {
    console.log('Kernel started:', kernel);
    const waitForIdle = (_, status) => {
      if( status === 'idle' ) {
        kernel.statusChanged.disconnect(waitForIdle)
        kernel.requestKernelInfo().then(function(reply) {
          const content = reply.content;
          $('#kernel-info').text(content.banner);
          console.log('Kernel info:', content);
          console.log('Example started!');
        });
      }
    };

    kernel.statusChanged.connect(waitForIdle);

    $('#run').click(function() {
      const code = $('#cell').val();
      console.log('Executing:', code);
      // clear output
      $('#output').text('');
      // Execute and handle replies on the kernel.
      const future = kernel.requestExecute({ code: code });
      // record each IOPub message
      future.onIOPub = function(msg) {
        console.log('Got IOPub:', msg);
        $('#output').append(
          $('<pre>').text('msg_type: ' + msg.header.msg_type)
        );
        $('#output').append($('<pre>').text(JSON.stringify(msg.content)));
      };

      future.onReply = function(reply) {
        console.log('Got execute reply', reply);
      };

      future.done.then(function() {
        console.log('Future is fulfilled');
        $('#output').append($('<pre>').text('Done!'));
      });
    });
  });
});
