const childProcess = require('child_process');
const json2ts = require('json-schema-to-typescript');
const fs = require('fs');

const package = 'jupyterlab_server';
const schemaLocalPath = 'lsp_handler/schema/schema.json';
const cmd = `python -c 'import pkg_resources;print(pkg_resources.resource_filename("${package}", "${schemaLocalPath}"))'`;
let value;
try {
  value = childProcess.execSync(cmd, {});
  const schemaPath = value
    .toString()
    .replace(/(\r\n|\n)$/, '')
    .trim();

  json2ts
    .compileFromFile(schemaPath, { unreachableDefinitions: true })
    .then(ts => {
      fs.writeFileSync('src/_schema.ts', ts);
    });
} catch {
  const anyType = `
export type LanguageServerSession = any;
export type LanguageServerSpec = any;
export type ServerSpecProperties = any;
  `;
  console.error('jupyterlab_server not found, using any type');
  fs.writeFileSync('src/_schema.ts', anyType);
}

const pluginSchema = '../lsp-extension/schema/plugin.json';
try {
  json2ts.compileFromFile(pluginSchema).then(ts => {
    fs.writeFileSync('src/_plugin.ts', ts);
  });
} catch {
  const anyType = `
export type LanguageServer2 = any;
export type AskServersToSendTraceNotifications = any;
  `;
  fs.writeFileSync('src/_plugin.ts', anyType);
}
