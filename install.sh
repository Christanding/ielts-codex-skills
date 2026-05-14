#!/usr/bin/env bash
# IELTS Skills V1.0 — Mac/Linux 安装脚本
# 用法：bash install.sh   （或 chmod +x install.sh && ./install.sh）
#
# 它做的事：
#   1. 把 7 个 skill 的 SKILL.md 复制到 ~/.codex/skills/
#   2. 把 ielts-dashboard 的 SKILL.md + dashboard 项目（不含 node_modules）复制过去
#   3. 复制 SCHEMA.md
#   4. 提示下一步

set -e

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DST="$HOME/.codex/skills"

echo ""
echo "=== 雅思 Skills V1.0 安装 ==="
echo ""
echo "源目录：$SRC"
echo "目标：  $DST"
echo ""

mkdir -p "$DST"

SKILLS=(ielts ielts-diagnose ielts-writing ielts-reading ielts-listening ielts-speaking ielts-vocab)

for s in "${SKILLS[@]}"; do
    mkdir -p "$DST/$s"
    if cp "$SRC/$s/SKILL.md" "$DST/$s/SKILL.md" 2>/dev/null; then
        echo "[完成] $s"
    else
        echo "[失败] $s"
    fi
done

# ielts-dashboard：复制 SKILL.md + 整个 dashboard 项目（排除 node_modules / dist 节省空间）
mkdir -p "$DST/ielts-dashboard"
cp "$SRC/ielts-dashboard/SKILL.md" "$DST/ielts-dashboard/SKILL.md"
mkdir -p "$DST/ielts-dashboard/dashboard"

# Clean source-controlled dashboard folders before copying, so upgrades remove deleted files.
# Keep node_modules to avoid forcing a full dependency reinstall.
rm -rf \
    "$DST/ielts-dashboard/dashboard/src" \
    "$DST/ielts-dashboard/dashboard/lib" \
    "$DST/ielts-dashboard/dashboard/scripts" \
    "$DST/ielts-dashboard/dashboard/dist" \
    "$DST/ielts-dashboard/dashboard/.vite" \
    "$DST/ielts-dashboard/dashboard/coverage"

if command -v rsync >/dev/null 2>&1; then
    # 优先用 rsync，可以排除 node_modules 同时保留用户已装的依赖
    rsync -a \
        --exclude='node_modules/' \
        --exclude='dist/' \
        --exclude='.git/' \
        "$SRC/ielts-dashboard/dashboard/" \
        "$DST/ielts-dashboard/dashboard/"
else
    # 没有 rsync 时仍然排除本地依赖和构建产物
    (cd "$SRC/ielts-dashboard/dashboard" && tar --exclude='./node_modules' --exclude='./dist' --exclude='./.git' -cf - .) | (cd "$DST/ielts-dashboard/dashboard" && tar -xf -)
fi
echo "[完成] ielts-dashboard（含 dashboard 项目，未覆盖你已装的 node_modules）"

# Schema
cp "$SRC/SCHEMA.md" "$DST/SCHEMA.md"
echo "[完成] SCHEMA.md"

# Root README for users who inspect the installed skill bundle.
cp "$SRC/README.md" "$DST/README.md"
echo "[完成] README.md"

echo ""
echo "=== 安装完成 ==="
echo ""
echo "接下来："
echo "  1. 确认 Node.js 18+ 已装：node --version"
echo "     （没有的话从 https://nodejs.org 下 LTS）"
echo ""
echo "  2. 第一次启动 Dashboard："
echo "       cd ~/.codex/skills/ielts-dashboard/dashboard"
echo "       npm install"
echo "       npm start"
echo "     浏览器会自动打开 http://127.0.0.1:5173"
echo ""
echo "  3. 在 Codex 里输入："
echo "       /ielts                  教练入口"
echo "       /ielts-dashboard        启动可视化仪表板（自动 npm install）"
echo ""
echo "  4. 可选：statusline.js 仅保留给支持 statusLine 的客户端。"
echo "     Codex 默认不需要配置状态栏。"
echo ""
