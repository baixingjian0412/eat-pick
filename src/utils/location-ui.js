/**
 * 定位权限 UI 模块
 * 负责渲染定位权限申请弹窗，触发浏览器原生定位请求
 */
const LocationUI = (() => {
  /**
   * 请求用户授权定位权限
   * @returns {Promise<boolean>} 用户是否授权
   */
  function requestPermission() {
    return new Promise((resolve) => {
      // 先弹出自定义弹窗说明
      const overlay = _createModal(() => {
        // 用户点了"允许" → 触发浏览器原生权限请求
        navigator.permissions?.query({ name: 'geolocation' }).then(result => {
          if (result.state === 'granted') {
            resolve(true);
          } else if (result.state === 'prompt') {
            // 浏览器会弹出系统权限框，这里直接返回 true 让 Location.get 继续
            // 如果浏览器拒绝，会在 getCurrentPosition 回调中捕获
            resolve(true);
          } else {
            // denied
            resolve(false);
          }
        }).catch(() => {
          // 不支持 permissions API，直接尝试定位
          // 浏览器会弹出系统定位请求框
          resolve(true);
        });
      }, () => {
        // 用户点了"拒绝"
        resolve(false);
      });

      // ESC 键关闭 = 拒绝
      const escHandler = (e) => {
        if (e.key === 'Escape') {
          cleanup();
          resolve(false);
        }
      };
      document.addEventListener('keydown', escHandler);

      function cleanup() {
        overlay.remove();
        document.removeEventListener('keydown', escHandler);
      }
    });
  }

  function _createModal(onAllow, onDeny) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div style="text-align:center;margin-bottom:16px">
          <span style="font-size:2.5rem">📍</span>
        </div>
        <h3 style="text-align:center">需要获取您的位置</h3>
        <p style="text-align:center">
          为获取您周边3公里美食，需申请获取您的位置权限。<br>
          仅用于美食筛选，<strong style="color:var(--text)">不收集、不泄露个人信息</strong>。
        </p>
        <div class="modal-actions" style="justify-content:center;margin-top:8px">
          <button class="btn btn-ghost" id="locDenyBtn">拒绝</button>
          <button class="btn btn-primary" id="locAllowBtn">允许</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // 居中弹窗
    const modal = overlay.querySelector('.modal');
    modal.style.margin = '0 auto';

    document.getElementById('locAllowBtn').addEventListener('click', () => {
      overlay.remove();
      onAllow();
    });
    document.getElementById('locDenyBtn').addEventListener('click', () => {
      overlay.remove();
      onDeny();
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
        onDeny();
      }
    });

    return overlay;
  }

  return { requestPermission };
})();
