# Test a release wheel in a fresh conda environment with and without installed
# extensions
old=${CONDA_DEFAULT_ENV}
env=${old}_test

conda deactivate
conda remove --all -y -n $env

conda create -c conda-forge -y -n $env notebook nodejs twine
conda activate $env

pip install dist/*.whl

WORK_DIR='/tmp/$env'
rm -rf $WORK_DIR
mkdir -p $WORK_DIR
cp examples/notebooks/*.ipynb $WORK_DIR
cd $WORK_DIR

python -m jupyterlab.browser_check

jupyter labextension install @jupyterlab/fasta-extension --no-build
jupyter labextension install @jupyterlab/geojson-extension --no-build
jupyter labextension install @jupyterlab/plotly-extension --no-build
jupyter labextension install @jupyter-widgets/jupyterlab-manager --no-build
jupyter labextension install bqplot --no-build
jupyter labextension install jupyter-leaflet --no-build
jupyter lab clean
jupyter lab build

conda install -c conda-forge -y ipywidgets altair matplotlib
python -m jupyterlab.browser_check

jupyter lab

echo "If successful, return to /tmp/$old and publish to PyPI"
