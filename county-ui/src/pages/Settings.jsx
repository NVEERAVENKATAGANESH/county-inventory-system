/**
 * Settings.jsx (Client-friendly)
 *
 * Client-facing settings only:
 *  - Profile (view + edit)
 *  - Security (change password)
 *  - Preferences (theme)
 *  - Account (sign out)
 *
 * Dev/debug sections intentionally removed:
 *  - Role switching
 *  - Session headers (dept code, acting role)
 *  - System health / KPIs
 *  - API endpoint list
 */

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, fmtApiError, portalLogout, showToast } from "../api";
import { useTheme } from "../context/ThemeContext.jsx";
import {
  User,
  Mail,
  Shield,
  KeyRound,
  Palette,
  Sun,
  Moon,
  LogOut,
  Save,
  X,
  Loader2,
  PencilLine,
  Eye,
  EyeOff,
} from "lucide-react";

const css = `
.st2{font-family:'DM Sans',system-ui,sans-serif;color:var(--text);max-width:980px}
.st2-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:18px}
.st2-title{font-size:28px;font-weight:800;color:var(--page-title);letter-spacing:-.5px;margin:0}
.st2-sub{font-size:14px;color:var(--page-sub);margin:4px 0 0}
.st2-grid{display:grid;grid-template-columns:260px 1fr;gap:16px;align-items:start}
@media(max-width:860px){.st2-grid{grid-template-columns:1fr}.st2-nav{position:sticky;top:0}}

.st2-card{background:var(--page-card-bg);border:1px solid var(--page-card-border);border-radius:16px;overflow:hidden}
.st2-nav{position:sticky;top:14px}
.st2-navHead{padding:14px 14px 10px;border-bottom:1px solid var(--page-card-border)}
.st2-navUser{display:flex;align-items:center;gap:12px}
.st2-ava{width:40px;height:40px;border-radius:12px;flex-shrink:0;background:linear-gradient(135deg,var(--blue-text,#6366f1),var(--purple-text,#8b5cf6));display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;letter-spacing:-.5px}
.st2-uName{font-size:14px;font-weight:700;color:var(--page-title);line-height:1.1}
.st2-uMeta{font-size:12px;color:var(--page-sub);margin-top:2px}
.st2-badge{display:inline-flex;align-items:center;gap:6px;margin-top:7px;font-size:11px;font-family:'DM Mono',monospace;padding:2px 8px;border-radius:999px;background:var(--blue-dim);border:1px solid var(--blue-dim);color:var(--blue-text)}

.st2-navList{padding:8px}
.st2-navBtn{width:100%;display:flex;align-items:center;gap:10px;padding:10px 10px;border-radius:12px;border:1px solid transparent;background:transparent;color:var(--text);cursor:pointer;font-family:inherit;font-size:14px}
.st2-navBtn:hover{background:var(--bg-panel2);border-color:var(--page-card-border)}
.st2-navBtn.active{background:var(--accent-dim);border-color:var(--accent);color:var(--accent-text)}
.st2-navIco{width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:var(--bg-panel2);border:1px solid var(--page-card-border)}
.st2-navBtn.active .st2-navIco{background:var(--accent-dim);border-color:var(--accent);color:var(--accent-text)}

.st2-mainHead{padding:16px 18px;border-bottom:1px solid var(--page-card-border)}
.st2-mainTitle{font-size:15px;font-weight:800;color:var(--page-title);margin:0}
.st2-mainDesc{font-size:13px;color:var(--page-sub);margin:6px 0 0;line-height:1.6}

.st2-body{padding:16px 18px}
.st2-row{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:12px 0;border-bottom:1px solid var(--page-card-border)}
.st2-row:last-child{border-bottom:none}
.st2-lbl{font-size:12px;font-weight:700;color:var(--page-th-text);text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px}
.st2-hint{font-size:12.5px;color:var(--page-sub);line-height:1.55}
.st2-right{min-width:320px;max-width:420px;width:100%}
@media(max-width:860px){.st2-right{min-width:unset;max-width:unset}}

.st2-input{width:100%;padding:10px 12px;border-radius:12px;border:1px solid var(--page-card-border);background:var(--page-card-bg);color:var(--text);font-size:14px;font-family:inherit;outline:none;transition:border-color .12s}
.st2-input:focus{border-color:var(--accent)}
.st2-input:disabled{opacity:.55;cursor:not-allowed}
.st2-2col{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media(max-width:640px){.st2-2col{grid-template-columns:1fr}}

.st2-btn{padding:10px 14px;border-radius:12px;font-size:14px;font-weight:600;font-family:inherit;cursor:pointer;transition:all .13s;border:1px solid var(--page-btn-border);background:var(--page-btn-bg);color:var(--page-btn-text);display:inline-flex;align-items:center;gap:8px}
.st2-btn:hover{border-color:var(--border-md);background:var(--bg-panel2);color:var(--text)}
.st2-btn:disabled{opacity:.55;cursor:not-allowed}
.st2-btn.primary{background:var(--blue-dim);border-color:var(--blue-dim);color:var(--blue-text)}
.st2-btn.primary:hover{filter:brightness(1.08)}
.st2-btn.danger{background:var(--red-dim);border-color:var(--red-dim);color:var(--red-text)}
.st2-btn.danger:hover{filter:brightness(1.08)}
.st2-note{margin-top:10px;font-size:12.5px;color:var(--page-sub);line-height:1.55}

.st2-themeGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media(max-width:640px){.st2-themeGrid{grid-template-columns:1fr}}
.st2-theme{padding:14px;border-radius:14px;border:2px solid var(--page-card-border);background:var(--page-card-bg);cursor:pointer;transition:all .15s;display:flex;flex-direction:column;gap:10px}
.st2-theme:hover:not(.active){border-color:var(--border-md)}
.st2-theme.active{border-color:var(--accent);background:var(--accent-dim)}
.st2-themeName{display:flex;align-items:center;gap:8px;font-weight:800}
.st2-theme.active .st2-themeName{color:var(--accent-text)}
.st2-preview{border-radius:10px;height:58px;overflow:hidden;border:1px solid rgba(255,255,255,.06);display:flex}
.st2-previewSide{width:32%;background:#060e1c}
.st2-previewMain{flex:1;background:#0a1526;padding:7px;display:flex;flex-direction:column;gap:5px}
.st2-bar{height:7px;border-radius:4px;background:#1e3a5f}
.st2-bar.ac{background:#38bdf8;width:52%}
.st2-preview.light .st2-previewSide{background:#fff}
.st2-preview.light .st2-previewMain{background:#eef2fa}
.st2-preview.light .st2-bar{background:#c7d4ec}
.st2-preview.light .st2-bar.ac{background:#6366f1}

.st2-pwWrap{position:relative}
.st2-eye{position:absolute;right:8px;top:50%;transform:translateY(-50%);width:32px;height:32px;border-radius:10px;border:1px solid transparent;background:transparent;color:var(--page-th-text);display:flex;align-items:center;justify-content:center;cursor:pointer}
.st2-eye:hover{background:var(--bg-panel2);border-color:var(--page-card-border);color:var(--text)}

.spinning{animation:spin .9s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
`;

