
require(['jquery', '@jupyterlab/services'], function ($, services) {
  'use strict';
  var startNewKernel = services.Kernel.startNew;

  var kernelOptions = {
    name: 'python',
  };

  // start a single kernel for the page
  startNewKernel(kernelOptions).then(function (kernel) {
    console.log('Kernel started:', kernel);
    kernel.requestKernelInfo().then(function (reply) {
      var content = reply.content;
      $('#kernel-info').text(content.banner);
      console.log('Kernel info:', content);
    })
    $('#run').click(function () {
      var code = $('#cell').val();
      console.log('Executing:', code);
      // clear output
      $('#output').text('');
      // Execute and handle replies on the kernel.
      var future = kernel.requestExecute({ code: code });
      // record each IOPub message
      future.onIOPub = function (msg) {
        console.log('Got IOPub:', msg);
        $('#output').append(
          $('<pre>').text('msg_type: ' + msg.header.msg_type)
        );
        $('#output').append(
          $('<pre>').text(JSON.stringify(msg.content))
        );
      };

      future.onReply = function (reply) {
        console.log('Got execute reply');
      };

      future.onDone = function () {
        console.log('Future is fulfilled');
        $('#output').append($('<pre>').text('Done!'));
      };
    });
  });
});
