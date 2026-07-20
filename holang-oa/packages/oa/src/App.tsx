import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from './contexts/AuthContext'
import { isAuthenticated } from './services/api'
import MainLayout from './layouts/MainLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import ProductForm from './pages/ProductForm'
import Customers from './pages/Customers'
import CustomerForm from './pages/CustomerForm'
import CustomerDetail from './pages/CustomerDetail'
import LeadPool from './pages/LeadPool'
import LeadDetail from './pages/LeadDetail'
import OppPool from './pages/OppPool'
import Orders from './pages/Orders'
import OrderForm from './pages/OrderForm'
import OrderDetail from './pages/OrderDetail'
import Payments from './pages/Payments'
import PaymentForm from './pages/PaymentForm'
import PaymentDetail from './pages/PaymentDetail'
import Deliveries from './pages/Deliveries'
import DeliveryForm from './pages/DeliveryForm'
import DeliveryDetail from './pages/DeliveryDetail'
import Invoices from './pages/Invoices'
import InvoiceForm from './pages/InvoiceForm'
import Quotations from './pages/Quotations'
import QuotationForm from './pages/QuotationForm'
import ProformaInvoices from './pages/export/ProformaInvoices'
import ProformaInvoiceForm from './pages/export/ProformaInvoiceForm'
import OpportunityForm from './pages/OpportunityForm'
import ApprovalEngine from './pages/ApprovalEngine'
import ApprovalTemplates from './pages/ApprovalTemplates'
import ApprovalStats from './pages/ApprovalStats'
import TrashPage from './pages/TrashPage'
import BlueprintBrowser from './pages/BlueprintBrowser'
import Contacts from './pages/Contacts'
import ContactDetail from './pages/ContactDetail'
import WhatsAppPage from './pages/WhatsAppPage'
import IntelligentMaterial from './pages/IntelligentMaterial'
import BackgroundCheck from './pages/BackgroundCheck'
import ReturnOrders from './pages/ReturnOrders'
import MyFlows from './pages/MyFlows'
import TodoTasks from './pages/TodoTasks'
import DoneTasks from './pages/DoneTasks'
import SystemSettings from './pages/SystemSettings'
import RbacSettings from './pages/RbacSettings'
import DocTemplateSettings from './pages/settings/DocTemplateSettings'
import PrintTemplates from './pages/PrintTemplates'
import GenericListPage from './components/GenericListPage'
import {
  marketingCampaignConfig, marketingLeadConfig, marketingChannelConfig, marketingSEOConfig,
  aftersaleVisitConfig, aftersaleTicketConfig,
  srmSupplierConfig, srmInquiryConfig, srmPurchaseOrderConfig, srmReceiveConfig, srmPayableConfig,
  erpBomConfig, erpWorkOrderConfig, erpScheduleConfig, erpReportingConfig, erpQualityConfig,
  erpInventoryConfig, erpInboundConfig, erpOutboundConfig, erpTransferConfig, erpStockCheckConfig,
  erpRepayPlanConfig, erpARConfig, erpAPConfig, erpInvoiceConfig,
  erpReconciliationConfig, erpExpenseConfig, erpAccountsConfig,
  analyticsProductConfig, analyticsLeadConfig, analyticsROIConfig, analyticsCustomerConfig,
  analyticsOppConfig, analyticsQuotationConfig, analyticsContractConfig,
  analyticsCollectionConfig, analyticsFinanceConfig,
  techDocsConfig, techECNConfig,
  operationLogConfig, notificationConfig,
} from './configs/pageConfigs'
import { I18nProvider } from './i18n/I18nContext'

const G = GenericListPage

