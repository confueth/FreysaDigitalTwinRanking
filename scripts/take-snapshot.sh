#!/bin/bash

# Script to take a new snapshot through the API
# Usage: ./scripts/take-snapshot.sh [optional description]

# Default description is timestamp if none provided
DESCRIPTION=${1:-"Manual snapshot - $(date -u +"%Y-%m-%dT%H:%M:%SZ")"}

echo "Taking new snapshot with description: $DESCRIPTION"

# Make API request to create snapshot
RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{\"description\":\"$DESCRIPTION\"}" \
  http://localhost:5000/api/snapshots)

echo -e "\nResponse from server:"
echo $RESPONSE

echo -e "\nSnapshot process is running in the background."
echo "Check the server logs for progress updates."


