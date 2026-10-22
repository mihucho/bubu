#!/usr/bin/env bash
# ============================================================================
# 布布的学习小天地 · 更新脚本
#
# 从 GitHub（多镜像回退）下载最新 main 分支，解压后覆盖到当前目录。
# 不比较 git 版本、不拦你，只做两件事：**先报告，再覆盖（旧文件自动备份）**。
#
# 用法：
#   ./update.sh              # 下载并覆盖（旧文件备份到 .update-backup/）
#   ./update.sh --check      # 只看有没有更新：列出新增/更新/已删除，不落盘
#   ./update.sh --dry-run    # 同 --check，但输出更详细（不落盘）
#   ./update.sh --prune      # 顺带删除远端已不存在的文件（需 git 仓库才能判定）
#   ./update.sh --no-backup  # 不备份被覆盖的旧文件
#   ./update.sh --force      # 连 .env* / .spark_project 一起覆盖
#   ./update.sh --help
#
# 默认**不会**被覆盖（本地资产）：
#   .env / .env.local / .env.*     本地密钥
#   node_modules/                  依赖（依赖清单变了会提示 npm ci）
#   dist/ build/ logs/             构建产物与日志
#   .git/                          版本库（只改工作区，不动提交历史）
#   .spark/ .spark_project         平台私有配置
#   .update-backup/ .DS_Store 等本地产物
#
# 下载源：改脚本开头「可配置区」的 MIRRORS 数组，或临时
#   UPDATE_MIRRORS="https://我的代理/,https://gh-proxy.org/" ./update.sh
#
# 依赖：curl 或 wget；python3 / ditto / unzip 之一；rsync 或 cp
# ============================================================================
set -euo pipefail

# ============================================================================
# 可配置区（要换源/换仓库，只改这里）
# ============================================================================
REPO="mihucho/bubu"
BRANCH="main"

# 下载源（按顺序尝试，前一个失败自动换下一个）。
# 每项是「代理前缀」，最终地址 = <前缀>https://github.com/<REPO>/archive/refs/heads/<BRANCH>.zip
#   - 空字符串 "" 表示直连 github.com（不走任何代理）
#   - 想加自己的镜像/内网地址，直接往数组里加一行；想只走直连，把上面几行注释掉
#   - 临时覆盖：UPDATE_MIRRORS="https://my-proxy/,https://gh-proxy.org/" ./update.sh
# 最后脚本还会兜底试一次 codeload.github.com（不受这里影响）。
MIRRORS=(
  "https://gh-proxy.org/"
  "https://ghfast.top/"
  ""
)

KEEP_BACKUPS=5   # .update-backup/ 只保留最近几份
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 环境变量覆盖下载源（逗号分隔前缀，"" 表示直连）
if [ -n "${UPDATE_MIRRORS:-}" ]; then
  MIRRORS=()
  IFS=',' read -r -a _mirror_items <<<"$UPDATE_MIRRORS"
  for _m in "${_mirror_items[@]}"; do
    MIRRORS+=("$_m")
  done
  unset _mirror_items _m
fi

FORCE=0
CHECK=0
DRY_RUN=0
BACKUP=1
PRUNE=0

# ---------- 帮助 ----------
usage() {
  awk 'NR>1 && /^set -euo/ {exit} NR>1 {sub(/^# ?/,""); print}' "${BASH_SOURCE[0]}" 2>/dev/null
  exit 0
}

# ---------- 参数 ----------
for arg in "$@"; do
  case "$arg" in
    --check)     CHECK=1; DRY_RUN=1 ;;
    --dry-run)   DRY_RUN=1 ;;
    --prune)     PRUNE=1 ;;
    --no-backup) BACKUP=0 ;;
    --force)     FORCE=1 ;;
    --help|-h)   usage ;;
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
step() { printf '\n%s%s%s\n' "$B" "$*" "$N"; }
have() { command -v "$1" >/dev/null 2>&1; }

# 便携版 timeout（macOS 没有 timeout 命令）
with_timeout() {
  local secs="$1"; shift
  if have timeout;  then timeout "$secs" "$@"; return $?; fi
  if have gtimeout; then gtimeout "$secs" "$@"; return $?; fi
  if have perl;     then perl -e 'alarm shift; exec @ARGV' "$secs" "$@"; return $?; fi
  "$@"
}

