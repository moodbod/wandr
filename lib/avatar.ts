const FAKE_PROFILE_IMAGE_HOSTS = ['images.unsplash.com', 'images.pexels.com', 'randomuser.me', 'i.pravatar.cc'];

export function isFakeProfileImageUrl(uri?: string | null) {
  if (!uri) {
    return false;
  }

  try {
    const url = new URL(uri);
    return FAKE_PROFILE_IMAGE_HOSTS.some((host) => url.hostname.includes(host));
  } catch {
    return FAKE_PROFILE_IMAGE_HOSTS.some((host) => uri.includes(host));
  }
}

export function shouldUseFaceHashAvatar(uri?: string | null) {
  return !uri || isFakeProfileImageUrl(uri);
}
