import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../Admin.css";
import { API_ENDPOINTS } from "../utils/apiConfig";

const Apply = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "" });
  const [resumeFile, setResumeFile] = useState(null);
  const [coverLetterFile, setCoverLetterFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleFileChange = (e) => setResumeFile(e.target.files[0] || null);
  const handleCoverFileChange = (e) => setCoverLetterFile(e.target.files[0] || null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const fd = new FormData();
      Object.entries(form).forEach(([key, value]) => fd.append(key, value));
      if (resumeFile) fd.append("resume", resumeFile);
      // backend expects the cover letter file field to be named "coverLetterFile"
      if (coverLetterFile) fd.append("coverLetterFile", coverLetterFile);

      const base = window.__BACKEND_URL__ || 'http://localhost:5000';
      const res = await fetch(`${base}/api/applications`, { method: "POST", body: fd });
      if (!res.ok) throw new Error("Failed to submit application");
      alert("Application submitted! We'll get back to you.");
      try { window.location.href = '/'; } catch(e) { navigate('/'); }
    } catch (err) {
      console.error(err);
      alert("Error submitting your application.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-content">
        {/* only change: slide-up -> fade-in-top to add top-to-bottom animation, old CSS preserved */}
        <div className="card fade-in-top" style={{ maxWidth: 500, margin: "0 auto" }}>
          <div className="admin-header">
            <h2>Apply for a Job</h2>
          </div>

          <form onSubmit={handleSubmit} className="user-form">
            { ["name", "email", "phone"].map((field) => (
              <div className="input-group" key={field}>
                <label>{field[0].toUpperCase() + field.slice(1)}</label>
                <input
                  name={field}
                  type={field === "email" ? "email" : field === "phone" ? "tel" : "text"}
                  value={form[field]}
                  onChange={handleChange}
                  required={field !== "phone"}
                />
              </div>
            )) }

            <div className="input-group">
              <label>Role</label>
              <select name="role" value={form.role} onChange={handleChange} required>
                <option value="">Select role</option>
                <option value="Frontend developer">Frontend developer</option>
                <option value="Backend developer">Backend developer</option>
                <option value="Full stack developer">Full stack developer</option>
                <option value="UI/UX designer">UI/UX designer</option>
                <option value="Data Analyst">Data Analyst</option>
              </select>
            </div>

            <div className="input-group">
              <label>Resume (PDF/DOC)</label>
              <input name="resume" type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} />
            </div>

            <div className="input-group">
              <label>Cover Letter (PDF)</label>
              <input name="coverLetter" type="file" accept=".pdf" onChange={handleCoverFileChange} />
            </div>

            <div className="button-group">
              <button type="submit" className="ok-btn" disabled={submitting}>
                {submitting ? "Submitting..." : "Apply"}
              </button>
              <button type="button" onClick={() => navigate(-1)} className="cancel-btn">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Apply;
