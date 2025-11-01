#!/bin/bash

# Extract templates from old KV namespace and migrate to new one
OLD_DB=".wrangler/state/v3/kv/miniflare-KVNamespaceObject/592af56d56e7eca7ea7060c6914f9a5bfbff130ab1c4d2fb37a359621f535df6.sqlite"

echo "Migrating templates from old KV namespace..."

# Get all keys and values
sqlite3 "$OLD_DB" "SELECT key, value FROM _mf_entries;" | while IFS='|' read -r key value; do
  # Extract template ID from key (remove "template:" prefix)
  template_id="${key#template:}"

  echo "Migrating template: $template_id"

  # PUT to new namespace via API
  curl -s -X PUT "http://localhost:8787/templates/$template_id" \
    -H "Content-Type: application/json" \
    -H "x-api-key: cwe8yxq4mtc-HCZ9ebm" \
    -d "$value"

  echo ""
done

echo "Migration complete! Verifying..."
curl -s -H "x-api-key: cwe8yxq4mtc-HCZ9ebm" http://localhost:8787/templates | jq 'length'
echo "templates migrated."
