import { usePushNotifications, isPushSupported } from '../../hooks/usePushNotifications';
import './notificationSettings.css';

// Formats an hour (0-23) as a human-readable 12-hour label, e.g. 20 -> "8:00 PM".
function formatHour(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:00 ${period}`;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export const NotificationSettings = () => {
  const { preferences, loading, error, enable, disable, updateReminderHour } =
    usePushNotifications();

  if (!isPushSupported()) {
    return (
      <div className="Form">
        <h4 className="settingsLabel">Reminders</h4>
        <p className="notificationUnsupported">
          Your browser doesn&apos;t support push notifications, or the app hasn&apos;t been added
          to your home screen yet.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="Form">
        <h4 className="settingsLabel">Reminders</h4>
        <p className="notificationUnsupported">Loading...</p>
      </div>
    );
  }

  return (
    <div className="Form">
      <h4 className="settingsLabel">Reminders</h4>
      <p className="notificationDescription">
        Get a nudge if you haven&apos;t logged a note by a time you choose.
      </p>

      <div className="notificationToggleRow">
        <button
          type="button"
          className={preferences.enabled ? 'notificationToggle on' : 'notificationToggle'}
          onClick={() => (preferences.enabled ? disable() : enable(preferences.reminderHour))}
          role="switch"
          aria-checked={preferences.enabled}
        >
          <span className="notificationToggleKnob"></span>
        </button>
        <span className="notificationToggleLabel">
          {preferences.enabled ? 'Reminders on' : 'Reminders off'}
        </span>
      </div>

      {preferences.enabled && (
        <div className="notificationHourRow">
          <label htmlFor="reminderHour" className="notificationHourLabel">
            Remind me at
          </label>
          <select
            id="reminderHour"
            className="notificationHourSelect"
            value={preferences.reminderHour}
            onChange={(e) => updateReminderHour(Number(e.target.value))}
          >
            {HOURS.map((hour) => (
              <option key={hour} value={hour}>
                {formatHour(hour)}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <p className="notificationError">{error}</p>}
    </div>
  );
};
