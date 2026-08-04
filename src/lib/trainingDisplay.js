import { totalPlannedMinutes } from "./trainingDuration";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function pad(n) {
  return String(n).padStart(2, "0");
}

function isValidDay(day) {
  const date = day instanceof Date ? day : new Date(day);
  return !isNaN(date.getTime());
}

function toTime(day) {
  const date = day instanceof Date ? day : new Date(day);
  return date.getTime();
}

/**
 * Sort key for descending-time ordering: an invalid day always sorts last,
 * regardless of how many other invalid entries exist, without disturbing
 * the relative order of the valid entries (AC TLAY-05.3).
 */
function pastSortKey(day) {
  return isValidDay(day) ? toTime(day) : -Infinity;
}

/**
 * Splits trainings into upcoming/past sections relative to `now`, injected
 * rather than read internally so the boundary is testable without faking
 * timers. `upcoming` is soonest-first; `past` is most-recent-first
 * (AC TLAY-05.1, TLAY-05.2). A training with an invalid `day` falls to
 * `past` without disturbing the ordering of the valid ones (AC TLAY-05.3,
 * regression guard on 05's TNUM-04.3). Does not mutate `trainings`.
 */
export function splitTrainings(trainings, now) {
  const upcoming = [];
  const past = [];

  for (const training of trainings) {
    if (isValidDay(training.day) && toTime(training.day) >= now.getTime()) {
      upcoming.push(training);
    } else {
      past.push(training);
    }
  }

  upcoming.sort((a, b) => toTime(a.day) - toTime(b.day));
  past.sort((a, b) => pastSortKey(b.day) - pastSortKey(a.day));

  return { upcoming, past };
}

/**
 * Formats a training's day as "Weekday D Mon, HH:mm" using local getters
 * (never UTC or toLocaleString, which carries seconds/AM-PM noise). Falls
 * back to "Invalid date" for a missing or unparsable day, matching
 * pages/Trainings.jsx's existing fallback (AC TCARD-01.5, regression guard
 * on 05's TNUM-04.3).
 */
export function formatTrainingDate(day) {
  const date = day instanceof Date ? day : new Date(day);
  if (isNaN(date.getTime())) return "Invalid date";

  const weekday = WEEKDAYS[date.getDay()];
  const month = MONTHS[date.getMonth()];
  return `${weekday} ${date.getDate()} ${month}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Summarises a training's exercises for the card: how many, their planned
 * total, and ready-to-render text. "No exercises" (nothing scheduled) is
 * kept distinct from "N exercises · 0 min planned" (exercises exist but
 * plan to zero minutes), since the two mean different things (AC TCARD-01.3).
 */
export function exerciseSummary(exercises) {
  const count = exercises ? exercises.length : 0;
  if (count === 0) {
    return { count: 0, plannedMinutes: 0, text: "No exercises" };
  }

  const plannedMinutes = totalPlannedMinutes(exercises);
  const label = count === 1 ? "exercise" : "exercises";
  return { count, plannedMinutes, text: `${count} ${label} · ${plannedMinutes} min planned` };
}
