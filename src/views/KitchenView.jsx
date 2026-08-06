import { useState, useEffect, useRef, useMemo } from "react";
import { ChefHat } from "lucide-react";
import KitchenTicket from "../components/KitchenTicket.jsx";
import KitchenFilters from "../components/KitchenFilters.jsx";
import KitchenBulkActions from "../components/KitchenBulkActions.jsx";
import { minutesSince } from "../lib/currency.js";

// Audio Beep for new orders
const playBeep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime); // High pitch A5
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1); // Slide to A6
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    // Ignore if audio context fails (e.g., lack of user interaction)
  }
};

export default function KitchenView({ 
  tables, 
  parcels, 
  menuItems, 
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

  // Sound Notification Tracking
  const seenTicketsRef = useRef(new Set());
  
  // Unify Tables and Parcels into a single "Ticket" array
  const tickets = useMemo(() => {
    const unified = [];
    
    // Process Tables
    tables.forEach((t) => {
      if (t.items.length > 0 && t.kitchenStatus !== "Served") {
        unified.push({
          id: t.id,
          type: "table",
          number: t.number,
          customerName: t.customerName,
          items: t.items,
          status: t.kitchenStatus,
          priority: t.priority,
          createdAt: t.startedAt,
          notes: null // Tables don't have order-level notes in this schema, only items
        });
      }
    });

    // Process Parcels
    parcels.forEach((p) => {
      if (p.status === "Preparing" || p.status === "Ready") {
        unified.push({
          id: p.id,
          type: "parcel",
          number: p.id.slice(-4).toUpperCase(), // Display part of ID as parcel number
          customerName: p.customerName,
          items: p.items,
          status: p.status,
          priority: p.priority,
          createdAt: p.createdAt,
          notes: p.notes
        });
      }
    });

    return unified;
  }, [tables, parcels]);

  // Handle New Order Sound
  useEffect(() => {
    let hasNew = false;
    const currentIds = new Set(tickets.map(t => t.id));
    
    tickets.forEach(t => {
      if (!seenTicketsRef.current.has(t.id)) {
        // Only trigger sound if the ticket is genuinely new (created recently)
        // This prevents sound bombs on full reload
        const mins = minutesSince(t.createdAt);
        if (mins < 2) {
          hasNew = true;
        }
      }
    });

    if (hasNew) {
      playBeep();
    }
    
    seenTicketsRef.current = currentIds;
  }, [tickets]);

  // Calculate Urgency and Sort
  const processedTickets = useMemo(() => {
    let filtered = tickets.map(t => {
      const elapsedMinutes = minutesSince(t.createdAt);
      let urgencyLevel = "Normal";
      
      if (t.priority === "Rush" || elapsedMinutes >= 10) {
        urgencyLevel = "Urgent";
      } else if (elapsedMinutes >= 5) {
        urgencyLevel = "Attention";
      }

      return { ...t, elapsedMinutes, urgencyLevel };
    });

    // Apply Quick Filters
    if (filter === "Preparing") {
      filtered = filtered.filter(t => t.status === "New" || t.status === "Cooking" || t.status === "Preparing");
    } else if (filter === "Ready") {
      filtered = filtered.filter(t => t.status === "Ready");
    } else if (filter === "Parcel") {
      filtered = filtered.filter(t => t.type === "parcel");
    } else if (filter === "Dine In") {
      filtered = filtered.filter(t => t.type === "table");
    } else if (filter === "Urgent") {
      filtered = filtered.filter(t => t.urgencyLevel === "Urgent");
    }

    // Apply Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t => {
        const matchNumber = String(t.number).toLowerCase().includes(q);
        const matchCustomer = (t.customerName || "").toLowerCase().includes(q);
        return matchNumber || matchCustomer;
      });
    }

    // Sort: Urgent first, then oldest first
    filtered.sort((a, b) => {
      if (a.urgencyLevel === "Urgent" && b.urgencyLevel !== "Urgent") return -1;
      if (b.urgencyLevel === "Urgent" && a.urgencyLevel !== "Urgent") return 1;
      
      // Secondary sort: by elapsed time (descending) so oldest is first
      return b.elapsedMinutes - a.elapsedMinutes;
    });

    return filtered;
  }, [tickets, filter, searchQuery, now]); // Depends on `now` to recalculate elapsed/urgency

  // Action Handlers
  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleAction = (ticket, nextStatus) => {
    onCycleKitchen(ticket.type, ticket.id, nextStatus);
  };

  const handleBulkAction = (action) => {
    selectedIds.forEach(id => {
      const ticket = tickets.find(t => t.id === id);
      if (!ticket) return;

      let nextStatus = null;
      if (action === "Cooking") {
        if (ticket.type === "table" && ticket.status === "New") nextStatus = "Cooking";
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
    setSelectedIds([]); // clear selection after bulk action
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] sm:h-[calc(100vh-48px)] -m-4">
      <KitchenFilters 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filter={filter}
        setFilter={setFilter}
        displayMode={displayMode}
        setDisplayMode={setDisplayMode}
      />
      
      <div className="flex-1 overflow-y-auto p-4 bg-stone-950">
        {processedTickets.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 mt-10">
            <div className="bg-stone-900 w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-xl border border-stone-800">
              <ChefHat size={48} className="text-stone-700" />
            </div>
            <h2 className="text-3xl font-serif text-stone-100 mb-2 tracking-wide">Kitchen is clear.</h2>
            <p className="text-stone-400 text-lg mb-6">No active orders matching the criteria.</p>
            <div className="flex gap-2 justify-center">
              <span className="text-4xl">🍽</span>
              <span className="text-4xl">✨</span>
            </div>
          </div>
        ) : (
          <div className={`grid gap-4 ${
            displayMode === "large" 
              ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" 
              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          }`}>
            {processedTickets.map(ticket => (
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

      <KitchenBulkActions 
        selectedIds={selectedIds}
        onClearSelection={() => setSelectedIds([])}
        onBulkAction={handleBulkAction}
      />
    </div>
  );
}
