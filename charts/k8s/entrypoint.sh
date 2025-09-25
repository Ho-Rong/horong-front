#!/bin/sh

echo "Sourcing environment variables from /app/env/config.env"
source /app/env/config.env

echo "Starting the application..."
pnpm start