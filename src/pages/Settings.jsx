import { useState } from "react";
import { reset } from "../services/store";
import ConfirmationPopup from "../components/ConfirmationPopup";

export default function Settings() {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleReset = () => {
    reset();
    setShowResetConfirm(false);
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Settings</h1>
      <button
        type="button"
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
        onClick={() => setShowResetConfirm(true)}
      >
        Reset demo data
      </button>
      {showResetConfirm && (
        <ConfirmationPopup
          message="Reset all data to the demo seed? This cannot be undone."
          onSubmit={handleReset}
          onClose={() => setShowResetConfirm(false)}
        />
      )}
    </div>
  );
}
