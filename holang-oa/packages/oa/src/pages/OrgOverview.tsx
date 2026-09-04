// ============================================================
// 组织管理总览页
// 配置层入口：通讯录 / 角色权限 / 离职交接
// ============================================================

import { useNavigate } from 'react-router-dom'
import { BookUser, ShieldCheck, UserX } from 'lucide-react'

interface OrgCard {
  to: string
  title: string
  desc: string
  icon: React.ReactNode
}

export default function OrgOverview() {
  const navigate = useNavigate()

  const items: OrgCard[] = [
    {
      to: '/org/contacts',
      title: '通讯录',
      desc: '企业通讯录与员工信息维护',
      icon: <BookUser className="w-6 h-6 text-blue-600" />,
    },
    {
      to: '/org/roles',
      title: '角色权限',
      desc: '角色、菜单权限与数据范围配置',
      icon: <ShieldCheck className="w-6 h-6 text-amber-600" />,
    },
    {
      to: '/org/offboarding',
      title: '离职交接',
      desc: '人员离职时的客户 / 商机 / 跟进批量移交',
      icon: <UserX className="w-6 h-6 text-red-600" />,
    },
  ]

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">组织管理</h1>
        <p className="text-sm text-gray-500 mt-1">
          企业组织架构、角色权限与人员交接配置层
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map(item => (
          <button
            key={item.to}
            onClick={() => navigate(item.to)}
            className="flex items-start gap-4 p-5 bg-white rounded-lg shadow-sm border border-gray-200 hover:border-brand-300 hover:shadow-md transition-all text-left"
          >
            <div className="shrink-0 p-2 bg-gray-50 rounded-lg">{item.icon}</div>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-800">{item.title}</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
