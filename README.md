# 🍽️ 吃什么 - 吃饭困难选择者必备网站

自动定位周边5公里美食，一键随机选择，再也不纠结吃什么。

---

## 🚀 快速开始

### 第一步：申请高德地图 API Key

1. 访问 [高德开放平台](https://console.amap.com/dev/key/app)
2. 登录后创建应用 → 添加 Key
3. **Key 类型选择「Web 服务」**（不是 JS API）
4. 复制 Key 备用

### 第二步：配置 API Key

打开 `src/api/amap.js`，将第 11 行的占位符替换为你的 Key：

```javascript
// 找到这行
const API_KEY = 'YOUR_AMAP_WEB_SERVICE_KEY';

// 替换为你的 Key，例如：
const API_KEY = '你的8位数字Key';
```

### 第三步：安装并运行

```bash
npm install
npm run dev
```

浏览器自动打开 `http://localhost:3000`

### 第四步：部署到云平台（Vercel）

```bash
npm run build      # 生成 dist/ 目录
```

然后把 `dist` 目录部署到 Vercel、Netlify 或任意静态托管平台。

---

## 📋 功能清单

| 功能 | 说明 |
|------|------|
| ✅ 自动定位 | 浏览器 Geolocation API，获取当前位置 |
| ✅ 周边美食聚合 | 高德 POI 周边搜索，3公里范围 |
| ✅ 一键随机选择 | 不重复随机池，全部体验一遍才重置 |
| ✅ 分类筛选 | 自动提取美食分类，支持按类查看 |
| ✅ 地址搜索 | 支持手动输入/搜索任意地址 |
| ✅ 地址记忆 | localStorage 缓存定位结果 |
| ✅ 品类相似推荐 | 随机结果可查看同类美食 |
| ✅ PC + 手机适配 | 响应式布局，体验一致 |
| ✅ 浅色系视觉 | 清爽不刺眼 |

---

## 🗂️ 项目结构

```
eat-pick/
├── index.html              # 入口页面（含全部 CSS）
├── package.json
├── vite.config.js
├── public/                 # 静态资源
└── src/
    ├── app.js              # 主应用（状态管理 + 渲染）
    ├── api/
    │   └── amap.js         # 高德 API 封装
    └── utils/
        ├── location.js     # 定位模块
        ├── storage.js      # localStorage 封装
        └── random.js       # 随机算法
```

---

## ⚠️ 注意事项

1. **高德 API 每日免费额度 5000 次**，超出后当日调用失败
2. 浏览器定位需要 **HTTPS** 环境或 **localhost**，否则浏览器会拒绝定位请求
3. 部署到 Vercel 后，定位功能需确保域名使用 HTTPS
4. 若地图数据较少，可能是该区域 POI 上传不完整，可换个地址试试

---

## 🛠️ 技术栈

- 纯原生 JavaScript（无框架依赖）
- Vite 构建工具
- 高德地图 Web 服务 API
- 浏览器 Geolocation API
