# 🌍 Landmark Manager — 地标管理与路径规划系统

[![Vercel Deployment](https://img.shields.io/badge/Vercel-Deployed-success?style=for-the-badge&logo=vercel)](https://landmark-manager-azure.vercel.app/)

一个融合 **Redis GEO 空间索引**、**Supabase 云端数据库**、**高德地图路径规划 API** 与 **Leaflet 交互式地图**的全栈 GIS 应用。支持地标 CRUD、邻近搜索、大圆距离测算、单点/多点路径规划与历史收藏管理。

> 🔗 在线体验：[https://landmark-manager-azure.vercel.app/](https://landmark-manager-azure.vercel.app/)

---

## 1. 系统架构总览

```
┌─────────────────────────┐     ┌───────────────────────────────┐
│   React 19 SPA (Vite)   │     │   Vercel Serverless API       │
│  ┌───────────────────┐  │     │  ┌─────────────────────────┐  │
│  │ App (状态中心)     │  │     │  │ /api/geo-nearby         │  │
│  │ ┌───────────────┐ │  │     │  │   → Redis GEOSEARCH     │  │
│  │ │ AuthContext    │ │  │     │  │ /api/geo-sync           │  │
│  │ │ Supabase Auth  │ │  │     │  │   → Supabase→Redis 全量同步│  │
│  │ └───────────────┘ │  │     │  │ /api/geo-update         │  │
│  │ ┌───────────────┐ │  │     │  │   → Redis GEOADD/ZREM   │  │
│  │ │ InteractiveMap │ │  │     │  │ /api/geo-test           │  │
│  │ │ Leaflet + OSM  │ │  │     │  │   → Redis PING + ZCARD  │  │
│  │ └───────────────┘ │  │     │  └─────────────────────────┘  │
│  └───────────────────┘  │     │               │                │
│           │             │     │               ▼                │
│           ▼             │     │  ┌─────────────────────────┐  │
│  ┌───────────────────┐  │     │  │  ioredis (singleton)    │  │
│  │ amap.ts (高德API)  │  │     │  │  GEO Key: landmarks:geo │  │
│  │ WGS-84 ↔ GCJ-02   │  │     │  └─────────────────────────┘  │
│  │ 路径规划（步行/驾车/骑行）│     │               │                │
│  │ TSP 最近邻优化      │  │     │               ▼                │
│  └───────────────────┘  │     │  ┌─────────────────────────┐  │
│           │             │     │  │  Supabase (PostgreSQL)   │  │
│           ▼             │     │  │  RLS + Auth + 4 表       │  │
│  ┌───────────────────┐  │     │  └─────────────────────────┘  │
│  │ utils.ts           │  │     └───────────────────────────────┘
│  │ Haversine 大圆距离  │  │
│  │ Geohash BASE32 编码 │  │
│  └───────────────────┘  │
└─────────────────────────┘
```

**分层设计：**

| 层次 | 技术选型 | 职责 |
|------|---------|------|
| 表示层 | React 19 + Tailwind CSS + Lucide Icons | UI 渲染、交互响应 |
| 地图层 | Leaflet + react-leaflet + OpenStreetMap | 瓦片渲染、标记管理、折线绘制 |
| 业务逻辑层 | TypeScript（`services/amap.ts`、`utils.ts`） | Haversine 距离、Geohash 编码、坐标系转换、路径规划 |
| 状态管理层 | React Context（AuthContext）+ useState/useCallback | 认证、地标列表、路线/行程状态 |
| API 层 | Vercel Serverless + Vite Dev Plugin | REST API、Redis GEO 查询、Supabase 代理 |
| 缓存层 | **Redis** (ioredis) | GEO 空间索引、邻近搜索加速 |
| 持久层 | Supabase PostgreSQL | 结构化数据存储、用户认证、RLS 安全 |
| 外部服务层 | 高德地图 REST API (v3/v4) | 步行/驾车/骑行路线规划 |

---

## 2. 结构模式

### 2.1 组件化架构（React Functional Components）

应用按页面 Tab 拆分为独立功能组件，由 `App.tsx` 作为**单一状态中心**（lifting state up），所有 CRUD 回调均由 App 定义并下传，子组件纯展示 + 触发回调：

```
App.tsx
 ├─ Header          → Tab 切换、DB/Redis 状态指示灯
 ├─ GisSidebar      → 邻近搜索 + 大圆距离工具（GIS 工具箱）
 ├─ InteractiveMap  → Leaflet 地图渲染（标记、测距线、路径折线、GPS 定位点）
 ├─ LandmarkList    → 地标列表（搜索/分类过滤/分页/删除确认/详情弹窗）
 ├─ LandmarkAdd     → 新增地标表单
 ├─ LandmarkEdit    → 编辑地标弹窗
 ├─ RoutePlanner    → 单点路径规划（GPS/地标/手动三种起点模式）
 ├─ TripPlanner     → 多站行程规划（最多 5 站 + TSP 优化排序）
 ├─ FavoritesPage   → 收藏夹（地标/路线/行程三类收藏）
 ├─ SavedRoutesPage → 浏览历史（所有已保存路线与行程）
 └─ AuthModal       → 登录/注册弹窗
```

### 2.2 Context 模式（认证状态管理）

`AuthContext` 封装 Supabase Auth，提供全局 `user` / `session` / `loading` 状态，以及 `requireAuth()` 守卫模式：未登录用户尝试执行需认证操作时，自动弹出登录模态框，登录成功后自动执行挂起的回调。

### 2.3 Singleton 模式（Redis 连接）

`getRedis()` 单例工厂：全局唯一 `ioredis` 实例，惰性连接（`lazyConnect: true`），自动处理 TLS 升级和错误静默。

### 2.4 Plugin 模式（Vite 开发 API 路由）

`vite-api-plugin.ts` 拦截 `/api/*` 请求，动态 `import()` API handler 模块，使开发环境无需额外启动 API 服务器即可使用完整的 Redis GEO 功能。生产环境由 Vercel Serverless Functions 接管。

---

## 3. 数据结构

### 3.1 核心类型定义（`src/types.ts`）

```typescript
// 地标实体 — 对应 Supabase landmarks 表
interface Landmark {
  id: string;           // UUID (Supabase gen_random_uuid)
  name: string;         // 名称
  category: string;     // 分类
  latitude: number;     // WGS-84 纬度
  longitude: number;    // WGS-84 经度
  geohash: string;      // BASE32 编码（精度 7 位）
  created_at?: string;  // ISO 时间戳
}

// 收藏记录
interface Favorite {
  id: string;
  user_id: string;      // → auth.users(id)
  landmark_id: string;  // → landmarks(id)
  created_at: string;
}

// 已保存路线（单段）
interface SavedRoute {
  id: string;
  user_id: string;
  name: string;
  mode: string;         // walking | driving | bicycling
  origin_lat/lng: number;
  dest_lat/lng: number;
  origin_name / dest_name: string;
  strategy: number;     // 驾车策略码
  route_data: any;      // JSONB: 序列化的 RouteResult
  is_favorite: boolean;
  created_at: string;
}

// 已保存行程（多段）
interface SavedTrip {
  id: string;
  user_id: string;
  name: string;
  mode: string;
  waypoint_ids: string[];
  waypoint_names: string[];
  use_gps_start: boolean;
  gps_lat/lng?: number;
  segments_data: any;   // JSONB: RouteResult[]
  is_favorite: boolean;
  created_at: string;
}

// GIS 查询结果
interface NearbyResult  { landmark: Landmark; distanceKm: number; }
interface DistanceResult { fromLandmark: Landmark; toLandmark: Landmark; distanceKm: number; }
```

### 3.2 路径规划数据结构（`src/services/amap.ts`）

```typescript
// 路线步骤
interface RouteStep {
  instruction: string;           // 导航指令
  distance: number;              // 米
  duration: number;              // 秒
  polyline: [number, number][];  // WGS-84 [lng, lat] 坐标对
}

// 单条路径方案
interface RoutePath {
  distance: number;
  duration: number;
  steps: RouteStep[];
  polyline: [number, number][];  // 完整路线坐标
}

// 路径规划结果
interface RouteResult {
  origin: [number, number];       // WGS-84
  destination: [number, number];
  mode: TravelMode;               // walking | driving | bicycling
  paths: RoutePath[];             // 多方案（最多返回多条路线）
}
```

### 3.3 Redis GEO 数据结构

```text
Key:  landmarks:geo  (Sorted Set / GEO index)
Type: GEO spatial index

成员示例:
  GEOADD landmarks:geo -73.9857 40.7484 "uuid-empire-state"
  GEOADD landmarks:geo 2.2945   48.8584 "uuid-eiffel-tower"
  ...

底层存储: Sorted Set，member = landmark UUID，score = 52-bit Geohash integer
```

---

## 4. 接口（API Endpoints）

### 4.1 生产环境（Vercel Serverless Functions）

| 端点 | 方法 | 功能 | 关键调用 |
|------|------|------|---------|
| `/api/geo-nearby` | GET | 按经纬度+半径搜索邻近地标 | `Redis GEOSEARCH ... FROMLONLAT ... BYRADIUS ... WITHDIST` |
| `/api/geo-sync` | POST | Supabase → Redis 全量同步 | 先 `DEL` 再 `PIPELINE` 批量 `GEOADD` |
| `/api/geo-update` | POST | 增量新增/移除单个地标索引 | `action=add` → `GEOADD`；`action=remove` → `ZREM` |
| `/api/geo-test` | GET | Redis 健康检查 | `PING` + `ZCARD landmarks:geo` |
| `/api/health` | GET | 通用健康检查 | 返回 `hasRedisUrl`、Node 版本 |
| `/api/index` | GET | API 欢迎页 | 返回版本号和时间戳 |

### 4.2 开发环境（Vite Middleware Plugin）

`vite-api-plugin.ts` 在 Vite dev server 中拦截 `/api/*` 请求，动态 `import()` handler，实现零配置本地 API 开发。

### 4.3 前端直接调用

| 服务 | 调用方式 | 说明 |
|------|---------|------|
| Supabase | `@supabase/supabase-js` 客户端 SDK | landmarks CRUD、Auth、Favorites、Routes/Trips |
| 高德 API | 浏览器端 `fetch()` 直接调用 | 步行/驾车/骑行路径规划 REST API |
| 高德坐标系 | 纯前端 `wgs84ToGcj02()` / `gcj02ToWgs84()` | 无需服务端 |

---

## 5. 关键算法

### 5.1 Haversine 大圆距离公式

```typescript
// src/utils.ts
function calculateHaversineDistance(lat1, lon1, lat2, lon2): number {
  const R = 6371;  // 地球半径 (km)
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = sin²(dLat/2) + cos(lat1) * cos(lat2) * sin²(dLon/2);
  const c = 2 * atan2(√a, √(1-a));
  return (R * c).toFixed(3);  // 精度 3 位小数
}
```

用于：GIS 工具箱距离测算、本地 Fallback 邻近搜索（Redis 不可用时）。

### 5.2 Geohash 编码算法

```typescript
// src/utils.ts — BASE32 空间填充曲线编码
function encodeGeohash(lat, lng, precision = 7): string {
  // 交替二分经度/纬度区间
  // 每 5 bit 映射到 BASE32 字符
  // 精度 7 → 覆盖约 153m × 153m 网格
}
```

### 5.3 WGS-84 ↔ GCJ-02 坐标转换

```typescript
// src/services/amap.ts
wgs84ToGcj02(lng, lat): [number, number]  // GPS → 高德
gcj02ToWgs84(lng, lat): [number, number]  // 高德 → GPS
```

采用非线性偏移模型（基于多项式 + 正弦扰动），中国境外自动直通。用于 Leaflet (WGS-84) 与高德 API (GCJ-02) 之间的坐标转换。

### 5.4 最近邻 TSP 启发式

```typescript
// src/services/amap.ts
function optimizeWaypointOrder(startLng, startLat, points): number[] {
  // 贪心最近邻: 每次选择距当前点最近的未访问点
  // 时间复杂度 O(n²)，适用于 n ≤ 5 的小规模行程
}
```

### 5.5 Redis GEOSEARCH 邻近搜索

```redis
GEOSEARCH landmarks:geo
  FROMLONLAT <lng> <lat>
  BYRADIUS <radius> km
  ASC
  COUNT 100
  WITHDIST
```

Redis 内部使用 52-bit Geohash + Sorted Set 实现 O(log N + M) 的半径查询，相比全量 Haversine 计算 O(N) 提速显著（尤其在新增大批量地标后）。

---

## 6. Redis 实现详解

### 6.1 连接管理

```typescript
// api/lib/redis.ts
let redis: Redis | null = null;  // 模块级单例

async function getRedis(): Promise<Redis> {
  if (!redis) {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,       // 惰性连接，避免冷启动失败
      connectTimeout: 5000,
      tls: useTls ? { rejectUnauthorized: false } : undefined,
    });
    redis.on('error', () => {});  // 静默错误，防止未捕获异常
    await redis.connect();
  }
  return redis;
}

const GEO_KEY = 'landmarks:geo';
```

**关键设计：**
- **单例模式**：整个 Serverless Function 实例生命周期内复用同一 TCP 连接
- **惰性连接**：`lazyConnect: true` 避免 Redis 不可用时阻塞模块加载
- **TLS 自适应**：自动识别 `rediss://` 协议头并启用 TLS
- **错误静默**：`.on('error', () => {})` 防止 ioredis 默认的 `unhandled error` 崩溃

### 6.2 全量同步（`/api/geo-sync`）

```
Supabase landmarks 表 ──select id,latitude,longitude──▶ Pipeline GEOADD ▶ Redis GEO Key
```

流程：
1. 从 Supabase 拉取所有地标的 `id, latitude, longitude`
2. `DEL landmarks:geo` 清空旧索引
3. 构建 Redis Pipeline，批量 `GEOADD landmarks:geo <lng> <lat> <id>`
4. `pipeline.exec()` 一次性提交，大幅减少网络往返

### 6.3 增量更新（`/api/geo-update` + 前端联动）

地标新增/删除时，前端在 Supabase CRUD 成功后，**fire-and-forget** 异步调用：
- 新增：`POST /api/geo-update { action: 'add', id, latitude, longitude }` → `GEOADD`
- 删除：`POST /api/geo-update { action: 'remove', id }` → `ZREM`

这种设计保证 Redis GEO 索引与 Supabase 主数据库最终一致。

### 6.4 邻近搜索与降级策略

```
前端 handleSearchNearby()
  │
  ├─ 尝试: GET /api/geo-nearby?lat=&lng=&radius=
  │    │
  │    └─ 成功 → 使用 Redis GEOSEARCH 结果（O(log N+M)）
  │
  └─ 失败（Redis 不可用）→ Fallback:
       客户端 Haversine 全量扫描过滤 + 排序（O(N)）
```

### 6.5 健康监控

Header 中实时展示 Redis 连接状态和 GEO Key 中索引条目数，前端每 30 秒轮询 `/api/geo-test`。

---

## 7. 数据库设计（Supabase PostgreSQL）

### 7.1 表结构

| 表名 | 用途 | RLS | 关键字段 |
|------|------|-----|---------|
| `landmarks` | 地标主数据 | 公开读写 | id(UUID), name, category, latitude, longitude, geohash, created_at |
| `favorites` | 用户收藏 | 用户隔离 | user_id → auth.users, landmark_id → landmarks, UNIQUE(user_id, landmark_id) |
| `saved_routes` | 单段路线历史 | 用户隔离 | user_id, origin/dest coords, route_data(JSONB), is_favorite |
| `saved_trips` | 多段行程历史 | 用户隔离 | user_id, waypoint_ids/names(JSONB), segments_data(JSONB), is_favorite |

### 7.2 RLS 安全策略

- `landmarks`：公开读、公开写（演示项目）
- `favorites`、`saved_routes`、`saved_trips`：`auth.uid() = user_id` 严格隔离
- `anon` 角色被显式收回用户数据表的权限（`REVOKE ALL`）

### 7.3 索引

```sql
-- 加速用户维度查询
CREATE INDEX idx_favorites_user_id   ON favorites(user_id);
CREATE INDEX idx_saved_routes_user_id ON saved_routes(user_id);
CREATE INDEX idx_saved_trips_user_id  ON saved_trips(user_id);

-- 加速去重检查
CREATE INDEX idx_favorites_landmark_id ON favorites(landmark_id);
```

---

## 8. 部署架构

### 生产环境

- **前端**：Vite 构建的静态 SPA，部署于 Vercel
- **API**：Vercel Serverless Functions（`api/` 目录），自动路由匹配
- **路由**：`vercel.json` 中 `rewrites` 将所有非 `/api/` 请求指向 `index.html`（SPA fallback）
- **数据库**：Supabase 托管 PostgreSQL
- **缓存**：Redis 实例（通过 `REDIS_URL` 环境变量配置）

### 本地开发

- **Vite Dev Server**：端口 3000，含 `vite-api-plugin` 提供 API 路由
- **环境变量**：`.env` 文件注入 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`、`REDIS_URL`

---

## 9. 本地开发指南

### 9.1 克隆与安装

```bash
git clone <your-repository-url>
cd landmark_manager-main
npm install
```

### 9.2 配置环境变量

在项目根目录创建 `.env` 文件：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
REDIS_URL=redis://:password@host:6379
```

### 9.3 初始化数据库

登录 [Supabase 控制台](https://app.supabase.com/) → SQL Editor，依次执行：

1. `supabase_schema.sql` — 创建 `landmarks` 表及 RLS
2. `supabase_migration_auth.sql` — 创建 `favorites`、`saved_routes`、`saved_trips` 表
3. `supabase_migration_favorite.sql` — 添加 `is_favorite` 字段 + UPDATE 权限
4. `supabase_fix_grants.sql` — 授予角色权限 + 吊销 anon 权限

### 9.4 同步 Redis GEO 索引

首次运行或数据变更后，手动触发全量同步：

```bash
curl -X POST http://localhost:3000/api/geo-sync
```

### 9.5 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:3000`。

### 9.6 可用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器（端口 3000） |
| `npm run build` | 生产构建 |
| `npm run preview` | 预览生产构建 |
| `npm run lint` | TypeScript 类型检查 |

---

## 10. 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | React 19 + TypeScript |
| 构建工具 | Vite 6 |
| UI 框架 | Tailwind CSS 4 |
| 图标库 | Lucide React |
| 地图引擎 | Leaflet + react-leaflet + OpenStreetMap |
| 动画 | Motion (Framer Motion) |
| 数据库 | Supabase (PostgreSQL + RLS + Auth) |
| 缓存/空间索引 | Redis (ioredis) + GEO 命令集 |
| 路径规划 | 高德地图 REST API v3/v4 |
| 部署 | Vercel Serverless Functions |
| 运行时 | Node.js (Vercel Edge) |

---

## 11. 功能特性

- **GIS 工具箱**：Redis GEOSEARCH 邻近搜索 + Haversine 大圆距离
- **地标 CRUD**：完整的增删改查 + 前端分页/搜索/分类过滤
- **交互式地图**：多点标记、测距虚线、邻近高亮、GPS 定位
- **路径规划**：步行/驾车/骑行（高德 API），支持多方案切换 + 转向导航
- **多站行程**：最多 5 站，最近邻 TSP 排序优化
- **坐标系转换**：自动 WGS-84 ↔ GCJ-02 双向转换
- **外部地图跳转**：一键跳转高德/百度/Apple Maps
- **用户系统**：Supabase Auth 邮箱注册/登录 + RLS 数据隔离
- **收藏 & 历史**：地标、路线、行程三类收藏 + 浏览历史管理
- **Redis 降级**：Redis 不可用时自动 Fallback 本地 Haversine 计算
- **响应式设计**：桌面端侧边栏 + 移动端底部抽屉双布局
- **实时状态**：Header 实时展示 Supabase 和 Redis GEO 连接状态
