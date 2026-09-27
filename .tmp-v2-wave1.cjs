const fs = require('fs');
{
  const p = 'src/engine/engine.ts';
  let lines = fs.readFileSync(p, 'utf8').split('\n');
  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  const find = (needle, from = 0) => {
    const i = lines.findIndex((l, idx) => idx >= from && norm(l).includes(norm(needle)));
    if (i < 0) throw new Error('engine NOT FOUND: ' + JSON.stringify(needle.slice(0, 80)));
    return i;
  };
  const insertAfter = (needle, block) => {
    const i = find(needle);
    lines.splice(i + 1, 0, ...block.split('\n'));
  };
  const repLine = (needle, replacement) => {
    const i = find(needle);
    lines[i] = replacement;
  };

  /* 1. pointsMaterial: uSpiralMix uniform */
  insertAfter('uVortexRev: { value: 1 },', '        uSpiralMix: { value: 1 },');

  /* 2. applyKamuiFrame: drive uSpiralMix */
  insertAfter('mat.uniforms.uVortexPull.value = 1;', '      if (mat.uniforms.uSpiralMix) mat.uniforms.uSpiralMix.value = k.spiralMix;');

  /* 3. body field: the tangential swirl term follows spiralMix */
  repLine('b.group.position.addScaledVector(this._vScratch4, kDist * pull * 0.16 * this.kamui.reverse);',
    '          b.group.position.addScaledVector(this._vScratch4, kDist * pull * 0.16 * this.kamui.reverse * this.kamui.spiralMix);');

  /* 4. fire sites pass tier + levelFactor */
  repLine("profile: 'portal',", "        profile: 'portal',\n        tier: 1,");
  insertAfter('targetRadius: Math.max(0.4, b.data.radius),', '        levelFactor: 1,');
  repLine("{ profile: 'portal', reverse: true, source: this.kamui.source, targetRadius: Math.max(0.4, this.portalBodyRadiusForReverse()) },",
    "      { profile: 'portal', tier: 1, reverse: true, source: this.kamui.source, targetRadius: Math.max(0.4, this.portalBodyRadiusForReverse()), levelFactor: 1 },");
  repLine("profile: 'warp',", "        profile: 'warp',\n        tier: 2,");
  repLine("{ profile: 'dive', source: diveCenter, targetRadius: node?.radius ?? 5600 },",
    "      { profile: 'dive', tier: 1, source: diveCenter, targetRadius: node?.radius ?? 5600, levelFactor: 8 },");
  repLine("profile: 'jump',", "        profile: 'jump',\n        tier: 1,");
  repLine('targetRadius: galaxy ? galaxy.radius : Math.max(2, homeBody?.data.radius ?? 6),',
    '        targetRadius: galaxy ? galaxy.radius : Math.max(2, homeBody?.data.radius ?? 6),\n        levelFactor: galaxy ? 8 : 1,');

  fs.writeFileSync(p, lines.join('\n'));
  console.log('engine Wave v2-1 done');
}

/* ============ round18 gauntlet: new chain ============ */
{
  const p = 'scripts/round18-kamui-gauntlet.ts';
  let src = fs.readFileSync(p, 'utf8');
  src = src.replace("const phases = ['idle', 'arm', 'pull', 'vortex', 'collapse', 'throat', 'eject', 'settle'];",
    "const phases = ['idle', 'ignition', 'onsetPull', 'angularCapture', 'horizonClose', 'breach', 'threshold', 'emergence', 'resolution'];");
  const chainRe = /const chain = \[\.\.\.src\.matchAll\(\/\{ from: '(\w+)', next: '(\w+)', duration: \([\d.]+\), reduced: \([\d.]+\) \}\/g\)\];/;
  if (!chainRe.test(src)) throw new Error('chain regex line not found');
  src = src.replace(chainRe, "const chain = [...src.matchAll(/\\{ from: '(\\w+)', next: '(\\w+)', duration: ([\\d.]+), reduced: ([\\d.]+) \\}/g)];");
  src = src.replace("chain.map((m) => m[1]).join(',') === 'arm,pull,vortex,collapse,throat,eject'\n    && chain.map((m) => m[2]).join(',') === 'pull,vortex,collapse,throat,eject,settle');",
    "chain.map((m) => m[1]).join(',') === 'ignition,onsetPull,angularCapture,horizonClose,threshold,emergence'\n    && chain.map((m) => m[2]).join(',') === 'onsetPull,angularCapture,horizonClose,threshold,emergence,resolution'\n    && /BREACH_BEAT/.test(src) && /tier === 2/.test(src));");
  src = src.replace("check('R18: the beat chain is the causal order arm→pull→vortex→collapse→throat→eject→settle', chainOk",
    "check('R18: the beat chain is the causal order ignition→…→resolution, with breach inserted for Tier II', chainOk");
  fs.writeFileSync(p, src);
  console.log('round18 updated');
}
