import express from 'express';
import { GameRecord } from '../models/GameRecord.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { validateGameRecord } from '../middleware/validation.js';

const router = express.Router();

/**
 * 记录游戏结果
 * POST /api/games/record
 */
router.post('/record', authenticateToken, validateGameRecord, async (req, res) => {
    try {
        const { result, difficulty, moves, duration, userColor, finalScore } = req.body;
        const userId = req.user.id;

        console.log(`🎮 记录游戏结果: 用户${req.user.username}, 结果${result}, 难度${difficulty}`);

        // 创建游戏记录
        const gameRecord = await GameRecord.create({
            userId,
            result,
            difficulty,
            moves,
            duration,
            userColor: userColor || 'black',
            finalScore
        });

        // 获取更新后的用户统计
        const userStats = await GameRecord.getUserStats(userId);

        console.log(`✅ 游戏记录成功: ${gameRecord.id}`);

        res.status(201).json({
            message: '游戏记录成功',
            record: gameRecord.toJSON(),
            user_stats: userStats.basic
        });

    } catch (error) {
        console.error('❌ 记录游戏失败:', error.message);
        
        if (error.message.includes('无效的')) {
            return res.status(400).json({
                error: '参数错误',
                message: error.message
            });
        }
        
        res.status(500).json({
            error: '记录游戏失败',
            message: '服务器内部错误'
        });
    }
});

/**
 * 获取用户游戏历史
 * GET /api/games/history
 */
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            page = 1,
            limit = 20,
            difficulty,
            result,
            sortBy = 'created_at',
            sortOrder = 'DESC'
        } = req.query;

        console.log(`📚 获取用户游戏历史: ${req.user.username}`);

        const history = await GameRecord.getUserHistory(userId, {
            page: parseInt(page),
            limit: Math.min(parseInt(limit), 100), // 限制最大每页数量
            difficulty,
            result,
            sortBy,
            sortOrder
        });

        res.json({
            message: '获取游戏历史成功',
            data: history.records.map(record => record.toJSON()),
            pagination: history.pagination
        });

    } catch (error) {
        console.error('❌ 获取游戏历史失败:', error.message);
        res.status(500).json({
            error: '获取游戏历史失败',
            message: '服务器内部错误'
        });
    }
});

/**
 * 获取用户详细统计
 * GET /api/games/stats
 */
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        console.log(`📊 获取用户统计: ${req.user.username}`);

        const stats = await GameRecord.getUserStats(userId);

        res.json({
            message: '获取用户统计成功',
            stats
        });

    } catch (error) {
        console.error('❌ 获取用户统计失败:', error.message);
        res.status(500).json({
            error: '获取用户统计失败',
            message: '服务器内部错误'
        });
    }
});

/**
 * 获取指定用户的游戏历史（公开接口）
 * GET /api/games/history/:userId
 */
router.get('/history/:userId', optionalAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const {
            page = 1,
            limit = 10, // 公开接口限制更严格
            difficulty,
            result
        } = req.query;

        // 检查是否为用户本人或有权限查看
        const isOwnProfile = req.user && req.user.id == userId;
        const maxLimit = isOwnProfile ? 50 : 10;

        console.log(`👀 查看用户${userId}游戏历史`);

        const history = await GameRecord.getUserHistory(userId, {
            page: parseInt(page),
            limit: Math.min(parseInt(limit), maxLimit),
            difficulty,
            result,
            sortBy: 'created_at',
            sortOrder: 'DESC'
        });

        // 过滤敏感信息（非本人查看时）
        const filteredRecords = history.records.map(record => {
            const recordData = record.toJSON();
            if (!isOwnProfile) {
                // 移除一些敏感信息
                delete recordData.user_id;
            }
            return recordData;
        });

        res.json({
            message: '获取游戏历史成功',
            data: filteredRecords,
            pagination: history.pagination,
            is_own_profile: isOwnProfile
        });

    } catch (error) {
        console.error('❌ 获取指定用户游戏历史失败:', error.message);
        res.status(500).json({
            error: '获取游戏历史失败',
            message: '服务器内部错误'
        });
    }
});

/**
 * 获取全局游戏统计
 * GET /api/games/global-stats
 */
