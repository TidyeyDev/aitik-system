import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, Card } from "@raydenui/ui";
import { api } from "../api/client";
import { dateRange, dayKey, parseDay } from "../utils/dateRange";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Darker = more detections. Literal colors: dark mode inverts the theme's success
// scale and text-white, which would flip this ramp and hide the numbers.
const LEVELS = [
  "bg-[#B5E3C4] text-[#004617]",
  "bg-[#5FC381] text-[#004617]",
  "bg-[#04802E] text-[#FFFFFF]",
  "bg-[#004617] text-[#FFFFFF] dark:ring-1 dark:ring-[#5FC381]",
];

function levelFor(count, max) {
  const share = count / max;
  return LEVELS[share > 0.66 ? 3 : share > 0.33 ? 2 : share > 0.1 ? 1 : 0];
}

const firstOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const addDays = (date, n) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);

function quickRanges() {
  const today = new Date();
  const key = dayKey(today);
  const yesterday = dayKey(addDays(today, -1));
  return [
    { label: "Today", from: key, to: key },
    { label: "Yesterday", from: yesterday, to: yesterday },
    { label: "Last 7 days", from: dayKey(addDays(today, -6)), to: key },
    { label: "This month", from: dayKey(firstOfMonth(today)), to: key },
    { label: "All", from: null, to: null },
  ];
}

