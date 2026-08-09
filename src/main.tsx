import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { AuthModalProvider } from "./auth/AuthModalContext";
import { EditRecipeProvider } from "./admin/EditRecipeContext";
import { SelectImageProvider } from "./admin/SelectImageContext";
import { LocaleProvider } from "./i18n/LocaleContext";
import { AdminOverviewPage } from "./components/AdminOverviewPage";
import { AdminPage } from "./components/AdminPage";
import { AdminUsersPage } from "./components/AdminUsersPage";
import { LoginPage } from "./components/LoginPage";
import {
  PlannedPlatesPage,
  ProfilePage,
} from "./components/ProfilePage";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <LocaleProvider>
        <AuthProvider>
          <AuthModalProvider>
            <SelectImageProvider>
              <EditRecipeProvider>
                <Routes>
                  <Route path="/admin" element={<AdminOverviewPage />} />
                  <Route path="/admin/review" element={<AdminPage />} />
                  <Route path="/admin/users" element={<AdminUsersPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/profile/:userId" element={<ProfilePage />} />
                  <Route path="/planned" element={<PlannedPlatesPage />} />
                  <Route path="/*" element={<App />} />
                </Routes>
              </EditRecipeProvider>
            </SelectImageProvider>
          </AuthModalProvider>
        </AuthProvider>
      </LocaleProvider>
    </BrowserRouter>
  </StrictMode>,
);
