import { track } from "./analytics";

const isDev = process.env.NODE_ENV !== "production";

export function debug(...args: any[]) {
  if (isDev) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
  try {
    // lightweight analytics capture for dev events if desired
    // don't await — fire and forget
    track("debug_log", { args: JSON.parse(JSON.stringify(args)) });
  } catch (e) {
    // ignore
  }
}

export function debugWarn(...args: any[]) {
  if (isDev) {
    // eslint-disable-next-line no-console
    console.warn(...args);
  }
  try {
    track("debug_warn", { args: JSON.parse(JSON.stringify(args)) });
  } catch (e) {
    // ignore
  }
}

export function debugError(...args: any[]) {
  if (isDev) {
    // eslint-disable-next-line no-console
    console.error(...args);
  }
  try {
    track("debug_error", { args: JSON.parse(JSON.stringify(args)) });
  } catch (e) {
    // ignore
  }
}

export default { debug, debugWarn, debugError };
