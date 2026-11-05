# 视觉设计系统 · 第一版预览

用浏览器打开 [index.html](index.html)，查看字体、七色配色、步骤与胶囊、双方对比、图表、流程关系及材料编排。完整说明见 [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md)。整体视觉风格已获用户认可；此预览保留首版实现，不是新作品的固定布局。

本目录位于项目根目录 `design-system-v1/`。新创作通过 [项目 Skill](../skills/ai-visual-motion/SKILL.md) 读取这里的规范和变量，不依赖外部链接或临时预览地址。集成用法见规范 §10；字体、配色与预览代码沿用原版。

## 打开方式

直接双击 `index.html`，或把该文件拖进浏览器。页面使用相对路径加载本地 CSS、思源黑体与 Inter，不需要账号、CDN、npm 安装或构建；文件齐全时可以离线使用。

目标浏览器需要支持 WOFF2、OpenType 可变字体、CSS Grid 与 CSS 自定义属性，以具备这些能力的现代 Chrome、Edge、Firefox、Safari 为目标。当前没有为旧版浏览器附带静态字体或兼容包，也未宣称已完成所有浏览器、所有设备的实测。

若直接打开时浏览器拦截本地字体，用已有的本地静态预览服务访问这个目录。字体第一次加载需读取约 13.5 MiB 的中文字体；截图、检查或渲染前应等待加载完成。具体字体文件、来源与授权见 [FONT-LICENSES.md](FONT-LICENSES.md)。

## 文件入口

| 文件 | 用途 |
| --- | --- |
| [index.html](index.html) | 静态预览与 SVG 示例 |
| [tokens.css](tokens.css) | 字体、颜色、字号、间距、圆角等变量 |
| [preview.css](preview.css) | 当前预览排版、组件样式与窄屏调整 |
| [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) | 视觉规则、候选值、复用方法与验证边界 |
| [FONT-LICENSES.md](FONT-LICENSES.md) | 本地字体说明、来源与授权 |
| `assets/fonts/` | 两套字体及其原版许可证 |

示例数据均为虚构。图表中的 `+65.4%` 来自 `(86 - 52) / 52 × 100%`，并非真实产品表现。字号是浏览预览参考值；用于视频时须按观看距离和实际内容调整，不通过缩字塞内容。

当前设计系统规范与基础资源由项目统一维护，配合 GSAP 3.14.2 与可选 Three.js 提供完整视频动效能力。
