/**
 * 高德地图 API 封装
 * 
 * 使用本地模拟数据演示功能
 * 实际部署时可切换到真实 API
 */
const AMapWrapper = (() => {
  const RADIUS = 5000;

  // 模拟餐厅数据（演示用）
  const mockRestaurants = [
    { id: '1', name: '海底捞火锅', address: '朝阳区建国路88号', type: '火锅', tel: '010-65888888', rating: '4.8', distance: '800m', photo: '', lat: 39.91, lng: 116.44 },
    { id: '2', name: '西贝莜面村', address: '朝阳区建国路92号', type: '西北菜', tel: '010-65898888', rating: '4.5', distance: '1.2km', photo: '', lat: 39.91, lng: 116.44 },
    { id: '3', name: '绿茶餐厅', address: '朝阳区建国路100号', type: '江浙菜', tel: '010-65878888', rating: '4.3', distance: '1.5km', photo: '', lat: 39.91, lng: 116.44 },
    { id: '4', name: '呷哺呷哺', address: '朝阳区建国路110号', type: '小火锅', tel: '010-65868888', rating: '4.2', distance: '2km', photo: '', lat: 39.91, lng: 116.44 },
    { id: '5', name: '全聚德烤鸭', address: '朝阳区建国路120号', type: '北京菜', tel: '010-65858888', rating: '4.6', distance: '2.5km', photo: '', lat: 39.91, lng: 116.44 },
    { id: '6', name: '吉野家', address: '朝阳区建国路130号', type: '日式快餐', tel: '010-65848888', rating: '4.0', distance: '3km', photo: '', lat: 39.91, lng: 116.44 },
    { id: '7', name: '眉山小吃', address: '朝阳区建国路140号', type: '川菜', tel: '010-65838888', rating: '4.4', distance: '3.5km', photo: '', lat: 39.91, lng: 116.44 },
    { id: '8', name: '兰州拉面', address: '朝阳区建国路150号', type: '拉面', tel: '010-65828888', rating: '4.1', distance: '4km', photo: '', lat: 39.91, lng: 116.44 },
    { id: '9', name: '沙县小吃', address: '朝阳区建国路160号', type: '小吃', tel: '010-65818888', rating: '3.9', distance: '4.5km', photo: '', lat: 39.91, lng: 116.44 },
    { id: '10', name: '麦当劳', address: '朝阳区建国路170号', type: '快餐', tel: '010-65808888', rating: '4.2', distance: '5km', photo: '', lat: 39.91, lng: 116.44 },
    { id: '11', name: '肯德基', address: '朝阳区建国路180号', type: '快餐', tel: '010-65798888', rating: '4.1', distance: '5.2km', photo: '', lat: 39.91, lng: 116.44 },
    { id: '12', name: '必胜客', address: '朝阳区建国路190号', type: '披萨', tel: '010-65788888', rating: '4.3', distance: '5.5km', photo: '', lat: 39.91, lng: 116.44 }
  ];

  // 根据距离随机排序
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * 周边搜索 - 返回模拟餐厅数据
   */
  async function searchNearby(lat, lng) {
    // 返回随机排序的餐厅列表
    return new Promise(resolve => {
      setTimeout(() => {
        const shuffled = shuffleArray([...mockRestaurants]);
        resolve(shuffled);
      }, 500);
    });
  }

  /**
   * 逆地理编码 - 返回模拟地址
   */
  async function reverseGeocode(lat, lng, signal) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          formattedAddress: '北京市朝阳区建国路',
          city: '北京市'
        });
      }, 200);
    });
  }

  /**
   * 地理编码 - 模拟
   */
  async function geocode(address) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve([{
          lat: 39.91,
          lng: 116.44,
          formattedAddress: address,
          city: '北京市'
        }]);
      }, 200);
    });
  }

  /**
   * 关键词搜索餐厅
   */
  async function searchByKeyword(lat, lng, keyword) {
    const filtered = mockRestaurants.filter(r => 
      r.name.includes(keyword) || r.type.includes(keyword)
    );
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(filtered);
      }, 300);
    });
  }

  /**
   * 关键词搜索地址
   */
  async function searchAddress(keyword) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve([{
          id: 'addr1',
          name: keyword,
          address: '北京市朝阳区' + keyword,
          lat: 39.91,
          lng: 116.44,
          city: '北京市'
        }]);
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
