#!/bin/bash

echo "🚀 启动五子棋前端开发服务器..."

# 检查Python3是否可用
if command -v python3 &> /dev/null; then
    echo "📡 使用Python3启动HTTP服务器 (端口8080)..."
    python3 -m http.server 8080
elif command -v python &> /dev/null; then
    echo "📡 使用Python启动HTTP服务器 (端口8080)..."
    python -m http.server 8080
elif command -v npx &> /dev/null; then
    echo "📡 使用Node.js http-server启动服务器 (端口8080)..."
    npx http-server -p 8080 -c-1
else
    echo "❌ 错误: 未找到Python或Node.js，请安装其中一个"
    echo "💡 安装建议:"
    echo "   - Python: https://python.org"
    echo "   - Node.js: https://nodejs.org"
    exit 1
fi