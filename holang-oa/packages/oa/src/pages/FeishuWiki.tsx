import { useEffect, useState } from 'react'
import { BookOpen, RefreshCw, CheckCircle2, XCircle, ExternalLink, FileText, Save, ShieldAlert } from 'lucide-react'
import {
  getSettings, updateSettings, verifyConnection, getRecords, getRecordContent,
  resyncRecord, type FeishuWikiSettings, type FeishuSyncRecord,
} from '../services/feishuWikiService'
import { isCurrentUserAdmin } from '../services/rbacStore'

const TYPE_LABELS: Record<string, string> = {
  FOLLOW_UP: '跟进记录',
  AI_THREAD: 'AI 对话',
  CONTACT_NOTE: '联系人备注',
}

export default function FeishuWiki() {
  const isAdmin = isCurrentUserAdmin()
  const [settings, setSettings] = useState<FeishuWikiSettings | null>(null)
  const [verify, setVerify] = useState<{ ok: boolean; spaceName?: string; message: string } | null>(null)
  const [verifyLoading, setVerifyLoading] = useState(false)

  const [keyword, setKeyword] = useState('')
  const [type, setType] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [records, setRecords] = useState<FeishuSyncRecord[]>([])
  const [pagination, setPagination] = useState<any>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  const [content, setContent] = useState<string | null>(null)
  const [contentLoading, setContentLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  // 加载设置
  useEffect(() => {
    if (!isAdmin) return
    getSettings().then(setSettings).catch((e) => setMsg(e.message))
  }, [isAdmin])

  // 加载记录
  const loadRecords = (p = 1) => {
    setLoading(true)
    getRecords({ keyword, type, from, to, page: p, pageSize: 20 })
      .then((r) => { setRecords(r.list); setPagination(r.pagination); setPage(p) })
      .catch((e) => setMsg(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadRecords(1) }, [])

  const handleVerify = () => {
    setVerifyLoading(true)
    verifyConnection()
      .then((r) => setVerify({ ok: r.ok, spaceName: r.spaceName, message: r.message }))
      .catch((e) => setVerify({ ok: false, message: e.message }))
      .finally(() => setVerifyLoading(false))
  }

  const handleSaveSettings = () => {
    if (!settings) return
    updateSettings(settings)
      .then((s) => { setSettings(s); setMsg('设置已保存') })
      .catch((e) => setMsg(e.message))
  }

  const handleResync = (oaRecordId: string) => {
    resyncRecord(oaRecordId)
      .then(() => { setMsg('重推已触发'); loadRecords(page) })
      .catch((e) => setMsg(e.message))
  }

  const handleFetch = (id: string) => {
    setContentLoading(true)
    setContent(null)
    getRecordContent(id)
      .then((r) => setContent(r.content))
      .catch((e) => setMsg(e.message))
      .finally(() => setContentLoading(false))
  }

  const toggle = (k: keyof FeishuWikiSettings) => {
    if (!settings) return
    setSettings({ ...settings, [k]: !settings[k] })
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <BookOpen className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold">飞书知识库 · 沟通记录同步</h1>
      </div>
      <p className="text-gray-500 text-sm mb-6">
        跟进记录等沟通数据自动/批量同步至飞书知识库（HOLANG 企业知识库），支持检索与正文调取。
      </p>

      {msg && (
        <div className="mb-4 px-4 py-2 rounded bg-blue-50 text-blue-700 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {msg}
          <button className="ml-auto text-blue-400" onClick={() => setMsg(null)}>✕</button>
        </div>
      )}

      {/* 设置（仅管理员） */}
      {isAdmin && settings && (
        <div className="bg-white rounded-lg shadow p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">同步设置</h2>
            <button
              onClick={handleVerify}
              disabled={verifyLoading}
              className="flex items-center gap-1 px-3 py-1.5 rounded bg-blue-600 text-white text-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${verifyLoading ? 'animate-spin' : ''}`} /> 连通校验
            </button>
          </div>

          {verify && (
            <div className={`mb-4 px-3 py-2 rounded text-sm flex items-center gap-2 ${verify.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {verify.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {verify.ok ? `连通正常 · 空间：${verify.spaceName}` : `校验失败：${verify.message}`}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Switch label="总闸（启用同步）" checked={settings.enabled} onChange={() => toggle('enabled')} />
            <Switch label="跟进记录" checked={settings.syncFollowUp} onChange={() => toggle('syncFollowUp')} />
            <Switch label="AI 对话归档" checked={settings.syncAiThread} onChange={() => toggle('syncAiThread')} />
            <Switch label="联系人备注" checked={settings.syncContactNote} onChange={() => toggle('syncContactNote')} />
          </div>

          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm text-gray-600">飞书空间 ID：</span>
            <code className="px-2 py-1 bg-gray-100 rounded text-sm">{settings.wikiSpaceId}</code>
          </div>

          <button onClick={handleSaveSettings} className="flex items-center gap-1 px-4 py-2 rounded bg-green-600 text-white text-sm">
            <Save className="w-4 h-4" /> 保存设置
          </button>
        </div>
      )}

      {!isAdmin && (
        <div className="mb-6 px-4 py-3 rounded bg-amber-50 text-amber-700 text-sm flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" /> 同步开关与重推仅管理员可操作；你可直接检索与查看已同步的沟通记录。
        </div>
      )}

      {/* 检索 */}
      <div className="bg-white rounded-lg shadow p-5">
        <h2 className="text-lg font-semibold mb-4">沟通记录库</h2>
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="关键词（标题/客户/操作人/记录ID）"
            className="flex-1 min-w-[200px] px-3 py-2 border rounded text-sm"
          />
          <select value={type} onChange={(e) => setType(e.target.value)} className="px-3 py-2 border rounded text-sm">
            <option value="">全部类型</option>
            <option value="FOLLOW_UP">跟进记录</option>
            <option value="AI_THREAD">AI 对话</option>
            <option value="CONTACT_NOTE">联系人备注</option>
          </select>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="px-3 py-2 border rounded text-sm" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="px-3 py-2 border rounded text-sm" />
          <button onClick={() => loadRecords(1)} className="px-4 py-2 rounded bg-blue-600 text-white text-sm">查询</button>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-8">加载中…</div>
        ) : records.length === 0 ? (
          <div className="text-center text-gray-400 py-8">暂无同步记录（新建一条跟进将自动同步）</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left p-2">标题</th>
                  <th className="text-left p-2">客户</th>
                  <th className="text-left p-2">操作人</th>
                  <th className="text-left p-2">类型</th>
                  <th className="text-left p-2">状态</th>
                  <th className="text-left p-2">同步时间</th>
                  <th className="text-left p-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2 max-w-[260px] truncate" title={r.title}>{r.title}</td>
                    <td className="p-2">{r.customerName || '—'}</td>
                    <td className="p-2">{r.operator || '—'}</td>
                    <td className="p-2">{TYPE_LABELS[r.recordType] || r.recordType}</td>
                    <td className="p-2">
                      {r.status === 'SYNCED' ? (
                        <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> 已同步</span>
                      ) : (
                        <span className="text-red-600 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> 失败</span>
                      )}
                    </td>
                    <td className="p-2 text-gray-500">{new Date(r.syncedAt).toLocaleString()}</td>
                    <td className="p-2 whitespace-nowrap">
                      <button onClick={() => handleFetch(r.id)} className="text-blue-600 hover:underline flex items-center gap-1 inline-flex">
                        <FileText className="w-3.5 h-3.5" /> 拉取
                      </button>
                      {r.feishuUrl && (
                        <a href={r.feishuUrl} target="_blank" rel="noreferrer" className="text-gray-500 hover:underline flex items-center gap-1 inline-flex ml-3">
                          <ExternalLink className="w-3.5 h-3.5" /> 飞书
                        </a>
                      )}
                      {isAdmin && (
                        <button onClick={() => handleResync(r.oaRecordId)} className="text-amber-600 hover:underline flex items-center gap-1 inline-flex ml-3">
                          <RefreshCw className="w-3.5 h-3.5" /> 重推
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button disabled={page <= 1} onClick={() => loadRecords(page - 1)} className="px-3 py-1 border rounded disabled:opacity-40">上一页</button>
            <span className="text-sm text-gray-600">第 {page} / {pagination.totalPages} 页（共 {pagination.total} 条）</span>
            <button disabled={page >= pagination.totalPages} onClick={() => loadRecords(page + 1)} className="px-3 py-1 border rounded disabled:opacity-40">下一页</button>
          </div>
        )}
      </div>

      {/* 正文弹窗 */}
      {content !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setContent(null)}>
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[80vh] overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold flex items-center gap-2"><FileText className="w-5 h-5" /> 飞书文档正文</h3>
              <button onClick={() => setContent(null)} className="text-gray-400">✕</button>
            </div>
            {contentLoading ? (
              <div className="text-gray-400 py-8 text-center">加载中…</div>
            ) : (
              <pre className="whitespace-pre-wrap text-sm text-gray-800 bg-gray-50 rounded p-4">{content}</pre>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <button
        type="button"
        onClick={onChange}
        className={`w-10 h-5 rounded-full relative transition-colors ${checked ? 'bg-green-500' : 'bg-gray-300'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  )
}
