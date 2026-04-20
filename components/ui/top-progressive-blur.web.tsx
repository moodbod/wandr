import BlurEffect from 'react-progressive-blur';

type TopProgressiveBlurProps = {
  height?: number;
  intensity?: number;
};

export function TopProgressiveBlur({ height = 108, intensity = 24 }: TopProgressiveBlurProps) {
  return (
    <BlurEffect
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
