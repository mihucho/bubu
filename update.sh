#!/usr/bin/env bash
# ============================================================================
# 布布的学习小天地 · 更新脚本
#
# 从 GitHub（gh-proxy 加速，多镜像自动回退）下载最新 main 分支，覆盖到当前目录。
#
# 用法：
#   ./update.sh              # 更新代码与文档，保留本地配置
#   ./update.sh --check      # 只检查远端是否比本地新，不下载、不落盘
#   ./update.sh --dry-run    # 列出会被新增/更新/删除的文件，不落盘
#   ./update.sh --prune      # 顺带删除远端已不存在的文件（需 git 仓库才能判定）
#   ./update.sh --no-backup  # 不备份被覆盖的旧文件（默认会备份）
#   ./update.sh --force      # 忽略本地未推送/未提交告警，并覆盖 .env*
#   ./update.sh --help
#
# 默认**不会**被覆盖（本地资产）：
#   .env / .env.local / .env.*     本地密钥
#   node_modules/                  依赖（依赖文件变了会提示 npm ci）
#   dist/ build/ logs/             构建产物与日志
#   .git/                          版本库（只改工作区，不动你的提交历史）
#   .spark/ .spark_project         平台私有配置
#   .update-backup/ .DS_Store 等本地产物
#
# 安全闸（重点）：在 git 仓库里，如果本地有未提交改动、或本地领先远端
# （说明你有还没 push 的提交），默认**拒绝执行**——覆盖只会把你的新代码
# 换成远端的旧版本。确认就是要回退时加 --force。
#
# 被覆盖的旧文件默认备份到 .update-backup/<时间戳>/，只保留最近 5 份。
#
# 依赖：curl 或 wget；python3 / ditto / unzip 之一；rsync 或 cp
# ============================================================================
set -euo pipefail

REPO="mihucho/bubu"
BRANCH="main"
KEEP_BACKUPS=5
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

FORCE=0
DRY_RUN=0
CHECK=0
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
    --force)     FORCE=1 ;;
    --dry-run)   DRY_RUN=1 ;;
    --check)     CHECK=1; DRY_RUN=1 ;;
    --prune)     PRUNE=1 ;;
    --no-backup) BACKUP=0 ;;
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
DOWNLOADER=""
if have curl; then DOWNLOADER="curl"
elif have wget; then DOWNLOADER="wget"
else die "需要 curl 或 wget"
fi

# 解压器优先级：python3（正确处理中文文件名）→ ditto（macOS 原生）→ unzip
UNZIPPER=""
if have python3; then UNZIPPER="python"
elif have ditto; then UNZIPPER="ditto"
elif have unzip; then UNZIPPER="unzip"
else die "需要 python3 / ditto / unzip 之一"
fi

if have rsync; then COPYER="rsync"; else COPYER="cp"; fi

say "${B}布布的学习小天地 · 更新${N}"
say "${D}源：github.com/$REPO ($BRANCH)${N}"
say "${D}目标：$ROOT${N}"
[ "$DRY_RUN" = 1 ] && warn "dry-run：只列出变更，不写入任何文件"
[ "$FORCE" = 1 ] && warn "force：忽略本地告警，且 .env* 也会被覆盖"

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
# 1. 本地状态（版本可辨识 + 安全闸）
# ============================================================================
step "[1/5] 检查本地状态…"

HAVE_GIT=0
LOCAL_SHA=""
REMOTE_SHA=""
DIRTY=0
REL="unknown"
N_AHEAD=0
N_BEHIND=0

if have git && git -C "$ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  HAVE_GIT=1
  LOCAL_SHA="$(git -C "$ROOT" rev-parse --short=7 HEAD 2>/dev/null || true)"
  DIRTY="$(git -C "$ROOT" status --porcelain --untracked-files=no 2>/dev/null | wc -l | tr -d ' ')"
  REMOTE_SHA="$(with_timeout 20 env GIT_TERMINAL_PROMPT=0 git -C "$ROOT" ls-remote origin "refs/heads/$BRANCH" 2>/dev/null \
    | awk 'NR==1{print substr($1,1,7)}' || true)"
fi

if [ "$HAVE_GIT" = 1 ]; then
  say "${D}本地 HEAD：${LOCAL_SHA:-未知}${N}"
  if [ -n "$REMOTE_SHA" ]; then
    say "${D}远端 $BRANCH：$REMOTE_SHA${N}"
  else
    warn "读不到远端 $BRANCH（网络或 origin 不可达），跳过版本对比"
  fi

  if [ -n "$REMOTE_SHA" ] && [ -n "$LOCAL_SHA" ]; then
    if [ "$LOCAL_SHA" = "$REMOTE_SHA" ]; then
      REL="same"
    elif git -C "$ROOT" merge-base --is-ancestor "$REMOTE_SHA" HEAD 2>/dev/null; then
      REL="ahead"
      N_AHEAD="$(git -C "$ROOT" rev-list --count "$REMOTE_SHA..HEAD" 2>/dev/null || echo 0)"
    elif git -C "$ROOT" merge-base --is-ancestor HEAD "$REMOTE_SHA" 2>/dev/null; then
      REL="behind"
      N_BEHIND="$(git -C "$ROOT" rev-list --count "HEAD..$REMOTE_SHA" 2>/dev/null || echo 0)"
    else
      REL="diverged"
    fi
  fi
