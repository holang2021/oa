// ============================================================
// RBAC 角色权限类型定义
// 所有角色、员工、菜单权限均可后台配置，不写死
// ============================================================

// 系统所有可权限控制的菜单路由
export const ALL_MENU_PERMISSIONS = [
  // 总览
  { route: '/dashboard', label: '工作台', labelEn: 'Workbench' },
  // 产品
  { route: '/products', label: '产品管理', labelEn: 'Products' },
  // CRM 内销
  { route: '/domestic/customers', label: '客户管理（内销）', labelEn: 'Customers (Domestic)' },
  { route: '/domestic/leads', label: '线索公海池', labelEn: 'Lead Pool' },
  { route: '/domestic/opportunities', label: '商机管理', labelEn: 'Opportunities' },
  { route: '/domestic/quotations', label: '报价管理', labelEn: 'Quotations' },
  { route: '/domestic/orders', label: '订单管理', labelEn: 'Orders' },
  { route: '/domestic/collections', label: '回款管理', labelEn: 'Collections' },
  { route: '/domestic/deliveries', label: '发货管理', labelEn: 'Deliveries' },
  // CRM 外销
  { route: '/export/customers', label: '客户管理（外销）', labelEn: 'Customers (Export)' },
  { route: '/export/leads', label: '线索管理（外销）', labelEn: 'Leads (Export)' },
  { route: '/export/opportunities', label: '商机管理（外销）', labelEn: 'Opportunities (Export)' },
  { route: '/export/orders', label: '订单管理（外销）', labelEn: 'Orders (Export)' },
  { route: '/export/collections', label: '回款管理（外销）', labelEn: 'Collections (Export)' },
  { route: '/export/whatsapp', label: 'WhatsApp', labelEn: 'WhatsApp' },
  // 售后
  { route: '/aftersales/visits', label: '客户回访', labelEn: 'Visits' },
  { route: '/aftersales/tickets', label: '售后工单', labelEn: 'Tickets' },
  { route: '/aftersales/returns', label: '退换货', labelEn: 'Returns' },
  // SRM
  { route: '/srm/suppliers', label: '供应商管理', labelEn: 'Suppliers' },
  { route: '/srm/inquiries', label: '询价管理', labelEn: 'Inquiries' },
  { route: '/srm/orders', label: '采购订单', labelEn: 'Purchase Orders' },
  { route: '/srm/payables', label: '应付管理', labelEn: 'Payables' },
  // ERP 生产
  { route: '/erp/bom', label: 'BOM 管理', labelEn: 'BOM' },
  { route: '/erp/work-orders', label: '工单管理', labelEn: 'Work Orders' },
  { route: '/erp/schedule', label: '生产排程', labelEn: 'Scheduling' },
  { route: '/erp/quality', label: '质量检验', labelEn: 'Quality' },
  // ERP 仓储
  { route: '/erp/inventory', label: '库存总览', labelEn: 'Inventory' },
  { route: '/erp/inbound', label: '入库管理', labelEn: 'Inbound' },
  { route: '/erp/outbound', label: '出库管理', labelEn: 'Outbound' },
  // ERP 财务
  { route: '/erp/ar', label: '应收账款', labelEn: 'Receivables' },
  { route: '/erp/ap', label: '应付账款', labelEn: 'Payables (AP)' },
  { route: '/erp/invoices', label: '发票管理', labelEn: 'Invoices' },
  { route: '/erp/accounts', label: '资金账户', labelEn: 'Accounts' },
  // 数据分析
  { route: '/analytics/customers', label: '客户分析', labelEn: 'Customer Analytics' },
  { route: '/analytics/opportunities', label: '商机分析', labelEn: 'Opportunity Analytics' },
  { route: '/analytics/collections', label: '回款统计', labelEn: 'Collection Stats' },
  // 组织
  { route: '/org/contacts', label: '通讯录', labelEn: 'Contacts' },
  { route: '/org/roles', label: '角色权限', labelEn: 'Roles & Permissions' },
  // 系统工具
  { route: '/tools/approval', label: '审批引擎', labelEn: 'Approval Engine' },
  { route: '/tools/templates', label: '审批模板', labelEn: 'Templates' },
  { route: '/tools/stats', label: '审批统计', labelEn: 'Approval Stats' },
  { route: '/tools/trash', label: '回收站', labelEn: 'Trash' },
  { route: '/tools/config', label: '系统配置', labelEn: 'System Config' },
  { route: '/tools/feishu-wiki', label: '飞书知识库', labelEn: 'Feishu Wiki' },
  { route: '/tools/doc-templates', label: '单证模板', labelEn: 'Doc Templates' },
] as const

