#!/bin/bash

echo "Sourcing environment variables from /app/env/config.env"

set -a && \
source /app/env/config.env \
set +a


printenv

echo "Starting the application..."
pnpm start