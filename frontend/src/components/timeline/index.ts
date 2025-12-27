/**
 * Timeline Components Index
 *
 * Exports for the NLE Timeline system.
 */

export { NLETimeline, default } from './NLETimeline';
export type { TimelineClip, TimelineMark } from './NLETimeline';

// NLETimelineRef placeholder - component doesn't use forwardRef yet
export interface NLETimelineRef {
  scrollToTime?: (time: number) => void;
  getCurrentTime?: () => number;
}
