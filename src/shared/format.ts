/**
 * Fixed to Asia/Singapore rather than the runtime's zone, so a class does not
 * show one time locally and another on a server in UTC.
 */
const CLASS_TIME_FORMAT = new Intl.DateTimeFormat("en-SG", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Singapore",
});

export function formatClassTime(iso: string): string {
  return CLASS_TIME_FORMAT.format(new Date(iso));
}
