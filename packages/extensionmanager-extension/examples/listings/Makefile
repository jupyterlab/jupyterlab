export BLACK_LIST_URIS="https://raw.githubusercontent.com/datalayer-jupyterlab/jupyterlab-listings-example/master/blockedExtensions_simple.json"
# export BLACK_LIST_URIS=""
# export WHITE_LIST_URIS="https://raw.githubusercontent.com/datalayer-jupyterlab/jupyterlab-listings-example/master/allowedExtensions_only_jlab.json"
export WHITE_LIST_URIS=""
export LISTINGS_REFRESH_SECONDS=120
export LISTINGS_REQUEST_OPTS="{'timeout': 10}"

listings-uris:
	@exec echo Using blockedExtensions URIs: ${BLACK_LIST_URIS}
	@exec echo Using allowedExtensions URIs: ${WHITE_LIST_URIS}
	@exec echo Refreshing lists every ${LISTINGS_REFRESH_SECONDS} seconds
	@exec echo Using ${LISTINGS_REQUEST_OPTS} for the HTTP requests

dev: listings-uris
	@exec python main.py \
	  --dev \
	  --no-browser \
	  --LabServerApp.black_extensions_uris=${BLACK_LIST_URIS} \
	  --LabServerApp.white_extensions_uris=${WHITE_LIST_URIS} \
	  --LabServerApp.listings_refresh_seconds=${LISTINGS_REFRESH_SECONDS} \
	  --LabServerApp.listings_request_options=${LISTINGS_REQUEST_OPTS}

watch: listings-uris
	@exec python main.py \
	  --dev \
	  --no-browser \
	  --watch \
	  --LabServerApp.black_extensions_uris=${BLACK_LIST_URIS} \
	  --LabServerApp.white_extensions_uris=${WHITE_LIST_URIS} \
	  --LabServerApp.listings_refresh_seconds=${LISTINGS_REFRESH_SECONDS} \
	  --LabServerApp.listings_request_options=${LISTINGS_REQUEST_OPTS}
