import React, { useState } from "react";
import "../App.css";

// Mock events data
const mockEvents = [
  {
    id: 1,
    type: "Game",
    title: "Match vs Tigers",
    date: "2025-07-10",
    time: "18:00",
  },
  {
    id: 2,
    type: "Training",
    title: "Morning Training",
    date: "2025-07-12",
    time: "09:00",
  },
  {
    id: 3,
    type: "Game",
    title: "Match vs Eagles",
    date: "2025-07-18",
    time: "20:00",
  },
  {
    id: 4,
    type: "Training",
    title: "Evening Training",
    date: "2025-07-22",
    time: "17:00",
  },
];

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
  const monthName = today.toLocaleString("default", { month: "long" });
  const displayMonth = new Date(currentYear, currentMonth).toLocaleString(
    "default",
    { month: "long" }
  );

  // Helper to get events for a specific day
  const getEventsForDay = (day) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(
      2,
      "0"
    )}-${String(day).padStart(2, "0")}`;

    return mockEvents.filter((event) => event.date === dateStr);
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
                  {getEventsForDay(day).map((event) => (
                    <div
                      key={event.id}
                      style={{
                        background:
                          event.type === "Game" ? "#d1eaff" : "#ffe6b3",
                        color: "#333",
                        borderRadius: 6,
                        padding: "2px 6px",
                        fontSize: 12,
                        marginBottom: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      <b>{event.time}</b> {event.type}: {event.title}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
