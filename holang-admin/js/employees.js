/**
 * HOLANG 内部管理系统 — 员工管理
 */

// 注册路由
Router.register('employees', () => {
  UI.setBreadcrumb('员工管理');
  Employees.renderList();
});

Router.register('employee-form', (params) => {
  UI.setBreadcrumb(params.mode === 'new' ? '新增员工' : '编辑员工');
  Employees.renderForm(params);
});

const Employees = {
  // 列表状态
  listState: {
    search: '',
    department: '',
    status: '',
    page: 1,
    pageSize: 8,
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
        <h2>员工管理</h2>
        <div class="page-header-actions">
          <button class="btn btn-primary" onclick="Employees.goCreate()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            新增员工
          </button>
        </div>
      </div>

      <div class="card">
        <!-- 搜索栏 -->
        <div class="search-bar">
          <input type="text" class="search-input" placeholder="搜索姓名、手机号、邮箱..."
                 value="${this.escapeAttr(this.listState.search)}"
                 oninput="Employees.onSearch(this.value)" id="employee-search">
          <select class="filter-select" onchange="Employees.onDeptFilter(this.value)" id="employee-dept-filter">
            <option value="">全部部门</option>
            ${departments.map(d => `<option value="${d}" ${this.listState.department === d ? 'selected' : ''}>${d}</option>`).join('')}
          </select>
          <select class="filter-select" onchange="Employees.onStatusFilter(this.value)" id="employee-status-filter">
            <option value="">全部状态</option>
            <option value="在职" ${this.listState.status === '在职' ? 'selected' : ''}>在职</option>
            <option value="离职" ${this.listState.status === '离职' ? 'selected' : ''}>离职</option>
          </select>
        </div>

        <!-- 表格 -->
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>姓名</th>
                <th>部门</th>
                <th>职位</th>
                <th>手机号</th>
                <th>邮箱</th>
                <th>入职日期</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              ${pageData.length > 0 ? pageData.map(e => this.renderRow(e)).join('') : `
                <tr><td colspan="8"><div class="empty-state">
                  <p>暂无员工数据</p>
                  <button class="btn btn-primary mt-2" onclick="Employees.goCreate()">新增第一位员工</button>
                </div></td></tr>
              `}
            </tbody>
          </table>
        </div>

        <!-- 分页 -->
        ${total > this.listState.pageSize ? this.renderPagination(total, totalPages) : ''}
      </div>
    `);
  },

  renderRow(e) {
    const statusClass = e.status === '在职' ? 'badge-success' : 'badge-default';
    return `
      <tr>
        <td><strong>${this.escapeHtml(e.name)}</strong></td>
        <td>${this.escapeHtml(e.department)}</td>
        <td>${this.escapeHtml(e.position)}</td>
        <td>${this.escapeHtml(e.phone)}</td>
        <td>${this.escapeHtml(e.email)}</td>
        <td>${e.joinDate}</td>
        <td><span class="badge ${statusClass}">${e.status}</span></td>
        <td class="actions-cell">
          <button class="btn btn-sm btn-outline" onclick="Employees.goEdit(${e.id})">编辑</button>
          <button class="btn btn-sm btn-danger" onclick="Employees.delete(${e.id})">删除</button>
        </td>
      </tr>
    `;
  },

  renderPagination(total, totalPages) {
    const current = this.listState.page;
    let btns = '';

    btns += `<button ${current === 1 ? 'disabled' : ''} onclick="Employees.goPage(${current - 1})">上一页</button>`;

    for (let i = 1; i <= totalPages; i++) {
      if (totalPages <= 7 || i === 1 || i === totalPages || Math.abs(i - current) <= 1) {
        btns += `<button class="${i === current ? 'active' : ''}" onclick="Employees.goPage(${i})">${i}</button>`;
      } else if (i === 2 && current > 4) {
        btns += '<button disabled>...</button>';
      } else if (i === totalPages - 1 && current < totalPages - 3) {
        btns += '<button disabled>...</button>';
      }
    }

    btns += `<button ${current === totalPages ? 'disabled' : ''} onclick="Employees.goPage(${current + 1})">下一页</button>`;
    btns += `<span style="margin-left:12px;color:var(--color-text-muted);font-size:0.85rem">共 ${total} 条</span>`;

    return `<div class="pagination">${btns}</div>`;
  },

  // ==================== 搜索与筛选 ====================
  onSearch(value) {
    this.listState.search = value.trim();
    this.listState.page = 1;
    this.renderList();
  },

  onDeptFilter(value) {
    this.listState.department = value;
    this.listState.page = 1;
    this.renderList();
  },

  onStatusFilter(value) {
    this.listState.status = value;
    this.listState.page = 1;
    this.renderList();
  },

  goPage(page) {
    this.listState.page = page;
    this.renderList();
    document.getElementById('page-content').scrollIntoView({ behavior: 'smooth' });
  },

  getFilteredData() {
    const all = Store.get('employees', []);
    return all.filter(e => {
      if (this.listState.search) {
        const s = this.listState.search.toLowerCase();
        if (!e.name.includes(s) && !e.phone.includes(s) && !e.email.toLowerCase().includes(s)) {
          return false;
        }
      }
      if (this.listState.department && e.department !== this.listState.department) return false;
      if (this.listState.status && e.status !== this.listState.status) return false;
      return true;
    });
  },

  getDepartments() {
    const all = Store.get('employees', []);
    return [...new Set(all.map(e => e.department))].sort();
  },

  // ==================== 导航 ====================
  goCreate() {
    location.hash = '#/employees/new';
  },

  goEdit(id) {
    location.hash = '#/employees/edit/' + id;
  },

  // ==================== 删除 ====================
  async delete(id) {
    const employees = Store.get('employees', []);
    const emp = employees.find(e => e.id === id);
    if (!emp) return;

    const confirmed = await Confirm.show('删除员工', `确定要删除员工「${emp.name}」吗？此操作不可撤销。`);
    if (!confirmed) return;

    const updated = employees.filter(e => e.id !== id);
    Store.set('employees', updated);
    Toast.success(`已删除员工「${emp.name}」`);
    this.renderList();
  },

  // ==================== 表单页面 ====================
  renderForm(params) {
    const isEdit = params.mode === 'edit';
    const employees = Store.get('employees', []);
    const emp = isEdit ? employees.find(e => e.id === params.id) : null;

    if (isEdit && !emp) {
      Toast.error('员工不存在');
      location.hash = '#/employees';
      return;
    }

    const data = emp || {
      id: 0, name: '', department: '技术部', position: '',
      phone: '', email: '', status: '在职', joinDate: ''
    };

    UI.render(`
      <div class="page-header">
        <h2>${isEdit ? '编辑员工' : '新增员工'}</h2>
        <button class="btn btn-outline" onclick="location.hash='#/employees'">返回列表</button>
      </div>

      <div class="card">
        <form id="employee-form" onsubmit="return false">
          <input type="hidden" id="emp-id" value="${data.id}">

          <div class="form-row">
            <div class="form-group">
              <label for="emp-name">姓名 <span class="text-danger">*</span></label>
              <input type="text" id="emp-name" class="form-control" value="${this.escapeAttr(data.name)}" placeholder="请输入姓名" required>
              <div class="form-error hidden" id="err-name"></div>
            </div>
            <div class="form-group">
              <label for="emp-department">部门 <span class="text-danger">*</span></label>
              <select id="emp-department" class="form-control" required>
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
              <label for="emp-position">职位 <span class="text-danger">*</span></label>
              <input type="text" id="emp-position" class="form-control" value="${this.escapeAttr(data.position)}" placeholder="请输入职位" required>
              <div class="form-error hidden" id="err-position"></div>
            </div>
            <div class="form-group">
              <label for="emp-phone">手机号 <span class="text-danger">*</span></label>
              <input type="tel" id="emp-phone" class="form-control" value="${this.escapeAttr(data.phone)}" placeholder="请输入手机号" required>
              <div class="form-error hidden" id="err-phone"></div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="emp-email">邮箱</label>
              <input type="email" id="emp-email" class="form-control" value="${this.escapeAttr(data.email)}" placeholder="请输入邮箱">
            </div>
            <div class="form-group">
              <label for="emp-status">状态</label>
              <select id="emp-status" class="form-control">
                <option value="在职" ${data.status === '在职' ? 'selected' : ''}>在职</option>
                <option value="离职" ${data.status === '离职' ? 'selected' : ''}>离职</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="emp-join-date">入职日期</label>
              <input type="date" id="emp-join-date" class="form-control" value="${data.joinDate}">
            </div>
            <div class="form-group"></div>
          </div>

          <div style="display:flex;gap:12px;justify-content:flex-end;padding-top:16px;border-top:1px solid var(--color-border);margin-top:8px;">
            <button type="button" class="btn btn-outline" onclick="location.hash='#/employees'">取消</button>
            <button type="submit" class="btn btn-primary" onclick="Employees.save(${isEdit})">保存</button>
          </div>
        </form>
      </div>
    `);
  },

  // ==================== 保存 ====================
  save(isEdit) {
    // 清除错误状态
    document.querySelectorAll('.form-error').forEach(el => { el.textContent = ''; el.classList.add('hidden'); });
    document.querySelectorAll('.form-control.error').forEach(el => el.classList.remove('error'));

    // 获取值
    const id = parseInt(document.getElementById('emp-id').value) || 0;
    const name = document.getElementById('emp-name').value.trim();
    const department = document.getElementById('emp-department').value;
    const position = document.getElementById('emp-position').value.trim();
    const phone = document.getElementById('emp-phone').value.trim();
    const email = document.getElementById('emp-email').value.trim();
    const status = document.getElementById('emp-status').value;
    const joinDate = document.getElementById('emp-join-date').value;

    // 验证
    let valid = true;
    if (!name) { this.showError('err-name', '请输入姓名'); valid = false; }
    if (!department) { this.showError('err-department', '请选择部门'); valid = false; }
    if (!position) { this.showError('err-position', '请输入职位'); valid = false; }
    if (!phone) {
      this.showError('err-phone', '请输入手机号'); valid = false;
    } else if (!/^1[3-9]\d{9}$/.test(phone)) {
      this.showError('err-phone', '手机号格式不正确'); valid = false;
    }

    if (!valid) return;

    const employees = Store.get('employees', []);

    // 手机号唯一性检查
    const dupPhone = employees.find(e => e.phone === phone && e.id !== id);
    if (dupPhone) {
      this.showError('err-phone', '该手机号已被使用');
      return;
    }

    if (isEdit) {
      const idx = employees.findIndex(e => e.id === id);
      if (idx === -1) { Toast.error('员工不存在'); return; }
      employees[idx] = { ...employees[idx], name, department, position, phone, email, status, joinDate };
      Toast.success('员工信息已更新');
    } else {
      const newId = employees.length > 0 ? Math.max(...employees.map(e => e.id)) + 1 : 1;
      employees.push({ id: newId, name, department, position, phone, email, status, joinDate });
      Toast.success('员工添加成功');
    }

    Store.set('employees', employees);
    location.hash = '#/employees';
  },

  showError(id, msg) {
    const el = document.getElementById(id);
    if (el) { el.textContent = msg; el.classList.remove('hidden'); }
    // 高亮对应输入框
    const inputId = id.replace('err-', '');
    const input = document.getElementById(inputId);
    if (input) input.classList.add('error');
  },

  // ==================== 工具 ====================
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