// Mouse: click a day, drag across days, or shift+click an end day.
// Touch: tap a start day, then an end day. Keyboard: Enter, or Shift+Enter for an end day.
export default function DateRangeCalendar({ from, to, onChange, refreshKey }) {
  const [month, setMonth] = useState(() => firstOfMonth(to ? parseDay(to) : new Date()));
  const [days, setDays] = useState({});
  const [loadFailed, setLoadFailed] = useState(false);
  const [drag, setDrag] = useState(null); // { anchor, current } while the mouse is down
  const [awaitingEnd, setAwaitingEnd] = useState(false);
  const anchor = useRef(from);
  const pointerType = useRef(null);

  const lastOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const monthStart = dayKey(month);
  const monthEnd = dayKey(lastOfMonth);
  const today = dayKey(new Date());

  useEffect(() => {
    let current = true;
    api
      .get("/detections/daily-counts", {
        params: {
          ...dateRange(monthStart, monthEnd),
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      })
      .then((res) => {
        if (!current) return;
        setDays(res.data);
        setLoadFailed(false);
      })
      .catch(() => current && setLoadFailed(true));
    return () => {
      current = false;
    };
  }, [monthStart, monthEnd, refreshKey]);

  // A shared link or quick button can select dates outside the month on screen
  useEffect(() => {
    if (to && (to < monthStart || from > monthEnd)) setMonth(firstOfMonth(parseDay(to)));
    // Only when the selection changes: paging to another month must stay put
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  // Drag ends wherever the mouse is released, even outside the calendar
  useEffect(() => {
    if (!drag) return undefined;
    const finish = () => {
      anchor.current = drag.anchor;
      onChange(drag.anchor, drag.current);
      setDrag(null);
    };
    window.addEventListener("pointerup", finish);
    return () => window.removeEventListener("pointerup", finish);
  }, [drag, onChange]);

  const selectFromAnchor = (key) => {
    onChange(anchor.current ?? key, key);
    setAwaitingEnd(false);
  };

  const selectStart = (key) => {
    anchor.current = key;
    onChange(key, key);
  };

  const handlePointerDown = (key, e) => {
    pointerType.current = e.pointerType;
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    setAwaitingEnd(false);
    if (e.shiftKey) selectFromAnchor(key);
    else setDrag({ anchor: key, current: key });
  };

  // Mouse selection already happened on pointer events; detail 0 means the keyboard
  const handleClick = (key, e) => {
    if (e.detail === 0) {
      if (e.shiftKey) selectFromAnchor(key);
      else selectStart(key);
    } else if (pointerType.current !== "mouse") {
      if (awaitingEnd) selectFromAnchor(key);
      else {
        selectStart(key);
        setAwaitingEnd(true);
      }
    }
  };

  const selectQuick = ({ from: start, to: end }) => {
    anchor.current = start;
    setAwaitingEnd(false);
    onChange(start, end);
  };

  const [low, high] = drag
    ? [drag.anchor, drag.current].sort()
    : [from, to];

  const cells = [];
  for (let d = addDays(month, -month.getDay()); d <= lastOfMonth || d.getDay() !== 0; d = addDays(d, 1)) {
    cells.push(d);
  }
  const maxCount = Math.max(1, ...Object.values(days));

  return (
    <Card shadow="md" className="p-4 sm:p-6">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex flex-col gap-4 lg:w-40 shrink-0">
          <div className="flex flex-wrap lg:flex-col gap-2" role="group" aria-label="Quick date ranges">
            {quickRanges().map((quick) => {
              const active = quick.from === from && quick.to === to;
              return (
                <Button
                  key={quick.label}
                  size="sm"
                  variant={active ? "secondary" : "grey"}
                  appearance={active ? "solid" : "outlined"}
                  aria-pressed={active}
                  className="h-11"
                  onClick={() => selectQuick(quick)}
                >
                  {quick.label}
                </Button>
              );
            })}
          </div>
          <div className="flex items-center gap-1.5 text-body-xs text-grey-600" aria-hidden="true">
            Fewer
            {LEVELS.map((level) => (
              <span key={level} className={`size-3 rounded-sm ${level}`} />
            ))}
            More
          </div>
        </div>

        <div className="flex-1 min-w-0 max-w-xl">
          <div className="flex items-center justify-between gap-2 mb-3">
            <Button
              variant="grey"
              appearance="outlined"
              size="sm"
              iconPosition="icon-only"
              icon={<ChevronLeft size={16} />}
              aria-label="Previous month"
              title="Previous month"
              className="size-11"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            />
            <h2 className="font-heading text-h6 text-grey-900" aria-live="polite">
              {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </h2>
            <Button
              variant="grey"
              appearance="outlined"
              size="sm"
              iconPosition="icon-only"
              icon={<ChevronRight size={16} />}
              aria-label="Next month"
              title="Next month"
              className="size-11"
              disabled={monthEnd >= today}
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            />
          </div>

          <div className="grid grid-cols-7 gap-1 select-none" role="group" aria-label="Choose dates">
            {WEEKDAYS.map((day) => (
              <div key={day} className="pb-1 text-center text-body-xs font-medium text-grey-600" aria-hidden="true">
                {day}
              </div>
            ))}
            {cells.map((date) => {
              const key = dayKey(date);
              const count = days[key] ?? 0;
              const inMonth = key >= monthStart && key <= monthEnd;
              const selected = low && key >= low && key <= high;
              const isEnd = key === low || key === high;
              const label = date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
              return (
                <button
                  key={key}
                  type="button"
                  data-day={key}
                  disabled={key > today}
                  aria-pressed={Boolean(selected)}
                  aria-label={`${label}: ${count} detection${count === 1 ? "" : "s"}`}
                  title={`${count} detection${count === 1 ? "" : "s"}`}
                  className={[
                    "flex h-14 min-w-0 touch-manipulation flex-col items-center justify-start gap-0.5 rounded-md pt-1.5 text-body-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-40",
                    "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary-500",
                    count > 0 ? "font-semibold text-grey-900" : "text-grey-400",
                    !inMonth && "opacity-40",
                    selected ? "bg-primary-50" : "hover:bg-grey-100",
                    selected && isEnd && "ring-2 ring-inset ring-primary-500",
                  ].filter(Boolean).join(" ")}
                  onPointerDown={(e) => handlePointerDown(key, e)}
                  onPointerEnter={() => drag && setDrag({ ...drag, current: key })}
                  onClick={(e) => handleClick(key, e)}
                >
                  {date.getDate()}
                  {count > 0 && (
                    <span className={`rounded-sm px-1 text-[0.6875rem] leading-4 font-medium tabular-nums ${levelFor(count, maxCount)}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-2 min-h-5 text-body-xs text-grey-600" aria-live="polite">
            {loadFailed
              ? "Couldn't load the per-day counts."
              : awaitingEnd
                ? "Tap another day to select a range."
                : ""}
          </p>
        </div>
      </div>
    </Card>
  );
}