# ---------- 工具检查 ----------
if have curl; then DOWNLOADER="curl"
elif have wget; then DOWNLOADER="wget"
else die "需要 curl 或 wget"
fi

# 解压器优先级：python3（可还原权限位）→ ditto（macOS）→ unzip
if have python3; then UNZIPPER="python"
elif have ditto; then UNZIPPER="ditto"
elif have unzip; then UNZIPPER="unzip"
else die "需要 python3 / ditto / unzip 之一"
fi

if have rsync; then COPYER="rsync"; else COPYER="cp"; fi

say "${B}布布的学习小天地 · 更新${N}"
say "${D}源：github.com/$REPO ($BRANCH)${N}"
say "${D}目标：$ROOT${N}"
[ "$DRY_RUN" = 1 ] && warn "不落盘模式：只列出变更"
[ "$FORCE" = 1 ] && warn "force：.env* / .spark_project 也会被覆盖"

# ---------- 临时目录 ----------
TMP="$(mktemp -d "${TMPDIR:-/tmp}/bubu-update.XXXXXX")"
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

ZIP="$TMP/main.zip"
SRC="$TMP/src"
PLAN="$TMP/plan.log"
EXTRA="$TMP/extra.log"
: > "$PLAN"
: > "$EXTRA"

# ============================================================================
# 1. 本地状态（只做提示，不拦截）
# ============================================================================
step "[1/4] 检查本地…"

HAVE_GIT=0
DIRTY=0
if have git && git -C "$ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  HAVE_GIT=1
  say "${D}本地 HEAD：$(git -C "$ROOT" rev-parse --short=7 HEAD 2>/dev/null || echo 未知)${N}"
  DIRTY="$(git -C "$ROOT" status --porcelain --untracked-files=no 2>/dev/null | wc -l | tr -d ' ')"
  [ "$DIRTY" -gt 0 ] && warn "工作区有 $DIRTY 个已跟踪文件有改动，被覆盖的旧版本会进 .update-backup/"
else
  say "${D}当前目录不是 git 仓库（只按文件内容比对）${N}"
fi

# ============================================================================
# 2. 下载（多镜像回退）
# ============================================================================
step "[2/4] 下载…"

# 由上面的 MIRRORS 前缀拼出候选地址（末尾兜底 codeload 直连）
URLS=()
for _prefix in "${MIRRORS[@]}"; do
  URLS+=("${_prefix}https://github.com/$REPO/archive/refs/heads/$BRANCH.zip")
done
URLS+=("https://codeload.github.com/$REPO/zip/refs/heads/$BRANCH")
unset _prefix

GOT=0
for url in "${URLS[@]}"; do
  host="$(printf '%s' "$url" | sed -E 's#^https?://([^/]+)/.*#\1#')"
  case "$host" in
    github.com|codeload.github.com) host="$host（直连）" ;;
  esac
  say "${D}尝试 $host…${N}"
  rm -f "$ZIP"
  if [ "$DOWNLOADER" = "curl" ]; then
    # 强制绕过代理/中间层缓存，避免拿到旧 zip
    curl -fSL --retry 2 --connect-timeout 15 --max-time 300 \
      -H 'Cache-Control: no-cache' -H 'Pragma: no-cache' \
      --progress-bar -o "$ZIP" "$url" || true
  else
    wget -q --show-progress --no-cache -O "$ZIP" "$url" || true
  fi
  if [ -f "$ZIP" ]; then
    SIZE="$(wc -c < "$ZIP" | tr -d ' ')"
    if [ "$SIZE" -gt 10000 ]; then
      GOT=1
      ok "已下载 $(awk -v s="$SIZE" 'BEGIN{printf "%.1f", s/1024/1024}') MB（$host）"
      break
    fi
    warn "$host 返回内容异常（${SIZE}B），换下一个源"
  else
    warn "$host 下载失败，换下一个源"
  fi
  say ""
done
[ "$GOT" = 1 ] || die "所有下载源都失败了（检查网络，或稍后重试）"

# ============================================================================
# 3. 解压
# ============================================================================
step "[3/4] 解压…"
mkdir -p "$SRC"

