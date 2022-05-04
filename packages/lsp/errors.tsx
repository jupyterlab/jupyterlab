import React from 'react';

function external_link(url: string, label: string) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="lsp-external-link"
    >
      {label}
    </a>
  );
}

const migration_guide_url =
  'https://jupyter-server.readthedocs.io/en/latest/operators/migrate-from-nbserver.html';
const jupyter_hub_migration_url =
  'https://github.com/jupyterhub/jupyterhub/pull/3329/files';

export const SERVER_EXTENSION_404 = (
  <div>
    <p>
      It appears that the required Jupyter server extension (
      <code>jupyter-lsp</code>) is not installed (or not enabled) in this
      environment.
    </p>
    <h3>What are the likely reasons?</h3>
    <ul>
      <li>
        It might be that you just installed it and need to restart JupyterLab to
        make it available on startup.
      </li>
      <li>
        Alternatively, you may be using an older <code>notebook</code> server
        instead of the new <code>jupyter_server</code>; please refer to the{' '}
        {external_link(migration_guide_url, 'migration guide')} or if you are a
        JupyterHub user please ensure that you start the JupyterLab using{' '}
        <code>jupyter_server</code> and not the old <code>notebook</code>, as
        documented in{' '}
        {external_link(jupyter_hub_migration_url, 'this pull request')}.
      </li>
      <li>
        There may be schema errors or language server errors preventing the
        extension from loading - please check the logs of JupyterLab (in the
        console where you execute <code>jupyter lab</code>
      </li>
    </ul>
    <h3>How do I check if the extension is installed?</h3>
    <p>
      Please ensure that <code>jupyter server extension list</code> includes
      jupyter-lsp and that it is enabled. If it is enabled please try to restart
      JupyterLab. If the server extension is installed but not enabled and all
      other suggestions listed above failed try the following:
      <code>jupyter server extension enable --user --py jupyter_lsp</code>
    </p>
  </div>
);
