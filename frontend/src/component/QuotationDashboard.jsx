import React, { useEffect, useState } from 'react';
import { formatDateISOToDDMMYYYY } from '../utils/dateFormat';
import { API_ENDPOINTS } from "../utils/apiConfig";

const parseQuotation = (message = '') => {
  const result = { service: '', company: '', budget: '', deadline: '', details: '' };
  try {
    const svcMatch = message.match(/Quotation request for ([^\n-]+)/i);
    if (svcMatch) result.service = svcMatch[1].trim();
    const compMatch = message.match(/Company: ([^\n]+)/i);
    if (compMatch) result.company = compMatch[1].trim();
    const budgetMatch = message.match(/Budget: ([^\n]+)/i);
    if (budgetMatch) result.budget = budgetMatch[1].trim();
    const dlMatch = message.match(/Deadline: ([^\n]+)/i);
    if (dlMatch) result.deadline = dlMatch[1].trim();
    const detailsMatch = message.match(/Details:\s*([\s\S]*)$/i);
    if (detailsMatch) result.details = detailsMatch[1].trim();
  } catch (e) {
    // ignore
  }
  return result;
};

const QuotationDashboard = () => {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchQuotations(); }, []);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
  const res = await fetch('http://localhost:5000/api/quotations');
      const data = await res.json();
      const quotes = (data || []).filter((q) => (q.message || '').toLowerCase().includes('quotation request'));
      setQuotations(quotes);
    } catch (err) {
      console.error('Failed to fetch quotations', err);
    } finally { setLoading(false); }
  };

  const markResolved = async (id) => {
    try {
    await fetch(`http://localhost:5000/api/quotations/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'Resolved' }) });
  try { window.location.reload(); } catch(e) {}
      fetchQuotations();
    } catch (err) { console.error(err); }
  };

  const deleteQuotation = async (id) => {
    if (!window.confirm('Delete this quotation request?')) return;
    try {
  await fetch(`http://localhost:5000/api/quotations/${id}`, { method: 'DELETE' });
  try { window.location.reload(); } catch(e) {}
      fetchQuotations();
    } catch (err) { console.error(err); }
  };

  if (loading) return <h3 style={{ textAlign: 'center' }}>Loading quotations...</h3>;

  return (
    <div className="container" style={{ paddingTop: 18 }}>
      <div className="card fade-in" style={{ padding: 18 }}>
        <h2 style={{ marginBottom: 12 }}>💼 Quotation Requests</h2>
        <p className="muted" style={{ marginTop: 0 }}>List of quotation requests submitted via the website.</p>

        <div style={{ display: 'flex', gap: 16, marginTop: 16, marginBottom: 20 }}>
          <div style={{ padding: 12, background: '#f9f9f9', borderRadius: 8 }}>
            <strong style={{ fontSize: 18 }}>{quotations.length}</strong>
            <div style={{ color: '#666' }}>Total Quotations</div>
          </div>
          <div style={{ padding: 12, background: '#f9f9f9', borderRadius: 8 }}>
            <strong style={{ fontSize: 18 }}>{quotations.filter(q => (q.status || 'Pending') === 'Pending').length}</strong>
            <div style={{ color: '#666' }}>Pending</div>
          </div>
          <div style={{ padding: 12, background: '#f9f9f9', borderRadius: 8 }}>
            <strong style={{ fontSize: 18 }}>{quotations.filter(q => (q.status || '') === 'Resolved').length}</strong>
            <div style={{ color: '#666' }}>Resolved</div>
          </div>
        </div>

        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f1f1f1' }}>
              <tr>
                <th style={th}>#</th>
                <th style={th}>Name</th>
                <th style={th}>Email</th>
                <th style={th}>Phone</th>
                <th style={th}>Service</th>
                <th style={th}>Company</th>
                <th style={th}>Budget</th>
                <th style={th}>Deadline</th>
                <th style={th}>Message</th>
                <th style={th}>Status</th>
                <th style={th}>Date</th>
                <th style={th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {quotations.map((q, idx) => {
                const parsed = parseQuotation(q.message);
                return (
                  <tr key={q._id || idx} style={{ background: '#fff' }}>
                    <td style={td}>{idx + 1}</td>
                    <td style={td}>{q.name}</td>
                    <td style={td}>{q.email}</td>
                    <td style={td}>{q.phone_number}</td>
                    <td style={td}>{parsed.service || '-'}</td>
                    <td style={td}>{parsed.company || '-'}</td>
                    <td style={td}>{parsed.budget || '-'}</td>
                    <td style={td}>{parsed.deadline || '-'}</td>
                    <td style={td} title={q.message}><div style={{maxWidth:260,whiteSpace:'normal',overflow:'hidden',textOverflow:'ellipsis'}}>{parsed.details || '-'}</div></td>
                    <td style={td}><span style={{ color: (q.status === 'Resolved' ? 'green' : 'orange'), fontWeight: '600' }}>{q.status || 'Pending'}</span></td>
                    <td style={td}>{formatDateISOToDDMMYYYY(q.createdAt)}</td>
                    <td style={td}>
                      {q.status !== 'Resolved' && <button onClick={() => markResolved(q._id)} style={{...actionBtn, ...primaryVariant}}>Mark Resolved</button>}
                      <button onClick={() => deleteQuotation(q._id)} style={{...actionBtn, ...dangerVariant}}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const th = { padding: 10, border: '1px solid #e6e6e6', textAlign: 'left' };
const td = { padding: 10, border: '1px solid #e6e6e6', verticalAlign: 'top' };
const actionBtn = { background: '#eee', color: '#111', border: 'none', padding: '8px 12px', borderRadius: 4, cursor: 'pointer', marginRight: 8, minWidth: 110, textAlign: 'center' };
const primaryVariant = { background: '#28a745', color: '#fff' };
const dangerVariant = { background: '#dc3545', color: '#fff' };

export default QuotationDashboard;
