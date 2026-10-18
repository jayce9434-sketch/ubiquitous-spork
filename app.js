(() => {
  'use strict';

  const GENRES = [
    'Fast-Paced', 'Rock', 'Metal', 'Synthwave', 'Drum & Bass', 'House',
    'Funk', 'Cinematic', '8-Bit', 'Jazz Fusion', 'Industrial'
  ];

  const TRACK_NAMES = {
    'Fast-Paced': ['Redline Cathedral','Afterburner Avenue','Velocity Crown','Zero Brake District','Machlight','Hyperlane Riot','Overtake Protocol','Midnight Redline','Skyline Sprint','Terminal Velocity'],
    'Rock': ['Iron Anthem','Static on the Mountain','Blacktop Thunder','Crimson Amplifier','Rust & Voltage','Broken Speaker Parade','Stonewire','Last Exit Riff','Gravel Crown','Loud Enough'],
    'Metal': ['Titanium Riot','Double Kick District','Molten Crown','Chrome Fang','Furnace Sprint','Razor Skyline','Black Iron Engine','Overdrive Hammer','Ash Circuit','Final Breakdown'],
    'Synthwave': ['Neon Overdrive','Violet Freeway','Chrome Sunset','Nightgrid','Laser Boulevard','Afterimage 1989','Signal Horizon','Electric Palms','Midnight Arcade','Glass Highway'],
    'Drum & Bass': ['Pulse Reactor','Breakline','Subzero Sprint','Gridrunner','Pressure Tunnel','Vector Rush','Bassline Pursuit','Split Second','Undercurrent 174','No Sleep Circuit'],
    'House': ['City Lights at 2AM','Rooftop Circuit','Fourth Floor','Blue Neon Lobby','Motion Repeat','Glass Elevator','Night Shift','Satellite Club','Open Till Dawn','Pulse Check'],
    'Funk': ['Pocket Engine','Brassless Wonder','Sidewalk Bounce','Velvet Gears','Snapback Groove','Corner Store Funk','Lowbeam','Rubber Sole','Late Fee','Green Room'],
    'Cinematic': ['Crownfall','Stormglass','March of the Last Engine','Signal Before Dawn','Ashen Skyline','The Long Ascent','Citadel Run','Gravity Choir','Fireline Overture','Final Approach'],
    '8-Bit': ['Pixel Raceway','Cartridge Inferno','Boss Door','Coinstorm','Turbo Menu','Save Point Zero','Bitcrush Boulevard','Extra Life','CRT Sprint','Final Level 99'],
    'Jazz Fusion': ['Odd Meter Weather','Neon Sax Without Sax','Chromatic Detour','Late Train Logic','Seventh Floor','Pocket Polyrhythm','Blue Circuit','Offbeat Gravity','Side B','Five Past Midnight'],
    'Industrial': ['Steel Pulse','Factory Alarm','Concrete Current','Hydraulic Night','Machine Room 6','Cold Rivet','Pressure Plate','Iron Lungline','Assembly Storm','Voltage Foundry']
  };

  const GENRE_CONFIG = {
    'Fast-Paced': { bpm:[168,198], scale:'minor', wave:'sawtooth', bass:'square', drums:'fast', fx:'drive', energy:[86,100] },
    'Rock': { bpm:[126,164], scale:'minor', wave:'sawtooth', bass:'square', drums:'rock', fx:'drive', energy:[78,96] },
    'Metal': { bpm:[148,192], scale:'phrygian', wave:'sawtooth', bass:'square', drums:'metal', fx:'drive', energy:[90,100] },
    'Synthwave': { bpm:[104,138], scale:'minor', wave:'sawtooth', bass:'sawtooth', drums:'synth', fx:'delay', energy:[68,90] },
    'Drum & Bass': { bpm:[168,180], scale:'dorian', wave:'square', bass:'sawtooth', drums:'dnb', fx:'drive', energy:[90,100] },
    'House': { bpm:[120,132], scale:'minor', wave:'triangle', bass:'square', drums:'house', fx:'delay', energy:[68,88] },
    'Funk': { bpm:[102,124], scale:'dorian', wave:'square', bass:'triangle', drums:'funk', fx:'clean', energy:[64,84] },
    'Cinematic': { bpm:[82,138], scale:'minor', wave:'triangle', bass:'sine', drums:'cinematic', fx:'space', energy:[60,96] },
    '8-Bit': { bpm:[136,184], scale:'major', wave:'square', bass:'square', drums:'chip', fx:'clean', energy:[76,98] },
    'Jazz Fusion': { bpm:[108,148], scale:'dorian', wave:'triangle', bass:'sine', drums:'jazz', fx:'clean', energy:[58,84] },
    'Industrial': { bpm:[118,154], scale:'phrygian', wave:'sawtooth', bass:'square', drums:'industrial', fx:'drive', energy:[82,100] }
  };

  const KEYS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const ROOT_MIDI = {C:48,'C#':49,D:50,'D#':51,E:52,F:53,'F#':54,G:55,'G#':56,A:57,'A#':58,B:59};
  const SCALES = {
    minor:[0,2,3,5,7,8,10], major:[0,2,4,5,7,9,11], dorian:[0,2,3,5,7,9,10], phrygian:[0,1,3,5,7,8,10]
  };

  // Relative ratings: every track is usable, while 5-star tracks get the most layered arrangements.
  const ratingPattern = [5,4,3,5,4,2,5,3,4,1];
  const tracks = [];
  let id = 1;
  GENRES.forEach((genre, gi) => {
    const cfg = GENRE_CONFIG[genre];
    TRACK_NAMES[genre].forEach((title, ti) => {
      const seed = (gi + 1) * 1019 + (ti + 1) * 137;
      const bpm = cfg.bpm[0] + Math.floor(hash(seed, 7) * (cfg.bpm[1] - cfg.bpm[0] + 1));
      const energy = cfg.energy[0] + Math.floor(hash(seed, 11) * (cfg.energy[1] - cfg.energy[0] + 1));
      const key = KEYS[Math.floor(hash(seed, 13) * KEYS.length)];
      let rating = ratingPattern[(ti + gi * 3) % ratingPattern.length];
      if(['Redline Cathedral','Iron Anthem','Titanium Riot','Neon Overdrive','Pulse Reactor','City Lights at 2AM','Pocket Engine','Crownfall','Pixel Raceway','Odd Meter Weather','Steel Pulse'].includes(title)) rating = 5;
      tracks.push({ id:id++, title, genre, bpm, energy, key, rating, seed, ...cfg });
    });
  });
  const TOTAL_TRACKS = tracks.length;

  const state = {
    query:'', genre:'All', minRating:1, sort:'default', favoritesOnly:false,
    favorites:new Set(readArrayCompat('bb110_favorites','bb100_favorites')), discovered:new Set(readArrayCompat('bb110_discovered','bb100_discovered')),
    listenSeconds:{...readJsonCompat('bb110_listen','bb100_listen', {})}, currentId:null, playing:false,
    autoNext:readJsonCompat('bb110_autoNext','bb100_autoNext', true), visualizer:readJsonCompat('bb110_visualizer','bb100_visualizer', true),
    discoverTime:Number(readJsonCompat('bb110_discoverTime','bb100_discoverTime', 10)), volume:Number(readJsonCompat('bb110_volume','bb100_volume', 100)),
    ownerUnlocked:false
  };

  const els = {};
  const ids = ['trackList','genreList','ratingFilters','searchInput','sortSelect','favoritesBtn','resetFiltersBtn','resultCount','playlistTitle','playlistEyebrow','discoveredCount','progressText','progressRing','shuffleBtn','settingsBtn','settingsModal','ownerModal','ownerBtn','ownerCode','ownerUnlockBtn','ownerError','ownerGate','ownerControls','unlockAllBtn','clearDiscoveriesBtn','favoriteAllFiveBtn','ownerShuffleBtn','resetProgressBtn','volumeRange','volumeOutput','autoNextToggle','visualizerToggle','discoverTimeSelect','npGenre','npTitle','npSub','npRating','npBpm','npKey','npEnergy','npArt','visualizer','seekBar','timeCurrent','timeTotal','playBtn','prevBtn','nextBtn','favoriteCurrentBtn','engineStatus','toast'];
  ids.forEach(k => els[k] = document.getElementById(k));

  // ---------- Rendering ----------
  function renderAll(){ renderGenres(); renderRatingFilters(); renderTracks(); renderProgress(); renderPlayer(); syncSettings(); }

  function filteredTracks(){
    let arr = tracks.filter(t => {
      const q = state.query.trim().toLowerCase();
      if(q && !(`${t.title} ${t.genre}`.toLowerCase().includes(q))) return false;
      if(state.genre !== 'All' && t.genre !== state.genre) return false;
      if(t.rating < state.minRating) return false;
      if(state.favoritesOnly && !state.favorites.has(t.id)) return false;
      return true;
    });
    if(state.sort === 'rating') arr.sort((a,b)=>b.rating-a.rating || b.energy-a.energy || a.id-b.id);
    else if(state.sort === 'bpm') arr.sort((a,b)=>b.bpm-a.bpm || a.id-b.id);
    else if(state.sort === 'title') arr.sort((a,b)=>a.title.localeCompare(b.title));
    else arr.sort((a,b)=>a.id-b.id);
    return arr;
  }

  function renderGenres(){
    const all = ['All', ...GENRES];
    els.genreList.innerHTML = all.map(g => {
      const count = g === 'All' ? tracks.length : tracks.filter(t=>t.genre===g).length;
      return `<button class="genre-btn ${state.genre===g?'active':''}" data-genre="${escapeHtml(g)}"><span>${escapeHtml(g)}</span><small>${count}</small></button>`;
    }).join('');
  }

  function renderRatingFilters(){
    els.ratingFilters.innerHTML = [1,2,3,4,5].map(n=>`<button class="rating-filter ${state.minRating===n?'active':''}" data-rating="${n}" title="${n}+ stars">${n}+</button>`).join('');
  }

  function renderTracks(){
    const list = filteredTracks();
    els.resultCount.textContent = `${list.length} track${list.length===1?'':'s'}`;
    const heading = state.favoritesOnly ? 'Favorite Tracks' : state.genre === 'All' ? `All ${TOTAL_TRACKS} Tracks` : `${state.genre} Tracks`;
    els.playlistTitle.textContent = heading;
    els.playlistEyebrow.textContent = state.minRating > 1 ? `${state.minRating}+ STAR FILTER` : (state.genre==='All'?'FULL PLAYLIST':state.genre.toUpperCase());
    if(!list.length){
      els.trackList.innerHTML = `<div class="empty-state"><strong>No tracks match.</strong>Try lowering the rating filter or clearing search.</div>`;
      return;
    }
    els.trackList.innerHTML = list.map(t => {
      const discovered = state.discovered.has(t.id);
      return `<div class="track-row ${state.currentId===t.id?'playing':''}" role="listitem" data-id="${t.id}">
        <div class="track-number">${String(t.id).padStart(3,'0')}</div>
        <div class="track-title"><strong>${escapeHtml(t.title)}${discovered?'<span class="discovered-dot" title="Discovered"></span>':''}</strong><span>${escapeHtml(t.genre)} · ${t.key} ${t.scale}</span></div>
        <div class="tag">${t.energy}% energy</div>
        <div class="bpm">${t.bpm} BPM</div>
        ${ratingHtml(t.rating,true)}
        <button class="mini-fav ${state.favorites.has(t.id)?'active':''}" data-fav="${t.id}" aria-label="Favorite ${escapeHtml(t.title)}">FAV</button>
      </div>`;
    }).join('');
  }

  function renderProgress(){
    const count = state.discovered.size;
    els.discoveredCount.textContent = count;
    els.progressRing.style.setProperty('--p', Math.round((count/TOTAL_TRACKS)*100));
    els.progressText.textContent = count === TOTAL_TRACKS ? 'Complete. Every track discovered.' : `${TOTAL_TRACKS-count} tracks still undiscovered.`;
  }

  function renderPlayer(){
    const t = currentTrack();
    if(!t){
      els.npGenre.textContent='READY'; els.npTitle.textContent='Choose a track'; els.npSub.textContent='Original procedural instrumental';
      els.npRating.innerHTML=''; els.npBpm.textContent='--'; els.npKey.textContent='--'; els.npEnergy.textContent='--';
      els.playBtn.textContent='PLAY'; els.favoriteCurrentBtn.textContent='Add to favorites'; els.favoriteCurrentBtn.classList.remove('active');
      els.timeTotal.textContent='0:00'; els.timeCurrent.textContent='0:00'; els.seekBar.value=0; return;
    }
    els.npGenre.textContent=t.genre.toUpperCase(); els.npTitle.textContent=t.title; els.npSub.textContent=`Track ${String(t.id).padStart(3,'0')} · ${t.scale} scale · live synthesis`;
    els.npRating.innerHTML = starShapes(t.rating); els.npBpm.textContent=t.bpm; els.npKey.textContent=t.key; els.npEnergy.textContent=`${t.energy}%`;
    els.playBtn.textContent=state.playing?'PAUSE':'PLAY';
    const fav = state.favorites.has(t.id); els.favoriteCurrentBtn.textContent=fav?'Remove from favorites':'Add to favorites'; els.favoriteCurrentBtn.classList.toggle('active',fav);
    const hue = Math.round(hash(t.seed, 99)*280 + 40); els.npArt.style.filter=`hue-rotate(${hue}deg)`;
    els.timeTotal.textContent=formatTime(engine.durationFor(t));
    document.querySelectorAll('.track-row').forEach(r=>r.classList.toggle('playing', Number(r.dataset.id)===t.id));
  }

  function ratingHtml(n, compact=false){ return `<div class="rating-display ${compact?'compact':''}" aria-label="${n} out of 5 stars">${starShapes(n)}</div>`; }
  function starShapes(n){ return [1,2,3,4,5].map(i=>`<span class="star-shape ${i<=n?'on':''}"></span>`).join(''); }

  function syncSettings(){
    els.volumeRange.value=state.volume; els.volumeOutput.value=`${state.volume}%`;
    els.autoNextToggle.checked=state.autoNext; els.visualizerToggle.checked=state.visualizer; els.discoverTimeSelect.value=String(state.discoverTime);
  }

  // ---------- Audio engine ----------
  const engine = {
    ctx:null, master:null, compressor:null, analyser:null, noiseBuffer:null, samples:{},
    schedulerId:null, nextNoteTime:0, step:0, totalSteps:384, lookAhead:0.12, scheduleEvery:25,
    current:null, started:false,
    async ensure(){
      if(!this.ctx){
        const AC = window.AudioContext || window.webkitAudioContext;
        if(!AC){ showToast('This browser does not support Web Audio.'); return false; }
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.value=-12; this.compressor.knee.value=18; this.compressor.ratio.value=10; this.compressor.attack.value=.004; this.compressor.release.value=.18;
        this.analyser = this.ctx.createAnalyser(); this.analyser.fftSize=256; this.analyser.smoothingTimeConstant=.8;
        this.master.connect(this.compressor); this.compressor.connect(this.analyser); this.analyser.connect(this.ctx.destination);
        this.noiseBuffer=this.makeNoise(); this.setVolume(state.volume); await this.loadSamples();
      }
      if(this.ctx.state==='suspended') await this.ctx.resume();
      return true;
    },
    makeNoise(){
      const b=this.ctx.createBuffer(1,this.ctx.sampleRate,this.ctx.sampleRate); const d=b.getChannelData(0); for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1; return b;
    },
    async loadSamples(){
      const files={coin:'sfx_coin.wav',powerup:'sfx_powerup.wav',hit:'sfx_hit.wav',blip:'sfx_blip.wav',glitch:'sfx_glitch.wav',sweep:'sfx_sweep.wav'};
      await Promise.all(Object.entries(files).map(async([name,url])=>{
        try{const r=await fetch(url);if(!r.ok)throw new Error('sample');const a=await r.arrayBuffer();this.samples[name]=await this.ctx.decodeAudioData(a);}catch{this.samples[name]=null;}
      }));
    },
    sample(name,time,vol=.08,rate=1,panValue=0){
      const buffer=this.samples[name]; if(!buffer)return;
      const src=this.ctx.createBufferSource(),g=this.ctx.createGain(),pan=this.ctx.createStereoPanner?this.ctx.createStereoPanner():null;
      src.buffer=buffer;src.playbackRate.value=rate;g.gain.value=vol;src.connect(g);
      if(pan){pan.pan.value=panValue;g.connect(pan);pan.connect(this.master);}else g.connect(this.master);
      src.start(time);
    },
    setVolume(v){
      state.volume=Number(v); writeJson('bb110_volume',state.volume);
      if(this.master){
        const linear = state.volume===0?0:Math.pow(state.volume/100, .82);
        this.master.gain.setTargetAtTime(linear, this.ctx.currentTime, .02);
      }
    },
    durationFor(t){ return (this.totalSteps * (60/t.bpm/4)); },
    async play(t, fromStart=false){
      if(!await this.ensure())return;
      if(this.current?.id!==t.id || fromStart){ this.current=t; this.step=0; }
      else this.current=t;
      this.nextNoteTime=this.ctx.currentTime+.05; this.started=true;
      clearInterval(this.schedulerId); this.schedulerId=setInterval(()=>this.schedule(),this.scheduleEvery);
      state.playing=true; state.currentId=t.id; els.engineStatus.textContent='Audio engine running';
      renderTracks(); renderPlayer();
    },
    pause(){ clearInterval(this.schedulerId); this.schedulerId=null; state.playing=false; els.engineStatus.textContent='Audio engine paused'; renderPlayer(); },
    stop(){ this.pause(); this.step=0; },
    schedule(){
      if(!this.ctx || !this.current) return;
      while(this.nextNoteTime < this.ctx.currentTime + this.lookAhead){
        this.scheduleStep(this.current,this.step,this.nextNoteTime);
        this.nextNoteTime += 60/this.current.bpm/4;
        this.step++;
        if(this.step>=this.totalSteps){
          this.step=0;
          if(state.autoNext){ setTimeout(()=>nextTrack(true),20); }
          else this.pause();
          break;
        }
      }
    },
    scheduleStep(t, step, time){
      const s=step%16, bar=Math.floor(step/16), section=Math.floor(bar/4)%6;
      this.drums(t,s,bar,time);
      const root=ROOT_MIDI[t.key]; const scale=SCALES[t.scale];
      const progression = t.genre==='Jazz Fusion' ? [0,3,1,4] : t.genre==='Cinematic' ? [0,5,3,4] : [0,5,2,4];
      const degree=progression[Math.floor(bar/2)%progression.length]%scale.length;
      const rootNote=root+scale[degree];

      // Bass: genre-specific rhythm.
      const bassHit = ['House','Rock','Metal','Industrial','Fast-Paced'].includes(t.genre) ? s%4===0 : (s===0||s===6||s===10||s===14);
      if(bassHit && t.genre!=='Cinematic' && (t.rating>=2 || s===0 || s===8)){
        const alt = hash(t.seed, step, 21)>.72 ? 7:0;
        this.note(rootNote-12+alt,time,.11,t.bass, .09 + t.energy/1100, {filter:500, drive:t.fx==='drive'?1.7:1});
      }
      if(t.genre==='Cinematic' && (s===0||s===8)) this.note(rootNote-12,time,.55,'sine',.18,{filter:700});

      // Chord / pad layer.
      if(s===0 && ['Synthwave','House','Cinematic','Jazz Fusion'].includes(t.genre)){
        const chord=[rootNote, rootNote+scale[2], rootNote+scale[4]];
        chord.forEach((n,i)=>this.note(n+12,time,(t.genre==='Cinematic'?1.4:.75), t.genre==='Synthwave'?'sawtooth':'triangle', .035,{filter:t.genre==='Cinematic'?1200:1600, detune:(i-1)*4}));
      }

      // Arpeggiator / riff layer. 5-star tracks get denser phrases.
      const dense = t.rating===5 ? 1 : t.rating===4 ? 2 : t.rating===3 ? 2 : 4;
      const genreArp = ['Fast-Paced','Synthwave','8-Bit','Drum & Bass','Metal'].includes(t.genre);
      if((genreArp && s%dense===0) || (!genreArp && (s===2||s===6||s===10||s===14))){
        const r=hash(t.seed, step, 41); const idx=Math.floor(r*scale.length);
        let octave = t.genre==='8-Bit'?24:12;
        if(t.genre==='Drum & Bass') octave=12;
        const n=root+scale[idx]+octave;
        const dur=t.genre==='Synthwave'?.17:t.genre==='8-Bit'?.075:.10;
        const wave=t.genre==='8-Bit'?'square':t.wave;
        this.note(n,time,dur,wave,.04+(t.rating*.008),{filter:t.genre==='Fast-Paced'?2600:2100, pan:(hash(t.seed,step,53)-.5)*.7, drive:t.fx==='drive'?1.25:1});
        if(t.rating===5 && s%4===2 && section>=2) this.note(n+12,time+.025,dur*.7,wave,.018,{filter:3000,pan:.4});
      }

      // Metal gets palm-muted pseudo-guitar power riffs and octave punches.
      if(t.genre==='Metal' && (s===0||s===2||s===3||s===6||s===8||s===10||s===11||s===14)){
        const riffOffset=[0,0,1,0,3,0,4,3][(s+bar)%8]%scale.length;
        const rn=root+scale[riffOffset]-12;
        this.note(rn,time,.07,'sawtooth',.06+t.rating*.006,{filter:1100,drive:1.6,pan:-.16});
        this.note(rn+7,time,.065,'square',.025,{filter:1450,drive:1.35,pan:.16});
        if(t.rating>=4 && s%4===2)this.note(rn+12,time,.06,'sawtooth',.022,{filter:1900,pan:.3});
      }

      // One-shot retro samples are mixed into the 8-bit arrangements as percussion and transition accents.
      if(t.genre==='8-Bit'){
        if((s===3||s===11) && hash(t.seed,bar,s)>.42)this.sample('blip',time,.075,.88+hash(t.seed,step,90)*.35,(s===3?-.35:.35));
        if(s===14 && bar%4===3)this.sample('coin',time,.09,.9+hash(t.seed,bar,91)*.25,.25);
        if(t.rating>=4 && s===0 && bar>0 && bar%8===0)this.sample('powerup',time,.085,.9+hash(t.seed,bar,92)*.12,-.15);
        if(t.rating===5 && s===15 && bar%8===7)this.sample('sweep',time,.07,1,.1);
        if(t.rating<=2 && s===7 && bar%4===2)this.sample('glitch',time,.045,.9,-.2);
      }

      // Signature accents keep the 110 tracks from collapsing into one pattern.
      if((bar%8===7 && s>=12) && hash(t.seed,s,77)>.35) this.note(root+scale[(s+bar)%scale.length]+24,time,.055,t.wave,.028,{filter:3400,pan:(s-13.5)/4});
      if((t.genre==='Metal'||t.genre==='Industrial') && s===12 && bar%4===3) this.sample('hit',time,.04,.72,-.1);
      if(t.genre==='Funk' && (s===3||s===7||s===11||s===15)) this.note(rootNote+12+(s%8===3?7:3),time,.045,'square',.035,{filter:1300});
      if(t.genre==='Jazz Fusion' && (s===5||s===11)) this.note(root+scale[Math.floor(hash(t.seed,step,88)*scale.length)]+12,time,.13,'triangle',.052,{filter:2400,pan:.25});
    },
    drums(t,s,bar,time){
      const type=t.drums;
      if(type==='house'){
        if([0,4,8,12].includes(s))this.kick(time,.8); if([4,12].includes(s))this.snare(time,.32); if(s%2===2)this.hat(time,.05,.12); if(s%4===3)this.hat(time,.025,.07);
      } else if(type==='rock'){
        if([0,6,8,14].includes(s))this.kick(time,.9); if([4,12].includes(s))this.snare(time,.42); if(s%2===0)this.hat(time,.06,.12); if(bar%4===3 && s>=13)this.snare(time,.12);
      } else if(type==='metal'){
        if([0,2,3,6,8,10,11,14].includes(s))this.kick(time,1.05,.22); if([4,12].includes(s))this.snare(time,.5); this.hat(time,.028,s%2===0?.12:.065); if(bar%4===3 && s>=12)this.snare(time,.18);
      } else if(type==='fast'){
        if([0,3,6,8,11,14].includes(s))this.kick(time,.8); if([4,12].includes(s))this.snare(time,.45); this.hat(time,.035,s%2===0?.12:.065); if(bar%4===3 && s>=12)this.snare(time,.16);
      } else if(type==='dnb'){
        if([0,7,10].includes(s))this.kick(time,.9); if([4,12].includes(s))this.snare(time,.5); this.hat(time,.03,s%2===0?.11:.055); if(s===15 && bar%2)this.snare(time,.13);
      } else if(type==='synth'){
        if([0,8].includes(s))this.kick(time,.78); if([4,12].includes(s))this.snare(time,.34); if(s%2===0)this.hat(time,.04,.095);
      } else if(type==='funk'){
        if([0,5,8,11,14].includes(s))this.kick(time,.68); if([4,12].includes(s))this.snare(time,.28); if([2,6,10,14].includes(s))this.hat(time,.045,.09);
      } else if(type==='cinematic'){
        if([0,10].includes(s) && bar%2===0)this.kick(time,1.15,.65); if(s===12 && bar%4===3)this.snare(time,.35);
      } else if(type==='chip'){
        if([0,8].includes(s))this.kick(time,.65); if([4,12].includes(s))this.snare(time,.24); if(s%2===0)this.hat(time,.025,.055);
      } else if(type==='jazz'){
        if([0,10].includes(s))this.kick(time,.48); if([4,12].includes(s))this.snare(time,.2); if([2,6,10,14].includes(s))this.hat(time,.08,.08); if([7,15].includes(s))this.hat(time,.04,.045);
      } else if(type==='industrial'){
        if([0,3,8,11,14].includes(s))this.kick(time,1.1,.8); if([4,12].includes(s))this.snare(time,.55); if(s%2===0)this.hat(time,.028,.10); if([6,15].includes(s))this.metal(time,.09);
      }
    },
    note(midi,time,dur,wave='sine',vol=.05,opt={}){
      const osc=this.ctx.createOscillator(), g=this.ctx.createGain(), filter=this.ctx.createBiquadFilter(), pan=this.ctx.createStereoPanner?this.ctx.createStereoPanner():null;
      osc.type=wave; osc.frequency.value=440*Math.pow(2,(midi-69)/12); if(opt.detune)osc.detune.value=opt.detune;
      filter.type='lowpass'; filter.frequency.value=opt.filter||2200; filter.Q.value=.7;
      const peak=vol*(opt.drive||1); g.gain.setValueAtTime(.0001,time); g.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),time+.008); g.gain.exponentialRampToValueAtTime(.0001,time+dur);
      osc.connect(filter); filter.connect(g); if(pan){pan.pan.value=opt.pan||0;g.connect(pan);pan.connect(this.master);}else g.connect(this.master);
      osc.start(time); osc.stop(time+dur+.04);
    },
    kick(time,vol=.8,length=.28){
      const o=this.ctx.createOscillator(),g=this.ctx.createGain(); o.type='sine'; o.frequency.setValueAtTime(150,time);o.frequency.exponentialRampToValueAtTime(43,time+length);g.gain.setValueAtTime(vol,time);g.gain.exponentialRampToValueAtTime(.0001,time+length);o.connect(g);g.connect(this.master);o.start(time);o.stop(time+length+.03);
    },
    snare(time,vol=.3){
      const src=this.ctx.createBufferSource(),f=this.ctx.createBiquadFilter(),g=this.ctx.createGain();src.buffer=this.noiseBuffer;f.type='bandpass';f.frequency.value=1900;f.Q.value=.8;g.gain.setValueAtTime(vol,time);g.gain.exponentialRampToValueAtTime(.0001,time+.14);src.connect(f);f.connect(g);g.connect(this.master);src.start(time);src.stop(time+.16);
      this.note(50,time,.09,'triangle',vol*.08,{filter:900});
    },
    hat(time,dur=.04,vol=.08){
      const src=this.ctx.createBufferSource(),f=this.ctx.createBiquadFilter(),g=this.ctx.createGain();src.buffer=this.noiseBuffer;f.type='highpass';f.frequency.value=6500;g.gain.setValueAtTime(vol,time);g.gain.exponentialRampToValueAtTime(.0001,time+dur);src.connect(f);f.connect(g);g.connect(this.master);src.start(time);src.stop(time+dur+.01);
    },
    metal(time,vol=.08){ [190,277,421].forEach((hz,i)=>{const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type='square';o.frequency.value=hz;g.gain.setValueAtTime(vol/(i+1),time);g.gain.exponentialRampToValueAtTime(.0001,time+.08);o.connect(g);g.connect(this.master);o.start(time);o.stop(time+.09);}); }
  };

  // ---------- Interaction ----------
  function currentTrack(){ return tracks.find(t=>t.id===state.currentId)||null; }
  async function selectAndPlay(id){ const t=tracks.find(x=>x.id===id); if(!t)return; await engine.play(t, true); }
  function togglePlay(){ const t=currentTrack(); if(!t){ const list=filteredTracks(); if(list.length)selectAndPlay(list[0].id); return; } state.playing?engine.pause():engine.play(t,false); }
  function nextTrack(forcePlay=false){
    const list=filteredTracks().length?filteredTracks():tracks; let idx=list.findIndex(t=>t.id===state.currentId); idx=(idx+1+list.length)%list.length; const shouldPlay=forcePlay||state.playing; state.currentId=list[idx].id; engine.current=list[idx]; engine.step=0; if(shouldPlay)engine.play(list[idx],true); else{renderTracks();renderPlayer();}
  }
  function prevTrack(){ const list=filteredTracks().length?filteredTracks():tracks; let idx=list.findIndex(t=>t.id===state.currentId); idx=(idx-1+list.length)%list.length; const shouldPlay=state.playing; state.currentId=list[idx].id; engine.current=list[idx]; engine.step=0; if(shouldPlay)engine.play(list[idx],true); else{renderTracks();renderPlayer();} }
  function randomTrack(fiveOnly=false){ const pool=(fiveOnly?tracks.filter(t=>t.rating===5):filteredTracks()); if(!pool.length)return; const t=pool[Math.floor(Math.random()*pool.length)]; selectAndPlay(t.id); }
  function toggleFavorite(id){ id=Number(id); if(state.favorites.has(id))state.favorites.delete(id);else state.favorites.add(id); writeArray('bb110_favorites',state.favorites); renderTracks();renderPlayer(); }
  function openModal(id){ const el=document.getElementById(id);el.classList.add('open');el.setAttribute('aria-hidden','false'); }
  function closeModal(id){ const el=document.getElementById(id);el.classList.remove('open');el.setAttribute('aria-hidden','true'); }

  els.trackList.addEventListener('click',e=>{
    const fav=e.target.closest('[data-fav]'); if(fav){e.stopPropagation();toggleFavorite(fav.dataset.fav);return;}
    const row=e.target.closest('.track-row'); if(row)selectAndPlay(Number(row.dataset.id));
  });
  els.genreList.addEventListener('click',e=>{const b=e.target.closest('[data-genre]');if(!b)return;state.genre=b.dataset.genre;renderAll();});
  els.ratingFilters.addEventListener('click',e=>{const b=e.target.closest('[data-rating]');if(!b)return;state.minRating=Number(b.dataset.rating);renderAll();});
  els.searchInput.addEventListener('input',e=>{state.query=e.target.value;renderTracks();});
  els.sortSelect.addEventListener('change',e=>{state.sort=e.target.value;renderTracks();});
  els.favoritesBtn.addEventListener('click',()=>{state.favoritesOnly=!state.favoritesOnly;els.favoritesBtn.textContent=`Favorites only: ${state.favoritesOnly?'On':'Off'}`;renderTracks();});
  els.resetFiltersBtn.addEventListener('click',()=>{state.query='';state.genre='All';state.minRating=1;state.sort='default';state.favoritesOnly=false;els.searchInput.value='';els.sortSelect.value='default';els.favoritesBtn.textContent='Favorites only: Off';renderAll();});
  els.shuffleBtn.addEventListener('click',()=>randomTrack(false)); els.playBtn.addEventListener('click',togglePlay); els.nextBtn.addEventListener('click',()=>nextTrack()); els.prevBtn.addEventListener('click',prevTrack); els.favoriteCurrentBtn.addEventListener('click',()=>{if(state.currentId)toggleFavorite(state.currentId);});
  els.settingsBtn.addEventListener('click',()=>openModal('settingsModal')); document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>closeModal(b.dataset.close)));
  document.querySelectorAll('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeModal(m.id);}));
  els.volumeRange.addEventListener('input',e=>{engine.setVolume(e.target.value);els.volumeOutput.value=`${e.target.value}%`;});
  els.autoNextToggle.addEventListener('change',e=>{state.autoNext=e.target.checked;writeJson('bb110_autoNext',state.autoNext);});
  els.visualizerToggle.addEventListener('change',e=>{state.visualizer=e.target.checked;writeJson('bb110_visualizer',state.visualizer);});
  els.discoverTimeSelect.addEventListener('change',e=>{state.discoverTime=Number(e.target.value);writeJson('bb110_discoverTime',state.discoverTime);});
  els.ownerBtn.addEventListener('click',()=>{closeModal('settingsModal');openModal('ownerModal');});
  els.ownerUnlockBtn.addEventListener('click',unlockOwner); els.ownerCode.addEventListener('keydown',e=>{if(e.key==='Enter')unlockOwner();});
  function unlockOwner(){
    if(els.ownerCode.value==='WestvirgiNA'){state.ownerUnlocked=true;els.ownerGate.classList.add('hidden');els.ownerControls.classList.remove('hidden');els.ownerError.textContent='';showToast('Owner controls unlocked.');}
    else els.ownerError.textContent='Incorrect owner code.';
  }
  els.unlockAllBtn.addEventListener('click',()=>{tracks.forEach(t=>state.discovered.add(t.id));writeArray('bb110_discovered',state.discovered);renderAll();showToast('All tracks discovered locally.');});
  els.clearDiscoveriesBtn.addEventListener('click',()=>{state.discovered.clear();state.listenSeconds={};writeArray('bb110_discovered',state.discovered);writeJson('bb110_listen',{});renderAll();showToast('Discoveries cleared.');});
  els.favoriteAllFiveBtn.addEventListener('click',()=>{tracks.filter(t=>t.rating===5).forEach(t=>state.favorites.add(t.id));writeArray('bb110_favorites',state.favorites);renderAll();showToast('Every 5-star track favorited.');});
  els.ownerShuffleBtn.addEventListener('click',()=>{closeModal('ownerModal');randomTrack(true);});
  els.resetProgressBtn.addEventListener('click',()=>{state.discovered.clear();state.favorites.clear();state.listenSeconds={};writeArray('bb110_discovered',state.discovered);writeArray('bb110_favorites',state.favorites);writeJson('bb110_listen',{});renderAll();showToast('Local progress reset.');});
  els.seekBar.addEventListener('input',e=>{if(!currentTrack())return;engine.step=Math.floor((Number(e.target.value)/1000)*engine.totalSteps);});

  // Debug URL views also make deterministic screenshot testing possible.
  const params=new URLSearchParams(location.search);
  if(params.get('genre') && ['All',...GENRES].includes(params.get('genre')))state.genre=params.get('genre');
  if(params.get('stars'))state.minRating=Math.min(5,Math.max(1,Number(params.get('stars'))||1));
  if(params.get('view')==='settings')setTimeout(()=>openModal('settingsModal'),50);
  if(params.get('view')==='owner')setTimeout(()=>openModal('ownerModal'),50);

  // ---------- Progress timer and visualizer ----------
  setInterval(()=>{
    if(!state.playing || !state.currentId)return;
    const id=state.currentId; state.listenSeconds[id]=(state.listenSeconds[id]||0)+1;
    if(state.listenSeconds[id]>=state.discoverTime && !state.discovered.has(id)){
      state.discovered.add(id); writeArray('bb110_discovered',state.discovered); renderProgress(); renderTracks(); showToast(`Discovered: ${currentTrack()?.title||'Track'}`);
    }
    if((state.listenSeconds[id]||0)%5===0)writeJson('bb110_listen',state.listenSeconds);
  },1000);

  const ctx2=els.visualizer.getContext('2d');
  function animate(){
    requestAnimationFrame(animate);
    const t=currentTrack();
    if(t && engine.totalSteps){const p=(engine.step%engine.totalSteps)/engine.totalSteps;els.seekBar.value=Math.floor(p*1000);els.timeCurrent.textContent=formatTime(p*engine.durationFor(t));}
    if(!ctx2)return; const w=els.visualizer.width,h=els.visualizer.height;ctx2.clearRect(0,0,w,h);ctx2.fillStyle='#090c12';ctx2.fillRect(0,0,w,h);
    if(!state.visualizer)return;
    let data;
    if(engine.analyser && state.playing){data=new Uint8Array(engine.analyser.frequencyBinCount);engine.analyser.getByteFrequencyData(data);}else{data=new Uint8Array(64);for(let i=0;i<data.length;i++)data[i]=16+Math.floor(10*Math.sin(performance.now()/700+i*.8));}
    const bars=52,gap=3,bw=(w-(bars-1)*gap)/bars;
    for(let i=0;i<bars;i++){
      const v=(data[Math.floor(i*data.length/bars)]||0)/255; const bh=Math.max(3,v*(h-18));
      const grd=ctx2.createLinearGradient(0,h-bh,0,h);grd.addColorStop(0,'#d9ff65');grd.addColorStop(1,'#7fe7ff');ctx2.fillStyle=grd;ctx2.fillRect(i*(bw+gap),h-bh,bw,bh);
    }
  }
  animate();

  // ---------- Utilities ----------
  function hash(seed,a=0,b=0){ let x=(seed + a*374761393 + b*668265263)>>>0; x=(x^(x>>>13))*1274126177>>>0; x^=x>>>16; return (x>>>0)/4294967296; }
  function readArray(k){try{const v=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(v)?v.map(Number):[];}catch{return[];}}
  function readArrayCompat(primary,fallback){return localStorage.getItem(primary)!==null?readArray(primary):readArray(fallback);}
  function readJson(k,f){try{const v=localStorage.getItem(k);return v===null?f:JSON.parse(v);}catch{return f;}}
  function readJsonCompat(primary,fallback,def){return localStorage.getItem(primary)!==null?readJson(primary,def):readJson(fallback,def);}
  function writeArray(k,set){localStorage.setItem(k,JSON.stringify([...set]));}
  function writeJson(k,v){localStorage.setItem(k,JSON.stringify(v));}
  function formatTime(sec){sec=Math.max(0,Math.floor(sec||0));return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;}
  function escapeHtml(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
  let toastTimer; function showToast(msg){clearTimeout(toastTimer);els.toast.textContent=msg;els.toast.classList.add('show');toastTimer=setTimeout(()=>els.toast.classList.remove('show'),1900);}

  renderAll();
})();