# 注意：python3 -m zipfile 会丢掉 zip 里的权限位（脚本全变 0644），
# 直接用它解压会让 `npm run build`（./scripts/build.sh）报 Permission denied。
# 所以自己解压，并按 zip 里的 external_attr 还原权限。
extract_zip() {
  case "$UNZIPPER" in
    python)
      python3 - "$1" "$2" <<'PY'
import os, sys, zipfile

zip_path, dest = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(zip_path) as z:
    for info in z.infolist():
        z.extract(info, dest)
        mode = (info.external_attr >> 16) & 0o777
        if not mode:
            continue
        try:
            os.chmod(os.path.join(dest, info.filename), mode)
        except OSError:
            pass
PY
      ;;
    ditto) ditto -x -k "$1" "$2" ;;
    unzip) unzip -q "$1" -d "$2" ;;
  esac
}

extract_zip "$ZIP" "$SRC" || die "解压失败（zip 可能损坏）"

# GitHub 的 zip 顶层会多一层 <repo>-<branch>/
TOP="$(find "$SRC" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | head -1 || true)"
[ -n "$TOP" ] || die "解压后没有目录，zip 结构异常"
if [ ! -f "$TOP/package.json" ]; then
  MAYBE="$(find "$SRC" -maxdepth 3 -name package.json -not -path '*/node_modules/*' 2>/dev/null | head -1 || true)"
  if [ -n "$MAYBE" ]; then TOP="$(dirname "$MAYBE")"; else warn "没找到 package.json，确认仓库结构没变"; fi
fi
ok "解压到 $(basename "$TOP")（$(find "$TOP" -type f | wc -l | tr -d ' ') 个文件）"

# ============================================================================
# 4. 比对 + 覆盖
# ============================================================================
step "[4/4] 比对并覆盖…"

EXCLUDES=(
  ".git/"
  "node_modules/"
  "dist/"
  "build/"
  "logs/"
  ".spark/"
  ".update-backup/"
  ".DS_Store"
  "*.tsbuildinfo"
  ".eslintcache"
)
if [ "$FORCE" = 0 ]; then
  EXCLUDES+=(".env" ".env.local" ".env.*" ".spark_project")
fi

if [ "$COPYER" = "cp" ]; then
  warn "没有 rsync，改用 cp 覆盖（不会删除多余文件）"
fi

