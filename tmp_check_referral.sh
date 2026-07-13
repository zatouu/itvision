#!/bin/bash
cd /mnt/d/itvision-1
for f in src/lib/models/*.ts; do
  echo "--- $f ---"
  grep -n 'referralCode.*unique' "$f" || true
done
