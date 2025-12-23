// LeaveApprovalPage.js
import React, { useEffect, useState } from "react";
import { API_ENDPOINTS } from "../utils/apiConfig";

const LeaveApprovalPage = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("pending");
  const [bulkLoading, setBulkLoading] = useState(false);

  const isAdmin = (() => {
    try {
      return localStorage.getItem("isAdmin") === "true";
    } catch {
      return false;
    }
  })();

  useEffect(() => {
    if (!isAdmin) {
      setErrorMsg("Access denied: Admins only.");
      return;
    }
    fetchLeaves();
  }, [filterStatus]); // runs on mount + whenever filterStatus changes

  // listen to events from AdminChatbot (auto-approve or other dispatches)
  useEffect(() => {
    const handler = (ev) => {
      // optionally read ev.detail for more specific refresh behavior
      fetchLeaves();
    };
    window.addEventListener("leavesUpdated", handler);
    return () => window.removeEventListener("leavesUpdated", handler);
  }, []);

  async function fetchLeaves() {
    setLoading(true);
    setErrorMsg("");
    try {
      const base = window.__BACKEND_URL__ || "http://localhost:5000";
      const q = [];
      if (filterStatus && filterStatus !== "all")
        q.push(`status=${encodeURIComponent(filterStatus)}`);
      if (search) q.push(`search=${encodeURIComponent(search)}`);
      const qs = q.length ? `?${q.join("&")}` : "";
      const res = await fetch(`${base}/api/leaves${qs}`);
      if (!res.ok) throw new Error("Failed to load leave requests");
      const data = await res.json();
      const normalized = (data || []).map((d) => ({
        ...d,
        days: Number(d.days || calcDays(d.fromDate, d.toDate) || 0),
        leavesTakenThisMonth: Number(d.leavesTakenThisMonth ?? 0),
        monthlyQuota: Number(d.monthlyQuota ?? 2),
      }));
      setLeaves(normalized);
    } catch (err) {
      setErrorMsg(err.message || "Error fetching leave requests");
    } finally {
      setLoading(false);
    }
  }

  function calcDays(from, to) {
    try {
      const a = new Date(from);
      const b = new Date(to);
      const ms = Math.max(0, b - a) + 86400000;
      return Math.round(ms / 86400000);
    } catch {
      return 0;
    }
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  function selectAllVisible() {
    setSelected(new Set(leaves.map((l) => l._id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function doAction(id, action) {
    if (action === "deny" && !window.confirm("Deny this leave?")) return;
    setStatusMsg("");
    setErrorMsg("");

    // snapshot current state for rollback
    const prevSnapshot = leaves.map((l) => ({ ...l }));

    // optimistic update
    setLeaves((prev) =>
      prev.map((l) =>
        l._id === id
          ? { ...l, status: action === "approve" ? "approved" : "denied" }
          : l
      )
    );

    try {
      const base = window.__BACKEND_URL__ || "http://localhost:5000";
      const res = await fetch(`${base}/api/leaves/${id}/${action}`, {
        method: "POST",
      });

      if (!res.ok) {
        // rollback
        setLeaves(prevSnapshot);
        let text = res.statusText;
        try {
          const json = await res.json();
          if (json && (json.error || json.message)) text = json.error || json.message;
        } catch {}
        throw new Error(text || "Action failed");
      }

      setStatusMsg(`Leave ${action}d`);
      // notify other components (chatbot does the same)
      try {
        window.dispatchEvent(new CustomEvent("leavesUpdated", { detail: { ids: [id], action } }));
      } catch (e) {}
    } catch (err) {
      setErrorMsg(err.message || "Error performing action");
    }
  }

  async function bulkAction(action) {
    if (selected.size === 0) return;
    setBulkLoading(true);
    setStatusMsg("");
    setErrorMsg("");

    // snapshot for rollback
    const prevSnapshot = leaves.map((l) => ({ ...l }));
    const ids = Array.from(selected);

    // optimistic update
    setLeaves((prev) =>
      prev.map((l) =>
        ids.includes(l._id)
          ? { ...l, status: action === "approve" ? "approved" : "denied" }
          : l
      )
    );

    try {
      const base = window.__BACKEND_URL__ || "http://localhost:5000";
      const res = await fetch(`${base}/api/leaves/bulk-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action }),
      });

      if (!res.ok) {
        // rollback
        setLeaves(prevSnapshot);
        let text = res.statusText;
        try {
          const json = await res.json();
          if (json && (json.error || json.message)) text = json.error || json.message;
        } catch {}
        throw new Error(text || "Bulk action failed");
      }

      setStatusMsg(`Bulk ${action} successful`);
      clearSelection();
      try {
        window.dispatchEvent(new CustomEvent("leavesUpdated", { detail: { ids, action } }));
      } catch (e) {}
    } catch (err) {
      setErrorMsg(err.message || "Bulk action error");
    } finally {
      setBulkLoading(false);
    }
  }

  function formatDate(d) {
    if (!d) return "-";
    try {
      return new Date(d).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      });
    } catch {
      return d;
    }
  }

  function capitalize(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
  }

  return (
    <div className="leave-page">
      <header className="leave-header">
        <h2>Leave Approval</h2>
        <div className="controls">
          <input
            className="search-input"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchLeaves()}
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="denied">Denied</option>
            <option value="all">All</option>
          </select>
          <button className="btn" onClick={fetchLeaves}>
            Refresh
          </button>
        </div>
      </header>

      {errorMsg && <div className="alert error">{errorMsg}</div>}
      {statusMsg && <div className="alert success">{statusMsg}</div>}

      <div className="bulk-controls">
        <button className="btn ghost" onClick={selectAllVisible}>
          Select All
        </button>
        <button className="btn ghost" onClick={clearSelection}>
          Clear
        </button>
        <button
          className="btn"
          disabled={bulkLoading || selected.size === 0}
          onClick={() => bulkAction("approve")}
        >
          Bulk Approve
        </button>
        <button
          className="btn danger"
          disabled={bulkLoading || selected.size === 0}
          onClick={() => bulkAction("deny")}
        >
          Bulk Deny
        </button>
        <div className="selected-count">{selected.size} selected</div>
      </div>

      <div className="table-wrap">
        {loading ? (
          <div className="muted">Loading...</div>
        ) : (
          <table className="leave-table">
            <thead>
              <tr>
                <th></th>
                <th>Role</th>
                <th>Email</th>
                <th>Date Range</th>
                <th>Days</th>
                <th>Leaves Left</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {leaves.length === 0 ? (
                <tr>
                  <td colSpan="9" className="muted">
                    No leave requests found.
                  </td>
                </tr>
              ) : (
                leaves.map((l) => {
                  const leavesLeft = Math.max(
                    0,
                    (l.monthlyQuota || 2) - (l.leavesTakenThisMonth || 0)
                  );
                  return (
                    <tr key={l._id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.has(l._id)}
                          onChange={() => toggleSelect(l._id)}
                        />
                      </td>
                      <td className="emp-name">{l.employeeName || "-"}</td>
                      <td className="emp-email">{l.employeeEmail || "-"}</td>
                      <td>
                        {formatDate(l.fromDate)} → {formatDate(l.toDate)}
                      </td>
                      <td>{l.days}</td>
                      <td>{leavesLeft}</td>
                      <td className="reason">{l.reason || "-"}</td>
                      <td className={`status ${l.status}`}>
                        {capitalize(l.status)}
                      </td>
                      <td className="actions">
                        {l.status === "pending" ? (
                          <>
                            <button
                              className="btn small"
                              onClick={() => doAction(l._id, "approve")}
                            >
                              Approve
                            </button>
                            <button
                              className="btn small danger"
                              onClick={() => doAction(l._id, "deny")}
                            >
                              Deny
                            </button>
                          </>
                        ) : (
                          <span className="muted">{capitalize(l.status)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ✅ Inline CSS Section */}
      <style>{`
        :root {
          --bg: #f6f9fb;
          --card: #fff;
          --accent: #2563eb;
          --danger: #ef4444;
          --ok: #16a34a;
          --border: #e6eef8;
          --muted: #6b7280;
        }

        .leave-page { padding: 24px; background: var(--bg); min-height: 90vh; }
        .leave-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
        .controls { display:flex; gap:8px; align-items:center; }
        .search-input, select { padding:8px 10px; border:1px solid var(--border); border-radius:8px; }
        .btn { background: var(--accent); color:white; border:none; border-radius:8px; padding:8px 12px; cursor:pointer; }
        .btn.danger { background: var(--danger); }
        .btn.ghost { background:transparent; border:1px solid var(--border); color:black; }
        .btn.small { padding:5px 8px; font-size:0.9rem; border-radius:6px; }
        .alert { padding:10px 12px; border-radius:8px; margin:8px 0; }
        .alert.error { background:#fee2e2; color:var(--danger); }
        .alert.success { background:#dcfce7; color:var(--ok); }
        .bulk-controls { display:flex; gap:8px; align-items:center; margin-bottom:12px; }
        .selected-count { margin-left:auto; color:var(--muted); font-size:0.9rem; }
        .table-wrap { background:white; border-radius:10px; padding:12px; border:1px solid var(--border); box-shadow:0 4px 12px rgba(0,0,0,0.05); overflow:auto; }
        table { width:100%; border-collapse:collapse; }
        th, td { padding:10px; border-bottom:1px solid #f1f5f9; text-align:left; }
        th { background:#f8fafc; font-weight:600; color:#1e293b; }
        .emp-name { font-weight:600; color:#111827; }
        .emp-email { font-size:0.9rem; color:var(--muted); }
        .reason { max-width:250px; font-size:0.9rem; }
        .status.pending { background:#fff7ed; color:#92400e; padding:4px 6px; border-radius:6px; }
        .status.approved { background:#f0fdf4; color:#065f46; padding:4px 6px; border-radius:6px; }
        .status.denied { background:#fff0f6; color:#b91c1c; padding:4px 6px; border-radius:6px; }
        .muted { color:var(--muted); }
      `}</style>
    </div>
  );
};

export default LeaveApprovalPage;
