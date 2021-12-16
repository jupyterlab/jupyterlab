yarn && \
yarn build && \
python main.py \
  --no-browser \
  --ServerApp.allow_origin=* \
  --ServerApp.tornado_settings='{"headers": {"Content-Security-Policy": "frame-ancestors *"}}'
