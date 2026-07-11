#!/bin/bash
export ANDROID_HOME=/mnt/c/Users/ASUS/AppData/Local/Android/Sdk
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools"
cd /mnt/d/itvision-1/mobile/consumer
eas build --platform android --profile ec2 --local --non-interactive 2>&1 | tee /mnt/d/itvision-1/consumer-build-2.log