# 哪些路径不该被远端覆盖（本地资产 / 本地产物）
skip_rel() {
  case "$1" in
    .DS_Store|*.tsbuildinfo|.eslintcache) return 0 ;;
    .git/*|node_modules/*|dist/*|build/*|logs/*|.spark/*|.update-backup/*) return 0 ;;
  esac
  if [ "$FORCE" = 0 ]; then
    case "$1" in
      .env|.env.local|.env.*|.spark_project) return 0 ;;
    esac
  fi
  return 1
}

# ---- 逐文件比对（便携、不受 rsync 版本影响）----
while IFS= read -r -d '' f; do
  rel="${f#./}"
  if skip_rel "$rel"; then continue; fi
  if [ ! -e "$ROOT/$rel" ]; then
    printf 'NEW\t%s\n' "$rel" >> "$PLAN"
  elif ! cmp -s "$TOP/$rel" "$ROOT/$rel"; then
    printf 'UPD\t%s\n' "$rel" >> "$PLAN"
  fi
done < <( cd "$TOP" && find . -type f -print0 )

# 按路径排序，清单好读
sort -t "$(printf '\t')" -k2,2 -o "$PLAN" "$PLAN" 2>/dev/null || true

ADDED="$(awk -F'\t' '$1=="NEW"' "$PLAN" | wc -l | tr -d ' ')"
UPDATED="$(awk -F'\t' '$1=="UPD"' "$PLAN" | wc -l | tr -d ' ')"
CHANGED_FILES="$(awk -F'\t' '{print $2}' "$PLAN")"

# ---- 远端已删除（只有 git 仓库能可靠判定，避免误删本地私有文件）----
DELETED=0
if [ "$HAVE_GIT" = 1 ]; then
  while IFS= read -r -d '' rel; do
    case "$rel" in
      .env|.env.local|.env.*|.spark_project|.spark/*) continue ;;
    esac
    [ -e "$TOP/$rel" ] || printf '%s\n' "$rel" >> "$EXTRA"
  done < <( git -C "$ROOT" ls-files -z )
  DELETED="$(wc -l < "$EXTRA" | tr -d ' ')"
elif [ "$PRUNE" = 1 ]; then
  warn "非 git 仓库无法区分本地私有文件，--prune 已跳过"
  PRUNE=0
fi

if [ "$DRY_RUN" = 1 ]; then
  say ""
  warn "===== 以下是预览，一个字节都不会写（去掉 --dry-run / --check 才真正更新）====="
  say ""
fi

if [ "$ADDED" -gt 0 ] || [ "$UPDATED" -gt 0 ]; then
  # 注意：不要用 `| head -40` —— head 提前关闭管道会给上游 SIGPIPE，
  # 配上 set -o pipefail 会让脚本中途退出（表现就是清单打完什么都不做）。
  awk -F'\t' -v lim=40 -v dim="$D" -v off="$N" '
    $1=="NEW" { kind="新增" }
    $1=="UPD" { kind="更新" }
    kind!=""  { n++; if (n<=lim) printf "%s%s %s%s\n", dim, kind, $2, off }
    END       { if (n>lim) printf "%s… 其余 %d 个略%s\n", dim, n-lim, off }
  ' "$PLAN"
fi
if [ "$DELETED" -gt 0 ]; then
  if [ "$PRUNE" = 1 ]; then
    say "${Y}远端已删除（--prune 会一并清掉）：${N}"
  else
    say "${Y}远端已删除，本地仍保留（加 --prune 可清掉）：${N}"
  fi
  awk -v lim=20 -v dim="$D" -v off="$N" '
    { n++; if (n<=lim) printf "%s  - %s%s\n", dim, $0, off }
    END { if (n>lim) printf "%s… 其余 %d 个略%s\n", dim, n-lim, off }
  ' "$EXTRA"
fi

if [ "$ADDED" = 0 ] && [ "$UPDATED" = 0 ] && { [ "$DELETED" = 0 ] || [ "$PRUNE" = 0 ]; }; then
  say ""
  ok "文件内容已与远端一致，没有需要写入的变更。"
  exit 0
fi

if [ "$CHECK" = 1 ]; then
  say ""
  ok "有更新：新增 $ADDED 个 / 更新 $UPDATED 个 / 远端已删除 $DELETED 个（未落盘）"
  exit 0
fi

# ---- 备份目录 ----
BACKUP_DIR=""
if [ "$BACKUP" = 1 ] && [ "$DRY_RUN" = 0 ] && { [ "$UPDATED" -gt 0 ] || [ "$PRUNE" = 1 ]; }; then
  BACKUP_DIR="$ROOT/.update-backup/$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$BACKUP_DIR"
fi

if [ "$DRY_RUN" = 1 ]; then
  say ""
  warn "未写入任何文件（去掉 --dry-run / --check 才真正更新）"
  exit 0
fi

# ---- 写入 ----
if [ "$COPYER" = "rsync" ]; then
  RSYNC_ARGS=(-a --checksum)
  [ -n "$BACKUP_DIR" ] && RSYNC_ARGS+=(--backup --backup-dir "$BACKUP_DIR")
  for e in "${EXCLUDES[@]}"; do RSYNC_ARGS+=(--exclude "$e"); done
  rsync "${RSYNC_ARGS[@]}" "$TOP"/ "$ROOT"/ || die "覆盖失败"
else
  # cp 兜底：只写比对出来有变化的文件；update.sh 最后用 mv 替换（避免截断正在运行的脚本）
  SELF_UPDATE=0
  while IFS=$'\t' read -r kind rel; do
    [ -n "${rel:-}" ] || continue
    if [ "$rel" = "update.sh" ]; then
      SELF_UPDATE=1
      continue
    fi
    if [ -f "$ROOT/$rel" ] && [ -n "$BACKUP_DIR" ]; then
      mkdir -p "$BACKUP_DIR/$(dirname "$rel")"
      cp -f "$ROOT/$rel" "$BACKUP_DIR/$rel" || die "备份失败：$rel"
    fi
    mkdir -p "$ROOT/$(dirname "$rel")"
    cp -f "$TOP/$rel" "$ROOT/$rel" || die "覆盖失败：$rel"
  done < "$PLAN"
  if [ "$SELF_UPDATE" = 1 ]; then
    if [ -f "$ROOT/update.sh" ] && [ -n "$BACKUP_DIR" ]; then
      cp -f "$ROOT/update.sh" "$BACKUP_DIR/update.sh" || true
    fi
    cp -f "$TOP/update.sh" "$ROOT/.update.sh.new" && mv -f "$ROOT/.update.sh.new" "$ROOT/update.sh"
    chmod +x "$ROOT/update.sh" 2>/dev/null || true
  fi
fi

# ---- 兜底：修正可执行位（丢了 +x，`npm run build` 会报 Permission denied）----
FIXPERM=0
while IFS= read -r -d '' f; do
  rel="${f#./}"
  if skip_rel "$rel"; then continue; fi
  [ -f "$ROOT/$rel" ] || continue
  if [ ! -x "$ROOT/$rel" ]; then
    chmod +x "$ROOT/$rel" 2>/dev/null && FIXPERM=$((FIXPERM + 1))
  fi
done < <( cd "$TOP" && find . -type f -perm -u+x -print0 )
if [ "$FIXPERM" -gt 0 ]; then
  warn "修正了 $FIXPERM 个文件的执行权限"
fi

# ---- 清理远端已删除的文件（--prune）----
PRUNED=0
if [ "$PRUNE" = 1 ] && [ "$DELETED" -gt 0 ]; then
  while IFS= read -r rel; do
    [ -f "$ROOT/$rel" ] || continue
    if [ -n "$BACKUP_DIR" ]; then
      mkdir -p "$BACKUP_DIR/$(dirname "$rel")"
      mv "$ROOT/$rel" "$BACKUP_DIR/$rel"
    else
      rm -f "$ROOT/$rel"
    fi
    PRUNED=$((PRUNED + 1))
  done < "$EXTRA"
fi

if [ "$PRUNED" -gt 0 ]; then
  ok "完成（新增 $ADDED 个 / 更新 $UPDATED 个 / 删除 $PRUNED 个）→ 已写入 $ROOT"
else
  ok "完成（新增 $ADDED 个 / 更新 $UPDATED 个）→ 已写入 $ROOT"
fi

# ============================================================================
# 收尾：依赖与后续动作
# ============================================================================
plan_has() { awk -F'\t' -v p="$1" '$2==p{found=1} END{exit !found}' "$PLAN"; }

DEPS_CHANGED=0
plan_has "package.json" && DEPS_CHANGED=1
plan_has "package-lock.json" && DEPS_CHANGED=1

if [ "$DEPS_CHANGED" = 1 ]; then
  warn "依赖清单有变化 → 执行： ${B}npm ci${N}"
elif [ ! -d "$ROOT/node_modules" ]; then
  warn "还没装依赖 → 执行： ${B}npm install${N}"
else
  ok "依赖无需变动"
fi

if plan_has "update.sh"; then
  warn "update.sh 自身已更新，下次运行才生效"
fi
if grep -q '^server/' <<<"$CHANGED_FILES"; then
  warn "服务端有改动：npm run dev 会自动重载；生产环境需重新 npm run build"
fi

# ---- 备份提示 + 只保留最近 N 份 ----
if [ -n "$BACKUP_DIR" ] && [ -d "$BACKUP_DIR" ]; then
  BN="$(find "$BACKUP_DIR" -type f | wc -l | tr -d ' ')"
  if [ "$BN" -gt 0 ]; then
    warn "旧文件已备份到 $BACKUP_DIR（$BN 个）"
  else
    rmdir "$BACKUP_DIR" 2>/dev/null || true
  fi
fi
if [ -d "$ROOT/.update-backup" ]; then
  ls -1dt "$ROOT"/.update-backup/*/ 2>/dev/null | tail -n +$((KEEP_BACKUPS + 1)) | while IFS= read -r d; do
    rm -rf "$d"
  done
fi

say ""
say "${G}${B}更新完成。${N} 文档/原型改动直接刷新页面；client 改动走 HMR；server 改动需重启或重新构建。"
