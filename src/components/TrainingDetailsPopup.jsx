import React from "react";

export default function TrainingDetailsPopup({ training, onClose, onEdit }) {
  if (!training) return null;

  return (
    <div className="fixed inset-0 bg-black/[var(--bg-opacity)] [--bg-opacity:50%] flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-2xl shadow-md w-full max-w-md text-black">
        <h2 className="text-xl mb-4 font-bold">Training Details</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Date & Time</label>
            <div className="w-full border px-3 py-2 rounded bg-gray-100">
              {training.day instanceof Date
                ? training.day.toLocaleString()
                : new Date(training.day).toLocaleString()}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">
              Duration (minutes)
            </label>
            <div className="w-full border px-3 py-2 rounded bg-gray-100">
              {training.duration}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">Exercises</label>
            <ul>
              {training.exercises && training.exercises.length > 0 ? (
                training.exercises.map((ex) => (
                  <li
                    key={ex.id}
                    className="bg-gray-100 rounded px-2 py-1 mb-1"
                  >
                    {ex.description}
                  </li>
                ))
              ) : (
                <li className="text-gray-500">No exercises</li>
              )}
            </ul>
          </div>
          <div className="flex justify-end space-x-2 mt-4">
            <button
              type="button"
              className="px-4 py-2 bg-gray-300 text-white rounded"
              onClick={onClose}
            >
              Close
            </button>
            <button
              type="button"
              className="px-4 py-2 bg-blue-600 text-white rounded"
              onClick={onEdit}
            >
              Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
