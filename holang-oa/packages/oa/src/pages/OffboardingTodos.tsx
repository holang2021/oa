// ============================================================
// 离职交接待办（自动生成，管理员可见/可关闭）
// 离职交接执行成功后，后端自动写入一条「X离职，N客户/M商机/K跟进待交接」待办，
// 管理员在此统一查看并标记「已交接完成」，防止遗漏。
// ============================================================
import { useState, useEffect, useCallback } from 'react'
import { Inbox, CheckCircle2, AlertTriangle, Check, Clock, UserX } from 'lucide-react'
import { api } from '../services/api'

interface TodoItem {
  id: string
  type: string
  title: string
  content: string
  status: string
  relatedUserId: string | null
  relatedUserName: string | null
  meta: string | null
  createdByName: string | null
  doneByName: string | null
  doneAt: string | null
  createdAt: string
}

function formatDate(s?: string | null): string {
  if (!s) return ''
  const d = new Date(s)
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function OffboardingTodos() {
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [closingId, setClosingId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2200)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<{ data: TodoItem[] }>('/todos')
      setTodos(res.data?.data ?? [])
    } catch (e: any) {
      showToast(e?.response?.data?.message || '加载待办失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleClose = async (id: string) => {
    setClosingId(id)
    try {
      await api.post(`/todos/${id}/close`)
      showToast('已标记为交接完成')
      await load()
    } catch (e: any) {
      showToast(e?.response?.data?.message || '标记失败')
    } finally {
      setClosingId(null)
    }
  }

  const pending = todos.filter((t) => t.status === 'PENDING')
  const done = todos.filter((t) => t.status === 'DONE')

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* 页头 */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <UserX size={22} className="text-gray-700" />
          <h1 className="text-xl font-bold text-gray-900">离职交接待办</h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          员工办理离职后由系统自动生成，提醒管理员核对交接是否到位，防遗漏。
          {pending.length > 0 && <span className="text-amber-600 ml-2 font-medium">（{pending.length} 条待处理）</span>}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">加载中…</div>
      ) : todos.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CheckCircle2 size={48} className="mx-auto mb-3 text-green-300" />
          <p className="text-lg font-medium text-gray-500">暂无待办</p>
          <p className="text-sm mt-1">尚未有离职交接需要跟进</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 待处理 */}
          {pending.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-amber-700 mb-3 flex items-center gap-1.5">
                <AlertTriangle size={15} /> 待处理（{pending.length}）
              </h2>
              <div className="space-y-3">
                {pending.map((t) => (
                  <div key={t.id} className="bg-white rounded-lg border border-amber-200 bg-amber-50/30 p-4">
                    <div className="flex items-start gap-3">
                      <Inbox size={18} className="text-amber-500 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900">{t.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{t.content}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          生成人：{t.createdByName || '系统'} · {formatDate(t.createdAt)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleClose(t.id)}
                        disabled={closingId === t.id}
                        className="shrink-0 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 btn-primary disabled:opacity-50"
                      >
                        <Check size={14} />
                        {closingId === t.id ? '处理中…' : '标记已交接完成'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 已完成 */}
          {done.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-1.5">
                <Clock size={15} /> 已完成（{done.length}）
              </h2>
              <div className="space-y-3">
                {done.map((t) => (
                  <div key={t.id} className="bg-white rounded-lg border border-gray-200 p-4 opacity-75">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 size={18} className="text-green-500 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-700 line-through">{t.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">{t.content}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          完成人：{t.doneByName || '-'} · {formatDate(t.doneAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-sm z-50">
          <CheckCircle2 size={16} className="inline mr-2" />
          {toast}
        </div>
      )}
    </div>
  )
}
