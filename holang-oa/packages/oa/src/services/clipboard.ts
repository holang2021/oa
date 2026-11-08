// ============================================================
// 剪贴板工具（2026-11-08 刘总：账号信息要能一键复制给销售发客户）
// 只做一件事：把文本复制进剪贴板，成功返回 true。
// 优先浏览器标准 API；本地预览 / 非安全上下文下降级到 execCommand，避免按钮点了没反应。
// ============================================================

export async function copyText(text: string): Promise<boolean> {
  if (!text) return false
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // 权限被拒或非安全上下文，走降级
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.top = '0'
    ta.style.left = '0'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}
