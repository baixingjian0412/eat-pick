/**
 * 定位模块 - IP 定位 + 浏览器 GPS 双轨竞速 + AbortController 取消无效请求
 */
const Location = (() => {
  let currentPos = null;
  let currentAddr = '';
  let currentCity = '';

  const MASTER_TIMEOUT = 20000; // 全局超时兜底

  async function get(askPermission = true) {
    // 1. 缓存优先
    const cached = Storage.getLocationCache();
    if (cached && cached.lat && cached.lng) {
      currentPos = { lat: cached.lat, lng: cached.lng };
      currentAddr = cached.address || '';
      currentCity = cached.city || '';
      return { ...currentPos, address: currentAddr, city: currentCity };
    }

    // 2. IP 定位 + 浏览器 GPS 竞速，先成功者赢
    const controller = new AbortController();
    const timeout = new Promise((_, reject) =>
      setTimeout(() => { controller.abort(); reject(new Error('TIMEOUT')); }, MASTER_TIMEOUT)
    );

    const locationPromise = _runRace(controller, askPermission);

    return await Promise.race([locationPromise, timeout]);
  }

  // 竞速逻辑
  async function _runRace(controller, askPermission) {
    // 立即启动 IP 定位（无网络延迟，结果即用）
    const ipTask = _amapIpLocate(controller.signal).catch(e => ({ _err: e }));

    // 浏览器 GPS 同步启动（异步结果）
    const gpsTask = navigator.geolocation
      ? _browserGeolocateWithRetry(askPermission ? 2 : 0, controller.signal).catch(e => ({ _err: e }))
      : Promise.resolve({ _err: new Error('NO_GPS') });

    // 两个方法谁先返回有效结果谁赢
    const winner = await Promise.any([ipTask, gpsTask]);

    // 竞速结束，取消另一方
    controller.abort();

    if (winner._err) {
      throw new Error(winner._err.message === 'PERMISSION_DENIED' ? 'PERMISSION_DENIED' : 'LOCATION_FAILED');
    }

    currentPos = { lat: winner.lat, lng: winner.lng };
    currentAddr = winner.address || '';
    currentCity = winner.city || '';
    _saveCache();
    return { ...currentPos, address: currentAddr, city: currentCity };
  }

  async function search(keyword) {
    const result = await AMap.geocode(keyword);
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
    Storage.saveLocationCache({
      lat: currentPos.lat, lng: currentPos.lng,
      address: currentAddr, city: currentCity
    });
  }

  // 高德 IP 定位
  async function _amapIpLocate(signal) {
    const resp = await fetch(
      `https://restapi.amap.com/v3/ip?key=${AMap.getApiKey()}`,
      { signal }
    );
    const data = await resp.json();
    if (data.status !== '1' || !data.rectangle) {
      throw new Error(data.info || 'IP定位无坐标');
    }
    const [sw, ne] = data.rectangle.split(';');
    const [slng, slat] = sw.split(',').map(Number);
    const [nlng, nlat] = ne.split(',').map(Number);
    const centerLat = (slat + nlat) / 2;
    const centerLng = (slng + nlng) / 2;

    // 逆地理编码也带 abort 信号
    const geo = await AMap.reverseGeocode(centerLat, centerLng, signal);

    return {
      lat: centerLat, lng: centerLng,
      address: geo.formattedAddress || data.province + data.city,
      city: data.city || ''
    };
  }

  // 浏览器 GPS + 逆地理编码
  function _browserGeolocateWithRetry(retries = 1, signal) {
    return new Promise((resolve, reject) => {
      // AbortController 中止时直接 reject
      if (signal?.aborted) { reject(new Error('ABORTED')); return; }
      signal?.addEventListener('abort', () => reject(new Error('ABORTED')));

      let attempts = 0;
      function attempt() {
        if (signal?.aborted) { reject(new Error('ABORTED')); return; }
        attempts++;
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            try {
              const geo = await AMap.reverseGeocode(lat, lng, signal);
              resolve({ lat, lng, address: geo.formattedAddress || '', city: geo.city || '' });
            } catch {
              resolve({ lat, lng, address: '', city: '' });
            }
          },
          (err) => {
            if (signal?.aborted) { reject(new Error('ABORTED')); return; }
            if (retries > 0) { retries--; setTimeout(attempt, 1500); return; }
            switch (err.code) {
              case 1: reject(new Error('PERMISSION_DENIED')); break;
              case 2: reject(new Error('NETWORK_ERROR')); break;
              case 3: reject(new Error('TIMEOUT_GPS')); break;
              default: reject(new Error('GPS_FAILED'));
            }
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
        );
      }
      attempt();
    });
  }

  return { get, search, getCurrent, clearCache };
})();
