#!/bin/bash
cd /mnt/d/itvision-1
grep -R "apiUpload" mobile/consumer mobile/provider --include='*.tsx' | grep -iE "voice|audio" | head -n 20
