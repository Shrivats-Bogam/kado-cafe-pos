import { useState, useMemo } from "react";
import { Coffee, SearchX, RefreshCw, Plus, Home } from "lucide-react";
import TableStats from "../components/TableStats.jsx";
import { TableToolbar } from "../components/TableToolbar.jsx";
import TableCard from "../components/TableCard.jsx";
import TableActionsMenu from "../components/TableActionsMenu.jsx";
import { TableModal } from "../components/TableModal.jsx";
import { TableTimeline } from "../components/TableTimeline.jsx";
import { TableFloorPlan } from "../components/TableFloorPlan.jsx";
import { PrimaryButton, Card, ConfirmDialog } from "../components/ui/index.js";

export default function TablesView({
  tables = [],
  menuItems = [],
  onOpenTable,
  onSetStatus,
  onShowQR,
  onTransferTable,
  onMergeTable,
  onSplitTable,
  onReserveTable,
  onSetCleaning,
  onDuplicateOrder,
  onAddTable,
  onEditTable,
  onDeleteTable,
}) {
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "floor"
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  // Modal states
  const [selectedTableForMenu, setSelectedTableForMenu] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [selectedTimelineTable, setSelectedTimelineTable] = useState(null);
  const [deletingTableId, setDeletingTableId] = useState(null);

  // Compute status counts for filter pills
  const counts = useMemo(() => {
    const map = {
      all: tables.length,
      available: 0,
      occupied: 0,
      preparing: 0,
      ready: 0,
      reserved: 0,
      cleaning: 0,
      rush: 0,
    };

    tables.forEach((t) => {
      if (t.status === "available") map.available++;
      if (t.status === "cleaning") map.cleaning++;
      if (t.status === "reserved" || t.isReserved) map.reserved++;
      if (t.status === "preparing" || t.status === "serving" || t.status === "ordering") map.preparing++;
      if (t.status === "ready" || t.kitchenStatus === "Ready") map.ready++;
      if (t.priority === "Rush") map.rush++;

      if (
        (t.items && t.items.length > 0) ||
        ["preparing", "serving", "ordering", "ready", "billing", "payment_pending"].includes(t.status)
      ) {
        map.occupied++;
      }
    });

    return map;
  }, [tables]);

  // Filter tables based on search query and active filter
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      // 1. Search Query Filter (Table #, Name, Customer, Phone, Bill ID, Notes)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const numMatch = `table ${t.number}`.includes(query) || `t-${t.number}`.includes(query) || `${t.number}` === query;
        const nameMatch = t.name && t.name.toLowerCase().includes(query);
        const customerMatch = t.customerName && t.customerName.toLowerCase().includes(query);
        const notesMatch = t.notes && t.notes.toLowerCase().includes(query);
        const statusMatch = t.status && t.status.toLowerCase().includes(query);
        const billMatch = t.id && t.id.toLowerCase().includes(query);

        if (!numMatch && !nameMatch && !customerMatch && !notesMatch && !statusMatch && !billMatch) return false;
      }

      // 2. Tab Filter
      if (activeFilter === "all") return true;
      if (activeFilter === "available") return t.status === "available";
      if (activeFilter === "occupied") {
        return (
          (t.items && t.items.length > 0) ||
          ["preparing", "serving", "ordering", "ready", "billing", "payment_pending"].includes(t.status)
        );
      }
      if (activeFilter === "preparing") {
        return t.status === "preparing" || t.status === "serving" || t.status === "ordering";
      }
      if (activeFilter === "ready") return t.status === "ready" || t.kitchenStatus === "Ready";
      if (activeFilter === "reserved") return t.status === "reserved" || Boolean(t.isReserved);
      if (activeFilter === "cleaning") return t.status === "cleaning";
      if (activeFilter === "rush") return t.priority === "Rush";

      return true;
    });
  }, [tables, searchQuery, activeFilter]);

  // Table Save Handler (delegates to global state reducer via prop)
  const handleSaveTable = (tableData) => {
    if (editingTable && onEditTable) {
      onEditTable(editingTable.id, tableData);
    } else if (onAddTable) {
      onAddTable(tableData);
    }
    setShowAddModal(false);
    setEditingTable(null);
  };

  // Table Delete Confirmation Handler
  const handleConfirmDelete = () => {
    if (deletingTableId && onDeleteTable) {
      onDeleteTable(deletingTableId);
    }
    setDeletingTableId(null);
  };

  return (
    <div className="flex flex-col gap-4 max-w-full animate-in fade-in duration-150">
      {/* 1. Metrics Header */}
      <TableStats tables={tables} menuItems={menuItems} />

      {/* 2. Toolbar: View Switcher, Search, Filters, Add Button */}
      <TableToolbar
        viewMode={viewMode}
        setViewMode={setViewMode}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        counts={counts}
        onAddTable={() => setShowAddModal(true)}
      />

      {/* 3. Main View Render */}
      {tables.length === 0 ? (
        /* Empty State UI when 0 tables exist */
        <div className="flex flex-col items-center justify-center p-12 bg-stone-900/60 border border-stone-800 rounded-3xl text-center my-6 shadow-md space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-2">
            <Home size={32} />
          </div>
          <h3 className="font-serif text-xl font-bold text-stone-100">No Tables Yet</h3>
          <p className="text-sm text-stone-400 max-w-md leading-relaxed">
            Create your first dining table to begin floor management and guest order taking.
          </p>
          <PrimaryButton
            onClick={() => setShowAddModal(true)}
            className="mt-2 text-xs flex items-center gap-1.5 px-5 py-3 shadow-md"
          >
            <Plus size={16} /> Add Table
          </PrimaryButton>
        </div>
      ) : viewMode === "floor" ? (
        /* Interactive Drag-and-Move Floor Plan View */
        <TableFloorPlan
          tables={filteredTables}
          menuItems={menuItems}
          onOpenTable={onOpenTable}
          onOpenMoreMenu={(table) => setSelectedTableForMenu(table)}
          onUpdateTablePosition={(id, patch) => {
            if (onEditTable) onEditTable(id, patch);
          }}
        />
      ) : filteredTables.length > 0 ? (
        /* Responsive Grid View: 4 cols desktop (lg), 2 cols tablet (md), 1 col mobile (sm) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-1 items-stretch">
          {filteredTables.map((t) => (
            <TableCard
              key={t.id}
              table={t}
              menuItems={menuItems}
              onOpenTable={onOpenTable}
              onOpenMoreMenu={(table) => setSelectedTableForMenu(table)}
            />
          ))}
        </div>
      ) : (
        /* Filter / Search No Match Empty State */
        <div className="flex flex-col items-center justify-center p-12 bg-stone-900/60 border border-stone-800 rounded-3xl text-center my-6 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-stone-800/80 border border-stone-700/50 flex items-center justify-center text-amber-500 mb-4 shadow-inner">
            <SearchX size={32} />
          </div>
          <h3 className="font-serif text-xl font-bold text-stone-100 mb-1">No tables found</h3>
          <p className="text-sm text-stone-400 max-w-md mb-6 leading-relaxed">
            {searchQuery
              ? `No tables match "${searchQuery}" under the selected ${activeFilter} filter.`
              : `There are currently no tables matching the "${activeFilter}" status.`}
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setActiveFilter("all");
            }}
            className="min-h-[48px] px-5 py-2.5 rounded-2xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 text-sm font-semibold flex items-center gap-2 transition-all active:scale-95 shadow-sm"
          >
            <RefreshCw size={16} className="text-amber-400" /> Reset Search & Filters
          </button>
        </div>
      )}

      {/* Table Actions Menu Modal */}
      {selectedTableForMenu && (
        <TableActionsMenu
          table={selectedTableForMenu}
          tables={tables}
          menuItems={menuItems}
          onClose={() => setSelectedTableForMenu(null)}
          onOpenTable={onOpenTable}
          onShowQR={onShowQR}
          onTransferTable={onTransferTable}
          onMergeTable={onMergeTable}
          onSplitTable={onSplitTable}
          onReserveTable={onReserveTable}
          onEditTable={(t) => setEditingTable(t)}
          onDeleteTable={(id) => setDeletingTableId(id)}
        />
      )}

      {/* Add New Table Wizard Modal */}
      {showAddModal && (
        <TableModal
          nextTableNumber={tables.length + 1}
          onClose={() => setShowAddModal(false)}
          onSave={handleSaveTable}
        />
      )}

      {/* Edit Table Modal */}
      {editingTable && (
        <TableModal
          table={editingTable}
          onClose={() => setEditingTable(null)}
          onSave={handleSaveTable}
        />
      )}

      {/* Table Timeline Audit Modal */}
      {selectedTimelineTable && (
        <TableTimeline
          table={selectedTimelineTable}
          menuItems={menuItems}
          onClose={() => setSelectedTimelineTable(null)}
        />
      )}

      {/* Delete Table Confirmation Dialog */}
      {deletingTableId && (
        <ConfirmDialog
          title="Delete Dining Table"
          message="Are you sure you want to delete this table? This action cannot be undone."
          confirmLabel="Delete Table"
          onConfirm={handleConfirmDelete}
          onClose={() => setDeletingTableId(null)}
        />
      )}
    </div>
  );
}
