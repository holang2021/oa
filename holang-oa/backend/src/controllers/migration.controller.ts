import { Request, Response, NextFunction } from 'express';
import { PrismaClient, BusinessLine, SalesType } from '@prisma/client';
import * as XLSX from 'xlsx';
import fs from 'fs';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

/**
 * 伙伴云字段 → CRM 字段映射配置（完整版，含内销/外销分类）
 *
 * 内销/外销分类规则：
 * ┌──────────┬─────────────────────┬───────────────────┐
 * │ 来源     │ 伙伴云原始值         │ CRM 目标值         │
 * ├──────────┼─────────────────────┼───────────────────┤
 * │ 客户.销售类别 │ 国内              │ salesType=INTERNAL │
 * │          │ 海外              │ salesType=EXTERNAL │
 * ├──────────┼─────────────────────┼───────────────────┤
 * │ 订单.销售类别 │ 内销              │ businessLine=INDUSTRIAL │
 * │          │ 外贸              │ businessLine=RETAIL   │
 * └──────────┴─────────────────────┴───────────────────┘
 *
 * 注意：
 * 1. 客户层面：salesType 描述客户本身（国内/海外注册公司）
 * 2. 订单层面：businessLine 描述交易性质（内销/外贸出货）
 * 3. 一个国内客户可以有外贸订单（如贸易公司出口），这是合法场景
 * 4. 订单无销售类别时，从客户 salesType 推断
 */
const FIELD_MAPPING: Record<string, { crmField: string; required: boolean; transform?: string }> = {
  // -- 基础信息 --
  '客户名称':      { crmField: 'companyName',   required: true },
  '编号':          { crmField: 'customerCode',  required: false },
  '行业':          { crmField: 'industry',      required: false },
  '公司规模':      { crmField: 'scale',         required: false },
  '公司电话':      { crmField: 'companyPhone',  required: false },
  '公司官网':      { crmField: 'website',       required: false },
  '地址':          { crmField: 'address',       required: false },
  '详细地址':      { crmField: 'addressDetail', required: false },

  // -- 销售类别（内销/外销 核心字段）--
  '销售类别':      { crmField: 'salesType',     required: true, transform: 'mapSalesType' },
  '销售负责人':    { crmField: 'salesPerson',   required: false },
  '销售部门':      { crmField: 'salesDept',     required: false },
  '客户来源':      { crmField: 'source',        required: false },
  '当前流程状态':   { crmField: 'followStage',  required: false },

  // -- 联系人 --
  '联系人姓名':    { crmField: 'contactName',   required: false },
  '联系电话':      { crmField: 'phone',         required: false },
  '联系邮箱':      { crmField: 'email',         required: false },
  '联系人职务':    { crmField: 'position',      required: false },

  // -- 开票信息 --
  '发票抬头':      { crmField: 'taxTitle',      required: false },
  '统一信用代码':   { crmField: 'creditCode',   required: false },
  '发票类型':      { crmField: 'invoiceType',   required: false },
  '开户银行':      { crmField: 'bankName',      required: false },
  '银行账号':      { crmField: 'bankAccount',   required: false },
  '银行行号':      { crmField: 'bankCode',      required: false },

  // -- 统计字段 --
  '成交金额':      { crmField: 'dealAmount',    required: false },
  '成交次数':      { crmField: 'dealCount',     required: false },
  '回款金额':      { crmField: 'paidAmount',    required: false },
  '待回款金额':    { crmField: 'unpaidAmount',  required: false },

  // -- 其他 --
  '备注':          { crmField: 'remark',        required: false },
  '分配时间':      { crmField: 'assignedAt',    required: false },
  '上次跟进日期':   { crmField: 'lastFollowAt', required: false },
  '下次跟进日期':   { crmField: 'nextFollowAt', required: false },
};

/**
 * 映射销售类别: 国内→INTERNAL, 海外→EXTERNAL
 */
function mapSalesType(rawValue: string): string {
  const v = (rawValue || '').trim();
  if (['海外', '外贸', '外销', '出口'].some((k) => v.includes(k))) {
    return 'EXTERNAL';
  }
  return 'INTERNAL';
}

