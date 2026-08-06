import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { reset } from "../services/store";
import ConfirmationPopup from "../components/ConfirmationPopup";
import Tabs from "../components/Tabs";
import { useAuth } from "../context/useAuth";

const TAB_IDS = ["profile", "advanced"];
const INPUT_CLASS = "w-full border rounded px-3 py-2";

function ProfileForm() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user.name ?? user.username ?? "");
  const [email, setEmail] = useState(user.email);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setName(user.name ?? user.username ?? "");
    setEmail(user.email);
  }, [user.name, user.username, user.email]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSuccess("");
    const result = updateProfile({ name, email });
    if (result.success) {
      setError("");
      setSuccess(result.message);
    } else {
      setError(result.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
      <div>
        <label htmlFor="profile-name" className="block text-sm font-semibold mb-1">
          Name
        </label>
        <input
          id="profile-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label htmlFor="profile-email" className="block text-sm font-semibold mb-1">
          Email
        </label>
        <input
          id="profile-email"
          type="text"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={INPUT_CLASS}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="text-sm text-green-600">
          {success}
        </p>
      )}
      <button
        type="submit"
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
      >
        Save
      </button>
    </form>
  );
}

function ProfilePanel() {
  return (
    <div className="p-4">
      <ProfileForm />
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
