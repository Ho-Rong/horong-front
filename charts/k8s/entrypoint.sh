#!/bin/sh

echo "Sourcing environment variables from /app/env/config.env"

set -a
source /app/env/.env
set +a


echo "Starting the application..."
pnpm start