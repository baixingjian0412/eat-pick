/**
 * 本地存储模块
 */
const Storage = (() => {
  const KEYS = {
    LOCATION: 'eatpick_location',
    REMAINING: 'eatpick_remaining_pool'
  };

  function getLocationCache() {
    try {
      const raw = localStorage.getItem(KEYS.LOCATION);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function saveLocationCache(loc) {
    localStorage.setItem(KEYS.LOCATION, JSON.stringify(loc));
  }

  function clearLocationCache() {
    localStorage.removeItem(KEYS.LOCATION);
    localStorage.removeItem(KEYS.REMAINING);
  }

  // 随机池管理：记录还未被随机到的餐厅
  function getRemainingPool() {
    try {
      const raw = localStorage.getItem(KEYS.REMAINING);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  function saveRemainingPool(pool) {
    localStorage.setItem(KEYS.REMAINING, JSON.stringify(pool));
  }

  function clearRemainingPool() {
    localStorage.removeItem(KEYS.REMAINING);
  }

  return { getLocationCache, saveLocationCache, clearLocationCache, getRemainingPool, saveRemainingPool, clearRemainingPool };
})();

window.Storage = Storage;
