export BLOCKED_EXTENSIONS_URIS="https://raw.githubusercontent.com/datalayer-jupyterlab/jupyterlab-listings-example/master/blockedExtensions_simple.json"
# export BLOCKED_EXTENSIONS_URIS=""
# export ALLOWED_EXTENSIONS_URIS="https://raw.githubusercontent.com/datalayer-jupyterlab/jupyterlab-listings-example/master/allowedExtensions_only_jlab.json"
export ALLOWED_EXTENSIONS_URIS=""
export LISTINGS_REFRESH_SECONDS=120
export LISTINGS_REQUEST_OPTS="{'timeout': 10}"

listings-uris:
	@exec echo Using blockedExtensions URIs: ${BLOCKED_EXTENSIONS_URIS}
	@exec echo Using allowedExtensions URIs: ${ALLOWED_EXTENSIONS_URIS}
	@exec echo Refreshing lists every ${LISTINGS_REFRESH_SECONDS} seconds
	@exec echo Using ${LISTINGS_REQUEST_OPTS} for the HTTP requests

dev: listings-uris
	@exec python main.py \
	  --dev \
	  --no-browser \
	  --LabServerApp.blocked_extensions_uris=${BLOCKED_EXTENSIONS_URIS} \
	  --LabServerApp.allowed_extensions_uris=${ALLOWED_EXTENSIONS_URIS} \
	  --LabServerApp.listings_refresh_seconds=${LISTINGS_REFRESH_SECONDS} \
	  --LabServerApp.listings_request_options=${LISTINGS_REQUEST_OPTS}

watch: listings-uris
	@exec python main.py \
	  --dev \
	  --no-browser \
	  --watch \
	  --LabServerApp.blocked_extensions_uris=${BLOCKED_EXTENSIONS_URIS} \
	  --LabServerApp.allowed_extensions_uris=${ALLOWED_EXTENSIONS_URIS} \
	  --LabServerApp.listings_refresh_seconds=${LISTINGS_REFRESH_SECONDS} \
	  --LabServerApp.listings_request_options=${LISTINGS_REQUEST_OPTS}
