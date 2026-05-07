import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

import { designSystem } from '@/constants/design-system';

export default function RootHtml({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
        <meta name="theme-color" content={designSystem.semantic.light.background} media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content={designSystem.semantic.dark.background} media="(prefers-color-scheme: dark)" />
        <meta name="color-scheme" content="light dark" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Wandr" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/wandr-favicon.png" />
        <link rel="apple-touch-icon" href="/wandr-apple-touch-icon.png" />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html,
              body {
                background: ${designSystem.semantic.dark.background};
                margin: 0;
                overscroll-behavior: none;
                touch-action: manipulation;
              }

              body {
                min-height: 100vh;
                min-height: 100dvh;
              }

              #root {
                background: ${designSystem.semantic.dark.background};
                min-height: 100vh;
                min-height: 100dvh;
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
