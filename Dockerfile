FROM node:22 AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

COPY . /app
WORKDIR /app
RUN pnpm install
RUN pnpm run build

EXPOSE 3000


COPY ./charts/k8s/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

CMD /bin/bash -c /app/entrypoint.sh
