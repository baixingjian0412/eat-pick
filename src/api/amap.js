/**
 * 高德地图 JS API 封装
 * 
 * 使用高德 JS API (v2.0) 替代 REST API，解决浏览器跨域问题
 * 需要先加载插件：AMap.PlaceSearch, AMap.Geocoder
 */
const AMapWrapper = (() => {
  // 🔑 高德 JS API Key
  const JS_API_KEY = '19dab2fef285a816ec8779e835984820';
  const RADIUS = 5000; // 5公里

  // 缓存加载完成的 AMap 对象和插件
  let amapReady = null;

  // 等待 AMap 和插件加载完成
  function waitForAMap() {
    if (amapReady) return amapReady;
    
    amapReady = new Promise((resolve, reject) => {
      // 等待 AMap 加载
      const checkAMap = () => {
        if (!window.AMap) {
          setTimeout(checkAMap, 100);
          return;
        }
        
        // 加载必要的插件
        window.AMap.plugin(['AMap.PlaceSearch', 'AMap.Geocoder'], () => {
          resolve(window.AMap);
        });
      };
      
      checkAMap();
    });
    
    return amapReady;
  }

  /**
   * 周边搜索 - 搜索附近餐厅
   * 使用 AMap.PlaceSearch
   */
  async function searchNearby(lat, lng) {
    const AMap = await waitForAMap();
    
    return new Promise((resolve, reject) => {
      const placeSearch = new AMap.PlaceSearch({
        city: '全国',
        citylimit: false,
        pageSize: 50,
        pageIndex: 1,
        extensions: 'all',
        radius: RADIUS,
        type: '餐饮服务'
      });

      // 搜索附近餐厅
      placeSearch.searchNearBy('', [lng, lat], RADIUS, (status, result) => {
        if (status === 'complete' && result.poiList) {
          const pois = result.poiList.pois || [];
          resolve(pois.map(_formatPOI));
        } else if (status === 'no_data') {
          resolve([]);
        } else {
          reject(new Error(result && result.info ? result.info : '获取周边美食失败'));
        }
      });
    });
  }

  /**
   * 逆地理编码 - 经纬度转地址
   * 使用 AMap.Geocoder
   */
  async function reverseGeocode(lat, lng, signal) {
    const AMap = await waitForAMap();
    
    return new Promise((resolve, reject) => {
      const geocoder = new AMap.Geocoder({
        extensions: 'base'
      });

      // 如果有 abort signal，需要处理
      if (signal) {
        signal.addEventListener('abort', () => {
          reject(new Error('请求已取消'));
        });
      }

      geocoder.getAddress([lng, lat], (status, result) => {
        if (status === 'complete' && result.regeocode) {
          const rc = result.regeocode;
          resolve({
            formattedAddress: rc.formattedAddress || '',
            city: (rc.addressComponent && rc.addressComponent.city) || 
                  (rc.addressComponent && rc.addressComponent.province) || ''
          });
        } else {
          reject(new Error('地址解析失败'));
        }
      });
    });
  }

  /**
   * 地理编码 - 地址转经纬度
   * 使用 AMap.Geocoder
   */
  async function geocode(address) {
    const AMap = await waitForAMap();
    
    return new Promise((resolve, reject) => {
      const geocoder = new AMap.Geocoder({
        city: '', // 全国
        extensions: 'base'
      });

      geocoder.getLocation(address, (status, result) => {
        if (status === 'complete' && result.geocodes && result.geocodes.length > 0) {
          const results = result.geocodes.map(g => {
            const [lng, lat] = g.location.split(',').map(Number);
            return {
              lat,
              lng,
              formattedAddress: g.formattedAddress || g.address || address,
              city: g.city || ''
            };
          });
          resolve(results);
        } else {
          resolve([]);
        }
      });
    });
  }

  /**
   * 关键词搜索餐厅
   */
  async function searchByKeyword(lat, lng, keyword) {
    const AMap = await waitForAMap();
    
    return new Promise((resolve, reject) => {
      const placeSearch = new AMap.PlaceSearch({
        city: '全国',
        citylimit: false,
        pageSize: 50,
        pageIndex: 1,
        extensions: 'all',
        radius: RADIUS,
        type: '餐饮服务'
      });

      // 关键词搜索
      placeSearch.search(keyword, (status, result) => {
        if (status === 'complete' && result.poiList) {
          const pois = result.poiList.pois || [];
          resolve(pois.map(_formatPOI));
        } else if (status === 'no_data') {
          resolve([]);
        } else {
          reject(new Error(result && result.info ? result.info : '搜索失败'));
        }
      });
    });
  }

  /**
   * 关键词搜索地址（用于手动输入地址搜索）
   */
  async function searchAddress(keyword) {
    const AMap = await waitForAMap();
    
    return new Promise((resolve, reject) => {
      const placeSearch = new AMap.PlaceSearch({
        city: '', // 全国
        citylimit: false,
        pageSize: 20,
        pageIndex: 1,
        extensions: 'base'
      });

      placeSearch.search(keyword, (status, result) => {
        if (status === 'complete' && result.poiList) {
          const pois = result.poiList.pois || [];
          resolve(pois.map(poi => ({
            id: poi.id,
            name: poi.name,
            address: poi.address || '',
            lat: poi.location.lat,
            lng: poi.location.lng,
            city: poi.city || ''
          })));
        } else if (status === 'no_data') {
          resolve([]);
        } else {
          reject(new Error(result && result.info ? result.info : '地址搜索失败'));
        }
      });
    });
  }

  // 格式化 POI 数据
  function _formatPOI(poi) {
    // 提取距离
    let distance = '';
    if (poi.distance) {
      const d = parseInt(poi.distance);
      distance = d >= 1000 ? `${(d / 1000).toFixed(1)}km` : `${d}m`;
    }

    // 提取评分
    let rating = '';
    if (poi.rating) {
      rating = poi.rating;
    }

    // 图片
    let photo = '';
    if (poi.photos && poi.photos.length > 0) {
      photo = poi.photos[0].url || '';
    }

    // 标签/品类
    let type = poi.type || '';
    const typeParts = type.split(';');
    type = typeParts.map(t => t.replace(/^\d{6}\|?/, '')).filter(Boolean).join('、');

    return {
      id: poi.id,
      name: poi.name,
      address: poi.address || '',
      type: type,
      tel: poi.tel || '',
      rating: rating,
      distance: distance,
      photo: photo,
      lat: poi.location ? poi.location.lat : '',
      lng: poi.location ? poi.location.lng : ''
    };
  }

  function getApiKey() {
    return JS_API_KEY;
  }

  function isKeyConfigured() {
    return JS_API_KEY !== '';
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

// 暴露全局变量
window.AMap = AMapWrapper;
