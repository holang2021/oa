// ============================================================
// 系统工具总览页
// 聚合所有系统级工具入口，按可见性自动过滤（管理员才看得到配置层工具）
// ============================================================

import { useNavigate } from 'react-router-dom'
import {
  BookOpen, Globe, ClipboardCheck, FileText, Printer,
  Trash2, Settings, History, LayoutTemplate, BarChart3,
  Blocks
} from 'lucide-react'
import { isCurrentUserAdmin } from '../services/rbacStore'

interface ToolCard {
  to: string
  title: string
  desc: string
  icon: React.ReactNode
  adminOnly?: boolean
}

export default function SystemTools() {
  const navigate = useNavigate()
  const isAdmin = isCurrentUserAdmin()

  const tools: ToolCard[] = [
    {
      to: '/tools/feishu-wiki',
      title: '飞书知识库',
      desc: '跟进记录、AI 对话等沟通数据同步至飞书知识库',
      icon: <BookOpen className="w-6 h-6 text-blue-600" />,
    },
    {
      to: '/tools/config',
      title: 'DeepSeek API 配置',
      desc: '管理 DeepSeek 等大模型 API 连接、密钥与 base URL',
      icon: <Globe className="w-6 h-6 text-purple-600" />,
      adminOnly: true,
    },
    {
      to: '/tools/approval',
      title: '审批引擎',
      desc: '配置审批流程、节点与规则',
      icon: <ClipboardCheck className="w-6 h-6 text-green-600" />,
      adminOnly: true,
    },
    {
      to: '/tools/templates',
      title: '审批模板',
      desc: '管理审批表单模板',
      icon: <LayoutTemplate className="w-6 h-6 text-teal-600" />,
      adminOnly: true,
    },
    {
      to: '/tools/stats',
      title: '审批统计',
      desc: '查看审批效率与统计分析',
      icon: <BarChart3 className="w-6 h-6 text-orange-600" />,
      adminOnly: true,
    },
    {
      to: '/tools/print-templates',
      title: '打印模板',
      desc: '统一打印模板管理（PI、报价单、合同等）',
      icon: <Printer className="w-6 h-6 text-indigo-600" />,
      adminOnly: true,
    },
    {
      to: '/tools/doc-templates',
      title: '单证模板',
      desc: '外贸单证模板设置（CI、PL 等）',
      icon: <FileText className="w-6 h-6 text-cyan-600" />,
      adminOnly: true,
    },
    {
      to: '/tools/config',
      title: '系统配置',
      desc: '编码规则、币种汇率、字段配置等全局设置',
      icon: <Settings className="w-6 h-6 text-gray-600" />,
      adminOnly: true,
    },
    {
      to: '/tools/blueprint',
      title: '系统蓝图',
      desc: '浏览系统数据模型与蓝图结构',
      icon: <Blocks className="w-6 h-6 text-pink-600" />,
      adminOnly: true,
    },
    {
      to: '/tools/logs',
      title: '操作日志',
      desc: '查看用户操作与系统日志',
      icon: <History className="w-6 h-6 text-amber-600" />,
      adminOnly: true,
    },
    {
      to: '/tools/trash',
      title: '回收站',
      desc: '恢复误删数据',
      icon: <Trash2 className="w-6 h-6 text-red-600" />,
      adminOnly: true,
    },
  ]

  const visibleTools = tools.filter(t => !t.adminOnly || isAdmin)

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">系统工具</h1>
        <p className="text-sm text-gray-500 mt-1">
          系统级工具与配置入口，管理员可管理全局设置
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleTools.map(tool => (
          <button
            key={tool.to + tool.title}
            onClick={() => navigate(tool.to)}
            className="flex items-start gap-4 p-5 bg-white rounded-lg shadow-sm border border-gray-200 hover:border-brand-300 hover:shadow-md transition-all text-left"
          >
            <div className="shrink-0 p-2 bg-gray-50 rounded-lg">{tool.icon}</div>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-800">{tool.title}</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{tool.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