else
  say "${D}当前目录不是 git 仓库，跳过版本对比与工作区检查${N}"
fi

case "$REL" in
  same)     ok "本地已与远端 $BRANCH 一致（$LOCAL_SHA）" ;;
  behind)   ok "远端比本地新 $N_BEHIND 个提交（$LOCAL_SHA → $REMOTE_SHA）" ;;
  ahead)    warn "本地领先远端 $N_AHEAD 个提交（$LOCAL_SHA），说明有提交还没 push" ;;
  diverged) warn "本地与远端已分叉（$LOCAL_SHA ↔ $REMOTE_SHA）" ;;
esac
[ "${DIRTY:-0}" -gt 0 ] && warn "工作区有 $DIRTY 个已跟踪文件未提交"

# --check：只做判定，不落盘
# --check：git 能给出结论时直接收工；判断不了就走内容级比对
if [ "$CHECK" = 1 ] && [ "$REL" != "unknown" ]; then
  say ""
  case "$REL" in
    same)     ok "已是最新，无需更新。" ;;
    behind)   ok "有更新可用：$LOCAL_SHA → $REMOTE_SHA（$N_BEHIND 个提交）。执行 ./update.sh 即可。" ;;
    ahead)    warn "本地比远端领先 $N_AHEAD 个提交：远端没有新内容；此时跑 ./update.sh 反而会用旧版本覆盖你的提交（先 git push）。" ;;
    diverged) warn "本地与远端已分叉（$LOCAL_SHA ↔ $REMOTE_SHA）：先核对再更新。" ;;
  esac
  exit 0
fi

# ---- 安全闸：别用远端版本覆盖你本地更新的内容 ----
BLOCK=0
WHY=""
if [ "${DIRTY:-0}" -gt 0 ]; then
  BLOCK=1
  WHY="工作区有 $DIRTY 个已跟踪文件有未提交改动"
fi
case "$REL" in
  ahead)    BLOCK=1; WHY="${WHY:+$WHY；}本地领先远端 $N_AHEAD 个提交（还没 push）" ;;
  diverged) BLOCK=1; WHY="${WHY:+$WHY；}本地与远端已分叉" ;;
esac

if [ "$REL" = "same" ] && [ "${DIRTY:-0}" -eq 0 ] && [ "$PRUNE" = 0 ]; then
  say ""
  ok "已是最新，无需更新。"
  exit 0
fi

if [ "$BLOCK" = 1 ] && [ "$FORCE" = 0 ] && [ "$CHECK" = 0 ]; then
  say ""
  die "已中止：$WHY。
   继续执行会把本地内容换成远端（$BRANCH: ${REMOTE_SHA:-未知}）的版本。
   处理方式（三选一）：
     1) 先把本地改动提交并推送：git add -A && git commit -m \"...\" && git push origin $BRANCH
     2) 只想先保住改动：git stash（更新后 git stash pop）
     3) 确认就是要放弃本地内容：./update.sh --force（会备份到 .update-backup/）"
fi

# ============================================================================
# 2. 下载（多镜像回退）
# ============================================================================
step "[2/5] 下载…"

MIRRORS=(
  "https://gh-proxy.org/https://github.com/$REPO/archive/refs/heads/$BRANCH.zip"
  "https://ghfast.top/https://github.com/$REPO/archive/refs/heads/$BRANCH.zip"
  "https://github.com/$REPO/archive/refs/heads/$BRANCH.zip"
  "https://codeload.github.com/$REPO/zip/refs/heads/$BRANCH"
)

GOT=0
for url in "${MIRRORS[@]}"; do
  host="$(printf '%s' "$url" | sed -E 's#^https?://([^/]+)/.*#\1#')"
  say "${D}尝试 $host…${N}"
  rm -f "$ZIP"
  if [ "$DOWNLOADER" = "curl" ]; then
    # 强制绕过代理/中间层缓存，避免拿到旧 zip
    if curl -fSL --retry 2 --connect-timeout 15 --max-time 300 \
        -H 'Cache-Control: no-cache' -H 'Pragma: no-cache' \
        --progress-bar -o "$ZIP" "$url"; then
      :
    fi
  else
    if wget -q --show-progress --no-cache -O "$ZIP" "$url"; then
      :
    fi
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
step "[3/5] 解压…"
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
TOP="$(find "$SRC" -mindepth 1 -maxdepth 1 -type d | head -1)"
[ -n "$TOP" ] || die "解压后没有目录，zip 结构异常"
if [ ! -f "$TOP/package.json" ]; then
  MAYBE="$(find "$SRC" -maxdepth 3 -name package.json -not -path '*/node_modules/*' | head -1)"
  if [ -n "$MAYBE" ]; then TOP="$(dirname "$MAYBE")"; else warn "没找到 package.json，确认仓库结构没变"; fi
