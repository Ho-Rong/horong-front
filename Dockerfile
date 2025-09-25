FROM node:22 AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable


ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ARG NEXT_PUBLIC_GOOGLE_MAP_ID

ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
ENV NEXT_PUBLIC_GOOGLE_MAP_ID=${NEXT_PUBLIC_GOOGLE_MAP_ID}

COPY . /app
WORKDIR /app
RUN pnpm install
RUN pnpm run build

EXPOSE 3000


COPY ./charts/k8s/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

CMD /bin/bash -c /app/entrypoint.sh
