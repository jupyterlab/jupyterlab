# Prep a fresh conda environment in a temporary folder for a release
if [[ $# -ne 1 ]]; then
    echo "Specify branch"
else
    set -v
    JLAB_REL_BRANCH=$1
    JLAB_REL_ENV=jlabrelease_$JLAB_REL_BRANCH

    WORK_DIR=$(mktemp -d -t $JLAB_REL_ENV)
    cd $WORK_DIR

    conda create --override-channels --strict-channel-priority -c conda-forge -c anaconda -y -n $JLAB_REL_ENV notebook nodejs twine
    conda activate $JLAB_REL_ENV

    git clone git@github.com:jupyterlab/jupyterlab.git
    cd jupyterlab

    git checkout $JLAB_REL_BRANCH

    pip install -ve .

    # Emit a system beep
    echo -e "\a"
fi