router.get('/global-stats', async (req, res) => {
    try {
        console.log('🌍 获取全局游戏统计');

        const globalStats = await GameRecord.getGlobalStats();

        res.json({
            message: '获取全局统计成功',
            stats: globalStats
        });

    } catch (error) {
        console.error('❌ 获取全局统计失败:', error.message);
        res.status(500).json({
            error: '获取全局统计失败',
            message: '服务器内部错误'
        });
    }
});

/**
 * 获取排行榜
 * GET /api/games/leaderboard
 */
router.get('/leaderboard', async (req, res) => {
    try {
        const { 
            type = 'win_rate', 
            limit = 20, 
            difficulty = 'all' 
        } = req.query;

        console.log(`🏆 获取排行榜: ${type}, 限制${limit}, 难度${difficulty}`);

        const leaderboard = await GameRecord.getLeaderboard({
            type,
            limit: parseInt(limit),
            difficulty
        });

        res.json({
            message: '获取排行榜成功',
            leaderboard: leaderboard,
            type: type,
            difficulty: difficulty,
            total_users: leaderboard.length
        });

    } catch (error) {
        console.error('❌ 获取排行榜失败:', error.message);
        res.status(500).json({
            error: '获取排行榜失败',
            message: '服务器内部错误'
        });
    }
});

/**
 * 删除游戏记录
 * DELETE /api/games/record/:id
 */
router.delete('/record/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        console.log(`🗑️ 删除游戏记录: ${id}, 用户: ${req.user.username}`);

        const success = await GameRecord.deleteRecord(id, userId);

        if (!success) {
            return res.status(404).json({
                error: '记录不存在',
                message: '游戏记录不存在或已被删除'
            });
        }

        res.json({
            message: '游戏记录删除成功',
            record_id: id
        });

    } catch (error) {
        console.error('❌ 删除游戏记录失败:', error.message);
        
        if (error.message.includes('无权限')) {
            return res.status(403).json({
                error: '权限不足',
                message: '您没有权限删除此记录'
            });
        }
        
        res.status(500).json({
            error: '删除记录失败',
            message: '服务器内部错误'
        });
    }
});

/**
 * 获取单个游戏记录详情
 * GET /api/games/record/:id
 */
router.get('/record/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        console.log(`🔍 获取游戏记录详情: ${id}`);

        const record = await GameRecord.findById(id);

        if (!record) {
            return res.status(404).json({
                error: '记录不存在',
                message: '游戏记录不存在'
            });
        }

        // 检查权限（只能查看自己的记录）
        if (record.user_id !== req.user.id) {
            return res.status(403).json({
                error: '权限不足',
                message: '您没有权限查看此记录'
            });
        }

        res.json({
            message: '获取记录详情成功',
            record: record.toJSON()
        });

    } catch (error) {
        console.error('❌ 获取游戏记录详情失败:', error.message);
        res.status(500).json({
            error: '获取记录详情失败',
            message: '服务器内部错误'
        });
    }
});

/**
 * 批量删除游戏记录
 * DELETE /api/games/records
 */
router.delete('/records', authenticateToken, async (req, res) => {
    try {
        const { recordIds } = req.body;
        const userId = req.user.id;

        if (!Array.isArray(recordIds) || recordIds.length === 0) {
            return res.status(400).json({
                error: '参数错误',
                message: '请提供要删除的记录ID数组'
            });
        }

        if (recordIds.length > 50) {
            return res.status(400).json({
                error: '参数错误',
                message: '一次最多删除50条记录'
            });
        }

        console.log(`🗑️ 批量删除游戏记录: ${recordIds.length}条, 用户: ${req.user.username}`);

        let successCount = 0;
        let failedIds = [];

        for (const id of recordIds) {
            try {
                const success = await GameRecord.deleteRecord(id, userId);
                if (success) {
                    successCount++;
                } else {
                    failedIds.push(id);
                }
            } catch (error) {
                failedIds.push(id);
            }
        }

        res.json({
            message: `批量删除完成`,
            success_count: successCount,
            failed_count: failedIds.length,
            failed_ids: failedIds
        });

    } catch (error) {
        console.error('❌ 批量删除游戏记录失败:', error.message);
        res.status(500).json({
            error: '批量删除失败',
            message: '服务器内部错误'
        });
    }
});

export default router;