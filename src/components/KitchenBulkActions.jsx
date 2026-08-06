import { CheckSquare, Play, CheckCircle2, Check, X } from "lucide-react";

export default function KitchenBulkActions({ selectedIds, onClearSelection, onBulkAction }) {
  if (selectedIds.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 fade-in duration-200">
      <div className="bg-stone-900 border border-stone-700 shadow-2xl rounded-2xl p-2 flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
        
        <div className="flex items-center gap-3 px-3">
          <div className="bg-amber-500/20 text-amber-500 rounded-full w-8 h-8 flex items-center justify-center font-bold">
            {selectedIds.length}
          </div>
          <span className="text-sm font-medium text-stone-200 whitespace-nowrap">Selected</span>
          <button 
            onClick={onClearSelection}
            className="text-stone-500 hover:text-stone-300 ml-1 p-1"
            title="Clear Selection"
          >
            <X size={16} />
          </button>
        </div>

        <div className="w-px h-8 bg-stone-700 hidden sm:block"></div>
        <div className="h-px w-full bg-stone-700 sm:hidden"></div>

        <div className="flex items-center gap-2 px-1">
          <button
            onClick={() => onBulkAction("Cooking")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-sm font-medium transition"
          >
            <Play size={16} /> <span className="hidden sm:inline">Start Cooking</span>
          </button>
          
          <button
            onClick={() => onBulkAction("Ready")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-sm font-bold transition shadow-lg shadow-amber-500/20"
          >
            <CheckCircle2 size={16} /> <span className="hidden sm:inline">Ready</span>
          </button>
          
          <button
            onClick={() => onBulkAction("Complete")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-sm font-bold transition shadow-lg shadow-emerald-500/20"
          >
            <Check size={16} /> <span className="hidden sm:inline">Complete</span>
          </button>
        </div>

      </div>
    </div>
  );
}
