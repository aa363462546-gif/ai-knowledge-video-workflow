#!/usr/bin/env node

/**
 * 运行环境检测与验证脚本 (check_env.mjs)
 * 
 * 严格遵循“先检查，再安装”原则：
 * 1. 检查操作系统与基础环境。
 * 2. 已安装且兼容的依赖直接复用。
 * 3. 明确识别缺失依赖并提供现成的安装指引。
 * 4. 支持 --verify 进行真实启动验证。
 * 5. 支持 --json 便于 AI Agent 结构化读取与自动化调度。
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const isJson = process.argv.includes('--json');
const isVerify = process.argv.includes('--verify');

function runCmd(exe, args = []) {
  try {
    const res = spawnSync(exe, args, { encoding: 'utf8', timeout: 8000 });
    return { ok: res.status === 0, stdout: (res.stdout || '').trim(), stderr: (res.stderr || '').trim() };
  } catch (err) {
    return { ok: false, stdout: '', stderr: err.message };
  }
}

function semverGte(current, target) {
  const c = current.replace(/^v/, '').split('.').map(Number);
  const t = target.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const cv = c[i] || 0, tv = t[i] || 0;
    if (cv > tv) return true;
    if (cv < tv) return false;
  }
  return true;
}

function detectChrome() {
  if (process.env.HYPERFRAMES_BROWSER_PATH && fs.existsSync(process.env.HYPERFRAMES_BROWSER_PATH)) {
    return { path: process.env.HYPERFRAMES_BROWSER_PATH, source: 'env (HYPERFRAMES_BROWSER_PATH)' };
  }
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return { path: c, source: 'system path' };
  }
  for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    const res = runCmd('which', [name]);
    if (res.ok && res.stdout && fs.existsSync(res.stdout)) {
      return { path: res.stdout, source: 'PATH (' + name + ')' };
    }
  }
  return null;
}

function detectHyperframes() {
  if (process.env.VIDEO_HYPERFRAMES_CLI && fs.existsSync(process.env.VIDEO_HYPERFRAMES_CLI)) {
    const v = runCmd('node', [process.env.VIDEO_HYPERFRAMES_CLI, '--version']);
    return { path: process.env.VIDEO_HYPERFRAMES_CLI, version: v.stdout || 'unknown', source: 'env' };
  }
  const localInRoot = path.join(root, 'node_modules/hyperframes/bin/hyperframes.mjs');
  if (fs.existsSync(localInRoot)) {
    const v = runCmd('node', [localInRoot, '--version']);
    return { path: localInRoot, version: v.stdout || 'unknown', source: 'local node_modules' };
  }
  const which = runCmd('which', ['hyperframes']);
  if (which.ok && which.stdout) {
    try {
      const bin = fs.realpathSync(which.stdout);
      if (fs.existsSync(bin)) {
        const v = runCmd('node', [bin, '--version']);
        return { path: bin, version: v.stdout || 'unknown', source: 'global PATH' };
      }
    } catch {}
  }
  try {
    const home = os.homedir();
    const npxDir = path.join(home, '.npm/_npx');
    if (fs.existsSync(npxDir)) {
      for (const hash of fs.readdirSync(npxDir)) {
        const cand = path.join(npxDir, hash, 'node_modules/hyperframes/bin/hyperframes.mjs');
        if (fs.existsSync(cand)) {
          const v = runCmd('node', [cand, '--version']);
          return { path: cand, version: v.stdout || 'unknown', source: 'npx cache' };
        }
      }
    }
  } catch {}
  return null;
}

async function verifyChrome(chromePath) {
  if (!chromePath) return { ok: false, error: 'Chrome executable not found' };
  const test = runCmd(chromePath, ['--headless', '--disable-gpu', '--dump-dom', 'data:text/html,<html><body>ready</body></html>']);
  if (test.ok && test.stdout.includes('ready')) {
    return { ok: true, message: 'Headless Chrome executed and dumped DOM successfully' };
  }
  return { ok: false, error: test.stderr || 'Headless Chrome failed to run' };
}

async function verifyFfmpeg() {
  const test = runCmd('ffmpeg', ['-nostdin', '-v', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', '0.1', '-f', 'null', '-']);
  if (test.ok) return { ok: true, message: 'FFmpeg audio synthesis and filter graph passed' };
  return { ok: false, error: test.stderr || 'FFmpeg test failed' };
}

async function checkAll() {
  const checks = [];
  const missing = [];
  const reusable = [];
  const guidance = [];

  // 1. OS & Platform
  const platform = os.platform();
  const arch = os.arch();
  const isMac = platform === 'darwin';
  const isLinux = platform === 'linux';
  const isSupported = isMac || isLinux;
  checks.push({
    name: '操作系统',
    status: isSupported ? 'ok' : 'warn',
    detail: `${platform} (${arch})`,
    note: isMac ? '推荐生产平台 (macOS Apple Silicon / Intel)' : (isLinux ? '兼容平台 (需具备 Chrome 与 FFmpeg)' : '未实测平台')
  });

  // 2. Node.js
  const nodeVersion = process.version;
  const nodeOk = semverGte(nodeVersion, '18.0.0');
  if (nodeOk) {
    checks.push({ name: 'Node.js', status: 'ok', detail: nodeVersion, required: '>=18.0.0' });
    reusable.push(`Node.js ${nodeVersion}`);
  } else {
    checks.push({ name: 'Node.js', status: 'fail', detail: nodeVersion, required: '>=18.0.0' });
    missing.push('Node.js >= 18');
    guidance.push('请升级 Node.js 至 18.x 或更高版本 (推荐 Node 20/22): https://nodejs.org/');
  }

  // 3. npm
  const npm = runCmd('npm', ['-v']);
  if (npm.ok) {
    checks.push({ name: 'npm', status: 'ok', detail: `v${npm.stdout}` });
    reusable.push(`npm v${npm.stdout}`);
  } else {
    checks.push({ name: 'npm', status: 'fail', detail: '未找到' });
    missing.push('npm');
  }

  // 4. Python 3
  const py = runCmd('python3', ['--version']);
  if (py.ok) {
    checks.push({ name: 'Python 3', status: 'ok', detail: py.stdout });
    reusable.push(py.stdout);
  } else {
    checks.push({ name: 'Python 3', status: 'fail', detail: '未找到', required: '>=3.8' });
    missing.push('Python 3');
    guidance.push(isMac ? '通过 Homebrew 安装: brew install python3' : '通过系统包管理器安装 python3');
  }

  // 5. FFmpeg & FFprobe
  const ffmpeg = runCmd('ffmpeg', ['-version']);
  const ffprobe = runCmd('ffprobe', ['-version']);
  if (ffmpeg.ok && ffprobe.ok) {
    const fVer = ffmpeg.stdout.split('\n')[0] || 'installed';
    checks.push({ name: 'FFmpeg & FFprobe', status: 'ok', detail: fVer });
    reusable.push('FFmpeg & FFprobe');
  } else {
    checks.push({ name: 'FFmpeg & FFprobe', status: 'fail', detail: ffmpeg.ok ? 'ffprobe 缺失' : 'ffmpeg 缺失' });
    missing.push('FFmpeg');
    guidance.push(isMac ? '通过 Homebrew 安装: brew install ffmpeg' : '通过系统包管理器安装: sudo apt install -y ffmpeg');
  }

  // 6. Chrome / Chromium
  const chrome = detectChrome();
  if (chrome) {
    checks.push({ name: 'Google Chrome / Chromium', status: 'ok', detail: chrome.path, source: chrome.source });
    reusable.push(`Chrome (${chrome.source})`);
  } else {
    checks.push({ name: 'Google Chrome / Chromium', status: 'fail', detail: '未检测到 Chrome 可执行文件' });
    missing.push('Google Chrome');
    guidance.push(isMac ? '安装 Google Chrome: brew install --cask google-chrome 或从官网下载安装' : '安装 Chromium / Google Chrome 并确保其位于 PATH 或设置 HYPERFRAMES_BROWSER_PATH');
  }

  // 7. HyperFrames CLI
  const hf = detectHyperframes();
  if (hf) {
    checks.push({ name: 'HyperFrames CLI', status: 'ok', detail: `v${hf.version}`, path: hf.path, source: hf.source });
    reusable.push(`HyperFrames CLI (${hf.source})`);
  } else {
    checks.push({ name: 'HyperFrames CLI', status: 'fail', detail: '未找到 HyperFrames CLI' });
    missing.push('HyperFrames CLI');
    guidance.push('在项目根目录运行: npm install (将自动安装 package.json 中的 hyperframes 依赖)');
  }

  // Verification mode
  let verifyResult = null;
  if (isVerify && missing.length === 0) {
    const cVer = await verifyChrome(chrome?.path);
    const fVer = await verifyFfmpeg();
    verifyResult = {
      chromeLaunch: cVer,
      ffmpegAudio: fVer,
      allPassed: cVer.ok && fVer.ok
    };
  }

  const ready = missing.length === 0 && (!isVerify || verifyResult?.allPassed);

  return {
    ready,
    platform: { os: platform, arch, supported: isSupported },
    checks,
    reusable,
    missing,
    guidance,
    verification: verifyResult
  };
}

const result = await checkAll();

if (isJson) {
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ready ? 0 : 1);
}

console.log('====================================================');
console.log('       AI 知识视频工作流 · 运行环境检测报告');
console.log('====================================================\n');

for (const c of result.checks) {
  const icon = c.status === 'ok' ? '✓ [就绪]' : (c.status === 'warn' ? '! [提示]' : '✗ [缺失]');
  console.log(`${icon.padEnd(8)} ${c.name.padEnd(26)} : ${c.detail}`);
}

console.log('\n----------------------------------------------------');
if (result.reusable.length > 0) {
  console.log(`[复用已有依赖] 直接复用以下已安装环境，无需重复安装:`);
  for (const r of result.reusable) {
    console.log(`  - ${r}`);
  }
}

if (result.missing.length === 0) {
  console.log('\n✓ 所有必要运行依赖已就绪！可以开始创作和渲染视频。');
  if (isVerify) {
    console.log('\n[真实启动验证]');
    console.log(`  - Headless Chrome 运行: ${result.verification.chromeLaunch.ok ? '✓ 通过' : '✗ 失败 (' + result.verification.chromeLaunch.error + ')'}`);
    console.log(`  - FFmpeg 滤镜图运行:   ${result.verification.ffmpegAudio.ok ? '✓ 通过' : '✗ 失败 (' + result.verification.ffmpegAudio.error + ')'}`);
  } else {
    console.log('提示: 可执行 "npm run verify-env" 进行无头渲染与音视频管道的真实调用验证。');
  }
} else {
  console.log(`\n✗ 存在未满足的必要依赖 (${result.missing.length} 项):`);
  for (const m of result.missing) {
    console.log(`  - ${m}`);
  }
  console.log('\n[安装与配置指引] (请遵循“先说明，取得用户授权后再安装”规则):');
  for (const g of result.guidance) {
    console.log(`  • ${g}`);
  }
}
console.log('====================================================\n');

process.exit(result.ready ? 0 : 1);
