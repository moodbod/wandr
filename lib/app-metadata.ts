import Constants from 'expo-constants';

function getRuntimeVersionLabel() {
  const runtimeVersion = Constants.expoConfig?.runtimeVersion;

  if (!runtimeVersion) {
    return null;
  }

  if (typeof runtimeVersion === 'string') {
    return runtimeVersion;
  }

  return runtimeVersion.policy ?? null;
}

export function getAppMetadata() {
  const appName = Constants.expoConfig?.name ?? 'Wandr';
  const appDescription = Constants.expoConfig?.description ?? '';
  const appVersion =
    Constants.nativeApplicationVersion ??
    Constants.expoConfig?.version ??
    getRuntimeVersionLabel() ??
    null;
  const buildVersion = Constants.nativeBuildVersion ?? null;

  return {
    appDescription,
    appName,
    buildVersion,
    versionLabel: buildVersion && appVersion ? `${appVersion} (${buildVersion})` : appVersion,
  };
}
