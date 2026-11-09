
import { useEffect, useState } from "react";
import {
  Bell, CheckCheck, Trash2, RotateCcw,
  CheckCircle, XCircle, Clock
} from "lucide-react";
import "./Notifications.css";

const API = "https://crudify-backend-qvx1.onrender.com/api/notifications";

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [message, setMessage] = useState("");

  const token = localStorage.getItem("crudifyToken");

  const fetchNotifications = async () => {
    try {
      const response = await fetch(API, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load notifications");
      }

      setNotifications(data.notifications || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id) => {
    try {
      const response = await fetch(`${API}/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Could not mark as read");

      setNotifications((previous) =>
        previous.map((item) =>
          item._id === id ? { ...item, isRead: true } : item
        )
      );
    } catch (error) {
      setMessage(error.message);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch(`${API}/read-all`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Could not update notifications");

      setNotifications((previous) =>
        previous.map((item) => ({ ...item, isRead: true }))
      );
    } catch (error) {
      setMessage(error.message);
    }
  };

  const deleteNotification = async (id) => {
    try {
      const response = await fetch(`${API}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Could not delete notification");

      setNotifications((previous) =>
        previous.filter((item) => item._id !== id)
      );
    } catch (error) {
      setMessage(error.message);
    }
  };

  const filteredNotifications = notifications.filter((item) => {
    if (filter === "Unread") return !item.isRead;
    if (filter === "Read") return item.isRead;
    return true;
  });

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  const getIcon = (type) => {
    if (type === "Approval") return <CheckCircle size={19} />;
    if (type === "Rejection") return <XCircle size={19} />;
    if (type === "Return") return <RotateCcw size={19} />;
    return <Bell size={19} />;
  };

  return (
    <div className="notifications-page">
      <div className="notifications-heading">
        <div>
          <span className="page-eyebrow">ACTIVITY CENTRE</span>
          <h1>Notifications</h1>
          <p>Stay updated with return requests and important activities.</p>
        </div>

        <button
          className="mark-all-button"
          onClick={markAllAsRead}
          disabled={unreadCount === 0}
        >
          <CheckCheck size={17} />
          Mark all as read
        </button>
      </div>

      <div className="notification-summary">
        <div>
          <span>Total notifications</span>
          <strong>{notifications.length}</strong>
        </div>
        <div>
          <span>Unread notifications</span>
          <strong>{unreadCount}</strong>
        </div>
      </div>

      <div className="notifications-panel">
        <div className="notifications-toolbar">
          <div className="notification-filters">
            {["All", "Unread", "Read"].map((item) => (
              <button
                key={item}
                className={filter === item ? "selected" : ""}
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <button
            className="refresh-notifications"
            onClick={fetchNotifications}
          >
            <RotateCcw size={15} />
            Refresh
          </button>
        </div>

        {message && <div className="notification-error">{message}</div>}

        {loading ? (
          <div className="notifications-empty">Loading notifications...</div>
        ) : filteredNotifications.length === 0 ? (
          <div className="notifications-empty">
            <Bell size={35} />
            <h3>No notifications found</h3>
            <p>New activity will appear here.</p>
          </div>
        ) : (
          <div className="notifications-list">
            {filteredNotifications.map((item) => (
              <div
                key={item._id}
                className={`notification-card ${
                  item.isRead ? "notification-read" : "notification-unread"
                }`}
              >
                <div className={`notification-type-icon ${item.type}`}>
                  {getIcon(item.type)}
                </div>

                <div className="notification-card-content">
                  <div className="notification-card-title">
                    <h3>{item.title}</h3>
                    {!item.isRead && <span className="unread-label">NEW</span>}
                  </div>

                  <p>{item.message}</p>

                  <span className="notification-date">
                    <Clock size={13} />
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="notification-card-actions">
                  {!item.isRead && (
                    <button
                      title="Mark as read"
                      onClick={() => markAsRead(item._id)}
                    >
                      <CheckCheck size={17} />
                    </button>
                  )}

                  <button
                    title="Delete notification"
                    onClick={() => deleteNotification(item._id)}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Notifications;
