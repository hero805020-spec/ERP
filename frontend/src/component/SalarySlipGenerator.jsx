// SalarySlipGenerator.js
import React, { useState, useEffect } from 'react';
import './SalarySlip.css';
import { API_ENDPOINTS } from "../utils/apiConfig";

const SalarySlipGenerator = () => {
  const [form, setForm] = useState({
    name: '', empId: '', email: '', designation: '',
    month: '', year: '', basic: '', hra: '', allowances: '',
    pf: '', tax: '', deductions: ''
  });

  const [statusMsg, setStatusMsg] = useState('');
  const [slips, setSlips] = useState([]);
  const [downloadStatus, setDownloadStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const loggedEmail = (() => {
    try {
      return localStorage.getItem('employeeEmail') || '';
    } catch {
      return '';
    }
  })();

  const isAdmin = (() => { try { return localStorage.getItem('isAdmin') === 'true'; } catch { return false; } })();

  useEffect(() => {
    const fetchSlips = async () => {
      try {
        const base = window.__BACKEND_URL__ || 'http://localhost:5000';
        if (!isAdmin && !loggedEmail) return;
        const url = isAdmin ? `${base}/api/salary-slips` : `${base}/api/salary-slips?email=${encodeURIComponent(loggedEmail)}`;
        const res = await fetch(url, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error(`Failed to fetch salary slips (${res.status})`);
        const data = await res.json();
        setSlips(Array.isArray(data) ? data : (data.slips || []));
      } catch (e) {
        console.error('Failed to fetch slips', e);
      }
    };
    fetchSlips();

    const onCreated = (e) => {
      const slip = e.detail;
      if (!slip) return;
      if (isAdmin || slip.email === loggedEmail) setSlips((s) => [slip, ...s]);
    };
    window.addEventListener('salarySlipCreated', onCreated);

    return () => window.removeEventListener('salarySlipCreated', onCreated);
  }, [loggedEmail, isAdmin]);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const numberVal = (v) => {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  };

  const computeTotals = (f) => {
    const basic = numberVal(f.basic);
    const hra = numberVal(f.hra);
    const allowances = numberVal(f.allowances);
    const pf = numberVal(f.pf);
    const tax = numberVal(f.tax);
    const otherDeductions = numberVal(f.deductions);
    const totalEarnings = basic + hra + allowances;
    const totalDeductions = pf + tax + otherDeductions;
    const netPay = totalEarnings - totalDeductions;
    return { basic, hra, allowances, pf, tax, otherDeductions, totalEarnings, totalDeductions, netPay };
  };

  async function submit() {
    setStatusMsg('');
    setLoading(true);
    try {
      const nums = computeTotals(form);
      const fd = new FormData();
      fd.append('employeeName', form.name || '');
      fd.append('empId', form.empId || '');
      fd.append('email', form.email || '');
      fd.append('designation', form.designation || '');
      fd.append('month', form.month || '');
      fd.append('year', form.year || '');
      fd.append('basic', nums.basic);
      fd.append('hra', nums.hra);
      fd.append('allowances', nums.allowances);
      fd.append('pf', nums.pf);
      fd.append('tax', nums.tax);
      fd.append('otherDeductions', nums.otherDeductions);
      fd.append('totalEarnings', nums.totalEarnings);
      fd.append('totalDeductions', nums.totalDeductions);
      fd.append('netPay', nums.netPay);

      const base = window.__BACKEND_URL__ || 'http://localhost:5000';
      const res = await fetch(`${base}/api/salary-slips`, { method: 'POST', body: fd, headers: getAuthHeaders(false) });
      if (!res.ok) {
        const txt = await safeReadText(res);
        throw new Error(`Submit failed: ${res.status} ${txt}`);
      }
      const saved = await res.json().catch(() => null);
      setStatusMsg('Salary slip submitted successfully \u2705');
      // Handle both response formats: direct slip object or wrapped { slip: ... }
      const slipObj = saved?.slip || saved;
      window.dispatchEvent(new CustomEvent('salarySlipCreated', { detail: slipObj }));
      // Update local list immediately
      if (slipObj) setSlips((s) => [slipObj, ...s]);
      // DO NOT reload — we updated state via event dispatch
    } catch (err) {
      console.error('Submit error', err);
      setStatusMsg(`Error submitting salary slip ❌ ${err.message || ''}`);
    } finally {
      setLoading(false);
    }
  }

  // --- Download / generate logic (fixed) ---
  async function handleDownload(slip) {
    setDownloadStatus('');
    try {
      setDownloadStatus('Preparing download...');
      const base = window.__BACKEND_URL__ || 'http://localhost:5000';
      let pdfUrl = '';
      // If slip already has a pdf path, use it directly
      if (slip.pdfPath) {
        pdfUrl = toAbsoluteUrl(base, slip.pdfPath);
      } else {
        // ask backend to generate PDF and return path
        const genRes = await fetch(`${base}/api/salary-slips/${encodeURIComponent(slip._id)}/generate`, {
          method: 'POST',
          headers: getAuthHeaders(),
        });

        if (!genRes.ok) {
          const t = await safeReadText(genRes);
          throw new Error(`Generate failed: ${genRes.status} ${t}`);
        }

        // try to parse json (expected { pdfPath: "..." } ), fallback to known endpoint
        let genJson = null;
        try { genJson = await genRes.json(); } catch {}
        if (genJson && genJson.pdfPath) {
          pdfUrl = toAbsoluteUrl(base, genJson.pdfPath);
        } else {
          // fallback endpoint (some backends stream at this path)
          pdfUrl = `${base}/api/salary-slips/${encodeURIComponent(slip._id)}/pdf`;
        }
      }

      setDownloadStatus('Downloading PDF...');
      await downloadAndHandle(pdfUrl, `${sanitizeFilename(slip.employeeName || slip.email || 'salary')}_${slip.month}_${slip.year}.pdf`);
      setDownloadStatus('Downloaded successfully.');
    } catch (err) {
      console.error('Download error', err);
      setDownloadStatus(`Download failed. ${err.message || ''}`);
    }
  }

  // helper to build absolute url safely
  function toAbsoluteUrl(base, path) {
    if (!path) return `${base}/`;
    return path.startsWith('http') ? path : `${base}/${path.replace(/^\/+/, '')}`;
  }

  // include Authorization header if token present (tries common keys)
  function getAuthHeaders(asJson = true) {
    const headers = {};
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken') || localStorage.getItem('authToken');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    } catch {}
    if (asJson) headers['Content-Type'] = 'application/json';
    return headers;
  }

  // read non-JSON response safely for error messages
  async function safeReadText(res) {
    try { return await res.text(); } catch { return String(res.statusText || ''); }
  }

  // sanitize filename to remove spaces/special chars
  function sanitizeFilename(name) {
    return name.replace(/[^\w\-_. ]/g, '').replace(/\s+/g, '_');
  }

  // download helper: fetch blob, validate, auto-click
  async function downloadAndHandle(url, filename) {
    const headers = getAuthHeaders(false);
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const t = await safeReadText(res);
      throw new Error(`Download responded ${res.status}: ${t}`);
    }

    // try to detect content-type; if not pdf, throw with the response body for debugging
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    const blob = await res.blob();

    if (!contentType.includes('pdf')) {
      // sometimes servers don't set header; still check magic bytes of PDF
      const arr = await blob.slice(0, 4).arrayBuffer();
      const sig = new Uint8Array(arr);
      // PDF files start with "%PDF"
      const isPdfSig = sig[0] === 0x25 && sig[1] === 0x50 && sig[2] === 0x44 && sig[3] === 0x46;
      if (!isPdfSig) {
        // try to read text for error details
        const txt = await blob.text().catch(() => 'Non-pdf response');
        throw new Error(`Server did not return a PDF. Response: ${txt.substring(0, 300)}`);
      }
    }

    // create a temporary link to download the file
    const urlObj = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = urlObj;
    link.download = filename || 'salary-slip.pdf';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(urlObj);
  }

  return (
    <div className="salary-container">
      <div className="salary-card fade-in">
        <h2 className="salary-title">Salary Slip Generator</h2>
        <p className="salary-subtitle">Fill in the details and click <b>Submit</b>.</p>

        <div className="salary-form">
          {[ ['Employee Name', 'name'], ['Employee ID', 'empId'], ['Employee Email', 'email'], ['Designation', 'designation'], ['Month', 'month'], ['Year', 'year'] ].map(([label, key]) => (
            <label key={key}>
              {label}
              <input value={form[key]} onChange={(e) => update(key, e.target.value)} />
            </label>
          ))}

          {[ ['Basic Pay', 'basic'], ['HRA', 'hra'], ['Other Allowances', 'allowances'], ['PF', 'pf'], ['Tax', 'tax'], ['Other Deductions', 'deductions'] ].map(([label, key]) => (
            <label key={key}>
              {label}
              <div className="rupee-input">
                <input type="number" value={form[key]} onChange={(e) => update(key, e.target.value)} />
              </div>
            </label>
          ))}
        </div>

        {(() => {
          const t = computeTotals(form);
          return (
            <div style={{ marginTop: 12, borderTop: '1px solid #eee', paddingTop: 12 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>Total Earnings: {t.totalEarnings.toLocaleString('en-IN')}</div>
                <div style={{ flex: 1 }}>Total Deductions: {t.totalDeductions.toLocaleString('en-IN')}</div>
                <div style={{ flex: 1, fontWeight: 700 }}>Net Pay: {t.netPay.toLocaleString('en-IN')}</div>
              </div>
            </div>
          );
        })()}

        <div className="salary-btn-container">
          <button className="salary-btn" onClick={submit} disabled={loading}>
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </div>

        {statusMsg && <div style={{ marginTop: 12, color: '#2a7f2a', fontWeight: 600 }}>{statusMsg}</div>}
        {downloadStatus && <div style={{ marginTop: 8, color: '#0b5394' }}>{downloadStatus}</div>}

        <div className="salary-list" style={{ marginTop: 28 }}>
          <h3>Salary Slips</h3>
          {slips.length === 0 ? (
            <p className="muted">No salary slips available.</p>
          ) : (
            <ul>
              {slips.map((s) => (
                <li key={s._id || `${s.email}_${s.month}_${s.year}`} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <strong>{s.month} {s.year}</strong> — Net: {Number(s.netPay || 0).toLocaleString('en-IN')}
                      <div style={{ fontSize: 12, color: '#666' }}>{s.employeeName || s.email || ''}</div>
                    </div>
                    <div>
                      <button
                        style={{ marginLeft: 12 }}
                        onClick={() => handleDownload(s)}
                      >
                        {s.pdfPath ? 'Download' : 'Generate & Download'}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalarySlipGenerator;
