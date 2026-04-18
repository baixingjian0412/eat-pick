/**
 * 主应用 - 状态管理与界面渲染
 * 纯原生 JS，无框架依赖
 */

// ========== 全局状态 ==========
const State = {
  phase: 'init',          // 'init' | 'locating' | 'loading' | 'list' | 'random' | 'error' | 'manual'
  location: null,         // { lat, lng, address, city }
  restaurants: [],        // 当前餐厅列表
  categories: [],         // 分类标签
  selectedCategory: '全部',
  randomResult: null,     // 当前随机结果
  isLast: false,          // 是否是池中最后一个
  poolReset: false,       // 是否刚重置了池
  errorMsg: '',
  isLoading: false,
  searchKeyword: ''       // 手动搜索关键词
};

// ========== 入口 ==========
document.addEventListener('DOMContentLoaded', async () => {
  render();

  // 检查是否已有缓存位置
  const cached = Storage.getLocationCache();
  if (cached && cached.lat && cached.lng) {
    // 有缓存 → 直接显示定位中，加载数据
    State.phase = 'locating';
    render();
    await _loadWithLocation(cached);
  } else {
    // 无缓存 → 请求定位
    State.phase = 'locating';
    render();
    await _startLocation();
  }
});

// ========== 定位流程 ==========
async function _startLocation() {
  try {
    State.location = await Location.get(true);
    await _loadWithLocation(State.location);
  } catch (err) {
    State.errorMsg = err.message === 'PERMISSION_DENIED'
      ? '位置权限被拒绝'
      : (err.message === 'TIMEOUT' ? '定位超时（20秒内无法获取位置）' : '定位失败');
    State.phase = 'manual';
    render();
  }
}

async function _loadWithLocation(loc) {
  State.location = loc;
  State.phase = 'loading';
  render();

  try {
    const data = await AMap.searchNearby(loc.lat, loc.lng);
    if (!data || data.length === 0) {
      State.phase = 'empty';
      render();
      return;
    }
    State.restaurants = data;
    State.categories = _extractCategories(data);
    RandomPicker.init(data);
    State.phase = 'list';
    render();
  } catch (err) {
    State.phase = 'error';
    State.errorMsg = err.message || '加载失败，请重试';
    render();
  }
}

// ========== 用户操作 ==========
async function refreshData() {
  if (State.isLoading) return;
  State.isLoading = true;
  State.selectedCategory = '全部';
  State.randomResult = null;
  State.phase = 'loading';
  Storage.clearRemainingPool();
  render();
  await _loadWithLocation(State.location);
  State.isLoading = false;
}

async function onSearchSubmit(keyword) {
  if (!keyword.trim()) return;
  State.isLoading = true;
  State.searchKeyword = keyword.trim();
  State.phase = 'loading';
  State.selectedCategory = '全部';
  State.randomResult = null;
  render();

  try {
    // 先搜索地址
    const loc = await Location.search(keyword.trim());
    State.location = loc;
    const data = await AMap.searchNearby(loc.lat, loc.lng);
    if (!data || data.length === 0) {
      State.phase = 'empty';
      render();
      return;
    }
    State.restaurants = data;
    State.categories = _extractCategories(data);
    RandomPicker.init(data);
    State.phase = 'list';
  } catch (err) {
    State.phase = 'error';
    State.errorMsg = err.message || '搜索失败';
  }
  State.isLoading = false;
  render();
}

function onCategoryChange(cat) {
  State.selectedCategory = cat;
  render();
}

function onRandomPick() {
  const { restaurant, isLast, poolReset } = RandomPicker.pick();
  State.randomResult = restaurant;
  State.isLast = isLast;
  State.poolReset = poolReset;
  State.phase = 'random';
  render();
}

function onBackToList() {
  State.phase = 'list';
  State.randomResult = null;
  render();
}

