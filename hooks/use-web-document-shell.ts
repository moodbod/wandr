import { useEffect } from 'react';
import { Platform } from 'react-native';

type RootStyleWithZoom = CSSStyleDeclaration & {
  zoom?: string;
};

export function useWebDocumentShell({
  backgroundColor,
  isLargeScreen,
}: {
  backgroundColor: string;
  isLargeScreen: boolean;
}) {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }

    document.title = 'Wandr';
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }

    const root = document.getElementById('root');
    if (!root) {
      return;
    }

    const rootStyle = root.style as RootStyleWithZoom;
    if (isLargeScreen) {
      rootStyle.width = '125vw';
      rootStyle.height = '125vh';
      rootStyle.overflow = 'hidden';
      rootStyle.zoom = '0.8';
    } else {
      rootStyle.width = '';
      rootStyle.height = '';
      rootStyle.overflow = '';
      rootStyle.zoom = '';
    }

    return () => {
      rootStyle.width = '';
      rootStyle.height = '';
      rootStyle.overflow = '';
      rootStyle.zoom = '';
    };
  }, [isLargeScreen]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }

    const styleId = 'wandr-web-document-theme';
    if (document.getElementById(styleId)) {
      return;
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      input,
      textarea,
      [contenteditable="true"],
      [role="button"] {
        outline: none !important;
        box-shadow: none !important;
        -webkit-tap-highlight-color: transparent;
      }

      input,
      textarea {
        font-size: 16px !important;
      }

      input:focus,
      input:focus-visible,
      textarea:focus,
      textarea:focus-visible,
      [contenteditable="true"]:focus,
      [contenteditable="true"]:focus-visible,
      [role="button"]:focus,
      [role="button"]:focus-visible {
        outline: none !important;
        box-shadow: none !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      style.remove();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }

    const root = document.getElementById('root');
    const previousHtmlBackground = document.documentElement.style.backgroundColor;
    const previousHtmlColorScheme = document.documentElement.style.colorScheme;
    const previousBodyBackground = document.body.style.backgroundColor;
    const previousBodyColorScheme = document.body.style.colorScheme;
    const previousRootBackground = root?.style.backgroundColor;

    document.documentElement.style.backgroundColor = backgroundColor;
    document.documentElement.style.colorScheme = 'dark';
    document.body.style.backgroundColor = backgroundColor;
    document.body.style.colorScheme = 'dark';
    if (root) {
      root.style.backgroundColor = backgroundColor;
    }

    return () => {
      document.documentElement.style.backgroundColor = previousHtmlBackground;
      document.documentElement.style.colorScheme = previousHtmlColorScheme;
      document.body.style.backgroundColor = previousBodyBackground;
      document.body.style.colorScheme = previousBodyColorScheme;
      if (root) {
        root.style.backgroundColor = previousRootBackground ?? '';
      }
    };
  }, [backgroundColor]);
}
