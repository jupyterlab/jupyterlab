% Copyright (c) Jupyter Development Team.

% Distributed under the terms of the Modified BSD License.

(identity)=

# Identity

Starting with JupyterLab v3.6, user identity builds on top of the `IdentityProvider` and the endpoint `/api/me`
introduced in Jupyter Server v2 as part of the authentication. The `/api/me` endpoint returns a dictionary
with the user's identity and their permissions. Please check out its
[documentation](https://jupyter-server.readthedocs.io/en/latest/operators/security.html#identity-model)
to know more about the identity model implemented in Jupyter Server.

The user identity API was included in JupyterLab as part of the service package by adding a new service called
{ts:class}`services.UserManager` to the {ts:class}`services.ServiceManager`.
This new service periodically requests the user identity to the
`/api/me` endpoint and keeps the information in memory until the next request. Nevertheless, it is always
possible to refresh the information manually by calling the `refreshUser` method. Once the service is ready,
it is possible to access the user's identity through the property `identity` or listen for changes by subscribing
to the signal `userChanged`.

**Example:**

```typescript
const extension: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab-extension',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    const user = app.serviceManager.user;
    user.ready.then(() => {
      console.debug('Identity:', user.identity);
      console.debug('Permissions:', user.permissions);
    });
  }
};
```
