import BlurEffect from 'react-progressive-blur';
import type React from 'react';

type TopProgressiveBlurProps = {
  height?: number;
  intensity?: number;
};

export function TopProgressiveBlur({ height = 108, intensity = 24 }: TopProgressiveBlurProps) {
  const ProgressiveBlur = BlurEffect as unknown as React.ComponentType<{
    position: 'top';
    intensity: number;
    className?: string;
    style?: React.CSSProperties;
  }>;

  return (
    <ProgressiveBlur
      position="top"
      intensity={intensity}
      className=""
      // `react-progressive-blur` is web-only and styles via CSS/backdrop-filter.
      // Expo web accepts DOM styles here, while native resolves to the sibling `.tsx` file.
      style={{
        height,
        width: '100%',
      } as React.CSSProperties}
    />
  );
}
