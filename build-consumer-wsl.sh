#!/bin/bash
set -e
set -o pipefail
[ -f /etc/profile.d/android-env.sh ] && source /etc/profile.d/android-env.sh
export ANDROID_HOME="$HOME/android-sdk"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$HOME/.local/bin:$PATH"
cd /mnt/d/itvision-1/mobile/consumer
rm -rf node_modules
npm install --legacy-peer-deps
eas build --platform android --profile ec2 --local --non-interactive 2>&1 | tee /mnt/d/itvision-1/consumer-build.log
