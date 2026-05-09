export interface TimeWindow {
  end: Date | null;
  start: Date;
}

export function doTimeWindowsOverlap(first: TimeWindow, second: TimeWindow) {
  const firstEndMs = first.end?.getTime() ?? Number.POSITIVE_INFINITY;
  const secondEndMs = second.end?.getTime() ?? Number.POSITIVE_INFINITY;

  return (
    first.start.getTime() < secondEndMs &&
    second.start.getTime() < firstEndMs
  );
}
