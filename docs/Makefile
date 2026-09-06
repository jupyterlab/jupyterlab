# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

# Minimal makefile for Sphinx documentation
#

# You can set these variables from the command line.
SPHINXOPTS    = -W --keep-going
SPHINXBUILD   = python -msphinx
SPHINXPROJ    = JupyterLab
SOURCEDIR     = source
BUILDDIR      = build

# Put it first so that "make" without argument is like "make help".
help:
	@$(SPHINXBUILD) -M help "$(SOURCEDIR)" "$(BUILDDIR)" $(SPHINXOPTS) $(O)

.PHONY: help Makefile serve

# Catch-all target: route all unknown targets to Sphinx using the new
# "make mode" option.  $(O) is meant as a shortcut for $(SPHINXOPTS).
%: Makefile
	@$(SPHINXBUILD) -M $@ "$(SOURCEDIR)" "$(BUILDDIR)" $(SPHINXOPTS) $(O)

clean:
	# clean api build as well
	-rm -rf "$(SOURCEDIR)/api"
	@$(SPHINXBUILD) -M clean "$(SOURCEDIR)" "$(BUILDDIR)" $(SPHINXOPTS) $(O)

serve:
	@if [ -d "$(BUILDDIR)/html" ]; then \
        python -m http.server --directory "$(BUILDDIR)/html"; \
    else \
        echo "$(BUILDDIR)/html" does not exist. Run make html first.; \
    fi
