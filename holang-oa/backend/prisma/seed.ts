import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('开始种子数据...');

  // Create default admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      email: 'admin@holang.com',
      password: adminPassword,
      role: 'ADMIN',
      department: '管理部',
      isActive: true,
      mustChangePassword: true,
    },
  });

  console.log('创建管理员账号:', admin.name);

  // Create manager user
  const managerPassword = await bcrypt.hash('manager123', 10);
  
  const manager = await prisma.user.upsert({
    where: { name: 'manager' },
    update: {},
    create: {
      name: 'manager',
      email: 'manager@holang.com',
      password: managerPassword,
      role: 'MANAGER',
      department: '销售部',
      isActive: true,
      mustChangePassword: true,
    },
  });

  console.log('创建主管账号:', manager.name);

  // Create sales user
  const salesPassword = await bcrypt.hash('sales123', 10);
  
  const sales = await prisma.user.upsert({
    where: { name: 'sales' },
    update: {},
    create: {
      name: 'sales',
      email: 'sales@holang.com',
      password: salesPassword,
      role: 'SALES',
      department: '销售部',
      isActive: true,
      mustChangePassword: true,
    },
  });

  console.log('创建销售账号:', sales.name);

  // Create sample products
  const products = [
    {
      name: '制氮设备 HN-100',
      model: 'HN-100',
      spec: '产气量100Nm³/h',
      category: '制氮设备',
      unitPrice: 500000,
      description: '标准型制氮设备',
      isActive: true,
      sortOrder: 1,
    },
    {
      name: '制氮设备 HN-200',
      model: 'HN-200',
      spec: '产气量200Nm³/h',
      category: '制氮设备',
      unitPrice: 800000,
      description: '大型制氮设备',
      isActive: true,
      sortOrder: 2,
    },
    {
      name: '制氧设备 HO-50',
      model: 'HO-50',
      spec: '产气量50Nm³/h',
      category: '制氧设备',
      unitPrice: 300000,
      description: '标准型制氧设备',
      isActive: true,
      sortOrder: 3,
    },
    {
      name: '制氢设备 HH-10',
      model: 'HH-10',
      spec: '产气量10Nm³/h',
      category: '制氢设备',
      unitPrice: 200000,
      description: '小型制氢设备',
      isActive: true,
      sortOrder: 4,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { name: product.name },
      update: {},
      create: product,
    });
  }

  console.log('创建示例产品:', products.length, '个');

  // Create sample customer
  const customer = await prisma.customer.create({
    data: {
      companyName: '示例科技有限公司',
      customerCode: 'CUS001',
      industry: '制造业',
      address: '上海市浦东新区XX路XX号',
      status: 'INTERESTED',
      salesOwnerId: sales.id,
      createdBy: sales.id,
      notes: '示例客户',
      contacts: {
        create: {
          name: '张三',
          position: '采购经理',
          phone: '13800138000',
          email: 'zhangsan@example.com',
          type: 'PRIMARY',
          isKeyPerson: true,
        },
      },
    },
  });

  console.log('创建示例客户:', customer.companyName);

  // Create sample opportunity
  const product = await prisma.product.findFirst();
  
  if (product) {
    const opportunity = await prisma.opportunity.create({
      data: {
        name: `${customer.companyName} - ${product.name}`,
        customerId: customer.id,
        productId: product.id,
        expectedAmount: 500000,
        expectedCloseDate: new Date('2024-12-31'),
        stage: 'REQUIREMENT_CONFIRMED',
        winProbability: 25,
        description: '示例销售机会',
        salesOwnerId: sales.id,
      },
    });

    console.log('创建示例销售机会:', opportunity.name);
  }

  console.log('种子数据创建完成！');
  console.log('\n默认登录账号:');
  console.log('管理员: admin / admin123');
  console.log('主管: manager / manager123');
  console.log('销售: sales / sales123');

  // ── 支线5 审批规则默认配置（幂等 upsert by entityType，零回退）──
  // 与支线4 原 DOC_REQUIRED_ROLE 行为完全一致：
  //   合同/PI/订单/发货/经销商报备 -> 主管(MANAGER) 单级；发票 -> 财务(FINANCE) 单级。
  // 经销商报备虽走独立审核路径（新引擎不接入），此处仍写入规则以便后台展示。
  const defaultRules: { entityType: string; levels: any }[] = [
    { entityType: 'CONTRACT', levels: [{ order: 0, approverType: 'MANAGER', salesTypeScope: null, countersign: 'SINGLE' }] },
    { entityType: 'PI', levels: [{ order: 0, approverType: 'MANAGER', salesTypeScope: null, countersign: 'SINGLE' }] },
    { entityType: 'ORDER', levels: [{ order: 0, approverType: 'MANAGER', salesTypeScope: null, countersign: 'SINGLE' }] },
    { entityType: 'INVOICE', levels: [{ order: 0, approverType: 'FINANCE', salesTypeScope: null, countersign: 'SINGLE' }] },
    { entityType: 'DELIVERY', levels: [{ order: 0, approverType: 'MANAGER', salesTypeScope: null, countersign: 'SINGLE' }] },
    { entityType: 'DEALER_REPORT', levels: [{ order: 0, approverType: 'MANAGER', salesTypeScope: null, countersign: 'SINGLE' }] },
  ];

  for (const r of defaultRules) {
    await prisma.approvalRule.upsert({
      where: { entityType: r.entityType },
      update: { levels: JSON.stringify(r.levels) },
      create: { entityType: r.entityType, enabled: true, levels: JSON.stringify(r.levels) },
    });
  }
  console.log('审批规则默认配置已写入（6 类单据）');
}

main()
  .catch((e) => {
    console.error('种子数据创建失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
