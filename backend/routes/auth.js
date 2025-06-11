import express from 'express';
import { User } from '../models/User.js';
import { generateToken, authenticateToken, refreshToken } from '../middleware/auth.js';
import { validateRegistration, validateLogin } from '../middleware/validation.js';

const router = express.Router();

/**
 * 用户注册
 * POST /api/auth/register
 */
router.post('/register', validateRegistration, async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        console.log(`📝 用户注册请求: ${username} (${email})`);

        // 创建新用户
        const user = await User.create({ username, email, password });

        // 生成JWT token
        const token = generateToken({
            userId: user.id,
            username: user.username
        });

        // 获取用户统计信息
        const stats = await user.getStats();

        console.log(`✅ 用户注册成功: ${user.username}`);

        res.status(201).json({
            message: '注册成功',
            user: {
                ...user.toJSON(),
                stats
            },
            token,
            expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        });

    } catch (error) {
        console.error('❌ 用户注册失败:', error.message);
        
        if (error.message.includes('已存在') || error.message.includes('已被注册')) {
            return res.status(409).json({
                error: '注册失败',
                message: error.message
            });
        }
        
        res.status(500).json({
            error: '注册失败',
            message: '服务器内部错误，请稍后重试'
        });
    }
});

/**
 * 用户登录
 * POST /api/auth/login
 */
router.post('/login', validateLogin, async (req, res) => {
    try {
        const { username, password } = req.body;
        
        console.log(`🔐 用户登录请求: ${username}`);

        // 验证用户凭据
        const user = await User.authenticate(username, password);

        // 生成JWT token
        const token = generateToken({
            userId: user.id,
            username: user.username
        });

        // 获取用户统计信息
        const stats = await user.getStats();

        console.log(`✅ 用户登录成功: ${user.username}`);

        res.json({
            message: '登录成功',
            user: {
                ...user.toJSON(),
                stats
            },
            token,
            expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        });

    } catch (error) {
        console.error('❌ 用户登录失败:', error.message);
        
        if (error.message.includes('用户名或密码错误')) {
            return res.status(401).json({
                error: '登录失败',
                message: '用户名或密码错误'
            });
        }
        
        res.status(500).json({
            error: '登录失败',
            message: '服务器内部错误，请稍后重试'
        });
    }
});

/**
 * 获取用户信息
 * GET /api/auth/profile
 */
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        console.log(`👤 获取用户信息: ${req.user.username}`);

        // 获取最新的用户信息
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({
                error: '用户不存在',
                message: '用户账户不存在或已被停用'
            });
        }

        // 获取用户统计信息
        const stats = await user.getStats();

        res.json({
            message: '获取用户信息成功',
            user: {
                ...user.toJSON(),
                stats
            }
        });

    } catch (error) {
        console.error('❌ 获取用户信息失败:', error.message);
        res.status(500).json({
            error: '获取用户信息失败',
            message: '服务器内部错误'
        });
    }
});

/**
 * 刷新Token
 * POST /api/auth/refresh
 */
router.post('/refresh', authenticateToken, refreshToken);

/**
 * 用户登出
 * POST /api/auth/logout
 */
router.post('/logout', authenticateToken, (req, res) => {
    try {
        console.log(`👋 用户登出: ${req.user.username}`);
        
        // 注意: JWT是无状态的，我们无法在服务端"删除"token
        // 在生产环境中，可以考虑维护一个黑名单或使用Redis存储token状态
        
        res.json({
            message: '登出成功',
            tip: '请在客户端删除存储的token'
        });

    } catch (error) {
        console.error('❌ 用户登出失败:', error.message);
        res.status(500).json({
            error: '登出失败',
            message: '服务器内部错误'
        });
    }
});

/**
 * 修改密码
 * POST /api/auth/change-password
 */
router.post('/change-password', authenticateToken, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        
        if (!oldPassword || !newPassword) {
            return res.status(400).json({
                error: '参数错误',
                message: '请提供原密码和新密码'
            });
        }

        if (newPassword.length < 6 || newPassword.length > 50) {
            return res.status(400).json({
                error: '密码格式错误',
                message: '新密码长度必须在6-50个字符之间'
            });
        }

        console.log(`🔐 修改密码请求: ${req.user.username}`);

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                error: '用户不存在',
                message: '用户账户不存在'
            });
        }

        await user.changePassword(oldPassword, newPassword);

        res.json({
            message: '密码修改成功',
            tip: '请使用新密码重新登录'
        });

    } catch (error) {
        console.error('❌ 修改密码失败:', error.message);
        
        if (error.message.includes('原密码错误')) {
            return res.status(400).json({
                error: '原密码错误',
                message: '请输入正确的原密码'
            });
        }
        
        res.status(500).json({
            error: '修改密码失败',
            message: '服务器内部错误'
        });
    }
});

/**
 * 验证用户名是否可用
 * GET /api/auth/check-username/:username
 */
router.get('/check-username/:username', async (req, res) => {
    try {
        const { username } = req.params;
        
        if (!username || username.length < 3) {
            return res.status(400).json({
                error: '用户名无效',
                message: '用户名长度至少3个字符'
            });
        }

        const existingUser = await User.findByUsername(username);
        const isAvailable = !existingUser;

        res.json({
            username,
            available: isAvailable,
            message: isAvailable ? '用户名可用' : '用户名已被占用'
        });

    } catch (error) {
        console.error('❌ 检查用户名失败:', error.message);
        res.status(500).json({
            error: '检查失败',
            message: '服务器内部错误'
        });
    }
});

export default router;