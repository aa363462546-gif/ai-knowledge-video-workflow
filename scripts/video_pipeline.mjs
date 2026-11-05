import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import http from 'node:http';
import {createRequire} from 'node:module';

// Existing thin adapter. Copy this file into a production task as source/pipeline.mjs.
// Captions are a shared bottom layer; HF_STATIC_DEDUP=false avoids the reproduced zero-duration visibility bug.
const run = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const plan = JSON.parse(fs.readFileSync(path.join(run, 'source/segments.json'), 'utf8'));

function resolveHyperframesCli() {
  if (process.env.VIDEO_HYPERFRAMES_CLI && fs.existsSync(process.env.VIDEO_HYPERFRAMES_CLI)) {
    return process.env.VIDEO_HYPERFRAMES_CLI;
  }
  const candidates = [
    path.join(run, 'node_modules/hyperframes/bin/hyperframes.mjs'),
    path.resolve(run, '../../node_modules/hyperframes/bin/hyperframes.mjs'),
  ];
  for (const cand of candidates) {
    if (fs.existsSync(cand)) return cand;
  }
  let cur = run;
  while (cur && cur !== path.dirname(cur)) {
    const cand = path.join(cur, 'node_modules/hyperframes/bin/hyperframes.mjs');
    if (fs.existsSync(cand)) return cand;
    cur = path.dirname(cur);
  }
  try {
    const which = spawnSync('which', ['hyperframes'], {encoding: 'utf8'});
    if (which.status === 0 && which.stdout.trim()) {
      const bin = fs.realpathSync(which.stdout.trim());
      if (fs.existsSync(bin)) return bin;
    }
  } catch {}
  try {
    const npmRoot = spawnSync('npm', ['root', '-g'], {encoding: 'utf8'});
    if (npmRoot.status === 0 && npmRoot.stdout.trim()) {
      const cand = path.join(npmRoot.stdout.trim(), 'hyperframes/bin/hyperframes.mjs');
      if (fs.existsSync(cand)) return cand;
    }
  } catch {}
  try {
    const home = process.env.HOME || process.env.USERPROFILE || '';
    if (home) {
      const npxDir = path.join(home, '.npm/_npx');
      if (fs.existsSync(npxDir)) {
        for (const hash of fs.readdirSync(npxDir)) {
          const cand = path.join(npxDir, hash, 'node_modules/hyperframes/bin/hyperframes.mjs');
          if (fs.existsSync(cand)) return cand;
        }
      }
    }
  } catch {}
  throw Error('HyperFrames CLI not found. Please run "npm install" in the project root, or set VIDEO_HYPERFRAMES_CLI.');
}

function resolveBrowserPath() {
  if (process.env.HYPERFRAMES_BROWSER_PATH && fs.existsSync(process.env.HYPERFRAMES_BROWSER_PATH)) {
    return process.env.HYPERFRAMES_BROWSER_PATH;
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
    if (fs.existsSync(c)) return c;
  }
  try {
    for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
      const res = spawnSync('which', [name], {encoding: 'utf8'});
      if (res.status === 0 && res.stdout.trim() && fs.existsSync(res.stdout.trim())) {
        return res.stdout.trim();
      }
    }
  } catch {}
  throw Error('Google Chrome or Chromium not found. Set HYPERFRAMES_BROWSER_PATH.');
}

