"use client";

import { useState, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { useCalendarEvents, useAddCalendarEvent, useUpdateCalendarEvent } from "@/lib/hooks/useCalendar";

const EVENT_ICONS: Record<string, string> = {
  meeting: "🤝", reminder: "🔔", deadline: "⏰", call: "📞", task: "✅",
};

const EVENT_COLORS: Record<string, string> = {
  meeting: "border-blue-800 bg-blue-950/40",
  reminder: "border-yellow-800 bg-yellow-950/40",
  deadline: "border-red-800 bg-red-950/40",
  call: "border-green-800 bg-green-950/40",
  task: "border-purple-800 bg-purple-950/40",
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function formatDate(d: Date) {
  return d.toISOString().split("T")[0];
}

export default function CalendarPage() {
  const { data: events, isLoading } = useCalendarEvents();
  const addEvent = useAddCalendarEvent();
  const updateEvent = useUpdateCalendarEvent();
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [viewMonth, setViewMonth] = useState(new Date());
  const [showAdd, setShowAdd] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", type: "meeting", time: "", description: "", assignee: "" });

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const eventsByDate = useMemo(() => {
    const map: Record<string, number> = {};
    events?.forEach((e) => {
      const d = e.date.split("T")[0];
      map[d] = (map[d] || 0) + 1;
    });
    return map;
  }, [events]);

  const dayEvents = useMemo(() => {
    return events?.filter((e) => e.date.split("T")[0] === selectedDate) ?? [];
  }, [events, selectedDate]);

  function prevMonth() { setViewMonth(new Date(year, month - 1, 1)); }
  function nextMonth() { setViewMonth(new Date(year, month + 1, 1)); }

  function handleAddEvent(e: React.FormEvent) {
    e.preventDefault();
    addEvent.mutate(
      { ...newEvent, date: selectedDate },
      { onSuccess: () => { setShowAdd(false); setNewEvent({ title: "", type: "meeting", time: "", description: "", assignee: "" }); } }
    );
  }

  return (
    <div>
      <Header title="Calendar" icon="📅" subtitle="Schedule & Events" gradient="from-teal-600 to-cyan-500">
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-lg">
          + Add Event
        </button>
      </Header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mini Calendar */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="text-gray-400 hover:text-white px-2">‹</button>
            <span className="text-white font-semibold text-sm">
              {viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </span>
            <button onClick={nextMonth} className="text-gray-400 hover:text-white px-2">›</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <div key={d} className="text-gray-500 py-1">{d}</div>
            ))}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const isSelected = dateStr === selectedDate;
              const hasEvents = eventsByDate[dateStr] > 0;
              const isToday = dateStr === formatDate(new Date());
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`py-1.5 rounded-lg text-xs transition-colors relative ${
                    isSelected ? "bg-purple-600 text-white" :
                    isToday ? "bg-gray-800 text-white" :
                    "text-gray-300 hover:bg-gray-800"
                  }`}
                >
                  {day}
                  {hasEvents && !isSelected && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-purple-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Events List */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">
            {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            <span className="text-gray-500 text-sm ml-2">({dayEvents.length} events)</span>
          </h2>

          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-800 rounded-lg animate-pulse" />)}</div>
          ) : dayEvents.length > 0 ? (
            <div className="space-y-3">
              {dayEvents.map((event) => (
                <div key={event.id} className={`border rounded-lg p-3 ${EVENT_COLORS[event.type ?? "task"] ?? EVENT_COLORS.task}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      <span className="text-lg">{EVENT_ICONS[event.type ?? "task"] ?? "📌"}</span>
                      <div>
                        <p className={`text-sm font-medium ${event.completed ? "text-gray-500 line-through" : "text-white"}`}>{event.title}</p>
                        {event.time && <p className="text-xs text-gray-400 mt-0.5">{event.time}</p>}
                        {event.description && <p className="text-xs text-gray-500 mt-1">{event.description}</p>}
                        {event.relatedName && (
                          <p className="text-xs text-gray-500 mt-1">→ {event.relatedName}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {event.assignee && <span className="text-xs text-gray-500">{event.assignee}</span>}
                      <button
                        onClick={() => updateEvent.mutate({ id: event.id, completed: !event.completed })}
                        className={`text-xs px-2 py-0.5 rounded ${event.completed ? "bg-gray-800 text-gray-400" : "bg-green-950 text-green-400 hover:bg-green-900"}`}
                      >
                        {event.completed ? "Undo" : "Done"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-sm py-8 text-center">No events on this day</p>
          )}
        </div>
      </div>

      {/* Add Event Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Add Event — {new Date(selectedDate + "T12:00:00").toLocaleDateString()}</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleAddEvent} className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Title *</label>
                <input required value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Type</label>
                  <select value={newEvent.type} onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white">
                    {["meeting", "call", "task", "reminder", "deadline"].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Time</label>
                  <input value={newEvent.time} onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })} placeholder="e.g. 10:00 AM" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Description</label>
                <textarea value={newEvent.description} onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })} rows={2} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
                <button type="submit" disabled={addEvent.isPending} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg disabled:opacity-50">
                  {addEvent.isPending ? "Adding..." : "Add Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
