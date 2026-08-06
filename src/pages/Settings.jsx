import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { reset } from "../services/store";
import ConfirmationPopup from "../components/ConfirmationPopup";
import Tabs from "../components/Tabs";
import { useAuth } from "../context/useAuth";

const TAB_IDS = ["profile", "advanced"];

function ProfilePanel() {
  const { user } = useAuth();

  return (
    <div className="p-4 space-y-2">
      {user.username && (
        <p>
          <span className="font-semibold">Name:</span> {user.username}
        </p>
      )}
      <p>
        <span className="font-semibold">Email:</span> {user.email}
      </p>
      <p className="text-sm text-gray-500">
        Editing your profile is coming soon.
      </p>
    </div>
  );
}

function AdvancedPanel() {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleReset = () => {
    reset();
    setShowResetConfirm(false);
  };

  return (
    <div className="p-4">
      <p className="text-sm text-gray-600 mb-3">
        Resetting clears all your teams, players, trainings and games, and
        restores the original demo data. This cannot be undone.
      </p>
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

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = TAB_IDS.includes(tabParam) ? tabParam : "profile";

  const handleChange = (id) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", id);
      return next;
    });
  };

  const tabs = [
    { id: "profile", label: "Profile", panel: <ProfilePanel /> },
    { id: "advanced", label: "Advanced", panel: <AdvancedPanel /> },
  ];

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Settings</h1>
      <Tabs tabs={tabs} active={activeTab} onChange={handleChange} />
    </div>
  );
}
