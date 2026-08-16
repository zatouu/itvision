#!/bin/bash
[ -f /etc/profile.d/android-env.sh ] && source /etc/profile.d/android-env.sh
export ANDROID_HOME="$HOME/android-sdk"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$HOME/.local/bin:$PATH"
cd /mnt/d/itvision-1/mobile/consumer
eas build --platform android --profile ec2 --local --non-interactive > /mnt/d/itvision-1/consumer-build.log 2>&1
echo "EXIT CODE: $?" >> /mnt/d/itvision-1/consumer-build.log
