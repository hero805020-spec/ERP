// ✅ App.js — Main Router + Page Transition Wrapper
import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import Admin from "./component/Admin";
import Enquiry from "./component/Enquiry";
import Navbar from "./component/Navbar";
import EnquiryDetail from "./component/EnquiryDetail";
import Apply from "./component/Apply";
import AdminLogin from "./component/AdminLogin";
import AdminLoginPage from "./component/AdminLoginPage";
import Home from "./component/Home";
import Services from "./component/Services";
import Quotation from "./component/Quotation";
import QuotationDashboard from "./component/QuotationDashboard";
import Applications from "./component/Applications";
import ManagerLogin from "./component/ManagerLogin";
import SalarySlipGenerator from "./component/SalarySlipGenerator";
import ManagerDashboard from "./component/ManagerDashboard";
import EmployeeLogin from "./component/EmployeeLogin";
import EmployeeDashboard from "./component/EmployeeDashboard";
import EmployeeSalarySlipPage from "./component/EmployeeSalarySlipPage";
import LeaveRequestPage from "./component/LeaveRequestPage";
import LeaveApprovals from "./component/LeaveApprovals";
import EmployeeListPage from "./component/EmployeeListPage.jsx";
import LoginActivities from "./component/LoginActivities";
import "./Navbar.css";
import "./Login.css";
import "./Admin.css";
import "./Enquiry_Details.css";

// ✅ Page transition wrapper
const PageWrapper = ({ children }) => {
  const location = useLocation();
  const [entered, setEntered] = useState(false);
  const wrapperRef = React.useRef(null);

  useEffect(() => {
  fetch("https://your-backend.onrender.com/test")
    .then(res => res.json())
    .then(data => console.log("Backend Response:", data))
    .catch(err => console.log("Error:", err));
}, []);

  useEffect(() => {
    setEntered(false);
    const id = setTimeout(() => setEntered(true), 10);

    // when entering, apply staggered animation classes to common UI elements
    const animateOnEnter = () => {
      if (!wrapperRef.current) return;
      // selectors we want to auto-animate across pages
      const selectors = [
        '.card',
        '.admin-card',
        '.salary-list li',
        'table tbody tr',
        '.card .card-item',
        '.btn',
        '.fade-in',
        '.slide-up',
      ];
      const nodes = wrapperRef.current.querySelectorAll(selectors.join(','));
      nodes.forEach((el, i) => {
        // set staggered delay
        el.style.animationDelay = `${i * 80}ms`;
        // add a generic cinematic class that triggers our keyframes
        el.classList.add('cinematic-staggered');
      });
      // clear delays after animation completes to avoid side-effects
      if (nodes.length) {
        const total = nodes.length * 80 + 1200;
        setTimeout(() => {
          nodes.forEach((el) => {
            el.style.animationDelay = '';
            el.classList.remove('cinematic-staggered');
          });
        }, total);
      }
    };

    // schedule animateOnEnter slightly after we mark entered
    const animTimeout = setTimeout(() => {
      if (entered) animateOnEnter();
    }, 60);

    return () => {
      clearTimeout(id);
      clearTimeout(animTimeout);
    };
  }, [location.pathname, entered]);

  return (
    <div
      ref={wrapperRef}
      className={`page-wrapper ${entered ? "enter" : ""}`}
      key={location.pathname}
    >
      {children}
    </div>
  );
};

const App = () => {
  const [showAdminLogin, setShowAdminLogin] = useState(false);

  // ✅ Simple safe check for admin state
  const isAdmin = () => {
    try {
      return localStorage.getItem("isAdmin") === "true";
    } catch {
      return false;
    }
  };

  // ✅ Route protection for admin-only pages
  const Protected = ({ children }) =>
    isAdmin() ? children : <Navigate to="/" replace />;

  return (
    <Router>
      <Navbar openAdminLogin={() => setShowAdminLogin(true)} />
      <AdminLogin
        open={showAdminLogin}
        onClose={() => setShowAdminLogin(false)}
      />

      <Routes>
        <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
  <Route path="/admin" element={<PageWrapper><Admin /></PageWrapper>} />
  <Route path="/admin-login" element={<PageWrapper><AdminLoginPage /></PageWrapper>} />
        <Route path="/apply" element={<PageWrapper><Apply /></PageWrapper>} />
        <Route path="/services" element={<PageWrapper><Services /></PageWrapper>} />
        <Route path="/quotation" element={<PageWrapper><Quotation /></PageWrapper>} />
        <Route path="/quotations" element={<Protected><PageWrapper><QuotationDashboard /></PageWrapper></Protected>} />
        <Route path="/enquiry" element={<PageWrapper><Enquiry /></PageWrapper>} />
        <Route path="/enquiry-details" element={<Protected><PageWrapper><EnquiryDetail /></PageWrapper></Protected>} />
        <Route path="/applications" element={<Protected><PageWrapper><Applications /></PageWrapper></Protected>} />
        <Route path="/employee-list" element={<Protected><PageWrapper><EmployeeListPage /></PageWrapper></Protected>} />
  <Route path="/manager-login" element={<PageWrapper><ManagerLogin /></PageWrapper>} />
  <Route path="/employee-login" element={<PageWrapper><EmployeeLogin /></PageWrapper>} />
        <Route path="/manager" element={
          localStorage.getItem('isManager') === 'true' ? (
            <PageWrapper><ManagerDashboard /></PageWrapper>
          ) : (
            <Navigate to="/manager-login" replace />
          )
        } />
        <Route path="/manager/salary" element={
          localStorage.getItem('isManager') === 'true' ? (
            <PageWrapper><SalarySlipGenerator /></PageWrapper>
          ) : (
            <Navigate to="/manager-login" replace />
          )
        } />
        <Route path="/salary" element={<Protected><PageWrapper><SalarySlipGenerator /></PageWrapper></Protected>} />
  <Route path="/leaves" element={<Protected><PageWrapper><LeaveApprovals /></PageWrapper></Protected>} />
          <Route path="/admin/login-activities" element={<Protected><PageWrapper><LoginActivities /></PageWrapper></Protected>} />
        <Route path="/employee" element={
          localStorage.getItem('isEmployee') === 'true' ? (
            <PageWrapper><EmployeeDashboard /></PageWrapper>
          ) : (
            <Navigate to="/employee-login" replace />
          )
        } />
        <Route path="/employee/salary" element={
          localStorage.getItem('isEmployee') === 'true' ? (
            <PageWrapper><EmployeeSalarySlipPage /></PageWrapper>
          ) : (
            <Navigate to="/employee-login" replace />
          )
        } />
        <Route path="/request-leave" element={
          localStorage.getItem('isEmployee') === 'true' ? (
            <PageWrapper><LeaveRequestPage /></PageWrapper>
          ) : (
            <Navigate to="/employee-login" replace />
          )
        } />
      </Routes>
    </Router>
  );
};

export default App;
