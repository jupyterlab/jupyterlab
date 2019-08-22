FROM python:3

WORKDIR /usr/src/app

ARG GIT_AUTHOR_NAME
ARG GIT_AUTHOR_EMAIL

ENV GIT_AUTHOR_NAME=$GIT_AUTHOR_NAME
ENV GIT_AUTHOR_EMAIL=$GIT_AUTHOR_EMAIL

RUN git config --global user.name "$GIT_AUTHOR_NAME"
RUN git config --global user.email "$GIT_AUTHOR_EMAIL"

RUN apt-get update && apt-get install -y npm twine

CMD ["bash"]
