// Missing observations stay missing throughout calculations and exports.
export const isPresent = (value) => value !== null && value !== undefined;

export function difference(after, before) {
  return Number.isFinite(after) && Number.isFinite(before) ? after - before : null;
}

export function ratio(value, total) {
  return Number.isFinite(value) && Number.isFinite(total) && total !== 0 ? value / total : null;
}

export function relativeChange(after, before) {
  return ratio(difference(after, before), before);
}
