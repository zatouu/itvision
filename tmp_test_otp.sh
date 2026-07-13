#!/bin/bash
set -e
BASE=http://localhost:3000
PHONE=771234599

echo '--- send-otp ---'
SEND=$(curl -s -X POST "$BASE/api/auth/mobile/send-otp" -H 'Content-Type: application/json' -d "{\"phone\":\"$PHONE\",\"role\":\"CLIENT\"}")
echo "$SEND" | python3 -m json.tool 2>/dev/null || echo "$SEND"

DEVCODE=$(echo "$SEND" | grep -oP '(?<=_devCode\":\")[0-9]{6}' || echo '')
echo "dev code: $DEVCODE"

sleep 1

echo '--- verify-otp ---'
VERIFY=$(curl -s -X POST "$BASE/api/auth/mobile/verify-otp" -H 'Content-Type: application/json' -d "{\"phone\":\"+$PHONE\",\"code\":\"${DEVCODE:-000000}\",\"role\":\"CLIENT\"}")
echo "$VERIFY" | python3 -m json.tool 2>/dev/null || echo "$VERIFY"
