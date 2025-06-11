# 五子棋游戏后端服务

## 安装依赖

```bash
cd backend
npm install
```

## 启动服务

```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

## API接口

### 认证相关
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/profile` - 获取用户信息

### 游戏相关
- `POST /api/games/record` - 记录游戏结果
- `GET /api/games/history` - 获取游戏历史
- `GET /api/users/stats` - 获取用户统计

### 排行榜
- `GET /api/rankings` - 获取排行榜

## 环境配置

创建 `.env` 文件：
```
PORT=3000
JWT_SECRET=your-secret-key
DB_PATH=./database/game.db
```