const fs = require('fs');
const path = require('path');

const { withDangerousMod } = require('@expo/config-plugins');

const MARKER_BEGIN = '# @generated begin wandr-react-native-dependencies-embed';

const POST_INSTALL_CALL = `    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false,
      :ccache_enabled => ccache_enabled?(podfile_properties),
    )
`;

function createRnDepsEmbedPatch(reactNativeVersion) {
  return `${MARKER_BEGIN}
    rn_deps_framework_patch = <<-'WANDR_RN_DEPS_FRAMEWORK_PATCH'
install_react_native_dependencies_framework()
{
  local archive="\${PODS_ROOT}/ReactNativeDependencies-artifacts/reactnative-dependencies-${reactNativeVersion}-debug.tar.gz"
  if [[ "$CONFIGURATION" != "Debug" ]]; then
    archive="\${PODS_ROOT}/ReactNativeDependencies-artifacts/reactnative-dependencies-${reactNativeVersion}-release.tar.gz"
  fi

  if [ ! -f "$archive" ]; then
    echo "error: ReactNativeDependencies artifact not found at $archive"
    exit 1
  fi

  local extract_dir="\${PODS_ROOT}/ReactNativeDependenciesLocal/\${CONFIGURATION}"
  local xcframework="\${extract_dir}/packages/react-native/third-party/ReactNativeDependencies.xcframework"

  if [ ! -d "$xcframework" ]; then
    rm -rf "$extract_dir"
    mkdir -p "$extract_dir"
    tar -xzf "$archive" -C "$extract_dir"
  fi

  if [[ "$PLATFORM_NAME" == *"simulator"* ]]; then
    install_framework "\${xcframework}/ios-arm64_x86_64-simulator/ReactNativeDependencies.framework"
  else
    install_framework "\${xcframework}/ios-arm64/ReactNativeDependencies.framework"
  fi
}
WANDR_RN_DEPS_FRAMEWORK_PATCH

    Dir[File.join(installer.sandbox.root, 'Target Support Files', 'Pods-*', 'Pods-*-frameworks.sh')].each do |frameworks_script|
      script = File.read(frameworks_script)
      next unless script.include?('React-Core-prebuilt/React.framework')
      next if script.include?('install_react_native_dependencies_framework')

      debug_block_start = 'if [[ "$CONFIGURATION" == "Debug" ]]; then' + "\\n"
      react_framework_line = 'install_framework "\${PODS_XCFRAMEWORKS_BUILD_DIR}/React-Core-prebuilt/React.framework"'

      script = script.sub(debug_block_start, rn_deps_framework_patch + "\\n" + debug_block_start)
      script = script.gsub(react_framework_line, react_framework_line + "\\n  install_react_native_dependencies_framework")

      File.write(frameworks_script, script)
    end
# @generated end wandr-react-native-dependencies-embed
`;
}

function getReactNativeVersion(projectRoot) {
  const packageJsonPath = require.resolve('react-native/package.json', { paths: [projectRoot] });
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  return packageJson.version;
}

module.exports = function withIosReactNativeDependenciesEmbed(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');

      if (!fs.existsSync(podfilePath)) {
        return config;
      }

      let podfile = fs.readFileSync(podfilePath, 'utf8');

      if (podfile.includes(MARKER_BEGIN)) {
        return config;
      }

      if (!podfile.includes(POST_INSTALL_CALL)) {
        console.warn(
          'Unable to inject ReactNativeDependencies embed patch: react_native_post_install block not found.'
        );
        return config;
      }

      podfile = podfile.replace(
        POST_INSTALL_CALL,
        `${POST_INSTALL_CALL}\n${createRnDepsEmbedPatch(getReactNativeVersion(config.modRequest.projectRoot))}`
      );
      fs.writeFileSync(podfilePath, podfile);

      return config;
    },
  ]);
};
