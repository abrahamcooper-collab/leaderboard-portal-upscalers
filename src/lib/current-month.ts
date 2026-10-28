import "server-only";
import { monthStartIn, type MonthStart } from "./month";
import { serverEnv } from "./server-env";

/** The month targets and totals currently apply to, in the app's time zone. */
export function currentMonth(): MonthStart {
  return monthStartIn(serverEnv.APP_TIMEZONE);
}
