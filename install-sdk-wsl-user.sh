#!/bin/bash
set -e

# Install Android SDK in user directory
SDK_DIR="$HOME/android-sdk"
mkdir -p "$SDK_DIR/cmdline-tools"
cd /tmp
wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O cmdline-tools.zip
unzip -qq -o /tmp/cmdline-tools.zip -d "$SDK_DIR/cmdline-tools"
mv "$SDK_DIR/cmdline-tools/cmdline-tools" "$SDK_DIR/cmdline-tools/latest"

export ANDROID_HOME="$SDK_DIR"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

yes | sdkmanager --licenses >/dev/null 2>&1 || true
sdkmanager --install "platforms;android-34" "build-tools;34.0.0" "platform-tools"

# Install EAS CLI locally (npm prefix)
mkdir -p "$HOME/.local"
npm config set prefix "$HOME/.local"
export PATH="$HOME/.local/bin:$PATH"
npm install -g eas-cli@20.0.0

echo "ANDROID_HOME=$ANDROID_HOME"
echo "PATH additions: $ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$HOME/.local/bin"
echo "SDK and EAS CLI installed"
