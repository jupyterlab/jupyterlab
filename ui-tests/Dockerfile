# Playwright version should match the one in the yarn.lock file
FROM mcr.microsoft.com/playwright:v1.11.1-focal

COPY *.* /tmp/galata/

WORKDIR /tmp/galata

RUN yarn install --frozen-lockfile

COPY ./docker/*.sh /opt/galata/

ENTRYPOINT [ "/opt/galata/run-e2e.sh" ]

CMD ["yarn", "run", "test"]
