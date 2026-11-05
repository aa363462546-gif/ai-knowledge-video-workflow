# 可选 Three.js 场景

表达选择遵循 [主 Skill](../SKILL.md) 的“自动选择 2D、2.5D 或 3D”章节。选择 2D 或 HTML/CSS/SVG + GSAP 的 2.5D 时，沿用 `visual.html` + `motion.js`，不加载 Three.js。

选择 Three.js 三维表达后，增加同目录的 `scene3d.js`，按当前内容新建真实三维场景。文件存在表示创作者已选择 3D，适配不替 AI 做关键词判断。这是同一管线中的可选表达；不固定模型模板、不削弱 SVG、不改 Design System，不新增 AI 视觉评分或 Agent 系统。

## 素材与接口

将本 Skill 的 `assets/three-0.181.2/` 原样复制到任务 `assets/three-0.181.2/`。库和 MIT 许可复用成功实验的冻结版本，不升级、不引用 CDN。没有三维场景的任务不需要这份运行依赖。

`visual.html` 仍不含脚本，在自由构图的局部容器放 `<canvas>`；标题、标签和字幕继续 HTML/SVG 与既有字体。`motion.js` 仍同步定义 `window.buildVisual(tl)`，将二维动作加入原时间轴。`scene3d.js` 是浏览器 ES 模块，导出：

```js
export async function buildScene3D({THREE, tl, segment, root, color}) {
  // 按当前内容创建 scene、camera、renderer、真实网格和灯光。
  // color('paper') / color('accent') 等直接读取现有设计变量。
  // 三维对象和镜头补间加入传入的 tl；片内秒数 = 原时间 - renderStart。
  // 在返回前完成材质编译与初次绘制，可 await renderer.compileAsync(...)。
  return {
    render(seconds) {
      // 从已经定位的 tl 状态绘制；只在本场景区间绘制。
    }
  };
}
```

适配立即把导入和初始化 Promise 登记到现有 `__hf.buildReady`，就绪后登记唯一 GSAP 时间轴。`renderAtTime` 和 `hf-seek` 先定位同一时间轴，再调用场景的 `render`。场景也可以返回 `ready` Promise，封装会等待它。不另建时间轴、`requestAnimationFrame`、`setAnimationLoop` 或独立时钟，不手写 `__renderReady`。

程序化几何体、形状挤出、曲线和组装均可按解释需要自由创建；不能把接口当成固定模型模板。材质沿用暖白、米色、浅蓝、陶红与轻微层次，避免自动套用旧实验的深色金属风格。文本、重点色的含义和层级仍按 Design System。

## 复用已成功的技术

- WebGLRenderer 使用实验已验证的 `preserveDrawingBuffer:true`、像素比 1 与固定画幅；首次捕获前等待字体和着色器。不引入新的捕获器。
- 对同一相机/对象属性使用明确起止值的补间，后续补间采用 `immediateRender:false`，避免重叠覆写造成往返定位不同。
- 渲染入口仅对有 `scene3d.js` 的片段使用已成功的 `--workers 2 --browser-gpu --experimental-fast-capture=false`。纯二维保持原参数和封装。
- 仍运行现有 `prepare/build/render/assemble/check/pack`。三维模块与本地依赖已处于既有打包范围；字幕、音频、合成和打包沿用原职责，源码包验证后由 `pack` 自动复制三文件到正式流程指定的统一绝对归档根目录，不另建字段或脚本，普通制作无需另执行归档命令。原工程和历史成片保留。

这些更新已合并至 `main`，稳定版本标签为 `video-workflow-v2-stable`；`video-workflow-v1-stable` 和旧任务的冻结适配保持原样，开发分支保留。只做最终程序检查；技术故障定点修正，不增加 AI 视觉评分或自动审美返工。
