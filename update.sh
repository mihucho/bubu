#!/usr/bin/env bash
# ============================================================================
# 布布的学习小天地 · 更新脚本
#
# 从 GitHub（经 gh-proxy 加速）下载最新 main 分支，解压并覆盖到当前目录。
#
# 用法：
#   ./update.sh              # 更新代码与文档，保留本地配置
#   ./update.sh --force      # 连 .env 一起覆盖（慎用）
#   ./update.sh --dry-run    # 只显示会更新哪些文件，不落盘
#   ./update.sh --help
#
# 默认**不会**被覆盖（本地资产）：
#   .env / .env.local / .env.*     本地密钥
#   node_modules/                  依赖（package.json 变了会提示你跑 npm ci）
#   dist/                          构建产物
#   .git/                          版本库
#   .spark/ .spark_project         平台私有配置
#   .DS_Store
#
# 依赖：curl 或 wget；unzip 或 python3；rsync 或 cp
# ============================================================================
set -euo pipefail

REPO_ZIP="https://gh-proxy.org/https://github.com/mihucho/bubu/archive/refs/heads/main.zip"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FORCE=0
DRY_RUN=0

# ---------- 参数 ----------
for arg in "$@"; do
  case "$arg" in
    --force)   FORCE=1 ;;
    --dry-run) DRY_RUN=1 ;;
    --help|-h)
      sed -n '2,26p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) echo "未知参数：$arg（用 --help 看用法）" >&2; exit 2 ;;
  esac
done

# ---------- 颜色 ----------
if [ -t 1 ]; then
  B=$'\033[1m'; G=$'\033[32m'; Y=$'\033[33m'; R=$'\033[31m'; D=$'\033[2m'; N=$'\033[0m'
else
  B=''; G=''; Y=''; R=''; D=''; N=''
fi

say()  { printf '%s\n' "$*"; }
ok()   { printf '%s✓%s %s\n' "$G" "$N" "$*"; }
warn() { printf '%s!%s %s\n' "$Y" "$N" "$*"; }
die()  { printf '%s✗%s %s\n' "$R" "$N" "$*" >&2; exit 1; }

# ---------- 工具检查 ----------
have() { command -v "$1" >/dev/null 2>&1; }
DOWNLOADER=""
if have curl; then DOWNLOADER="curl"
elif have wget; then DOWNLOADER="wget"
else die "需要 curl 或 wget"
fi

UNZIPPER=""
if have unzip; then UNZIPPER="unzip"
elif have python3; then UNZIPPER="python"
else die "需要 unzip 或 python3"
fi

if have rsync; then COPYER="rsync"; else COPYER="cp"; fi

say "${B}布布的学习小天地 · 更新${N}"
say "${D}源：$REPO_ZIP${N}"
say "${D}目标：$ROOT${N}"
[ "$DRY_RUN" = 1 ] && warn "dry-run：只列出变更，不写入"
[ "$FORCE" = 1 ] && warn "force：包含 .env 在内的文件都会被覆盖"

# ---------- 临时目录 ----------
TMP="$(mktemp -d "${TMPDIR:-/tmp}/bubu-update.XXXXXX")"
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

ZIP="$TMP/main.zip"

# ---------- 1. 下载 ----------
say ""
say "[1/4] 下载…"
if [ "$DOWNLOADER" = "curl" ]; then
  curl -fSL --retry 3 --connect-timeout 15 --progress-bar -o "$ZIP" "$REPO_ZIP" \
    || die "下载失败（检查网络或稍后重试；gh-proxy 偶尔不稳定）"
else
  wget -q --show-progress -O "$ZIP" "$REPO_ZIP" || die "下载失败（检查网络）"
fi
SIZE="$(wc -c < "$ZIP" | tr -d ' ')"
[ "$SIZE" -gt 10000 ] || die "下载文件过小（${SIZE}B），可能被代理拦截"
ok "已下载 $(awk -v s="$SIZE" 'BEGIN{printf "%.1f", s/1024/1024}') MB"

# ---------- 2. 解压 ----------
say "[2/4] 解压…"
SRC="$TMP/src"
mkdir -p "$SRC"
if [ "$UNZIPPER" = "unzip" ]; then
  unzip -q "$ZIP" -d "$SRC" || die "解压失败（zip 可能损坏）"
