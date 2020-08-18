const IMiddleToken = require('./index').IMiddleToken;

module.exports = [{
    id: '@jupyterlab/example-federated-middle',
    autoStart: true,
    provides: IMiddleToken,
    activate: function (app) {
        console.log('JupyterLab extension middle is activated!');
        console.log(app.commands);
        return 'hello';
    }
}];
