
import { useState, useEffect, useRef } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Users,
  Truck,
  ShoppingBag,
  RotateCcw,
  Receipt,
  ChartNoAxesCombined,
  Menu,
  X,
  LogOut,
  Store,
  Bell,
  Search,
  CheckCheck,
  Camera,
} from "lucide-react";

const menuItems = [
  { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Products", path: "/admin/products", icon: Package },
  { name: "Staff", path: "/admin/staff", icon: Users },
  { name: "Suppliers", path: "/admin/suppliers", icon: Truck },
  { name: "Purchases", path: "/admin/purchases", icon: ShoppingBag },
  { name: "Returns", path: "/admin/returns", icon: RotateCcw },
  { name: "Transactions", path: "/admin/transactions", icon: Receipt },
  { name: "Reports", path: "/admin/reports", icon: ChartNoAxesCombined },
];

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("crudifyUser") || "{}");
  } catch {
    return {};
  }
};

function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  const [user, setUser] = useState(getStoredUser);

  const [profileName, setProfileName] = useState(user.name || "");
  const [profileEmail, setProfileEmail] = useState(user.email || "");
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [removePhoto, setRemovePhoto] = useState(false);

  const navigate = useNavigate();
  const notificationRef = useRef(null);
  const token = localStorage.getItem("crudifyToken");

  const fetchNotifications = async () => {
    try {
      const response = await fetch(
        "https://crudify-backend-qvx1.onrender.com/api/notifications",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) return;

      const data = await response.json();

      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  useEffect(() => {
    if (!token) return;

    fetchNotifications();

    const interval = setInterval(fetchNotifications, 15000);

    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.isRead) {
        await fetch(
          `https://crudify-backend-qvx1.onrender.com/api/notifications/${notification._id}/read`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }

      setNotifications((previous) =>
        previous.map((item) =>
          item._id === notification._id
            ? { ...item, isRead: true }
            : item
        )
      );

      setUnreadCount((previous) =>
        notification.isRead ? previous : Math.max(0, previous - 1)
      );

      setNotificationsOpen(false);
      navigate("/admin/notifications");
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const response = await fetch(
        "https://crudify-backend-qvx1.onrender.com/api/notifications/read-all",
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) return;

      setNotifications((previous) =>
        previous.map((item) => ({ ...item, isRead: true }))
      );

      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
    }
  };

  const openProfile = () => {
    setProfileName(user.name || "");
    setProfileEmail(user.email || "");
    setSelectedPhoto(null);
    setPhotoPreview("");
    setRemovePhoto(false);
    setProfileMessage("");
    setEditingProfile(false);
    setShowProfile(true);
    setProfileMenuOpen(false);
  };

  const closeProfile = () => {
    setShowProfile(false);
    setEditingProfile(false);
    setSelectedPhoto(null);
    setPhotoPreview("");
    setRemovePhoto(false);
    setProfileMessage("");
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setProfileMessage("Please select a JPG, PNG or WEBP image.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileMessage("Image size must be less than 5 MB.");
      event.target.value = "";
      return;
    }

    setSelectedPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setRemovePhoto(false);
    setProfileMessage("");
  };

  const handleRemovePhoto = () => {
    setSelectedPhoto(null);
    setPhotoPreview("");
    setRemovePhoto(true);
    setProfileMessage("");
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();

    if (!profileName.trim() || !profileEmail.trim()) {
      setProfileMessage("Name and email are required.");
      return;
    }

    try {
      setProfileSaving(true);
      setProfileMessage("");

      const formData = new FormData();
      formData.append("name", profileName.trim());
      formData.append("email", profileEmail.trim());

      if (selectedPhoto) {
        formData.append("image", selectedPhoto);
      }

      if (removePhoto) {
        formData.append("removeProfileImage", "true");
      }

      const response = await fetch(
        "https://crudify-backend-qvx1.onrender.com/api/auth/profile",
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update profile.");
      }

      const updatedUser = data.user;

      setUser(updatedUser);
      localStorage.setItem("crudifyUser", JSON.stringify(updatedUser));

      setProfileName(updatedUser.name || "");
      setProfileEmail(updatedUser.email || "");
      setSelectedPhoto(null);
      setPhotoPreview("");
      setRemovePhoto(false);
      setEditingProfile(false);
      setProfileMessage("Profile updated successfully!");
    } catch (error) {
      setProfileMessage(
        error.message || "Something went wrong while updating your profile."
      );
    } finally {
      setProfileSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("crudifyToken");
    localStorage.removeItem("crudifyUser");
    navigate("/");
  };

  const profileImageUrl =
    user.profileImage && !removePhoto
      ? `https://crudify-backend-qvx1.onrender.com${user.profileImage}`
      : "";

  const displayedProfileImage = photoPreview || profileImageUrl;

  const ProfileAvatar = ({ className = "profile-avatar" }) => (
    <div className={className}>
      {user.profileImage ? (
        <img
          src={profileImageUrl || `https://crudify-backend-qvx1.onrender.com${user.profileImage}`}
          alt={user.name || "Admin"}
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : (
        user.name?.charAt(0)?.toUpperCase() || "A"
      )}
    </div>
  );

  return (
    <div className="admin-layout">
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`admin-sidebar ${sidebarOpen ? "sidebar-open" : ""}`}
      >
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <Store size={22} />
          </div>

          <div>
            <h2>CRUDIFY</h2>
            <span>RETAIL MANAGEMENT</span>
          </div>

          <button
            className="mobile-close"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={21} />
          </button>
        </div>

        <div className="sidebar-section-label">MAIN MENU</div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/admin/dashboard"}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? "active" : ""}`
                }
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={19} strokeWidth={1.8} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}

          <NavLink
            to="/admin/notifications"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
            onClick={() => setSidebarOpen(false)}
          >
            <Bell size={19} strokeWidth={1.8} />
            <span>Notifications</span>

            {unreadCount > 0 && (
              <span className="notification-nav-count">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </NavLink>
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <div className="help-icon">✦</div>

            <div>
              <strong>CRUDIFY POS</strong>
              <p>Smart retail workspace</p>
            </div>
          </div>

          <button className="logout-button" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div className="topbar-left">
            <button
              className="menu-toggle"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={23} />
            </button>

            <div className="topbar-search">
              <Search size={17} />
              <input placeholder="Search anything..." />
              <span>⌘ K</span>
            </div>
          </div>

          <div className="topbar-right">
            <div className="notification-wrapper" ref={notificationRef}>
              <button
                className="notification-button"
                aria-label="Notifications"
                onClick={() => {
                  setNotificationsOpen((previous) => !previous);
                  fetchNotifications();
                }}
              >
                <Bell size={19} />

                {unreadCount > 0 && (
                  <span className="notification-dot">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="notification-dropdown">
                  <div className="notification-dropdown-header">
                    <div>
                      <strong>Notifications</strong>
                      <span>{unreadCount} unread</span>
                    </div>

                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead}>
                        <CheckCheck size={15} />
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="notification-dropdown-list">
                    {notifications.length === 0 ? (
                      <div className="notification-empty">
                        <Bell size={25} />
                        <p>No notifications yet</p>
                      </div>
                    ) : (
                      notifications.slice(0, 6).map((item) => (
                        <button
                          key={item._id}
                          className={`notification-item ${
                            item.isRead ? "read" : "unread"
                          }`}
                          onClick={() => handleNotificationClick(item)}
                        >
                          <span className="notification-item-icon">
                            <Bell size={16} />
                          </span>

                          <span className="notification-item-content">
                            <strong>{item.title}</strong>
                            <span>{item.message}</span>
                            <small>
                              {new Date(item.createdAt).toLocaleString()}
                            </small>
                          </span>

                          {!item.isRead && (
                            <span className="notification-unread-dot" />
                          )}
                        </button>
                      ))
                    )}
                  </div>

                  <button
                    className="notification-view-all"
                    onClick={() => {
                      setNotificationsOpen(false);
                      navigate("/admin/notifications");
                    }}
                  >
                    View all notifications
                  </button>
                </div>
              )}
            </div>

            <div className="profile-menu-wrapper">
              <button
                className="topbar-profile profile-trigger"
                onClick={() => setProfileMenuOpen((previous) => !previous)}
              >
                <ProfileAvatar />

                <div className="profile-details">
                  <strong>{user.name || "Admin"}</strong>
                  <span>{user.role || "Administrator"}</span>
                </div>
              </button>

              {profileMenuOpen && (
                <div className="profile-dropdown">
                  <div className="profile-dropdown-heading">
                    <ProfileAvatar />

                    <div>
                      <strong>{user.name || "Admin"}</strong>
                      <span>{user.email || ""}</span>
                    </div>
                  </div>

                  <div className="profile-dropdown-divider" />

                  <button onClick={openProfile}>
                    <Users size={17} />
                    View Profile
                  </button>

                  <button
                    className="profile-logout"
                    onClick={handleLogout}
                  >
                    <LogOut size={17} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {showProfile && (
          <div className="profile-modal-overlay" onClick={closeProfile}>
            <div
              className="profile-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                className="profile-modal-close"
                onClick={closeProfile}
                type="button"
              >
                <X size={20} />
              </button>

              <form onSubmit={handleProfileSave}>
                <div className="admin-profile-photo">
                  {displayedProfileImage ? (
                    <img
                      src={displayedProfileImage}
                      alt="Admin profile"
                    />
                  ) : (
                    <span>
                      {user.name?.charAt(0)?.toUpperCase() || "A"}
                    </span>
                  )}
                </div>

                {editingProfile && (
                  <div className="admin-photo-actions">
                    <label className="admin-change-photo">
                      <Camera size={15} />
                      Change Photo

                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        hidden
                        onChange={handlePhotoChange}
                      />
                    </label>

                    {(user.profileImage || selectedPhoto) && (
                      <button
                        type="button"
                        className="admin-remove-photo"
                        onClick={handleRemovePhoto}
                      >
                        Remove Photo
                      </button>
                    )}
                  </div>
                )}

                <h2>{user.name || "Admin"}</h2>

                <p className="profile-modal-role">
                  {user.role || "Administrator"}
                </p>

                {profileMessage && (
                  <p className="admin-profile-message">
                    {profileMessage}
                  </p>
                )}

                <div className="profile-info-row">
                  <span>Full Name</span>

                  {editingProfile ? (
                    <input
                      className="admin-profile-input"
                      type="text"
                      value={profileName}
                      onChange={(event) =>
                        setProfileName(event.target.value)
                      }
                      required
                    />
                  ) : (
                    <strong>{user.name || "—"}</strong>
                  )}
                </div>

                <div className="profile-info-row">
                  <span>Email Address</span>

                  {editingProfile ? (
                    <input
                      className="admin-profile-input"
                      type="email"
                      value={profileEmail}
                      onChange={(event) =>
                        setProfileEmail(event.target.value)
                      }
                      required
                    />
                  ) : (
                    <strong>{user.email || "—"}</strong>
                  )}
                </div>

                <div className="profile-info-row">
                  <span>Account Role</span>
                  <strong>{user.role || "Admin"}</strong>
                </div>

                <div className="admin-profile-actions">
                  {editingProfile ? (
                    <>
                      <button
                        type="button"
                        className="admin-profile-cancel"
                        onClick={() => {
                          setEditingProfile(false);
                          setProfileName(user.name || "");
                          setProfileEmail(user.email || "");
                          setSelectedPhoto(null);
                          setPhotoPreview("");
                          setRemovePhoto(false);
                          setProfileMessage("");
                        }}
                        disabled={profileSaving}
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className="admin-profile-save"
                        disabled={profileSaving}
                      >
                        {profileSaving ? "Saving..." : "Save Changes"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="admin-profile-save"
                      onClick={() => {
                        setProfileName(user.name || "");
                        setProfileEmail(user.email || "");
                        setEditingProfile(true);
                        setProfileMessage("");
                      }}
                    >
                      Edit Profile
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="admin-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default AdminLayout;
