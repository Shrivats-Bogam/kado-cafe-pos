import { Coffee, Globe, Moon, Sun } from "lucide-react";

export function CustomerHeader({ cafeName, tableNumber, lang, setLang, theme, setTheme, t }) {
  return (
    <div className="p-4 border-b border-stone-800 flex items-center justify-between sticky top-0 bg-stone-950/95 backdrop-blur z-20">
      <div className="flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
          <Coffee size={22} />
        </div>
        <div>
          <h1 className="font-serif text-lg font-bold text-stone-50">{cafeName || "Kado Cafe"}</h1>
          <p className="text-xs text-amber-400 font-semibold">Table {tableNumber} · {t.scanToOrder}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Language selector */}
        <div className="flex items-center bg-stone-900 border border-stone-800 rounded-xl p-1">
          <Globe size={14} className="text-stone-500 ml-1 mr-0.5" />
          {["EN", "HI", "MR"].map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                lang === l ? "bg-amber-500 text-stone-950" : "text-stone-400 hover:text-stone-100"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:text-stone-100"
          title="Toggle Theme"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </div>
  );
}
