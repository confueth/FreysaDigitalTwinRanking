#!/bin/bash
# Find the line numbers for trends section
start_line=$(grep -n "<TabsContent value=\"trends\"" client/src/pages/Analytics.tsx | cut -d':' -f1)
snapshots_line=$(grep -n "<TabsContent value=\"snapshots\"" client/src/pages/Analytics.tsx | cut -d':' -f1)

# Calculate the section to remove
end_line=$((snapshots_line - 1))

# Print what we're going to do
echo "Removing lines $start_line to $end_line from client/src/pages/Analytics.tsx"

# Create a temporary file
sed "${start_line},${end_line}d" client/src/pages/Analytics.tsx > temp_analytics.tsx

# Replace the original file
mv temp_analytics.tsx client/src/pages/Analytics.tsx