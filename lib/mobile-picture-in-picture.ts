import { NativeModules, Platform } from 'react-native';

type WandrPictureInPictureModule = {
  enterCallPictureInPicture: () => Promise<boolean>;
};

const pictureInPictureModule = NativeModules.WandrPictureInPicture as WandrPictureInPictureModule | undefined;

export async function enterAndroidCallPictureInPicture() {
  if (Platform.OS !== 'android' || !pictureInPictureModule) {
    return false;
  }

  return await pictureInPictureModule.enterCallPictureInPicture();
}
