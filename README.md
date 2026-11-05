# AI 知识讲解视频工作流 (AI Knowledge Video Workflow)

> 🎙️ **输入一份音频 + 一份 SRT 字幕，由 AI Agent 自动创作并渲染出 1080P 60FPS 丝滑流畅的知识讲解动态视频。**

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Frame Rate](https://img.shields.io/badge/FPS-60fps-orange.svg)](#)
[![Resolution](https://img.shields.io/badge/Resolution-1920x1080-purple.svg)](#)

---

## 🌟 核心特色

1. **原声与原字幕驱动**：
   无需复杂不可控的语音克隆或机械 ASR。保留你最真实的口播音频与精准毫秒级 SRT 字幕，音画绝对同步。
2. **纯代码驱动的高精度动效**：
   抛弃模糊变形的扩散模型画面，全片采用 SVG / HTML / CSS / GSAP 3.14.2 与可选 Three.js 3D 渲染，字字清晰、图形锐利，专为硬核知识、商业财经与科技讲解打造。
3. **确定性无跳帧逐帧渲染**：
   基于 Headless Chrome 与 HyperFrames 渲染底层，按 60fps 逐帧精确定位捕获，彻底杜绝丢帧、音画错位与字幕撕裂。
4. **成熟的视觉设计系统 (Design System)**：
   内置离线思源黑体（Source Han Sans SC VF）与 Inter 可变字体，搭配精调的七色调色盘、卡片层级与流程图例，开箱即具备高级质感。
5. **Agent 原生友好 (Codex / Claude Code / Cursor)**：
   配备专属 `AGENTS.md`，AI Agent 可以独立理解口播语义、自主选择 2D/2.5D/3D 视觉表达、分段编写动效、执行无损合成与三文件打包交付。
6. **“先检查，再安装”的环境保护机制**：
   内置自动化环境检测工具，优先直接复用你电脑已有的 Node.js、FFmpeg、Chrome 等依赖，绝不盲目重复安装。

---

## 📋 运行环境要求

- **操作系统**: macOS (推荐 Apple Silicon / Intel，已完整实测) 或 Linux (需要可用 Chrome 与 FFmpeg)
- **Node.js**: `>= 18.0.0` (推荐 Node 20 或 22)
- **多媒体处理**: `ffmpeg` 与 `ffprobe`
- **浏览器**: Google Chrome 或 Chromium (用于无头高精度帧捕获)
- **脚本支持**: Python 3 (`>= 3.8`，用于工程包自包含校验)

---

## 🚀 极速上手

### 1. 克隆项目并检查环境

```sh
git clone https://github.com/<你的仓库路径>/ai-knowledge-video-workflow.git
cd ai-knowledge-video-workflow

# 运行依赖检测（严格遵循先检查再安装原则）
npm run check-env
```

如果检测到缺少依赖，请先安装缺失工具（例如 macOS 上运行 `brew install ffmpeg`），然后安装项目基础包：

```sh
npm install
# 验证真实渲染环境运行正常
npm run verify-env
```

### 2. 准备素材

只需将你的音频与字幕准备好，例如：
- `my-voice.wav` (或 MP3)
- `my-subtitles.srt`

*(项目内置了开箱即用的测试样例：`examples/sample-audio.wav` 和 `examples/sample-subtitles.srt`)*

### 3. 交给 AI Agent 自动制作

直接在 Codex、Claude Code 或 Cursor 中对 Agent 提问：

> “请用 `examples/sample-audio.wav` 和 `examples/sample-subtitles.srt` 帮我制作完整的知识讲解视频。”

AI Agent 将会依据 `AGENTS.md` 的规范，自动完成：
1. 建立独立任务工程 `productions/<任务名>/`；
2. 规范化音频并提取 SRT 毫秒基准；
3. 深入理解文案，按 30～45 秒规划语义分段；
4. 独立编写各段 `visual.html` 与 `motion.js`；
5. 渲染各片段为 60fps 画面；
6. 自动执行音视频单次封装与 6 项严格技术自检；
7. 最终在 `delivery/` 产出完整成片，并自动归档至 `archives/`。

---

## 🛠️ 纯命令行手动流水线 (进阶开发者)

如果你想脱离 Agent 手动运行或集成到脚本流水线中：

```sh
# 1. 初始化生产任务
node scripts/init_task.mjs my-demo ./examples/sample-audio.wav ./examples/sample-subtitles.srt

# 2. 进入任务目录并切分片段
cd productions/my-demo
node source/pipeline.mjs prepare

# 3. 编写 segments/p01/ 内部的 visual.html 和 motion.js 后进行编译与渲染
node source/pipeline.mjs build p01
node source/pipeline.mjs render p01

# 4. 全部片段完成后，全片合成
node source/pipeline.mjs assemble

# 5. 执行技术完整性检测 (音轨、字幕、帧率、字体等)
node source/pipeline.mjs check

# 6. 打包交付 (自动生成 delivery/source.zip 并归档)
node source/pipeline.mjs pack
```

---

## 📦 交付产物结构

每次制作完成后，将在 `delivery/` 以及归档目录 `archives/YYYY-MM-DD_<主题>/` 产出标准的三个文件：

- `final.mp4`：1080P 60FPS 完整成片（含高质量音频与内嵌软/硬字幕）。
- `source.zip`：自包含的完整可二次编辑源码包（包含片段 HTML、GSAP 代码、离线字体、设计系统及原始素材）。
- `README.md`：记录本视频实际画幅、帧数、分段结构、依赖版本与已验证项的交付清单。

---

## 📂 项目目录导览

```text
ai-knowledge-video-workflow/
├── AGENTS.md                  # AI Agent 专属操作指南与生产准则
├── 正式制作流程.md            # 视频制作详细执行白皮书
├── package.json               # 项目依赖声明
├── scripts/
│   ├── check_env.mjs          # 遵循“先检查再安装”的自动化环境检测工具
│   ├── init_task.mjs          # 快速建立独立生产任务的初始化工具
│   ├── video_pipeline.mjs     # 视频流水线核心驱动适配器
│   └── video_pipeline.test.mjs# 流水线与核心辅助工具单元测试
├── design-system-v1/          # 视觉设计系统规范、变量与离线可变字体
│   ├── DESIGN-SYSTEM.md       # 视觉构图、配色与层级指南
│   ├── tokens.css             # CSS 自定义属性变量表
│   └── assets/fonts/          # 离线思源黑体与 Inter 字体资产
├── skills/ai-visual-motion/   # 核心 AI 视觉动效 Skill
│   ├── SKILL.md               # 动效与空间构图提示词法则
│   ├── references/            # 动态设计、2D/2.5D/3D 选择参考
│   └── assets/                # 内置 GSAP 3.14.2 与 Three.js 0.181.2 库
├── examples/                  # 开箱即用的无版权测试音频与字幕样例
└── archives/                  # 默认视频成片与源码包归档目录
```

---

## ⚖️ 开源协议与第三方授权

- 本项目主干流水线脚本与工作流规范采用 [MIT License](LICENSE)。
- 思源黑体 (Source Han Sans SC VF) 与 Inter 字体遵循 [SIL Open Font License 1.1](design-system-v1/FONT-LICENSES.md)。
- Three.js 遵循 [MIT License](skills/ai-visual-motion/assets/three-0.181.2/LICENSE)。
- GSAP 3.14.2 归 GreenSock 所有。
- 完整第三方授权与声明请参见 [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md)。
