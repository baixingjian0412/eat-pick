/**
 * 高德地图 API 封装
 * 
 * 使用 CORS 代理解决浏览器跨域问题
 * 代理服务：corsproxy.io
 */
const AMapWrapper = (() => {
  // 🔑 高德 REST API Key
  const API_KEY = '19dab2fef285a816ec8779e835984820';
  const RADIUS = 5000; // 5公里
  
  // CORS 代理（使用公共代理服务）
  const CORS_PROXY = 'https://corsproxy.io/?';

  /**
   * 带 CORS 代理的 fetch
   */
  async function _fetchWithProxy(url) {
    const proxyUrl = CORS_PROXY + encodeURIComponent(url);
    const resp = await fetch(proxyUrl);
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }
    return resp.json();
  }

  /**
   * 周边搜索 - 搜索附近餐厅
   */
  async function searchNearby(lat, lng) {
    const url = `https://restapi.amap.com/v3/place/around?key=${API_KEY}&location=${lng},${lat}&radius=${RADIUS}&types=050000&offset=20&page=1&extensions=all`;
    const data = await _fetchWithProxy(url);
    
    if (data.status !== '1') {
      throw new Error(data.info || '获取周边美食失败');
    }
    
    const pois = data.pois || [];
    if (pois.length === 0) {
      return [];
    }
    
    return pois.map(poi => {
      // 提取距离
      let distance = '';
      if (poi.distance) {
        const d = parseInt(poi.distance);
        distance = d >= 1000 ? `${(d / 1000).toFixed(1)}km` : `${d}m`;
      }
      
      // 提取评分
      let rating = '';
      
      // 图片
      let photo = '';
      if (poi.photos && poi.photos.length > 0) {
        photo = poi.photos[0].url || '';
      }

      return {
        id: poi.id,
        name: poi.name,
        address: poi.address || '',
        type: poi.type || '',
        tel: poi.tel || '',
        rating: rating,
        distance: distance,
        photo: photo,
        lat: poi.location ? poi.location.split(',')[1] : '',
        lng: poi.location ? poi.location.split(',')[0] : ''
      };
    });
  }

  /**
   * 逆地理编码 - 经纬度转地址
   */
  async function reverseGeocode(lat, lng, signal) {
    const url = `https://restapi.amap.com/v3/geocode/regeo?key=${API_KEY}&location=${lng},${lat}&extensions=base`;
    
    // 如果有 signal，处理 abort
    if (signal) {
      const controller = new AbortController();
      signal.addEventListener('abort', () => controller.abort());
    }
    
    const data = await _fetchWithProxy(url);
    
    if (data.status !== '1' || !data.regeocode) {
      throw new Error('地址解析失败');
    }
    
    const rc = data.regeocode;
    return {
      formattedAddress: rc.formattedAddress || '',
      city: (rc.addressComponent && rc.addressComponent.city) || 
            (rc.addressComponent && rc.addressComponent.province) || ''
    };
  }

  /**
   * 地理编码 - 地址转经纬度
   */
  async function geocode(address) {
    const url = `https://restapi.amap.com/v3/geocode/geo?key=${API_KEY}&address=${encodeURIComponent(address)}&city=&extensions=base`;
    const data = await _fetchWithProxy(url);
    
    if (data.status !== '1' || !data.geocodes || data.geocodes.length === 0) {
      return [];
    }
    
    return data.geocodes.map(g => {
      const [lng, lat] = g.location.split(',').map(Number);
      return {
        lat,
        lng,
        formattedAddress: g.formattedAddress || g.address || address,
        city: g.city || ''
      };
    });
  }

  /**
   * 关键词搜索餐厅
   */
  async function searchByKeyword(lat, lng, keyword) {
    const url = `https://restapi.amap.com/v3/place/text?key=${API_KEY}&keywords=${encodeURIComponent(keyword)}&types=050000&city=${encodeURIComponent('')}&citylimit=false&offset=20&page=1&extensions=all`;
    const data = await _fetchWithProxy(url);
    
    if (data.status !== '1') {
      throw new Error(data.info || '搜索失败');
    }
    
    const pois = data.pois || [];
    return pois.map(poi => ({
      id: poi.id,
      name: poi.name,
      address: poi.address || '',
      type: poi.type || '',
      tel: poi.tel || '',
      rating: '',
      distance: '',
      photo: '',
      lat: poi.location ? poi.location.split(',')[1] : '',
      lng: poi.location ? poi.location.split(',')[0] : ''
    }));
  }

  /**
   * 关键词搜索地址
   */
  async function searchAddress(keyword) {
    const url = `https://restapi.amap.com/v3/place/text?key=${API_KEY}&keywords=${encodeURIComponent(keyword)}&types=&city=&citylimit=false&offset=20&page=1&extensions=base`;
    const data = await _fetchWithProxy(url);
    
    if (data.status !== '1') {
      throw new Error(data.info || '地址搜索失败');
    }
    
    const pois = data.pois || [];
    return pois.map(poi => ({
      id: poi.id,
      name: poi.name,
      address: poi.address || '',
      lat: poi.location ? poi.location.split(',')[1] : '',
      lng: poi.location ? poi.location.split(',')[0] : '',
      city: poi.city || ''
    }));
  }

  function getApiKey() {
    return API_KEY;
  }

  function isKeyConfigured() {
    return API_KEY !== '';
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
window.AMapAPI = AMapWrapper;
