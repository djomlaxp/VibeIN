#!/usr/bin/env bash
# Asks the Supabase REST API for each table the app uses, with the same
# publishable key the app ships with. Fails if any table is missing.
set -u

URL="${EXPO_PUBLIC_SUPABASE_URL:-https://solrsdvwszkwwmaiidyd.supabase.co}"
KEY="${EXPO_PUBLIC_SUPABASE_ANON_KEY:-sb_publishable_aay2OBQCrw1xFYaaeJXsMA_6MGGOf1j}"
failed=0

for table in venues vibe_reports posts profiles favorites notifications; do
  code=$(curl -sS -o /tmp/body -D /tmp/headers -w '%{http_code}' \
    -H "apikey: $KEY" -H "Prefer: count=exact" -H "Range: 0-0" \
    "$URL/rest/v1/$table?select=*")
  count=$(grep -i '^content-range:' /tmp/headers | sed 's#.*/##' | tr -d '\r')
  if [[ "$code" == 2* ]]; then
    echo "OK   $table (rows visible without login: ${count:-?})"
  else
    echo "FAIL $table (HTTP $code): $(cat /tmp/body)"
    failed=1
  fi
done

echo "--- first 5 venues ---"
curl -sS -H "apikey: $KEY" "$URL/rest/v1/venues?select=name,type,address&limit=5"
echo

exit $failed
