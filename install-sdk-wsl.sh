#!/bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive
sudo apt-get update -qq
sudo apt-get install -y -qq unzip wget

sudo mkdir -p /opt/android-sdk/cmdline-tools
cd /tmp
wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O cmdline-tools.zip
sudo unzip -qq -o /tmp/cmdline-tools.zip -d /opt/android-sdk/cmdline-tools
sudo mv /opt/android-sdk/cmdline-tools/cmdline-tools /opt/android-sdk/cmdline-tools/latest

export ANDROID_HOME=/opt/android-sdk
export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH

yes | sdkmanager --licenses >/dev/null 2>&1 || true
sdkmanager --install "platforms;android-34" "build-tools;34.0.0" "platform-tools"

echo "ANDROID_HOME=/opt/android-sdk" | sudo tee /etc/profile.d/android.sh
echo "export PATH=\$ANDROID_HOME/cmdline-tools/latest/bin:\$ANDROID_HOME/platform-tools:\$PATH" | sudo tee -a /etc/profile.d/android.sh

echo "Android SDK installed"
