#!/bin/bash

# 🚀 DLMM Fastify版本测试脚本

echo "🌟 启动DLMM Fastify版本测试..."

# 检查依赖
echo "📦 检查依赖..."
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm未安装，请先安装pnpm"
    exit 1
fi

# 安装依赖
echo "📥 安装Fastify相关依赖..."
pnpm add fastify @fastify/cors @fastify/helmet @fastify/compress @fastify/rate-limit @fastify/static @fastify/websocket @fastify/autoload @fastify/sensible fastify-plugin

# 构建项目
echo "🔨 构建项目..."
pnpm run build

# 启动Fastify服务器
echo "🚀 启动Fastify服务器..."
echo "访问地址："
echo "  - 健康检查: http://localhost:7001/api/health"
echo "  - 详细健康检查: http://localhost:7001/api/health/detailed"
echo "  - 系统信息: http://localhost:7001/api/info"
echo "  - WebSocket: ws://localhost:7001/ws"

pnpm run start:fastify
