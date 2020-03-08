print-listings:
#	@exec echo Local Blacklist URI: http://localhost:8888/listings/blacklist.json
#	@exec echo Local Whitelist URI: http://localhost:8888/listings/whitelist.json

dev: print-listings
	@exec python main.py \
	  --dev \
	  --no-browser \
	  --LabServerApp.blacklist_uris=https://raw.githubusercontent.com/datalayer-jupyterlab/jupyterlab-listings-example/master/blacklist.json \
	  --LabServerApp.whitelist_uris=https://raw.githubusercontent.com/datalayer-jupyterlab/jupyterlab-listings-example/master/whitelist.json

dev-watch: print-listings
	@exec python main.py \
	  --dev \
	  --no-browser \
	  --watch \
	  --LabServerApp.blacklist_uris=https://raw.githubusercontent.com/datalayer-jupyterlab/jupyterlab-listings-example/master/blacklist.json \
	  --LabServerApp.whitelist_uris=https://raw.githubusercontent.com/datalayer-jupyterlab/jupyterlab-listings-example/master/whitelist.json
