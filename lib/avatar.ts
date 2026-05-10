export function isFakeProfileImageUrl(uri?: string | null) {
  return false;
}

export function shouldUseFaceHashAvatar(uri?: string | null) {
  return !uri;
}
