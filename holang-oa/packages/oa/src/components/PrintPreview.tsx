import { useEffect, useState, useRef } from 'react'
import { PrintTemplate, PrintField, getTemplateById } from '../services/printTemplateStore'
import { PRINT_FONT_FAMILY, PRINT_FONT_SIZES, PRINT_COLORS } from '../services/printDesignTokens'
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

/** 字段标签：可由 labelKey 从单据数据切换中英文；中文用全角冒号 */
function fieldLabel(field: PrintField, data: Record<string, any>) {
  const label = field.labelKey && data[field.labelKey] ? String(data[field.labelKey]) : (field.label || '')
  const colon = /[\u4e00-\u9fa5]/.test(label) ? '：' : ':'
  return { label, colon }
}

/** 表格边框：真实外销单据用粗黑框，其余模板沿用设计系统的常规描边 */
function tableBorder(field: PrintField) {
  return field.bordered ? PRINT_COLORS.borderStrong : PRINT_COLORS.border
}

function RenderTemplateContent({ template, data }: { template: PrintTemplate; data: Record<string, any> }) {
  return (
    <div className="h-full flex flex-col" style={{ fontFamily: PRINT_FONT_FAMILY, color: PRINT_COLORS.text }}>
      {template.fields.map((field, idx) => {
        const val = field.key ? (data[field.key] ?? '') : ''

        switch (field.type) {
          // header 支持 key：有单据数据时按实际值渲染（如 PI 币种名称），否则保留模板静态文案。
          case 'header': {
            const text = field.key && val !== '' && val != null ? String(val) : (field.content || '')
            return (
              <div key={idx}
                className={`mb-2 ${field.align === 'center' ? 'text-center' : field.align === 'right' ? 'text-right' : ''}`}
                style={{ fontSize: `${field.fontSize || PRINT_FONT_SIZES.body}px`, fontWeight: field.bold ? 'bold' : 'normal', lineHeight: 1.4 }}>
                {text}
              </div>
            )
          }
          case 'field': {
            const { label, colon } = fieldLabel(field, data)
            return (
              <div key={idx}
                className={`flex items-center gap-2 mb-1.5 ${field.align === 'center' ? 'justify-center' : field.align === 'right' ? 'justify-end' : ''}`}
                style={{ fontSize: `${PRINT_FONT_SIZES.body}px`, lineHeight: 1.4 }}>
                {!field.hideLabel && <span style={{ color: PRINT_COLORS.secondary, fontSize: `${PRINT_FONT_SIZES.label}px` }}>{label}{colon}</span>}
                <span style={{ fontWeight: 500 }}>{String(val)}</span>
              </div>
            )
          }
          // 真实 logo（public/HOLANG_Logo_Official.png，高 28px）
          case 'image':
            return (
              <div key={idx} style={{ marginBottom: 8 }}>
                <img src={field.src || ''} alt="HOLANG" style={{ height: `${field.height || 28}px`, width: 'auto', display: 'block' }} />
              </div>
            )
          // 买方信息（左）与单据头（右）并排两栏，对齐真实外销单据
          case 'twoColumn': {
            const cell = (f: PrintField, i: number) => {
              const v = f.key ? (data[f.key] ?? '') : ''
              const { label, colon } = fieldLabel(f, data)
              return (
                <div key={i} style={{ display: 'flex', gap: 6, fontSize: `${PRINT_FONT_SIZES.body}px`, marginBottom: 3, lineHeight: 1.4 }}>
                  {!f.hideLabel && <span style={{ color: PRINT_COLORS.secondary, fontSize: `${PRINT_FONT_SIZES.label}px`, whiteSpace: 'nowrap' }}>{label}{colon}</span>}
                  <span style={{ fontWeight: 500 }}>{String(v)}</span>
                </div>
              )
            }
            return (
              <div key={idx} style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>{(field.left || []).map(cell)}</div>
                <div style={{ minWidth: 180 }}>{(field.right || []).map(cell)}</div>
              </div>
            )
          }
          case 'table': {
            const items = field.key && Array.isArray(data[field.key]) ? data[field.key] : []
            const hasTableFields = Array.isArray(field.tableFields) && field.tableFields.length > 0
            const cols = field.columns || []
            const border = tableBorder(field)
            const showNo = field.showRowNumber !== false
            const thStyle: React.CSSProperties = {
              border: `1px solid ${border}`, padding: '5px 8px',
              fontSize: `${PRINT_FONT_SIZES.table}px`,
              background: field.bordered ? PRINT_COLORS.surface : PRINT_COLORS.bg,
              fontWeight: field.bordered ? 700 : 600,
            }
            const tdStyle = (align?: string): React.CSSProperties => ({
              border: `1px solid ${border}`, padding: '5px 8px',
              fontSize: `${PRINT_FONT_SIZES.table}px`,
              textAlign: (align === 'right' ? 'right' : align === 'center' ? 'center' : 'left') as React.CSSProperties['textAlign'],
            })
            return (
              <div key={idx} className="mb-3">
                <div style={{ fontSize: `${PRINT_FONT_SIZES.label}px`, color: PRINT_COLORS.secondary, marginBottom: 4 }}>{field.label}</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {cols.map((col, ci) => (
                        <th key={ci} style={{ ...thStyle, textAlign: (col.align === 'center' ? 'center' : col.align === 'right' ? 'right' : 'left') as React.CSSProperties['textAlign'] }}>
                          {col.content}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>{cols.map((_, ci) => <td key={ci} style={tdStyle()}>&nbsp;</td>)}</tr>
                    ) : items.map((item: any, ri: number) => (
                      <tr key={ri}>
                        {showNo && <td style={tdStyle('center')}>{ri + 1}</td>}
                        {hasTableFields
                          ? field.tableFields!.map((tf, ci) => (
                              <td key={ci} style={tdStyle(tf.align)}>{String(item[tf.key || ''] ?? '')}</td>
                            ))
                          : (
                            <>
                              <td style={tdStyle()}>{item.name || item.productName || ''}</td>
                              <td style={tdStyle()}>{item.spec || item.specification || ''}</td>
                              <td style={tdStyle('right')}>{item.qty || item.quantity || ''}</td>
                              <td style={tdStyle('right')}>{item.price || item.unitPrice || ''}</td>
                              <td style={tdStyle('right')}>{item.amount || (item.qty && item.price ? item.qty * item.price : '')}</td>
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
              <div key={idx}
                className={`pt-4 ${field.align === 'center' ? 'text-center' : field.align === 'right' ? 'text-right' : ''}`}
                style={{ fontSize: `${field.fontSize || PRINT_FONT_SIZES.small}px`, color: PRINT_COLORS.muted }}>
                {field.content}
              </div>
            )
          case 'spacer':
            return <div key={idx} style={{ height: 12 }} />
          case 'qrcode':
            return (
              <div key={idx} className={`flex mb-2 ${field.align === 'center' ? 'justify-center' : field.align === 'right' ? 'justify-end' : 'justify-start'}`}>
                <div className="w-24 h-24 bg-gray-100 border border-gray-200 rounded flex items-center justify-center"
                  style={{ fontSize: `${PRINT_FONT_SIZES.label}px`, color: PRINT_COLORS.muted }}>
                  {val ? String(val).slice(0, 12) : 'QR CODE'}
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

/** 生成打印 HTML：字体 / 字号 / 颜色全部走 printDesignTokens，与 React 预览同口径 */
function generatePrintHTML(template: PrintTemplate, data: Record<string, any>): string {
  const { width, height, orientation } = template
  const w = orientation === 'portrait' ? width : height
  const h = orientation === 'portrait' ? height : width

  const fieldsHTML = template.fields.map(field => {
    const val = field.key ? (data[field.key] ?? '') : ''
    switch (field.type) {
      case 'header': {
        const text = field.key && val !== '' && val != null ? String(val) : (field.content || '')
        return `<div style="text-align:${field.align || 'left'};font-size:${field.fontSize || PRINT_FONT_SIZES.body}px;font-weight:${field.bold ? 'bold' : 'normal'};margin-bottom:8px;line-height:1.4;">${text}</div>`
      }
      case 'field': {
        const { label, colon } = fieldLabel(field, data)
        const labelHTML = field.hideLabel ? '' : `<span style="color:${PRINT_COLORS.secondary};font-size:${PRINT_FONT_SIZES.label}px;">${label}${colon}</span>`
        return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:${PRINT_FONT_SIZES.body}px;line-height:1.4;${field.align === 'center' ? 'justify-content:center;' : field.align === 'right' ? 'justify-content:flex-end;' : ''}">${labelHTML}<span style="font-weight:500;">${String(val)}</span></div>`
      }
      case 'image':
        return `<div style="margin-bottom:8px;"><img src="${field.src || ''}" alt="HOLANG" style="height:${field.height || 28}px;width:auto;display:block;" /></div>`
      case 'twoColumn': {
        const cell = (f: PrintField) => {
          const v = f.key ? (data[f.key] ?? '') : ''
          const { label, colon } = fieldLabel(f, data)
          const l = f.hideLabel ? '' : `<span style="color:${PRINT_COLORS.secondary};font-size:${PRINT_FONT_SIZES.label}px;white-space:nowrap;">${label}${colon}</span>`
          return `<div style="display:flex;gap:6px;font-size:${PRINT_FONT_SIZES.body}px;margin-bottom:3px;line-height:1.4;">${l}<span style="font-weight:500;">${String(v)}</span></div>`
        }
        return `<div style="display:flex;gap:24px;align-items:flex-start;margin-bottom:10px;"><div style="flex:1;min-width:0;">${(field.left || []).map(cell).join('')}</div><div style="min-width:180px;">${(field.right || []).map(cell).join('')}</div></div>`
      }
      case 'table': {
        const items = field.key && Array.isArray(data[field.key]) ? data[field.key] : []
        const hasTableFields = Array.isArray(field.tableFields) && field.tableFields.length > 0
        const cols = field.columns || []
        const border = tableBorder(field)
        const showNo = field.showRowNumber !== false
        const th = cols.map(c => `<th style="border:1px solid ${border};padding:5px 8px;font-size:${PRINT_FONT_SIZES.table}px;background:${field.bordered ? PRINT_COLORS.surface : PRINT_COLORS.bg};font-weight:${field.bordered ? 700 : 600};text-align:${c.align || 'left'};">${c.content}</th>`).join('')
        const tbody = items.length === 0
          ? `<tr>${cols.map(() => `<td style="border:1px solid ${border};padding:5px 8px;font-size:${PRINT_FONT_SIZES.table}px;">&nbsp;</td>`).join('')}</tr>`
          : items.map((item: any, i: number) => {
              const dataCells = hasTableFields
                ? field.tableFields!.map(tf => `<td style="border:1px solid ${border};padding:5px 8px;font-size:${PRINT_FONT_SIZES.table}px;text-align:${tf.align === 'right' ? 'right' : tf.align === 'center' ? 'center' : 'left'};">${String(item[tf.key || ''] ?? '')}</td>`).join('')
                : `<td style="border:1px solid ${border};padding:5px 8px;font-size:${PRINT_FONT_SIZES.table}px;">${item.name || item.productName || ''}</td><td style="border:1px solid ${border};padding:5px 8px;font-size:${PRINT_FONT_SIZES.table}px;">${item.spec || item.specification || ''}</td><td style="border:1px solid ${border};padding:5px 8px;font-size:${PRINT_FONT_SIZES.table}px;text-align:right;">${item.qty || item.quantity || ''}</td><td style="border:1px solid ${border};padding:5px 8px;font-size:${PRINT_FONT_SIZES.table}px;text-align:right;">${item.price || item.unitPrice || ''}</td><td style="border:1px solid ${border};padding:5px 8px;font-size:${PRINT_FONT_SIZES.table}px;text-align:right;">${item.amount || (item.qty && item.price ? item.qty * item.price : '')}</td>`
              const no = showNo ? `<td style="border:1px solid ${border};padding:5px 8px;font-size:${PRINT_FONT_SIZES.table}px;text-align:center;">${i + 1}</td>` : ''
              return `<tr>${no}${dataCells}</tr>`
            }).join('')
        return `<div style="margin-bottom:12px;"><div style="font-size:${PRINT_FONT_SIZES.label}px;color:${PRINT_COLORS.secondary};margin-bottom:4px;">${field.label}</div><table style="width:100%;border-collapse:collapse;"><thead><tr>${th}</tr></thead><tbody>${tbody}</tbody></table></div>`
      }
      case 'footer':
        return `<div style="padding-top:16px;font-size:${field.fontSize || PRINT_FONT_SIZES.small}px;color:${PRINT_COLORS.muted};text-align:${field.align || 'left'};">${field.content}</div>`
      case 'spacer':
        return `<div style="height:12px;"></div>`
      case 'qrcode':
        return `<div style="display:flex;justify-content:${field.align === 'center' ? 'center' : field.align === 'right' ? 'flex-end' : 'flex-start'};margin-bottom:8px;"><div style="width:96px;height:96px;background:${PRINT_COLORS.bg};border:1px solid ${PRINT_COLORS.border};border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:${PRINT_FONT_SIZES.label}px;color:${PRINT_COLORS.muted};">${val ? String(val).slice(0, 12) : 'QR CODE'}</div></div>`
      default:
        return ''
    }
  }).join('')

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>打印</title>
<style>
@page { size: ${w}mm ${h}mm; margin: 10mm; }
body { margin: 0; padding: 0; font-family: ${PRINT_FONT_FAMILY}; color: ${PRINT_COLORS.text}; }
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
