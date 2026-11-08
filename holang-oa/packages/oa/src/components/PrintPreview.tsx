import { useEffect, useState, useRef } from 'react'
import { PrintTemplate, getTemplateById } from '../services/printTemplateStore'
import { Printer, X, FileText } from 'lucide-react'

interface PrintPreviewProps {
  templateId: string
  data: Record<string, any>
  open: boolean
  onClose: () => void
}

export default function PrintPreview({ templateId, data, open, onClose }: PrintPreviewProps) {
  const [template, setTemplate] = useState<PrintTemplate | null>(null)
  const areaRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    if (open) {
      const t = getTemplateById(templateId)
      setTemplate(t || null)
    }
  }, [open, templateId])

  // 让整页纸张完整落在预览区宽度内（刘总 2026-11-08 反馈「预览页看不全内容」）。
  // 原来 A4 按 3.78 倍约 794px 宽，弹窗只有 672px，右侧被截断并出现横向滚动条。
  // 现按可用宽度等比缩放整页，宽度永不溢出；纵向仍可滚动查看长页面。
  useEffect(() => {
    const el = areaRef.current
    if (!open || !template || !el) return
    const naturalW = (template.orientation === 'portrait' ? template.width : template.height) * 3.78
    const fit = () => {
      const avail = el.clientWidth - 48 // 预览区左右各 24px padding
      setScale(Math.min(1, Math.max(0.25, avail / naturalW)))
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [open, template])

  if (!open || !template) return null

  const { width, height, orientation } = template
  const displayW = orientation === 'portrait' ? width : height
  const displayH = orientation === 'portrait' ? height : width
  const naturalW = displayW * 3.78
  const naturalH = displayH * 3.78

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const html = generatePrintHTML(template, data)
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-5xl shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-brand-600" />
            <h3 className="text-sm font-semibold">打印预览 — {template.name}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700">
              <Printer size={13} />打印 / 导出 PDF
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
        </div>

        {/* Preview area：外层按缩放后尺寸占位，内层纸张按自然尺寸渲染再等比缩放 */}
        <div ref={areaRef} className="flex-1 overflow-auto p-6 bg-gray-100 flex justify-center">
          <div style={{ width: naturalW * scale, height: naturalH * scale, flexShrink: 0 }}>
            <div className="bg-white shadow-lg" style={{
              width: `${naturalW}px`,
              height: `${naturalH}px`,
              minWidth: `${naturalW}px`,
              minHeight: `${naturalH}px`,
              padding: '24px',
              boxSizing: 'border-box',
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}>
              <RenderTemplateContent template={template} data={data} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function RenderTemplateContent({ template, data }: { template: PrintTemplate; data: Record<string, any> }) {
  return (
    <div className="h-full flex flex-col">
      {template.fields.map((field, idx) => {
        const val = field.key ? (data[field.key] ?? '') : ''

        switch (field.type) {
          // header 支持 key：有单据数据时按实际值渲染（如 PI 币种名称），否则保留模板静态文案。
          case 'header': {
            const text = field.key && val !== '' && val != null ? String(val) : (field.content || '')
            return (
              <div key={idx} className={`mb-4 ${field.align === 'center' ? 'text-center' : field.align === 'right' ? 'text-right' : ''}`}
                style={{ fontSize: `${field.fontSize || 14}px`, fontWeight: field.bold ? 'bold' : 'normal' }}>
                {text}
              </div>
            )
          }
          case 'field':
            return (
              <div key={idx} className={`flex items-center gap-2 mb-2 text-sm ${field.align === 'center' ? 'justify-center' : field.align === 'right' ? 'justify-end' : ''}`}>
                <span className="text-gray-500 text-xs">{field.label}:</span>
                <span className="font-medium">{String(val)}</span>
              </div>
            )
          case 'table': {
            const items = field.key && Array.isArray(data[field.key]) ? data[field.key] : []
            const hasTableFields = Array.isArray(field.tableFields) && field.tableFields.length > 0
            const cols = field.columns || []
            return (
              <div key={idx} className="mb-4 flex-1">
                <div className="text-xs text-gray-500 mb-1">{field.label}</div>
                <table className="w-full text-xs border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {cols.map((col, ci) => (
                        <th key={ci} className={`border border-gray-200 px-2 py-1 ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}`}>
                          {col.content}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr><td colSpan={cols.length || 1} className="border border-gray-200 px-2 py-3 text-center text-gray-400">暂无数据</td></tr>
                    ) : items.map((item: any, ri: number) => (
                      <tr key={ri}>
                        <td className="border border-gray-200 px-2 py-1 text-center">{ri + 1}</td>
                        {hasTableFields
                          ? field.tableFields!.map((tf, ci) => (
                              <td key={ci} className={`border border-gray-200 px-2 py-1 ${tf.align === 'right' ? 'text-right' : tf.align === 'center' ? 'text-center' : 'text-left'}`}>
                                {String(item[tf.key || ''] ?? '')}
                              </td>
                            ))
                          : (
                            <>
                              <td className="border border-gray-200 px-2 py-1">{item.name || item.productName || ''}</td>
                              <td className="border border-gray-200 px-2 py-1">{item.spec || item.specification || ''}</td>
                              <td className="border border-gray-200 px-2 py-1 text-right">{item.qty || item.quantity || ''}</td>
                              <td className="border border-gray-200 px-2 py-1 text-right">{item.price || item.unitPrice || ''}</td>
                              <td className="border border-gray-200 px-2 py-1 text-right">{item.amount || (item.qty && item.price ? item.qty * item.price : '')}</td>
                            </>
                          )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
          case 'footer':
            return (
              <div key={idx} className={`mt-auto pt-4 text-xs text-gray-400 ${field.align === 'center' ? 'text-center' : field.align === 'right' ? 'text-right' : ''}`}
                style={{ fontSize: `${field.fontSize || 10}px` }}>
                {field.content}
              </div>
            )
          case 'spacer':
            return <div key={idx} className="h-4" />
          case 'qrcode':
            return (
              <div key={idx} className={`flex justify-center mb-2 ${field.align === 'center' ? '' : field.align === 'right' ? 'justify-end' : 'justify-start'}`}>
                <div className="w-24 h-24 bg-gray-100 border border-gray-200 rounded flex items-center justify-center text-xs text-gray-400">
                  {val ? val.slice(0, 12) : 'QR CODE'}
                </div>
              </div>
            )
          default:
            return null
        }
      })}
    </div>
  )
}

function generatePrintHTML(template: PrintTemplate, data: Record<string, any>): string {
  const { width, height, orientation } = template
  const w = orientation === 'portrait' ? width : height
  const h = orientation === 'portrait' ? height : width

  const fieldsHTML = template.fields.map(field => {
    const val = field.key ? (data[field.key] ?? '') : ''
    switch (field.type) {
      case 'header': {
        const text = field.key && val !== '' && val != null ? String(val) : (field.content || '')
        return `<div style="text-align:${field.align || 'left'};font-size:${field.fontSize || 14}px;font-weight:${field.bold ? 'bold' : 'normal'};margin-bottom:16px;">${text}</div>`
      }
      case 'field':
        return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:13px;${field.align === 'center' ? 'justify-content:center;' : field.align === 'right' ? 'justify-content:flex-end;' : ''}"><span style="color:#999;font-size:11px;">${field.label}:</span><span style="font-weight:500;">${String(val)}</span></div>`
      case 'table': {
        const items = field.key && Array.isArray(data[field.key]) ? data[field.key] : []
        const hasTableFields = Array.isArray(field.tableFields) && field.tableFields.length > 0
        const cols = field.columns || []
        const th = cols.map(c => `<th style="border:1px solid #ddd;padding:4px 8px;font-size:11px;background:#f5f5f5;text-align:${c.align || 'left'};">${c.content}</th>`).join('')
        const tbody = items.length === 0
          ? `<tr><td colspan="${cols.length}" style="border:1px solid #ddd;padding:12px;text-align:center;color:#999;font-size:11px;">暂无数据</td></tr>`
          : items.map((item: any, i: number) => {
              const dataCells = hasTableFields
                ? field.tableFields!.map(tf => `<td style="border:1px solid #ddd;padding:4px 8px;font-size:11px;text-align:${tf.align === 'right' ? 'right' : tf.align === 'center' ? 'center' : 'left'};">${String(item[tf.key || ''] ?? '')}</td>`).join('')
                : `<td style="border:1px solid #ddd;padding:4px 8px;font-size:11px;">${item.name || item.productName || ''}</td><td style="border:1px solid #ddd;padding:4px 8px;font-size:11px;">${item.spec || item.specification || ''}</td><td style="border:1px solid #ddd;padding:4px 8px;font-size:11px;text-align:right;">${item.qty || item.quantity || ''}</td><td style="border:1px solid #ddd;padding:4px 8px;font-size:11px;text-align:right;">${item.price || item.unitPrice || ''}</td><td style="border:1px solid #ddd;padding:4px 8px;font-size:11px;text-align:right;">${item.amount || (item.qty && item.price ? item.qty * item.price : '')}</td>`
              return `<tr><td style="border:1px solid #ddd;padding:4px 8px;font-size:11px;text-align:center;">${i + 1}</td>${dataCells}</tr>`
            }).join('')
        return `<div style="margin-bottom:16px;"><div style="font-size:11px;color:#999;margin-bottom:4px;">${field.label}</div><table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr>${th}</tr></thead><tbody>${tbody}</tbody></table></div>`
      }
      case 'footer':
        return `<div style="margin-top:auto;padding-top:16px;font-size:${field.fontSize || 10}px;color:#999;text-align:${field.align || 'left'};">${field.content}</div>`
      case 'spacer':
        return `<div style="height:16px;"></div>`
      case 'qrcode':
        return `<div style="display:flex;justify-content:${field.align === 'center' ? 'center' : field.align === 'right' ? 'flex-end' : 'flex-start'};margin-bottom:8px;"><div style="width:96px;height:96px;background:#f5f5f5;border:1px solid #ddd;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#999;">${val ? val.slice(0, 12) : 'QR CODE'}</div></div>`
      default:
        return ''
    }
  }).join('')

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>打印</title>
<style>
@page { size: ${w}mm ${h}mm; margin: 10mm; }
body { margin: 0; padding: 0; font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif; }
/* @page 已留 10mm 页边距，可打印区 = ${w - 20} × ${h - 20}mm；
   纸张容器改用 100% 自适应宽度（原固定 ${w}mm 会超出可打印区导致右侧被裁），
   高度用 min-height 让内容多时自然分页而不被截断。 */
.print-page { width: 100%; min-height: ${h - 20}mm; padding: 0; box-sizing: border-box; display: flex; flex-direction: column; }
</style></head>
<body><div class="print-page">${fieldsHTML}</div></body></html>`
}

// Hook for easy use
export function usePrintPreview() {
  const [state, setState] = useState<{ open: boolean; templateId: string; data: Record<string, any> }>({
    open: false, templateId: '', data: {}
  })

  const openPreview = (templateId: string, data: Record<string, any>) => {
    setState({ open: true, templateId, data })
  }

  const closePreview = () => setState(prev => ({ ...prev, open: false }))

  const PrintPreviewComponent = (
    <PrintPreview
      templateId={state.templateId}
      data={state.data}
      open={state.open}
      onClose={closePreview}
    />
  )

  return { openPreview, closePreview, PrintPreviewComponent }
}
