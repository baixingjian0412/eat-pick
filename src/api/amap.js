/**
 * 高德地图 JS API 封装
 * 使用 Amap JS API v2.0 (内置服务，无需额外插件)
 */
const AMapWrapper = (() => {
  const RADIUS = 5000;
  let amapReady = null;

  // 等待 Amap 加载
  function waitForAMap() {
    if (amapReady) return amapReady;
    
    amapReady = new Promise((resolve) => {
      const check = () => {
        if (window.AMap) {
          resolve(window.AMap);
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
    
    return amapReady;
  }

  /**
   * 周边搜索 - 搜索附近餐厅
   */
  async function searchNearby(lat, lng) {
    const AMap = await waitForAMap();
    
    return new Promise((resolve, reject) => {
      // 使用 AMap.Geocoder 进行周边搜索
      // 注意：JS API 的 PlaceSearch 可能在某些版本中可用
      // 这里使用 Map 的 search 方法
      const MSearch = new AMap.PlaceSearch({
        city: '全国',
        citylimit: false,
        pageSize: 50,
        pageIndex: 1,
        extensions: 'all',
        radius: RADIUS,
        type: '餐饮服务'
      });

      MSearch.searchNearBy('', [lng, lat], RADIUS, (status, result) => {
        if (status === 'complete' && result.poiList) {
          const pois = result.poiList.pois || [];
          resolve(pois.map(poi => ({
            id: poi.id,
            name: poi.name,
            address: poi.address || '',
            type: poi.type || '',
            tel: poi.tel || '',
            rating: poi.bizExt?.rating || '',
            distance: poi.distance || '',
            photo: poi.photos?.[0]?.url || '',
            lat: poi.location ? poi.location.lat : '',
            lng: poi.location ? poi.location.lng : ''
          })));
        } else if (status === 'no_data') {
          resolve([]);
        } else {
          reject(new Error(result?.info || '获取周边美食失败'));
        }
      });
    });
  }

  /**
   * 逆地理编码 - 经纬度转地址
   */
  async function reverseGeocode(lat, lng, signal) {
    const AMap = await waitForAMap();
    
    return new Promise((resolve, reject) => {
      const geocoder = new AMap.Geocoder({
        extensions: 'base'
      });

      geocoder.getAddress([lng, lat], (status, result) => {
        if (status === 'complete' && result.regeocode) {
          const rc = result.regeocode;
          resolve({
            formattedAddress: rc.formattedAddress || '',
            city: rc.addressComponent?.city || rc.addressComponent?.province || ''
          });
        } else {
          reject(new Error(result?.info || '地址解析失败'));
        }
      });
    });
  }

  /**
   * 地理编码 - 地址转经纬度
   */
  async function geocode(address) {
    const AMap = await waitForAMap();
    
    return new Promise((resolve, reject) => {
      const geocoder = new AMap.Geocoder({
        extensions: 'base'
      });

      geocoder.getLocation(address, (status, result) => {
        if (status === 'complete' && result.geocodes && result.geocodes.length > 0) {
          const g = result.geocodes[0];
          resolve([{
            lat: g.location.lat,
            lng: g.location.lng,
            formattedAddress: g.formattedAddress || address,
            city: g.city || ''
          }]);
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
        type: '餐饮服务'
      });

      placeSearch.search(keyword, (status, result) => {
        if (status === 'complete' && result.poiList) {
          const pois = result.poiList.pois || [];
          resolve(pois.map(poi => ({
            id: poi.id,
            name: poi.name,
            address: poi.address || '',
            type: poi.type || '',
            tel: poi.tel || '',
            rating: poi.bizExt?.rating || '',
            distance: '',
            photo: poi.photos?.[0]?.url || '',
            lat: poi.location ? poi.location.lat : '',
            lng: poi.location ? poi.location.lng : ''
          })));
        } else if (status === 'no_data') {
          resolve([]);
        } else {
          reject(new Error(result?.info || '搜索失败'));
        }
      });
    });
  }

  /**
   * 关键词搜索地址
   */
  async function searchAddress(keyword) {
    const AMap = await waitForAMap();
    
    return new Promise((resolve, reject) => {
      const placeSearch = new AMap.PlaceSearch({
        city: '全国',
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
            lat: poi.location ? poi.location.lat : '',
            lng: poi.location ? poi.location.lng : '',
            city: poi.city || ''
          })));
        } else if (status === 'no_data') {
          resolve([]);
        } else {
          reject(new Error(result?.info || '地址搜索失败'));
        }
      });
    });
  }

  function getApiKey() {
    return '19dab2fef285a816ec8779e835984820';
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
