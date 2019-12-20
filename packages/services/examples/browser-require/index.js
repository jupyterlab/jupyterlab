require(['jquery', '@jupyterlab/services'], function($, services) {
  /* eslint-disable no-console */
  console.log('Starting example');
  var kernelManager = new services.KernelManager();

  var kernelOptions = {
    name: 'python'
  };

  // start a single kernel for the page
  kernelManager.startNew(kernelOptions).then(function(kernel) {
    console.log('Kernel started:', kernel);
    kernel.requestKernelInfo().then(function(reply) {
      var content = reply.content;
      $('#kernel-info').text(content.banner);
      console.log('Kernel info:', content);
      console.log('Example started!');
    });
    $('#run').click(function() {
      var code = $('#cell').val();
      console.log('Executing:', code);
      // clear output
      $('#output').text('');
      // Execute and handle replies on the kernel.
      var future = kernel.requestExecute({ code: code });
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
