#!/bin/bash
set -e
export ANDROID_HOME="$HOME/android-sdk"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$HOME/.local/bin:$PATH"
cd /mnt/d/itvision-1/mobile/provider
eas build --platform android --profile ec2 --local --non-interactive 2>&1 | tee /mnt/d/itvision-1/provider-build.log
