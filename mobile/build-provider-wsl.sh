#!/bin/bash
# Build provider APK inside WSL

export ANDROID_HOME=/home/cheo/android-sdk
export ANDROID_SDK_ROOT=/home/cheo/android-sdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
export GRADLE_OPTS="-Xmx3g -XX:MaxMetaspaceSize=1g"

export EXPO_PUBLIC_API_BASE_URL=https://itvisionplus.sn
export EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyAkh3v595UpJH-hbBB1rpLyasGTWrHLmpE

# Clean corrupted transform if it exists
rm -rf /home/cheo/.gradle/caches/8.8/transforms/6ff5823e0d985c4db2de5dfd9448086f

echo "[BUILD] Prebuild + provider APK..."
export GOOGLE_SERVICES_JSON_BASE64=$(base64 -w 0 "/home/cheo/itvision-1/mobile/provider/google-services.json")
cd /home/cheo/itvision-1/mobile/provider
npx expo prebuild --clean --no-install -p android

cd /home/cheo/itvision-1/mobile/provider/android
chmod +x gradlew
./gradlew --no-daemon -PreactNativeArchitectures=arm64-v8a assembleRelease > /tmp/xeuy_provider_build.log 2>&1
providerResult=$?
echo "[BUILD] Provider exit code: $providerResult"
