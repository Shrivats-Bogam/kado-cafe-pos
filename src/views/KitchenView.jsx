import { useState, useEffect, useRef, useMemo } from "react";
import { ChefHat, CheckCircle2 } from "lucide-react";
import KitchenTicket from "../components/KitchenTicket.jsx";
import KitchenFilters from "../components/KitchenFilters.jsx";
import KitchenBulkActions from "../components/KitchenBulkActions.jsx";
import { minutesSince } from "../lib/currency.js";

// Web Audio API Beep for genuinely new incoming orders
const playBeep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    // Ignore audio context failures
  }
};

export default function KitchenView({ 
  tables = [], 
  parcels = [], 
  menuItems = [], 
  onCycleKitchen, 
  onSetPriority, 
  currentUser 
}) {
  const [displayMode, setDisplayMode] = useState("normal");
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Live Timer State (forces re-render every 30s for smooth timer updates)
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  // Sound Notification Tracking (prevents audio spam on reload/filters)
  const seenTicketsRef = useRef(new Set());
  
  // Unify Tables and Parcels into a single "Ticket" array (PART 1)
  const tickets = useMemo(() => {
    const unified = [];
    
    // Process Tables (supports incremental tickets)
    tables.forEach((t) => {
      if (t.kitchenTickets && t.kitchenTickets.length > 0) {
        t.kitchenTickets.forEach((ticket, idx) => {
          if (ticket.status !== "Served") {
            unified.push({
              id: ticket.id,
              type: "table",
              tableId: t.id,
              number: t.kitchenTickets.length > 1 ? `${t.number} (#${idx + 1})` : `${t.number}`,
              customerName: ticket.customerName || t.customerName || `Table ${t.number}`,
              items: ticket.items || [],
              status: ticket.status || "New",
              priority: ticket.priority || t.priority || "Normal",
              createdAt: ticket.createdAt || t.startedAt || new Date().toISOString(),
              notes: ticket.notes || t.orderNotes || null,
            });
          }
        });
      } else if (t.items && t.items.length > 0 && t.kitchenStatus !== "Served") {
        // Fallback for legacy table state without kitchenTickets array
        unified.push({
          id: t.id,
          type: "table",
          tableId: t.id,
          number: `${t.number}`,
          customerName: t.customerName || `Table ${t.number}`,
          items: t.items,
          status: t.kitchenStatus || "New",
          priority: t.priority || "Normal",
          createdAt: t.startedAt || new Date().toISOString(),
          notes: t.orderNotes || null,
        });
      }
    });

    // Process Parcels
    parcels.forEach((p) => {
      if (p.status === "New" || p.status === "Preparing" || p.status === "Ready") {
        unified.push({
          id: p.id,
          type: "parcel",
          parcelId: p.id,
          number: p.id.slice(-4).toUpperCase(),
          customerName: p.customerName || "Parcel Guest",
          items: p.items || [],
          status: p.status || "New",
          priority: p.priority || "Normal",
          createdAt: p.createdAt || new Date().toISOString(),
          notes: p.notes || null,
        });
      }
    });

    return unified;
  }, [tables, parcels]);

  // Handle Sound Alerts: Play audio ONLY for genuinely new tickets (< 2 min old)
  useEffect(() => {
    let hasNewTicket = false;
    const currentIds = new Set(tickets.map((t) => t.id));
    
    tickets.forEach((t) => {
      if (!seenTicketsRef.current.has(t.id)) {
        const mins = minutesSince(t.createdAt);
        if (mins < 2) {
          hasNewTicket = true;
        }
      }
    });

    if (hasNewTicket && seenTicketsRef.current.size > 0) {
      playBeep();
    }
    
    seenTicketsRef.current = currentIds;
  }, [tickets]);

  // Process Urgency Levels, Filters, Search & Strict Priority Sorting (PART 2)
  const processedTickets = useMemo(() => {
    let filtered = tickets.map((t) => {
      const elapsedMinutes = minutesSince(t.createdAt);
      let urgencyLevel = "Normal";
      
      if (t.priority === "Rush" || elapsedMinutes >= 30) {
        urgencyLevel = "Urgent";
      } else if (elapsedMinutes >= 15) {
        urgencyLevel = "Attention";
      }

      return { ...t, elapsedMinutes, urgencyLevel };
    });

    // Apply Filter Chips (PART 13)
    if (filter === "New") {
      filtered = filtered.filter((t) => t.status === "New");
    } else if (filter === "Cooking") {
      filtered = filtered.filter((t) => t.status === "Cooking" || t.status === "Preparing");
    } else if (filter === "Ready") {
      filtered = filtered.filter((t) => t.status === "Ready");
    } else if (filter === "Rush") {
      filtered = filtered.filter((t) => t.priority === "Rush");
    } else if (filter === "Table") {
      filtered = filtered.filter((t) => t.type === "table");
    } else if (filter === "Parcel") {
      filtered = filtered.filter((t) => t.type === "parcel");
    }

    // Apply Multi-Field Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((t) => {
        const matchNumber = String(t.number).toLowerCase().includes(q);
        const matchCustomer = (t.customerName || "").toLowerCase().includes(q);
        const matchId = String(t.id).toLowerCase().includes(q);
        const matchNotes = (t.notes || "").toLowerCase().includes(q);
        return matchNumber || matchCustomer || matchId || matchNotes;
      });
    }

    // Strict Sorting (PART 2):
    // 1. RUSH tickets first
    // 2. Oldest waiting ticket (longest elapsed time)
    // 3. Normal tickets
    filtered.sort((a, b) => {
      const aIsRush = a.priority === "Rush";
      const bIsRush = b.priority === "Rush";
      if (aIsRush && !bIsRush) return -1;
      if (bIsRush && !aIsRush) return 1;

      // Secondary sort: by elapsed time (descending) so oldest waiting ticket is first
      return b.elapsedMinutes - a.elapsedMinutes;
    });

    return filtered;
  }, [tickets, filter, searchQuery, now]);

  // Action Handlers
  const toggleSelect = (id) => {
    setSelectedIds((prev) => 
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleAction = (ticket, nextStatus) => {
    onCycleKitchen(ticket.type, ticket.id, nextStatus);
  };

  const handleBulkAction = (action) => {
    selectedIds.forEach((id) => {
      const ticket = tickets.find((t) => t.id === id);
      if (!ticket) return;

      let nextStatus = null;
      if (action === "Cooking") {
        if (ticket.status === "New") nextStatus = "Cooking";
      } else if (action === "Ready") {
        if (ticket.status !== "Ready") nextStatus = "Ready";
      } else if (action === "Complete") {
        if (ticket.status === "Ready") {
          nextStatus = ticket.type === "table" ? "Served" : "Delivered";
        }
      }

      if (nextStatus) {
        onCycleKitchen(ticket.type, ticket.id, nextStatus);
      }
    });
    setSelectedIds([]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] sm:h-[calc(100vh-48px)] -m-4">
      {/* Search & Filter Toolbar */}
      <KitchenFilters 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filter={filter}
        setFilter={setFilter}
        displayMode={displayMode}
        setDisplayMode={setDisplayMode}
      />
      
      {/* Main Ticket Queue View */}
      <div className="flex-1 overflow-y-auto p-4 bg-stone-950">
        {processedTickets.length === 0 ? (
          /* Purposeful Empty State (PART 20) */
          <div className="h-full flex flex-col items-center justify-center text-center p-8 mt-6 select-none pointer-events-none">
            <div className="bg-stone-900/80 border border-stone-800 w-24 h-24 rounded-full flex items-center justify-center mb-5 shadow-2xl text-emerald-400">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="text-2xl font-serif font-bold text-stone-100 mb-1">✓ Kitchen Clear</h2>
            <p className="text-stone-400 text-sm max-w-sm leading-relaxed">
              No pending orders. You're all caught up!
            </p>
          </div>
        ) : (
          /* Ticket Grid View */
          <div className={`grid gap-4 ${
            displayMode === "large" 
              ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" 
              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          }`}>
            {processedTickets.map((ticket) => (
              <KitchenTicket
                key={ticket.id}
                ticket={ticket}
                menuItems={menuItems}
                elapsedMinutes={ticket.elapsedMinutes}
                urgencyLevel={ticket.urgencyLevel}
                displayMode={displayMode}
                isSelected={selectedIds.includes(ticket.id)}
                onToggleSelect={toggleSelect}
                onAction={handleAction}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bulk Selection Bar */}
      <KitchenBulkActions 
        selectedIds={selectedIds}
        onClearSelection={() => setSelectedIds([])}
        onBulkAction={handleBulkAction}
      />
    </div>
  );
}
