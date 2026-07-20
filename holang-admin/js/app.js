/**
 * HOLANG 内部管理系统 — 核心应用逻辑
 * 包含：认证、路由、Toast/Modal/Confirm 公共组件
 */

// ==================== 企微 OAuth 配置 ====================
// ⚠️ CorpID 为公开标识（出现在 OAuth URL 中），非敏感信息
// ⚠️ CorpSecret 绝不在此处出现——代码换 token 必须走后端代理
const WECOM_CONFIG = {
  corpId: 'wwe74343b7a90d201f',
  agentId: '1000078',
  // 回调地址：企微后台「网页授权回调域名」必须包含此域
  // 部署后请将以下地址替换为实际部署的 oauth-callback.html 的完整 URL
  redirectUri: (() => {
    const base = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
    return base + 'oauth-callback.html';
  })(),
  // 后端代理地址：用于 code→token 交换（留空则使用演示模式）
  // 示例：'https://your-api.example.com/api/wecom/auth'
  proxyApi: '',
  scope: 'snsapi_base', // snsapi_base=静默授权(仅获取UserId), snsapi_privateinfo=手动授权(获取详细信息)
};
const App = {
  currentUser: null,
  currentRoute: '',
  isAuthenticated: false,
};

// ==================== 认证模块 ====================
const Auth = {
  // 演示账号
  DEMO_USER: { username: 'admin', password: 'admin123', name: '管理员', role: '系统管理员' },

  init() {
    // 检查是否从企微 OAuth 回调返回
    this.checkWecomCallbackReturn();
    this.checkRemembered();
    this.bindEvents();
    this.initWecomLogin();
  },

  // ==================== 认证状态恢复 ====================
  checkRemembered() {
    // 先检查 localStorage（企微登录或记住密码的用户名密码登录）
    const stored = localStorage.getItem('holang_admin_auth');
    if (stored) {
      try {
        const data = JSON.parse(stored);

        // 企微 OAuth 登录
        if (data.provider === 'wecom') {
          App.currentUser = { name: data.name, userId: data.userId, avatar: data.avatar || '', role: data.role || '员工', provider: 'wecom' };
          App.isAuthenticated = true;
          this.showApp();
          return;
        }

        // 用户名密码登录
        if (data.username === this.DEMO_USER.username) {
          App.currentUser = { ...this.DEMO_USER };
          App.isAuthenticated = true;
          this.showApp();
          return;
        }
      } catch (e) { /* ignore */ }
    }

    // 再检查 sessionStorage
    const sessionAuth = sessionStorage.getItem('holang_admin_auth');
    if (sessionAuth) {
      try {
        const data = JSON.parse(sessionAuth);
        if (data.provider === 'wecom') {
          App.currentUser = { name: data.name, userId: data.userId, avatar: data.avatar || '', role: data.role || '员工', provider: 'wecom' };
          App.isAuthenticated = true;
          this.showApp();
          return;
        }
      } catch (e) { /* ignore */ }
    }

    this.showLogin();
  },

  // ==================== OAuth 回调返回检测 ====================
  checkWecomCallbackReturn() {
    // 如果当前 URL 包含 ?code= 参数，说明刚从企微授权页回调
    // 但这不是回调页本身处理的场景——回调页是 oauth-callback.html
    // 这里处理的是：回调页完成认证后跳回主页，附带 token 参数
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      try {
        const data = JSON.parse(atob(token));
        if (data.provider === 'wecom') {
          // 清理 URL 参数
          if (window.history && window.history.replaceState) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
          // 存储认证信息
          localStorage.setItem('holang_admin_auth', JSON.stringify(data));
          App.currentUser = { name: data.name, userId: data.userId, avatar: data.avatar || '', role: data.role || '员工', provider: 'wecom' };
          App.isAuthenticated = true;
          this.showApp();
          return;
        }
      } catch (e) { /* ignore */ }
    }
  },

  // ==================== 事件绑定 ====================
  bindEvents() {
    document.getElementById('login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.login();
    });
    document.getElementById('logout-btn').addEventListener('click', () => this.logout());
  },

  // ==================== 企微 OAuth 登录 ====================
  initWecomLogin() {
    const btn = document.getElementById('wecom-login-btn');
    if (!btn) return;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      this.wecomLogin();
    });
  },

  wecomLogin() {
    const btn = document.getElementById('wecom-login-btn');
    const hint = document.getElementById('wecom-login-hint');
    const errorEl = document.getElementById('login-error');

    // 校验配置
    if (!WECOM_CONFIG.corpId || WECOM_CONFIG.corpId === 'YOUR_CORP_ID') {
      errorEl.textContent = '企微登录未配置 CorpID';
      errorEl.classList.remove('hidden');
      return;
    }

    btn.disabled = true;
    if (hint) hint.textContent = '正在跳转企业微信授权...';
    errorEl.classList.add('hidden');

    // 生成随机 state 防 CSRF
    const state = 'wecom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem('wecom_oauth_state', state);

    // 保存当前页面 URL，以便回调后跳回
    const returnUrl = window.location.origin + window.location.pathname + '#/dashboard';
    sessionStorage.setItem('wecom_oauth_return', returnUrl);

    // 构造企微 OAuth 授权 URL
    // 文档: https://developer.work.weixin.qq.com/document/path/91022
    const authUrl = 'https://open.weixin.qq.com/connect/oauth2/authorize?' +
      'appid=' + encodeURIComponent(WECOM_CONFIG.corpId) +
      '&redirect_uri=' + encodeURIComponent(WECOM_CONFIG.redirectUri) +
      '&response_type=code' +
      '&scope=' + WECOM_CONFIG.scope +
      '&state=' + state +
      '#wechat_redirect';

    // 跳转到企微授权页
    window.location.href = authUrl;
  },

  // ==================== 用户名密码登录 ====================
  login() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const remember = document.getElementById('login-remember').checked;
    const errorEl = document.getElementById('login-error');

    if (!username || !password) {
      errorEl.textContent = '请输入用户名和密码';
      errorEl.classList.remove('hidden');
      return;
    }

    if (username === this.DEMO_USER.username && password === this.DEMO_USER.password) {
      App.currentUser = { ...this.DEMO_USER };
      App.isAuthenticated = true;

      if (remember) {
        localStorage.setItem('holang_admin_auth', JSON.stringify({ username, provider: 'password' }));
      } else {
        sessionStorage.setItem('holang_admin_auth', JSON.stringify({ username, provider: 'password' }));
      }

      this.showApp();
      Router.navigate('dashboard');
    } else {
      errorEl.textContent = '用户名或密码错误';
      errorEl.classList.remove('hidden');
    }
  },

  // ==================== 退出登录 ====================
  logout() {
    localStorage.removeItem('holang_admin_auth');
    sessionStorage.removeItem('holang_admin_auth');
    sessionStorage.removeItem('wecom_oauth_state');
    App.currentUser = null;
    App.isAuthenticated = false;
    location.hash = '#/login';
    this.showLogin();
  },

  showLogin() {
    document.getElementById('login-page').classList.remove('hidden');
    document.getElementById('app-layout').classList.add('hidden');
    // 恢复企微登录按钮状态
    const btn = document.getElementById('wecom-login-btn');
    const hint = document.getElementById('wecom-login-hint');
    if (btn) btn.disabled = false;
    if (hint) hint.textContent = '使用企业微信扫码授权登录';
    Router.updateNav();
  },

  showApp() {
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('app-layout').classList.remove('hidden');
    document.getElementById('current-user').textContent = App.currentUser.name;
  },

  guard() {
    if (!App.isAuthenticated) {
      location.hash = '#/login';
      return false;
    }
    return true;
  }
};

