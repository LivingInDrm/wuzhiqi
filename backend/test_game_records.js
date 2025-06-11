/**
 * 游戏记录API测试脚本
 */
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000/api';

// 测试用户注册登录获取token
async function getTestToken() {
    try {
        // 创建测试用户
        const registerResponse = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: `testuser_${Date.now()}`,
                password: 'password123',
                email: `test${Date.now()}@example.com`
            }),
        });

        if (!registerResponse.ok) {
            console.log('注册失败，尝试登录已存在用户...');
            // 尝试用固定用户登录
            const loginResponse = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: 'testuser',
                    password: 'password123'
                }),
            });
            
            if (loginResponse.ok) {
                const loginData = await loginResponse.json();
                return loginData.token;
            }
            
            throw new Error('无法获取测试token');
        }

        const registerData = await registerResponse.json();
        return registerData.token;
    } catch (error) {
        console.error('获取测试token失败:', error.message);
        throw error;
    }
}

// 测试记录游戏结果
async function testRecordGame(token) {
    console.log('\n📝 测试记录游戏结果...');
    
    try {
        const response = await fetch(`${API_BASE}/games/record`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                result: 'win',
                difficulty: 'advanced',
                moves: 85,
                duration: 120,
                userColor: 'black',
                finalScore: 1500
            }),
        });

        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ 游戏记录成功:', data.record.id);
            console.log('   胜负结果:', data.record.result);
            console.log('   难度等级:', data.record.difficulty);
            console.log('   用时:', data.record.duration_formatted);
            return data.record.id;
        } else {
            console.error('❌ 记录游戏失败:', data.message);
        }
    } catch (error) {
        console.error('❌ 记录游戏错误:', error.message);
    }
}

// 测试获取游戏历史
async function testGetHistory(token) {
    console.log('\n📚 测试获取游戏历史...');
    
    try {
        const response = await fetch(`${API_BASE}/games/history?page=1&limit=5`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ 获取历史成功:');
            console.log('   总记录数:', data.pagination.total);
            console.log('   本页记录:', data.data.length);
            data.data.forEach((record, index) => {
                console.log(`   ${index + 1}. ${record.result} vs ${record.difficulty} (${record.duration_formatted})`);
            });
        } else {
            console.error('❌ 获取历史失败:', data.message);
        }
    } catch (error) {
        console.error('❌ 获取历史错误:', error.message);
    }
}

// 测试获取用户统计
async function testGetStats(token) {
    console.log('\n📊 测试获取用户统计...');
    
    try {
        const response = await fetch(`${API_BASE}/games/stats`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ 获取统计成功:');
            console.log('   总游戏数:', data.stats.basic.total_games);
            console.log('   胜利次数:', data.stats.basic.wins);
            console.log('   胜率:', data.stats.basic.win_rate + '%');
            console.log('   平均用时:', data.stats.basic.avg_duration + '秒');
            
            if (data.stats.by_difficulty.length > 0) {
                console.log('   按难度统计:');
                data.stats.by_difficulty.forEach(stat => {
                    console.log(`     ${stat.difficulty}: ${stat.games_count}局 (胜率${stat.win_rate}%)`);
                });
            }
        } else {
            console.error('❌ 获取统计失败:', data.message);
        }
    } catch (error) {
        console.error('❌ 获取统计错误:', error.message);
    }
}

// 测试获取全局统计
async function testGetGlobalStats() {
    console.log('\n🌍 测试获取全局统计...');
    
    try {
        const response = await fetch(`${API_BASE}/games/global-stats`, {
            method: 'GET'
        });

        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ 获取全局统计成功:');
            console.log('   总游戏数:', data.stats.global.total_games);
            console.log('   总玩家数:', data.stats.global.total_players);
            console.log('   今日游戏:', data.stats.today.games_today);
            console.log('   今日活跃玩家:', data.stats.today.active_players_today);
        } else {
            console.error('❌ 获取全局统计失败:', data.message);
        }
    } catch (error) {
        console.error('❌ 获取全局统计错误:', error.message);
    }
}

// 主测试函数
async function runTests() {
    console.log('🧪 开始游戏记录API测试...\n');
    
    try {
        // 获取测试token
        console.log('🔑 获取测试token...');
        const token = await getTestToken();
        console.log('✅ Token获取成功');

        // 记录几局游戏
        await testRecordGame(token);
        
        // 再记录一局失败的游戏
        const response2 = await fetch(`${API_BASE}/games/record`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                result: 'lose',
                difficulty: 'simple',
                moves: 45,
                duration: 89,
                userColor: 'white'
            }),
        });
        
        if (response2.ok) {
            console.log('✅ 第二局游戏记录成功');
        }

        // 测试各项功能
        await testGetHistory(token);
        await testGetStats(token);
        await testGetGlobalStats();

        console.log('\n🎉 所有测试完成!');

    } catch (error) {
        console.error('\n❌ 测试失败:', error.message);
    }
}

// 运行测试
runTests();