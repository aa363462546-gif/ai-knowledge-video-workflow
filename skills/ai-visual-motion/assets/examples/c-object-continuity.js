// Teaching composition: these subjects, geometry and beats belong only to this example.
// Reuses the project's proven paused-timeline / explicit-state / seek pattern.
// No audio, original brand, original coordinates, or original 13-second cue data.
(() => {
  const DURATION = 8.4;
  const timeline = gsap.timeline({paused: true, defaults: {ease: 'power3.out'}});

  timeline.set('.masked', {clipPath: 'inset(100% 0 0 0)'}, 0);
  timeline.set('#topic', {x: 254, y: 190, scale: 1.65, transformOrigin: '0 0'}, 0);
  timeline.set('#artifact', {x: 36, y: 18, scale: 1, transformOrigin: '0 0'}, 0);
  timeline.set('#focus-field', {x: 530}, 0);
  timeline.set('#organization', {x: 0}, 0);
  timeline.set('#theme', {x: 20, scale: 1, transformOrigin: '0 0'}, 0);
  timeline.set('#chronology', {x: 20, opacity: 1}, 0);

  const reveal = (selector, at, duration = 0.25) => {
    timeline.to(selector, {clipPath: 'inset(0% 0 0 0)', duration, ease: 'power2.out'}, at);
  };

  // State 1 → 2: keep the SAME title as it becomes a shared identity anchor.
  timeline.to('#topic', {x: 0, y: 0, scale: 1, duration: 0.65, ease: 'power3.inOut'}, 1.0);
  timeline.to('#artifact', {x: 0, y: 0, duration: 0.4}, 1.45);
  reveal('#artifact', 1.45);

  // State 2 → 3: establish one focus region and then its two related views.
  timeline.to('#focus-field', {x: 0, duration: 0.52, ease: 'power3.inOut'}, 2.2);
  timeline.to('#theme', {x: 0, duration: 0.3}, 2.65);
  reveal('#theme', 2.65);
  timeline.to('#chronology', {x: 0, duration: 0.3}, 3.35);
  reveal('#chronology', 3.35);

  // State 3 → 4: move EXISTING objects together; no removal or replacement.
  timeline.to('#focus-field', {x: -80, duration: 0.55, ease: 'power3.inOut'}, 4.2);
  timeline.to('#organization', {x: -90, duration: 0.55, ease: 'power3.inOut'}, 4.2);
  timeline.to('#artifact', {x: -8, scale: 0.86, duration: 0.55, ease: 'power3.inOut'}, 4.2);
  timeline.to('#theme', {scale: 1.12, duration: 0.32}, 4.55);
  timeline.to('#chronology', {opacity: 0.58, duration: 0.32}, 4.55);

  // State 4 → 5: resolve into an overview using the same object identities.
  timeline.to('#focus-field', {x: 0, duration: 0.5, ease: 'power3.inOut'}, 6.1);
  timeline.to('#organization', {x: 0, duration: 0.5, ease: 'power3.inOut'}, 6.1);
  timeline.to('#artifact', {x: 0, scale: 1, duration: 0.5, ease: 'power3.inOut'}, 6.1);
  timeline.to('#theme', {scale: 1, duration: 0.5, ease: 'power3.inOut'}, 6.1);
  timeline.to('#chronology', {opacity: 1, duration: 0.5}, 6.1);
  reveal('#result', 7.1, 0.28);

  window.__timelines = window.__timelines || {};
  window.__timelines['object-continuity'] = timeline;
  window.renderAtTime = seconds => {
    const time = Math.max(0, Math.min(DURATION, Number(seconds) || 0));
    timeline.totalTime(time, true);
    return time;
  };

  // This initialization addresses the fresh-zero vs returned-zero issue seen
  // in the project sample. Still verify new subjects and tweens when adapting.
  timeline.totalTime(DURATION, true);
  window.renderAtTime(0);
})();
