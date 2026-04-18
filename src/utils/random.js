/**
 * 随机选择模块 - 不重复随机池
 */
const RandomPicker = (() => {
  let pool = [];       // 剩余可选池
  let fullList = [];   // 全量列表

  /**
   * 初始化随机池
   * @param {Array} restaurants 全部餐厅列表
   */
  function init(restaurants) {
    fullList = [...restaurants];
    // 优先恢复上次未随机完的池子
    const remaining = Storage.getRemainingPool();
    if (remaining && remaining.length > 0) {
      // 校验 remaining 是否仍是 fullList 的子集（防止换地址后脏数据）
      const fullIds = new Set(fullList.map(r => r.id));
      pool = remaining.filter(id => fullIds.has(id));
    } else {
      pool = fullList.map(r => r.id);
    }
    // shuffle
    _shuffle(pool);
  }

  /**
   * 随机选一个
   * @returns {{ restaurant: object, isLast: boolean, poolReset: boolean }}
   */
  function pick() {
    if (pool.length === 0) {
      // 重置池
      pool = fullList.map(r => r.id);
      _shuffle(pool);
      Storage.saveRemainingPool([]);
      const id = pool.pop();
      const restaurant = fullList.find(r => r.id === id);
      Storage.saveRemainingPool(pool);
      return { restaurant, isLast: false, poolReset: true };
    }

    const id = pool.pop();
    const restaurant = fullList.find(r => r.id === id);
    const isLast = pool.length === 0;
    Storage.saveRemainingPool(pool);
    return { restaurant, isLast, poolReset: false };
  }

  /**
   * 按品类筛选
   * @param {string} category
   * @returns {Array}
   */
  function filterByCategory(category) {
    if (!category || category === '全部') return fullList;
    return fullList.filter(r => {
      const types = (r.type || '').split(';');
      return types.some(t => t.includes(category));
    });
  }

  function getPoolSize() {
    return pool.length;
  }

  function getTotalSize() {
    return fullList.length;
  }

  // Fisher-Yates shuffle
  function _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  return { init, pick, filterByCategory, getPoolSize, getTotalSize };
})();
