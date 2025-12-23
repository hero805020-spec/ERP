// LeaveRequestPage.js
import React, { useState, useEffect } from "react";
import { API_ENDPOINTS } from "../utils/apiConfig";

const LeaveRequestPage = () => {
  const [form, setForm] = useState({
    fromDate: "",
    toDate: "",
    type: "Casual Leave",
    reason: "",
  });
  const [leaves, setLeaves] = useState([]);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [monthlyQuota] = useState(2); // ✅ Default monthly leave limit

  const employeeEmail = (() => {
    try {
      return localStorage.getItem("employeeEmail") || "";
    } catch {
      return "";
    }
  })();

  const employeeName = (() => {
    try {
      return localStorage.getItem("employeeName") || "Employee";
    } catch {
      return "Employee";
    }
  })();

  useEffect(() => {
    fetchMyLeaves();
  }, []);

  async function fetchMyLeaves() {
    setLoading(true);
    try {
      const base = window.__BACKEND_URL__ || "http://localhost:5000";
      const res = await fetch(
        `${base}/api/leaves?email=${encodeURIComponent(employeeEmail)}`
      );
      if (!res.ok) throw new Error("Failed to load leaves");
      const data = await res.json();
      setLeaves(data);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Calculate total leaves taken in the current month
  function getLeavesTakenThisMonth() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Sum the number of days for leaves that start in the current month/year and are not denied.
    // Fall back to the `days` property or calculate from dates if missing.
    return leaves.reduce((sum, l) => {
      try {
        if (l.status === 'denied') return sum;
        const from = new Date(l.fromDate);
        if (from.getMonth() !== currentMonth || from.getFullYear() !== currentYear) return sum;
        const d = Number(l.days) || calcDays(l.fromDate, l.toDate) || 0;
        return sum + (isNaN(d) ? 0 : d);
      } catch {
        return sum;
      }
    }, 0);
  }

  const leavesTakenThisMonth = getLeavesTakenThisMonth();
  const leavesLeft = Math.max(0, monthlyQuota - leavesTakenThisMonth);

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

  async function submitRequest() {
    setErrorMsg("");
    setStatusMsg("");
    const { fromDate, toDate, reason, type } = form;

    if (!fromDate || !toDate || !reason) {
      setErrorMsg("Please fill all required fields.");
      return;
    }

    const days = calcDays(fromDate, toDate);

    if (leavesLeft <= 0) {
      setErrorMsg("❌ You’ve reached your monthly leave limit.");
      return;
    }

    const payload = {
      employeeName,
      employeeEmail,
      fromDate,
      toDate,
      days,
      reason,
      type,
      status: "pending",
      monthlyQuota,
      leavesTakenThisMonth,
    };

    try {
      const base = window.__BACKEND_URL__ || "http://localhost:5000";
      const res = await fetch(`${base}/api/leaves`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to submit request");
      const saved = await res.json();
        setStatusMsg("\u2705 Leave request submitted successfully.");
        // full-page reload so all components refresh
        window.location.reload();
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  function formatDate(d) {
    if (!d) return "-";
    try {
      return new Date(d).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
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
        <h2>Leave Request</h2>
      </header>

      {/* Info Panel */}
      <div className="info-panel">
        <p>
          <b>Monthly Quota:</b> {monthlyQuota} |{" "}
          <b>Leaves Taken:</b> {leavesTakenThisMonth} |{" "}
          <b>Leaves Left:</b>{" "}
          <span className={leavesLeft === 0 ? "red" : "green"}>{leavesLeft}</span>
        </p>
      </div>

      {errorMsg && <div className="alert error">{errorMsg}</div>}
      {statusMsg && <div className="alert success">{statusMsg}</div>}

      {/* Leave Request Form */}
      <div className="form-card">
        <h3>Apply for Leave</h3>
        <div className="form-grid">
          <label>
            From Date
            <input
              type="date"
              value={form.fromDate}
              onChange={(e) => setForm({ ...form, fromDate: e.target.value })}
            />
          </label>
          <label>
            To Date
            <input
              type="date"
              value={form.toDate}
              onChange={(e) => setForm({ ...form, toDate: e.target.value })}
            />
          </label>
          <label>
            Leave Type
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option>Casual Leave</option>
              <option>Sick Leave</option>
              <option>Emergency Leave</option>
              <option>Paid Leave</option>
            </select>
          </label>
          <label className="full">
            Reason
            <textarea
              rows="3"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Enter your reason..."
            ></textarea>
          </label>
        </div>
        <div className="form-btn">
          <button
            className="btn"
            onClick={submitRequest}
            disabled={leavesLeft <= 0}
          >
            Submit Request
          </button>
        </div>
      </div>

      {/* Leave History */}
      <div className="table-wrap" style={{ marginTop: 24 }}>
        <h3>Your Leave Requests</h3>
        {loading ? (
          <p className="muted">Loading...</p>
        ) : leaves.length === 0 ? (
          <p className="muted">No leave requests yet.</p>
        ) : (
          <table className="leave-table">
            <thead>
              <tr>
                <th>From</th>
                <th>To</th>
                <th>Days</th>
                <th>Type</th>
                <th>Reason</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map((l) => (
                <tr key={l._id}>
                  <td>{formatDate(l.fromDate)}</td>
                  <td>{formatDate(l.toDate)}</td>
                  <td>{l.days}</td>
                  <td>{l.type}</td>
                  <td>{l.reason}</td>
                  <td className={`status ${l.status}`}>
                    {capitalize(l.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Inline CSS */}
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
        .leave-header { margin-bottom: 16px; }
        .info-panel { background:#eef4ff; padding:10px 14px; border-radius:8px; margin-bottom:10px; font-size:0.95rem; color:#1e293b; }
        .info-panel .red { color:var(--danger); font-weight:600; }
        .info-panel .green { color:var(--ok); font-weight:600; }
        .form-card { background: white; padding: 20px; border-radius: 10px; border:1px solid var(--border); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .form-card h3 { margin-bottom: 12px; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .form-grid label { display:flex; flex-direction:column; font-weight:600; color:#1e293b; font-size:0.95rem; }
        .form-grid input, .form-grid select, textarea { margin-top:6px; padding:8px 10px; border:1px solid var(--border); border-radius:6px; font-size:0.95rem; }
        .form-grid .full { grid-column: span 2; }
        .form-btn { margin-top: 16px; text-align:right; }
        .btn { background: var(--accent); color:white; border:none; border-radius:8px; padding:8px 14px; cursor:pointer; }
        .btn[disabled] { background:#cbd5e1; cursor:not-allowed; }
        .alert { padding:10px 12px; border-radius:8px; margin-bottom:10px; }
        .alert.error { background:#fee2e2; color:var(--danger); }
        .alert.success { background:#dcfce7; color:var(--ok); }
        .table-wrap { background: var(--card); padding:16px; border-radius:10px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border:1px solid var(--border); overflow:auto; }
        table { width:100%; border-collapse:collapse; margin-top:10px; }
        th, td { padding:10px; border-bottom:1px solid #f1f5f9; text-align:left; }
        th { background:#f8fafc; font-weight:600; color:#1e293b; }
        .status.pending { background:#fff7ed; color:#92400e; padding:4px 6px; border-radius:6px; }
        .status.approved { background:#f0fdf4; color:#065f46; padding:4px 6px; border-radius:6px; }
        .status.denied { background:#fff0f6; color:#b91c1c; padding:4px 6px; border-radius:6px; }
        .muted { color:var(--muted); }
      `}</style>
    </div>
  );
};

export default LeaveRequestPage;
