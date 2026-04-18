/**
 * 高德地图 API 封装
 * 
 * ⚠️ API Key 已配置完成
 * 申请地址：https://console.amap.com/dev/key/app
 */
const AMap = (() => {
  // ========== 配置 ==========
  // 🔑 高德 Web 服务 API Key（已配置）
  const API_KEY = '19dab2fef285a816ec8779e835984820';
  const BASE = 'https://restapi.amap.com/v3';
  const RADIUS = 5000; // 5公里

  // ========== 餐饮分类 ==========
  // 高德 POI 分类码：05 餐饮服务
  const FOOD_TYPES = '050000';

  /**
   * 周边搜索 - 搜索附近餐厅
   * @param {number} lat
   * @param {number} lng
   * @returns {Promise<Array>}
   */
  async function searchNearby(lat, lng) {
    const params = new URLSearchParams({
      key: API_KEY,
      location: `${lng},${lat}`,
      radius: RADIUS,
      types: FOOD_TYPES,
      sortrule: 'distance',
      offset: 50,
      page: 1,
      extensions: 'all'
    });

    const resp = await fetch(`${BASE}/place/around?${params}`);
    const data = await resp.json();

    if (data.status !== '1') {
      throw new Error(data.info || '获取周边美食失败');
    }

    return (data.pois || []).map(_formatPOI);
  }

  /**
   * 逆地理编码
   * @param {number} lat
   * @param {number} lng
   * @returns {Promise<{formattedAddress: string, city: string}>}
   */
  async function reverseGeocode(lat, lng, signal) {
    const params = new URLSearchParams({
      key: API_KEY,
      location: `${lng},${lat}`,
      extensions: 'base'
    });

    const resp = await fetch(`${BASE}/geocode/regeo?${params}`, signal ? { signal } : {});
    const data = await resp.json();

    if (data.status !== '1') {
      throw new Error('地址解析失败');
    }

    const rc = data.regeocode || {};
    return {
      formattedAddress: rc.formattedAddress || '',
      city: (rc.addressComponent || {}).city || ''
    };
  }

  /**
   * 地理编码 - 关键词搜索地址
   * @param {string} address
   * @returns {Promise<Array<{lat:number, lng:number, formattedAddress:string, city:string}>>}
   */
  async function geocode(address) {
    const params = new URLSearchParams({
      key: API_KEY,
      address: address,
      city: '' // 全国搜索
    });

    const resp = await fetch(`${BASE}/geocode/geo?${params}`);
    const data = await resp.json();

    if (data.status !== '1' || !data.geocodes || data.geocodes.length === 0) {
      return [];
    }

    return data.geocodes.map(g => {
      const [lng, lat] = g.location.split(',').map(Number);
      return {
        lat,
        lng,
        formattedAddress: g.formatted_address || g.address || address,
        city: g.city || ''
      };
    });
  }

  /**
   * 关键词搜索（同周边搜索，但用关键词过滤）
   */
  async function searchByKeyword(lat, lng, keyword) {
    const params = new URLSearchParams({
      key: API_KEY,
      location: `${lng},${lat}`,
      radius: RADIUS,
      types: FOOD_TYPES,
      keywords: keyword,
      sortrule: 'distance',
      offset: 50,
      page: 1,
      extensions: 'all'
    });

    const resp = await fetch(`${BASE}/place/around?${params}`);
    const data = await resp.json();

    if (data.status !== '1') return [];

    return (data.pois || []).map(_formatPOI);
  }

  // 格式化 POI 数据
  function _formatPOI(poi) {
    // 提取距离数字
    let distance = '';
    if (poi.distance) {
      const d = parseInt(poi.distance);
      distance = d >= 1000 ? `${(d / 1000).toFixed(1)}km` : `${d}m`;
    }

    // 提取评分（高德 biz_ext.rating）
    let rating = '';
    try {
      const biz = typeof poi.biz_ext === 'string' ? JSON.parse(poi.biz_ext) : poi.biz_ext;
      if (biz && biz.rating) rating = biz.rating;
    } catch {}

    // 图片取第一个
    let photo = '';
    if (poi.photos && poi.photos.length > 0) {
      photo = poi.photos[0].url || '';
    }

    // 标签/品类
    let type = poi.type || '';
    // 去掉前缀分类码，只保留品类名
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
      lat: (poi.location || '').split(',')[1] || '',
      lng: (poi.location || '').split(',')[0] || ''
    };
  }

  function getApiKey() {
    return API_KEY;
  }

  function isKeyConfigured() {
    return API_KEY !== 'YOUR_AMAP_WEB_SERVICE_KEY';
  }

  return { searchNearby, reverseGeocode, geocode, searchByKeyword, getApiKey, isKeyConfigured };
})();

window.AMap = AMap;
