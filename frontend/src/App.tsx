import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { FamilyPage } from './pages/FamilyPage';
import { MemberDetailPage } from './pages/MemberDetailPage';
import { AddMemberPage } from './pages/AddMemberPage';
import { EditMemberPage } from './pages/EditMemberPage';
import { SettingsPage } from './pages/SettingsPage';
import { IngredientExplorerPage } from './pages/IngredientExplorerPage';
import { ProductExplorerPage } from './pages/ProductExplorerPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { ScanProductPage } from './pages/ScanProductPage';
import { ReceiptUploadPage } from './pages/ReceiptUploadPage';
import { ReceiptReviewPage } from './pages/ReceiptReviewPage';
import { ReceiptHistoryPage } from './pages/ReceiptHistoryPage';
import { FamilyRiskDashboardPage } from './pages/FamilyRiskDashboardPage';
import { MemberRiskDetailPage } from './pages/MemberRiskDetailPage';
import { FamilyGroceryHistoryPage } from './pages/FamilyGroceryHistoryPage';
import { NotificationCenterPage } from './pages/NotificationCenterPage';


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 30, // 30 seconds
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-emerald-500 selection:text-white">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/scan" element={<ScanProductPage />} />
                <Route path="/receipts" element={<ReceiptHistoryPage />} />
                <Route path="/receipts/:receiptId" element={<ReceiptReviewPage />} />
                <Route path="/receipt/upload" element={<ReceiptUploadPage />} />
                <Route path="/risk/receipts/:receiptId" element={<FamilyRiskDashboardPage />} />
                <Route path="/risk/receipts/:receiptId/member/:memberId" element={<MemberRiskDetailPage />} />
                <Route path="/history" element={<FamilyGroceryHistoryPage />} />
                <Route path="/notifications" element={<NotificationCenterPage />} />
                <Route path="/grocery-history" element={<Navigate to="/history" replace />} />

                <Route path="/products" element={<ProductExplorerPage />} />
                <Route path="/products/:productId" element={<ProductDetailPage />} />
                <Route path="/ingredients" element={<IngredientExplorerPage />} />
                <Route path="/family" element={<FamilyPage />} />
                <Route path="/family/member/:memberId" element={<MemberDetailPage />} />
                <Route path="/family/member/:memberId/edit" element={<EditMemberPage />} />
                <Route path="/family/add-member" element={<AddMemberPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
