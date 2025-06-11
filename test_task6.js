/**
 * Task 6 功能测试脚本
 * 测试用户状态管理和登录界面系统
 */

import fetch from 'node-fetch';

const FRONTEND_URL = 'http://localhost:8080';
const BACKEND_URL = 'http://localhost:3000/api';

console.log('🧪 开始 Task 6 功能测试...\n');

// 测试1: 检查前端服务器状态
async function testFrontendServer() {
    console.log('📡 测试前端服务器...');
    try {
        const response = await fetch(`${FRONTEND_URL}/frontend/user-demo.html`);
        if (response.ok) {
            console.log('✅ 前端服务器运行正常');
            console.log(`   演示页面: ${FRONTEND_URL}/frontend/user-demo.html`);
            return true;
        }
    } catch (error) {
        console.log('❌ 前端服务器连接失败');
        return false;
    }
}

// 测试2: 检查后端API
async function testBackendAPI() {
    console.log('\n🔗 测试后端API...');
    try {
        const response = await fetch(`${BACKEND_URL}/health`);
        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ 后端API运行正常');
            console.log(`   服务器状态: ${data.status}`);
            console.log(`   运行时间: ${Math.round(data.uptime)}秒`);
            return true;
        }
    } catch (error) {
        console.log('❌ 后端API连接失败');
        return false;
    }
}

// 测试3: 用户注册功能
async function testUserRegistration() {
    console.log('\n👤 测试用户注册功能...');
    try {
        const testUser = {
            username: `testuser_${Date.now()}`,
            email: `test${Date.now()}@example.com`,
            password: 'password123'
        };

        const response = await fetch(`${BACKEND_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testUser)
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ 用户注册功能正常');
            console.log(`   新用户: ${testUser.username}`);
            console.log(`   Token已生成: ${data.token ? '是' : '否'}`);
            return { success: true, token: data.token, user: data.user };
        } else {
            console.log('❌ 用户注册失败:', data.message);
            return { success: false };
        }
    } catch (error) {
        console.log('❌ 用户注册测试出错:', error.message);
        return { success: false };
    }
}

// 测试4: 用户登录功能
async function testUserLogin(username, password) {
    console.log('\n🔑 测试用户登录功能...');
    try {
        const response = await fetch(`${BACKEND_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ 用户登录功能正常');
            console.log(`   登录用户: ${username}`);
            console.log(`   Token验证: ${data.token ? '通过' : '失败'}`);
            return { success: true, token: data.token };
        } else {
            console.log('❌ 用户登录失败:', data.message);
            return { success: false };
        }
    } catch (error) {
        console.log('❌ 用户登录测试出错:', error.message);
        return { success: false };
    }
}

// 测试5: 用户信息获取
async function testUserProfile(token) {
    console.log('\n📊 测试用户信息获取...');
    try {
        const response = await fetch(`${BACKEND_URL}/auth/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ 用户信息获取正常');
            console.log(`   用户名: ${data.user.username}`);
            console.log(`   邮箱: ${data.user.email}`);
            console.log(`   注册时间: ${data.user.created_at}`);
            return true;
        } else {
            console.log('❌ 用户信息获取失败:', data.message);
            return false;
        }
    } catch (error) {
        console.log('❌ 用户信息测试出错:', error.message);
        return false;
    }
}

// 测试6: 游戏记录功能
async function testGameRecord(token) {
    console.log('\n🎮 测试游戏记录功能...');
    try {
        const gameData = {
            result: 'win',
            difficulty: 'advanced',
            moves: 75,
            duration: 120,
            userColor: 'black'
        };

        const response = await fetch(`${BACKEND_URL}/games/record`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(gameData)
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ 游戏记录功能正常');
            console.log(`   记录ID: ${data.record.id}`);
            console.log(`   游戏结果: ${data.record.result}`);
            console.log(`   难度: ${data.record.difficulty}`);
            return true;
        } else {
            console.log('❌ 游戏记录失败:', data.message);
            return false;
        }
    } catch (error) {
        console.log('❌ 游戏记录测试出错:', error.message);
        return false;
    }
}

// 测试7: 用户统计获取
async function testUserStats(token) {
    console.log('\n📈 测试用户统计获取...');
    try {
        const response = await fetch(`${BACKEND_URL}/games/stats`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ 用户统计获取正常');
            console.log(`   总游戏数: ${data.stats.basic.total_games}`);
            console.log(`   胜利次数: ${data.stats.basic.wins}`);
            console.log(`   胜率: ${data.stats.basic.win_rate}%`);
            return true;
        } else {
            console.log('❌ 用户统计获取失败:', data.message);
            return false;
        }
    } catch (error) {
        console.log('❌ 用户统计测试出错:', error.message);
        return false;
    }
}

// 执行所有测试
async function runAllTests() {
    const results = [];

    // 基础连接测试
    results.push(await testFrontendServer());
    results.push(await testBackendAPI());

    // 用户系统测试
    const registerResult = await testUserRegistration();
    results.push(registerResult.success);

    if (registerResult.success) {
        // 使用注册的用户进行后续测试
        const username = registerResult.user.username;
        const password = 'password123';
        const token = registerResult.token;

        const loginResult = await testUserLogin(username, password);
        results.push(loginResult.success);

        if (loginResult.success) {
            results.push(await testUserProfile(token));
            results.push(await testGameRecord(token));
            results.push(await testUserStats(token));
        }
    }

    // 统计结果
    const passed = results.filter(r => r).length;
    const total = results.length;

    console.log('\n' + '='.repeat(50));
    console.log('📋 Task 6 测试结果总结');
    console.log('='.repeat(50));
    console.log(`✅ 通过测试: ${passed}/${total}`);
    console.log(`❌ 失败测试: ${total - passed}/${total}`);
    console.log(`📊 成功率: ${Math.round(passed / total * 100)}%`);

    if (passed === total) {
        console.log('\n🎉 Task 6 所有功能测试通过！');
        console.log('🌟 用户状态管理和登录界面系统运行正常');
    } else {
        console.log('\n⚠️ 部分测试失败，请检查相关功能');
    }

    console.log('\n📱 可以访问以下链接进行手动测试:');
    console.log(`   演示页面: ${FRONTEND_URL}/frontend/user-demo.html`);
    console.log(`   API测试页面: ${FRONTEND_URL}/frontend/api-test.html`);
    console.log(`   主游戏页面: ${FRONTEND_URL}/frontend/index.html`);
}

// 启动测试
runAllTests().catch(error => {
    console.error('🚨 测试执行失败:', error);
});