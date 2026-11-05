#!/usr/bin/env node

/**
 * 视频生产任务初始化辅助工具 (init_task.mjs)
 * 
 * 用法:
 *   node scripts/init_task.mjs <任务名称> <音频文件路径> <SRT字幕路径>
 * 
 * 作用:
 *   1. 创建独立的任务工程目录 productions/<任务名称>/
 *   2. 规范化音频并复制 SRT，建立时间轴基准 (original.wav, original.srt)
 *   3. 复制任务专属冻结资源 (Design System, 字体, GSAP, 可选 Three.js, pipeline.mjs)
 *   4. 分析音轨元数据与字幕 cue，输出分段建议，辅助 Agent 生成 segments.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const taskName = process.argv[2];
const inputAudio = process.argv[3];
const inputSrt = process.argv[4];

if (!taskName || !inputAudio || !inputSrt) {
  console.log('用法: node scripts/init_task.mjs <任务名称> <音频文件路径> <SRT字幕路径>');
  console.log('示例: node scripts/init_task.mjs demo-task-01 ./examples/sample.wav ./examples/sample.srt');
  process.exit(1);
}

const sanitizedName = taskName.replace(/[^\w\u4e00-\u9fa5-_]/g, '-').replace(/-+/g, '-');
const taskDir = path.join(root, 'productions', sanitizedName);

if (fs.existsSync(taskDir)) {
  console.error(`错误: 任务目录已存在: ${taskDir}。请指定新的任务名称或后缀。`);
  process.exit(1);
}

if (!fs.existsSync(inputAudio)) {
  console.error(`错误: 未找到音频文件: ${inputAudio}`);
  process.exit(1);
}

if (!fs.existsSync(inputSrt)) {
  console.error(`错误: 未找到 SRT 字幕文件: ${inputSrt}`);
  process.exit(1);
}

console.log(`正在初始化视频生产任务: ${sanitizedName}`);

// 1. 创建任务子目录
fs.mkdirSync(path.join(taskDir, 'source'), { recursive: true });
fs.mkdirSync(path.join(taskDir, 'assets'), { recursive: true });
fs.mkdirSync(path.join(taskDir, 'delivery'), { recursive: true });
fs.mkdirSync(path.join(taskDir, 'logs'), { recursive: true });

// 2. 复制核心适配脚本为任务内 pipeline.mjs
fs.copyFileSync(path.join(root, 'scripts/video_pipeline.mjs'), path.join(taskDir, 'source/pipeline.mjs'));

// 3. 转换/标准化音频为 16-bit 48kHz PCM WAV
const origWav = path.join(taskDir, 'assets/original.wav');
console.log('正在将原音频规范化为 48kHz PCM WAV (original.wav)...');
const ffRes = spawnSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', '-i', path.resolve(inputAudio), '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', origWav]);
if (ffRes.status !== 0) {
  console.error('音频转换失败:', ffRes.stderr?.toString());
  process.exit(1);
}

// 4. 复制 SRT
const origSrt = path.join(taskDir, 'assets/original.srt');
fs.copyFileSync(path.resolve(inputSrt), origSrt);

// 5. 复制冻结 Design System 与字体
const dsSrc = path.join(root, 'design-system-v1');
const dsDst = path.join(taskDir, 'assets/design-system-v1');
fs.cpSync(dsSrc, dsDst, { recursive: true });
// 创建任务内 assets/design-system 符号链接
fs.symlinkSync('design-system-v1', path.join(taskDir, 'assets/design-system'), 'dir');

// 6. 复制 GSAP 3.14.2
fs.copyFileSync(
  path.join(root, 'skills/ai-visual-motion/assets/gsap-3.14.2.min.js'),
  path.join(taskDir, 'assets/gsap-3.14.2.min.js')
);

// 7. 复制视觉 Skill 规范
const skillSrc = path.join(root, 'skills/ai-visual-motion');
const skillDst = path.join(taskDir, 'assets/skills/ai-visual-motion');
fs.cpSync(skillSrc, skillDst, { recursive: true });
// 兼容旧路径 skill-drafts
fs.mkdirSync(path.join(taskDir, 'assets/skill-drafts'), { recursive: true });
fs.symlinkSync('../skills/ai-visual-motion', path.join(taskDir, 'assets/skill-drafts/ai-visual-motion'), 'dir');

// 8. 复制 Three.js 资源
const threeSrc = path.join(root, 'skills/ai-visual-motion/assets/three-0.181.2');
if (fs.existsSync(threeSrc)) {
  fs.cpSync(threeSrc, path.join(taskDir, 'assets/three-0.181.2'), { recursive: true });
}

// 9. 分析音频时长与字幕 cue
const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', origWav], { encoding: 'utf8' });
const duration = parseFloat(JSON.parse(probe.stdout).format.duration);
const totalFrames = Math.round(duration * 60);

const srtRaw = fs.readFileSync(origSrt, 'utf8').replace(/^\uFEFF/, '').replaceAll('\r', '').trim();
const cues = srtRaw.split(/\n\s*\n/).map(block => {
  const lines = block.split('\n');
  const [a, z] = lines[1].split(' --> ');
  const parseMs = v => { const [h, m, s, ms] = v.split(/[:,]/).map(Number); return ((h * 60 + m) * 60 + s) + ms / 1000; };
  return { start: parseMs(a), end: parseMs(z), text: lines.slice(2).join('\n') };
});

console.log(`\n✓ 任务工程初始化完成: productions/${sanitizedName}/`);
console.log(`  - 音频时长: ${duration.toFixed(3)} 秒 (共约 ${totalFrames} 帧 @ 60fps)`);
console.log(`  - 字幕条数: 共 ${cues.length} 条 cue`);
console.log('\n[给 Agent / 用户的下一步指引]:');
console.log(`  1. 进入任务目录: cd productions/${sanitizedName}`);
console.log(`  2. 根据口播语义规划分段，编写 source/segments.json (按 30-45s 一段分段)`);
console.log(`  3. 运行分段准备: node source/pipeline.mjs prepare`);
console.log(`  4. 为每个分段编写 visual.html 和 motion.js，然后 build & render`);
console.log(`  5. 全部片段完成后，依次运行 assemble, check, pack`);
