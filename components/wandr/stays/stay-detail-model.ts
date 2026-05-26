import { designSystem } from '@/constants/design-system';
import type { StayBedOption, StayGuestCounts, StayRoomOption } from '@/types/stays';

export const dayOffsets = [0, 1, 3, 7] as const;
export const nightOptions = [1, 2, 3, 5] as const;

export const darkSheetPalette = {
  background: designSystem.colors.darkPage,
  surface: designSystem.colors.darkCard,
  border: designSystem.colors.darkBorderWarm,
  text: designSystem.colors.darkTextWarm,
  mutedText: designSystem.colors.mutedWarm,
  accent: designSystem.colors.lime,
  accentText: designSystem.colors.darkGreen,
};

export function formatDateLabel(value: number) {
  return new Date(value).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDayOffsetLabel(dayOffset: number) {
  if (dayOffset === 0) {
    return 'Today';
  }
  if (dayOffset === 1) {
    return 'Tomorrow';
  }
  return `In ${dayOffset} days`;
}

export function getNightsBetween(checkIn: number, checkOut: number) {
  return Math.max(1, Math.round((checkOut - checkIn) / 86_400_000));
}

export function getDayOffsetFromToday(value: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(value);
  target.setHours(0, 0, 0, 0);

  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function formatReviewDate(value: number) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatReviewCount(count: number) {
  return `${count} review${count === 1 ? '' : 's'}`;
}

export function buildGuestSummary(guestCounts: StayGuestCounts) {
  const parts = [`${guestCounts.adults} adult${guestCounts.adults === 1 ? '' : 's'}`];
  if (guestCounts.children > 0) {
    parts.push(`${guestCounts.children} child${guestCounts.children === 1 ? '' : 'ren'}`);
  }
  return parts.join(' + ');
}

export function buildRoomSummary(
  roomCount: number,
  roomOption: StayRoomOption,
  bedOption: StayBedOption
) {
  return `${roomCount} ${roomOption.label.toLowerCase()}${roomCount === 1 ? '' : 's'} \u00c2\u00b7 ${bedOption.label.toLowerCase()}`;
}
