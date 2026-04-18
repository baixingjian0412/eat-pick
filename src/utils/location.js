/**
 * 定位模块 - IP 定位 + 浏览器 GPS 双轨竞速
 */
const Location = (() => {
  let currentPos = null;
  let currentAddr = '';
  let currentCity = '';

  const MASTER_TIMEOUT = 15000;

  async function get(askPermission = true) {
    // 1. 缓存优先
    const cached = Storage.getLocationCache();
    if (cached && cached.lat && cached.lng) {
      currentPos = { lat: cached.lat, lng: cached.lng };
      currentAddr = cached.address || '';
      currentCity = cached.city || '';
      return { ...currentPos, address: currentAddr, city: currentCity };
    }

    // 2. 启动定位竞速
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MASTER_TIMEOUT);

    try {
      // 创建定位 Promise 数组
      const locationPromises = [];

      // IP 定位
      locationPromises.push(
        _amapIpLocate(controller.signal)
          .then(r => ({ source: 'ip', data: r }))
          .catch(e => ({ source: 'ip', error: e }))
      );

      // GPS 定位（如果有）
      if (navigator.geolocation) {
        locationPromises.push(
          _browserGeolocateWithRetry(askPermission ? 2 : 0, controller.signal)
            .then(r => ({ source: 'gps', data: r }))
            .catch(e => ({ source: 'gps', error: e }))
        );
      }

      // 等待第一个成功的结果
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
        throw new Error('LOCATION_FAILED');
      }

      const data = winner.data;
      currentPos = { lat: data.lat, lng: data.lng };
      currentAddr = data.address || '';
      currentCity = data.city || '';
      _saveCache();
      return { ...currentPos, address: currentAddr, city: currentCity };

    } catch (err) {
      clearTimeout(timeoutId);
      controller.abort();
      if (err.message === 'PERMISSION_DENIED') {
        throw new Error('PERMISSION_DENIED');
      }
      if (err.message === 'TIMEOUT' || err.message === 'ABORTED') {
        throw new Error('TIMEOUT');
      }
      throw new Error('LOCATION_FAILED');
    }
  }

  async function search(keyword) {
    const result = await AMapAPI.geocode(keyword);
    if (!result || result.length === 0) {
      throw new Error('未找到匹配的地址，请尝试更具体的描述');
    }
    const item = result[0];
    currentPos = { lat: item.lat, lng: item.lng };
    currentAddr = item.formattedAddress || keyword;
    currentCity = item.city || '';
    _saveCache();
    return { ...currentPos, address: currentAddr, city: currentCity };
  }

  function getCurrent() {
    return currentPos ? { ...currentPos, address: currentAddr, city: currentCity } : null;
  }

  function clearCache() {
    Storage.clearLocationCache();
    currentPos = null;
    currentAddr = '';
    currentCity = '';
  }

  function _saveCache() {
    if (currentPos) {
      Storage.saveLocationCache({
        lat: currentPos.lat, lng: currentPos.lng,
        address: currentAddr, city: currentCity
      });
    }
  }

  // 高德 IP 定位（使用浏览器 GPS 作为后备）
  // 注意：IP 定位需要后端代理，这里暂时跳过，直接用 GPS
  async function _amapIpLocate(signal) {
    // IP 定位使用 REST API 会遇到 CORS 问题，暂时跳过
    // 如果需要 IP 定位，需要搭建代理服务器
    throw new Error('IP定位暂不可用');
  }

  // 浏览器 GPS
  function _browserGeolocateWithRetry(retries = 1, signal) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new Error('ABORTED'));
        return;
      }

      let attempts = 0;

      function attempt() {
        if (signal?.aborted) {
          reject(new Error('ABORTED'));
          return;
        }

        attempts++;
        
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;

            if (signal?.aborted) {
              reject(new Error('ABORTED'));
              return;
            }

            try {
              const geo = await Promise.race([
                AMapAPI.reverseGeocode(lat, lng, signal),
                new Promise((_, r) => setTimeout(() => r(new Error('GEO_TIMEOUT')), 5000))
              ]);
              resolve({ lat, lng, address: geo?.formattedAddress || '', city: geo?.city || '' });
            } catch (e) {
              resolve({ lat, lng, address: '', city: '' });
            }
          },
          (err) => {
            if (signal?.aborted) {
              reject(new Error('ABORTED'));
              return;
            }
            if (retries > 0) {
              retries--;
              setTimeout(attempt, 1500);
              return;
            }
            switch (err.code) {
              case 1: reject(new Error('PERMISSION_DENIED')); break;
              case 2: reject(new Error('NETWORK_ERROR')); break;
              case 3: reject(new Error('TIMEOUT_GPS')); break;
              default: reject(new Error('GPS_FAILED'));
            }
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
        );
      }

      if (signal) {
        signal.addEventListener('abort', () => reject(new Error('ABORTED')));
      }

      attempt();
    });
  }

  return { get, search, getCurrent, clearCache };
})();

window.Locator = Location;
