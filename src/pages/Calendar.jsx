import React, { useState, useEffect } from "react";
import "../App.css";
import { trainingService } from "../services/trainingService";
import { gameService } from "../services/gameService";
import { teamService } from "../services/teamService";
import { toEvents, eventsForMonth } from "../lib/calendarEvents";

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

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        padding: 32,
        width: "100%",
        margin: "20px 100px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <button
          onClick={prevMonth}
          style={{
            fontSize: 20,
            background: "#f7f7fa",
            border: "none",
            cursor: "pointer",
            color: "black",
          }}
        >
          &lt;
        </button>
        <h2 style={{ margin: 0, fontWeight: 600, color: "black" }}>
          {displayMonth} {currentYear}
        </h2>
        <button
          onClick={nextMonth}
          style={{
            fontSize: 20,
            background: "#f7f7fa",
            border: "none",
            cursor: "pointer",
            color: "black",
          }}
        >
          &gt;
        </button>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 4,
          marginBottom: 8,
        }}
      >
        {daysOfWeek.map((day) => (
          <div
            key={day}
            style={{ textAlign: "center", fontWeight: 500, color: "#888" }}
          >
            {day}
          </div>
        ))}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 4,
        }}
      >
        {calendarDays.map((day, idx) => (
          <div
            key={idx}
            style={{
              height: 100,
              background: day
                ? day === today.getDate() &&
                  currentMonth === today.getMonth() &&
                  currentYear === today.getFullYear()
                  ? "#eaf6ff"
                  : "#f7f7fa"
                : "transparent",
              borderRadius: 8,
              padding: 6,
              border: day ? "1px solid #e0e0e0" : "none",
              position: "relative",
              color: day ? "#222" : "transparent",
              fontWeight:
                day === today.getDate() &&
                currentMonth === today.getMonth() &&
                currentYear === today.getFullYear()
                  ? 700
                  : 400,
            }}
          >
            {day && (
              <>
                <div style={{ fontSize: 16, marginBottom: 4 }}>{day}</div>
                <div>
                  {getEventsForDay(day)
                    .slice(0, MAX_VISIBLE_EVENTS_PER_DAY)
                    .map((event) => (
                      <div
                        key={event.id}
                        style={{
                          background:
                            event.type === "game" ? "#d1eaff" : "#ffe6b3",
                          color: "#333",
                          borderRadius: 6,
                          padding: "2px 6px",
                          fontSize: 12,
                          marginBottom: 2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        <b>{formatTime(event.date)}</b> {event.teamName} —{" "}
                        {event.title}
                      </div>
                    ))}
                  {getEventsForDay(day).length > MAX_VISIBLE_EVENTS_PER_DAY && (
                    <div style={{ fontSize: 12, color: "#888" }}>
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
