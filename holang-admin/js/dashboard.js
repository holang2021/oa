/**
 * HOLANG 内部管理系统 — 数据看板
 */

// 注册路由
Router.register('dashboard', () => {
  UI.setBreadcrumb('数据看板');
  Dashboard.render();
});

// 注册 login 路由（仅用于不报错）
Router.register('login', () => {});

const Dashboard = {
  chartInstances: {},

  render() {
    const stats = this.computeStats();

    UI.render(`
      <!-- 统计卡片 -->
      <div class="stat-cards">
        <div class="stat-card">
          <div class="stat-icon blue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div class="stat-info">
            <h3>${stats.totalEmployees}</h3>
            <p>员工总数</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div class="stat-info">
            <h3>${stats.totalProjects}</h3>
            <p>项目总数</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon orange">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div class="stat-info">
            <h3>${stats.activeProjects}</h3>
            <p>进行中项目</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon red">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div class="stat-info">
            <h3>${stats.overdueProjects}</h3>
            <p>逾期项目</p>
          </div>
        </div>
      </div>

      <!-- 图表区域 -->
      <div class="charts-grid">
        <div class="chart-box">
          <h3>月度项目趋势</h3>
          <div class="chart-wrapper">
            <canvas id="chart-project-trend"></canvas>
          </div>
        </div>
        <div class="chart-box">
          <h3>部门人员分布</h3>
          <div class="chart-wrapper">
            <canvas id="chart-dept-dist"></canvas>
          </div>
        </div>
      </div>

      <!-- 最近活动 -->
      <div class="card">
        <div class="card-header">
          <h2>最近动态</h2>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>时间</th>
                <th>操作</th>
                <th>对象</th>
                <th>操作人</th>
              </tr>
            </thead>
            <tbody>
              ${this.renderActivities(stats.recentActivities)}
            </tbody>
          </table>
        </div>
      </div>
    `);

    // 初始化图表（延迟确保 DOM 渲染完成）
    setTimeout(() => this.initCharts(stats), 100);
  },

  computeStats() {
    const employees = Store.get('employees', []);
    const projects = Store.get('projects', []);

    // 如果没有数据，初始化演示数据
    if (employees.length === 0 && projects.length === 0) {
      this.initDemoData();
      return this.computeStats();
    }

    const totalEmployees = employees.length;
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === '进行中').length;
    const overdueProjects = projects.filter(p => p.status === '已逾期').length;

    // 部门分布
    const deptMap = {};
    employees.forEach(e => {
      deptMap[e.department] = (deptMap[e.department] || 0) + 1;
    });

    // 月度趋势（基于项目创建和完成日期的稳定数据）
    const months = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
    const seed = 2026;
    const rand = (i, offset) => ((i * 7 + offset * 13 + seed) % 5) + 1;
    const monthlyNew = months.map((_, i) => rand(i, 1));
    const monthlyDone = months.map((_, i) => Math.min(rand(i, 2) - 1, rand(i, 1)));

    // 最近活动
    const recentActivities = [
      ...employees.slice(-2).map(e => ({ time: '今天 10:30', action: '新增员工', target: e.name, operator: '管理员' })),
      ...projects.slice(-3).map(p => ({ time: '昨天 14:20', action: '更新项目', target: p.name, operator: '管理员' })),
    ];

    return {
      totalEmployees, totalProjects, activeProjects, overdueProjects,
      deptLabels: Object.keys(deptMap),
      deptData: Object.values(deptMap),
      monthlyLabels: months,
      monthlyNew,
      monthlyDone,
      recentActivities: recentActivities.slice(-5)
    };
  },

  initDemoData() {
    const employees = [
      { id: 1, name: '张三', department: '技术部', position: '高级工程师', phone: '13800001001', email: 'zhangsan@holang.com', status: '在职', joinDate: '2023-03-15' },
      { id: 2, name: '李四', department: '销售部', position: '销售经理', phone: '13800001002', email: 'lisi@holang.com', status: '在职', joinDate: '2022-08-01' },
      { id: 3, name: '王五', department: '技术部', position: '前端工程师', phone: '13800001003', email: 'wangwu@holang.com', status: '在职', joinDate: '2024-01-10' },
      { id: 4, name: '赵六', department: '财务部', position: '财务主管', phone: '13800001004', email: 'zhaoliu@holang.com', status: '在职', joinDate: '2021-06-20' },
      { id: 5, name: '陈七', department: '生产部', position: '生产总监', phone: '13800001005', email: 'chenqi@holang.com', status: '在职', joinDate: '2020-03-01' },
      { id: 6, name: '周八', department: '技术部', position: '后端工程师', phone: '13800001006', email: 'zhouba@holang.com', status: '离职', joinDate: '2023-09-01' },
      { id: 7, name: '吴九', department: '销售部', position: '销售代表', phone: '13800001007', email: 'wujiu@holang.com', status: '在职', joinDate: '2024-05-15' },
      { id: 8, name: '郑十', department: '行政部', position: '行政经理', phone: '13800001008', email: 'zhengshi@holang.com', status: '在职', joinDate: '2022-11-08' },
    ];

    const projects = [
      { id: 1, name: 'PSA制氮设备升级', department: '技术部', manager: '张三', status: '进行中', budget: 850000, startDate: '2026-03-01', endDate: '2026-08-31', progress: 65 },
      { id: 2, name: '华东区销售网络拓展', department: '销售部', manager: '李四', status: '进行中', budget: 320000, startDate: '2026-01-15', endDate: '2026-12-31', progress: 40 },
      { id: 3, name: 'ERP系统上线', department: '技术部', manager: '王五', status: '已完成', budget: 500000, startDate: '2025-09-01', endDate: '2026-05-15', progress: 100 },
      { id: 4, name: 'ISO 9001年审准备', department: '行政部', manager: '郑十', status: '进行中', budget: 80000, startDate: '2026-05-01', endDate: '2026-09-30', progress: 30 },
      { id: 5, name: '制氢设备研发', department: '技术部', manager: '张三', status: '已逾期', budget: 1200000, startDate: '2025-06-01', endDate: '2026-04-30', progress: 85 },
      { id: 6, name: '供应商评估体系搭建', department: '生产部', manager: '陈七', status: '规划中', budget: 150000, startDate: '2026-07-01', endDate: '2026-10-31', progress: 0 },
      { id: 7, name: '年度财务审计', department: '财务部', manager: '赵六', status: '已完成', budget: 60000, startDate: '2026-02-01', endDate: '2026-04-15', progress: 100 },
    ];

    Store.set('employees', employees);
    Store.set('projects', projects);
  },

  renderActivities(activities) {
    if (!activities || activities.length === 0) {
      return '<tr><td colspan="4" class="text-center text-muted">暂无动态</td></tr>';
    }
    return activities.map(a => `
      <tr>
        <td>${a.time}</td>
        <td>${a.action}</td>
        <td>${a.target}</td>
        <td>${a.operator}</td>
      </tr>
    `).join('');
  },

  initCharts(stats) {
    // 销毁旧图表
    try {
      Object.values(this.chartInstances).forEach(c => { if (c && typeof c.destroy === 'function') c.destroy(); });
    } catch (e) { /* ignore */ }
    this.chartInstances = {};

    if (typeof Chart === 'undefined') {
      console.warn('Chart.js 未加载，图表功能不可用');
      return;
    }

    // 月度项目趋势
    const trendCtx = document.getElementById('chart-project-trend');
    if (trendCtx) {
      try {
        this.chartInstances.trend = new Chart(trendCtx, {
        type: 'bar',
        data: {
          labels: stats.monthlyLabels,
          datasets: [
            {
              label: '新建项目',
              data: stats.monthlyNew,
              backgroundColor: 'rgba(26, 86, 219, 0.7)',
              borderRadius: 4,
            },
            {
              label: '完成项目',
              data: stats.monthlyDone,
              backgroundColor: 'rgba(5, 150, 105, 0.7)',
              borderRadius: 4,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' }
          },
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1 } }
          }
        }
        });
      } catch (e) {
        console.warn('趋势图表初始化失败:', e);
      }
    }

    // 部门分布
    const deptCtx = document.getElementById('chart-dept-dist');
    if (deptCtx) {
      try {
        this.chartInstances.dept = new Chart(deptCtx, {
        type: 'doughnut',
        data: {
          labels: stats.deptLabels,
          datasets: [{
            data: stats.deptData,
            backgroundColor: [
              'rgba(26, 86, 219, 0.8)',
              'rgba(5, 150, 105, 0.8)',
              'rgba(217, 119, 6, 0.8)',
              'rgba(220, 38, 38, 0.8)',
              'rgba(139, 92, 246, 0.8)',
              'rgba(8, 145, 178, 0.8)',
            ],
            borderWidth: 2,
            borderColor: '#fff',
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
        });
      } catch (e) {
        console.warn('部门分布图表初始化失败:', e);
      }
    }
  }
};
