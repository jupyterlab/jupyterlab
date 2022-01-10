This package contains Playwright test to generate the JupyterLab documentation screenshots.

To execute those tests, you will need to [download JupyterLab demo](https://github.com/jupyterlab/jupyterlab-demo) repository.

```bash
git clone https://github.com/jupyterlab/jupyterlab-demo.git /tmp/jupyterlab-demo
export JUPYTERLAB_DEMO_DIR=/tmp/jupyterlab-demo
jlpm install
jlpm run playwright install
jlpm run start:detached
jlpm run build
```
