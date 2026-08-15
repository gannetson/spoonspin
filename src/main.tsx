import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { AuthModalProvider } from "./auth/AuthModalContext";
import { EditRecipeProvider } from "./admin/EditRecipeContext";
import { EditRestaurantProvider } from "./admin/EditRestaurantContext";
import { EditOrderOptionProvider } from "./admin/EditOrderOptionContext";
import { SelectImageProvider } from "./admin/SelectImageContext";
import { ConsentProvider } from "./consent/ConsentContext";
import { LocaleProvider } from "./i18n/LocaleContext";
import { AdminOverviewPage } from "./components/AdminOverviewPage";
import { AdminPage } from "./components/AdminPage";
import { AdminFlagsPage } from "./components/AdminFlagsPage";
import { AdminReportsPage } from "./components/AdminReportsPage";
import { AdminUsersPage } from "./components/AdminUsersPage";
import { AboutPage } from "./components/AboutPage";
import { CookieBanner } from "./components/CookieBanner";
import { LoginPage } from "./components/LoginPage";
import { PrivacyPage } from "./components/PrivacyPage";
import { PlannedPlatesPage, ProfilePage } from "./components/ProfilePage";
import { ensurePublicConfigLoaded } from "./lib/usePublicConfig";
import "./index.css";

ensurePublicConfigLoaded();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <LocaleProvider>
        <ConsentProvider>
          <AuthProvider>
            <AuthModalProvider>
              <SelectImageProvider>
                <EditRecipeProvider>
                  <EditRestaurantProvider>
                    <EditOrderOptionProvider>
                      <Routes>
                        <Route path="/admin" element={<AdminOverviewPage />} />
                        <Route path="/admin/review" element={<AdminPage />} />
                        <Route path="/admin/flags" element={<AdminFlagsPage />} />
                        <Route path="/admin/reports" element={<AdminReportsPage />} />
                        <Route path="/admin/users" element={<AdminUsersPage />} />
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="/profile/:userId" element={<ProfilePage />} />
                        <Route path="/planned" element={<PlannedPlatesPage />} />
                        <Route path="/privacy" element={<PrivacyPage />} />
                        <Route path="/about" element={<AboutPage />} />
                        <Route path="/*" element={<App />} />
                      </Routes>
                      <CookieBanner />
                    </EditOrderOptionProvider>
                  </EditRestaurantProvider>
                </EditRecipeProvider>
              </SelectImageProvider>
            </AuthModalProvider>
          </AuthProvider>
        </ConsentProvider>
      </LocaleProvider>
    </BrowserRouter>
  </StrictMode>,
);
