# Prep a fresh conda environment in a temporary folder for a release
if [[ $# -ne 1 ]]; then
    echo "Specify branch"
else
    branch=$1
    env=jlabrelease_$branch

    WORK_DIR=`mktemp -d`
    cd $WORK_DIR
    conda deactivate
    conda remove --all -y -n jlabrelease_$branch

    conda create -c conda-forge -y -n $env notebook nodejs twine
    conda activate $env

    git clone https://github.com/jupyterlab/jupyterlab.git
    cd jupyterlab

    git checkout $branch

    pip install -ve .
fi
