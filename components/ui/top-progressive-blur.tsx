import { ProgressiveBlurView } from '@/components/ui/progressive-blur-view';

type TopProgressiveBlurProps = {
  height?: number;
  intensity?: number;
};

export function TopProgressiveBlur({ height = 108, intensity = 24 }: TopProgressiveBlurProps) {
  return <ProgressiveBlurView height={height} intensity={intensity} />;
}
