import PopupShell from "./PopupShell";

export default function ConfirmationPopup({ message, onSubmit, onClose }) {
  return (
    <PopupShell
      title={message}
      footer={
        <div className="flex justify-center space-x-2">
          <button
            type="button"
            className="px-4 py-2 bg-red-500 text-white rounded"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-green-500 text-white rounded"
            onClick={onSubmit}
          >
            Submit
          </button>
        </div>
      }
    />
  );
}
