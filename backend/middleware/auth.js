import jwt from 'jsonwebtoken';
import { getOneFromDatabase } from '../database/connection.js';

// JWT配置
const JWT_SECRET = process.env.JWT_SECRET || 'wuziqi-game-super-secret-key-for-development-only-2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * 生成JWT token
 */
export function generateToken(payload) {
    try {
        return jwt.sign(payload, JWT_SECRET, { 
            expiresIn: JWT_EXPIRES_IN,
            issuer: 'wuziqi-game',
            audience: 'wuziqi-users'
        });
    } catch (error) {
        console.error('🔐 Token生成失败:', error);
        throw new Error('Token生成失败');
    }
}

/**
 * 验证JWT token
 */
export function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET, {
            issuer: 'wuziqi-game',
            audience: 'wuziqi-users'
        });
    } catch (error) {
        console.error('🔐 Token验证失败:', error.message);
        throw new Error('Token无效或已过期');
    }
}

/**
 * JWT认证中间件
 */
export async function authenticateToken(req, res, next) {
    try {
        // 从请求头获取token
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.startsWith('Bearer ') 
            ? authHeader.slice(7) 
            : null;

        if (!token) {
            return res.status(401).json({
                error: '访问被拒绝',
                message: '请提供有效的访问令牌'
            });
        }

        // 验证token
        const decoded = verifyToken(token);
        
        // 从数据库获取用户信息
        const user = await getOneFromDatabase(
            'SELECT id, username, email, is_active FROM users WHERE id = ? AND is_active = 1',
            [decoded.userId]
        );

        if (!user) {
            return res.status(401).json({
                error: '用户不存在',
                message: '用户账户不存在或已被停用'
            });
        }

        // 将用户信息添加到请求对象
        req.user = user;
        req.token = token;
        
        console.log(`🔐 用户认证成功: ${user.username} (ID: ${user.id})`);
        next();

    } catch (error) {
        console.error('🔐 认证中间件错误:', error);
        
        if (error.message.includes('Token无效') || error.message.includes('jwt')) {
            return res.status(401).json({
                error: 'Token无效',
                message: '访问令牌无效或已过期，请重新登录'
            });
        }
        
        return res.status(500).json({
            error: '认证服务错误',
            message: '服务器内部错误'
        });
    }
}

/**
 * 可选认证中间件（不强制要求登录）
 */
export async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.startsWith('Bearer ') 
            ? authHeader.slice(7) 
            : null;

        if (token) {
            try {
                const decoded = verifyToken(token);
                const user = await getOneFromDatabase(
                    'SELECT id, username, email, is_active FROM users WHERE id = ? AND is_active = 1',
                    [decoded.userId]
                );
                
                if (user) {
                    req.user = user;
                    req.token = token;
                }
            } catch (error) {
                // 可选认证失败时不报错，继续执行
                console.log('🔐 可选认证失败，继续匿名访问');
            }
        }
        
        next();
    } catch (error) {
        console.error('🔐 可选认证中间件错误:', error);
        next(); // 继续执行，不阻断请求
    }
}

/**
 * 管理员权限检查中间件
 */
export async function requireAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            error: '需要登录',
            message: '此操作需要登录'
        });
    }

    // 检查用户是否为管理员（这里可以根据需要扩展）
    if (req.user.username !== 'admin') {
        return res.status(403).json({
            error: '权限不足',
            message: '此操作需要管理员权限'
        });
    }

    next();
}

/**
 * 刷新Token
 */
export function refreshToken(req, res) {
    try {
        if (!req.user) {
            return res.status(401).json({
                error: '用户未认证',
                message: '请先登录'
            });
        }

        const newToken = generateToken({
            userId: req.user.id,
            username: req.user.username
        });

        res.json({
            message: 'Token刷新成功',
            token: newToken,
            expiresIn: JWT_EXPIRES_IN
        });

    } catch (error) {
        console.error('🔐 Token刷新失败:', error);
        res.status(500).json({
            error: 'Token刷新失败',
            message: '服务器内部错误'
        });
    }
}