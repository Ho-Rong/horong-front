#!/bin/bash

echo "Sourcing environment variables from /app/env/config.env"

set -a && \
source /app/env/config.env \
set +a


echo "Starting the application..."
pnpm start