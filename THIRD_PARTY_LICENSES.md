# 第三方开源组件与授权说明 (Third-Party Licenses)

本项目整合并使用了以下优秀的开源软件、库与字体资产。各组件的原始版权与许可证归其原作者所有：

## 1. 字体资产

- **Source Han Sans SC (思源黑体 简体中文)**
  - 授权协议: SIL Open Font License 1.1 (OFL 1.1)
  - 版权归属: Copyright (c) 2014-2025 Adobe (http://www.adobe.com/)
  - 说明: 本地离线分发完整 WOFF2 可变字体 (`SourceHanSansSC-VF.ttf.woff2`)，许可证文件详见 `design-system-v1/assets/fonts/SourceHanSans-LICENSE.txt`。

- **Inter**
  - 授权协议: SIL Open Font License 1.1 (OFL 1.1)
  - 版权归属: Copyright (c) 2016-2024 The Inter Project Authors (https://github.com/rsms/inter)
  - 说明: 本地离线分发完整 WOFF2 可变字体 (`InterVariable.woff2`)，许可证文件详见 `design-system-v1/assets/fonts/Inter-LICENSE.txt`。

## 2. 前端动效与渲染库

- **Three.js (0.181.2)**
  - 授权协议: MIT License
  - 版权归属: Copyright (c) 2010-2025 three.js authors
  - 说明: 提供可选的轻量级 3D 场景与几何动效能力，完整许可证详见 `skills/ai-visual-motion/assets/three-0.181.2/LICENSE`。

- **GSAP (GreenSock Animation Platform 3.14.2)**
  - 版权归属: Copyright 2025, GreenSock. All rights reserved.
  - 官网与条款: https://gsap.com/ standard license

## 3. 运行与工具链依赖

- **HyperFrames (0.8.x)**
  - 官网/项目: https://hyperframes.dev / npm: `hyperframes`
  - 用途: 基于 Headless Chrome 的高精度无损逐帧视频捕获与音频对齐引擎。

- **Puppeteer / puppeteer-core**
  - 授权协议: Apache License 2.0
  - 用途: 驱动浏览器完成视频渲染及技术完整性检测。

- **FFmpeg & FFprobe**
  - 授权协议: LGPL 2.1+ / GPL 2.0+ (取决于系统安装构建)
  - 用途: 音频切片、无损视频流拼接与字幕封装。
