import { useState } from "react";
import { Coffee, ArrowLeft, Delete, KeyRound, ShieldCheck, ShieldAlert, Lock } from "lucide-react";
import { Pill, PrimaryButton } from "./ui.jsx";
import { ROLE_LABELS } from "../data/defaults.js";

export default function LoginScreen({
  users = [],
  hasCloudSession = false,
  cloudUser = "",
  onLogin,
  onCloudLogin,
}) {
  const [pickedUser, setPickedUser] = useState(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState("pin"); // "pin" or "cloud"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submittingCloud, setSubmittingCloud] = useState(false);

  const submitPin = (fullPin) => {
    const expectedPin = String(pickedUser?.pin || "");
    if (pickedUser && String(fullPin) === expectedPin) {
      if (!hasCloudSession) {
        setError("Cloud login required. Please sign in with your employee email and password to continue.");
        setMode("cloud");
        if (pickedUser.email) {
          setEmail(pickedUser.email);
        }
        return;
      }
      onLogin(pickedUser);
    } else {
      setError("Wrong PIN");
      setPin("");
    }
  };

  const pressDigit = (d) => {
    const next = (pin + d).slice(0, 4);
    setPin(next);
    setError("");
    if (next.length === 4) submitPin(next);
  };

  const handleCloudSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in email and password");
      return;
    }
    setError("");
    setSubmittingCloud(true);
    try {
      if (onCloudLogin) {
        await onCloudLogin(email, password);
      } else {
        setError("Cloud login is currently unavailable. Please use Terminal PIN.");
      }
    } catch (err) {
      setError(err.message || "Failed to sign in");
    } finally {
      setSubmittingCloud(false);
    }
  };

  // --- CLOUD LOGIN SCREEN ---
  if (mode === "cloud") {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center gap-6 p-6">
        <button
          onClick={() => { setMode("pin"); setError(""); }}
          className="self-start flex items-center gap-1 text-sm text-stone-400 hover:text-stone-200 transition cursor-pointer"
        >
          <ArrowLeft size={15} /> Back to Terminal PIN
        </button>
        <h1 className="font-serif text-2xl text-amber-500 flex items-center gap-2">
          <Coffee size={24} /> Kado Cloud Auth
        </h1>
        <p className="text-sm text-stone-400">Sign in to your café organization</p>
        <form onSubmit={handleCloudSubmit} className="w-full max-w-sm flex flex-col gap-4 bg-stone-900 border border-stone-800 p-6 rounded-2xl shadow-xl">
          {error && <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/30">{error}</p>}
          <div className="flex flex-col gap-1 text-left">
            <label className="text-xs text-stone-300 font-medium">Account Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@kado.cafe"
              className="bg-stone-950 border border-stone-800 rounded-xl p-3 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
              required
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1 text-left">
            <label className="text-xs text-stone-300 font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-stone-950 border border-stone-800 rounded-xl p-3 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
              required
            />
          </div>
          <PrimaryButton type="submit" disabled={submittingCloud} className="w-full justify-center mt-2">
            {submittingCloud ? "Authenticating..." : "Sign In to Organization"}
          </PrimaryButton>
        </form>
      </div>
    );
  }

  // --- PIN USER SELECTION SCREEN ---
  if (!pickedUser) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center gap-5 p-6">
        <h1 className="font-serif text-2xl text-amber-500 flex items-center gap-2">
          <Coffee size={24} /> Kado Cafe POS
        </h1>

        {/* Terminal Cloud Status Badge */}
        {hasCloudSession ? (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <ShieldCheck size={14} /> Cloud Active: {cloudUser || "Authenticated"}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-950/40 border border-amber-500/30 text-amber-400 text-xs font-semibold">
            <ShieldAlert size={14} /> Terminal Cloud Login Required for Server Payments
          </div>
        )}

        <p className="text-sm text-stone-400">Who's working?</p>

        {(!users || users.length === 0) && (
          <p className="text-xs text-rose-400">No team members found — please sign in via Cloud Account.</p>
        )}

        <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
          {(users || []).filter((u) => u.active !== false && u.status !== "disabled" && u.status !== "Inactive").map((u) => (
            <button
              key={u.id}
              data-testid={`login-user-${u.role}`}
              onClick={() => {
                setPickedUser(u);
                setPin("");
                setError("");
              }}
              className="rounded-2xl bg-stone-900 border border-stone-800 p-5 flex flex-col items-center gap-2 hover:border-amber-500 transition cursor-pointer"
            >
              <div data-testid={`user-card-${u.role.toLowerCase()}`} className="w-12 h-12 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center font-serif text-lg font-bold">
                {u.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-stone-100 truncate max-w-full">{u.name}</span>
              <Pill tone="amber">{ROLE_LABELS[u.role] || u.role}</Pill>
            </button>
          ))}
        </div>

        <button
          onClick={() => { setMode("cloud"); setError(""); }}
          className="mt-2 text-xs text-stone-400 hover:text-amber-400 flex items-center gap-1.5 transition cursor-pointer py-2 px-3 rounded-xl bg-stone-900 border border-stone-800"
        >
          <KeyRound size={14} /> {hasCloudSession ? "Switch Cloud Account" : "Cloud Account Login (Owner/Manager)"}
        </button>
      </div>
    );
  }

  // --- PIN NUMPAD SCREEN ---
  return (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center gap-6 p-6">
      <button
        onClick={() => { setPickedUser(null); setPin(""); setError(""); }}
        className="self-start flex items-center gap-1 text-sm text-stone-400 hover:text-stone-200 transition cursor-pointer"
      >
        <ArrowLeft size={15} /> Back
      </button>
      <div className="w-12 h-12 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center font-serif text-lg font-bold">
        {pickedUser.name.charAt(0).toUpperCase()}
      </div>
      <p className="text-sm text-stone-300">Enter PIN for {pickedUser.name}</p>
      
      <div className="flex gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-3.5 h-3.5 rounded-full ${i < pin.length ? "bg-amber-500" : "bg-stone-800"}`}
          />
        ))}
      </div>

      {error && (
        <div className="max-w-xs text-center">
          <p className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/60 p-2.5 rounded-xl">{error}</p>
          {!hasCloudSession && (
            <button
              onClick={() => { setMode("cloud"); setError(""); }}
              className="mt-2 text-xs text-amber-400 font-bold hover:underline"
            >
              Click here to sign in with Cloud Account
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button
            key={d}
            data-testid={`pin-digit-${d}`}
            onClick={() => pressDigit(d)}
            className="rounded-xl py-4 text-lg font-medium bg-stone-900 border border-stone-800 text-stone-100 hover:bg-stone-800 active:bg-stone-700 transition cursor-pointer"
          >
            {d}
          </button>
        ))}
        <div />
        <button
          onClick={() => pressDigit("0")}
          data-testid="pin-digit-0"
          className="rounded-xl py-4 text-lg font-medium bg-stone-900 border border-stone-800 text-stone-100 hover:bg-stone-800 active:bg-stone-700 transition cursor-pointer"
        >
          0
        </button>
        <button
          onClick={() => setPin((p) => p.slice(0, -1))}
          data-testid="pin-clear"
          className="rounded-xl py-4 flex items-center justify-center bg-stone-900 border border-stone-800 text-stone-300 hover:bg-stone-800 active:bg-stone-700 transition cursor-pointer"
        >
          <Delete size={18} />
        </button>
      </div>
    </div>
  );
}
