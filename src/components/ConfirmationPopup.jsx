import Button from "./Button";
import PopupActions from "./PopupActions";
import PopupShell from "./PopupShell";

export default function ConfirmationPopup({ message, onSubmit, onClose }) {
  return (
    <PopupShell
      title={message}
      footer={
        <PopupActions>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" onClick={onSubmit}>
            Submit
          </Button>
        </PopupActions>
      }
    />
  );
}
