import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { LocaleProvider } from "./i18n/LocaleContext";
import { AdminOverviewPage } from "./components/AdminOverviewPage";
import { AdminPage } from "./components/AdminPage";
import { LoginPage } from "./components/LoginPage";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <LocaleProvider>
        <AuthProvider>
          <Routes>
            <Route path="/admin" element={<AdminOverviewPage />} />
            <Route path="/admin/review" element={<AdminPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/*" element={<App />} />
          </Routes>
        </AuthProvider>
      </LocaleProvider>
    </BrowserRouter>
  </StrictMode>,
);
