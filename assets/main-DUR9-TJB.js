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
      throw new Error("IP定位暂不可用");
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
    const JS_API_KEY = "19dab2fef285a816ec8779e835984820";
    const RADIUS = 5e3;
    let amapReady = null;
    function waitForAMap() {
      if (amapReady) return amapReady;
      amapReady = new Promise((resolve, reject) => {
        const checkAMap = () => {
          if (!window.AMap) {
            setTimeout(checkAMap, 100);
            return;
          }
          window.AMap.plugin(["AMap.PlaceSearch", "AMap.Geocoder"], () => {
            resolve(window.AMap);
          });
        };
        checkAMap();
      });
      return amapReady;
    }
    async function searchNearby(lat, lng) {
      const AMap = await waitForAMap();
      return new Promise((resolve, reject) => {
        const placeSearch = new AMap.PlaceSearch({
          city: "全国",
          citylimit: false,
          pageSize: 50,
          pageIndex: 1,
          extensions: "all",
          radius: RADIUS,
          type: "餐饮服务"
        });
        placeSearch.searchNearBy("", [lng, lat], RADIUS, (status, result) => {
          if (status === "complete" && result.poiList) {
            const pois = result.poiList.pois || [];
            resolve(pois.map(_formatPOI));
          } else if (status === "no_data") {
            resolve([]);
          } else {
            reject(new Error(result && result.info ? result.info : "获取周边美食失败"));
          }
        });
      });
    }
    async function reverseGeocode(lat, lng, signal) {
      const AMap = await waitForAMap();
      return new Promise((resolve, reject) => {
        const geocoder = new AMap.Geocoder({
          extensions: "base"
        });
        if (signal) {
          signal.addEventListener("abort", () => {
            reject(new Error("请求已取消"));
          });
        }
        geocoder.getAddress([lng, lat], (status, result) => {
          if (status === "complete" && result.regeocode) {
            const rc = result.regeocode;
            resolve({
              formattedAddress: rc.formattedAddress || "",
              city: rc.addressComponent && rc.addressComponent.city || rc.addressComponent && rc.addressComponent.province || ""
            });
          } else {
            reject(new Error("地址解析失败"));
          }
        });
      });
    }
    async function geocode(address) {
      const AMap = await waitForAMap();
      return new Promise((resolve, reject) => {
        const geocoder = new AMap.Geocoder({
          city: "",
          // 全国
          extensions: "base"
        });
        geocoder.getLocation(address, (status, result) => {
          if (status === "complete" && result.geocodes && result.geocodes.length > 0) {
            const results = result.geocodes.map((g) => {
              const [lng, lat] = g.location.split(",").map(Number);
              return {
                lat,
                lng,
                formattedAddress: g.formattedAddress || g.address || address,
                city: g.city || ""
              };
            });
            resolve(results);
          } else {
            resolve([]);
          }
        });
      });
    }
    async function searchByKeyword(lat, lng, keyword) {
      const AMap = await waitForAMap();
      return new Promise((resolve, reject) => {
        const placeSearch = new AMap.PlaceSearch({
          city: "全国",
          citylimit: false,
          pageSize: 50,
          pageIndex: 1,
          extensions: "all",
          radius: RADIUS,
          type: "餐饮服务"
        });
        placeSearch.search(keyword, (status, result) => {
          if (status === "complete" && result.poiList) {
            const pois = result.poiList.pois || [];
            resolve(pois.map(_formatPOI));
          } else if (status === "no_data") {
            resolve([]);
          } else {
            reject(new Error(result && result.info ? result.info : "搜索失败"));
          }
        });
      });
    }
    async function searchAddress(keyword) {
      const AMap = await waitForAMap();
      return new Promise((resolve, reject) => {
        const placeSearch = new AMap.PlaceSearch({
          city: "",
          // 全国
          citylimit: false,
          pageSize: 20,
          pageIndex: 1,
          extensions: "base"
        });
        placeSearch.search(keyword, (status, result) => {
          if (status === "complete" && result.poiList) {
            const pois = result.poiList.pois || [];
            resolve(pois.map((poi) => ({
              id: poi.id,
              name: poi.name,
              address: poi.address || "",
              lat: poi.location.lat,
              lng: poi.location.lng,
              city: poi.city || ""
            })));
          } else if (status === "no_data") {
            resolve([]);
          } else {
            reject(new Error(result && result.info ? result.info : "地址搜索失败"));
          }
        });
      });
    }
    function _formatPOI(poi) {
      let distance = "";
      if (poi.distance) {
        const d = parseInt(poi.distance);
        distance = d >= 1e3 ? `${(d / 1e3).toFixed(1)}km` : `${d}m`;
      }
      let rating = "";
      if (poi.rating) {
        rating = poi.rating;
      }
      let photo = "";
      if (poi.photos && poi.photos.length > 0) {
        photo = poi.photos[0].url || "";
      }
      let type = poi.type || "";
      const typeParts = type.split(";");
      type = typeParts.map((t) => t.replace(/^\d{6}\|?/, "")).filter(Boolean).join("、");
      return {
        id: poi.id,
        name: poi.name,
        address: poi.address || "",
        type,
        tel: poi.tel || "",
        rating,
        distance,
        photo,
        lat: poi.location ? poi.location.lat : "",
        lng: poi.location ? poi.location.lng : ""
      };
    }
    function getApiKey() {
      return JS_API_KEY;
    }
    function isKeyConfigured() {
      return JS_API_KEY !== "";
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
