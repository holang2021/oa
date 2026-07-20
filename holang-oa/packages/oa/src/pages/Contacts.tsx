import { useState, useMemo, useEffect } from 'react'
import { Search, Phone, Mail, Building2, UserCircle, ExternalLink, MessageCircle, X, Briefcase } from 'lucide-react'
import { getWecomContacts, type WecomContact } from '../services/wecomService'

interface Employee {
  id: string
  name: string
  department: string[]
  position: string
  mobile: string | null
  email: string | null
  telephone: string | null
  avatar: string | null
  englishName: string | null
  alias: string | null
  wechat?: string
  whatsapp?: string
}

export default function Contacts() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [deptList, setDeptList] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('全部')
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)

  useEffect(() => {
    setLoading(true)
    getWecomContacts()
      .then((data) => {
        setEmployees(data.list.map((c) => ({ ...c, id: c.userid })))
        setDeptList(data.departments)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const DEPARTMENTS = ['全部', ...deptList.map(d => d.name)]

  const filtered = useMemo(() => {
    return employees.filter(c => {
      if (deptFilter !== '全部' && !c.department.includes(deptFilter)) return false
      if (search) {
        const kw = search.toLowerCase()
        const hit =
          c.name.toLowerCase().includes(kw) ||
          c.position.toLowerCase().includes(kw) ||
          (c.englishName || '').toLowerCase().includes(kw) ||
          (c.alias || '').toLowerCase().includes(kw)
        if (!hit) return false
      }
      return true
    })
  }, [search, deptFilter, employees])

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-xl font-semibold text-gray-800">企业通讯录</h1>
          <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[10px] rounded-full font-medium">
            企微同步
          </span>
        </div>
        <p className="text-sm text-gray-500">数据来源：企业微信通讯录，自动同步</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 bg-white"
            placeholder="搜索姓名或职位..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {DEPARTMENTS.map(d => (
            <button
              key={d}
              onClick={() => setDeptFilter(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                deptFilter === d
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Contact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(c => (
          <div key={c.id} onClick={() => setSelectedEmployee(c)} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center shrink-0">
                <span className="text-brand-700 font-semibold text-sm">{c.name.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-800">{c.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">{(c.department[0] || '')} · {c.position}</div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-50 space-y-1.5">
              {(c.mobile || c.telephone) && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Phone size={12} className="text-gray-300" />
                  {c.mobile || c.telephone}
                </div>
              )}
              {c.email && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Mail size={12} className="text-gray-300" />
                  {c.email}
                </div>
              )}
            </div>

            <div className="mt-3 flex gap-2">
              <button className="flex-1 py-1.5 text-xs text-brand-600 bg-brand-50 rounded-lg hover:bg-brand-100 transition-colors">
                发消息
              </button>
              <button className="py-1.5 px-3 text-xs text-gray-500 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <ExternalLink size={12} />
              </button>
            </div>

            {/* Social media links */}
            <div className="mt-2 flex gap-1.5 flex-wrap">
              {c.wechat && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded text-[10px] font-medium cursor-pointer hover:bg-green-100 transition-colors" title={`微信: ${c.wechat}`}>
                  <MessageCircle size={10} /> {c.wechat}
                </span>
              )}
              {c.whatsapp && (
                <a href={`https://wa.me/${c.whatsapp.replace(/[\s+]/g, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-medium hover:bg-emerald-100 transition-colors no-underline">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">
          <p>通讯录加载中…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <UserCircle size={40} className="mx-auto mb-3 opacity-30" />
          <p>没有匹配的联系人</p>
        </div>
      ) : null}

      {/* Employee Detail Modal */}
      {selectedEmployee && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedEmployee(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800">员工详情</h2>
                <button onClick={() => setSelectedEmployee(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5">
                {/* Avatar & Name */}
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-300 flex items-center justify-center mb-3">
                    <span className="text-brand-700 font-bold text-3xl">{selectedEmployee.name.charAt(0)}</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedEmployee.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-500">{selectedEmployee.position}</span>
                    <span className="text-gray-300">·</span>
                    <span className="text-sm text-gray-500">{(selectedEmployee.department[0] || '')}</span>
                  </div>
                </div>

                {/* Contact Methods */}
                <div className="space-y-3 mb-5">
                  {(selectedEmployee.mobile || selectedEmployee.telephone) && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shrink-0">
                        <Phone size={16} className="text-blue-500" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs text-gray-400">{selectedEmployee.mobile ? '手机' : '座机'}</div>
                        <div className="text-sm font-medium text-gray-800">{selectedEmployee.mobile || selectedEmployee.telephone}</div>
                      </div>
                    </div>
                  )}
                  {selectedEmployee.email && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shrink-0">
                        <Mail size={16} className="text-purple-500" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs text-gray-400">邮箱</div>
                        <div className="text-sm font-medium text-gray-800">{selectedEmployee.email}</div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shrink-0">
                      <Briefcase size={16} className="text-orange-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs text-gray-400">部门/职位</div>
                      <div className="text-sm font-medium text-gray-800">{(selectedEmployee.department.join(' / ') || '—')} · {selectedEmployee.position}</div>
                    </div>
                  </div>

                  {/* Social media */}
                  {selectedEmployee.wechat && (
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                      <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shrink-0">
                        <MessageCircle size={16} className="text-green-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs text-green-500">微信</div>
                        <div className="text-sm font-medium text-green-800">{selectedEmployee.wechat}</div>
                      </div>
                    </div>
                  )}
                  {selectedEmployee.whatsapp && (
                    <a
                      href={`https://wa.me/${selectedEmployee.whatsapp.replace(/[\s+]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg no-underline hover:bg-emerald-100 transition-colors"
                    >
                      <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shrink-0">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-emerald-600">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs text-emerald-500">WhatsApp</div>
                        <div className="text-sm font-medium text-emerald-800">{selectedEmployee.whatsapp}</div>
                      </div>
                    </a>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2">
                  {(selectedEmployee.mobile || selectedEmployee.telephone) && (
                    <a href={`tel:${selectedEmployee.mobile || selectedEmployee.telephone}`} className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors no-underline">
                      <Phone size={14} /> 拨打电话
                    </a>
                  )}
                  {selectedEmployee.email && (
                    <a href={`mailto:${selectedEmployee.email}`} className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors no-underline">
                      <Mail size={14} /> 发送邮件
                    </a>
                  )}
                  {selectedEmployee.wechat && (
                    <button
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
                      onClick={() => navigator.clipboard?.writeText(selectedEmployee.wechat || '')}
                    >
                      <MessageCircle size={14} /> 复制微信
                    </button>
                  )}
                  <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-50 text-brand-700 rounded-lg text-sm font-medium hover:bg-brand-100 transition-colors">
                    <ExternalLink size={14} /> 企微会话
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
        <div className="flex items-center gap-2 text-sm text-blue-700 font-medium mb-1">
          <Building2 size={16} />
          数据同步说明
        </div>
        <p className="text-xs text-blue-600 leading-relaxed">
          通讯录数据来自企业微信通讯录 API，每次登录自动同步最新数据。<br/>
          员工信息变更（入职/离职/调岗）将在企微后台更新后自动反映到 CRM。
        </p>
      </div>
    </div>
  )
}
