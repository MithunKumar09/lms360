"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import useSWR from "swr";

const fetcher = (url) => 
  fetch(url, { headers: { accept: "application/json" } })
    .then((r) => {
      if (!r.ok) {
        throw new Error(`HTTP ${r.status}`);
      }
      return r.json();
    })
    .catch((err) => {
      console.error("Fetch error:", err);
      throw err;
    });

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
        active
          ? "text-white shadow-md font-semibold border-2"
          : "bg-whiteColor dark:bg-whiteColor-dark text-textColor dark:text-textColor-dark border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
      }`}
      style={active ? { backgroundColor: '#5F2DED', borderColor: '#5F2DED' } : {}}
    >
      {children}
    </button>
  );
}

function Section({ title, children, className = "" }) {
  return (
    <div className={`rounded-xl bg-whiteColor dark:bg-whiteColor-dark p-6 shadow-sm border border-gray-100 dark:border-gray-800 ${className}`}>
      {title && (
        <h3 className="text-lg font-semibold text-textColor dark:text-textColor-dark mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

function StatusBadge({ status, verified, className = "" }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
          status === "active"
            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
            : status === "suspended"
            ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
        }`}
      >
        {status || "unknown"}
      </span>
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
          verified
            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
        }`}
      >
        {verified ? "verified" : "unverified"}
      </span>
    </div>
  );
}

function ActionButton({ onClick, children, variant = "outline", className = "" }) {
  const baseClasses = "px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200";
  const variantClasses = {
    outline: "border border-gray-300 dark:border-gray-600 text-textColor dark:text-textColor-dark hover:bg-gray-50 dark:hover:bg-gray-800",
    primary: "bg-primary text-white hover:bg-primary/90 shadow-sm",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm"
  };
  
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export default function UserDetailsMain({ userId, actorRole = "superadmin" }) {
  const [tab, setTab] = useState("profile");
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [avatarError, setAvatarError] = useState(false);

  const { data, isLoading, error: fetchError, mutate } = useSWR(
    userId ? `/api/users/${userId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 5000,
      errorRetryCount: 2,
      errorRetryInterval: 1000,
      onError: (err) => {
        console.error("SWR error:", err);
        setError(err.message || "Failed to load user data");
      },
      onSuccess: () => {
        setError(null);
      }
    }
  );

  const user = data?.user || null;
  const roles = data?.roles || [];
  const links = data?.links || { student: [], instructor: [], parent: [] };
  const sessions = data?.sessions || [];

  const canEditRoles = actorRole === "superadmin" || actorRole === "admin";

  // Reset avatar error when user changes
  useEffect(() => {
    if (user?.id) {
      setAvatarError(false);
    }
  }, [user?.id]);

  const doAction = useCallback(async (action, body = {}) => {
    if (actionLoading) return;
    
    setActionLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      
      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.error || result.message || `Action failed: ${res.status}`);
      }
      
      await mutate();
    } catch (err) {
      console.error("Action error:", err);
      setError(err.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  }, [userId, actionLoading, mutate]);

  // Memoized computed values
  const fullName = useMemo(() => {
    if (!user) return "";
    const parts = [user.first_name, user.last_name].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : user.email;
  }, [user]);

  const lastLogin = useMemo(() => {
    if (!user?.last_login_at) return null;
    try {
      return new Date(user.last_login_at);
    } catch {
      return null;
    }
  }, [user]);

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mb-4"></div>
          <p className="text-sm text-textColor/70 dark:text-textColor-dark/70">Loading user details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (fetchError || !user) {
    return (
      <div className="w-full flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 font-medium mb-2">
            {error || fetchError?.message || "User not found"}
          </p>
          <p className="text-sm text-textColor/70 dark:text-textColor-dark/70">
            Unable to load user details. Please try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 flex-wrap">
        <TabButton active={tab === "profile"} onClick={() => setTab("profile")}>
          Profile
        </TabButton>
        <TabButton active={tab === "roles"} onClick={() => setTab("roles")}>
          Roles
        </TabButton>
        <TabButton active={tab === "links"} onClick={() => setTab("links")}>
          Links
        </TabButton>
        <TabButton active={tab === "sessions"} onClick={() => setTab("sessions")}>
          Sessions
        </TabButton>
      </div>

      {/* Profile Tab */}
      {tab === "profile" && (
        <Section>
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar Section */}
            <div className="flex-shrink-0">
              <div className="relative">
                <img
                  src={avatarError || !user.avatar_url ? "/images/avatar-placeholder.png" : user.avatar_url}
                  alt={fullName}
                  className="h-24 w-24 rounded-full object-cover border-4 border-gray-200 dark:border-gray-700 shadow-md"
                  onError={(e) => {
                    if (!avatarError) {
                      setAvatarError(true);
                      e.target.src = "/images/avatar-placeholder.png";
                    }
                  }}
                  onLoad={() => {
                    if (avatarError) {
                      setAvatarError(false);
                    }
                  }}
                />
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-textColor dark:text-textColor-dark mb-1">
                  {fullName}
                </h2>
                <p className="text-sm text-textColor/70 dark:text-textColor-dark/70">
                  {user.email}
                </p>
              </div>

              {/* User Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <p className="text-xs font-medium text-textColor/60 dark:text-textColor-dark/60 uppercase mb-1">
                    Status
                  </p>
                  <StatusBadge status={user.status} verified={!!user.email_verified_at} />
                </div>
                {lastLogin && (
                  <div>
                    <p className="text-xs font-medium text-textColor/60 dark:text-textColor-dark/60 uppercase mb-1">
                      Last Login
                    </p>
                    <p className="text-sm text-textColor dark:text-textColor-dark">
                      {lastLogin.toLocaleString()}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-textColor/60 dark:text-textColor-dark/60 uppercase mb-1">
                    MFA Status
                  </p>
                  <p className="text-sm text-textColor dark:text-textColor-dark">
                    {user.mfa_required ? (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                        Enabled ({user.mfa_method || "TOTP"})
                      </span>
                    ) : (
                      <span className="text-textColor/60 dark:text-textColor-dark/60">Disabled</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-textColor/60 dark:text-textColor-dark/60 uppercase mb-1">
                    Member Since
                  </p>
                  <p className="text-sm text-textColor dark:text-textColor-dark">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                {user.status === "active" ? (
                  <ActionButton
                    onClick={() => doAction("suspend")}
                    variant="danger"
                    className={actionLoading ? "opacity-50 cursor-not-allowed" : ""}
                    disabled={actionLoading}
                  >
                    Suspend User
                  </ActionButton>
                ) : (
                  <ActionButton
                    onClick={() => doAction("activate")}
                    variant="primary"
                    className={actionLoading ? "opacity-50 cursor-not-allowed" : ""}
                    disabled={actionLoading}
                  >
                    Activate User
                  </ActionButton>
                )}
                <ActionButton
                  onClick={() => doAction("force_reset_password")}
                  variant="outline"
                  className={actionLoading ? "opacity-50 cursor-not-allowed" : ""}
                  disabled={actionLoading}
                >
                  Force Reset Password
                </ActionButton>
                <ActionButton
                  onClick={() => doAction("toggle_mfa", { enable: !(user.mfa_required ?? false) })}
                  variant="outline"
                  className={actionLoading ? "opacity-50 cursor-not-allowed" : ""}
                  disabled={actionLoading}
                >
                  {user.mfa_required ? "Disable MFA" : "Enable MFA"}
                </ActionButton>
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* Roles Tab */}
      {tab === "roles" && (
        <Section>
          <div className="space-y-6">
            {/* Assigned Roles */}
            <div>
              <h4 className="text-base font-semibold text-textColor dark:text-textColor-dark mb-3">
                Assigned Roles
              </h4>
              {roles.length === 0 ? (
                <p className="text-sm text-textColor/70 dark:text-textColor-dark/70 py-4">
                  No roles assigned.
                </p>
              ) : (
                <div className="space-y-2">
                  {roles.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-primary/10 text-primary">
                          {r.code}
                        </span>
                        <span className="text-sm text-textColor dark:text-textColor-dark">
                          {r.org_label || "Global"}
                        </span>
                      </div>
                      {canEditRoles && (
                        <ActionButton
                          onClick={() => doAction("remove_role", { roleCode: r.code, orgId: r.org_id || null })}
                          variant="outline"
                          className="text-xs"
                          disabled={actionLoading}
                        >
                          Remove
                        </ActionButton>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Section>
      )}

      {/* Links Tab */}
      {tab === "links" && (
        <Section>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="text-base font-semibold text-textColor dark:text-textColor-dark mb-3">
                Student Links
              </h4>
              {links.student?.length > 0 ? (
                <div className="space-y-2">
                  {links.student.map((l) => (
                    <div
                      key={l.id}
                      className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                    >
                      <div className="font-medium text-textColor dark:text-textColor-dark">
                        {l.cohort_code}
                      </div>
                      {l.section_label && (
                        <div className="text-textColor/70 dark:text-textColor-dark/70">
                          Section: {l.section_label}
                        </div>
                      )}
                      {l.roll_no && (
                        <div className="text-textColor/70 dark:text-textColor-dark/70">
                          Roll: {l.roll_no}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-textColor/70 dark:text-textColor-dark/70 py-2">None</p>
              )}
            </div>
            <div>
              <h4 className="text-base font-semibold text-textColor dark:text-textColor-dark mb-3">
                Instructor Links
              </h4>
              {links.instructor?.length > 0 ? (
                <div className="space-y-2">
                  {links.instructor.map((l) => (
                    <div
                      key={l.id}
                      className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                    >
                      <div className="font-medium text-textColor dark:text-textColor-dark">
                        {l.org_label || "Organization"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-textColor/70 dark:text-textColor-dark/70 py-2">None</p>
              )}
            </div>
            <div>
              <h4 className="text-base font-semibold text-textColor dark:text-textColor-dark mb-3">
                Parent Links
              </h4>
              {links.parent?.length > 0 ? (
                <div className="space-y-2">
                  {links.parent.map((l) => (
                    <div
                      key={l.id}
                      className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                    >
                      <div className="font-medium text-textColor dark:text-textColor-dark">
                        Student: {l.student_email}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-textColor/70 dark:text-textColor-dark/70 py-2">None</p>
              )}
            </div>
          </div>
        </Section>
      )}

      {/* Sessions Tab */}
      {tab === "sessions" && (
        <Section>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-semibold text-textColor dark:text-textColor-dark">
                Active Sessions
              </h4>
              {sessions.some((s) => !s.revoked_at) && (
                <ActionButton
                  onClick={() => doAction("revoke_sessions")}
                  variant="danger"
                  className="text-xs"
                  disabled={actionLoading}
                >
                  Revoke All
                </ActionButton>
              )}
            </div>
            {sessions.length === 0 ? (
              <p className="text-sm text-textColor/70 dark:text-textColor-dark/70 py-4">
                No active sessions.
              </p>
            ) : (
              <div className="space-y-2">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-textColor dark:text-textColor-dark">
                            Created:
                          </span>
                          <span className="text-textColor/70 dark:text-textColor-dark/70">
                            {new Date(s.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-textColor dark:text-textColor-dark">
                            Last seen:
                          </span>
                          <span className="text-textColor/70 dark:text-textColor-dark/70">
                            {new Date(s.last_seen_at).toLocaleString()}
                          </span>
                        </div>
                        {s.ip && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-textColor dark:text-textColor-dark">IP:</span>
                            <span className="text-textColor/70 dark:text-textColor-dark/70 font-mono text-xs">
                              {s.ip}
                            </span>
                          </div>
                        )}
                        {s.ua && (
                          <div className="flex items-start gap-2">
                            <span className="font-medium text-textColor dark:text-textColor-dark">UA:</span>
                            <span className="text-textColor/70 dark:text-textColor-dark/70 text-xs break-all">
                              {s.ua.length > 100 ? `${s.ua.substring(0, 100)}...` : s.ua}
                            </span>
                          </div>
                        )}
                        {s.revoked_at && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                            Revoked
                          </span>
                        )}
                      </div>
                      {!s.revoked_at && (
                        <ActionButton
                          onClick={() => doAction("revoke_session", { sessionId: s.id })}
                          variant="outline"
                          className="text-xs flex-shrink-0"
                          disabled={actionLoading}
                        >
                          Revoke
                        </ActionButton>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>
      )}

    </div>
  );
}
