/**
 * 高德地图 API 封装
 * 
 * 使用本地模拟数据演示功能
 * 实际部署时可切换到真实 API
 */
const AMapWrapper = (() => {
  const RADIUS = 5000;

  // 城市数据库
  const CITIES = {
    '北京': { lat: 39.91, lng: 116.39, name: '北京市', dist: '朝阳区' },
    '上海': { lat: 31.23, lng: 121.47, name: '上海市', dist: '黄浦区' },
    '广州': { lat: 23.13, lng: 113.26, name: '广州市', dist: '天河区' },
    '深圳': { lat: 22.55, lng: 114.06, name: '深圳市', dist: '南山区' },
    '杭州': { lat: 30.27, lng: 120.15, name: '杭州市', dist: '西湖区' },
    '南京': { lat: 32.06, lng: 118.79, name: '南京市', dist: '玄武区' },
    '成都': { lat: 30.67, lng: 104.07, name: '成都市', dist: '锦江区' },
    '武汉': { lat: 30.58, lng: 114.29, name: '武汉市', dist: '武昌区' },
    '西安': { lat: 34.27, lng: 108.95, name: '西安市', dist: '雁塔区' },
    '重庆': { lat: 29.56, lng: 106.55, name: '重庆市', dist: '渝中区' },
    '天津': { lat: 39.13, lng: 117.20, name: '天津市', dist: '和平区' },
    '苏州': { lat: 31.30, lng: 120.59, name: '苏州市', dist: '姑苏区' },
    '济南': { lat: 36.67, lng: 116.99, name: '济南市', dist: '历下区' },
    '青岛': { lat: 36.07, lng: 120.37, name: '青岛市', dist: '市南区' },
    '长沙': { lat: 28.23, lng: 112.94, name: '长沙市', dist: '岳麓区' },
    '郑州': { lat: 34.77, lng: 113.63, name: '郑州市', dist: '金水区' },
    '沈阳': { lat: 41.80, lng: 123.43, name: '沈阳市', dist: '和平区' },
    '大连': { lat: 38.91, lng: 121.62, name: '大连市', dist: '中山区' },
    '福州': { lat: 26.08, lng: 119.30, name: '福州市', dist: '鼓楼区' },
    '厦门': { lat: 24.48, lng: 118.09, name: '厦门市', dist: '思明区' },
    '南昌': { lat: 28.68, lng: 115.86, name: '南昌市', dist: '东湖区' },
    '昆明': { lat: 25.04, lng: 102.71, name: '昆明市', dist: '五华区' },
    '贵阳': { lat: 26.65, lng: 106.63, name: '贵阳市', dist: '南明区' },
    '石家庄': { lat: 38.04, lng: 114.48, name: '石家庄市', dist: '长安区' },
    '合肥': { lat: 31.86, lng: 117.28, name: '合肥市', dist: '蜀山区' },
    '太原': { lat: 37.87, lng: 112.53, name: '太原市', dist: '迎泽区' },
    '兰州': { lat: 36.06, lng: 103.83, name: '兰州市', dist: '城关区' },
    '哈尔滨': { lat: 45.80, lng: 126.53, name: '哈尔滨市', dist: '南岗区' },
    '长春': { lat: 43.88, lng: 125.32, name: '长春市', dist: '朝阳区' },
    '乌鲁木齐': { lat: 43.83, lng: 87.62, name: '乌鲁木齐市', dist: '天山区' },
    '呼和浩特': { lat: 40.84, lng: 111.73, name: '呼和浩特市', dist: '新城区' },
    '拉萨': { lat: 29.65, lng: 91.17, name: '拉萨市', dist: '城关区' },
    '南宁': { lat: 22.82, lng: 108.37, name: '南宁市', dist: '青秀区' },
    '海口': { lat: 20.03, lng: 110.35, name: '海口市', dist: '龙华区' },
    '宁波': { lat: 29.87, lng: 121.55, name: '宁波市', dist: '海曙区' },
    '无锡': { lat: 31.49, lng: 120.30, name: '无锡市', dist: '梁溪区' },
    '佛山': { lat: 23.03, lng: 113.12, name: '佛山市', dist: '禅城区' },
    '东莞': { lat: 23.05, lng: 113.75, name: '东莞市', dist: '南城区' },
    '珠海': { lat: 22.27, lng: 113.58, name: '珠海市', dist: '香洲区' },
    '温州': { lat: 28.00, lng: 120.67, name: '温州市', dist: '鹿城区' },
  };

  // 餐厅类型池（多种类）
  const FOOD_TYPES = [
    '川菜', '湘菜', '粤菜', '鲁菜', '苏菜', '浙菜', '闽菜', '徽菜',
    '东北菜', '西北菜', '云南菜', '贵州菜', '清真菜', '家常菜',
    '火锅', '串串', '麻辣烫', '冒菜', '烧烤', '烤鱼', '烤肉',
    '日料', '韩料', '东南亚菜', '西餐', '意餐', '法餐', '美式',
    '快餐', '汉堡', '披萨', '炸鸡', '三明治',
    '面馆', '饺子', '包子', '馒头', '粥店', '粉面',
    '小吃', '卤味', '凉皮', '凉面', '煎饼', '手抓饼', '鸡蛋灌饼',
    '甜品', '奶茶', '咖啡', '蛋糕', '烘焙',
    '海鲜', '自助餐', '私房菜', '农家菜', '食堂',
  ];

  // 通用餐厅名称池
  const FOOD_NAMES = [
    '老地方', '小厨娘', '老地方', '味美轩', '食全食美', '家常小炒',
    '好味居', '香满楼', '福满楼', '醉香阁', '福客来', '口水坊',
    '味道工厂', '舌尖中国', '百味居', '千色坊', '食为天', '味道江湖',
    '老街坊', '老城厢', '新发现', '小酌轩', '秘制坊', '风味居',
    '知味斋', '大食堂', '社区食堂', '邻里餐厅', '街角小馆',
    '口口香', '回味斋', '香满园', '聚贤庄', '御膳房', '香格里',
    '楼外楼', '外婆家', '弄堂里', '沈大成', '西贝', '绿茶',
    '麦当劳', '肯德基', '汉堡王', '必胜客', '德克士', '华莱士',
    '沙县小吃', '兰州拉面', '黄焖鸡米饭', '隆江猪脚饭', '桂林米粉',
  ];

  // 街道名称池
  const STREET_NAMES = [
    '建设路', '人民路', '解放路', '文化路', '和平路', '胜利路',
    '中山路', '长江路', '黄河路', '北京路', '上海路', '南京路',
    '五四路', '六安路', '七里路', '八一路', '九华路', '十全路',
    '经一路', '纬一路', '纬二路', '纬三路', '经二路', '经三路',
    '工业路', '商业街', '美食街', '步行街', '商业街', '学府路',
    '科技路', '创新路', '光明路', '振兴路', '友谊路', '团结路',
    '幸福路', '健康路', '平安路', '新华路', '新兴路', '朝阳路',
    '东风路', '西宁路', '南门路', '北门路', '中心路', '广场路',
    '公园路', '园林路', '翠微路', '玉泉路', '金水路', '银山路',
  ];

  // 设施/建筑名（生成门牌号用）
  const LANDMARKS = [
    '购物中心', '商业广场', '万达广场', '银泰城', '大悦城', '万象城',
    '科技园', '软件园', '创业园', '工业园', '产业园', '商务中心',
    '小区', '花园', '公寓', '大厦', '写字楼', '商务楼',
    '学校', '医院', '体育馆', '图书馆', '博物馆', '展览馆',
    '酒店', '宾馆', '招待所', '酒店式公寓',
    '菜市场', '超市', '便利店', '商场', '农贸市场',
    '加油站', '停车场', '银行', '邮局', '药店',
  ];

  // 根据字符串生成确定性的随机数（伪随机，用于生成同一地址的不同结果但稳定）
  function seededRandom(seed, index = 0) {
    const x = Math.sin(seed * 9301 + index * 49297 + 233720) * 9301;
    return x - Math.floor(x);
  }

  // 根据字符串生成确定性的整数哈希
  function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  // 生成一个附近餐厅（根据用户坐标和种子数散布）
  function generateRestaurant(lat, lng, seed, index) {
    const r = seededRandom(seed, index);
    
    // 在用户位置周围3km内随机散布
    const offsetLat = (r - 0.5) * 0.06; // ~3km
    const offsetLng = (seededRandom(seed, index + 1000) - 0.5) * 0.08;
    const rLat = lat + offsetLat;
    const rLng = lng + offsetLng;
    
    // 计算距离（km）
    const distKm = Math.sqrt(offsetLat * offsetLat + offsetLng * offsetLng) * 111;
    
    // 随机选择街道和门牌
    const streetIdx = Math.floor(seededRandom(seed, index + 1) * STREET_NAMES.length);
    const num = Math.floor(seededRandom(seed, index + 2) * 200 + 1);
    const street = STREET_NAMES[streetIdx];
    
    // 随机选择餐厅类型
    const typeIdx = Math.floor(seededRandom(seed, index + 3) * FOOD_TYPES.length);
    const type = FOOD_TYPES[typeIdx];
    
    // 随机选择餐厅名（如果种子大用通用名，否则用类型+序号）
    const nameIdx = Math.floor(seededRandom(seed, index + 4) * FOOD_NAMES.length);
    const name = FOOD_NAMES[nameIdx] + (seededRandom(seed, index + 5) > 0.7 ? type.slice(-2) : '');
    
    // 评分 3.5-4.9
    const rating = (3.5 + seededRandom(seed, index + 6) * 1.4).toFixed(1);
    
    // 人均价格
    const price = Math.floor(15 + seededRandom(seed, index + 7) * 150);
    
    // 距离格式
    const distance = distKm < 0.5 
      ? `${Math.round(distKm * 1000)}m` 
      : `${distKm.toFixed(1)}km`;
    
    return {
      id: `r${seed}_${index}`,
      name: name,
      address: street + num + '号',
      type: type,
      rating: rating,
      price: price,
      distance: distance,
      lat: rLat,
      lng: rLng,
    };
  }

  // 解析关键词匹配城市
  function matchCity(keyword) {
    if (!keyword) return null;
    const kw = keyword.trim();
    
    for (const [city, data] of Object.entries(CITIES)) {
      if (kw.includes(city)) return { city, ...data };
    }
    
    const provinceMap = {
      '北京市': CITIES['北京'], '天津市': CITIES['天津'], '上海市': CITIES['上海'], '重庆市': CITIES['重庆'],
      '河北省': CITIES['石家庄'], '山西省': CITIES['太原'], '辽宁省': CITIES['沈阳'],
      '吉林省': CITIES['长春'], '黑龙江省': CITIES['哈尔滨'], '江苏省': CITIES['南京'],
      '浙江省': CITIES['杭州'], '安徽省': CITIES['合肥'], '福建省': CITIES['福州'],
      '江西省': CITIES['南昌'], '山东省': CITIES['济南'], '河南省': CITIES['郑州'],
      '湖北省': CITIES['武汉'], '湖南省': CITIES['长沙'], '广东省': CITIES['广州'],
      '海南省': CITIES['海口'], '四川省': CITIES['成都'], '贵州省': CITIES['贵阳'],
      '云南省': CITIES['昆明'], '陕西省': CITIES['西安'], '甘肃省': CITIES['兰州'],
      '青海省': CITIES['兰州'], '内蒙古': CITIES['呼和浩特'], '广西': CITIES['南宁'],
      '西藏': CITIES['拉萨'], '宁夏': CITIES['兰州'], '新疆': CITIES['乌鲁木齐'],
      '香港': CITIES['深圳'], '澳门': CITIES['珠海'], '台湾': null,
    };
    
    for (const [province, data] of Object.entries(provinceMap)) {
      if (kw.includes(province)) return data;
    }
    
    return null;
  }

  /**
   * 周边搜索 - 根据用户精确坐标生成附近餐厅
   */
  async function searchNearby(lat, lng, cityHint) {
    console.log('searchNearby called', lat, lng, cityHint);
    try {
      // 根据坐标找城市信息（用于生成城市特色的餐厅名）
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
        cityData = { city: '全国', ...CITIES['北京'] };
      }

      // 生成20个餐厅，散布在用户周围
      const count = 20;
      const seed = hashCode(`${lat.toFixed(4)}_${lng.toFixed(4)}_${cityData.city}`);
      const restaurants = [];
      
      for (let i = 0; i < count; i++) {
        restaurants.push(generateRestaurant(lat, lng, seed, i));
      }
      
      // 按距离排序
      restaurants.sort((a, b) => {
        const aDist = parseFloat(a.distance);
        const bDist = parseFloat(b.distance);
        return aDist - bDist;
      });
      
      console.log('searchNearby result', restaurants.length, 'restaurants');
      return restaurants;
    } catch (e) {
      console.error('searchNearby error', e);
      throw e;
    }
  }

  /**
   * 逆地理编码
   */
  async function reverseGeocode(lat, lng, signal) {
    return new Promise(resolve => {
      setTimeout(() => {
        let cityName = '北京市';
        let distName = '朝阳区';
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

  /**
   * 地理编码 - 根据地址生成用户位置坐标
   */
  async function geocode(address) {
    console.log('geocode called', address);
    try {
      const cityData = matchCity(address);
      
      if (cityData) {
        // 有城市匹配：以此城市为基准，加上地址的hash偏移
        const seed = hashCode(address);
        // 用hash在市中心附近生成精确坐标（0.3度约等于30km范围）
        const lat = cityData.lat + (seededRandom(seed, 0) - 0.5) * 0.5;
        const lng = cityData.lng + (seededRandom(seed, 1) - 0.5) * 0.7;
        
        // 从地址中提取区/县信息
        const districtMatch = address.match(/([^市]+区|[^市]+县|[^市]+镇)/);
        const district = districtMatch ? districtMatch[1] : cityData.dist;
        
        const result = [{
          lat,
          lng,
          formattedAddress: address,
          city: cityData.name
        }];
        console.log('geocode result (city matched)', result);
        return result;
      }
      
      // 没有城市匹配，用hash生成全国任意坐标
      const seed = hashCode(address);
      const lat = 20 + (seed % 300) / 10;
      const lng = 80 + ((seed * 7) % 400) / 10;
      
      const result = [{
        lat,
        lng,
        formattedAddress: address,
        city: ''
      }];
      console.log('geocode result (hash)', result);
      return result;
    } catch (e) {
      console.error('geocode error', e);
      throw e;
    }
  }

  async function searchByKeyword(lat, lng, keyword) {
    const seed = hashCode(`${lat.toFixed(4)}_${lng.toFixed(4)}_kw_${keyword}`);
    const results = [];
    for (let i = 0; i < 6; i++) {
      results.push(generateRestaurant(lat, lng, seed, i));
    }
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(results);
      }, 300);
    });
  }

  async function searchAddress(keyword) {
    const cityData = matchCity(keyword);
    return new Promise(resolve => {
      setTimeout(() => {
        if (cityData) {
          const seed = hashCode(keyword);
          const lat = cityData.lat + (seededRandom(seed, 0) - 0.5) * 0.3;
          const lng = cityData.lng + (seededRandom(seed, 1) - 0.5) * 0.4;
          resolve([{
            id: 'addr1',
            name: cityData.name,
            address: cityData.name + cityData.dist,
            lat,
            lng,
            city: cityData.name
          }]);
        } else {
          const seed = hashCode(keyword);
          const lat = 20 + (seed % 300) / 10;
          const lng = 80 + ((seed * 7) % 400) / 10;
          resolve([{
            id: 'addr1',
            name: keyword,
            address: keyword,
            lat,
            lng,
            city: ''
          }]);
        }
      }, 300);
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
