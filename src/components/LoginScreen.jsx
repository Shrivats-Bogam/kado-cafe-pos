import { useState, useEffect } from "react";
import { Coffee, ArrowLeft, Delete, KeyRound, ShieldCheck, ShieldAlert, Lock, AlertTriangle } from "lucide-react";
import { Pill, PrimaryButton } from "./ui.jsx";
import { ROLE_LABELS } from "../data/defaults.js";
import { verifyPin } from "../lib/pinSecurity.js";
import { verifyStaffPinRpc, setSessionPin, isCloudEnabled } from "../lib/storage.js";
import { IS_E2E } from "../lib/env.js";

const LOCKOUT_KEY = "kado_pin_rate_limit";

function getStoredLockout() {
  if (typeof sessionStorage === "undefined") return { attempts: 0, lockedUntil: 0 };
  try {
    const raw = sessionStorage.getItem(LOCKOUT_KEY);
    return raw ? JSON.parse(raw) : { attempts: 0, lockedUntil: 0 };
  } catch {
    return { attempts: 0, lockedUntil: 0 };
  }
}

function saveStoredLockout(data) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(LOCKOUT_KEY, JSON.stringify(data));
  } catch {}
}

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

  // Rate limiting & lockout state
  const [lockoutRemaining, setLockoutRemaining] = useState(() => {
    const stored = getStoredLockout();
    const remaining = Math.max(0, Math.ceil((stored.lockedUntil - Date.now()) / 1000));
    return remaining;
  });

  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const timer = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          saveStoredLockout({ attempts: 0, lockedUntil: 0 });
          setError("");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutRemaining]);

  const submitPin = async (fullPin) => {
    if (lockoutRemaining > 0) return;
    if (!pickedUser) return;

    // Offline / E2E fallback: local check
    if (IS_E2E || !isCloudEnabled) {
      const isMatch = await verifyPin(fullPin, String(pickedUser?.pin || ""));
      if (isMatch) {
        saveStoredLockout({ attempts: 0, lockedUntil: 0 });
        setSessionPin(fullPin);
        onLogin(pickedUser, fullPin);
      } else {
        const stored = getStoredLockout();
        const nextAttempts = (stored.attempts || 0) + 1;
        let lockoutSec = 0;
        if (nextAttempts >= 5) lockoutSec = 180;
        else if (nextAttempts === 4) lockoutSec = 60;
        else if (nextAttempts >= 3) lockoutSec = 30;

        if (lockoutSec > 0) {
          const lockedUntil = Date.now() + lockoutSec * 1000;
          saveStoredLockout({ attempts: nextAttempts, lockedUntil });
          setLockoutRemaining(lockoutSec);
          setError(`Too many failed PIN attempts. Terminal locked for ${lockoutSec}s.`);
        } else {
          saveStoredLockout({ attempts: nextAttempts, lockedUntil: 0 });
          const remainingAttempts = 3 - nextAttempts;
          setError(`Wrong PIN (${remainingAttempts} attempt${remainingAttempts === 1 ? "" : "s"} remaining before lockout)`);
        }
        setPin("");
      }
      return;
    }

    try {
      // Server-side PIN verification (with server lockout)
      const res = await verifyStaffPinRpc(pickedUser.id, fullPin);

      if (res.locked) {
        setError("Too many failed attempts. Account temporarily locked.");
        setPin("");
        return;
      }
      if (!res.ok) {
        setError("Invalid PIN.");
        setPin("");
        return;
      }

      // Success: stash PIN for this session (memory-only) and log in
      saveStoredLockout({ attempts: 0, lockedUntil: 0 });
      setSessionPin(fullPin);
      onLogin(pickedUser, fullPin);
    } catch (e) {
      console.warn("[kado-cafe] verifyStaffPinRpc error, checking fallback:", e);
      // Graceful offline fallback if server RPC cannot be reached
      const isMatch = await verifyPin(fullPin, String(pickedUser?.pin || ""));
      if (isMatch) {
        saveStoredLockout({ attempts: 0, lockedUntil: 0 });
        setSessionPin(fullPin);
        onLogin(pickedUser, fullPin);
      } else {
        setError("Authentication service unavailable. Check connection.");
        setPin("");
      }
    }
  };

  const pressDigit = (d) => {
    if (lockoutRemaining > 0) return;
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
        saveStoredLockout({ attempts: 0, lockedUntil: 0 });
        setLockoutRemaining(0);
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

      {lockoutRemaining > 0 ? (
        <div className="max-w-xs w-full text-center bg-rose-950/40 border border-rose-500/40 p-3.5 rounded-2xl flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
            <Lock size={16} /> Terminal Locked
          </div>
          <p className="text-xs text-rose-300">
            Too many failed attempts. Please wait <span className="font-mono font-bold text-amber-400">{lockoutRemaining}s</span> before retrying.
          </p>
          <button
            onClick={() => { setMode("cloud"); setError(""); }}
            className="mt-1 text-xs text-amber-400 hover:text-amber-300 underline font-semibold cursor-pointer"
          >
            Unlock with Cloud Account (Owner/Manager)
          </button>
        </div>
      ) : error ? (
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
      ) : null}

      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button
            key={d}
            data-testid={`pin-digit-${d}`}
            disabled={lockoutRemaining > 0}
            onClick={() => pressDigit(d)}
            className={`rounded-xl py-4 text-lg font-medium bg-stone-900 border border-stone-800 text-stone-100 transition cursor-pointer ${
              lockoutRemaining > 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-stone-800 active:bg-stone-700"
            }`}
          >
            {d}
          </button>
        ))}
        <div />
        <button
          onClick={() => pressDigit("0")}
          disabled={lockoutRemaining > 0}
          data-testid="pin-digit-0"
          className={`rounded-xl py-4 text-lg font-medium bg-stone-900 border border-stone-800 text-stone-100 transition cursor-pointer ${
            lockoutRemaining > 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-stone-800 active:bg-stone-700"
          }`}
        >
          0
        </button>
        <button
          onClick={() => setPin((p) => p.slice(0, -1))}
          disabled={lockoutRemaining > 0}
          data-testid="pin-clear"
          className={`rounded-xl py-4 flex items-center justify-center bg-stone-900 border border-stone-800 text-stone-300 transition cursor-pointer ${
            lockoutRemaining > 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-stone-800 active:bg-stone-700"
          }`}
        >
          <Delete size={18} />
        </button>
      </div>
    </div>
  );
}