const TABS = [
  { id: "profile", label: "Profile", icon: User, desc: "Update your personal information" },
  { id: "security", label: "Security", icon: Shield, desc: "Password and sign-in security" },
  { id: "preferences", label: "Preferences", icon: Palette, desc: "Theme and interface options" },
  { id: "account", label: "Account", icon: LogOut, desc: "Sign out and session actions" },
];

export default function Settings() {
  const nav = useNavigate();
  const { theme, setTheme } = useTheme();

  const [tab, setTab] = useState("profile");
  const [me, setMe] = useState(null);
  const [loadingMe, setLoadingMe] = useState(true);

  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({
    first_name: "",
    last_name: "",
    username: "",
    email: "",
    current_password: "",
  });

  const [showCurrentPw, setShowCurrentPw] = useState(false);

  async function loadMe() {
    setLoadingMe(true);
    try {
      const r = await api.get("/api/me/");
      setMe(r.data);
      setProfile({
        first_name: r.data?.first_name || "",
        last_name: r.data?.last_name || "",
        username: r.data?.username || (localStorage.getItem("username") || ""),
        email: r.data?.email || "",
        current_password: "",
      });
    } catch (err) {
      showToast(fmtApiError(err), "error");
      setMe(null);
    }
    setLoadingMe(false);
  }

  useEffect(() => { loadMe(); }, []);

  const avatarInitials = useMemo(() => {
    const base = me?.username || localStorage.getItem("username") || "U";
    const ini = `${me?.first_name?.[0] || ""}${me?.last_name?.[0] || ""}`.toUpperCase();
    return ini || base.slice(0, 2).toUpperCase();
  }, [me]);

  const displayName = useMemo(() => {
    const n = `${me?.first_name || ""} ${me?.last_name || ""}`.trim();
    return n || me?.username || localStorage.getItem("username") || "User";
  }, [me]);

  const roleLabel = (me?.role || localStorage.getItem("actingRole") || "employee").replaceAll("_", " ");

  const usernameChanged = me && profile.username.trim() !== (me.username || "");
  const emailChanged = me && (profile.email || "").trim() !== (me.email || "");
  const needsPassword = usernameChanged || emailChanged;

  function resetProfileForm() {
    if (!me) return;
    setProfile({
      first_name: me.first_name || "",
      last_name: me.last_name || "",
      username: me.username || "",
      email: me.email || "",
      current_password: "",
    });
  }

  async function saveProfile() {
    if (!me) return;
    setSaving(true);
    try {
      const payload = {
        first_name: profile.first_name,
        last_name: profile.last_name,
        username: profile.username,
        email: profile.email,
      };
      if (needsPassword) payload.current_password = profile.current_password;

      const r = await api.patch("/api/me/", payload);
      setMe(r.data);
      setEditMode(false);
      setProfile((p) => ({ ...p, current_password: "" }));

      if (r.data?.username) localStorage.setItem("username", r.data.username);

      showToast("Profile updated.", "success");
    } catch (err) {
      showToast(fmtApiError(err), "error");
    }
    setSaving(false);
  }

  function logout() {
    portalLogout();
    nav("/login");
  }

  const activeTab = TABS.find((t) => t.id === tab) || TABS[0];

  return (
    <>
      <style>{css}</style>
      <div className="st2">
        <div className="st2-head">
          <div>
            <h1 className="st2-title">Settings</h1>
            <p className="st2-sub">Manage your profile, security, and preferences</p>
          </div>
        </div>

        <div className="st2-grid">
          {/* Left nav */}
          <div className="st2-card st2-nav">
            <div className="st2-navHead">
              <div className="st2-navUser">
                <div className="st2-ava">{avatarInitials}</div>
                <div>
                  <div className="st2-uName">{displayName}</div>
                  <div className="st2-uMeta">{me?.email || ""}</div>
                  <div className="st2-badge">
                    <Shield size={13} /> {roleLabel}
                  </div>
                </div>
              </div>
            </div>

            <div className="st2-navList">
              {TABS.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    className={`st2-navBtn${tab === t.id ? " active" : ""}`}
                    onClick={() => {
                      setTab(t.id);
                      if (t.id !== "profile") {
                        setEditMode(false);
                        setShowCurrentPw(false);
                        setProfile((p) => ({ ...p, current_password: "" }));
                      }
                    }}
                  >
                    <span className="st2-navIco"><Icon size={16} /></span>
                    <span style={{ fontWeight: 700 }}>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main panel */}
          <div className="st2-card">
            <div className="st2-mainHead">
              <h2 className="st2-mainTitle">{activeTab.label}</h2>
              <p className="st2-mainDesc">{activeTab.desc}</p>
            </div>

            <div className="st2-body">
              {loadingMe ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--page-sub)" }}>
                  <Loader2 size={16} className="spinning" /> Loading…
                </div>
              ) : (
                <>
                  {tab === "profile" && (
                    <>
                      <div className="st2-row">
                        <div>
                          <div className="st2-lbl">Profile details</div>
                          <div className="st2-hint">
                            Update your information. Username/email changes require current password.
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 10 }}>
                          {!editMode ? (
                            <button className="st2-btn" onClick={() => setEditMode(true)}>
                              <PencilLine size={16} /> Edit
                            </button>
                          ) : (
                            <>
                              <button
                                className="st2-btn"
                                onClick={() => {
                                  setEditMode(false);
                                  resetProfileForm();
                                  setShowCurrentPw(false);
                                }}
                                disabled={saving}
                              >
                                <X size={16} /> Cancel
                              </button>
                              <button className="st2-btn primary" onClick={saveProfile} disabled={saving}>
                                {saving ? <Loader2 size={16} className="spinning" /> : <Save size={16} />}
                                {saving ? "Saving…" : "Save"}
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="st2-row">
                        <div>
                          <div className="st2-lbl">Name</div>
                          <div className="st2-hint">Used for reports and assignments.</div>
                        </div>
                        <div className="st2-right">
                          <div className="st2-2col">
                            <input
                              className="st2-input"
                              placeholder="First name"
                              value={profile.first_name}
                              disabled={!editMode || saving}
                              onChange={(e) => setProfile((p) => ({ ...p, first_name: e.target.value }))}
                            />
                            <input
                              className="st2-input"
                              placeholder="Last name"
                              value={profile.last_name}
                              disabled={!editMode || saving}
                              onChange={(e) => setProfile((p) => ({ ...p, last_name: e.target.value }))}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="st2-row">
                        <div>
                          <div className="st2-lbl">Username</div>
                          <div className="st2-hint">Used to identify your portal session.</div>
                        </div>
                        <div className="st2-right">
                          <input
                            className="st2-input"
                            value={profile.username}
                            disabled={!editMode || saving}
                            onChange={(e) => setProfile((p) => ({ ...p, username: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="st2-row">
                        <div>
                          <div className="st2-lbl">Email</div>
                          <div className="st2-hint">Used for account notices.</div>
                        </div>
                        <div className="st2-right">
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <Mail size={16} style={{ color: "var(--page-th-text)" }} />
                            <input
                              className="st2-input"
                              value={profile.email}
                              disabled={!editMode || saving}
                              onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                            />
                          </div>
                        </div>
                      </div>

                      {editMode && needsPassword && (
                        <div className="st2-row">
                          <div>
                            <div className="st2-lbl">Confirm current password</div>
                            <div className="st2-hint">Required to change username or email.</div>
                          </div>
                          <div className="st2-right">
                            <div className="st2-pwWrap">
                              <input
                                className="st2-input"
                                type={showCurrentPw ? "text" : "password"}
                                placeholder="Current password"
                                value={profile.current_password}
                                disabled={saving}
                                onChange={(e) => setProfile((p) => ({ ...p, current_password: e.target.value }))}
                                autoComplete="current-password"
                              />
                              <button
                                type="button"
                                className="st2-eye"
                                onClick={() => setShowCurrentPw((v) => !v)}
                              >
                                {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {tab === "security" && (
                    <div className="st2-row">
                      <div>
                        <div className="st2-lbl">Change password</div>
                        <div className="st2-hint">Choose a strong password.</div>
                      </div>
                      <div className="st2-right">
                        <ChangePasswordInline />
                      </div>
                    </div>
                  )}

                  {tab === "preferences" && (
                    <div className="st2-row">
                      <div>
                        <div className="st2-lbl">Theme</div>
                        <div className="st2-hint">Choose your preferred appearance.</div>
                      </div>
                      <div className="st2-right">
                        <div className="st2-themeGrid">
                          <button
                            className={`st2-theme${theme === "dark" ? " active" : ""}`}
                            onClick={() => setTheme("dark")}
                          >
                            <div className="st2-themeName"><Moon size={16} /> Dark</div>
                          </button>

                          <button
                            className={`st2-theme${theme === "light" ? " active" : ""}`}
                            onClick={() => setTheme("light")}
                          >
                            <div className="st2-themeName"><Sun size={16} /> Light</div>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {tab === "account" && (
                    <div className="st2-row">
                      <div>
                        <div className="st2-lbl">Sign out</div>
                        <div className="st2-hint">Ends your session on this device.</div>
                      </div>
                      <div className="st2-right">
                        <button className="st2-btn danger" onClick={logout}>
                          <LogOut size={16} /> Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ChangePasswordInline() {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState({ current: false, next: false, confirm: false });

  async function submit(e) {
    e.preventDefault();
    if (!form.current || !form.next || !form.confirm) return showToast("All fields are required.", "error");
    if (form.next !== form.confirm) return showToast("New passwords do not match.", "error");
    if (form.next === form.current) return showToast("New password must differ from current password.", "error");

    setLoading(true);
    try {
      await api.post("/api/auth/change-password/", {
        current_password: form.current,
        new_password: form.next,
        confirm_password: form.confirm,
      });
      setForm({ current: "", next: "", confirm: "" });
      showToast("Password updated.", "success");
    } catch (err) {
      showToast(fmtApiError(err), "error");
    }
    setLoading(false);
  }

  const fields = [
    { k: "current", label: "Current password" },
    { k: "next", label: "New password" },
    { k: "confirm", label: "Confirm new password" },
  ];

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
      {fields.map((f) => (
        <div key={f.k} className="st2-pwWrap">
          <input
            className="st2-input"
            type={show[f.k] ? "text" : "password"}
            placeholder={f.label}
            value={form[f.k]}
            onChange={(e) => setForm((p) => ({ ...p, [f.k]: e.target.value }))}
            disabled={loading}
          />
          <button type="button" className="st2-eye" onClick={() => setShow((p) => ({ ...p, [f.k]: !p[f.k] }))}>
            {show[f.k] ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      ))}

      <button className="st2-btn primary" type="submit" disabled={loading}>
        {loading ? <Loader2 size={16} className="spinning" /> : <KeyRound size={16} />}
        {loading ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}