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
      console.log("Locator.search called", keyword);
      try {
        const result = await AMapAPI.geocode(keyword);
        console.log("geocode result", result);
        if (!result || result.length === 0) {
          throw new Error("未找到匹配的地址，请尝试更具体的描述");
        }
        const item = result[0];
        currentPos = { lat: item.lat, lng: item.lng };
        currentAddr = item.formattedAddress || keyword;
        currentCity = item.city || "";
        _saveCache();
        return { ...currentPos, address: currentAddr, city: currentCity };
      } catch (e) {
        console.error("Locator.search error", e);
        throw e;
      }
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
      const centerLat = 39.91;
      const centerLng = 116.44;
      const geo = await AMapAPI.reverseGeocode(centerLat, centerLng, signal);
      return {
        lat: centerLat,
        lng: centerLng,
        address: geo.formattedAddress || "北京市朝阳区",
        city: "北京市"
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
    const CITIES = {
      "北京": { lat: 39.91, lng: 116.39, name: "北京市", dist: "朝阳区" },
      "上海": { lat: 31.23, lng: 121.47, name: "上海市", dist: "黄浦区" },
      "广州": { lat: 23.13, lng: 113.26, name: "广州市", dist: "天河区" },
      "深圳": { lat: 22.55, lng: 114.06, name: "深圳市", dist: "南山区" },
      "杭州": { lat: 30.27, lng: 120.15, name: "杭州市", dist: "西湖区" },
      "南京": { lat: 32.06, lng: 118.79, name: "南京市", dist: "玄武区" },
      "成都": { lat: 30.67, lng: 104.07, name: "成都市", dist: "锦江区" },
      "武汉": { lat: 30.58, lng: 114.29, name: "武汉市", dist: "武昌区" },
      "西安": { lat: 34.27, lng: 108.95, name: "西安市", dist: "雁塔区" },
      "重庆": { lat: 29.56, lng: 106.55, name: "重庆市", dist: "渝中区" },
      "天津": { lat: 39.13, lng: 117.2, name: "天津市", dist: "和平区" },
      "苏州": { lat: 31.3, lng: 120.59, name: "苏州市", dist: "姑苏区" },
      "济南": { lat: 36.67, lng: 116.99, name: "济南市", dist: "历下区" },
      "青岛": { lat: 36.07, lng: 120.37, name: "青岛市", dist: "市南区" },
      "长沙": { lat: 28.23, lng: 112.94, name: "长沙市", dist: "岳麓区" },
      "郑州": { lat: 34.77, lng: 113.63, name: "郑州市", dist: "金水区" },
      "沈阳": { lat: 41.8, lng: 123.43, name: "沈阳市", dist: "和平区" },
      "大连": { lat: 38.91, lng: 121.62, name: "大连市", dist: "中山区" },
      "福州": { lat: 26.08, lng: 119.3, name: "福州市", dist: "鼓楼区" },
      "厦门": { lat: 24.48, lng: 118.09, name: "厦门市", dist: "思明区" },
      "南昌": { lat: 28.68, lng: 115.86, name: "南昌市", dist: "东湖区" },
      "昆明": { lat: 25.04, lng: 102.71, name: "昆明市", dist: "五华区" },
      "贵阳": { lat: 26.65, lng: 106.63, name: "贵阳市", dist: "南明区" },
      "石家庄": { lat: 38.04, lng: 114.48, name: "石家庄市", dist: "长安区" },
      "合肥": { lat: 31.86, lng: 117.28, name: "合肥市", dist: "蜀山区" },
      "太原": { lat: 37.87, lng: 112.53, name: "太原市", dist: "迎泽区" },
      "兰州": { lat: 36.06, lng: 103.83, name: "兰州市", dist: "城关区" },
      "哈尔滨": { lat: 45.8, lng: 126.53, name: "哈尔滨市", dist: "南岗区" },
      "长春": { lat: 43.88, lng: 125.32, name: "长春市", dist: "朝阳区" },
      "乌鲁木齐": { lat: 43.83, lng: 87.62, name: "乌鲁木齐市", dist: "天山区" },
      "呼和浩特": { lat: 40.84, lng: 111.73, name: "呼和浩特市", dist: "新城区" },
      "拉萨": { lat: 29.65, lng: 91.17, name: "拉萨市", dist: "城关区" },
      "南宁": { lat: 22.82, lng: 108.37, name: "南宁市", dist: "青秀区" },
      "海口": { lat: 20.03, lng: 110.35, name: "海口市", dist: "龙华区" },
      "宁波": { lat: 29.87, lng: 121.55, name: "宁波市", dist: "海曙区" },
      "无锡": { lat: 31.49, lng: 120.3, name: "无锡市", dist: "梁溪区" },
      "佛山": { lat: 23.03, lng: 113.12, name: "佛山市", dist: "禅城区" },
      "东莞": { lat: 23.05, lng: 113.75, name: "东莞市", dist: "南城区" },
      "珠海": { lat: 22.27, lng: 113.58, name: "珠海市", dist: "香洲区" },
      "温州": { lat: 28, lng: 120.67, name: "温州市", dist: "鹿城区" },
      "正定": { lat: 38.14, lng: 114.57, name: "石家庄市", dist: "正定县" },
      "雄安": { lat: 38.97, lng: 115.93, name: "保定市", dist: "雄安新区" },
      "廊坊": { lat: 39.52, lng: 116.68, name: "廊坊市", dist: "广阳区" },
      "保定": { lat: 38.87, lng: 115.48, name: "保定市", dist: "竞秀区" },
      "唐山": { lat: 39.63, lng: 118.18, name: "唐山市", dist: "路北区" },
      "沧州": { lat: 38.3, lng: 116.83, name: "沧州市", dist: "运河区" },
      "邯郸": { lat: 36.61, lng: 114.54, name: "邯郸市", dist: "丛台区" },
      "邢台": { lat: 37.07, lng: 114.5, name: "邢台市", dist: "襄都区" },
      "张家口": { lat: 40.77, lng: 114.88, name: "张家口市", dist: "桥西区" },
      "承德": { lat: 40.97, lng: 117.94, name: "承德市", dist: "双桥区" },
      "衡水": { lat: 37.74, lng: 115.67, name: "衡水市", dist: "桃城区" }
    };
    const FOOD_TYPES = [
      "川菜",
      "湘菜",
      "粤菜",
      "鲁菜",
      "苏菜",
      "浙菜",
      "闽菜",
      "徽菜",
      "东北菜",
      "西北菜",
      "云南菜",
      "贵州菜",
      "清真菜",
      "家常菜",
      "火锅",
      "串串",
      "麻辣烫",
      "冒菜",
      "烧烤",
      "烤鱼",
      "烤肉",
      "日料",
      "韩料",
      "东南亚菜",
      "西餐",
      "意餐",
      "法餐",
      "美式",
      "快餐",
      "汉堡",
      "披萨",
      "炸鸡",
      "三明治",
      "面馆",
      "饺子",
      "包子",
      "馒头",
      "粥店",
      "粉面",
      "小吃",
      "卤味",
      "凉皮",
      "凉面",
      "煎饼",
      "手抓饼",
      "鸡蛋灌饼",
      "甜品",
      "奶茶",
      "咖啡",
      "蛋糕",
      "烘焙",
      "海鲜",
      "自助餐",
      "私房菜",
      "农家菜",
      "食堂"
    ];
    const NAME_PREFIX = [
      "老",
      "小",
      "大",
      "新",
      "真",
      "金",
      "好",
      "正",
      "古",
      "胖",
      "阿",
      "张",
      "王",
      "李",
      "刘",
      "陈",
      "杨",
      "赵",
      "周",
      "吴"
    ];
    const NAME_SUFFIX = [
      "记",
      "家",
      "嫂",
      "哥",
      "婆",
      "爷",
      "婶",
      "叔",
      "妹",
      "仔",
      "坊",
      "斋",
      "居",
      "轩",
      "阁",
      "堂",
      "馆",
      "楼",
      "院",
      "庄"
    ];
    const STREET_NAMES = [
      "建设路",
      "人民路",
      "解放路",
      "文化路",
      "和平路",
      "胜利路",
      "中山路",
      "长江路",
      "黄河路",
      "北京路",
      "上海路",
      "南京路",
      "五四路",
      "六安路",
      "七里路",
      "八一路",
      "九华路",
      "十全路",
      "经一路",
      "纬一路",
      "纬二路",
      "纬三路",
      "经二路",
      "经三路",
      "工业路",
      "商业街",
      "美食街",
      "步行街",
      "商业街",
      "学府路",
      "科技路",
      "创新路",
      "光明路",
      "振兴路",
      "友谊路",
      "团结路",
      "幸福路",
      "健康路",
      "平安路",
      "新华路",
      "新兴路",
      "朝阳路",
      "东风路",
      "西宁路",
      "南门路",
      "北门路",
      "中心路",
      "广场路",
      "公园路",
      "园林路",
      "翠微路",
      "玉泉路",
      "金水路",
      "银山路"
    ];
    function seededRandom(seed, index = 0) {
      const x = Math.sin(seed * 9301 + index * 49297 + 233720) * 9301;
      return x - Math.floor(x);
    }
    function hashCode(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      return Math.abs(hash);
    }
    function extractAreaName(address, cityData) {
      const addr = address.trim();
      const cityDistMatch = addr.match(/^(.*?市)?(.*?(?:区|县|镇|乡|新区|开发区))$/);
      if (cityDistMatch && cityDistMatch[2]) {
        return (cityDistMatch[1] || "") + cityDistMatch[2];
      }
      if (addr === cityData.city || addr === cityData.name) {
        if (cityData.name.includes(cityData.city)) {
          return cityData.name;
        } else {
          return cityData.dist;
        }
      }
      if (addr.includes(cityData.city)) {
        if (cityData.name.includes(cityData.city)) {
          return cityData.name;
        } else {
          return cityData.dist;
        }
      }
      return cityData.name;
    }
    function generateRestaurant(lat, lng, seed, index, areaName) {
      const r = seededRandom(seed, index);
      const offsetLat = (r - 0.5) * 0.06;
      const offsetLng = (seededRandom(seed, index + 1e3) - 0.5) * 0.08;
      const rLat = lat + offsetLat;
      const rLng = lng + offsetLng;
      const distKm = Math.sqrt(offsetLat * offsetLat + offsetLng * offsetLng) * 111;
      const streetIdx = Math.floor(seededRandom(seed, index + 1) * STREET_NAMES.length);
      const num = Math.floor(seededRandom(seed, index + 2) * 200 + 1);
      const street = STREET_NAMES[streetIdx];
      const typeIdx = Math.floor(seededRandom(seed, index + 3) * FOOD_TYPES.length);
      const type = FOOD_TYPES[typeIdx];
      const preIdx = Math.floor(seededRandom(seed, index + 4) * NAME_PREFIX.length);
      const surIdx = Math.floor(seededRandom(seed, index + 5) * NAME_SUFFIX.length);
      const surNameIdx = Math.floor(seededRandom(seed, index + 8) * NAME_SUFFIX.length);
      const name = NAME_PREFIX[preIdx] + NAME_SUFFIX[surIdx] + type + NAME_SUFFIX[surNameIdx];
      const rating = (3.5 + seededRandom(seed, index + 6) * 1.4).toFixed(1);
      const price = Math.floor(15 + seededRandom(seed, index + 7) * 150);
      const distance = distKm < 0.5 ? `${Math.round(distKm * 1e3)}m` : `${distKm.toFixed(1)}km`;
      const address = areaName ? areaName + street + num + "号" : street + num + "号";
      return {
        id: `r${seed}_${index}`,
        name,
        address,
        type,
        rating,
        price,
        distance,
        lat: rLat,
        lng: rLng
      };
    }
    function matchCity(keyword) {
      if (!keyword) return null;
      const kw = keyword.trim();
      for (const [city, data] of Object.entries(CITIES)) {
        if (kw.includes(city)) return { city, ...data };
      }
      const provinceMap = {
        "北京市": CITIES["北京"],
        "天津市": CITIES["天津"],
        "上海市": CITIES["上海"],
        "重庆市": CITIES["重庆"],
        "河北省": CITIES["石家庄"],
        "山西省": CITIES["太原"],
        "辽宁省": CITIES["沈阳"],
        "吉林省": CITIES["长春"],
        "黑龙江省": CITIES["哈尔滨"],
        "江苏省": CITIES["南京"],
        "浙江省": CITIES["杭州"],
        "安徽省": CITIES["合肥"],
        "福建省": CITIES["福州"],
        "江西省": CITIES["南昌"],
        "山东省": CITIES["济南"],
        "河南省": CITIES["郑州"],
        "湖北省": CITIES["武汉"],
        "湖南省": CITIES["长沙"],
        "广东省": CITIES["广州"],
        "海南省": CITIES["海口"],
        "四川省": CITIES["成都"],
        "贵州省": CITIES["贵阳"],
        "云南省": CITIES["昆明"],
        "陕西省": CITIES["西安"],
        "甘肃省": CITIES["兰州"],
        "青海省": CITIES["兰州"],
        "内蒙古": CITIES["呼和浩特"],
        "广西": CITIES["南宁"],
        "西藏": CITIES["拉萨"],
        "宁夏": CITIES["兰州"],
        "新疆": CITIES["乌鲁木齐"],
        "香港": CITIES["深圳"],
        "澳门": CITIES["珠海"],
        "台湾": null
      };
      for (const [province, data] of Object.entries(provinceMap)) {
        if (kw.includes(province)) return data;
      }
      return null;
    }
    async function searchNearby(lat, lng, cityHint) {
      console.log("searchNearby called (real API)", lat, lng, cityHint);
      return new Promise((resolve, reject) => {
        if (typeof AMap === "undefined") {
          console.error("AMap not loaded, using mock");
          resolve(mockSearchNearby(lat, lng, cityHint));
          return;
        }
        AMap.plugin(["AMap.PlaceSearch"], function() {
          let city = cityHint || "全国";
          const cityMatch = city.match(/^(.+?(?:市|省|自治区))/);
          if (cityMatch) {
            city = cityMatch[1];
          }
          console.log("PlaceSearch city:", city);
          const placeSearch = new AMap.PlaceSearch({
            city,
            citylimit: false,
            pageSize: 20,
            pageIndex: 1,
            type: "餐饮服务",
            extensions: "all"
          });
          placeSearch.searchNearBy("", lat, lng, 5e3, function(status, result) {
            if (status === "complete" && result.poiList && result.poiList.pois) {
              const pois = result.poiList.pois;
              const restaurants = pois.map((poi, index) => {
                const poiLocation = poi.location;
                const distKm = getDistance(lat, lng, poiLocation.getLat(), poiLocation.getLng());
                return {
                  id: poi.id || `r${index}`,
                  name: poi.name,
                  address: poi.address || poi.name,
                  type: poi.type || "餐饮",
                  rating: poi.rating ? parseFloat(poi.rating).toFixed(1) : (3.5 + Math.random() * 1).toFixed(1),
                  price: poi.shopinfo && poi.shopinfo.price ? parseInt(poi.shopinfo.price) : Math.floor(15 + Math.random() * 80),
                  distance: distKm < 1 ? `${Math.round(distKm * 1e3)}m` : `${distKm.toFixed(1)}km`,
                  lat: poiLocation.getLat(),
                  lng: poiLocation.getLng()
                };
              });
              restaurants.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
              console.log("searchNearby result (real)", restaurants.length, "restaurants");
              resolve(restaurants);
            } else {
              console.log("PlaceSearch failed, using mock:", status, result);
              resolve(mockSearchNearby(lat, lng, cityHint));
            }
          });
        });
      });
    }
    function getDistance(lat1, lng1, lat2, lng2) {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    }
    function mockSearchNearby(lat, lng, cityHint) {
      console.log("mockSearchNearby called", lat, lng, cityHint);
      const areaName = cityHint || "";
      const seed = hashCode(`${lat.toFixed(4)}_${lng.toFixed(4)}_${areaName}`);
      const restaurants = [];
      for (let i = 0; i < 20; i++) {
        const r = seededRandom(seed, i);
        const offsetLat = (r - 0.5) * 0.06;
        const offsetLng = (seededRandom(seed, i + 1e3) - 0.5) * 0.08;
        const rLat = lat + offsetLat;
        const rLng = lng + offsetLng;
        const distKm = Math.sqrt(offsetLat * offsetLat + offsetLng * offsetLng) * 111;
        const streetIdx = Math.floor(seededRandom(seed, i + 1) * STREET_NAMES.length);
        const num = Math.floor(seededRandom(seed, i + 2) * 200 + 1);
        const street = STREET_NAMES[streetIdx];
        const typeIdx = Math.floor(seededRandom(seed, i + 3) * FOOD_TYPES.length);
        const type = FOOD_TYPES[typeIdx];
        const preIdx = Math.floor(seededRandom(seed, i + 4) * NAME_PREFIX.length);
        const surIdx = Math.floor(seededRandom(seed, i + 5) * NAME_SUFFIX.length);
        const surNameIdx = Math.floor(seededRandom(seed, i + 8) * NAME_SUFFIX.length);
        const name = NAME_PREFIX[preIdx] + NAME_SUFFIX[surIdx] + type + NAME_SUFFIX[surNameIdx];
        const rating = (3.5 + seededRandom(seed, i + 6) * 1.4).toFixed(1);
        const price = Math.floor(15 + seededRandom(seed, i + 7) * 150);
        const distance = distKm < 0.5 ? `${Math.round(distKm * 1e3)}m` : `${distKm.toFixed(1)}km`;
        const address = areaName ? areaName + street + num + "号" : street + num + "号";
        restaurants.push({
          id: `r${seed}_${i}`,
          name,
          address,
          type,
          rating,
          price,
          distance,
          lat: rLat,
          lng: rLng
        });
      }
      restaurants.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
      console.log("mockSearchNearby result", restaurants.length, "restaurants");
      return restaurants;
    }
    async function reverseGeocode(lat, lng, signal) {
      return new Promise((resolve) => {
        setTimeout(() => {
          let cityName = "北京市";
          let distName = "朝阳区";
          for (const [name, data] of Object.entries(CITIES)) {
            if (Math.abs(data.lat - lat) < 0.5 && Math.abs(data.lng - lng) < 0.5) {
              cityName = data.name;
              distName = data.dist;
              break;
            }
          }
          const seed = hashCode(`${lat.toFixed(4)}_${lng.toFixed(4)}`);
          const streetIdx = Math.floor(seededRandom(seed, 0) * STREET_NAMES.length);
          resolve({
            formattedAddress: cityName + distName + STREET_NAMES[streetIdx],
            city: cityName
          });
        }, 200);
      });
    }
    async function geocode(address) {
      console.log("geocode called", address);
      try {
        const cityData = matchCity(address);
        if (cityData) {
          const seed2 = hashCode(address);
          const lat2 = cityData.lat + (seededRandom(seed2, 0) - 0.5) * 0.1;
          const lng2 = cityData.lng + (seededRandom(seed2, 1) - 0.5) * 0.12;
          const areaName = extractAreaName(address, cityData);
          const cityName = cityData.name || "";
          const result2 = [{
            lat: lat2,
            lng: lng2,
            formattedAddress: address,
            city: areaName,
            cityCode: cityName
            // 添加城市代码供 PlaceSearch 使用
          }];
          console.log("geocode result (city matched)", result2);
          return result2;
        }
        const seed = hashCode(address);
        const lat = 20 + seed % 300 / 10;
        const lng = 80 + seed * 7 % 400 / 10;
        const result = [{
          lat,
          lng,
          formattedAddress: address,
          city: ""
        }];
        console.log("geocode result (hash)", result);
        return result;
      } catch (e) {
        console.error("geocode error", e);
        throw e;
      }
    }
    async function searchByKeyword(lat, lng, keyword) {
      const cityData = matchCity(keyword);
      const areaName = cityData ? cityData.name.includes(cityData.city) ? cityData.name : cityData.dist : "";
      const seed = hashCode(`${lat.toFixed(4)}_${lng.toFixed(4)}_kw_${keyword}`);
      const results = [];
      for (let i = 0; i < 6; i++) {
        results.push(generateRestaurant(lat, lng, seed, i, areaName));
      }
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(results);
        }, 300);
      });
    }
    async function searchAddress(keyword) {
      const cityData = matchCity(keyword);
      return new Promise((resolve) => {
        setTimeout(() => {
          if (cityData) {
            const seed = hashCode(keyword);
            const lat = cityData.lat + (seededRandom(seed, 0) - 0.5) * 0.1;
            const lng = cityData.lng + (seededRandom(seed, 1) - 0.5) * 0.12;
            const areaName = extractAreaName(keyword, cityData);
            resolve([{
              id: "addr1",
              name: areaName,
              address: areaName,
              lat,
              lng,
              city: areaName
            }]);
          } else {
            const seed = hashCode(keyword);
            const lat = 20 + seed % 300 / 10;
            const lng = 80 + seed * 7 % 400 / 10;
            resolve([{
              id: "addr1",
              name: keyword,
              address: keyword,
              lat,
              lng,
              city: ""
            }]);
          }
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
    State.phase = "manual";
    render();
  });
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
      State.errorMsg = "加载失败: " + (err.message || err.toString() || "未知错误");
      console.error("加载错误:", err);
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
      const loc = await Promise.race([
        Locator.search(keyword.trim()),
        new Promise((_, reject) => setTimeout(() => reject(new Error("搜索地址超时")), 5e3))
      ]);
      console.log("地址定位成功", loc);
      State.location = loc;
      const data = await Promise.race([
        AMapAPI.searchNearby(loc.lat, loc.lng, loc.city),
        new Promise((_, reject) => setTimeout(() => reject(new Error("搜索餐厅超时")), 5e3))
      ]);
      console.log("餐厅搜索成功", data.length, "条");
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
      console.error("搜索错误:", err);
      State.phase = "error";
      State.errorMsg = "搜索失败: " + (err.message || err.toString() || "未知错误");
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
