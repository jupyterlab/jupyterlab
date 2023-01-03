FROM python:3

WORKDIR /app

COPY . .

RUN apt update

RUN curl -fsSL https://deb.nodesource.com/setup_14.x | bash - && apt-get install -y nodejs


RUN pip install /app

EXPOSE 8888


ENTRYPOINT ["jupyter"]

CMD [\
    "lab", \
    "--allow-root", \
    "--NotebookApp.allow_origin=*", \
    "--NotebookApp.allow_remote_access=1", \
    "--ip='*'", \
    "--NotebookApp.token=''", \
    "--NotebookApp.password=''"\
    ]