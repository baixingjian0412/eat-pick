(function(){"use strict";const A=(()=>{let t=null,a="",o="";const s=15e3;async function g(n=!0){const r=Storage.getLocationCache();if(r&&r.lat&&r.lng)return t={lat:r.lat,lng:r.lng},a=r.address||"",o=r.city||"",{...t,address:a,city:o};const i=new AbortController,c=setTimeout(()=>i.abort(),s);try{const l=[];l.push(f(i.signal).then(y=>({source:"ip",data:y})).catch(y=>({source:"ip",error:y}))),navigator.geolocation&&l.push(w(n?2:0,i.signal).then(y=>({source:"gps",data:y})).catch(y=>({source:"gps",error:y})));let u=null;for(const y of l){const b=await y;if(b.data){u=b;break}}if(clearTimeout(c),i.abort(),!u||!u.data)throw new Error("LOCATION_FAILED");const d=u.data;return t={lat:d.lat,lng:d.lng},a=d.address||"",o=d.city||"",p(),{...t,address:a,city:o}}catch(l){throw clearTimeout(c),i.abort(),l.message==="PERMISSION_DENIED"?new Error("PERMISSION_DENIED"):l.message==="TIMEOUT"||l.message==="ABORTED"?new Error("TIMEOUT"):new Error("LOCATION_FAILED")}}async function v(n){const r=await AMap.geocode(n);if(!r||r.length===0)throw new Error("未找到匹配的地址，请尝试更具体的描述");const i=r[0];return t={lat:i.lat,lng:i.lng},a=i.formattedAddress||n,o=i.city||"",p(),{...t,address:a,city:o}}function S(){return t?{...t,address:a,city:o}:null}function h(){Storage.clearLocationCache(),t=null,a="",o=""}function p(){t&&Storage.saveLocationCache({lat:t.lat,lng:t.lng,address:a,city:o})}async function f(n){const i=await(await fetch(`https://restapi.amap.com/v3/ip?key=${AMap.getApiKey()}`,n?{signal:n}:{})).json();if(i.status!=="1"||!i.rectangle)throw new Error("IP定位无数据");const[c,l]=i.rectangle.split(";"),[u,d]=c.split(",").map(Number),[y,b]=l.split(",").map(Number),k=(d+b)/2,E=(u+y)/2,V=await AMap.reverseGeocode(k,E,n);return{lat:k,lng:E,address:V.formattedAddress||i.province+i.city,city:i.city||""}}function w(n=1,r){return new Promise((i,c)=>{if(r!=null&&r.aborted){c(new Error("ABORTED"));return}function l(){if(r!=null&&r.aborted){c(new Error("ABORTED"));return}navigator.geolocation.getCurrentPosition(async u=>{const d=u.coords.latitude,y=u.coords.longitude;if(r!=null&&r.aborted){c(new Error("ABORTED"));return}try{const b=await Promise.race([AMap.reverseGeocode(d,y,r),new Promise((k,E)=>setTimeout(()=>E(new Error("GEO_TIMEOUT")),5e3))]);i({lat:d,lng:y,address:(b==null?void 0:b.formattedAddress)||"",city:(b==null?void 0:b.city)||""})}catch{i({lat:d,lng:y,address:"",city:""})}},u=>{if(r!=null&&r.aborted){c(new Error("ABORTED"));return}if(n>0){n--,setTimeout(l,1500);return}switch(u.code){case 1:c(new Error("PERMISSION_DENIED"));break;case 2:c(new Error("NETWORK_ERROR"));break;case 3:c(new Error("TIMEOUT_GPS"));break;default:c(new Error("GPS_FAILED"))}},{enableHighAccuracy:!1,timeout:1e4,maximumAge:3e5})}r&&r.addEventListener("abort",()=>c(new Error("ABORTED"))),l()})}return{get:g,search:v,getCurrent:S,clearCache:h}})();window.Location=A;const T=(()=>{const t={LOCATION:"eatpick_location",REMAINING:"eatpick_remaining_pool"};function a(){try{const h=localStorage.getItem(t.LOCATION);return h?JSON.parse(h):null}catch{return null}}function o(h){localStorage.setItem(t.LOCATION,JSON.stringify(h))}function s(){localStorage.removeItem(t.LOCATION),localStorage.removeItem(t.REMAINING)}function g(){try{const h=localStorage.getItem(t.REMAINING);return h?JSON.parse(h):[]}catch{return[]}}function v(h){localStorage.setItem(t.REMAINING,JSON.stringify(h))}function S(){localStorage.removeItem(t.REMAINING)}return{getLocationCache:a,saveLocationCache:o,clearLocationCache:s,getRemainingPool:g,saveRemainingPool:v,clearRemainingPool:S}})();window.Storage=T;const M=(()=>{let t=[],a=[];function o(p){a=[...p];const f=Storage.getRemainingPool();if(f&&f.length>0){const w=new Set(a.map(n=>n.id));t=f.filter(n=>w.has(n))}else t=a.map(w=>w.id);h(t)}function s(){if(t.length===0){t=a.map(i=>i.id),h(t),Storage.saveRemainingPool([]);const n=t.pop(),r=a.find(i=>i.id===n);return Storage.saveRemainingPool(t),{restaurant:r,isLast:!1,poolReset:!0}}const p=t.pop(),f=a.find(n=>n.id===p),w=t.length===0;return Storage.saveRemainingPool(t),{restaurant:f,isLast:w,poolReset:!1}}function g(p){return!p||p==="全部"?a:a.filter(f=>(f.type||"").split(";").some(n=>n.includes(p)))}function v(){return t.length}function S(){return a.length}function h(p){for(let f=p.length-1;f>0;f--){const w=Math.floor(Math.random()*(f+1));[p[f],p[w]]=[p[w],p[f]]}}return{init:o,pick:s,filterByCategory:g,getPoolSize:v,getTotalSize:S}})();window.RandomPicker=M;const P=(()=>{const t="19dab2fef285a816ec8779e835984820",a="https://restapi.amap.com/v3",s="050000";async function g(n,r){const i=new URLSearchParams({key:t,location:`${r},${n}`,radius:5e3,types:s,sortrule:"distance",offset:50,page:1,extensions:"all"}),l=await(await fetch(`${a}/place/around?${i}`)).json();if(l.status!=="1")throw new Error(l.info||"获取周边美食失败");return(l.pois||[]).map(p)}async function v(n,r,i){const c=new URLSearchParams({key:t,location:`${r},${n}`,extensions:"base"}),u=await(await fetch(`${a}/geocode/regeo?${c}`,i?{signal:i}:{})).json();if(u.status!=="1")throw new Error("地址解析失败");const d=u.regeocode||{};return{formattedAddress:d.formattedAddress||"",city:(d.addressComponent||{}).city||""}}async function S(n){const r=new URLSearchParams({key:t,address:n,city:""}),c=await(await fetch(`${a}/geocode/geo?${r}`)).json();return c.status!=="1"||!c.geocodes||c.geocodes.length===0?[]:c.geocodes.map(l=>{const[u,d]=l.location.split(",").map(Number);return{lat:d,lng:u,formattedAddress:l.formatted_address||l.address||n,city:l.city||""}})}async function h(n,r,i){const c=new URLSearchParams({key:t,location:`${r},${n}`,radius:5e3,types:s,keywords:i,sortrule:"distance",offset:50,page:1,extensions:"all"}),u=await(await fetch(`${a}/place/around?${c}`)).json();return u.status!=="1"?[]:(u.pois||[]).map(p)}function p(n){let r="";if(n.distance){const d=parseInt(n.distance);r=d>=1e3?`${(d/1e3).toFixed(1)}km`:`${d}m`}let i="";try{const d=typeof n.biz_ext=="string"?JSON.parse(n.biz_ext):n.biz_ext;d&&d.rating&&(i=d.rating)}catch{}let c="";n.photos&&n.photos.length>0&&(c=n.photos[0].url||"");let l=n.type||"";return l=l.split(";").map(d=>d.replace(/^\d{6}\|?/,"")).filter(Boolean).join("、"),{id:n.id,name:n.name,address:n.address||"",type:l,tel:n.tel||"",rating:i,distance:r,photo:c,lat:(n.location||"").split(",")[1]||"",lng:(n.location||"").split(",")[0]||""}}function f(){return t}function w(){return t!=="YOUR_AMAP_WEB_SERVICE_KEY"}return{searchNearby:g,reverseGeocode:v,geocode:S,searchByKeyword:h,getApiKey:f,isKeyConfigured:w}})();window.AMap=P;const e={phase:"init",location:null,restaurants:[],categories:[],selectedCategory:"全部",randomResult:null,isLast:!1,poolReset:!1,errorMsg:"",isLoading:!1,searchKeyword:""};document.addEventListener("DOMContentLoaded",async()=>{m();const t=Storage.getLocationCache();t&&t.lat&&t.lng?(e.phase="locating",m(),await L(t)):(e.phase="locating",m(),await x())});async function x(){try{e.location=await Location.get(!0),await L(e.location)}catch(t){e.errorMsg=t.message==="PERMISSION_DENIED"?"位置权限被拒绝":t.message==="TIMEOUT"?"定位超时（20秒内无法获取位置）":"定位失败",e.phase="manual",m()}}async function L(t){e.location=t,e.phase="loading",m();try{const a=await AMap.searchNearby(t.lat,t.lng);if(!a||a.length===0){e.phase="empty",m();return}e.restaurants=a,e.categories=O(a),RandomPicker.init(a),e.phase="list",m()}catch(a){e.phase="error",e.errorMsg=a.message||"加载失败，请重试",m()}}async function C(){e.isLoading||(e.isLoading=!0,e.selectedCategory="全部",e.randomResult=null,e.phase="loading",Storage.clearRemainingPool(),m(),await L(e.location),e.isLoading=!1)}async function I(t){if(t.trim()){e.isLoading=!0,e.searchKeyword=t.trim(),e.phase="loading",e.selectedCategory="全部",e.randomResult=null,m();try{const a=await Location.search(t.trim());e.location=a;const o=await AMap.searchNearby(a.lat,a.lng);if(!o||o.length===0){e.phase="empty",m();return}e.restaurants=o,e.categories=O(o),RandomPicker.init(o),e.phase="list"}catch(a){e.phase="error",e.errorMsg=a.message||"搜索失败"}e.isLoading=!1,m()}}function _(t){e.selectedCategory=t,m()}function N(){const{restaurant:t,isLast:a,poolReset:o}=RandomPicker.pick();e.randomResult=t,e.isLast=a,e.poolReset=o,e.phase="random",m()}function B(){e.phase="list",e.randomResult=null,m()}function D(){var t;e.randomResult&&(e.selectedCategory=e.randomResult.type.split("、")[0]||"全部",e.phase="list",m(),(t=document.querySelector(".restaurant-grid"))==null||t.scrollIntoView({behavior:"smooth",block:"start"}))}function K(){e.phase="manual",m()}function z(){const t=document.getElementById("manualAddrInput");t&&I(t.value)}function m(){const t=document.getElementById("app"),a=document.getElementById("randomBtnWrap");switch(a&&(a.style.display=e.phase==="list"&&e.restaurants.length>0?"block":"none"),U(),e.phase){case"init":case"locating":t.innerHTML=G();break;case"loading":t.innerHTML=H();break;case"list":t.innerHTML=R();break;case"random":t.innerHTML=F();break;case"empty":t.innerHTML=W();break;case"error":t.innerHTML=j();break;case"manual":t.innerHTML=J();break}}function U(){const t=document.getElementById("locationBadge"),a=document.getElementById("locText");if(!(!t||!a))if(e.location&&e.location.address){t.style.display="flex";const o=e.location.address;a.textContent=o.length>18?o.substring(o.length-15):o,t.title=o}else e.phase==="locating"?(t.style.display="flex",a.textContent="定位中..."):t.style.display="none"}function G(t){return`
    <div class="hero">
      <div class="hero-icon">🍽️</div>
      <h1>帮你决定吃什么</h1>
      <p>自动定位获取周边3公里美食，一键随机选择，再也不纠结</p>
      
    </div>
  `}function H(){return`
    <div class="loading-container">
      <div class="spinner"></div>
      <div class="loading-text">${e.location?"搜索周边美食中...":"正在获取位置..."}</div>
    </div>
  `}function R(){const t=e.selectedCategory==="全部"?e.restaurants:e.restaurants.filter(s=>(s.type||"").split("、").some(v=>v.includes(e.selectedCategory))),a=RandomPicker.getPoolSize(),o=RandomPicker.getTotalSize();return`
    <div class="search-section">
      <div class="search-box">
        <input class="search-input" id="searchInput" placeholder="搜索餐厅或地址..." value="${e.searchKeyword||""}"
          onkeydown="if(event.key==='Enter')onSearchSubmit(this.value)"
          oninput="State.searchKeyword=this.value">
        <button class="btn btn-primary" onclick="onSearchSubmit(document.getElementById('searchInput').value)">🔍</button>
      </div>
    </div>

    ${e.categories.length>0?`
    <div class="category-tabs">
      <div class="cat-tab ${e.selectedCategory==="全部"?"active":""}" onclick="onCategoryChange('全部')">全部</div>
      ${e.categories.map(s=>`<div class="cat-tab ${e.selectedCategory===s?"active":""}" onclick="onCategoryChange('${s}')">${s}</div>`).join("")}
    </div>
    `:""}

    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <div style="font-size:0.8rem;color:var(--text-secondary)">
        找到 <strong>${e.restaurants.length}</strong> 家 ${e.selectedCategory!=="全部"?e.selectedCategory:"美食"}
        · 剩余可选：<strong>${a}</strong>/${o}
      </div>
    </div>

    <div class="restaurant-grid">
      ${t.length===0?`
        <div class="empty" style="grid-column:1/-1">
          <div class="empty-icon">🍜</div>
          <h3>暂无美食数据</h3>
          <p>换个分类试试，或手动输入其他地址</p>
        </div>
      `:t.map((s,g)=>`
        <div class="restaurant-card" style="animation-delay:${g*40}ms" onclick="pickSingle(${JSON.stringify(s).replace(/'/g,"&#39;")})">
          ${s.photo?`<img class="card-img" src="${s.photo}" alt="${s.name}" loading="lazy" onerror="this.outerHTML='<div class=card-img-placeholder>🍜</div>'">`:'<div class="card-img-placeholder">🍜</div>'}
          <div class="card-body">
            <div class="card-name" title="${s.name}">${s.name}</div>
            <div class="card-info">
              ${s.rating?`<span class="rating">⭐ ${s.rating}</span>`:""}
              ${s.distance?`<span>📍 ${s.distance}</span>`:""}
            </div>
            <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">
              ${(s.type||"").split("、").filter(Boolean).slice(0,2).map(v=>`<span class="card-tag">${v}</span>`).join("")}
              ${s.address?`<span class="card-distance" title="${s.address}">${s.address.substring(0,12)}...</span>`:""}
            </div>
          </div>
        </div>
      `).join("")}
    </div>
  `}function F(){const t=e.randomResult;return t?`
    <div class="random-result">
      <div class="random-label">🎲 ${e.poolReset?"已重置随机池，重新开始！":"今天就吃这个！"}</div>
      <div class="random-restaurant">
        ${t.photo?`<img class="random-img" src="${t.photo}" alt="${t.name}" onerror="this.outerHTML='<div class=random-img-placeholder>🍜</div>'">`:'<div class="random-img-placeholder">🍜</div>'}
        <div class="random-body">
          <div class="random-name">${t.name}</div>
          <div class="random-details">
            ${t.rating?`<div>⭐ 评分 <span class="val">${t.rating}</span></div>`:""}
            ${t.distance?`<div>📍 距离 <span class="val">${t.distance}</span></div>`:""}
          </div>
          ${t.type?`<div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-bottom:16px">
            ${t.type.split("、").filter(Boolean).slice(0,3).map(a=>`<span class="card-tag">${a}</span>`).join("")}
          </div>`:""}
          ${t.address?`<p style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:16px">${t.address}</p>`:""}
          <div class="random-actions">
            <button class="btn btn-primary" onclick="onRandomPick()" style="padding:10px 24px">
              ${e.isLast?"🎉 重新开始":"🔄 换一个"}
            </button>
            <button class="btn btn-ghost" onclick="onShowSimilar()">👀 看同类美食</button>
            <button class="btn btn-ghost" onclick="onBackToList()">📋 返回列表</button>
          </div>
        </div>
      </div>
    </div>
  `:R()}function W(){return`
    <div class="empty">
      <div class="empty-icon">🍜</div>
      <h3>周边3公里暂无美食数据</h3>
      <p>可能是位置较偏，请尝试其他地址</p>
      <button class="btn btn-primary" style="margin-top:16px" onclick="State.phase='manual';State.searchKeyword='';render()">换个地址试试</button>
    </div>
  `}function j(){return`
    <div class="empty">
      <div class="empty-icon">😵</div>
      <h3>加载失败</h3>
      <p>${e.errorMsg||"请检查网络后重试"}</p>
      <button class="btn btn-primary" style="margin-top:16px" onclick="refreshData()">重新加载</button>
    </div>
  `}function J(){const t=e.errorMsg;return`
    <div class="hero">
      <div class="hero-icon">📍</div>
      <h1>手动输入地址</h1>
      <p>输入你的位置，周边5公里美食随你挑</p>
      ${t?`
        <div style="background:#fff3cd;color:#856404;border:1px solid #ffeeba;border-radius:8px;padding:10px 16px;margin:12px auto;max-width:400px;font-size:0.85rem">
          ⚠️ ${t}，已切换为手动输入
        </div>
      `:""}
      <div style="max-width:400px;margin:0 auto">
        <div class="search-box">
          <input class="search-input" id="manualAddrInput" placeholder="例如：上海市静安区共和新路" value="${e.searchKeyword||""}" onkeydown="if(event.key==='Enter')onManualSubmit()">
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
  `}function O(t){const a=[];t.forEach(s=>{s.type&&s.type.split("、").filter(Boolean).forEach(g=>a.push(g.trim()))});const o={};return a.forEach(s=>{o[s]=(o[s]||0)+1}),Object.entries(o).sort((s,g)=>g[1]-s[1]).slice(0,8).map(([s])=>s)}function Y(t){e.randomResult=t,e.phase="random",e.isLast=!1,e.poolReset=!1,m()}let $=null;function q(t,a=""){const o=document.getElementById("toast");o&&(o.textContent=t,o.className=`toast ${a}`,o.style.display="block",$&&clearTimeout($),$=setTimeout(()=>{o.style.display="none"},3e3))}window.State=e,window.onSearchSubmit=I,window.onCategoryChange=_,window.onRandomPick=N,window.onBackToList=B,window.onShowSimilar=D,window.showAddressModal=K,window.onManualSubmit=z,window.pickSingle=Y,window.showToast=q,window.refreshData=C,window.Locator=Location})();
