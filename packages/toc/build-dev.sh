npm i
npm run build
cd ../jupyterlab
jlpm run remove:package jupyterlab-toc
jlpm run add:sibling ../jupyterlab-toc
jlpm run build
cd ../jupyterlab-toc