else
  python3 -m zipfile -e "$ZIP" "$SRC" || die "解压失败"
fi

# GitHub 的 zip 顶层会多一层 bubu-main/
TOP="$(find "$SRC" -mindepth 1 -maxdepth 1 -type d | head -1)"
[ -n "$TOP" ] || die "解压后没有目录，zip 结构异常"
[ -f "$TOP/package.json" ] || warn "解压目录里没有 package.json，确认仓库结构没变"
ok "解压到 $(basename "$TOP")"

# ---------- 3. 组装排除规则 ----------
EXCLUDES=(
  ".git/"
  "node_modules/"
  "dist/"
  ".spark/"
  ".DS_Store"
)
if [ "$FORCE" = 0 ]; then
  EXCLUDES+=(".env" ".env.local" ".env.*" ".spark_project")
fi

RSYNC_ARGS=(-a --itemize-changes)
for e in "${EXCLUDES[@]}"; do RSYNC_ARGS+=(--exclude "$e"); done
if [ "$DRY_RUN" = 1 ]; then RSYNC_ARGS+=(--dry-run); fi

# ---------- 4. 覆盖 ----------
say "[3/4] 覆盖到当前目录…"
CHANGED="$TMP/changed.log"
if [ "$COPYER" = "rsync" ]; then
  rsync "${RSYNC_ARGS[@]}" "$TOP"/ "$ROOT"/ > "$CHANGED" 2>&1 || die "覆盖失败"
  # itemize 输出：>f 新增/更新，*deleting 删除
  ADDED=$(grep -c '^>f+++++++++' "$CHANGED" || true)
  UPDATED=$(grep -c '^>f' "$CHANGED" || true)
  UPDATED=$(( UPDATED - ADDED > 0 ? UPDATED - ADDED : 0 ))
  show_list="$(grep -E '^>f|^\*deleting' "$CHANGED" | sed -E 's/^>f[.+]+\s+//; s/^\*deleting\s+/删除 /' | head -40 || true)"
else
  warn "没有 rsync，用 cp 覆盖（不会删除多余文件）"
  ( cd "$TOP" && find . -type f \
      ! -path "./.git/*" ! -path "./node_modules/*" ! -path "./dist/*" ! -path "./.spark/*" \
      -print0 ) | while IFS= read -r -d '' f; do
      rel="${f#./}"
      if [ "$DRY_RUN" = 1 ]; then
        [ -f "$ROOT/$rel" ] && printf '更新 %s\n' "$rel" || printf '新增 %s\n' "$rel"
      else
        mkdir -p "$ROOT/$(dirname "$rel")"
        cp -f "$TOP/$rel" "$ROOT/$rel"
      fi
    done > "$CHANGED" 2>&1 || die "覆盖失败"
  ADDED=0; UPDATED=0; show_list="$(head -40 "$CHANGED")"
fi

if [ -n "${show_list:-}" ]; then
  say "${D}${show_list}${N}"
fi
ok "完成（新增 ${ADDED:-0} 个 / 更新 ${UPDATED:-0} 个）"

# ---------- 5. 后续提示 ----------
say "[4/4] 检查依赖…"
if [ -f "$ROOT/package-lock.json" ]; then
  if have npm; then
    NEED_INSTALL=0
    if [ ! -d "$ROOT/node_modules" ]; then NEED_INSTALL=1; fi
    if [ -f "$TMP/src/$(basename "$TOP")/package.json" ] && [ -f "$ROOT/package.json" ]; then
      if ! diff -q "$TMP/src/$(basename "$TOP")/package.json" "$ROOT/package.json" >/dev/null 2>&1; then
        NEED_INSTALL=1
      fi
    fi
    if [ "$NEED_INSTALL" = 1 ]; then
      warn "package.json 有变化或还没装依赖 → 建议执行： ${B}npm ci${N}"
    else
      ok "依赖无需变动"
    fi
  fi
fi

say ""
say "${G}${B}更新完成。${N} 如果只是文档/原型变了，直接刷新页面即可。"
if [ "$DRY_RUN" = 1 ]; then
  say "${Y}以上为 dry-run 结果，未写入任何文件。${N}"
fi
