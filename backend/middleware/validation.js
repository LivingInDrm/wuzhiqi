/**
 * 请求验证中间件
 */

/**
 * 验证用户注册数据
 */
export function validateRegistration(req, res, next) {
    const { username, email, password } = req.body;
    const errors = [];

    // 用户名验证
    if (!username || typeof username !== 'string') {
        errors.push('用户名不能为空');
    } else if (username.length < 3 || username.length > 20) {
        errors.push('用户名长度必须在3-20个字符之间');
    } else if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) {
        errors.push('用户名只能包含字母、数字、下划线和中文');
    }

    // 邮箱验证
    if (!email || typeof email !== 'string') {
        errors.push('邮箱不能为空');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('邮箱格式不正确');
    }

    // 密码验证
    if (!password || typeof password !== 'string') {
        errors.push('密码不能为空');
    } else if (password.length < 6 || password.length > 50) {
        errors.push('密码长度必须在6-50个字符之间');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            error: '数据验证失败',
            details: errors
        });
    }

    next();
}

/**
 * 验证用户登录数据
 */
export function validateLogin(req, res, next) {
    const { username, password } = req.body;
    const errors = [];

    if (!username || typeof username !== 'string') {
        errors.push('用户名不能为空');
    }

    if (!password || typeof password !== 'string') {
        errors.push('密码不能为空');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            error: '登录数据验证失败',
            details: errors
        });
    }

    next();
}

/**
 * 验证游戏记录数据
 */
export function validateGameRecord(req, res, next) {
    const { result, difficulty, moves, duration } = req.body;
    const errors = [];

    // 游戏结果验证
    if (!result || !['win', 'lose', 'draw'].includes(result)) {
        errors.push('游戏结果必须是: win, lose, draw 之一');
    }

    // 难度验证
    if (!difficulty || !['simple', 'advanced', 'professional'].includes(difficulty)) {
        errors.push('游戏难度必须是: simple, advanced, professional 之一');
    }

    // 步数验证
    if (!moves || typeof moves !== 'number' || moves < 1 || moves > 500) {
        errors.push('游戏步数必须是1-500之间的数字');
    }

    // 游戏时长验证
    if (!duration || typeof duration !== 'number' || duration < 1 || duration > 7200) {
        errors.push('游戏时长必须是1-7200秒之间的数字');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            error: '游戏记录数据验证失败',
            details: errors
        });
    }

    next();
}

/**
 * 统一错误响应
 */
export function handleValidationError(error, field = '数据') {
    return {
        error: `${field}验证失败`,
        message: error.message || '请检查输入数据格式'
    };
}