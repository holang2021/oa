// ============================================================
// HOLANG Internal Management System - Main App Router
// ============================================================

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SidebarLayout } from "@/components/SidebarLayout";
import { LoginPage } from "@/sections/LoginPage";
import { DashboardPage } from "@/sections/DashboardPage";
import { QuotationListPage } from "@/sections/QuotationListPage";
import { AgentRegistrationPage } from "@/sections/AgentRegistrationPage";
import { PartnerCloudPage } from "@/sections/PartnerCloudPage";
import { ReportsPage } from "@/sections/ReportsPage";
import { FormDesignerDemo } from "@/sections/FormDesignerDemo";
import { ApprovalDemo } from "@/sections/ApprovalDemo";
import { ApprovalInboxPage } from "@/sections/ApprovalInboxPage";
import { QuotationCenterPage } from "@/sections/QuotationCenterPage";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes with sidebar layout */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <SidebarLayout>
                <Routes>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/quotations" element={<QuotationListPage />} />
                  <Route path="/quotations/new" element={<QuotationCenterPage />} />
                  <Route path="/quotations/:id/edit" element={<QuotationCenterPage />} />
                  <Route path="/quotations/:id" element={<QuotationCenterPage />} />
                  <Route path="/approval-inbox" element={<ApprovalInboxPage />} />
                  <Route path="/agents" element={<AgentRegistrationPage />} />
                  <Route path="/partner-cloud" element={<PartnerCloudPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/form-designer" element={<FormDesignerDemo />} />
                  <Route path="/approval-demo" element={<ApprovalDemo />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </SidebarLayout>
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
