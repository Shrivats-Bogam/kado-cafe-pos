import { useState } from "react";
import { Coffee, ArrowLeft, Delete } from "lucide-react";
import { Pill, IconButton } from "./ui.jsx";
import { ROLE_LABELS } from "../data/defaults.js";

// PIN-based login screen.
// Multi-tenant / real Firebase auth would swap the `submit` body for a
// signed-in user object — see notes in lib/storage.js for Supabase upgrades.

export default function LoginScreen({ users, onLogin }) {
  const [pickedUser, setPickedUser] = useState(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const submit = (fullPin) => {
    console.log("STEP 1: submit() in LoginScreen. fullPin:", fullPin, "pickedUser:", pickedUser);
    if (pickedUser && String(fullPin) === String(pickedUser.pin)) {
      console.log("STEP 2: PIN match, calling onLogin() with user:", pickedUser);
      onLogin(pickedUser);
    } else {
      console.log("STEP 2 FAILED: Wrong PIN. fullPin:", fullPin, "pickedUser.pin:", pickedUser?.pin);
      setError("Wrong PIN");
      setPin("");
    }
  };

  const pressDigit = (d) => {
    const next = (pin + d).slice(0, 4);
    setPin(next);
    setError("");
    if (next.length === 4) submit(next);
  };

  if (!pickedUser) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center gap-6 p-6">
        <h1 className="font-serif text-2xl text-amber-500 flex items-center gap-2">
          <Coffee size={24} /> Kado Cafe
        </h1>
        <p className="text-sm text-stone-400">Who's working?</p>
        {(!users || users.length === 0) && (
          <p className="text-xs text-rose-400">No team members found — ask an Owner to add one from Settings.</p>
        )}
        <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
          {(users || []).map((u) => (
            <button
              key={u.id}
              onClick={() => setPickedUser(u)}
              className="rounded-2xl bg-stone-900 border border-stone-800 p-5 flex flex-col items-center gap-2 hover:border-amber-500 transition"
            >
              <div className="w-12 h-12 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center font-serif text-lg">
                {u.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-stone-100">{u.name}</span>
              <Pill tone="amber">{ROLE_LABELS[u.role] || u.role}</Pill>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center gap-6 p-6">
      <button
        onClick={() => { setPickedUser(null); setPin(""); setError(""); }}
        className="self-start flex items-center gap-1 text-sm text-stone-400"
      >
        <ArrowLeft size={15} /> Back
      </button>
      <div className="w-12 h-12 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center font-serif text-lg">
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
      {error && <p className="text-xs text-rose-400">{error}</p>}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button
            key={d}
            onClick={() => pressDigit(d)}
            className="rounded-xl py-4 text-lg font-medium bg-stone-900 border border-stone-800 text-stone-100 active:bg-stone-800"
          >
            {d}
          </button>
        ))}
        <div />
        <button
          onClick={() => pressDigit("0")}
          className="rounded-xl py-4 text-lg font-medium bg-stone-900 border border-stone-800 text-stone-100 active:bg-stone-800"
        >
          0
        </button>
        <button
          onClick={() => setPin((p) => p.slice(0, -1))}
          className="rounded-xl py-4 flex items-center justify-center bg-stone-900 border border-stone-800 text-stone-300"
        >
          <Delete size={18} />
        </button>
      </div>
    </div>
  );
}
