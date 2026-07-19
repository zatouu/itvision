#!/bin/bash
# Build consumer + provider APKs inside WSL

export ANDROID_HOME=/home/cheo/android-sdk
export ANDROID_SDK_ROOT=/home/cheo/android-sdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
export GRADLE_OPTS="-Xmx3g -XX:MaxMetaspaceSize=1g"

export EXPO_PUBLIC_API_BASE_URL=https://itvisionplus.sn
export EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyAkh3v595UpJH-hbBB1rpLyasGTWrHLmpE

BUILD_DIR=/home/cheo/itvision-1/mobile

# Consumer
echo "[BUILD] Prebuild + consumer APK..."
export GOOGLE_SERVICES_JSON_BASE64=$(base64 -w 0 "$BUILD_DIR/consumer/google-services.json")
cd "$BUILD_DIR/consumer"
npx expo prebuild --clean --no-install -p android

cd "$BUILD_DIR/consumer/android"
chmod +x gradlew
./gradlew --no-daemon -PreactNativeArchitectures=arm64-v8a assembleRelease > /tmp/xeuy_consumer_build.log 2>&1
consumerResult=$?
echo "[BUILD] Consumer exit code: $consumerResult"

# Provider
echo "[BUILD] Prebuild + provider APK..."
export GOOGLE_SERVICES_JSON_BASE64=$(base64 -w 0 "$BUILD_DIR/provider/google-services.json")
cd "$BUILD_DIR/provider"
npx expo prebuild --clean --no-install -p android

cd "$BUILD_DIR/provider/android"
chmod +x gradlew
./gradlew --no-daemon -PreactNativeArchitectures=arm64-v8a assembleRelease > /tmp/xeuy_provider_build.log 2>&1
providerResult=$?
echo "[BUILD] Provider exit code: $providerResult"
