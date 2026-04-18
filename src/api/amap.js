/**
 * 高德地图 API 封装
 * 
 * 使用 JSONP 解决浏览器跨域问题
 */
const AMapWrapper = (() => {
  // 🔑 高德 REST API Key
  const API_KEY = '19dab2fef285a816ec8779e835984820';
  const RADIUS = 5000;

  /**
   * JSONP 请求
   */
  function jsonp(url) {
    return new Promise((resolve, reject) => {
      const callbackName = 'jsonp_' + Math.random().toString(36).substr(2, 9);
      const script = document.createElement('script');
      
      window[callbackName] = (data) => {
        delete window[callbackName];
        script.remove();
        resolve(data);
      };
      
      script.onerror = () => {
        delete window[callbackName];
        script.remove();
        reject(new Error('JSONP请求失败'));
      };
      
      const separator = url.includes('?') ? '&' : '?';
      script.src = url + separator + 'callback=' + callbackName;
      document.head.appendChild(script);
    });
  }

  /**
   * 周边搜索 - 搜索附近餐厅
   */
  async function searchNearby(lat, lng) {
    const url = `https://restapi.amap.com/v3/place/around?key=${API_KEY}&location=${lng},${lat}&radius=${RADIUS}&types=050000&offset=20&page=1&extensions=all`;
    const data = await jsonp(url);
    
    if (data.status !== '1') {
      throw new Error(data.info || '获取周边美食失败');
    }
    
    const pois = data.pois || [];
    if (pois.length === 0) {
      return [];
    }
    
    return pois.map(poi => {
      let distance = '';
      if (poi.distance) {
        const d = parseInt(poi.distance);
        distance = d >= 1000 ? `${(d / 1000).toFixed(1)}km` : `${d}m`;
      }
      
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
        rating: '',
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
    
    const data = await jsonp(url);
    
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
    const data = await jsonp(url);
    
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
    const url = `https://restapi.amap.com/v3/place/text?key=${API_KEY}&keywords=${encodeURIComponent(keyword)}&types=050000&city=&citylimit=false&offset=20&page=1&extensions=all`;
    const data = await jsonp(url);
    
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
    const data = await jsonp(url);
    
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

window.AMapAPI = AMapWrapper;
