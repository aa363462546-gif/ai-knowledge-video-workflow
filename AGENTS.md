# AI Agent 操作指南 (AGENTS.md)

本项目为 **AI 知识讲解视频工作流 (AI Knowledge Video Workflow)**。用户从 GitHub 克隆本项目后，只需提供一份原配音音频与一份对应的 SRT 字幕，即可由 AI Agent 引导完成全自动化的视觉创作、动效编程、渲染与输出。

---

## 一、首次安装与环境规则（严格执行“先检查，再安装”）

Agent 面对新用户或首次接手环境时，必须严格遵守以下七条铁律：

1. **先检查现有环境**：任何安装前，首先执行环境检测命令：
   ```sh
   node scripts/check_env.mjs --json
   ```
   或运行：
   ```sh
   npm run check-env
   ```
2. **直接复用已有依赖**：若用户电脑已安装 Node.js (>=18)、npm、Python 3 (>=3.8)、FFmpeg / ffprobe、Google Chrome / Chromium 等，直接复用已有环境，严禁无故重复安装或重新下载。
3. **只补装缺失依赖**：检测结果中显示 `missing` 的依赖，才进入安装流程。
4. **安装前说明并取得授权**：在执行任何安装命令（如 `npm install` 或包管理器命令）前，必须向用户清晰说明：
   - 当前缺失什么依赖；
   - 为什么需要该依赖；
   - 拟执行的安装命令是什么；
   取得用户明确同意后方可执行。
5. **安装后自动验证**：安装命令完成后，必须立即运行真实启动验证：
   ```sh
   npm run verify-env
   ```
   通过程序真实调用无头浏览器与 FFmpeg 滤镜图验证，不能只看安装命令退出码。
6. **满足要求后严禁重复安装**：一旦验证通过，记录环境已就绪，后续所有视频制作任务直接进入制作流程，不得再次提示或重复安装。
7. **纯净轻量原则**：本项目专注于“音频+SRT”转高精度知识视频，不包含也不安装 Kokoro、MLX、Whisper 本地转写或模型权重等自动配音工具。

---

## 二、正式视频制作标准流程

### 阶段 1：素材核对与工程初始化
1. 确认用户提供的音频文件（WAV / MP3 等）与 SRT 字幕文件存在且内容匹配。
2. 运行初始化脚本创建专属生产工程：
   ```sh
   node scripts/init_task.mjs <任务名称> <音频路径> <SRT路径>
   ```
   该工具会自动规范化音频为 `productions/<任务名称>/assets/original.wav`，复制 SRT 为 `assets/original.srt`，并冻结复制当前 Design System 与动效依赖。

### 阶段 2：全文理解与语义分段
1. 连贯读完整份 SRT，深入理解讲解核心概念、逻辑递进与因果链条。
2. 根据音频时长与口播语义，按 30～45 秒规划完整片段，并在 `productions/<任务名称>/source/segments.json` 中配置分段（全片严格覆盖从 0 秒到音频末尾，相邻段共享帧边界）。
3. 进入任务目录，运行分段切分：
   ```sh
   cd productions/<任务名称>
   node source/pipeline.mjs prepare
   ```

### 阶段 3：独立视觉创作与逐段渲染
1. 参考 `skills/ai-visual-motion/SKILL.md` 与 `design-system-v1/DESIGN-SYSTEM.md` 的规范：
   - 自主选择 2D（SVG/HTML/CSS）、2.5D（立体透视）或可选 3D（Three.js）表达；
   - 遵循“外层定位，内层运动”：SVG/CSS 布局在外层，GSAP 动效（`x/y/scale/rotation`）在内层；
   - 主视觉区域为 1920×950，底部 1920×130 留给统一字幕系统。
2. 为每个片段编写 `visual.html` 与 `motion.js`（如使用 3D 则编写 `scene3d.js`）。
3. 源码完成后立即执行编译与渲染：
   ```sh
   node source/pipeline.mjs build <片段ID>
   node source/pipeline.mjs render <片段ID>
   ```

### 阶段 4：全片合成、技术校验与打包
1. 所有片段渲染完成后，执行全片视频合成：
   ```sh
   node source/pipeline.mjs assemble
   ```
2. 运行自动化程序级技术检验：
   ```sh
   node source/pipeline.mjs check
   ```
   严格检验全片帧连续性、音轨字节一致性、SRT 字幕毫秒级匹配及字体加载。
3. 在 `delivery/README.md` 中编写简要交付说明后执行打包：
   ```sh
   node source/pipeline.mjs pack
   ```
   打包完成后，成片与源码包将自动归档至 `archives/YYYY-MM-DD_任务主题/`。

---

## 三、工程边界与上下文安全

1. **上下文隔离**：严禁在主对话历史中调用读图工具返回大图 Base64，严禁将视频二进制直接输出到聊天上下文，避免上下文溢出。
2. **任务隔离**：普通视频生产的所有产物均严格存放在新建的 `productions/<任务名称>/` 内，不得随意修改项目根目录的 Design System、字体资源或共享脚本。
3. **确定性与无损**：全片音轨仅在最终合成时单次编码，保证口播音质绝对无损且画音精准对齐。
