import React, { useState, useEffect } from "react";
import { Database, RefreshCw, Table, Server, ExternalLink, Search, CheckCircle2, ShieldCheck, ChevronRight } from "lucide-react";

interface DatabaseExplorerProps {
  onClose?: () => void;
}

export default function DatabaseExplorer({ onClose }: DatabaseExplorerProps) {
  const [selectedTable, setSelectedTable] = useState<string>("complaints");
  const [tableCounts, setTableCounts] = useState<Record<string, number>>({});
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const tables = [
    { id: "complaints", label: "Complaints", desc: "Core triaged customer issues & AI scores" },
    { id: "tasks", label: "Tasks", desc: "Operational queue items assigned to employees" },
    { id: "source_messages", label: "Source Messages", desc: "Raw payloads from WhatsApp, Gmail, Web" },
    { id: "sources", label: "Sources", desc: "Registered channel connectors & status" },
    { id: "employees", label: "Employees", desc: "Team agents & department skill profiles" },
    { id: "status_history", label: "Status History", desc: "Audit logs of workflow transitions" },
  ];

  const fetchTableData = async (table: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/database-explorer?table=${table}`);
      if (res.ok) {
        const data = await res.json();
        setColumns(data.columns || []);
        setRows(data.rows || []);
        setTotalRows(data.totalRows || 0);
        if (data.tableCounts) {
          setTableCounts(data.tableCounts);
        }
      }
    } catch (err) {
      console.error("Failed to load table:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTableData(selectedTable);
  }, [selectedTable]);

  const filteredRows = rows.filter(row => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return Object.values(row).some(v => String(v).toLowerCase().includes(term));
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Live Supabase PostgreSQL Database</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Database Explorer</h1>
            <p className="text-xs text-slate-300 max-w-2xl">
              Inspect real tables, rows, and raw messages in your Supabase PostgreSQL cluster.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 transition flex items-center gap-1.5"
            >
              <span>Supabase Console</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={() => fetchTableData(selectedTable)}
              disabled={loading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Database Meta Chips */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800 text-xs">
          <div className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/60">
            <span className="text-slate-400 block text-[11px]">Database Provider</span>
            <span className="font-semibold text-emerald-400">Supabase Cloud (PostgreSQL 15)</span>
          </div>
          <div className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/60">
            <span className="text-slate-400 block text-[11px]">Connection Region</span>
            <span className="font-semibold text-slate-200">aws-0-ap-south-1 (Mumbai Pooler)</span>
          </div>
          <div className="p-2.5 bg-slate-800/60 rounded-xl border border-slate-700/60">
            <span className="text-slate-400 block text-[11px]">Active Schema</span>
            <span className="font-semibold text-slate-200">public • 6 Connected Tables</span>
          </div>
        </div>
      </div>

      {/* Table Selector Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {tables.map(t => {
          const count = tableCounts[t.id];
          const isSelected = selectedTable === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSelectedTable(t.id)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
                isSelected
                  ? "bg-brand-primary text-white shadow-xs"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>{t.label}</span>
              {count !== undefined && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Table Content Card */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 capitalize">
              table: <span className="font-mono text-brand-primary font-bold">{selectedTable}</span>
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              ({filteredRows.length} displayed • {totalRows} total records)
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search table rows..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-brand-primary outline-none"
            />
          </div>
        </div>

        {/* Scrollable Data Table */}
        <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-brand-primary" />
              <span>Querying PostgreSQL...</span>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No matching records found in table "{selectedTable}".
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  {columns.map(col => (
                    <th key={col} className="p-3 font-bold font-mono text-[11px] text-slate-700 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition font-mono text-[11px]">
                    {columns.map(col => {
                      const val = row[col];
                      let displayVal = val;
                      if (val === null || val === undefined) {
                        displayVal = <span className="text-slate-300 italic">null</span>;
                      } else if (typeof val === "object") {
                        displayVal = (
                          <span className="text-slate-500 truncate block max-w-xs" title={JSON.stringify(val)}>
                            {JSON.stringify(val)}
                          </span>
                        );
                      } else if (typeof val === "string" && val.length > 60) {
                        displayVal = (
                          <span title={val} className="truncate block max-w-xs">
                            {val}
                          </span>
                        );
                      }
                      return (
                        <td key={col} className="p-3 text-slate-700 whitespace-nowrap max-w-xs">
                          {displayVal}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
