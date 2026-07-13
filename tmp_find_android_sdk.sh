#!/bin/bash
for p in /mnt/c/Users/*/AppData/Local/Android/Sdk \
         "/mnt/c/Program Files/Android/Android-sdk" \
         /mnt/c/Android/Sdk \
         /usr/lib/android-sdk \
         /opt/android-sdk \
         /home/*/Android/Sdk; do
  if [ -d "$p" ]; then
    echo "FOUND: $p"
    ls "$p" 2>/dev/null | head -n 5
    break
  fi
done