function App() {
  const { isLoggedIn, logout } = useAuth()
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    setLoggedIn(isLoggedIn)
  }, [isLoggedIn])

  const handleLogin = () => setLoggedIn(true)
  const handleLogout = () => { logout(); setLoggedIn(false) }

  if (!loggedIn) return <Login onLogin={handleLogin} />

  return (
    <I18nProvider>
      <MainLayout onLogout={handleLogout}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* 总览 */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/my-flows" element={<MyFlows />} />
        <Route path="/dashboard/todos" element={<TodoTasks />} />
        <Route path="/dashboard/done" element={<DoneTasks />} />
        <Route path="/dashboard/notifications" element={<G config={notificationConfig} />} />

        {/* 产品 */}
        <Route path="/products" element={<Products />} />
        <Route path="/products/new" element={<ProductForm />} />
        <Route path="/products/:id/edit" element={<ProductForm />} />

        {/* CRM · 内销 */}
        <Route path="/domestic/customers" element={<Customers />} />
        <Route path="/domestic/customers/new" element={<CustomerForm />} />
        <Route path="/domestic/customers/:id/edit" element={<CustomerForm />} />
        <Route path="/domestic/customers/:id" element={<CustomerDetail />} />
        <Route path="/domestic/contacts/:contactId" element={<ContactDetail />} />
        <Route path="/domestic/leads" element={<LeadPool />} />
        <Route path="/domestic/leads/:id" element={<LeadDetail />} />
        <Route path="/domestic/opportunities" element={<OppPool />} />
        <Route path="/domestic/opportunities/new" element={<OpportunityForm />} />
        <Route path="/domestic/opportunities/:id/edit" element={<OpportunityForm />} />
        <Route path="/domestic/quotations" element={<Quotations />} />
        <Route path="/domestic/quotations/new" element={<QuotationForm />} />
        <Route path="/domestic/quotations/:id/edit" element={<QuotationForm />} />
        <Route path="/domestic/orders" element={<Orders />} />
        <Route path="/domestic/orders/new" element={<OrderForm />} />
        <Route path="/domestic/orders/:id/edit" element={<OrderForm />} />
        <Route path="/domestic/orders/:id" element={<OrderDetail />} />
        <Route path="/domestic/deliveries" element={<Deliveries />} />
        <Route path="/domestic/deliveries/new" element={<DeliveryForm />} />
        <Route path="/domestic/deliveries/:id/edit" element={<DeliveryForm />} />
        <Route path="/domestic/deliveries/:id" element={<DeliveryDetail />} />
        <Route path="/domestic/invoices" element={<Invoices />} />
        <Route path="/domestic/invoices/new" element={<InvoiceForm />} />
        <Route path="/domestic/invoices/:id/edit" element={<InvoiceForm />} />
        <Route path="/domestic/collections" element={<Payments />} />
        <Route path="/domestic/collections/new" element={<PaymentForm />} />
        <Route path="/domestic/collections/:id/edit" element={<PaymentForm />} />
        <Route path="/domestic/collections/:id" element={<PaymentDetail />} />

        {/* CRM · 外销 */}
        <Route path="/export/customers" element={<Customers />} />
        <Route path="/export/customers/new" element={<CustomerForm />} />
        <Route path="/export/customers/:id/edit" element={<CustomerForm />} />
        <Route path="/export/customers/:id" element={<CustomerDetail />} />
        <Route path="/export/leads" element={<LeadPool />} />
        <Route path="/export/opportunities" element={<OppPool />} />
        <Route path="/export/quotations" element={<Quotations />} />
        <Route path="/export/quotations/new" element={<QuotationForm />} />
        <Route path="/export/quotations/:id/edit" element={<QuotationForm />} />
        <Route path="/export/orders" element={<Orders />} />
        <Route path="/export/orders/:id" element={<OrderDetail />} />
        <Route path="/export/collections" element={<Payments />} />
        <Route path="/export/collections/:id" element={<PaymentDetail />} />
        <Route path="/export/deliveries" element={<Deliveries />} />
        <Route path="/export/deliveries/:id" element={<DeliveryDetail />} />
        <Route path="/export/deliveries/:id/edit" element={<DeliveryForm />} />
        <Route path="/export/whatsapp" element={<WhatsAppPage />} />
        <Route path="/export/proforma-invoices" element={<ProformaInvoices />} />
        <Route path="/export/proforma-invoices/new" element={<ProformaInvoiceForm />} />
        <Route path="/export/proforma-invoices/:id/edit" element={<ProformaInvoiceForm />} />

        {/* Marketing */}
        <Route path="/marketing/campaigns" element={<G config={marketingCampaignConfig} />} />
        <Route path="/marketing/leads" element={<G config={marketingLeadConfig} />} />
        <Route path="/marketing/channels" element={<G config={marketingChannelConfig} />} />
        <Route path="/marketing/seo" element={<G config={marketingSEOConfig} />} />

        {/* 售后 */}
        <Route path="/aftersales/visits" element={<G config={aftersaleVisitConfig} />} />
        <Route path="/aftersales/tickets" element={<G config={aftersaleTicketConfig} />} />
        <Route path="/aftersales/returns" element={<ReturnOrders />} />

        {/* SRM */}
        <Route path="/srm/suppliers" element={<G config={srmSupplierConfig} />} />
        <Route path="/srm/inquiries" element={<G config={srmInquiryConfig} />} />
        <Route path="/srm/orders" element={<G config={srmPurchaseOrderConfig} />} />
        <Route path="/srm/receive" element={<G config={srmReceiveConfig} />} />
        <Route path="/srm/payables" element={<G config={srmPayableConfig} />} />

        {/* ERP · 生产 */}
        <Route path="/erp/bom" element={<G config={erpBomConfig} />} />
        <Route path="/erp/work-orders" element={<G config={erpWorkOrderConfig} />} />
        <Route path="/erp/schedule" element={<G config={erpScheduleConfig} />} />
        <Route path="/erp/reporting" element={<G config={erpReportingConfig} />} />
        <Route path="/erp/quality" element={<G config={erpQualityConfig} />} />
        <Route path="/erp/intelligent-material" element={<IntelligentMaterial />} />

        {/* ERP · 仓储 */}
        <Route path="/erp/inventory" element={<G config={erpInventoryConfig} />} />
        <Route path="/erp/inbound" element={<G config={erpInboundConfig} />} />
        <Route path="/erp/outbound" element={<G config={erpOutboundConfig} />} />
        <Route path="/erp/transfer" element={<G config={erpTransferConfig} />} />
        <Route path="/erp/stock-check" element={<G config={erpStockCheckConfig} />} />

        {/* ERP · 财务 */}
        <Route path="/erp/repay-plan" element={<G config={erpRepayPlanConfig} />} />
        <Route path="/erp/ar" element={<G config={erpARConfig} />} />
        <Route path="/erp/ap" element={<G config={erpAPConfig} />} />
        <Route path="/erp/invoices" element={<G config={erpInvoiceConfig} />} />
        <Route path="/erp/reconciliation" element={<G config={erpReconciliationConfig} />} />
        <Route path="/erp/expenses" element={<G config={erpExpenseConfig} />} />
        <Route path="/erp/accounts" element={<G config={erpAccountsConfig} />} />

        {/* 数据分析 */}
        <Route path="/analytics/products" element={<G config={analyticsProductConfig} />} />
        <Route path="/analytics/leads" element={<G config={analyticsLeadConfig} />} />
        <Route path="/analytics/roi" element={<G config={analyticsROIConfig} />} />
        <Route path="/analytics/customers" element={<G config={analyticsCustomerConfig} />} />
        <Route path="/analytics/opportunities" element={<G config={analyticsOppConfig} />} />
        <Route path="/analytics/quotations" element={<G config={analyticsQuotationConfig} />} />
        <Route path="/analytics/contracts" element={<G config={analyticsContractConfig} />} />
        <Route path="/analytics/collections" element={<G config={analyticsCollectionConfig} />} />
        <Route path="/analytics/finance" element={<G config={analyticsFinanceConfig} />} />

        {/* 技术研发 */}
        <Route path="/tech/docs" element={<G config={techDocsConfig} />} />
        <Route path="/tech/ecn" element={<G config={techECNConfig} />} />

        {/* 组织 */}
        <Route path="/org/contacts" element={<Contacts />} />
        <Route path="/org/contacts/:contactId" element={<ContactDetail />} />
        <Route path="/org/roles" element={<RbacSettings />} />

        {/* 系统工具 */}
        <Route path="/tools/approval" element={<ApprovalEngine />} />
        <Route path="/tools/templates" element={<ApprovalTemplates />} />
        <Route path="/tools/stats" element={<ApprovalStats />} />
        <Route path="/tools/trash" element={<TrashPage />} />
        <Route path="/tools/blueprint" element={<BlueprintBrowser />} />
        <Route path="/tools/logs" element={<G config={operationLogConfig} />} />
        <Route path="/tools/config" element={<SystemSettings />} />
        <Route path="/tools/doc-templates" element={<DocTemplateSettings />} />
        <Route path="/tools/print-templates" element={<PrintTemplates />} />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </MainLayout>
    </I18nProvider>
  )
}

export default App