/**
 * 映射商机阶段
 */
function mapFollowStage(rawValue?: string): string {
  const stageMap: Record<string, string> = {
    '潜在': 'POTENTIAL',
    '意向': 'INTERESTED',
    '报价': 'QUOTED',
    '成交': 'WON',
    '丢单': 'LOST',
  };
  return stageMap[(rawValue || '').trim()] || (rawValue || '');
}

/**
 * 将每一行数据按照 FIELD_MAPPING 转换为 CRM 格式
 */
function transformRow(rawRow: Record<string, any>, rowIndex: number) {
  const result: Record<string, any> = { _rowIndex: rowIndex };
  const errors: string[] = [];

  for (const [colName, mapping] of Object.entries(FIELD_MAPPING)) {
    const rawValue = rawRow[colName];

    // 必填检查
    if (mapping.required && (!rawValue || String(rawValue).trim() === '')) {
      errors.push(`列"${colName}"为必填`);
      continue;
    }

    let value = rawValue;

    // 应用转换函数
    if (mapping.transform === 'mapSalesType') {
      value = mapSalesType(String(rawValue || ''));
    } else if (mapping.transform === 'mapFollowStage') {
      value = mapFollowStage(String(rawValue || ''));
    }

    result[mapping.crmField] = value || null;
  }

  // 衍生字段: businessLine 从 salesType 推断
  if (result.salesType === 'EXTERNAL') {
    result.businessLine = 'RETAIL';
  } else {
    result.businessLine = 'INDUSTRIAL';
  }

  // 衍生字段: status 从 followStage 推断 (Prisma CustomerStatus 枚举)
  if (result.followStage) {
    result.status = mapFollowStage(result.followStage);
  }

  return { row: result, errors };
}

/**
 * POST /api/v1/migration/preview
 * 上传 Excel/CSV 文件并预览数据
 * 支持11+字段映射，含内销/外销分类
 */
