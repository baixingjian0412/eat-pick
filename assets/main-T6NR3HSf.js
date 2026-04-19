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
      "温州": { lat: 28, lng: 120.67, name: "温州市", dist: "鹿城区" }
    };
    function getCityRestaurants(cityName, distName, baseLat, baseLng) {
      const allRestaurants = {
        "北京": [
          { name: "全聚德烤鸭", address: distName + "建国路120号", type: "北京菜", rating: "4.6" },
          { name: "海底捞火锅", address: distName + "建国路88号", type: "火锅", rating: "4.8" },
          { name: "西贝莜面村", address: distName + "建国路92号", type: "西北菜", rating: "4.5" },
          { name: "绿茶餐厅", address: distName + "建国路100号", type: "江浙菜", rating: "4.3" },
          { name: "呷哺呷哺", address: distName + "建国路110号", type: "小火锅", rating: "4.2" },
          { name: "吉野家", address: distName + "建国路130号", type: "日式快餐", rating: "4.0" },
          { name: "眉州东坡", address: distName + "建国路95号", type: "川菜", rating: "4.4" },
          { name: "兰州拉面", address: distName + "建国路150号", type: "拉面", rating: "4.1" }
        ],
        "上海": [
          { name: "绿波廊", address: distName + "豫园路120号", type: "本帮菜", rating: "4.5" },
          { name: "南翔小笼", address: distName + "豫园路88号", type: "小吃", rating: "4.6" },
          { name: "小杨生煎", address: distName + "南京路步行街100号", type: "小吃", rating: "4.4" },
          { name: "光明邨大酒家", address: distName + "淮海路92号", type: "本帮菜", rating: "4.3" },
          { name: "红房子西菜馆", address: distName + "淮海路120号", type: "西餐", rating: "4.2" },
          { name: "上海老饭店", address: distName + "福佑路88号", type: "本帮菜", rating: "4.5" },
          { name: "杏花楼", address: distName + "福州路130号", type: "粤菜", rating: "4.3" },
          { name: "沈大成", address: distName + "南京路步行街150号", type: "小吃", rating: "4.1" }
        ],
        "广州": [
          { name: "陶陶居", address: distName + "第十甫路20号", type: "粤菜", rating: "4.5" },
          { name: "莲香楼", address: distName + "第十甫路48号", type: "粤菜", rating: "4.4" },
          { name: "点都德", address: distName + "花城大道88号", type: "粤菜", rating: "4.6" },
          { name: "广州酒家", address: distName + "文昌路92号", type: "粤菜", rating: "4.5" },
          { name: "炳胜品味", address: distName + "天河路120号", type: "粤菜", rating: "4.4" },
          { name: "惠食佳", address: distName + "东风东路130号", type: "粤菜", rating: "4.5" },
          { name: "银记肠粉", address: distName + "上九路88号", type: "小吃", rating: "4.3" },
          { name: "陈添记鱼皮", address: distName + "宝华路100号", type: "小吃", rating: "4.2" }
        ],
        "深圳": [
          { name: "润园四季椰子鸡", address: distName + "海岸城购物中心88号", type: "粤菜", rating: "4.5" },
          { name: "蔡澜越南粉", address: distName + "万象城120号", type: "东南亚菜", rating: "4.4" },
          { name: "日日香鹅肉饭店", address: distName + "皇庭广场92号", type: "潮汕菜", rating: "4.3" },
          { name: "粤集", address: distName + "壹方城100号", type: "粤菜", rating: "4.5" },
          { name: "鼎泰丰", address: distName + "华强北路130号", type: "江浙菜", rating: "4.4" },
          { name: "绿茶餐厅", address: distName + "东门步行街150号", type: "江浙菜", rating: "4.2" },
          { name: "八合里海记", address: distName + "华强南路88号", type: "火锅", rating: "4.6" },
          { name: "探鱼", address: distName + "欢乐海岸120号", type: "川菜", rating: "4.3" }
        ],
        "杭州": [
          { name: "外婆家", address: distName + "延安路200号", type: "杭帮菜", rating: "4.4" },
          { name: "绿茶餐厅", address: distName + "龙翔桥100号", type: "杭帮菜", rating: "4.3" },
          { name: "知味观", address: distName + "仁和路88号", type: "杭帮菜", rating: "4.5" },
          { name: "楼外楼", address: distName + "孤山路30号", type: "杭帮菜", rating: "4.6" },
          { name: "奎元馆", address: distName + "解放路120号", type: "面馆", rating: "4.4" },
          { name: "弄堂里", address: distName + "河坊街92号", type: "杭帮菜", rating: "4.3" },
          { name: "新白鹿", address: distName + "湖滨路130号", type: "杭帮菜", rating: "4.2" },
          { name: "杭帮菜博物馆餐厅", address: distName + "虎跑路150号", type: "杭帮菜", rating: "4.4" }
        ],
        "成都": [
          { name: "玉龙火锅", address: distName + "春熙路100号", type: "火锅", rating: "4.7" },
          { name: "小龙坎", address: distName + "春熙路西段88号", type: "火锅", rating: "4.5" },
          { name: "蜀大侠", address: distName + "建设路120号", type: "火锅", rating: "4.4" },
          { name: "降龙爪爪", address: distName + "太古里92号", type: "小吃", rating: "4.3" },
          { name: "钟水饺", address: distName + "总府路88号", type: "小吃", rating: "4.5" },
          { name: "龙抄手", address: distName + "春熙路北段100号", type: "小吃", rating: "4.4" },
          { name: "夫妻废片", address: distName + "宽窄巷子120号", type: "川菜", rating: "4.3" },
          { name: "陈麻婆豆腐", address: distName + "青羊宫路92号", type: "川菜", rating: "4.6" }
        ],
        "重庆": [
          { name: "珮姐老火锅", address: distName + "解放碑民权路28号", type: "火锅", rating: "4.8" },
          { name: "周师兄大刀腰片", address: distName + "解放碑邹容路88号", type: "火锅", rating: "4.5" },
          { name: "刘一手火锅", address: distName + "观音桥步行街100号", type: "火锅", rating: "4.4" },
          { name: "小面50强", address: distName + "解放碑好吃街120号", type: "小吃", rating: "4.3" },
          { name: "花市豌杂面", address: distName + "解放碑较场口88号", type: "小吃", rating: "4.5" },
          { name: "阿婆春卷", address: distName + "磁器口古镇92号", type: "小吃", rating: "4.2" },
          { name: "李子坝梁山鸡", address: distName + "李子坝正街100号", type: "川菜", rating: "4.4" },
          { name: "九九牛肉馆", address: distName + "南坪万达广场120号", type: "川菜", rating: "4.3" }
        ],
        "武汉": [
          { name: "户部巷蔡林记", address: distName + "户部巷88号", type: "小吃", rating: "4.4" },
          { name: "热干面大王", address: distName + "吉庆街100号", type: "小吃", rating: "4.3" },
          { name: "靓靓蒸虾", address: distName + "雪松路120号", type: "小龙虾", rating: "4.7" },
          { name: "巴厘龙虾", address: distName + "雪松路92号", type: "小龙虾", rating: "4.5" },
          { name: "老通城豆皮", address: distName + "大智路88号", type: "小吃", rating: "4.4" },
          { name: "四季美汤包", address: distName + "江汉路100号", type: "小吃", rating: "4.5" },
          { name: "武大食堂", address: distName + "武汉大学内", type: "食堂", rating: "4.1" },
          { name: "湖锦酒楼", address: distName + "八一路120号", type: "鄂菜", rating: "4.3" }
        ],
        "西安": [
          { name: "老孙家泡馍", address: distName + "东大街298号", type: "小吃", rating: "4.5" },
          { name: "同盛祥泡馍", address: distName + "东大街368号", type: "小吃", rating: "4.4" },
          { name: "回坊马二分店", address: distName + "回民街88号", type: "清真菜", rating: "4.3" },
          { name: "贾三灌汤包", address: distName + "回民街北段100号", type: "小吃", rating: "4.5" },
          { name: "biangbiang面", address: distName + "永兴坊120号", type: "小吃", rating: "4.4" },
          { name: "春发生葫芦头", address: distName + "南院门街88号", type: "小吃", rating: "4.3" },
          { name: "长安大牌档", address: distName + "长安路100号", type: "陕菜", rating: "4.4" },
          { name: "大厨小馆", address: distName + "翠华路92号", type: "陕菜", rating: "4.2" }
        ],
        "济南": [
          { name: "聚丰德", address: distName + "经二路118号", type: "鲁菜", rating: "4.4" },
          { name: "便宜坊", address: distName + "芙蓉街88号", type: "鲁菜", rating: "4.3" },
          { name: "草包包子", address: distName + "普利街100号", type: "小吃", rating: "4.5" },
          { name: "孟家扒鸡", address: distName + "共青团路88号", type: "鲁菜", rating: "4.3" },
          { name: "油旋张", address: distName + "芙蓉街92号", type: "小吃", rating: "4.2" },
          { name: "崔家烧饼", address: distName + "经四路120号", type: "小吃", rating: "4.1" },
          { name: "会仙楼", address: distName + "泉城路100号", type: "鲁菜", rating: "4.4" },
          { name: "卫巷菜馆", address: distName + "泉城路88号", type: "鲁菜", rating: "4.3" }
        ],
        "南京": [
          { name: "盐水鸭", address: distName + "夫子庙贡院街88号", type: "小吃", rating: "4.5" },
          { name: "奇芳阁", address: distName + "夫子庙贡院街100号", type: "小吃", rating: "4.4" },
          { name: "永和园", address: distName + "夫子庙瞻园路88号", type: "小吃", rating: "4.3" },
          { name: "狮王府", address: distName + "中山北路88号", type: "淮扬菜", rating: "4.4" },
          { name: "金陵饭店梅苑", address: distName + "汉中路88号", type: "淮扬菜", rating: "4.6" },
          { name: "小笼汤包", address: distName + "新街口100号", type: "小吃", rating: "4.4" },
          { name: "赤豆元宵", address: distName + "湖南路120号", type: "小吃", rating: "4.2" },
          { name: "鸭血粉丝汤", address: distName + "中央北路88号", type: "小吃", rating: "4.3" }
        ],
        "长沙": [
          { name: "文和友", address: distName + "杜甫江阁对面", type: "湘菜", rating: "4.6" },
          { name: "茶颜悦色", address: distName + "黄兴路步行街88号", type: "茶饮", rating: "4.5" },
          { name: "黑色经典臭豆腐", address: distName + "黄兴路100号", type: "小吃", rating: "4.4" },
          { name: "火宫殿", address: distName + "坡子街120号", type: "湘菜", rating: "4.3" },
          { name: "壹盏灯", address: distName + "人民西路88号", type: "湘菜", rating: "4.5" },
          { name: "辣椒炒肉", address: distName + "都正街100号", type: "湘菜", rating: "4.4" },
          { name: "盟重烧烤", address: distName + "冬瓜山92号", type: "烧烤", rating: "4.3" },
          { name: "老梅园大虾城", address: distName + "南门口120号", type: "湘菜", rating: "4.2" }
        ],
        "天津": [
          { name: "狗不理包子", address: distName + "和平路88号", type: "小吃", rating: "4.2" },
          { name: "耳朵眼炸糕", address: distName + "古文化街100号", type: "小吃", rating: "4.3" },
          { name: "十八街麻花", address: distName + "桂发祥大楼120号", type: "小吃", rating: "4.3" },
          { name: "津菜典藏", address: distName + "成都道88号", type: "津菜", rating: "4.4" },
          { name: "起士林", address: distName + "浙江路92号", type: "西餐", rating: "4.3" },
          { name: "石头门坎素包", address: distName + "南市食品街100号", type: "小吃", rating: "4.4" },
          { name: "上岗面馆", address: distName + "滨江道88号", type: "面馆", rating: "4.2" },
          { name: "老爆三", address: distName + "五大道120号", type: "津菜", rating: "4.3" }
        ],
        "青岛": [
          { name: "船歌鱼水饺", address: distName + "中山路88号", type: "海鲜", rating: "4.5" },
          { name: "劈柴院锅贴", address: distName + "江宁路100号", type: "小吃", rating: "4.3" },
          { name: "春和楼", address: distName + "中山路120号", type: "鲁菜", rating: "4.4" },
          { name: "排骨米饭", address: distName + "台东八路88号", type: "小吃", rating: "4.2" },
          { name: "王姐烧烤", address: distName + "中山路92号", type: "烧烤", rating: "4.4" },
          { name: "海肠捞饭", address: distName + "闽江路100号", type: "海鲜", rating: "4.5" },
          { name: "辣炒蛤蜊", address: distName + "营口路120号", type: "海鲜", rating: "4.3" },
          { name: "鲅鱼饺子", address: distName + "香港中路88号", type: "海鲜", rating: "4.4" }
        ]
      };
      if (!allRestaurants[cityName]) {
        const defaultRestaurants = [
          { name: "本地特色餐厅", address: distName + "中心路88号", type: "本帮菜", rating: "4.3" },
          { name: "家常菜馆", address: distName + "建设路100号", type: "家常菜", rating: "4.2" },
          { name: "火锅店", address: distName + "解放路120号", type: "火锅", rating: "4.4" },
          { name: "川菜馆", address: distName + "人民路88号", type: "川菜", rating: "4.3" },
          { name: "湘菜馆", address: distName + "和平路92号", type: "湘菜", rating: "4.2" },
          { name: "东北菜馆", address: distName + "胜利路100号", type: "东北菜", rating: "4.1" },
          { name: "烧烤店", address: distName + "文化路88号", type: "烧烤", rating: "4.3" },
          { name: "面馆", address: distName + "健康路100号", type: "面馆", rating: "4.2" }
        ];
        return defaultRestaurants;
      }
      return allRestaurants[cityName];
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
    function shuffleArray(array) {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }
    async function searchNearby(lat, lng, cityHint) {
      console.log("searchNearby called", lat, lng, cityHint);
      try {
        let cityData = null;
        if (cityHint) {
          cityData = matchCity(cityHint);
        }
        if (!cityData) {
          for (const [name, data] of Object.entries(CITIES)) {
            if (Math.abs(data.lat - lat) < 0.5 && Math.abs(data.lng - lng) < 0.5) {
              cityData = { city: name, ...data };
              break;
            }
          }
        }
        if (!cityData) {
          cityData = { city: "北京", ...CITIES["北京"] };
        }
        const restaurants = getCityRestaurants(cityData.city, cityData.dist, cityData.lat, cityData.lng);
        const shuffled = shuffleArray(restaurants);
        const result = shuffled.slice(0, 8).map((r, i) => ({
          ...r,
          id: `r${i}`,
          distance: `${(Math.random() * 3 + 0.5).toFixed(1)}km`,
          lat: cityData.lat + (Math.random() - 0.5) * 0.05,
          lng: cityData.lng + (Math.random() - 0.5) * 0.05
        }));
        console.log("searchNearby result", result);
        return result;
      } catch (e) {
        console.error("searchNearby error", e);
        throw e;
      }
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
          resolve({
            formattedAddress: cityName + distName + "中心路",
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
          const result2 = [{
            lat: cityData.lat + Math.random() * 0.02,
            lng: cityData.lng + Math.random() * 0.02,
            formattedAddress: cityData.name + cityData.dist,
            city: cityData.name
          }];
          console.log("geocode result (matched city)", result2);
          return result2;
        }
        const hash = address.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
        const lat = 30 + hash % 200 / 10;
        const lng = 100 + hash % 300 / 10;
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
      const filtered = getCityRestaurants("北京", "朝阳").filter(
        (r) => r.name.includes(keyword) || r.type.includes(keyword)
      );
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(filtered);
        }, 300);
      });
    }
    async function searchAddress(keyword) {
      const cityData = matchCity(keyword);
      return new Promise((resolve) => {
        setTimeout(() => {
          if (cityData) {
            resolve([{
              id: "addr1",
              name: cityData.name,
              address: cityData.name + cityData.dist,
              lat: cityData.lat,
              lng: cityData.lng,
              city: cityData.name
            }]);
          } else {
            resolve([{
              id: "addr1",
              name: keyword,
              address: keyword,
              lat: 31.23 + Math.random() * 10,
              lng: 121.47 + Math.random() * 10,
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
