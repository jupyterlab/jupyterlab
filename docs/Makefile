# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

# Minimal makefile for documentation
#

JUPYTERBOOK   = jupyter book
SOURCEDIR     = source
SYNC_SHOTS    = python ../scripts/copy_doc_screenshots.py
GEN_DOC_LISTS = python ../scripts/gen_doc_lists.py

# Put it first so that "make" without argument is like "make help".
help:
	@$(JUPYTERBOOK) --help

.PHONY: help Makefile serve sync-doc-screenshots api serve-api gen-doc-lists

# Copy the galata documentation screenshots into the source tree before
# building, as the Jupyter Book build has no Sphinx setup() hook to do it.
sync-doc-screenshots:
	@$(SYNC_SHOTS)

# Render the command/plugin/token list pages from the committed galata
# documentation snapshots, as the Jupyter Book build has no Sphinx
# setup() hook to do it.
gen-doc-lists:
	@$(GEN_DOC_LISTS)

api:
    # build api
	jlpm docs

# Skip the api build for the dev server when the docs already exist.
serve-api:
	@test -d "$(SOURCEDIR)/api" || jlpm docs

# Catch-all target.
%: Makefile api sync-doc-screenshots gen-doc-lists
	@$(JUPYTERBOOK) build --html

clean:
	# clean api build as well
	-rm -rf "$(SOURCEDIR)/api"
	@$(JUPYTERBOOK) clean

serve: serve-api sync-doc-screenshots gen-doc-lists
	@$(JUPYTERBOOK) start