export type MenuRoute = typeof ALL_MENU_PERMISSIONS[number]['route']

// 操作权限
export type ActionPermission =
  | 'view'      // 查看
  | 'create'    // 新建
  | 'edit'      // 编辑
  | 'delete'    // 删除
  | 'export'    // 导出
  | 'import'    // 导入
  | 'approve'   // 审批

export interface Role {
  id: string
  name: string           // 角色名称，如"销售经理"
  nameEn: string
  description: string    // 说明
  // 菜单权限：该角色能访问哪些路由
  menuPermissions: MenuRoute[]
  // 操作权限
  actionPermissions: ActionPermission[]
  // 数据权限范围
  dataScope: 'all' | 'department' | 'self' | 'none'
  // 是否可管理角色
  canManageRoles: boolean
  createdAt: string
  updatedAt: string
}

export interface Employee {
  id: string
  userId: string         // 登录用户名
  name: string           // 姓名
  nameEn: string
  email: string
  phone: string
  departments: string[]  // 所属部门（可多个，对应企微部门）
  roleId: string         // 分配的角色 ID
  status: 'active' | 'inactive'  // 在职/离职
  wecomUserId: string    // 企微 UserID（用于同步）
  createdAt: string
  updatedAt: string
}

// 默认角色（预置，可修改）
export const DEFAULT_ROLES: Role[] = [
  {
    id: 'admin',
    name: '管理员',
    nameEn: 'Administrator',
    description: '系统最高权限，可访问所有功能',
    menuPermissions: ALL_MENU_PERMISSIONS.map(m => m.route),
    actionPermissions: ['view', 'create', 'edit', 'delete', 'export', 'import', 'approve'],
    dataScope: 'all',
    canManageRoles: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sales_manager',
    name: '销售经理',
    nameEn: 'Sales Manager',
    description: '可查看团队数据，审批下属报价/订单',
    menuPermissions: [
      '/dashboard',
      '/products',
      '/domestic/customers',
      '/domestic/leads',
      '/domestic/opportunities',
      '/domestic/quotations',
      '/domestic/orders',
      '/domestic/collections',
      '/analytics/customers',
      '/analytics/opportunities',
    ],
    actionPermissions: ['view', 'create', 'edit', 'export', 'approve'],
    dataScope: 'department',
    canManageRoles: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sales',
    name: '销售员',
    nameEn: 'Sales Representative',
    description: '只能查看自己负责的客户和订单',
    menuPermissions: [
      '/dashboard',
      '/products',
      '/domestic/customers',
      '/domestic/leads',
      '/domestic/opportunities',
      '/domestic/quotations',
      '/domestic/orders',
      '/domestic/collections',
    ],
    actionPermissions: ['view', 'create', 'edit', 'export'],
    dataScope: 'self',
    canManageRoles: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'finance',
    name: '财务',
    nameEn: 'Finance',
    description: '管理订单、回款、发票',
    menuPermissions: [
      '/dashboard',
      '/domestic/orders',
      '/domestic/collections',
      '/domestic/deliveries',
      '/erp/ar',
      '/erp/ap',
      '/erp/invoices',
      '/erp/accounts',
    ],
    actionPermissions: ['view', 'create', 'edit', 'export', 'approve'],
    dataScope: 'all',
    canManageRoles: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'warehouse',
    name: '仓管',
    nameEn: 'Warehouse',
    description: '管理发货、库存',
    menuPermissions: [
      '/dashboard',
      '/domestic/deliveries',
      '/erp/inventory',
      '/erp/inbound',
      '/erp/outbound',
    ],
    actionPermissions: ['view', 'create', 'edit', 'export'],
    dataScope: 'all',
    canManageRoles: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'viewer',
    name: '只读',
    nameEn: 'Viewer',
    description: '只能查看，不能编辑',
    menuPermissions: [
      '/dashboard',
      '/products',
      '/domestic/customers',
      '/domestic/opportunities',
      '/domestic/orders',
    ],
    actionPermissions: ['view'],
    dataScope: 'all',
    canManageRoles: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  // ── 职能部门角色（2026-08-21 新增，刘总拍板按部门建角色）──
  // 纯职能：仅公共模块，不碰客户/订单/公海/回款/发货（数据安全）
  {
    id: 'marketing',
    name: '市场',
    nameEn: 'Marketing',
    description: '市场/运营职能，仅看公共模块',
    menuPermissions: [
      '/dashboard',
      '/products',
      '/org/contacts',
      '/org/roles',
      '/tools/feishu-wiki',
    ],
    actionPermissions: ['view'],
    dataScope: 'none',
    canManageRoles: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'technology',
    name: '技术',
    nameEn: 'Technology',
    description: '技术/研发职能，仅看公共模块',
    menuPermissions: [
      '/dashboard',
      '/products',
      '/org/contacts',
      '/org/roles',
      '/tools/feishu-wiki',
    ],
    actionPermissions: ['view'],
    dataScope: 'none',
    canManageRoles: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'production',
    name: '生产',
    nameEn: 'Production',
    description: '生产/PMC 职能，仅看公共模块',
    menuPermissions: [
      '/dashboard',
      '/products',
      '/org/contacts',
      '/org/roles',
      '/tools/feishu-wiki',
    ],
    actionPermissions: ['view'],
    dataScope: 'none',
    canManageRoles: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'administration',
    name: '行政',
    nameEn: 'Administration',
    description: '行政/人事职能，仅看公共模块',
    menuPermissions: [
      '/dashboard',
      '/products',
      '/org/contacts',
      '/org/roles',
      '/tools/feishu-wiki',
    ],
    actionPermissions: ['view'],
    dataScope: 'none',
    canManageRoles: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'procurement',
    name: '采购',
    nameEn: 'Procurement',
    description: '采购/供应链职能，仅看公共模块',
    menuPermissions: [
      '/dashboard',
      '/products',
      '/org/contacts',
      '/org/roles',
      '/tools/feishu-wiki',
    ],
    actionPermissions: ['view'],
    dataScope: 'none',
    canManageRoles: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  // 支持岗：可见对应销售域客户但非归属销售
  {
    id: 'internal_support',
    name: '内销支持',
    nameEn: 'Internal Support',
    description: '内销支持岗，可见内销客户/订单',
    menuPermissions: [
      '/dashboard',
      '/products',
      '/domestic/customers',
      '/domestic/leads',
      '/domestic/opportunities',
      '/domestic/orders',
      '/domestic/collections',
      '/org/contacts',
      '/org/roles',
      '/tools/feishu-wiki',
    ],
    actionPermissions: ['view', 'create', 'edit'],
    dataScope: 'department',
    canManageRoles: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'external_support',
    name: '外销支持',
    nameEn: 'External Support',
    description: '外销支持岗，可见外销客户/订单',
    menuPermissions: [
      '/dashboard',
      '/products',
      '/export/customers',
      '/export/leads',
      '/export/opportunities',
      '/export/orders',
      '/export/collections',
      '/org/contacts',
      '/org/roles',
      '/tools/feishu-wiki',
    ],
    actionPermissions: ['view', 'create', 'edit'],
    dataScope: 'department',
    canManageRoles: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

// 默认员工（预置管理员）
export const DEFAULT_EMPLOYEES: Employee[] = [
  {
    id: 'emp_admin',
    userId: 'admin',
    name: '刘世光',
    nameEn: 'Liu Shiguang',
    email: 'liu@holangchina.com',
    phone: '138****1234',
    departments: ['管理部'],
    roleId: 'admin',
    status: 'active',
    wecomUserId: 'Holang',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]