// ==================== 路由模块 ====================
const Router = {
  routes: {},

  register(name, handler) {
    this.routes[name] = handler;
  },

  navigate(name, params) {
    App.currentRoute = name;
    if (params) {
      App.routeParams = params;
    }
    this.updateNav();
    const handler = this.routes[name];
    if (handler) {
      handler(params);
    }
  },

  updateNav() {
    document.querySelectorAll('.nav-item').forEach(item => {
      const route = item.dataset.route;
      if (route === App.currentRoute) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  },

  init() {
    // 导航点击
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const route = item.dataset.route;
        location.hash = '#/' + route;
      });
    });

    // Hash 变化监听
    window.addEventListener('hashchange', () => this.handleHash());
    // 初始 hash
    this.handleHash();
  },

  handleHash() {
    const hash = location.hash.slice(1) || '/dashboard';

    // 登录页不需要认证
    if (hash === '/login') {
      this.navigate('login');
      return;
    }

    if (!Auth.guard()) return;

    // 路由匹配
    const path = hash.slice(1); // 去掉 /
    const parts = path.split('/');
    const base = parts[0];

    switch (base) {
      case 'dashboard':
        this.navigate('dashboard');
        break;
      case 'employees':
        if (parts[1] === 'new') {
          this.navigate('employee-form', { mode: 'new' });
        } else if (parts[1] === 'edit' && parts[2]) {
          this.navigate('employee-form', { mode: 'edit', id: parseInt(parts[2]) });
        } else {
          this.navigate('employees');
        }
        break;
      case 'projects':
        if (parts[1] === 'new') {
          this.navigate('project-form', { mode: 'new' });
        } else if (parts[1] === 'edit' && parts[2]) {
          this.navigate('project-form', { mode: 'edit', id: parseInt(parts[2]) });
        } else {
          this.navigate('projects');
        }
        break;
      default:
        this.navigate('dashboard');
    }
  }
};