const cli = resolveHyperframesCli();
const command = process.argv[2];
const selected = plan.parts.filter(p => !process.argv[3] || p.id === process.argv[3]);
const archiveRoot = process.env.VIDEO_ARCHIVE_DIR || path.resolve(run, '../../archives');
const esc = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
function exec(exe, args, log) {
  const out = log ? fs.openSync(path.join(run, 'logs', log), 'w') : null;
  const result = spawnSync(exe, args, {cwd: run, env: {...process.env, HF_STATIC_DEDUP: 'false'}, stdio: out ? ['ignore', out, out] : 'inherit'});
  if (out !== null) fs.closeSync(out);
  if (result.error || result.status !== 0) throw result.error || Error(`${exe} exited ${result.status}; ${log || ''}`);
}
function timestamp(t) {
  const ms = Math.max(0, Math.round(t * 1000));
  return `${String(Math.floor(ms / 3600000)).padStart(2,'0')}:${String(Math.floor(ms / 60000) % 60).padStart(2,'0')}:${String(Math.floor(ms / 1000) % 60).padStart(2,'0')},${String(ms % 1000).padStart(3,'0')}`;
}
function capture(exe, args, binary = false) {
  const result = spawnSync(exe, args, {cwd: run, encoding: binary ? null : 'utf8', maxBuffer: 256 * 1024 * 1024});
  if (result.error || result.status !== 0) throw result.error || Error(`${exe}: ${String(result.stderr).slice(-2000)}`);
  return result.stdout;
}
function srtCues(text) {
  const millis = value => { const [h,m,s,ms] = value.split(/[:,]/).map(Number); return ((h*60+m)*60+s)*1000+ms; };
  return text.replace(/^\uFEFF/, '').replaceAll('\r','').trim().split(/\n\s*\n/).map(block => {
    const lines = block.split('\n'), [a,z] = lines[1].split(' --> ');
    return {start:millis(a),end:millis(z),text:lines.slice(2).join('\n')};
  });
}
function sameSrtCues(a, b) {
  // MP4 subtitle conversion removes edge indentation; keep content and timing strict.
  const normalize = cues => cues.map(c => ({...c, text:c.text.split('\n').map(line=>line.replace(/^[ \t]+|[ \t]+$/g,'')).join('\n')}));
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
}
function subtitleLanguage(cues) {
  const text = cues.map(c=>c.text).join('\n');
  if (/\p{Script=Han}/u.test(text)) return 'zho';
  return /[A-Za-z]/.test(text) ? 'eng' : 'zho';
}
async function checkFinal() {
  const require = createRequire(cli);
  const {default: puppeteer} = await import(require.resolve('puppeteer-core'));
  const final = path.join(run,'delivery/final.mp4');
  const meta = JSON.parse(capture('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_type,width,height,r_frame_rate,nb_frames,duration:stream_tags=language','-of','json',final]));
  const video = meta.streams.find(s => s.codec_type === 'video');
  if (!video || +video.nb_frames !== plan.totalFrames || video.width !== plan.width || video.height !== plan.height || video.r_frame_rate !== `${plan.fps}/1`) throw Error('Final video frames, size or fps differ from the segment plan');
  let boundary = 0;
  for (const p of plan.parts) {
    if (p.frameStart !== boundary || p.frameEnd-p.frameStart !== p.frames || !fs.existsSync(path.join(run,'segments',p.id,'picture.mp4'))) throw Error(`Missing or discontinuous part: ${p.id}`);
    boundary = p.frameEnd;
  }
  if (boundary !== plan.totalFrames || Math.abs(+video.duration-plan.audioDuration) > 1/plan.fps) throw Error('Final frame boundary does not cover the complete original audio');
  const original = srtCues(fs.readFileSync(path.join(run,'assets/original.srt'),'utf8'));
  const exported = srtCues(capture('ffmpeg',['-nostdin','-v','error','-i',final,'-map','0:s:0','-f','srt','-']));
  const planned = plan.parts.flatMap(p => p.cues.map(c => ({start:Math.round(c.start*1000),end:Math.round(c.end*1000),text:c.text})));
  if (!sameSrtCues(original, exported) || !sameSrtCues(original, planned)) throw Error('SRT text, millisecond timing or cue coverage differs');
  if (meta.streams.find(s=>s.codec_type==='subtitle')?.tags?.language !== subtitleLanguage(original)) throw Error('Subtitle language tag differs from the source SRT language');
  capture('ffmpeg',['-nostdin','-v','error','-i',final,'-map','0:v:0','-map','0:a:0','-f','null','-']);
  const expectedAudio = capture('ffmpeg',['-nostdin','-v','error','-i','assets/original.wav','-c:a','aac','-b:a','256k','-f','adts','-'],true);
  const actualAudio = capture('ffmpeg',['-nostdin','-v','error','-i',final,'-map','0:a:0','-c:a','copy','-f','adts','-'],true);
  if (!expectedAudio.equals(actualAudio)) throw Error('Audio differs from one complete encoding of original.wav');
  // Inspect output pixels as numbers only; no screenshots or model-based visual review.
  const select = original.map(c => `eq(n\\,${Math.round((c.start+c.end)/2000*plan.fps)})`).join('+');
  const captions = capture('ffmpeg',['-nostdin','-v','error','-i',final,'-vf',`select=${select},crop=1792:106:64:950,scale=896:53,format=gray`,'-fps_mode','vfr','-f','rawvideo','-pix_fmt','gray','-'],true);
  const captionSize = 896*53;
  if (captions.length !== original.length*captionSize) throw Error('Caption sample count differs from SRT');
  for (let i=0;i<original.length;i++) if (!captions.subarray(i*captionSize,(i+1)*captionSize).some(v=>v<128)) throw Error(`No bottom caption pixels at cue ${i+1}`);
  const picture = capture('ffmpeg',['-nostdin','-v','error','-i',final,'-vf','fps=2,crop=1920:950:0:0,scale=160:80,format=gray','-f','rawvideo','-pix_fmt','gray','-'],true);
  let empty = 0, longest = 0;
  for (let i=0;i<picture.length;i+=12800) { empty = picture.subarray(i,i+12800).some(v=>v<128) ? 0 : empty+1; longest=Math.max(longest,empty); }
  if (longest >= 2) throw Error(`Main visual is empty for at least ${longest/2}s (0.5s sampling)`);
  const server = http.createServer((req,res) => {
    try {
      const file = path.resolve(run,'.'+decodeURIComponent(req.url.split('?')[0]));
      if (!file.startsWith(run+path.sep)) throw Error('Outside task');
      const stat=fs.statSync(file);
      res.setHeader('Content-Length',stat.size);
      res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.woff2':'font/woff2','.wav':'audio/wav'})[path.extname(file)]||'application/octet-stream');
      fs.createReadStream(file).on('error',()=>res.destroy()).pipe(res);
    } catch {res.statusCode=404;res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  const resources=[];
  try {
    browser=await puppeteer.launch({executablePath:resolveBrowserPath(),headless:true,args:['--no-sandbox','--mute-audio']});
    for (const p of plan.parts) {
      const page=await browser.newPage(), errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('response',r=>{if(r.status()>=400&&!r.url().includes('favicon')) errors.push(`${r.status()} ${new URL(r.url()).pathname}`);});
      await page.setViewport({width:plan.width,height:plan.height});
      await page.goto(`http://127.0.0.1:${server.address().port}/segments/${p.id}/index.html`,{waitUntil:'domcontentloaded'});
      await page.addScriptTag({path:path.resolve(path.dirname(cli),'../dist/hyperframe-runtime.js')});
      await page.waitForFunction(()=>window.__renderReady===true,{timeout:30000});
      const fonts=await page.evaluate(async()=>{await Promise.all([document.fonts.load('500 48px "Source Han Sans SC"','中文'),document.fonts.load('500 48px Inter','ABC123')]);await document.fonts.ready;return [...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family);});
      if (errors.length || !fonts.includes('Source Han Sans SC') || !fonts.includes('Inter')) throw Error(`${p.id} resources/fonts: ${errors.join('; ')||'font not loaded'}`);
      resources.push(p.id);await page.close();
    }
  } finally {if(browser) await browser.close();await new Promise(resolve=>server.close(resolve));}
  const result={fullDecode:true,frames:plan.totalFrames,completeOriginalAudio:true,exactSrtCues:original.length,burnedCaptionSamples:original.length,parts:plan.parts.length,resourceLoads:resources,longestEmptySampleSeconds:longest/2,scope:'Automatic technical integrity only; no aesthetic or continuous audiovisual review.'};
  fs.mkdirSync(path.join(run,'logs'),{recursive:true});
  fs.writeFileSync(path.join(run,'logs/technical-check.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
}
function archiveDelivery(sourceArchive = path.join(run,'delivery/source.zip')) {
  // The AI derives this existing title from the complete narration/SRT when preparing the task.
  const topic = String(plan.title || '').replace(/[<>:"/\\|?*\u0000-\u001f]/g,'-').replace(/\s+/g,' ').trim();
  if (!topic) throw Error('Set source/segments.json title to a short Chinese topic before archiving.');
  const files = [
    [path.join(run,'delivery/final.mp4'),'final.mp4'],
    [sourceArchive,'source.zip'],
    [path.join(run,'delivery/README.md'),'README.md']
  ];
  for (const [source] of files) if (!fs.statSync(source).isFile()) throw Error(`Missing delivery file: ${source}`);
  const date = new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const name = `${date}_${topic}`;
  fs.mkdirSync(archiveRoot,{recursive:true});
  let destination;
  for (let suffix=1;;suffix++) {
    destination=path.join(archiveRoot,suffix===1?name:`${name}_${suffix}`);
    try {fs.mkdirSync(destination);break;} catch (error) {if(error.code!=='EEXIST') throw error;}
  }
  for (const [source,name] of files) fs.copyFileSync(source,path.join(destination,name),fs.constants.COPYFILE_EXCL);
  console.log(`Archived delivery: ${destination}`);
}
function packSource() {
  const output=path.resolve(run,process.argv[3]||'delivery/source.zip');
  if(fs.existsSync(output)) throw Error('Source archive already exists; preserve it and choose a new internal output path.');
  const python=String.raw`
from pathlib import Path
import os,zipfile,re,sys
r=Path(sys.argv[1]);out=Path(sys.argv[2]);prefix=r.name
readme=r/'delivery/README.md'
assert readme.is_file(),'Write the delivery README before packing'
out.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(out,'x',compression=zipfile.ZIP_DEFLATED) as z:
 z.write(readme,prefix+'/README.md')
 for base in ['source','assets','segments']:
  for current,dirs,files in os.walk(r/base,followlinks=True):
   dirs[:]=[d for d in dirs if not d.startswith('.') and d not in ['node_modules','renders','frames','browser-profile']]
   for name in files:
    f=Path(current)/name
    if name.startswith('.') or f.suffix.lower() in ['.mp4','.mov','.webm','.zip']:continue
    z.write(f,prefix+'/'+f.relative_to(r).as_posix())
with zipfile.ZipFile(out) as z:
 assert z.testzip() is None,'Archive CRC failed'
 assert not any((i.external_attr>>16)&0o170000==0o120000 for i in z.infolist()),'Archive contains symlinks'
 check=r/'logs'/('source-package-check-'+str(len(list((r/'logs').glob('source-package-check-*')))+1))
 check.mkdir(parents=True,exist_ok=False);z.extractall(check)
pack=check/prefix;refs=0
assert (pack/'README.md').read_bytes()==readme.read_bytes()
for f in list((pack/'segments').glob('*/index.html'))+list(pack.rglob('*.css')):
 text=f.read_text();values=re.findall(r'(?:src|href)=["\x27]([^"\x27]+)',text) if f.suffix=='.html' else []
 values+=re.findall(r'url\(["\x27]?([^"\x27\)]+)',text)
 for value in values:
  if value.startswith(('#','http:','https:','data:')):continue
  target=(f.parent/value.split('?')[0].split('#')[0]).resolve()
  assert target.is_relative_to(pack.resolve()) and target.is_file(),str(f)+': '+value
  refs+=1
print('Source archive verified:',out,'resource references:',refs)
`;
  console.log(capture('python3',['-c',python,run,output]).trim());
  archiveDelivery(output);
}
if (command === 'prepare') {
  for (const p of selected) {
    const dir = path.join(run, 'segments', p.id);
    fs.mkdirSync(dir, {recursive: true});
    if (!fs.existsSync(path.join(dir, 'assets'))) fs.symlinkSync('../../assets', path.join(dir, 'assets'));
    fs.writeFileSync(path.join(dir,'input.json'),JSON.stringify(p,null,2));
    fs.writeFileSync(path.join(dir,'current.srt'),p.cues.map(c=>`${c.index}\n${timestamp(c.start)} --> ${timestamp(c.end)}\n${c.text}\n`).join('\n'));
    if (!fs.existsSync(path.join(dir, 'audio.wav'))) {
      exec('ffmpeg', ['-nostdin','-v','error','-ss',String(p.renderStart),'-i','assets/original.wav','-t',String(p.duration),'-c:a','pcm_s16le',path.join(dir,'audio.wav')]);
    }
    fs.writeFileSync(path.join(dir,'local.srt'), p.cues.map((c,i) => `${i+1}\n${timestamp(c.start-p.renderStart)} --> ${timestamp(Math.min(c.end-p.renderStart,p.duration))}\n${c.text}\n`).join('\n'));
  }
} else if (command === 'build') {
  for (const p of selected) {
    const dir = path.join(run, 'segments', p.id);
    const visual = fs.readFileSync(path.join(dir,'visual.html'),'utf8');
    const motion = fs.readFileSync(path.join(dir,'motion.js'),'utf8');
    const three = fs.existsSync(path.join(dir,'scene3d.js'));
    if (three && !fs.existsSync(path.join(run,'assets/three-0.181.2/three.module.js'))) throw Error('Copy the frozen Three.js 0.181.2 modules and LICENSE to assets/three-0.181.2 before building a 3D segment.');
    const captions = p.cues.map((c,i) => `<div id="caption-${i}" class="caption"><span class="caption-text">${esc(c.text)}</span></div>`).join('\n');
    const captionMotion = p.cues.map((c,i) => {
      const a = Math.max(0,c.start-p.renderStart), z = Math.min(p.duration,c.end-p.renderStart);
      return `${a === 0 ? `gsap.set('#caption-${i}',{opacity:1});` : `tl.set('#caption-${i}',{opacity:1},${a});`}\ntl.set('#caption-${i}',{opacity:0},${z});`;
    }).join('\n');
    fs.writeFileSync(path.join(dir,'index.html'), `<!doctype html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(p.title)}</title><link rel="stylesheet" href="assets/design-system/tokens.css">
<style>
@font-face{font-family:'Source Han Sans SC';src:url('assets/design-system/assets/fonts/SourceHanSansSC-VF.ttf.woff2') format('woff2');font-weight:250 900;font-display:block}
@font-face{font-family:'Inter';src:url('assets/design-system/assets/fonts/InterVariable.woff2') format('woff2');font-weight:100 900;font-display:block}
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;font-family:var(--font-text);font-synthesis:none;background:var(--color-paper);color:var(--color-ink)}
#film{width:100%;height:100%;position:relative;overflow:hidden;background:var(--color-paper)}
#segment-art{position:absolute;inset:0;overflow:hidden}svg text{font-family:inherit}
#captions{position:absolute;left:64px;right:64px;top:950px;bottom:24px;z-index:100;background:var(--color-paper);isolation:isolate}
.caption{position:absolute;inset:0;display:flex;justify-content:center;align-items:flex-end;text-align:center;font-size:48px;font-weight:500;line-height:52px;opacity:0;color:var(--color-ink)}
.caption-text{max-width:100%;white-space:pre-line;overflow-wrap:anywhere}
</style></head><body>
<div id="film" data-composition-id="${p.id}" data-width="1920" data-height="1080" data-start="0" data-duration="${p.duration}">
<div id="segment-art">${visual}</div><div id="captions">${captions}</div>
<audio id="narration" src="audio.wav" data-start="0" data-duration="${p.duration}" data-track-index="2"></audio>
</div><script src="assets/gsap-3.14.2.min.js"></script><script>
window.SEGMENT=${JSON.stringify(p)};
${motion}
const tl=gsap.timeline({paused:true});
window.buildVisual(tl);
${captionMotion}
${three ? `// Optional scene: reuse the successful experiment's readiness and seek hooks.
window.__hf=window.__hf||{};
window.__hf.buildReady=window.__hf.buildReady||{};
window.__hf.buildReady['${p.id}-three']=(async()=>{
const [THREE,sceneModule]=await Promise.all([import('./assets/three-0.181.2/three.module.js'),import('./scene3d.js')]);
const palette=getComputedStyle(document.documentElement);
const scene=await sceneModule.buildScene3D({THREE,tl,segment:window.SEGMENT,root:document.getElementById('segment-art'),color:name=>palette.getPropertyValue('--color-'+name).trim()});
await scene.ready;
await document.fonts.ready;
window.__timelines=window.__timelines||{};
window.__timelines['${p.id}']=tl;
window.renderAtTime=function(seconds){tl.totalTime(Math.max(0,Math.min(seconds,${p.duration})),true);scene.render(tl.time())};
window.addEventListener('hf-seek',e=>window.renderAtTime(e.detail.time));
tl.eventCallback('onUpdate',()=>scene.render(tl.time()));
tl.totalTime(${p.duration},true);
window.renderAtTime(0);
})();` : `window.__timelines=window.__timelines||{};
window.__timelines['${p.id}']=tl;
window.renderAtTime=function(seconds){tl.totalTime(Math.max(0,Math.min(seconds,${p.duration})),true)};
tl.totalTime(${p.duration},true);
tl.totalTime(0,true);`}
</script></body></html>`);
    console.log(`Built ${p.id}: ${p.frames} frames; source ${p.start}–${p.end}`);
  }
} else if (command === 'render') {
  for (const p of selected) {
    const relative = `segments/${p.id}`;
    const output = path.join(run,relative,'first-pass.mp4');
    if (fs.existsSync(output)) throw Error(`Preserved first pass already exists: ${p.id}`);
    console.log(`Rendering ${p.id} (${p.frames} frames)`);
    const three=fs.existsSync(path.join(run,relative,'scene3d.js'));
    const captureArgs=three?['--workers','2','--browser-gpu','--experimental-fast-capture=false']:['--workers','4'];
    exec(process.execPath,[cli,'render',relative,'--fps','60','--quality','delivery',...captureArgs,'--output',output],`${p.id}-render.log`);
    exec('ffmpeg',['-nostdin','-v','error','-i',output,'-map','0:v:0','-an','-c:v','copy',path.join(run,relative,'picture.mp4')],`${p.id}-picture.log`);
    console.log(`Preserved ${p.id} first-pass.mp4`);
  }
} else if (command === 'assemble') {
  fs.mkdirSync(path.join(run,'delivery'), {recursive:true});
  const output = path.join(run,'delivery/final.mp4');
  if (fs.existsSync(output)) throw Error('First complete composition already exists; stopping.');
  const language = subtitleLanguage(srtCues(fs.readFileSync(path.join(run,'assets/original.srt'),'utf8')));
  fs.writeFileSync(path.join(run,'source/concat.txt'),plan.parts.map(p => `file '../segments/${p.id}/picture.mp4'\nduration ${p.duration.toFixed(12)}`).join('\n')+'\n');
  exec('ffmpeg',['-nostdin','-v','warning','-f','concat','-safe','0','-i','source/concat.txt','-i','assets/original.wav','-i','assets/original.srt','-map','0:v:0','-map','1:a:0','-map','2:s:0','-c:v','copy','-c:a','aac','-b:a','256k','-c:s','mov_text','-metadata:s:s:0',`language=${language}`,'-map_metadata','-1','-movflags','+faststart',output],'assemble.log');
  console.log(output);
} else if (command === 'check') {
  await checkFinal();
} else if (command === 'pack') {
  packSource();
} else if (command === 'archive') {
  archiveDelivery();
} else {
  console.log('node source/pipeline.mjs prepare|build|render [p01] | assemble | check | pack [output.zip] | archive');
}
