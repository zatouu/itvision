#!/bin/bash
cd /mnt/d/itvision-1
grep -R -i --exclude-dir=node_modules "negocier\|négocier\|Negocier" mobile/provider --include='*.tsx' | head -n 20