// ==================== Toast 通知 ====================
const Toast = {
  timer: null,

  show(message, type = 'success', duration = 3000) {
    const el = document.getElementById('toast');
    clearTimeout(this.timer);

    el.textContent = message;
    el.className = 'toast ' + type;
    el.classList.remove('hidden', 'fade-out');

    this.timer = setTimeout(() => {
      el.classList.add('fade-out');
      setTimeout(() => el.classList.add('hidden'), 300);
    }, duration);
  },

  success(msg) { this.show(msg, 'success'); },
  error(msg) { this.show(msg, 'error', 4000); },
  warning(msg) { this.show(msg, 'warning'); },
};

// ==================== Modal 弹窗 ====================
const Modal = {
  resolveFn: null,

  open(title, bodyHTML, footerHTML = '') {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHTML;
    document.getElementById('modal-footer').innerHTML = footerHTML || '<button class="btn btn-primary" id="modal-ok">确定</button>';
    document.getElementById('modal-overlay').classList.remove('hidden');

    // 绑定关闭
    document.getElementById('modal-close').onclick = () => this.close();
    document.getElementById('modal-overlay').onclick = (e) => {
      if (e.target === document.getElementById('modal-overlay')) this.close();
    };

    return new Promise((resolve) => {
      this.resolveFn = resolve;
      const okBtn = document.getElementById('modal-ok');
      if (okBtn) {
        okBtn.onclick = () => { this.close(); resolve(true); };
      }
    });
  },

  close() {
    document.getElementById('modal-overlay').classList.add('hidden');
    if (this.resolveFn) {
      this.resolveFn(false);
      this.resolveFn = null;
    }
  },

  form(title, formHTML, onSubmit) {
    const footer = `
      <button class="btn btn-outline" id="modal-cancel">取消</button>
      <button class="btn btn-primary" id="modal-submit">保存</button>
    `;
    this.open(title, formHTML, footer);

    document.getElementById('modal-cancel').onclick = () => this.close();
    document.getElementById('modal-submit').onclick = async () => {
      const result = onSubmit();
      if (result !== false) {
        this.close();
      }
    };
  }
};

// ==================== Confirm 确认对话框 ====================
const Confirm = {
  resolveFn: null,

  show(title, message) {
    document.getElementById('confirm-title').textContent = title || '确认操作';
    document.getElementById('confirm-body').innerHTML = `<p>${message}</p>`;
    document.getElementById('confirm-overlay').classList.remove('hidden');

    document.getElementById('confirm-close').onclick = () => this.dismiss();
    document.getElementById('confirm-cancel').onclick = () => this.dismiss();
    document.getElementById('confirm-overlay').onclick = (e) => {
      if (e.target === document.getElementById('confirm-overlay')) this.dismiss();
    };

    return new Promise((resolve) => {
      this.resolveFn = resolve;
      document.getElementById('confirm-ok').onclick = () => {
        document.getElementById('confirm-overlay').classList.add('hidden');
        resolve(true);
      };
    });
  },

  dismiss() {
    document.getElementById('confirm-overlay').classList.add('hidden');
    if (this.resolveFn) {
      this.resolveFn(false);
      this.resolveFn = null;
    }
  }
};

// ==================== 存储工具（localStorage 封装） ====================
const Store = {
  get(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem('holang_' + key);
      return raw ? JSON.parse(raw) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  },

  set(key, value) {
    localStorage.setItem('holang_' + key, JSON.stringify(value));
  },

  remove(key) {
    localStorage.removeItem('holang_' + key);
  }
};

// ==================== 页面渲染工具 ====================
const UI = {
  render(html) {
    document.getElementById('page-content').innerHTML = html;
  },

  setBreadcrumb(text) {
    document.getElementById('breadcrumb').textContent = text;
  }
};

// ==================== 侧边栏折叠 ====================
const Sidebar = {
  init() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');
    const menuToggle = document.getElementById('menu-toggle');

    // 桌面端折叠
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      const isCollapsed = sidebar.classList.contains('collapsed');
      localStorage.setItem('holang_sidebar_collapsed', isCollapsed ? '1' : '0');
    });

    // 移动端菜单
    menuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });

    // 移动端点击导航后关闭
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          sidebar.classList.remove('open');
        }
      });
    });

    // 点击内容区关闭移动端菜单
    document.getElementById('page-content').addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        sidebar.classList.remove('open');
      }
    });

    // 恢复折叠状态
    if (localStorage.getItem('holang_sidebar_collapsed') === '1') {
      sidebar.classList.add('collapsed');
    }
  }
};

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
  Router.init();
  Sidebar.init();
});
