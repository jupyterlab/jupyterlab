# JupyterLab UI Testing

JupyterLab UI tests use [Galata](https://github.com/jupyterlab/galata) which is based on [playwright](https://github.com/microsoft/playwright) and [jest](https://github.com/facebook/jest) frameworks. Galata provides a high level API to control and inspect JupyterLab UI programmatically, testing tools and CLI to manage tests and other tasks.

## Adding a new UI test suite

1. Create a new file ending with `.test.ts` in `ui-tests/tests` directory.
2. Make sure you import `describe` and `test` methods from Galata instead of jest, since Galata overrides them to be able to provide additional functionality.

```ts
import { galata, describe, test } from '@jupyterlab/galata';
```

3. Add your test suite with step by step tasks. Galata runs steps in series, so your steps can rely on the state in the previous step. Check [Galata API](https://github.com/jupyterlab/galata/blob/main/packages/galata/src/galata.ts) for available functionality to interact with JupyterLab.
4. When doing visual regression tests, it is important to use reference images that were generated in the same environment. Please read _Reference Image Captures_ section [here](https://github.com/jupyterlab/galata#reference-image-captures) if you are adding visual regression tests.
5. If you added visual regression tests, make sure you tested them locally enough number of times to make sure they do not produce false positives due to async nature of UI actions. Use the following steps to test locally (it requires [docker](https://docs.docker.com/engine/) and [docker-compose](https://docs.docker.com/compose/install/)).

```bash
# Build the JupyterLab docker to be tested
/bin/sh ./scripts/build_docker.sh

# run UI tests once to create test captures to use as reference images for your new feature
docker-compose -f "./ui-tests/docker/docker-compose.yml" run --rm e2e yarn run test:create-references --jlab-base-url=http://jupyterlab:8888

# copy test captures into reference-output directory to use as references
# cp test-output/test/screenshots/*.* reference-output/screenshots

# run UI tests locally, repeatedly. make sure no test fails. wait for 10-20 successful repeats
docker-compose -f "./ui-tests/docker/docker-compose.yml" run --rm e2e

# Stop the docker stack
docker-compose -f "./ui-tests/docker/docker-compose.yml" down
```

> You can access the server logs by running `docker logs jupyterlab`

6. Once you are done testing locally, push the new references on your PR and check CI is passing.

7. If your tests are failing or if you want to debug UI tests, you can use the script `yarn run test:debug --include=...` by specifying the particular test suite(s) you want to debug. Check [Galata CLI Options](https://github.com/jupyterlab/galata#command-line-options) for list of available command-line options.
