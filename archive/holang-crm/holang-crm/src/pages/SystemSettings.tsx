// ============================================================
// 系统配置页面
// 整合：编码规则 / 币种汇率 / WhatsApp / API 配置 / 字段配置
// ============================================================

import { useState } from 'react'
import {
  Hash,
  Coins,
  MessageCircle,
  Globe,
  ListChecks,
  Shield,
  FileText,
} from 'lucide-react'
import ApiConfigPanel from '../components/settings/ApiConfigPanel'
import FieldConfigPanel from '../components/settings/FieldConfigPanel'
import CodeRulePanel from '../components/settings/CodeRulePanel'
import CurrencyPanel from '../components/settings/CurrencyPanel'
import RbacSettings from './RbacSettings'
import DocTemplateSettings from './settings/DocTemplateSettings'

type TabKey = 'codeRule' | 'currency' | 'whatsapp' | 'api' | 'field' | 'rbac' | 'docTemplate'

interface Tab {
  key: TabKey
  label: string
  icon: React.ReactNode
}

const TABS: Tab[] = [
  { key: 'codeRule', label: '编码规则', icon: <Hash size={16} /> },
  { key: 'currency', label: '币种与汇率', icon: <Coins size={16} /> },
  { key: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle size={16} /> },
  { key: 'api', label: 'API 配置', icon: <Globe size={16} /> },
  { key: 'field', label: '字段配置', icon: <ListChecks size={16} /> },
  { key: 'rbac', label: '角色权限', icon: <Shield size={16} /> },
  { key: 'docTemplate', label: '单证模板', icon: <FileText size={16} /> },
]

// 占位面板
function PlaceholderTab({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
      <div className="text-3xl mb-3">🔧</div>
      <p className="text-lg font-medium text-gray-500">{title}</p>
      <p className="text-sm mt-1">{description}</p>
    </div>
  )
}

export default function SystemSettings() {
  const [activeTab, setActiveTab] = useState<TabKey>('api')

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">系统配置</h1>
        <p className="text-sm text-gray-500 mt-1">
          统一管理系统的编码规则、币种汇率、API 连接与表单字段配置
        </p>
      </div>

      {/* Tab 导航 */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-[1px] transition-colors ${
              activeTab === tab.key
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      {activeTab === 'codeRule' && <CodeRulePanel />}
      {activeTab === 'currency' && <CurrencyPanel />}
      {activeTab === 'whatsapp' && (
        <PlaceholderTab title="WhatsApp 配置" description="WhatsApp Business API 桥接配置，建设中" />
      )}
      {activeTab === 'api' && <ApiConfigPanel />}
      {activeTab === 'field' && <FieldConfigPanel />}
      {activeTab === 'rbac' && <RbacSettings />}
      {activeTab === 'docTemplate' && <DocTemplateSettings />}
    </div>
  )
}
