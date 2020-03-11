export BLACK_LIST_URIS=https://raw.githubusercontent.com/datalayer-jupyterlab/jupyterlab-listings-example/master/blacklist_simple.json	
export WHITE_LIST_URIS=https://raw.githubusercontent.com/datalayer-jupyterlab/jupyterlab-listings-example/master/whitelist_simple.json

listings-uris:
	@exec echo Blacklist URIs: ${BLACK_LIST_URIS}
	@exec echo Whitelist URIs: ${WHITE_LIST_URIS}

dev: listings-uris
	@exec python main.py \
	  --dev \
	  --no-browser \
	  --LabServerApp.blacklist_uris=${BLACK_LIST_URIS} \
	  --LabServerApp.whitelist_uris=${WHITE_LIST_URIS} \
	  --LabServerApp.listings_refresh_ms=5000

watch: listings-uris
	@exec python main.py \
	  --dev \
	  --no-browser \
	  --watch \
	  --LabServerApp.blacklist_uris=${BLACK_LIST_URIS} \
	  --LabServerApp.whitelist_uris=${WHITE_LIST_URIS} \
	  --LabServerApp.listings_refresh_ms=5000