function onShowSimilar() {
  if (!State.randomResult) return;
  State.selectedCategory = State.randomResult.type.split('、')[0] || '全部';
  State.phase = 'list';
  render();
  // 滚动到餐厅列表区域
  document.querySelector('.restaurant-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showAddressModal() {
  State.phase = 'manual';
  render();
}

function onManualSubmit() {
  const input = document.getElementById('manualAddrInput');
  if (input) onSearchSubmit(input.value);
}

// ========== 渲染 ==========
function render() {
  const app = document.getElementById('app');

  // 控制固定随机按钮显隐：仅列表页显示
  const btnWrap = document.getElementById('randomBtnWrap');
  if (btnWrap) {
    btnWrap.style.display = (State.phase === 'list' && State.restaurants.length > 0) ? 'block' : 'none';
  }

  // 更新 header 地址显示
  _updateHeader();

  switch (State.phase) {
    case 'init':
    case 'locating':
      app.innerHTML = _renderHero('locating');
      break;
    case 'loading':
      app.innerHTML = _renderLoading();
      break;
    case 'list':
      app.innerHTML = _renderList();
      break;
    case 'random':
      app.innerHTML = _renderRandom();
      break;
    case 'empty':
      app.innerHTML = _renderEmpty();
      break;
    case 'error':
      app.innerHTML = _renderError();
      break;
    case 'manual':
      app.innerHTML = _renderManual();
      break;
  }
}

function _updateHeader() {
  const badge = document.getElementById('locationBadge');
  const locText = document.getElementById('locText');
  if (!badge || !locText) return;

  if (State.location && State.location.address) {
    badge.style.display = 'flex';
    // 截取简洁显示
    const addr = State.location.address;
    locText.textContent = addr.length > 18 ? addr.substring(addr.length - 15) : addr;
    badge.title = addr;
  } else if (State.phase === 'locating') {
    badge.style.display = 'flex';
    locText.textContent = '定位中...';
  } else {
    badge.style.display = 'none';
  }
}

// ========== 模板函数 ==========
function _renderHero(type) {
  const isManual = type === 'manual';
  return `
    <div class="hero">
      <div class="hero-icon">${isManual ? '📍' : '🍽️'}</div>
      <h1>${isManual ? '手动输入地址' : '帮你决定吃什么'}</h1>
      <p>${isManual ? '输入你的位置，周边3公里美食随你挑' : '自动定位获取周边3公里美食，一键随机选择，再也不纠结'}</p>
      ${isManual ? `
        <div style="max-width:400px;margin:0 auto">
          <div class="search-box">
            <input class="search-input" id="manualAddrInput" placeholder="例如：上海市静安区共和新路" value="${State.searchKeyword || ''}" onkeydown="if(event.key==='Enter')onManualSubmit()">
            <button class="btn btn-primary" onclick="onManualSubmit()">搜索</button>
          </div>
        </div>
        <p style="margin-top:16px;font-size:0.8rem;color:var(--text-light)">也可以<a href="#" onclick="Locator.get(true).then(()=>{}).catch(()=>{});return false" style="color:var(--primary)">重新获取定位</a></p>
      ` : ''}
    </div>
  `;
}

function _renderLoading() {
  return `
    <div class="loading-container">
      <div class="spinner"></div>
      <div class="loading-text">${State.location ? '搜索周边美食中...' : '正在获取位置...'}</div>
    </div>
  `;
}

function _renderList() {
  const filtered = State.selectedCategory === '全部'
    ? State.restaurants
    : State.restaurants.filter(r => {
        const types = (r.type || '').split('、');
        return types.some(t => t.includes(State.selectedCategory));
      });

  const poolLeft = RandomPicker.getPoolSize();
  const total = RandomPicker.getTotalSize();

  return `
    <div class="search-section">
      <div class="search-box">
        <input class="search-input" id="searchInput" placeholder="搜索餐厅或地址..." value="${State.searchKeyword || ''}"
          onkeydown="if(event.key==='Enter')onSearchSubmit(this.value)"
          oninput="State.searchKeyword=this.value">
        <button class="btn btn-primary" onclick="onSearchSubmit(document.getElementById('searchInput').value)">🔍</button>
      </div>
    </div>

    ${State.categories.length > 0 ? `
    <div class="category-tabs">
      <div class="cat-tab ${State.selectedCategory === '全部' ? 'active' : ''}" onclick="onCategoryChange('全部')">全部</div>
      ${State.categories.map(c => `<div class="cat-tab ${State.selectedCategory === c ? 'active' : ''}" onclick="onCategoryChange('${c}')">${c}</div>`).join('')}
    </div>
    ` : ''}

    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <div style="font-size:0.8rem;color:var(--text-secondary)">
        找到 <strong>${State.restaurants.length}</strong> 家 ${State.selectedCategory !== '全部' ? State.selectedCategory : '美食'}
        · 剩余可选：<strong>${poolLeft}</strong>/${total}
      </div>
    </div>

    <div class="restaurant-grid">
      ${filtered.length === 0 ? `
        <div class="empty" style="grid-column:1/-1">
          <div class="empty-icon">🍜</div>
          <h3>暂无美食数据</h3>
          <p>换个分类试试，或手动输入其他地址</p>
        </div>
      ` : filtered.map((r, i) => `
        <div class="restaurant-card" style="animation-delay:${i * 40}ms" onclick="pickSingle(${JSON.stringify(r).replace(/'/g, "&#39;")})">
          ${r.photo
            ? `<img class="card-img" src="${r.photo}" alt="${r.name}" loading="lazy" onerror="this.outerHTML='<div class=card-img-placeholder>🍜</div>'">`
            : `<div class="card-img-placeholder">🍜</div>`
          }
          <div class="card-body">
            <div class="card-name" title="${r.name}">${r.name}</div>
            <div class="card-info">
              ${r.rating ? `<span class="rating">⭐ ${r.rating}</span>` : ''}
              ${r.distance ? `<span>📍 ${r.distance}</span>` : ''}
            </div>
            <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">
              ${(r.type || '').split('、').filter(Boolean).slice(0,2).map(t => `<span class="card-tag">${t}</span>`).join('')}
              ${r.address ? `<span class="card-distance" title="${r.address}">${r.address.substring(0,12)}...</span>` : ''}
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function _renderRandom() {
  const r = State.randomResult;
  if (!r) return _renderList();

  return `
    <div class="random-result">
      <div class="random-label">🎲 ${State.poolReset ? '已重置随机池，重新开始！' : '今天就吃这个！'}</div>
      <div class="random-restaurant">
        ${r.photo
          ? `<img class="random-img" src="${r.photo}" alt="${r.name}" onerror="this.outerHTML='<div class=random-img-placeholder>🍜</div>'">`
          : `<div class="random-img-placeholder">🍜</div>`
        }
        <div class="random-body">
          <div class="random-name">${r.name}</div>
          <div class="random-details">
            ${r.rating ? `<div>⭐ 评分 <span class="val">${r.rating}</span></div>` : ''}
            ${r.distance ? `<div>📍 距离 <span class="val">${r.distance}</span></div>` : ''}
          </div>
          ${r.type ? `<div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-bottom:16px">
            ${r.type.split('、').filter(Boolean).slice(0,3).map(t => `<span class="card-tag">${t}</span>`).join('')}
          </div>` : ''}
          ${r.address ? `<p style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:16px">${r.address}</p>` : ''}
          <div class="random-actions">
            <button class="btn btn-primary" onclick="onRandomPick()" style="padding:10px 24px">
              ${State.isLast ? '🎉 重新开始' : '🔄 换一个'}
            </button>
            <button class="btn btn-ghost" onclick="onShowSimilar()">👀 看同类美食</button>
            <button class="btn btn-ghost" onclick="onBackToList()">📋 返回列表</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function _renderEmpty() {
  return `
    <div class="empty">
      <div class="empty-icon">🍜</div>
      <h3>周边3公里暂无美食数据</h3>
      <p>可能是位置较偏，请尝试其他地址</p>
      <button class="btn btn-primary" style="margin-top:16px" onclick="State.phase='manual';State.searchKeyword='';render()">换个地址试试</button>
    </div>
  `;
}

function _renderError() {
  return `
    <div class="empty">
      <div class="empty-icon">😵</div>
      <h3>加载失败</h3>
      <p>${State.errorMsg || '请检查网络后重试'}</p>
      <button class="btn btn-primary" style="margin-top:16px" onclick="refreshData()">重新加载</button>
    </div>
  `;
}

function _renderManual() {
  const isManual = true;
  const errMsg = State.errorMsg;
  return `
    <div class="hero">
      <div class="hero-icon">📍</div>
      <h1>手动输入地址</h1>
      <p>输入你的位置，周边5公里美食随你挑</p>
      ${errMsg ? `
        <div style="background:#fff3cd;color:#856404;border:1px solid #ffeeba;border-radius:8px;padding:10px 16px;margin:12px auto;max-width:400px;font-size:0.85rem">
          ⚠️ ${errMsg}，已切换为手动输入
        </div>
      ` : ''}
      <div style="max-width:400px;margin:0 auto">
        <div class="search-box">
          <input class="search-input" id="manualAddrInput" placeholder="例如：上海市静安区共和新路" value="${State.searchKeyword || ''}" onkeydown="if(event.key==='Enter')onManualSubmit()">
          <button class="btn btn-primary" onclick="onManualSubmit()">搜索</button>
        </div>
      </div>
      <p style="margin-top:16px;font-size:0.8rem;color:var(--text-light)">
        也可以 <a href="#" onclick="Locator.get(true).then(()=>{State.location=Locator.getCurrent();State.phase='locating';render();_loadWithLocation(State.location)}).catch(()=>{});return false" style="color:var(--primary)">重新获取定位</a>
      </p>
      <p style="margin-top:20px;font-size:0.75rem;color:var(--text-light)">
        💡 搜索地址后列表和随机按钮才会出现
      </p>
    </div>
  `;
}

// ========== 辅助函数 ==========
function _extractCategories(restaurants) {
  const all = [];
  restaurants.forEach(r => {
    if (r.type) {
      r.type.split('、').filter(Boolean).forEach(t => all.push(t.trim()));
    }
  });
  // 去重，取频次最高的 8 个
  const freq = {};
  all.forEach(t => { freq[t] = (freq[t] || 0) + 1; });
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([t]) => t);
}

function pickSingle(r) {
  State.randomResult = r;
  State.phase = 'random';
  State.isLast = false;
  State.poolReset = false;
  render();
}

// Toast 提示
let toastTimer = null;
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  toast.style.display = 'block';
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

// 暴露全局函数供 onclick 使用
window.State = State;
window.onSearchSubmit = onSearchSubmit;
window.onCategoryChange = onCategoryChange;
window.onRandomPick = onRandomPick;
window.onBackToList = onBackToList;
window.onShowSimilar = onShowSimilar;
window.showAddressModal = showAddressModal;
window.onManualSubmit = onManualSubmit;
window.pickSingle = pickSingle;
window.showToast = showToast;
window.refreshData = refreshData;
