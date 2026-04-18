# 任务记录：吃什么 - 吃饭困难选择者必备网站

## 需求
用户提交了一份完整的产品设计书（PDF 文档），要求开发「吃饭困难选择者必备网站」，核心功能：定位 → 聚合周边3公里美食 → 一键随机选择。

## 技术决策

### 数据源替代
原设计书拟对接美团/饿了么 API，但个人开发者无法申请到周边美食聚合接口。改为使用**高德地图 Web 服务 API** 的周边 POI 搜索（`place/around`），完全合法合规且有每日 5000 次免费额度。

### 技术栈
- 纯原生 JavaScript（无框架），轻量化
- Vite 构建工具
- 高德地图 Web 服务 API
- 浏览器 Geolocation API

## 项目结构
```
eat-pick/
├── index.html              # 单页入口，内嵌全部 CSS
├── package.json
├── vite.config.js
├── .gitignore
├── README.md
├── public/                 # 静态资源目录
└── src/
    ├── app.js              # 主应用：状态管理 + 渲染
    ├── api/amap.js         # 高德 API 封装（需填 Key）
    └── utils/
        ├── location-ui.js  # 定位权限弹窗
        ├── location.js      # 定位 + 逆地理编码
        ├── storage.js        # localStorage 封装
        └── random.js         # Fisher-Yates 不重复随机池
```

## 功能实现
| 功能 | 状态 |
|------|------|
| 自动定位 + 权限弹窗 | ✅ |
| 周边3公里美食聚合 | ✅ |
| 一键随机选择（不重复池） | ✅ |
| 分类标签筛选 | ✅ |
| 手动地址搜索 | ✅ |
| 地址记忆（localStorage） | ✅ |
| 品类相似推荐 | ✅ |
| PC + 手机响应式适配 | ✅ |
| 浅色系视觉设计 | ✅ |
| 加载/异常/空状态提示 | ✅ |

## 部署方案
Vercel 静态部署，`npm run build` 后将 `dist/` 目录部署。

## 唯一待配置项
`src/api/amap.js` 第 11 行需填入高德 Web 服务 API Key（需自行申请 https://console.amap.com/dev/key/app）
