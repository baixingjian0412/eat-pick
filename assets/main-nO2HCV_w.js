(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))t(i);new MutationObserver(i=>{for(const s of i)if(s.type==="childList")for(const c of s.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&t(c)}).observe(document,{childList:!0,subtree:!0});function r(i){const s={};return i.integrity&&(s.integrity=i.integrity),i.referrerPolicy&&(s.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?s.credentials="include":i.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function t(i){if(i.ep)return;i.ep=!0;const s=r(i);fetch(i.href,s)}})();const a={phase:"init",location:null,restaurants:[],categories:[],selectedCategory:"全部",randomResult:null,isLast:!1,poolReset:!1,errorMsg:"",isLoading:!1,searchKeyword:""};document.addEventListener("DOMContentLoaded",async()=>{o();const e=Storage.getLocationCache();e&&e.lat&&e.lng?(a.phase="locating",o(),await l(e)):(a.phase="locating",o(),await p())});async function p(){try{a.location=await Location.get(!0),await l(a.location)}catch(e){a.errorMsg=e.message==="PERMISSION_DENIED"?"位置权限被拒绝":e.message==="TIMEOUT"?"定位超时（20秒内无法获取位置）":"定位失败",a.phase="manual",o()}}async function l(e){a.location=e,a.phase="loading",o();try{const n=await AMap.searchNearby(e.lat,e.lng);if(!n||n.length===0){a.phase="empty",o();return}a.restaurants=n,a.categories=b(n),RandomPicker.init(n),a.phase="list",o()}catch(n){a.phase="error",a.errorMsg=n.message||"加载失败，请重试",o()}}function o(){const e=document.getElementById("app"),n=document.getElementById("randomBtnWrap");switch(n&&(n.style.display=a.phase==="list"&&a.restaurants.length>0?"block":"none"),u(),a.phase){case"init":case"locating":e.innerHTML=g();break;case"loading":e.innerHTML=m();break;case"list":e.innerHTML=d();break;case"random":e.innerHTML=h();break;case"empty":e.innerHTML=y();break;case"error":e.innerHTML=v();break;case"manual":e.innerHTML=f();break}}function u(){const e=document.getElementById("locationBadge"),n=document.getElementById("locText");if(!(!e||!n))if(a.location&&a.location.address){e.style.display="flex";const r=a.location.address;n.textContent=r.length>18?r.substring(r.length-15):r,e.title=r}else a.phase==="locating"?(e.style.display="flex",n.textContent="定位中..."):e.style.display="none"}function g(e){return`
    <div class="hero">
      <div class="hero-icon">🍽️</div>
      <h1>帮你决定吃什么</h1>
      <p>自动定位获取周边3公里美食，一键随机选择，再也不纠结</p>
      
    </div>
  `}function m(){return`
    <div class="loading-container">
      <div class="spinner"></div>
      <div class="loading-text">${a.location?"搜索周边美食中...":"正在获取位置..."}</div>
    </div>
  `}function d(){const e=a.restaurants,n=RandomPicker.getPoolSize(),r=RandomPicker.getTotalSize();return`
    <div class="search-section">
      <div class="search-box">
        <input class="search-input" id="searchInput" placeholder="搜索餐厅或地址..." value=""
          onkeydown="if(event.key==='Enter')onSearchSubmit(this.value)"
          oninput="State.searchKeyword=this.value">
        <button class="btn btn-primary" onclick="onSearchSubmit(document.getElementById('searchInput').value)">🔍</button>
      </div>
    </div>

    ${a.categories.length>0?`
    <div class="category-tabs">
      <div class="cat-tab active" onclick="onCategoryChange('全部')">全部</div>
      ${a.categories.map(t=>`<div class="cat-tab ${a.selectedCategory===t?"active":""}" onclick="onCategoryChange('${t}')">${t}</div>`).join("")}
    </div>
    `:""}

    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <div style="font-size:0.8rem;color:var(--text-secondary)">
        找到 <strong>${a.restaurants.length}</strong> 家 美食
        · 剩余可选：<strong>${n}</strong>/${r}
      </div>
    </div>

    <div class="restaurant-grid">
      ${e.length===0?`
        <div class="empty" style="grid-column:1/-1">
          <div class="empty-icon">🍜</div>
          <h3>暂无美食数据</h3>
          <p>换个分类试试，或手动输入其他地址</p>
        </div>
      `:e.map((t,i)=>`
        <div class="restaurant-card" style="animation-delay:${i*40}ms" onclick="pickSingle(${JSON.stringify(t).replace(/'/g,"&#39;")})">
          ${t.photo?`<img class="card-img" src="${t.photo}" alt="${t.name}" loading="lazy" onerror="this.outerHTML='<div class=card-img-placeholder>🍜</div>'">`:'<div class="card-img-placeholder">🍜</div>'}
          <div class="card-body">
            <div class="card-name" title="${t.name}">${t.name}</div>
            <div class="card-info">
              ${t.rating?`<span class="rating">⭐ ${t.rating}</span>`:""}
              ${t.distance?`<span>📍 ${t.distance}</span>`:""}
            </div>
            <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">
              ${(t.type||"").split("、").filter(Boolean).slice(0,2).map(s=>`<span class="card-tag">${s}</span>`).join("")}
              ${t.address?`<span class="card-distance" title="${t.address}">${t.address.substring(0,12)}...</span>`:""}
            </div>
          </div>
        </div>
      `).join("")}
    </div>
  `}function h(){return d()}function y(){return`
    <div class="empty">
      <div class="empty-icon">🍜</div>
      <h3>周边3公里暂无美食数据</h3>
      <p>可能是位置较偏，请尝试其他地址</p>
      <button class="btn btn-primary" style="margin-top:16px" onclick="State.phase='manual';State.searchKeyword='';render()">换个地址试试</button>
    </div>
  `}function v(){return`
    <div class="empty">
      <div class="empty-icon">😵</div>
      <h3>加载失败</h3>
      <p>${a.errorMsg||"请检查网络后重试"}</p>
      <button class="btn btn-primary" style="margin-top:16px" onclick="refreshData()">重新加载</button>
    </div>
  `}function f(){const e=a.errorMsg;return`
    <div class="hero">
      <div class="hero-icon">📍</div>
      <h1>手动输入地址</h1>
      <p>输入你的位置，周边5公里美食随你挑</p>
      ${e?`
        <div style="background:#fff3cd;color:#856404;border:1px solid #ffeeba;border-radius:8px;padding:10px 16px;margin:12px auto;max-width:400px;font-size:0.85rem">
          ⚠️ ${e}，已切换为手动输入
        </div>
      `:""}
      <div style="max-width:400px;margin:0 auto">
        <div class="search-box">
          <input class="search-input" id="manualAddrInput" placeholder="例如：上海市静安区共和新路" value="" onkeydown="if(event.key==='Enter')onManualSubmit()">
          <button class="btn btn-primary" onclick="onManualSubmit()">搜索</button>
        </div>
      </div>
      <p style="margin-top:16px;font-size:0.8rem;color:var(--text-light)">
        也可以 <a href="#" onclick="Location.get(true).then(()=>{State.location=Location.getCurrent();State.phase='locating';render();_loadWithLocation(State.location)}).catch(()=>{});return false" style="color:var(--primary)">重新获取定位</a>
      </p>
      <p style="margin-top:20px;font-size:0.75rem;color:var(--text-light)">
        💡 搜索地址后列表和随机按钮才会出现
      </p>
    </div>
  `}function b(e){const n=[];e.forEach(t=>{t.type&&t.type.split("、").filter(Boolean).forEach(i=>n.push(i.trim()))});const r={};return n.forEach(t=>{r[t]=(r[t]||0)+1}),Object.entries(r).sort((t,i)=>i[1]-t[1]).slice(0,8).map(([t])=>t)}
