import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { trainingService } from "../services/trainingService";
import { gameService } from "../services/gameService";
import { teamService } from "../services/teamService";
import { toEvents, eventsForMonth, eventStyle } from "../lib/calendarEvents";

const MAX_VISIBLE_EVENTS_PER_DAY = 3;

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatTime(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
  return new Date(year, month, 1).getDay();
}

export default function Calendar() {
  const navigate = useNavigate();
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [events, setEvents] = useState([]);

  useEffect(() => {
    async function loadEvents() {
      const [trainings, games, teams] = await Promise.all([
        trainingService.getAll(),
        gameService.getAll(),
        teamService.getAll(),
      ]);
      setEvents(toEvents(trainings, games, teams));
    }
    loadEvents();
  }, []);

  const monthEvents = eventsForMonth(events, currentYear, currentMonth);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOfWeek = getFirstDayOfWeek(currentYear, currentMonth);

  // Build calendar grid
  const calendarDays = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null); // Empty cells for previous month
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  // Navigation handlers
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };
  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Format month/year for header
  const displayMonth = new Date(currentYear, currentMonth).toLocaleString(
    "default",
    { month: "long" }
  );

  // Helper to get events for a specific day
  const getEventsForDay = (day) => {
    return monthEvents.filter((event) => event.date.getDate() === day);
  };

  const isToday = (day) =>
    day === today.getDate() &&
    currentMonth === today.getMonth() &&
    currentYear === today.getFullYear();

  const goToEvent = (event) => {
    if (event.type === "training") {
      navigate(`/trainings?training=${event.sourceId}`);
    } else {
      navigate(`/games?game=${event.sourceId}`);
    }
  };

  return (
    <div className="w-full m-5 md:m-10 rounded-2xl bg-white p-4 shadow-lg md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="rounded bg-gray-100 px-3 py-1 text-xl text-black hover:bg-gray-200 focus:outline-2 focus:outline-blue-500"
        >
          &lt;
        </button>
        <h2 className="m-0 font-semibold text-black">
          {displayMonth} {currentYear}
        </h2>
        <button
          onClick={nextMonth}
          className="rounded bg-gray-100 px-3 py-1 text-xl text-black hover:bg-gray-200 focus:outline-2 focus:outline-blue-500"
        >
          &gt;
        </button>
      </div>
      <div className="mb-2 grid grid-cols-7 gap-1">
        {daysOfWeek.map((day) => (
          <div key={day} className="text-center font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, idx) => (
          <div
            key={idx}
            className={`h-25 rounded-lg p-1.5 ${
              day
                ? `border border-gray-200 text-gray-800 ${
                    isToday(day) ? "bg-blue-50 font-bold" : "bg-gray-50"
                  }`
                : "text-transparent"
            }`}
          >
            {day && (
              <>
                <div className="mb-1 text-base">{day}</div>
                <div>
                  {getEventsForDay(day)
                    .slice(0, MAX_VISIBLE_EVENTS_PER_DAY)
                    .map((event) => {
                      const style = eventStyle(event.type);
                      return (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => goToEvent(event)}
                          aria-label={`${style.label} at ${formatTime(event.date)}, ${event.teamName} — ${event.title}`}
                          className={`mb-0.5 block w-full truncate rounded border-l-4 px-1.5 py-0.5 text-left text-xs hover:brightness-95 focus:outline-2 focus:outline-blue-500 ${style.background} ${style.border} ${style.text}`}
                        >
                          <b>{formatTime(event.date)}</b> {event.teamName} —{" "}
                          {event.title}
                        </button>
                      );
                    })}
                  {getEventsForDay(day).length > MAX_VISIBLE_EVENTS_PER_DAY && (
                    <div className="text-xs text-gray-500">
                      +{getEventsForDay(day).length - MAX_VISIBLE_EVENTS_PER_DAY}{" "}
                      more
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
