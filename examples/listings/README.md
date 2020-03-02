# JupyterLab Black/White Listings Example

```bash
pip install flask flask_cors && \
  yarn && \
  yarn start
```

```bash
open http://localhost:8080/lists/blacklist.json
open http://localhost:8080/lists/whitelist.json
```

```json
{
  // Extension Manager
  // @jupyterlab/extensionmanager-extension:plugin
  // Extension manager settings.
  // *********************************************

  // Enabled Status
  // Enables extension manager (requires Node.js/npm).
  // WARNING: installing untrusted extensions may be unsafe.
  "enabled": true
}
```