export const previewImport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const file = (req as any).file;
    if (!file) {
      return res.status(400).json({ code: 400, message: '请上传文件', data: null });
    }

    // 读取 Excel/CSV 文件
    const workbook = XLSX.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];

    if (rawData.length === 0) {
      return res.status(400).json({ code: 400, message: '文件内容为空', data: null });
    }

    // 检测表头是否匹配
    const fileHeaders = Object.keys(rawData[0]);
    const requiredHeaders = Object.keys(FIELD_MAPPING).filter((k) => FIELD_MAPPING[k].required);
    const missingHeaders = requiredHeaders.filter((h) => !fileHeaders.includes(h));

    if (missingHeaders.length > 0) {
      return res.status(400).json({
        code: 400,
        message: `缺少必填列: ${missingHeaders.join(', ')}`,
        data: null,
      });
    }

    // 转换每一行
    const transformedData: any[] = [];
    const previewRows: any[] = [];
    const dataErrors: string[] = [];
    let validCount = 0;
    let internalCount = 0;
    let externalCount = 0;

    rawData.forEach((rawRow, index) => {
      const { row, errors } = transformRow(rawRow, index + 2); // +2: 1-based + header row
      transformedData.push(row);

      if (errors.length === 0) {
        validCount++;
        if (row.salesType === 'EXTERNAL') externalCount++;
        else internalCount++;
      } else {
        dataErrors.push(`第${index + 2}行: ${errors.join('; ')}`);
      }

      // 预览前20行
      if (index < 20) {
        previewRows.push({
          rowIndex: index + 2,
          customerName: row.companyName || '',
          contactName: row.contactName || '',
          phone: row.phone || '',
          email: row.email || '',
          salesType: row.salesType || 'INTERNAL',
          businessLine: row.businessLine || 'INDUSTRIAL',
          industry: row.industry || '',
          isValid: errors.length === 0,
          errorDetail: errors.join('; ') || null,
        });
      }
    });

    // 查重：检查公司名称
    const companyNames = transformedData
      .map((r) => r.companyName)
      .filter(Boolean) as string[];

    const existingCustomers = await prisma.customer.findMany({
      where: {
        OR: [
          { companyName: { in: companyNames } },
        ],
      },
      select: { companyName: true, id: true },
    });

    const existingNames = new Set(existingCustomers.map((c) => c.companyName));

    let duplicateCount = 0;
    const previewWithDup = previewRows.map((row) => {
      const isDup = existingNames.has(row.customerName);
      if (isDup) duplicateCount++;
      return { ...row, isDuplicate: isDup };
    });

    // 清理临时文件
    try {
      fs.unlinkSync(file.path);
    } catch (_) {
      // 忽略清理错误
    }

    res.json({
      code: 0,
      message: '预览成功',
      data: {
        total: rawData.length,
        validCount,
        duplicateCount,
        internalCount,
        externalCount,
        preview: previewWithDup,
        data: transformedData,
        mappings: Object.keys(FIELD_MAPPING),
        errors: dataErrors,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/migration/import
 * 确认导入数据到 CRM 数据库
 *
 * 内销/外销处理逻辑:
 * - salesType: 从原始"销售类别"字段映射, INTERNAL(国内)/EXTERNAL(海外)
 * - businessLine: 从 salesType 自动推导, INDUSTRIAL(内销)/RETAIL(外销)
 * - 支持一条记录同时写入客户+联系人(嵌套创建)
 */
export const executeImport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { data } = req.body;

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ code: 400, message: '没有可导入的数据', data: null });
    }

    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;
    let importedInternal = 0;
    let importedExternal = 0;
    const errors: string[] = [];

    // 批量查询已存在的客户（按公司名称和伙伴云ID）
    const companyNames = data.map((r: any) => r.companyName).filter(Boolean);
    const huobanIds = data.map((r: any) => r.externalCode).filter(Boolean);

    const existingCustomers = await prisma.customer.findMany({
      where: {
        OR: [
          { companyName: { in: companyNames } },
          ...(huobanIds.length > 0 ? [{ huobanId: { in: huobanIds } }] : []),
        ],
      },
      select: { companyName: true, huobanId: true },
    });
    const existingNamesSet = new Set(existingCustomers.map((c) => c.companyName));
    const existingHuobanIds = new Set(existingCustomers.map((c) => c.huobanId).filter(Boolean));

    for (const row of data) {
      try {
        const {
          companyName, customerCode, industry, scale, companyPhone, website,
          address, addressDetail,
          salesType, businessLine, salesPerson, salesDept, source, followStage,
          contactName, phone, email, position,
          taxTitle, creditCode, invoiceType, bankName, bankAccount, bankCode,
          dealAmount, dealCount, paidAmount, unpaidAmount,
          remark, assignedAt, lastFollowAt, nextFollowAt,
          externalCode,
        } = row;

        // 跳过重复（按名称或伙伴云ID）
        if (existingNamesSet.has(companyName)) {
          skipCount++;
          continue;
        }
        if (externalCode && existingHuobanIds.has(externalCode)) {
          skipCount++;
          continue;
        }

        // 创建客户（含联系人嵌套创建）
        await prisma.customer.create({
          data: {
            companyName: companyName || '未命名客户',
            customerCode: customerCode || null,
            industry: industry || null,
            scale: scale || null,
            companyPhone: companyPhone || null,
            website: website || null,
            address: address || null,
            addressDetail: addressDetail || null,
            source: source || null,
            status: followStage || 'POTENTIAL',
            followStage: followStage || null,

            // ═══ 内销/外销 核心字段 ═══
            businessLine: (businessLine === 'RETAIL' ? 'RETAIL' : 'INDUSTRIAL') as BusinessLine,
            salesType: (salesType === 'EXTERNAL' ? 'EXTERNAL' : 'INTERNAL') as SalesType,

            salesPerson: salesPerson || null,
            salesDept: salesDept || null,

            taxTitle: taxTitle || null,
            creditCode: creditCode || null,
            invoiceType: invoiceType || null,
            bankName: bankName || null,
            bankAccount: bankAccount || null,
            bankCode: bankCode || null,

            dealAmount: Number(dealAmount) || 0,
            dealCount: parseInt(dealCount) || 0,
            paidAmount: Number(paidAmount) || 0,
            unpaidAmount: Number(unpaidAmount) || 0,

            remark: remark || null,
            assignedAt: assignedAt ? new Date(assignedAt) : null,
            lastFollowAt: lastFollowAt ? new Date(lastFollowAt) : null,
            nextFollowAt: nextFollowAt ? new Date(nextFollowAt) : null,

            huobanId: externalCode || null,
            salesOwnerId: req.user!.id,
            createdBy: req.user!.id,

            // 嵌套创建联系人
            contacts: contactName ? {
              create: {
                name: contactName,
                phone: phone || null,
                email: email || null,
                position: position || null,
                type: 'PRIMARY',
              },
            } : undefined,
          },
        });

        successCount++;
        if (salesType === 'EXTERNAL') importedExternal++;
        else importedInternal++;
      } catch (error: any) {
        failCount++;
        errors.push(`${row.companyName || `第${row._rowIndex}行`}: ${error.message}`);
      }
    }

    res.json({
      code: 0,
      message: '导入完成',
      data: {
        successCount,
        skipCount,
        failCount,
        importedInternal,
        importedExternal,
        errors: errors.slice(0, 50),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/migration/template
 * 下载导入模板（含所有字段的 Excel 模板）
 */
export const downloadTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const templateData = [
      {
        '客户名称': '示例科技有限公司',
        '编号': 'C00000001',
        '行业': '制造业',
        '公司规模': '101-300人',
        '公司电话': '0512-XXXXXXXX',
        '公司官网': 'www.example.com',
        '地址': '江苏省苏州市',
        '详细地址': '苏州市工业园区XX路XX号',
        '销售类别': '国内',
        '销售负责人': '张三',
        '销售部门': '销售部',
        '客户来源': '展会',
        '当前流程状态': '意向',
        '联系人姓名': '李四',
        '联系电话': '13800138000',
        '联系邮箱': 'lisi@example.com',
        '联系人职务': '采购经理',
        '发票抬头': '示例科技有限公司',
        '统一信用代码': '91320500XXXXXXXXXX',
        '发票类型': '增值税专用发票',
        '开户银行': '中国银行苏州分行',
        '银行账号': '6217XXXXXXXXXXXXXX',
        '银行行号': '123456789012',
        '成交金额': '50000',
        '成交次数': '1',
        '回款金额': '50000',
        '待回款金额': '0',
        '备注': '2024年展会认识，有意向采购PSA制氮机',
        '分配时间': '2024-06-01',
        '上次跟进日期': '2024-06-15',
        '下次跟进日期': '2024-07-01',
      },
      {
        '客户名称': 'Global Tech Inc.',
        '编号': 'C00000002',
        '行业': '电子加工',
        '公司规模': '301-1000人',
        '公司电话': '+1-XXX-XXX-XXXX',
        '公司官网': 'www.globaltech.com',
        '地址': '美国加利福尼亚州',
        '详细地址': '123 Main St, San Jose, CA',
        '销售类别': '海外',
        '销售负责人': '王五',
        '销售部门': '外贸部',
        '客户来源': '官网',
        '当前流程状态': '报价',
        '联系人姓名': 'John Smith',
        '联系电话': '+1-XXX-XXX-XXXX',
        '联系邮箱': 'john@globaltech.com',
        '联系人职务': 'CTO',
        '发票抬头': '',
        '统一信用代码': '',
        '发票类型': '',
        '开户银行': '',
        '银行账号': '',
        '银行行号': '',
        '成交金额': '0',
        '成交次数': '0',
        '回款金额': '0',
        '待回款金额': '0',
        '备注': '海外客户，需出口报关',
        '分配时间': '2024-06-10',
        '上次跟进日期': '',
        '下次跟进日期': '2024-06-30',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // 设置列宽
    const headers = Object.keys(templateData[0]);
    const colWidths = headers.map((h) => ({
      wch: Math.max(h.length * 2, 15),
    }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '客户导入模板');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="HOLANG_CRM_客户导入模板.xlsx"');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};
