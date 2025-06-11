import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// 获取当前文件目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 创建Express应用
const app = express();

// 环境配置
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:8080';

// 确保数据库目录存在
const dbDir = join(__dirname, 'database');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log('📁 创建数据库目录:', dbDir);
}

// 初始化数据库连接
import { getDatabase } from './database/connection.js';
console.log('🗄️  初始化数据库连接...');
getDatabase();

// =================中间件配置=================

// 安全中间件
app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false
}));

// CORS配置
app.use(cors({
    origin: NODE_ENV === 'development' ? ['http://localhost:8080', 'http://localhost:8081', 'http://localhost:8082'] : CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 限流配置
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: NODE_ENV === 'development' ? 1000 : 100, // 开发模式更宽松
    message: {
        error: '请求过于频繁，请稍后再试',
        retryAfter: '15分钟'
    }
});
app.use(limiter);

// 请求解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 请求日志
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`📝 ${timestamp} ${req.method} ${req.path} - ${req.ip}`);
    next();
});

// =================路由配置=================

// 导入路由模块
import authRoutes from './routes/auth.js';
import gameRoutes from './routes/games.js';

// 注册路由
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);

// 健康检查接口
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: NODE_ENV,
        uptime: process.uptime()
    });
});

// API根路径
app.get('/api', (req, res) => {
    res.json({
        message: '🎮 五子棋游戏后端API',
        version: '1.0.0',
        endpoints: {
            health: 'GET /api/health',
            auth: {
                register: 'POST /api/auth/register',
                login: 'POST /api/auth/login',
                profile: 'GET /api/auth/profile'
            },
            games: {
                record: 'POST /api/games/record',
                history: 'GET /api/games/history',
                stats: 'GET /api/games/stats',
                globalStats: 'GET /api/games/global-stats',
                deleteRecord: 'DELETE /api/games/record/:id'
            },
            rankings: 'GET /api/rankings'
        }
    });
});

// 404处理
app.use('/api/*', (req, res) => {
    res.status(404).json({
        error: 'API接口不存在',
        path: req.path,
        method: req.method
    });
});

// =================错误处理=================

// 全局错误处理
app.use((err, req, res, next) => {
    console.error('💥 服务器错误:', err);
    
    // 开发环境返回详细错误信息
    if (NODE_ENV === 'development') {
        return res.status(500).json({
            error: '服务器内部错误',
            message: err.message,
            stack: err.stack
        });
    }
    
    // 生产环境返回简化错误信息
    res.status(500).json({
        error: '服务器内部错误',
        message: '请稍后重试'
    });
});

// =================服务器启动=================

// 优雅关闭处理
const server = app.listen(PORT, () => {
    console.log(`
🚀 五子棋游戏后端服务启动成功!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 服务地址: http://localhost:${PORT}
🌍 环境模式: ${NODE_ENV}
🔗 健康检查: http://localhost:${PORT}/api/health
📚 API文档: http://localhost:${PORT}/api
🕒 启动时间: ${new Date().toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);
});

// 优雅关闭
const gracefulShutdown = (signal) => {
    console.log(`\n🛑 收到${signal}信号，正在优雅关闭服务器...`);
    server.close(() => {
        console.log('✅ 服务器已关闭');
        process.exit(0);
    });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;