const { withAndroidManifest, withDangerousMod, withMainApplication } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MODULE_NAME = 'WandrPictureInPicture';

function withAndroidPictureInPicture(config) {
  config = withAndroidManifest(config, (mod) => {
    const mainActivity = findMainActivity(mod.modResults);
    if (!mainActivity) {
      return mod;
    }

    mainActivity.$['android:resizeableActivity'] = 'true';
    mainActivity.$['android:supportsPictureInPicture'] = 'true';
    mainActivity.$['android:configChanges'] = addConfigChange(mainActivity.$['android:configChanges'], 'smallestScreenSize');

    return mod;
  });

  config = withMainApplication(config, (mod) => {
    if (mod.modResults.language !== 'kt' || mod.modResults.contents.includes('WandrPictureInPicturePackage()')) {
      return mod;
    }

    mod.modResults.contents = mod.modResults.contents.replace(
      '              // add(MyReactNativePackage())',
      '              // add(MyReactNativePackage())\n              add(WandrPictureInPicturePackage())'
    );
    return mod;
  });

  return withDangerousMod(config, [
    'android',
    async (mod) => {
      const packageName = mod.android?.package ?? mod.extra?.eas?.projectId ?? 'com.tuyoleni.wandr';
      const packagePath = packageName.split('.').join(path.sep);
      const sourceDir = path.join(mod.modRequest.platformProjectRoot, 'app', 'src', 'main', 'java', packagePath);

      await fs.promises.mkdir(sourceDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(sourceDir, `${MODULE_NAME}Module.kt`),
        getPictureInPictureModuleSource(packageName)
      );
      await fs.promises.writeFile(
        path.join(sourceDir, `${MODULE_NAME}Package.kt`),
        getPictureInPicturePackageSource(packageName)
      );

      return mod;
    },
  ]);
}

function findMainActivity(androidManifest) {
  const application = androidManifest.manifest.application?.[0];
  return application?.activity?.find((activity) => activity.$['android:name'] === '.MainActivity') ?? null;
}

function addConfigChange(currentValue = '', nextValue) {
  const changes = new Set(currentValue.split('|').filter(Boolean));
  changes.add(nextValue);
  return Array.from(changes).join('|');
}

function getPictureInPictureModuleSource(packageName) {
  return `package ${packageName}

import android.app.PictureInPictureParams
import android.os.Build
import android.util.Rational
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ${MODULE_NAME}Module(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "${MODULE_NAME}"

  @ReactMethod
  fun enterCallPictureInPicture(promise: Promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      promise.resolve(false)
      return
    }

    val activity = reactContext.currentActivity
    if (activity == null) {
      promise.resolve(false)
      return
    }

    val params = PictureInPictureParams.Builder()
      .setAspectRatio(Rational(9, 16))
      .build()

    try {
      promise.resolve(activity.enterPictureInPictureMode(params))
    } catch (error: IllegalStateException) {
      promise.reject("ERR_PICTURE_IN_PICTURE", error)
    }
  }
}
`;
}

function getPictureInPicturePackageSource(packageName) {
  return `package ${packageName}

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class ${MODULE_NAME}Package : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    return listOf(${MODULE_NAME}Module(reactContext))
  }

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
    return emptyList()
  }
}
`;
}

module.exports = withAndroidPictureInPicture;
