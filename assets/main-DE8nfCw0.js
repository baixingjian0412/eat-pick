(function() {
  "use strict";
  const Location = /* @__PURE__ */ (() => {
    let currentPos = null;
    let currentAddr = "";
    let currentCity = "";
    const MASTER_TIMEOUT = 15e3;
    async function get(askPermission = true) {
      const cached = Storage.getLocationCache();
      if (cached && cached.lat && cached.lng) {
        currentPos = { lat: cached.lat, lng: cached.lng };
        currentAddr = cached.address || "";
        currentCity = cached.city || "";
        return { ...currentPos, address: currentAddr, city: currentCity };
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), MASTER_TIMEOUT);
      try {
        const locationPromises = [];
        locationPromises.push(
          _amapIpLocate(controller.signal).then((r) => ({ source: "ip", data: r })).catch((e) => ({ source: "ip", error: e }))
        );
        if (navigator.geolocation) {
          locationPromises.push(
            _browserGeolocateWithRetry(askPermission ? 2 : 0, controller.signal).then((r) => ({ source: "gps", data: r })).catch((e) => ({ source: "gps", error: e }))
          );
        }
        let winner = null;
        for (const p of locationPromises) {
          const result = await p;
          if (result.data) {
            winner = result;
            break;
          }
        }
        clearTimeout(timeoutId);
        controller.abort();
        if (!winner || !winner.data) {
          throw new Error("LOCATION_FAILED");
        }
        const data = winner.data;
        currentPos = { lat: data.lat, lng: data.lng };
        currentAddr = data.address || "";
        currentCity = data.city || "";
        _saveCache();
        return { ...currentPos, address: currentAddr, city: currentCity };
      } catch (err) {
        clearTimeout(timeoutId);
        controller.abort();
        if (err.message === "PERMISSION_DENIED") {
          throw new Error("PERMISSION_DENIED");
        }
        if (err.message === "TIMEOUT" || err.message === "ABORTED") {
          throw new Error("TIMEOUT");
        }
        throw new Error("LOCATION_FAILED");
      }
    }
    async function search(keyword) {
      const result = await AMapAPI.geocode(keyword);
      if (!result || result.length === 0) {
        throw new Error("未找到匹配的地址，请尝试更具体的描述");
      }
      const item = result[0];
      currentPos = { lat: item.lat, lng: item.lng };
      currentAddr = item.formattedAddress || keyword;
      currentCity = item.city || "";
      _saveCache();
      return { ...currentPos, address: currentAddr, city: currentCity };
    }
    function getCurrent() {
      return currentPos ? { ...currentPos, address: currentAddr, city: currentCity } : null;
    }
    function clearCache() {
      Storage.clearLocationCache();
      currentPos = null;
      currentAddr = "";
      currentCity = "";
    }
    function _saveCache() {
      if (currentPos) {
        Storage.saveLocationCache({
          lat: currentPos.lat,
          lng: currentPos.lng,
          address: currentAddr,
          city: currentCity
        });
      }
    }
    async function _amapIpLocate(signal) {
      const url = `https://restapi.amap.com/v3/ip?key=${AMapAPI.getApiKey()}`;
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      const resp = await fetch(proxyUrl, signal ? { signal } : {});
      const data = await resp.json();
      if (data.status !== "1" || !data.rectangle) {
        throw new Error("IP定位无数据");
      }
      const [sw, ne] = data.rectangle.split(";");
      const [slng, slat] = sw.split(",").map(Number);
      const [nlng, nlat] = ne.split(",").map(Number);
      const centerLat = (slat + nlat) / 2;
      const centerLng = (slng + nlng) / 2;
      const geo = await AMapAPI.reverseGeocode(centerLat, centerLng, signal);
      return {
        lat: centerLat,
        lng: centerLng,
        address: geo.formattedAddress || data.province + data.city,
        city: data.city || ""
      };
    }
    function _browserGeolocateWithRetry(retries = 1, signal) {
      return new Promise((resolve, reject) => {
        if (signal == null ? void 0 : signal.aborted) {
          reject(new Error("ABORTED"));
          return;
        }
        function attempt() {
          if (signal == null ? void 0 : signal.aborted) {
            reject(new Error("ABORTED"));
            return;
          }
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              const lat = pos.coords.latitude;
              const lng = pos.coords.longitude;
              if (signal == null ? void 0 : signal.aborted) {
                reject(new Error("ABORTED"));
                return;
              }
              try {
                const geo = await Promise.race([
                  AMapAPI.reverseGeocode(lat, lng, signal),
                  new Promise((_, r) => setTimeout(() => r(new Error("GEO_TIMEOUT")), 5e3))
                ]);
                resolve({ lat, lng, address: (geo == null ? void 0 : geo.formattedAddress) || "", city: (geo == null ? void 0 : geo.city) || "" });
              } catch (e) {
                resolve({ lat, lng, address: "", city: "" });
              }
            },
            (err) => {
              if (signal == null ? void 0 : signal.aborted) {
                reject(new Error("ABORTED"));
                return;
              }
              if (retries > 0) {
                retries--;
                setTimeout(attempt, 1500);
                return;
              }
              switch (err.code) {
                case 1:
                  reject(new Error("PERMISSION_DENIED"));
                  break;
                case 2:
                  reject(new Error("NETWORK_ERROR"));
                  break;
                case 3:
                  reject(new Error("TIMEOUT_GPS"));
                  break;
                default:
                  reject(new Error("GPS_FAILED"));
              }
            },
            { enableHighAccuracy: false, timeout: 1e4, maximumAge: 3e5 }
          );
        }
        if (signal) {
          signal.addEventListener("abort", () => reject(new Error("ABORTED")));
        }
        attempt();
      });
    }
    return { get, search, getCurrent, clearCache };
  })();
  window.Locator = Location;
  const Storage$1 = /* @__PURE__ */ (() => {
    const KEYS = {
      LOCATION: "eatpick_location",
      REMAINING: "eatpick_remaining_pool"
    };
    function getLocationCache() {
      try {
        const raw = localStorage.getItem(KEYS.LOCATION);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }
    function saveLocationCache(loc) {
      localStorage.setItem(KEYS.LOCATION, JSON.stringify(loc));
    }
    function clearLocationCache() {
      localStorage.removeItem(KEYS.LOCATION);
      localStorage.removeItem(KEYS.REMAINING);
    }
    function getRemainingPool() {
      try {
        const raw = localStorage.getItem(KEYS.REMAINING);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }
    function saveRemainingPool(pool) {
      localStorage.setItem(KEYS.REMAINING, JSON.stringify(pool));
    }
    function clearRemainingPool() {
      localStorage.removeItem(KEYS.REMAINING);
    }
    return { getLocationCache, saveLocationCache, clearLocationCache, getRemainingPool, saveRemainingPool, clearRemainingPool };
  })();
  window.Storage = Storage$1;
  const RandomPicker$1 = /* @__PURE__ */ (() => {
    let pool = [];
    let fullList = [];
    function init(restaurants) {
      fullList = [...restaurants];
      const remaining = Storage.getRemainingPool();
      if (remaining && remaining.length > 0) {
        const fullIds = new Set(fullList.map((r) => r.id));
        pool = remaining.filter((id) => fullIds.has(id));
      } else {
        pool = fullList.map((r) => r.id);
      }
      _shuffle(pool);
    }
    function pick() {
      if (pool.length === 0) {
        pool = fullList.map((r) => r.id);
        _shuffle(pool);
        Storage.saveRemainingPool([]);
        const id2 = pool.pop();
        const restaurant2 = fullList.find((r) => r.id === id2);
        Storage.saveRemainingPool(pool);
        return { restaurant: restaurant2, isLast: false, poolReset: true };
      }
      const id = pool.pop();
      const restaurant = fullList.find((r) => r.id === id);
      const isLast = pool.length === 0;
      Storage.saveRemainingPool(pool);
      return { restaurant, isLast, poolReset: false };
    }
    function filterByCategory(category) {
      if (!category || category === "全部") return fullList;
      return fullList.filter((r) => {
        const types = (r.type || "").split(";");
        return types.some((t) => t.includes(category));
      });
    }
    function getPoolSize() {
      return pool.length;
    }
    function getTotalSize() {
      return fullList.length;
    }
    function _shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    }
    return { init, pick, filterByCategory, getPoolSize, getTotalSize };
  })();
  window.RandomPicker = RandomPicker$1;
  const AMapWrapper = /* @__PURE__ */ (() => {
    const mockRestaurants = [
      { id: "1", name: "海底捞火锅", address: "朝阳区建国路88号", type: "火锅", tel: "010-65888888", rating: "4.8", distance: "800m", photo: "", lat: 39.91, lng: 116.44 },
      { id: "2", name: "西贝莜面村", address: "朝阳区建国路92号", type: "西北菜", tel: "010-65898888", rating: "4.5", distance: "1.2km", photo: "", lat: 39.91, lng: 116.44 },
      { id: "3", name: "绿茶餐厅", address: "朝阳区建国路100号", type: "江浙菜", tel: "010-65878888", rating: "4.3", distance: "1.5km", photo: "", lat: 39.91, lng: 116.44 },
      { id: "4", name: "呷哺呷哺", address: "朝阳区建国路110号", type: "小火锅", tel: "010-65868888", rating: "4.2", distance: "2km", photo: "", lat: 39.91, lng: 116.44 },
      { id: "5", name: "全聚德烤鸭", address: "朝阳区建国路120号", type: "北京菜", tel: "010-65858888", rating: "4.6", distance: "2.5km", photo: "", lat: 39.91, lng: 116.44 },
      { id: "6", name: "吉野家", address: "朝阳区建国路130号", type: "日式快餐", tel: "010-65848888", rating: "4.0", distance: "3km", photo: "", lat: 39.91, lng: 116.44 },
      { id: "7", name: "眉山小吃", address: "朝阳区建国路140号", type: "川菜", tel: "010-65838888", rating: "4.4", distance: "3.5km", photo: "", lat: 39.91, lng: 116.44 },
      { id: "8", name: "兰州拉面", address: "朝阳区建国路150号", type: "拉面", tel: "010-65828888", rating: "4.1", distance: "4km", photo: "", lat: 39.91, lng: 116.44 },
      { id: "9", name: "沙县小吃", address: "朝阳区建国路160号", type: "小吃", tel: "010-65818888", rating: "3.9", distance: "4.5km", photo: "", lat: 39.91, lng: 116.44 },
      { id: "10", name: "麦当劳", address: "朝阳区建国路170号", type: "快餐", tel: "010-65808888", rating: "4.2", distance: "5km", photo: "", lat: 39.91, lng: 116.44 },
      { id: "11", name: "肯德基", address: "朝阳区建国路180号", type: "快餐", tel: "010-65798888", rating: "4.1", distance: "5.2km", photo: "", lat: 39.91, lng: 116.44 },
      { id: "12", name: "必胜客", address: "朝阳区建国路190号", type: "披萨", tel: "010-65788888", rating: "4.3", distance: "5.5km", photo: "", lat: 39.91, lng: 116.44 }
    ];
    function shuffleArray(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    }
    async function searchNearby(lat, lng) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const shuffled = shuffleArray([...mockRestaurants]);
          resolve(shuffled);
        }, 500);
      });
    }
    async function reverseGeocode(lat, lng, signal) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            formattedAddress: "北京市朝阳区建国路",
            city: "北京市"
          });
        }, 200);
      });
    }
    async function geocode(address) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve([{
            lat: 39.91,
            lng: 116.44,
            formattedAddress: address,
            city: "北京市"
          }]);
        }, 200);
      });
    }
    async function searchByKeyword(lat, lng, keyword) {
      const filtered = mockRestaurants.filter(
        (r) => r.name.includes(keyword) || r.type.includes(keyword)
      );
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(filtered);
        }, 300);
      });
    }
    async function searchAddress(keyword) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve([{
            id: "addr1",
            name: keyword,
            address: "北京市朝阳区" + keyword,
            lat: 39.91,
            lng: 116.44,
            city: "北京市"
          }]);
        }, 300);
      });
    }
    function getApiKey() {
      return "19dab2fef285a816ec8779e835984820";
    }
    function isKeyConfigured() {
      return true;
    }
    return {
      searchNearby,
      reverseGeocode,
      geocode,
      searchByKeyword,
      searchAddress,
      getApiKey,
      isKeyConfigured
    };
  })();
  window.AMapAPI = AMapWrapper;
  const State = {
    phase: "init",
    // 'init' | 'locating' | 'loading' | 'list' | 'random' | 'error' | 'manual'
    location: null,
    // { lat, lng, address, city }
    restaurants: [],
    // 当前餐厅列表
    categories: [],
    // 分类标签
    selectedCategory: "全部",
    randomResult: null,
    // 当前随机结果
    isLast: false,
    // 是否是池中最后一个
    poolReset: false,
    // 是否刚重置了池
    errorMsg: "",
    isLoading: false,
    searchKeyword: ""
    // 手动搜索关键词
  };
  document.addEventListener("DOMContentLoaded", async () => {
    render();
    const cached = Storage.getLocationCache();
    if (cached && cached.lat && cached.lng) {
      State.phase = "locating";
      render();
      await _loadWithLocation(cached);
    } else {
      State.phase = "locating";
      render();
      await _startLocation();
    }
  });
  async function _startLocation() {
    try {
      State.location = await Locator.get(true);
      await _loadWithLocation(State.location);
    } catch (err) {
      State.errorMsg = err.message === "PERMISSION_DENIED" ? "位置权限被拒绝" : err.message === "TIMEOUT" ? "定位超时（20秒内无法获取位置）" : "定位失败";
      State.phase = "manual";
      render();
    }
  }
  async function _loadWithLocation(loc) {
    State.location = loc;
    State.phase = "loading";
    render();
    try {
      const data = await AMapAPI.searchNearby(loc.lat, loc.lng);
      if (!data || data.length === 0) {
        State.phase = "empty";
        render();
        return;
      }
      State.restaurants = data;
      State.categories = _extractCategories(data);
      RandomPicker.init(data);
      State.phase = "list";
      render();
    } catch (err) {
      State.phase = "error";
      State.errorMsg = err.message || "加载失败，请重试";
      render();
    }
  }
  async function refreshData() {
    if (State.isLoading) return;
    State.isLoading = true;
    State.selectedCategory = "全部";
    State.randomResult = null;
    State.phase = "loading";
    Storage.clearRemainingPool();
    render();
    await _loadWithLocation(State.location);
    State.isLoading = false;
  }
  async function onSearchSubmit(keyword) {
    if (!keyword.trim()) return;
    State.isLoading = true;
    State.searchKeyword = keyword.trim();
    State.phase = "loading";
    State.selectedCategory = "全部";
    State.randomResult = null;
    render();
    try {
      const loc = await Locator.search(keyword.trim());
      State.location = loc;
      const data = await AMapAPI.searchNearby(loc.lat, loc.lng);
      if (!data || data.length === 0) {
        State.phase = "empty";
        render();
        return;
      }
      State.restaurants = data;
      State.categories = _extractCategories(data);
      RandomPicker.init(data);
      State.phase = "list";
    } catch (err) {
      State.phase = "error";
      State.errorMsg = err.message || "搜索失败";
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
    State.phase = "random";
    render();
  }
  function onBackToList() {
    State.phase = "list";
    State.randomResult = null;
    render();
  }
  function onShowSimilar() {
    var _a;
    if (!State.randomResult) return;
    State.selectedCategory = State.randomResult.type.split("、")[0] || "全部";
    State.phase = "list";
    render();
    (_a = document.querySelector(".restaurant-grid")) == null ? void 0 : _a.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function showAddressModal() {
    State.phase = "manual";
    render();
  }
  function onManualSubmit() {
    const input = document.getElementById("manualAddrInput");
    if (input) onSearchSubmit(input.value);
  }
  function render() {
    const app = document.getElementById("app");
    const btnWrap = document.getElementById("randomBtnWrap");
    if (btnWrap) {
      btnWrap.style.display = State.phase === "list" && State.restaurants.length > 0 ? "block" : "none";
    }
    _updateHeader();
    switch (State.phase) {
      case "init":
      case "locating":
        app.innerHTML = _renderHero();
        break;
      case "loading":
        app.innerHTML = _renderLoading();
        break;
      case "list":
        app.innerHTML = _renderList();
        break;
      case "random":
        app.innerHTML = _renderRandom();
        break;
      case "empty":
        app.innerHTML = _renderEmpty();
        break;
      case "error":
        app.innerHTML = _renderError();
        break;
      case "manual":
        app.innerHTML = _renderManual();
        break;
    }
  }
  function _updateHeader() {
    const badge = document.getElementById("locationBadge");
    const locText = document.getElementById("locText");
    if (!badge || !locText) return;
    if (State.location && State.location.address) {
      badge.style.display = "flex";
      const addr = State.location.address;
      locText.textContent = addr.length > 18 ? addr.substring(addr.length - 15) : addr;
      badge.title = addr;
    } else if (State.phase === "locating") {
      badge.style.display = "flex";
      locText.textContent = "定位中...";
    } else {
      badge.style.display = "none";
    }
  }
  function _renderHero(type) {
    return `
    <div class="hero">
      <div class="hero-icon">${"🍽️"}</div>
      <h1>${"帮你决定吃什么"}</h1>
      <p>${"自动定位获取周边3公里美食，一键随机选择，再也不纠结"}</p>
      ${""}
    </div>
  `;
  }
  function _renderLoading() {
    return `
    <div class="loading-container">
      <div class="spinner"></div>
      <div class="loading-text">${State.location ? "搜索周边美食中..." : "正在获取位置..."}</div>
    </div>
  `;
  }
  function _renderList() {
    const filtered = State.selectedCategory === "全部" ? State.restaurants : State.restaurants.filter((r) => {
      const types = (r.type || "").split("、");
      return types.some((t) => t.includes(State.selectedCategory));
    });
    const poolLeft = RandomPicker.getPoolSize();
    const total = RandomPicker.getTotalSize();
    return `
    <div class="search-section">
      <div class="search-box">
        <input class="search-input" id="searchInput" placeholder="搜索餐厅或地址..." value="${State.searchKeyword || ""}"
          onkeydown="if(event.key==='Enter')onSearchSubmit(this.value)"
          oninput="State.searchKeyword=this.value">
        <button class="btn btn-primary" onclick="onSearchSubmit(document.getElementById('searchInput').value)">🔍</button>
      </div>
    </div>

    ${State.categories.length > 0 ? `
    <div class="category-tabs">
      <div class="cat-tab ${State.selectedCategory === "全部" ? "active" : ""}" onclick="onCategoryChange('全部')">全部</div>
      ${State.categories.map((c) => `<div class="cat-tab ${State.selectedCategory === c ? "active" : ""}" onclick="onCategoryChange('${c}')">${c}</div>`).join("")}
    </div>
    ` : ""}

    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <div style="font-size:0.8rem;color:var(--text-secondary)">
        找到 <strong>${State.restaurants.length}</strong> 家 ${State.selectedCategory !== "全部" ? State.selectedCategory : "美食"}
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
          ${r.photo ? `<img class="card-img" src="${r.photo}" alt="${r.name}" loading="lazy" onerror="this.outerHTML='<div class=card-img-placeholder>🍜</div>'">` : `<div class="card-img-placeholder">🍜</div>`}
          <div class="card-body">
            <div class="card-name" title="${r.name}">${r.name}</div>
            <div class="card-info">
              ${r.rating ? `<span class="rating">⭐ ${r.rating}</span>` : ""}
              ${r.distance ? `<span>📍 ${r.distance}</span>` : ""}
            </div>
            <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">
              ${(r.type || "").split("、").filter(Boolean).slice(0, 2).map((t) => `<span class="card-tag">${t}</span>`).join("")}
              ${r.address ? `<span class="card-distance" title="${r.address}">${r.address.substring(0, 12)}...</span>` : ""}
            </div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
  }
  function _renderRandom() {
    const r = State.randomResult;
    if (!r) return _renderList();
    return `
    <div class="random-result">
      <div class="random-label">🎲 ${State.poolReset ? "已重置随机池，重新开始！" : "今天就吃这个！"}</div>
      <div class="random-restaurant">
        ${r.photo ? `<img class="random-img" src="${r.photo}" alt="${r.name}" onerror="this.outerHTML='<div class=random-img-placeholder>🍜</div>'">` : `<div class="random-img-placeholder">🍜</div>`}
        <div class="random-body">
          <div class="random-name">${r.name}</div>
          <div class="random-details">
            ${r.rating ? `<div>⭐ 评分 <span class="val">${r.rating}</span></div>` : ""}
            ${r.distance ? `<div>📍 距离 <span class="val">${r.distance}</span></div>` : ""}
          </div>
          ${r.type ? `<div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-bottom:16px">
            ${r.type.split("、").filter(Boolean).slice(0, 3).map((t) => `<span class="card-tag">${t}</span>`).join("")}
          </div>` : ""}
          ${r.address ? `<p style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:16px">${r.address}</p>` : ""}
          <div class="random-actions">
            <button class="btn btn-primary" onclick="onRandomPick()" style="padding:10px 24px">
              ${State.isLast ? "🎉 重新开始" : "🔄 换一个"}
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
      <p>${State.errorMsg || "请检查网络后重试"}</p>
      <button class="btn btn-primary" style="margin-top:16px" onclick="refreshData()">重新加载</button>
    </div>
  `;
  }
  function _renderManual() {
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
      ` : ""}
      <div style="max-width:400px;margin:0 auto">
        <div class="search-box">
          <input class="search-input" id="manualAddrInput" placeholder="例如：上海市静安区共和新路" value="${State.searchKeyword || ""}" onkeydown="if(event.key==='Enter')onManualSubmit()">
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
  function _extractCategories(restaurants) {
    const all = [];
    restaurants.forEach((r) => {
      if (r.type) {
        r.type.split("、").filter(Boolean).forEach((t) => all.push(t.trim()));
      }
    });
    const freq = {};
    all.forEach((t) => {
      freq[t] = (freq[t] || 0) + 1;
    });
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => t);
  }
  function pickSingle(r) {
    State.randomResult = r;
    State.phase = "random";
    State.isLast = false;
    State.poolReset = false;
    render();
  }
  let toastTimer = null;
  function showToast(msg, type = "") {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.className = `toast ${type}`;
    toast.style.display = "block";
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.style.display = "none";
    }, 3e3);
  }
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
})();
