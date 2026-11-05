import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';

// Exercise the actual small helpers without initializing a production or rendering.
const source = fs.readFileSync(new URL('./video_pipeline.mjs', import.meta.url),'utf8');
const helpers = source.slice(source.indexOf('function srtCues('), source.indexOf('async function checkFinal('));
const api = vm.runInNewContext(`${helpers}\n({srtCues,sameSrtCues,subtitleLanguage})`);
const cue = text => [{start:0,end:5000,text}];

test('MP4 edge whitespace is harmless; original subtitle text is untouched', () => {
  const input=cue(' A good assistant.\n\tEnglish subtitles. ');
  const before=JSON.stringify(input);
  assert.equal(api.sameSrtCues(input,cue('A good assistant.\nEnglish subtitles.')),true);
  assert.equal(api.sameSrtCues(cue(' 中文字幕。 '),cue('中文字幕。')),true);
  assert.equal(JSON.stringify(input),before);
});

test('changes to words, internal spaces, cue coverage and milliseconds remain failures', () => {
  assert.equal(api.sameSrtCues(cue('A good assistant.'),cue('A bad assistant.')),false);
  assert.equal(api.sameSrtCues(cue('A good assistant.'),cue('A  good assistant.')),false);
  assert.equal(api.sameSrtCues(cue('中文内容。'),cue('中文。')),false);
  assert.equal(api.sameSrtCues(cue('Text'),[{start:1,end:5000,text:'Text'}]),false);
  assert.equal(api.sameSrtCues(cue('Text'),[{start:0,end:4999,text:'Text'}]),false);
  assert.equal(api.sameSrtCues(cue('Text'),[]),false);
});

test('English uses eng; Chinese, including English names, retains zho', () => {
  assert.equal(api.subtitleLanguage(cue(' A local voice creates English subtitles.')), 'eng');
  assert.equal(api.subtitleLanguage(cue('使用 Qwen 生成中文配音和 SRT。')), 'zho');
  assert.equal(api.subtitleLanguage(cue('123')), 'zho');
});

test('English and Chinese SRT survive real MP4 conversion with correct language tags', () => {
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'v2-subtitle-roundtrip-'));
  for (const [expected,text] of [['eng',' A good assistant starts with the evidence.'],['zho','先确认文案，再生成配音。']]) {
    const input=path.join(directory,`${expected}.srt`);
    fs.writeFileSync(input,`1\n00:00:00,000 --> 00:00:05,000\n${text}\n\n`);
    const original=api.srtCues(fs.readFileSync(input,'utf8'));
    const language=api.subtitleLanguage(original);
    assert.equal(language,expected);
    const output=path.join(directory,`${expected}.mp4`);
    // Subtitle-only technical fixture: no TTS, picture generation or audio encoding.
    const mux=spawnSync('ffmpeg',['-nostdin','-v','error','-n','-i',input,'-c:s','mov_text','-metadata:s:s:0',`language=${language}`,output],{encoding:'utf8'});
    assert.equal(mux.status,0,mux.stderr);
    const probe=spawnSync('ffprobe',['-v','error','-show_entries','stream=codec_type:stream_tags=language','-of','json',output],{encoding:'utf8'});
    assert.equal(probe.status,0,probe.stderr);
    assert.equal(JSON.parse(probe.stdout).streams.find(s=>s.codec_type==='subtitle').tags.language,expected);
    const demux=spawnSync('ffmpeg',['-nostdin','-v','error','-i',output,'-map','0:s:0','-f','srt','-'],{encoding:'utf8'});
    assert.equal(demux.status,0,demux.stderr);
    assert.equal(api.sameSrtCues(original,api.srtCues(demux.stdout)),true);
  }
});

test('resolveBrowserPath finds existing Chrome or respects env var', () => {
  const source = fs.readFileSync(new URL('./video_pipeline.mjs', import.meta.url),'utf8');
  const browserHelper = source.slice(source.indexOf('function resolveBrowserPath('), source.indexOf('const cli ='));
  const api = vm.runInNewContext(`${browserHelper}\n({resolveBrowserPath})`, {process, fs, path, spawnSync});
  const resolved = api.resolveBrowserPath();
  assert.equal(typeof resolved, 'string');
  assert.equal(fs.existsSync(resolved), true);
});

test('resolveHyperframesCli finds hyperframes or respects VIDEO_HYPERFRAMES_CLI', () => {
  const source = fs.readFileSync(new URL('./video_pipeline.mjs', import.meta.url),'utf8');
  const cliHelper = source.slice(source.indexOf('function resolveHyperframesCli('), source.indexOf('function resolveBrowserPath('));
  const api = vm.runInNewContext(`${cliHelper}\n({resolveHyperframesCli})`, {process, fs, path, spawnSync, run: process.cwd()});
  const resolved = api.resolveHyperframesCli();
  assert.equal(typeof resolved, 'string');
  assert.equal(fs.existsSync(resolved), true);
});
