(function(){const a=document.createElement("link").relList;if(a&&a.supports&&a.supports("modulepreload"))return;for(const c of document.querySelectorAll('link[rel="modulepreload"]'))r(c);new MutationObserver(c=>{for(const p of c)if(p.type==="childList")for(const S of p.addedNodes)S.tagName==="LINK"&&S.rel==="modulepreload"&&r(S)}).observe(document,{childList:!0,subtree:!0});function o(c){const p={};return c.integrity&&(p.integrity=c.integrity),c.referrerPolicy&&(p.referrerPolicy=c.referrerPolicy),c.crossOrigin==="use-credentials"?p.credentials="include":c.crossOrigin==="anonymous"?p.credentials="omit":p.credentials="same-origin",p}function r(c){if(c.ep)return;c.ep=!0;const p=o(c);fetch(c.href,p)}})();const k=(()=>{let t=null,a="",o="";const r=15e3;async function c(n=!0){const s=Storage.getLocationCache();if(s&&s.lat&&s.lng)return t={lat:s.lat,lng:s.lng},a=s.address||"",o=s.city||"",{...t,address:a,city:o};const i=new AbortController,l=setTimeout(()=>i.abort(),r);try{const d=[];d.push(h(i.signal).then(v=>({source:"ip",data:v})).catch(v=>({source:"ip",error:v}))),navigator.geolocation&&d.push(w(n?2:0,i.signal).then(v=>({source:"gps",data:v})).catch(v=>({source:"gps",error:v})));let m=null;for(const v of d){const b=await v;if(b.data){m=b;break}}if(clearTimeout(l),i.abort(),!m||!m.data)throw new Error("LOCATION_FAILED");const u=m.data;return t={lat:u.lat,lng:u.lng},a=u.address||"",o=u.city||"",g(),{...t,address:a,city:o}}catch(d){throw clearTimeout(l),i.abort(),d.message==="PERMISSION_DENIED"?new Error("PERMISSION_DENIED"):d.message==="TIMEOUT"||d.message==="ABORTED"?new Error("TIMEOUT"):new Error("LOCATION_FAILED")}}async function p(n){const s=await AMap.geocode(n);if(!s||s.length===0)throw new Error("未找到匹配的地址，请尝试更具体的描述");const i=s[0];return t={lat:i.lat,lng:i.lng},a=i.formattedAddress||n,o=i.city||"",g(),{...t,address:a,city:o}}function S(){return t?{...t,address:a,city:o}:null}function y(){Storage.clearLocationCache(),t=null,a="",o=""}function g(){t&&Storage.saveLocationCache({lat:t.lat,lng:t.lng,address:a,city:o})}async function h(n){const i=await(await fetch(`https://restapi.amap.com/v3/ip?key=${AMap.getApiKey()}`,n?{signal:n}:{})).json();if(i.status!=="1"||!i.rectangle)throw new Error("IP定位无数据");const[l,d]=i.rectangle.split(";"),[m,u]=l.split(",").map(Number),[v,b]=d.split(",").map(Number),$=(u+b)/2,E=(m+v)/2,M=await AMap.reverseGeocode($,E,n);return{lat:$,lng:E,address:M.formattedAddress||i.province+i.city,city:i.city||""}}function w(n=1,s){return new Promise((i,l)=>{if(s!=null&&s.aborted){l(new Error("ABORTED"));return}function d(){if(s!=null&&s.aborted){l(new Error("ABORTED"));return}navigator.geolocation.getCurrentPosition(async m=>{const u=m.coords.latitude,v=m.coords.longitude;if(s!=null&&s.aborted){l(new Error("ABORTED"));return}try{const b=await Promise.race([AMap.reverseGeocode(u,v,s),new Promise(($,E)=>setTimeout(()=>E(new Error("GEO_TIMEOUT")),5e3))]);i({lat:u,lng:v,address:(b==null?void 0:b.formattedAddress)||"",city:(b==null?void 0:b.city)||""})}catch{i({lat:u,lng:v,address:"",city:""})}},m=>{if(s!=null&&s.aborted){l(new Error("ABORTED"));return}if(n>0){n--,setTimeout(d,1500);return}switch(m.code){case 1:l(new Error("PERMISSION_DENIED"));break;case 2:l(new Error("NETWORK_ERROR"));break;case 3:l(new Error("TIMEOUT_GPS"));break;default:l(new Error("GPS_FAILED"))}},{enableHighAccuracy:!1,timeout:1e4,maximumAge:3e5})}s&&s.addEventListener("abort",()=>l(new Error("ABORTED"))),d()})}return{get:c,search:p,getCurrent:S,clearCache:y}})();window.Location=k;const O=(()=>{const t={LOCATION:"eatpick_location",REMAINING:"eatpick_remaining_pool"};function a(){try{const y=localStorage.getItem(t.LOCATION);return y?JSON.parse(y):null}catch{return null}}function o(y){localStorage.setItem(t.LOCATION,JSON.stringify(y))}function r(){localStorage.removeItem(t.LOCATION),localStorage.removeItem(t.REMAINING)}function c(){try{const y=localStorage.getItem(t.REMAINING);return y?JSON.parse(y):[]}catch{return[]}}function p(y){localStorage.setItem(t.REMAINING,JSON.stringify(y))}function S(){localStorage.removeItem(t.REMAINING)}return{getLocationCache:a,saveLocationCache:o,clearLocationCache:r,getRemainingPool:c,saveRemainingPool:p,clearRemainingPool:S}})();window.Storage=O;const x=(()=>{let t=[],a=[];function o(g){a=[...g];const h=Storage.getRemainingPool();if(h&&h.length>0){const w=new Set(a.map(n=>n.id));t=h.filter(n=>w.has(n))}else t=a.map(w=>w.id);y(t)}function r(){if(t.length===0){t=a.map(i=>i.id),y(t),Storage.saveRemainingPool([]);const n=t.pop(),s=a.find(i=>i.id===n);return Storage.saveRemainingPool(t),{restaurant:s,isLast:!1,poolReset:!0}}const g=t.pop(),h=a.find(n=>n.id===g),w=t.length===0;return Storage.saveRemainingPool(t),{restaurant:h,isLast:w,poolReset:!1}}function c(g){return!g||g==="全部"?a:a.filter(h=>(h.type||"").split(";").some(n=>n.includes(g)))}function p(){return t.length}function S(){return a.length}function y(g){for(let h=g.length-1;h>0;h--){const w=Math.floor(Math.random()*(h+1));[g[h],g[w]]=[g[w],g[h]]}}return{init:o,pick:r,filterByCategory:c,getPoolSize:p,getTotalSize:S}})();window.RandomPicker=x;const C=(()=>{const t="19dab2fef285a816ec8779e835984820",a="https://restapi.amap.com/v3",r="050000";async function c(n,s){const i=new URLSearchParams({key:t,location:`${s},${n}`,radius:5e3,types:r,sortrule:"distance",offset:50,page:1,extensions:"all"}),d=await(await fetch(`${a}/place/around?${i}`)).json();if(d.status!=="1")throw new Error(d.info||"获取周边美食失败");return(d.pois||[]).map(g)}async function p(n,s,i){const l=new URLSearchParams({key:t,location:`${s},${n}`,extensions:"base"}),m=await(await fetch(`${a}/geocode/regeo?${l}`,i?{signal:i}:{})).json();if(m.status!=="1")throw new Error("地址解析失败");const u=m.regeocode||{};return{formattedAddress:u.formattedAddress||"",city:(u.addressComponent||{}).city||""}}async function S(n){const s=new URLSearchParams({key:t,address:n,city:""}),l=await(await fetch(`${a}/geocode/geo?${s}`)).json();return l.status!=="1"||!l.geocodes||l.geocodes.length===0?[]:l.geocodes.map(d=>{const[m,u]=d.location.split(",").map(Number);return{lat:u,lng:m,formattedAddress:d.formatted_address||d.address||n,city:d.city||""}})}async function y(n,s,i){const l=new URLSearchParams({key:t,location:`${s},${n}`,radius:5e3,types:r,keywords:i,sortrule:"distance",offset:50,page:1,extensions:"all"}),m=await(await fetch(`${a}/place/around?${l}`)).json();return m.status!=="1"?[]:(m.pois||[]).map(g)}function g(n){let s="";if(n.distance){const u=parseInt(n.distance);s=u>=1e3?`${(u/1e3).toFixed(1)}km`:`${u}m`}let i="";try{const u=typeof n.biz_ext=="string"?JSON.parse(n.biz_ext):n.biz_ext;u&&u.rating&&(i=u.rating)}catch{}let l="";n.photos&&n.photos.length>0&&(l=n.photos[0].url||"");let d=n.type||"";return d=d.split(";").map(u=>u.replace(/^\d{6}\|?/,"")).filter(Boolean).join("、"),{id:n.id,name:n.name,address:n.address||"",type:d,tel:n.tel||"",rating:i,distance:s,photo:l,lat:(n.location||"").split(",")[1]||"",lng:(n.location||"").split(",")[0]||""}}function h(){return t}function w(){return t!=="YOUR_AMAP_WEB_SERVICE_KEY"}return{searchNearby:c,reverseGeocode:p,geocode:S,searchByKeyword:y,getApiKey:h,isKeyConfigured:w}})();window.AMap=C;const e={phase:"init",location:null,restaurants:[],categories:[],selectedCategory:"全部",randomResult:null,isLast:!1,poolReset:!1,errorMsg:"",isLoading:!1,searchKeyword:""};document.addEventListener("DOMContentLoaded",async()=>{f();const t=Storage.getLocationCache();t&&t.lat&&t.lng?(e.phase="locating",f(),await I(t)):(e.phase="locating",f(),await P())});async function P(){try{e.location=await Location.get(!0),await I(e.location)}catch(t){e.errorMsg=t.message==="PERMISSION_DENIED"?"位置权限被拒绝":t.message==="TIMEOUT"?"定位超时（20秒内无法获取位置）":"定位失败",e.phase="manual",f()}}async function I(t){e.location=t,e.phase="loading",f();try{const a=await AMap.searchNearby(t.lat,t.lng);if(!a||a.length===0){e.phase="empty",f();return}e.restaurants=a,e.categories=T(a),RandomPicker.init(a),e.phase="list",f()}catch(a){e.phase="error",e.errorMsg=a.message||"加载失败，请重试",f()}}async function _(){e.isLoading||(e.isLoading=!0,e.selectedCategory="全部",e.randomResult=null,e.phase="loading",Storage.clearRemainingPool(),f(),await I(e.location),e.isLoading=!1)}async function R(t){if(t.trim()){e.isLoading=!0,e.searchKeyword=t.trim(),e.phase="loading",e.selectedCategory="全部",e.randomResult=null,f();try{const a=await Location.search(t.trim());e.location=a;const o=await AMap.searchNearby(a.lat,a.lng);if(!o||o.length===0){e.phase="empty",f();return}e.restaurants=o,e.categories=T(o),RandomPicker.init(o),e.phase="list"}catch(a){e.phase="error",e.errorMsg=a.message||"搜索失败"}e.isLoading=!1,f()}}function N(t){e.selectedCategory=t,f()}function B(){const{restaurant:t,isLast:a,poolReset:o}=RandomPicker.pick();e.randomResult=t,e.isLast=a,e.poolReset=o,e.phase="random",f()}function D(){e.phase="list",e.randomResult=null,f()}function K(){var t;e.randomResult&&(e.selectedCategory=e.randomResult.type.split("、")[0]||"全部",e.phase="list",f(),(t=document.querySelector(".restaurant-grid"))==null||t.scrollIntoView({behavior:"smooth",block:"start"}))}function z(){e.phase="manual",f()}function U(){const t=document.getElementById("manualAddrInput");t&&R(t.value)}function f(){const t=document.getElementById("app"),a=document.getElementById("randomBtnWrap");switch(a&&(a.style.display=e.phase==="list"&&e.restaurants.length>0?"block":"none"),G(),e.phase){case"init":case"locating":t.innerHTML=H();break;case"loading":t.innerHTML=W();break;case"list":t.innerHTML=A();break;case"random":t.innerHTML=j();break;case"empty":t.innerHTML=F();break;case"error":t.innerHTML=J();break;case"manual":t.innerHTML=Y();break}}function G(){const t=document.getElementById("locationBadge"),a=document.getElementById("locText");if(!(!t||!a))if(e.location&&e.location.address){t.style.display="flex";const o=e.location.address;a.textContent=o.length>18?o.substring(o.length-15):o,t.title=o}else e.phase==="locating"?(t.style.display="flex",a.textContent="定位中..."):t.style.display="none"}function H(t){return`
    <div class="hero">
      <div class="hero-icon">🍽️</div>
      <h1>帮你决定吃什么</h1>
      <p>自动定位获取周边3公里美食，一键随机选择，再也不纠结</p>
      
    </div>
  `}function W(){return`
    <div class="loading-container">
      <div class="spinner"></div>
      <div class="loading-text">${e.location?"搜索周边美食中...":"正在获取位置..."}</div>
    </div>
  `}function A(){const t=e.selectedCategory==="全部"?e.restaurants:e.restaurants.filter(r=>(r.type||"").split("、").some(p=>p.includes(e.selectedCategory))),a=RandomPicker.getPoolSize(),o=RandomPicker.getTotalSize();return`
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
      ${e.categories.map(r=>`<div class="cat-tab ${e.selectedCategory===r?"active":""}" onclick="onCategoryChange('${r}')">${r}</div>`).join("")}
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
      `:t.map((r,c)=>`
        <div class="restaurant-card" style="animation-delay:${c*40}ms" onclick="pickSingle(${JSON.stringify(r).replace(/'/g,"&#39;")})">
          ${r.photo?`<img class="card-img" src="${r.photo}" alt="${r.name}" loading="lazy" onerror="this.outerHTML='<div class=card-img-placeholder>🍜</div>'">`:'<div class="card-img-placeholder">🍜</div>'}
          <div class="card-body">
            <div class="card-name" title="${r.name}">${r.name}</div>
            <div class="card-info">
              ${r.rating?`<span class="rating">⭐ ${r.rating}</span>`:""}
              ${r.distance?`<span>📍 ${r.distance}</span>`:""}
            </div>
            <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">
              ${(r.type||"").split("、").filter(Boolean).slice(0,2).map(p=>`<span class="card-tag">${p}</span>`).join("")}
              ${r.address?`<span class="card-distance" title="${r.address}">${r.address.substring(0,12)}...</span>`:""}
            </div>
          </div>
        </div>
      `).join("")}
    </div>
  `}function j(){const t=e.randomResult;return t?`
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
  `:A()}function F(){return`
    <div class="empty">
      <div class="empty-icon">🍜</div>
      <h3>周边3公里暂无美食数据</h3>
      <p>可能是位置较偏，请尝试其他地址</p>
      <button class="btn btn-primary" style="margin-top:16px" onclick="State.phase='manual';State.searchKeyword='';render()">换个地址试试</button>
    </div>
  `}function J(){return`
    <div class="empty">
      <div class="empty-icon">😵</div>
      <h3>加载失败</h3>
      <p>${e.errorMsg||"请检查网络后重试"}</p>
      <button class="btn btn-primary" style="margin-top:16px" onclick="refreshData()">重新加载</button>
    </div>
  `}function Y(){const t=e.errorMsg;return`
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
        也可以 <a href="#" onclick="Location.get(true).then(()=>{State.location=Location.getCurrent();State.phase='locating';render();_loadWithLocation(State.location)}).catch(()=>{});return false" style="color:var(--primary)">重新获取定位</a>
      </p>
      <p style="margin-top:20px;font-size:0.75rem;color:var(--text-light)">
        💡 搜索地址后列表和随机按钮才会出现
      </p>
    </div>
  `}function T(t){const a=[];t.forEach(r=>{r.type&&r.type.split("、").filter(Boolean).forEach(c=>a.push(c.trim()))});const o={};return a.forEach(r=>{o[r]=(o[r]||0)+1}),Object.entries(o).sort((r,c)=>c[1]-r[1]).slice(0,8).map(([r])=>r)}function q(t){e.randomResult=t,e.phase="random",e.isLast=!1,e.poolReset=!1,f()}let L=null;function V(t,a=""){const o=document.getElementById("toast");o&&(o.textContent=t,o.className=`toast ${a}`,o.style.display="block",L&&clearTimeout(L),L=setTimeout(()=>{o.style.display="none"},3e3))}window.State=e;window.onSearchSubmit=R;window.onCategoryChange=N;window.onRandomPick=B;window.onBackToList=D;window.onShowSimilar=K;window.showAddressModal=z;window.onManualSubmit=U;window.pickSingle=q;window.showToast=V;window.refreshData=_;window.Location=Location;
