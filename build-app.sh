#!/bin/bash
set -e

export ANDROID_HOME="$HOME/Android/Sdk"
export ANDROID_SDK_ROOT="$HOME/Android/Sdk"
export JAVA_HOME="/usr/lib/jvm/java-17-openjdk-amd64"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$JAVA_HOME/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

echo "=== ANDROID_HOME=$ANDROID_HOME ==="
echo "=== JAVA_HOME=$JAVA_HOME ==="
java -version 2>&1 | head -n 1

echo ""
echo "========== BUILD XEUY BI APK (app unifiée) =========="
cd /mnt/d/itvision-1/mobile/app
npx eas-cli build --profile ec2 --platform android --local --non-interactive --output /mnt/d/itvision-1/mobile/app/xeuy-app.apk 2>&1

echo ""
echo "========== DONE =========="
ls -lh /mnt/d/itvision-1/mobile/app/xeuy-app.apk 2>&1
