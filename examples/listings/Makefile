print-listings:
	@exec echo Blacklist URI: http://localhost:8888/listings/blacklist.json
	@exec echo Whitelist URI: http://localhost:8888/listings/whitelist.json

dev: print-listings
	@exec python main.py \
	  --dev \
	  --no-browser \
	  --LabServerApp.blacklist_uri=http://localhost:8888/listings/blacklist.json \
	  --LabServerApp.whitelist_uri=http://localhost:8888/listings/whitelist.json

dev-watch: print-listings
	@exec python main.py \
	  --dev \
	  --no-browser \
	  --LabServerApp.blacklist_uri=http://localhost:8888/listings/blacklist.json \
	  --LabServerApp.whitelist_uri=http://localhost:8888/listings/whitelist.json \
	  --watch