fi
ok "解压到 $(basename "$TOP")（$(find "$TOP" -type f | wc -l | tr -d ' ') 个文件）"

# ============================================================================
# 4. 比对 + 覆盖
# ============================================================================
step "[4/5] 比对并覆盖…"

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

if [ "$CHECK" = 1 ]; then
  say ""
  ok "远端内容可更新：新增 $ADDED 个 / 更新 $UPDATED 个 / 远端已删除 $DELETED 个"
  exit 0
fi

if [ "$ADDED" -gt 0 ] || [ "$UPDATED" -gt 0 ]; then
  awk -F'\t' '$1=="NEW"{print "新增\t" $2} $1=="UPD"{print "更新\t" $2}' "$PLAN" \
    | head -40 | while IFS=$'\t' read -r kind p; do
        printf '%s%s %s%s\n' "$D" "$kind" "$p" "$N"
      done
  TOTAL_LINES="$((ADDED + UPDATED))"
  if [ "$TOTAL_LINES" -gt 40 ]; then
    say "${D}… 其余 $((TOTAL_LINES - 40)) 个略${N}"
  fi
fi
if [ "$DELETED" -gt 0 ]; then
  if [ "$PRUNE" = 1 ]; then
    say "${Y}远端已删除（--prune 会一并清掉）：${N}"
  else
    say "${Y}远端已删除，本地仍保留（加 --prune 可清掉）：${N}"
  fi
  head -20 "$EXTRA" | while IFS= read -r p; do printf '%s  - %s%s\n' "$D" "$p" "$N"; done
  [ "$DELETED" -gt 20 ] && say "${D}… 其余 $((DELETED - 20)) 个略${N}"
fi

if [ "$ADDED" = 0 ] && [ "$UPDATED" = 0 ] && { [ "$DELETED" = 0 ] || [ "$PRUNE" = 0 ]; }; then
  say ""
  ok "文件内容已与远端一致，没有需要写入的变更。"
  exit 0
fi

# ---- 备份目录 ----
BACKUP_DIR=""
if [ "$BACKUP" = 1 ] && [ "$DRY_RUN" = 0 ] && { [ "$UPDATED" -gt 0 ] || [ "$PRUNE" = 1 ]; }; then
  BACKUP_DIR="$ROOT/.update-backup/$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$BACKUP_DIR"
fi

# ---- 写入 ----
if [ "$DRY_RUN" = 1 ]; then
  say ""
  warn "dry-run：以上 ${ADDED} 新增 / ${UPDATED} 更新 未写入"
  exit 0
fi

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

# ---- 兜底：修正可执行位（解压器/拷贝器可能丢 +x，丢了就 `npm run build` 报 Permission denied）----
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
  warn "修正了 $FIXPERM 个文件的执行权限（脚本丢 +x 会导致 npm run build/dev 失败）"
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
  ok "完成（新增 $ADDED 个 / 更新 $UPDATED 个 / 删除 $PRUNED 个）"
else
  ok "完成（新增 $ADDED 个 / 更新 $UPDATED 个）"
fi

# ============================================================================
# 5. 收尾：依赖与后续动作
# ============================================================================
step "[5/5] 检查依赖…"

plan_has() { awk -F'\t' -v p="$1" '$2==p{found=1} END{exit !found}' "$PLAN"; }

NEED_INSTALL=0
DEPS_CHANGED=0
plan_has "package.json" && DEPS_CHANGED=1
plan_has "package-lock.json" && DEPS_CHANGED=1
[ -d "$ROOT/node_modules" ] || NEED_INSTALL=1
[ "$DEPS_CHANGED" = 1 ] && NEED_INSTALL=1

if [ "$NEED_INSTALL" = 1 ]; then
  if [ "$DEPS_CHANGED" = 1 ]; then
    warn "依赖清单有变化 → 执行： ${B}npm ci${N}"
  else
    warn "还没装依赖 → 执行： ${B}npm install${N}"
  fi
else
  ok "依赖无需变动"
fi

if plan_has "update.sh"; then
  warn "update.sh 自身已更新，下次运行才生效"
fi
if printf '%s\n' "$CHANGED_FILES" | grep -q '^server/'; then
  warn "服务端有改动：npm run dev 会自动重载；生产环境需重新 npm run build"
fi
if [ "$HAVE_GIT" = 1 ]; then
  say "${D}提示：本脚本只覆盖工作区文件，不动 git 历史；管理改动请用 git 提交或 git pull。${N}"
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
