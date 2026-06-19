import { useFeedback } from "../FeedbackContext";

export const SidebarFeedback = () => {
  const { onError, onInfo, onWarn } = useFeedback();

  return (
    <div className="flex flex-col gap-4 p-4">
      <button
        className="btn btn-info btn-wide"
        onClick={() => {
          console.log("info", "An info message");
          onInfo("An info message");
        }}
      >
        Send info
      </button>
      <button
        className="btn btn-info btn-wide"
        onClick={() => {
          onInfo("An info message", lorem);
        }}
      >
        Send info with body
      </button>
      <button
        className="btn btn-info btn-wide"
        onClick={() => {
          onInfo(
            "An info message about something very long and wordy that may wrap onto multiple lines and contains more details than it really needs.",
          );
        }}
      >
        Send info with long title
      </button>
      <button
        className="btn btn-info btn-wide"
        onClick={() => {
          onInfo(
            "An info message about something very long and wordy that may wrap onto multiple lines and contains more details than it really needs.",
            lorem,
          );
        }}
      >
        Send info with long title and body
      </button>

      <button
        className="btn btn-warning btn-wide"
        onClick={() => {
          onWarn("A warning message");
        }}
      >
        Send warning
      </button>
      <button
        className="btn btn-warning btn-wide"
        onClick={() => {
          onWarn("A warning message", lorem);
        }}
      >
        Send warning with body
      </button>

      <button
        className="btn btn-error btn-wide"
        onClick={() => {
          onError("An error message");
        }}
      >
        Send error
      </button>
      <button
        className="btn btn-error btn-wide"
        onClick={() => {
          onError("An error message", lorem);
        }}
      >
        Send error with body
      </button>
    </div>
  );
};

const lorem = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`;
