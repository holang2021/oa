import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, type ReactNode } from 'react'
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
import Offboarding from './pages/Offboarding'
import OffboardingTodos from './pages/OffboardingTodos'
import FeishuWiki from './pages/FeishuWiki'
import DocTemplateSettings from './pages/settings/DocTemplateSettings'
import PrintTemplates from './pages/PrintTemplates'
import GenericListPage from './components/GenericListPage'
import RouteGuard from './components/RouteGuard'
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

const G = GenericListPage

// 路由守卫包装：对每条业务路由强制做角色权限校验
const Guard = ({ children }: { children: ReactNode }) => <RouteGuard>{children}</RouteGuard>

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
    <MainLayout onLogout={handleLogout}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* 总览 */}
        <Route path="/dashboard" element={<Guard><Dashboard /></Guard>} />
        <Route path="/dashboard/my-flows" element={<Guard><MyFlows /></Guard>} />
        <Route path="/dashboard/todos" element={<Guard><TodoTasks /></Guard>} />
        <Route path="/dashboard/done" element={<Guard><DoneTasks /></Guard>} />
        <Route path="/dashboard/notifications" element={<Guard><G config={notificationConfig} /></Guard>} />

        {/* 产品 */}
        <Route path="/products" element={<Guard><Products /></Guard>} />
        <Route path="/products/new" element={<Guard><ProductForm /></Guard>} />
        <Route path="/products/:id/edit" element={<Guard><ProductForm /></Guard>} />

        {/* CRM · 内销 */}
        <Route path="/domestic/customers" element={<Guard><Customers /></Guard>} />
        <Route path="/domestic/customers/new" element={<Guard><CustomerForm /></Guard>} />
        <Route path="/domestic/customers/:id/edit" element={<Guard><CustomerForm /></Guard>} />
        <Route path="/domestic/customers/:id" element={<Guard><CustomerDetail /></Guard>} />
        <Route path="/domestic/contacts/:contactId" element={<Guard><ContactDetail /></Guard>} />
        <Route path="/domestic/leads" element={<Guard><LeadPool /></Guard>} />
        <Route path="/domestic/leads/:id" element={<Guard><LeadDetail /></Guard>} />
        <Route path="/domestic/opportunities" element={<Guard><OppPool /></Guard>} />
        <Route path="/domestic/opportunities/new" element={<Guard><OpportunityForm /></Guard>} />
        <Route path="/domestic/opportunities/:id/edit" element={<Guard><OpportunityForm /></Guard>} />
        <Route path="/domestic/quotations" element={<Guard><Quotations /></Guard>} />
        <Route path="/domestic/quotations/new" element={<Guard><QuotationForm /></Guard>} />
        <Route path="/domestic/quotations/:id/edit" element={<Guard><QuotationForm /></Guard>} />
        <Route path="/domestic/orders" element={<Guard><Orders /></Guard>} />
        <Route path="/domestic/orders/new" element={<Guard><OrderForm /></Guard>} />
        <Route path="/domestic/orders/:id/edit" element={<Guard><OrderForm /></Guard>} />
        <Route path="/domestic/orders/:id" element={<Guard><OrderDetail /></Guard>} />
        <Route path="/domestic/deliveries" element={<Guard><Deliveries /></Guard>} />
        <Route path="/domestic/deliveries/new" element={<Guard><DeliveryForm /></Guard>} />
        <Route path="/domestic/deliveries/:id/edit" element={<Guard><DeliveryForm /></Guard>} />
        <Route path="/domestic/deliveries/:id" element={<Guard><DeliveryDetail /></Guard>} />
        <Route path="/domestic/invoices" element={<Guard><Invoices /></Guard>} />
        <Route path="/domestic/invoices/new" element={<Guard><InvoiceForm /></Guard>} />
        <Route path="/domestic/invoices/:id/edit" element={<Guard><InvoiceForm /></Guard>} />
        <Route path="/domestic/collections" element={<Guard><Payments /></Guard>} />
        <Route path="/domestic/collections/new" element={<Guard><PaymentForm /></Guard>} />
        <Route path="/domestic/collections/:id/edit" element={<Guard><PaymentForm /></Guard>} />
        <Route path="/domestic/collections/:id" element={<Guard><PaymentDetail /></Guard>} />

        {/* CRM · 外销 */}
        <Route path="/export/customers" element={<Guard><Customers /></Guard>} />
        <Route path="/export/customers/new" element={<Guard><CustomerForm /></Guard>} />
        <Route path="/export/customers/:id/edit" element={<Guard><CustomerForm /></Guard>} />
        <Route path="/export/customers/:id" element={<Guard><CustomerDetail /></Guard>} />
        <Route path="/export/contacts/:contactId" element={<Guard><ContactDetail /></Guard>} />
        <Route path="/export/leads" element={<Guard><LeadPool /></Guard>} />
        <Route path="/export/opportunities" element={<Guard><OppPool /></Guard>} />
        <Route path="/export/quotations" element={<Guard><Quotations /></Guard>} />
        <Route path="/export/quotations/new" element={<Guard><QuotationForm /></Guard>} />
        <Route path="/export/quotations/:id/edit" element={<Guard><QuotationForm /></Guard>} />
        <Route path="/export/orders" element={<Guard><Orders /></Guard>} />
        <Route path="/export/orders/:id" element={<Guard><OrderDetail /></Guard>} />
        <Route path="/export/collections" element={<Guard><Payments /></Guard>} />
        <Route path="/export/collections/:id" element={<Guard><PaymentDetail /></Guard>} />
        <Route path="/export/deliveries" element={<Guard><Deliveries /></Guard>} />
        <Route path="/export/deliveries/:id" element={<Guard><DeliveryDetail /></Guard>} />
        <Route path="/export/deliveries/:id/edit" element={<Guard><DeliveryForm /></Guard>} />
        <Route path="/export/whatsapp" element={<Guard><WhatsAppPage /></Guard>} />
        <Route path="/export/proforma-invoices" element={<Guard><ProformaInvoices /></Guard>} />
        <Route path="/export/proforma-invoices/new" element={<Guard><ProformaInvoiceForm /></Guard>} />
        <Route path="/export/proforma-invoices/:id/edit" element={<Guard><ProformaInvoiceForm /></Guard>} />

        {/* Marketing */}
        <Route path="/marketing/campaigns" element={<Guard><G config={marketingCampaignConfig} /></Guard>} />
        <Route path="/marketing/leads" element={<Guard><G config={marketingLeadConfig} /></Guard>} />
        <Route path="/marketing/channels" element={<Guard><G config={marketingChannelConfig} /></Guard>} />
        <Route path="/marketing/seo" element={<Guard><G config={marketingSEOConfig} /></Guard>} />

        {/* 售后 */}
        <Route path="/aftersales/visits" element={<Guard><G config={aftersaleVisitConfig} /></Guard>} />
        <Route path="/aftersales/tickets" element={<Guard><G config={aftersaleTicketConfig} /></Guard>} />
        <Route path="/aftersales/returns" element={<Guard><ReturnOrders /></Guard>} />

        {/* SRM */}
        <Route path="/srm/suppliers" element={<Guard><G config={srmSupplierConfig} /></Guard>} />
        <Route path="/srm/inquiries" element={<Guard><G config={srmInquiryConfig} /></Guard>} />
        <Route path="/srm/orders" element={<Guard><G config={srmPurchaseOrderConfig} /></Guard>} />
        <Route path="/srm/receive" element={<Guard><G config={srmReceiveConfig} /></Guard>} />
        <Route path="/srm/payables" element={<Guard><G config={srmPayableConfig} /></Guard>} />

        {/* ERP · 生产 */}
        <Route path="/erp/bom" element={<Guard><G config={erpBomConfig} /></Guard>} />
        <Route path="/erp/work-orders" element={<Guard><G config={erpWorkOrderConfig} /></Guard>} />
        <Route path="/erp/schedule" element={<Guard><G config={erpScheduleConfig} /></Guard>} />
        <Route path="/erp/reporting" element={<Guard><G config={erpReportingConfig} /></Guard>} />
        <Route path="/erp/quality" element={<Guard><G config={erpQualityConfig} /></Guard>} />
        <Route path="/erp/intelligent-material" element={<Guard><IntelligentMaterial /></Guard>} />

        {/* ERP · 仓储 */}
        <Route path="/erp/inventory" element={<Guard><G config={erpInventoryConfig} /></Guard>} />
        <Route path="/erp/inbound" element={<Guard><G config={erpInboundConfig} /></Guard>} />
        <Route path="/erp/outbound" element={<Guard><G config={erpOutboundConfig} /></Guard>} />
        <Route path="/erp/transfer" element={<Guard><G config={erpTransferConfig} /></Guard>} />
        <Route path="/erp/stock-check" element={<Guard><G config={erpStockCheckConfig} /></Guard>} />

        {/* ERP · 财务 */}
        <Route path="/erp/repay-plan" element={<Guard><G config={erpRepayPlanConfig} /></Guard>} />
        <Route path="/erp/ar" element={<Guard><G config={erpARConfig} /></Guard>} />
        <Route path="/erp/ap" element={<Guard><G config={erpAPConfig} /></Guard>} />
        <Route path="/erp/invoices" element={<Guard><G config={erpInvoiceConfig} /></Guard>} />
        <Route path="/erp/reconciliation" element={<Guard><G config={erpReconciliationConfig} /></Guard>} />
        <Route path="/erp/expenses" element={<Guard><G config={erpExpenseConfig} /></Guard>} />
        <Route path="/erp/accounts" element={<Guard><G config={erpAccountsConfig} /></Guard>} />

        {/* 数据分析 */}
        <Route path="/analytics/products" element={<Guard><G config={analyticsProductConfig} /></Guard>} />
        <Route path="/analytics/leads" element={<Guard><G config={analyticsLeadConfig} /></Guard>} />
        <Route path="/analytics/roi" element={<Guard><G config={analyticsROIConfig} /></Guard>} />
        <Route path="/analytics/customers" element={<Guard><G config={analyticsCustomerConfig} /></Guard>} />
        <Route path="/analytics/opportunities" element={<Guard><G config={analyticsOppConfig} /></Guard>} />
        <Route path="/analytics/quotations" element={<Guard><G config={analyticsQuotationConfig} /></Guard>} />
        <Route path="/analytics/contracts" element={<Guard><G config={analyticsContractConfig} /></Guard>} />
        <Route path="/analytics/collections" element={<Guard><G config={analyticsCollectionConfig} /></Guard>} />
        <Route path="/analytics/finance" element={<Guard><G config={analyticsFinanceConfig} /></Guard>} />

        {/* 技术研发 */}
        <Route path="/tech/docs" element={<Guard><G config={techDocsConfig} /></Guard>} />
        <Route path="/tech/ecn" element={<Guard><G config={techECNConfig} /></Guard>} />

        {/* 组织 */}
        <Route path="/org/contacts" element={<Guard><Contacts /></Guard>} />
        <Route path="/org/contacts/:contactId" element={<Guard><ContactDetail /></Guard>} />
        <Route path="/org/roles" element={<Guard><RbacSettings /></Guard>} />
        <Route path="/org/offboarding" element={<Guard><Offboarding /></Guard>} />
        <Route path="/org/offboarding-todos" element={<Guard><OffboardingTodos /></Guard>} />

        {/* 系统工具 */}
        <Route path="/tools/approval" element={<Guard><ApprovalEngine /></Guard>} />
        <Route path="/tools/templates" element={<Guard><ApprovalTemplates /></Guard>} />
        <Route path="/tools/stats" element={<Guard><ApprovalStats /></Guard>} />
        <Route path="/tools/trash" element={<Guard><TrashPage /></Guard>} />
        <Route path="/tools/blueprint" element={<Guard><BlueprintBrowser /></Guard>} />
        <Route path="/tools/logs" element={<Guard><G config={operationLogConfig} /></Guard>} />
        <Route path="/tools/config" element={<Guard><SystemSettings /></Guard>} />
        <Route path="/tools/feishu-wiki" element={<Guard><FeishuWiki /></Guard>} />
        <Route path="/tools/doc-templates" element={<Guard><DocTemplateSettings /></Guard>} />
        <Route path="/tools/print-templates" element={<Guard><PrintTemplates /></Guard>} />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </MainLayout>
  )
}

export default App
