# 本地字体与授权

核对日期：2026-10-19。字体随本目录离线分发，不依赖 CDN、系统安装字体或用户账号。字体二进制保持上游原样，未转换格式，未按示例内容裁剪字库。

## 文件与真实元信息

| 用途 | 文件 | 内部字体名 / 版本 | 可变轴 | 大小 |
| --- | --- | --- | --- | --- |
| 简体中文 | `assets/fonts/SourceHanSansSC-VF.ttf.woff2` | Source Han Sans SC VF / 2.005 | `wght` 250–900，默认 250 | 14,129,688 字节 |
| 英文与数字 | `assets/fonts/InterVariable.woff2` | Inter Variable / 4.001，git-9221beed3 | `wght` 100–900，默认 400；`opsz` 14–32，默认 14 | 352,240 字节 |

两份文件均是真实 **WOFF2 封装的 TrueType 可变字体**，包含 `glyf` / `gvar` / `fvar` 表，CSS 使用 `format("woff2")`。没有斜体文件，不能把这两份声明成原生 italic。

思源黑体采用官方完整 Language-specific SC 版本：保留完整泛 CJK 字库，以简体中文字形为默认，共 65,535 个字形、44,853 个 Unicode 映射；不是只含当前页面文字的临时子集。Inter 含 2,937 个字形、2,852 个 Unicode 映射，不含中文字形。数字、拉丁字母与中文按 CSS 字体顺序选择；页面应设置 `lang="zh-CN"`。

元信息由现成 fontTools 读取实际文件确认。另检查了“思源黑体简体中文，。设计系统𠮷”和常用英文、数字、货币符号的字符映射；这只是文件覆盖检查，不代替页面视觉验收。

## 来源

### 思源黑体

- 官方项目：[Adobe Source Han Sans](https://github.com/adobe-fonts/source-han-sans)。
- 固定版本提交：`a4f7cf94edfb9d7ffbdfc4841de276358bd7e0f2`（官方 release 分支，2025-06-25）。
- 原样下载：[官方 WOFF2 字体](https://raw.githubusercontent.com/adobe-fonts/source-han-sans/a4f7cf94edfb9d7ffbdfc4841de276358bd7e0f2/Variable/WOFF2/TTF/SourceHanSansSC-VF.ttf.woff2)。
- 选择依据：[官方发布说明的 Language-specific Variable Fonts / TTF / Simplified Chinese](https://github.com/adobe-fonts/source-han-sans/blob/a4f7cf94edfb9d7ffbdfc4841de276358bd7e0f2/README.md)。
- 原版许可证：[官方 LICENSE.txt](https://raw.githubusercontent.com/adobe-fonts/source-han-sans/a4f7cf94edfb9d7ffbdfc4841de276358bd7e0f2/LICENSE.txt)，完整保存在 `assets/fonts/SourceHanSans-LICENSE.txt`。

### Inter

- 官方项目：[rsms/inter](https://github.com/rsms/inter)。
- 固定版本提交：`353b61b9f4430d5f420d56605a6e7993e0941470`（官方 master 分支，2024-11-19）。
- 官方核对文件：[InterVariable.woff2](https://raw.githubusercontent.com/rsms/inter/353b61b9f4430d5f420d56605a6e7993e0941470/docs/font-files/InterVariable.woff2)。
- 采用官方项目发布的 `InterVariable.woff2`，与官方文件校验完全一致。没有更改原文件。
- 原版许可证：[官方 LICENSE.txt](https://raw.githubusercontent.com/rsms/inter/353b61b9f4430d5f420d56605a6e7993e0941470/LICENSE.txt)，完整保存在 `assets/fonts/Inter-LICENSE.txt`。

## 授权边界

两套字体均采用 **SIL Open Font License 1.1**。可以嵌入网页、视频工作流与商业作品，并随项目分发。分发字体时须保留版权与许可证，字体本身不能单独售卖。思源黑体的保留名称是 `Source`；Inter 官方项目也说明了名称使用限制。修改或制作衍生字体时必须重新核对原许可证的名称与分发要求。当前文件没有做任何修改。

## CSS 使用参考

从本目录的 HTML 中直接写样式时，路径如下；如果将声明放入子目录 CSS，URL 必须相对该 CSS 文件调整。

```css
@font-face {
  font-family: "DS Source Han Sans SC";
  src: url("./assets/fonts/SourceHanSansSC-VF.ttf.woff2") format("woff2");
  font-style: normal;
  font-weight: 250 900;
  font-display: swap;
}

@font-face {
  font-family: "DS Inter";
  src: url("./assets/fonts/InterVariable.woff2") format("woff2");
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
}

body {
  font-family: "DS Inter", "DS Source Han Sans SC", sans-serif;
  font-optical-sizing: auto;
  font-synthesis: none;
}
```

若希望中文标点、英文与数字全部使用思源，交换字体顺序即可。不要通过 `local()` 优先调用系统同名字体，以免各台电脑实际使用不同版本。

## 跨平台使用限制与验证范围

- 目标环境需要同时支持 WOFF2 与 OpenType 可变字体。以具备该能力的现代 Chrome / Edge / Firefox / Safari 为目标；没有提供旧版浏览器的静态字重回退包。
- 使用本地相对路径即可脱离互联网，但 `file://` 页面读取本地字体会受到浏览器本地文件策略影响。若直接双击 HTML 时字体被拦截，使用项目已有的本地预览服务器访问同一目录；该方式仍可离线使用。
- 思源文件约 13.48 MiB，首次加载需要实际读取与解压。截图、视频渲染或测量文字前，应等待 `document.fonts.ready` 并确认所需字重已加载。`font-display: swap` 允许加载期间出现临时回退字形，不能把该瞬间当成最终结果。
- 已验证文件能由字体解析器读取、轴范围、字符映射与许可证。本任务未执行 Windows / iOS / Android 真机验收，也没有声明各浏览器最终排版已一致。字体文件不会消除操作系统抗锯齿与浏览器排版的全部差异。
- 完整字库也有 Unicode 覆盖边界；超出字体字符映射的字符、彩色 Emoji 等仍需要系统回退。
