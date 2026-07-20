/**
 * HOLANG 内部管理系统 — 项目管理
 */

Router.register('projects', () => {
  UI.setBreadcrumb('项目管理');
  Projects.renderList();
});

Router.register('project-form', (params) => {
  UI.setBreadcrumb(params.mode === 'new' ? '新增项目' : '编辑项目');
  Projects.renderForm(params);
});

const Projects = {
  listState: {
    search: '',
    status: '',
    department: '',
    page: 1,
    pageSize: 8,
  },

  STATUS_OPTIONS: ['规划中', '进行中', '已完成', '已逾期', '已暂停'],
  STATUS_CLASS: {
    '规划中': 'badge-info',
    '进行中': 'badge-success',
    '已完成': 'badge-default',
    '已逾期': 'badge-danger',
    '已暂停': 'badge-warning',
  },

  // ==================== 列表渲染 ====================
  renderList() {
    const data = this.getFilteredData();
    const total = data.length;
    const totalPages = Math.ceil(total / this.listState.pageSize);
    const start = (this.listState.page - 1) * this.listState.pageSize;
    const pageData = data.slice(start, start + this.listState.pageSize);

    const departments = this.getDepartments();

    UI.render(`
      <div class="page-header">
        <h2>项目管理</h2>
        <div class="page-header-actions">
          <button class="btn btn-primary" onclick="Projects.goCreate()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            新增项目
          </button>
        </div>
      </div>

      <div class="card">
        <div class="search-bar">
          <input type="text" class="search-input" placeholder="搜索项目名称、负责人..."
                 value="${this.escapeAttr(this.listState.search)}"
                 oninput="Projects.onSearch(this.value)" id="project-search">
          <select class="filter-select" onchange="Projects.onStatusFilter(this.value)" id="project-status-filter">
            <option value="">全部状态</option>
            ${this.STATUS_OPTIONS.map(s => `<option value="${s}" ${this.listState.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
          <select class="filter-select" onchange="Projects.onDeptFilter(this.value)" id="project-dept-filter">
            <option value="">全部部门</option>
            ${departments.map(d => `<option value="${d}" ${this.listState.department === d ? 'selected' : ''}>${d}</option>`).join('')}
          </select>
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>项目名称</th>
                <th>所属部门</th>
                <th>负责人</th>
                <th>预算(¥)</th>
                <th>起止日期</th>
                <th>进度</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              ${pageData.length > 0 ? pageData.map(p => this.renderRow(p)).join('') : `
                <tr><td colspan="8"><div class="empty-state">
                  <p>暂无项目数据</p>
                  <button class="btn btn-primary mt-2" onclick="Projects.goCreate()">创建第一个项目</button>
                </div></td></tr>
              `}
            </tbody>
          </table>
        </div>

        ${total > this.listState.pageSize ? this.renderPagination(total, totalPages) : ''}
      </div>
    `);
  },

  renderRow(p) {
    const statusClass = this.STATUS_CLASS[p.status] || 'badge-default';
    const progressColor = p.status === '已逾期' ? 'var(--color-danger)' :
                           p.progress >= 80 ? 'var(--color-success)' :
                           p.progress >= 40 ? 'var(--color-warning)' : 'var(--color-info)';
    return `
      <tr>
        <td><strong>${this.escapeHtml(p.name)}</strong></td>
        <td>${this.escapeHtml(p.department)}</td>
        <td>${this.escapeHtml(p.manager)}</td>
        <td>¥${(p.budget || 0).toLocaleString()}</td>
        <td style="font-size:0.82rem;white-space:nowrap">${p.startDate} ~ ${p.endDate}</td>
        <td style="min-width:120px">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="flex:1;height:6px;background:var(--color-border);border-radius:3px;overflow:hidden">
              <div style="height:100%;width:${p.progress || 0}%;background:${progressColor};border-radius:3px;transition:width 0.3s"></div>
            </div>
            <span style="font-size:0.82rem;font-weight:600;color:${progressColor}">${p.progress || 0}%</span>
          </div>
        </td>
        <td><span class="badge ${statusClass}">${p.status}</span></td>
        <td class="actions-cell">
          <button class="btn btn-sm btn-outline" onclick="Projects.goEdit(${p.id})">编辑</button>
          <button class="btn btn-sm btn-danger" onclick="Projects.delete(${p.id})">删除</button>
        </td>
      </tr>
    `;
  },

  renderPagination(total, totalPages) {
    const current = this.listState.page;
    let btns = '';
    btns += `<button ${current === 1 ? 'disabled' : ''} onclick="Projects.goPage(${current - 1})">上一页</button>`;
    for (let i = 1; i <= totalPages; i++) {
      if (totalPages <= 7 || i === 1 || i === totalPages || Math.abs(i - current) <= 1) {
        btns += `<button class="${i === current ? 'active' : ''}" onclick="Projects.goPage(${i})">${i}</button>`;
      } else if (i === 2 && current > 4) {
        btns += '<button disabled>...</button>';
      } else if (i === totalPages - 1 && current < totalPages - 3) {
        btns += '<button disabled>...</button>';
      }
    }
    btns += `<button ${current === totalPages ? 'disabled' : ''} onclick="Projects.goPage(${current + 1})">下一页</button>`;
    btns += `<span style="margin-left:12px;color:var(--color-text-muted);font-size:0.85rem">共 ${total} 条</span>`;
    return `<div class="pagination">${btns}</div>`;
  },

  // ==================== 搜索与筛选 ====================
  onSearch(value) { this.listState.search = value.trim(); this.listState.page = 1; this.renderList(); },
  onStatusFilter(value) { this.listState.status = value; this.listState.page = 1; this.renderList(); },
  onDeptFilter(value) { this.listState.department = value; this.listState.page = 1; this.renderList(); },
  goPage(page) { this.listState.page = page; this.renderList(); document.getElementById('page-content').scrollIntoView({ behavior: 'smooth' }); },

  getFilteredData() {
    const all = Store.get('projects', []);
    return all.filter(p => {
      if (this.listState.search) {
        const s = this.listState.search.toLowerCase();
        if (!p.name.toLowerCase().includes(s) && !p.manager.toLowerCase().includes(s)) return false;
      }
      if (this.listState.status && p.status !== this.listState.status) return false;
      if (this.listState.department && p.department !== this.listState.department) return false;
      return true;
    });
  },

  getDepartments() {
    const all = Store.get('projects', []);
    return [...new Set(all.map(p => p.department))].sort();
  },

  // ==================== 导航 ====================
  goCreate() { location.hash = '#/projects/new'; },
  goEdit(id) { location.hash = '#/projects/edit/' + id; },

  // ==================== 删除 ====================
  async delete(id) {
    const projects = Store.get('projects', []);
    const proj = projects.find(p => p.id === id);
    if (!proj) return;

    const confirmed = await Confirm.show('删除项目', `确定要删除项目「${proj.name}」吗？此操作不可撤销。`);
    if (!confirmed) return;

    const updated = projects.filter(p => p.id !== id);
    Store.set('projects', updated);
    Toast.success(`已删除项目「${proj.name}」`);
    this.renderList();
  },

  // ==================== 表单页面 ====================
  renderForm(params) {
    const isEdit = params.mode === 'edit';
    const projects = Store.get('projects', []);
    const proj = isEdit ? projects.find(p => p.id === params.id) : null;

    if (isEdit && !proj) {
      Toast.error('项目不存在');
      location.hash = '#/projects';
      return;
    }

    const data = proj || {
      id: 0, name: '', department: '技术部', manager: '', status: '规划中',
      budget: '', startDate: '', endDate: '', progress: 0, description: ''
    };

    UI.render(`
      <div class="page-header">
        <h2>${isEdit ? '编辑项目' : '新增项目'}</h2>
        <button class="btn btn-outline" onclick="location.hash='#/projects'">返回列表</button>
      </div>

      <div class="card">
        <form id="project-form" onsubmit="return false">
          <input type="hidden" id="proj-id" value="${data.id}">

          <div class="form-row">
            <div class="form-group">
              <label for="proj-name">项目名称 <span class="text-danger">*</span></label>
              <input type="text" id="proj-name" class="form-control" value="${this.escapeAttr(data.name)}" placeholder="请输入项目名称" required>
              <div class="form-error hidden" id="err-name"></div>
            </div>
            <div class="form-group">
              <label for="proj-department">所属部门 <span class="text-danger">*</span></label>
              <select id="proj-department" class="form-control" required>
                <option value="">请选择部门</option>
                <option value="技术部" ${data.department === '技术部' ? 'selected' : ''}>技术部</option>
                <option value="销售部" ${data.department === '销售部' ? 'selected' : ''}>销售部</option>
                <option value="财务部" ${data.department === '财务部' ? 'selected' : ''}>财务部</option>
                <option value="生产部" ${data.department === '生产部' ? 'selected' : ''}>生产部</option>
                <option value="行政部" ${data.department === '行政部' ? 'selected' : ''}>行政部</option>
              </select>
              <div class="form-error hidden" id="err-department"></div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="proj-manager">负责人 <span class="text-danger">*</span></label>
              <input type="text" id="proj-manager" class="form-control" value="${this.escapeAttr(data.manager)}" placeholder="请输入负责人姓名" required>
              <div class="form-error hidden" id="err-manager"></div>
            </div>
            <div class="form-group">
              <label for="proj-status">项目状态</label>
              <select id="proj-status" class="form-control">
                ${this.STATUS_OPTIONS.map(s => `<option value="${s}" ${data.status === s ? 'selected' : ''}>${s}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="proj-budget">预算 (¥)</label>
              <input type="number" id="proj-budget" class="form-control" value="${data.budget || ''}" placeholder="请输入预算金额" min="0" step="1000">
            </div>
            <div class="form-group">
              <label for="proj-progress">完成进度 (%)</label>
              <input type="number" id="proj-progress" class="form-control" value="${data.progress || 0}" min="0" max="100">
              <div class="form-hint">输入 0-100 之间的数字</div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="proj-start">开始日期</label>
              <input type="date" id="proj-start" class="form-control" value="${data.startDate || ''}">
            </div>
            <div class="form-group">
              <label for="proj-end">结束日期</label>
              <input type="date" id="proj-end" class="form-control" value="${data.endDate || ''}">
              <div class="form-error hidden" id="err-end"></div>
            </div>
          </div>

          <div class="form-group">
            <label for="proj-desc">项目描述</label>
            <textarea id="proj-desc" class="form-control" rows="3" placeholder="请输入项目描述">${this.escapeHtml(data.description || '')}</textarea>
          </div>

          <div style="display:flex;gap:12px;justify-content:flex-end;padding-top:16px;border-top:1px solid var(--color-border);margin-top:8px;">
            <button type="button" class="btn btn-outline" onclick="location.hash='#/projects'">取消</button>
            <button type="submit" class="btn btn-primary" onclick="Projects.save(${isEdit})">保存</button>
          </div>
        </form>
      </div>
    `);
  },

  // ==================== 保存 ====================
  save(isEdit) {
    document.querySelectorAll('#project-form .form-error').forEach(el => { el.textContent = ''; el.classList.add('hidden'); });
    document.querySelectorAll('#project-form .form-control.error').forEach(el => el.classList.remove('error'));

    const id = parseInt(document.getElementById('proj-id').value) || 0;
    const name = document.getElementById('proj-name').value.trim();
    const department = document.getElementById('proj-department').value;
    const manager = document.getElementById('proj-manager').value.trim();
    const status = document.getElementById('proj-status').value;
    const budget = parseInt(document.getElementById('proj-budget').value) || 0;
    const progress = Math.min(100, Math.max(0, parseInt(document.getElementById('proj-progress').value) || 0));
    const startDate = document.getElementById('proj-start').value;
    const endDate = document.getElementById('proj-end').value;
    const description = document.getElementById('proj-desc').value.trim();

    // 验证
    let valid = true;
    if (!name) { this.showFormError('err-name', '请输入项目名称'); valid = false; }
    if (!department) { this.showFormError('err-department', '请选择部门'); valid = false; }
    if (!manager) { this.showFormError('err-manager', '请输入负责人'); valid = false; }
    if (startDate && endDate && endDate < startDate) {
      this.showFormError('err-end', '结束日期不能早于开始日期'); valid = false;
    }

    if (!valid) return;

    const projects = Store.get('projects', []);

    if (isEdit) {
      const idx = projects.findIndex(p => p.id === id);
      if (idx === -1) { Toast.error('项目不存在'); return; }
      projects[idx] = { ...projects[idx], name, department, manager, status, budget, progress, startDate, endDate, description };
      Toast.success('项目信息已更新');
    } else {
      const newId = projects.length > 0 ? Math.max(...projects.map(p => p.id)) + 1 : 1;
      projects.push({ id: newId, name, department, manager, status, budget, progress, startDate, endDate, description });
      Toast.success('项目创建成功');
    }

    Store.set('projects', projects);
    location.hash = '#/projects';
  },

  showFormError(id, msg) {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.classList.remove('hidden'); }
    const inputId = id.replace('err-', 'proj-');
    const input = document.getElementById(inputId);
    if (input) input.classList.add('error');
  },

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  escapeAttr(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
};
