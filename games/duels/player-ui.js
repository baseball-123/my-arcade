const $ = id => document.getElementById(id);
export class PlayerUI {
  constructor({ getNet, start, stop, practice, inspect, ownerUnlocked, weaponOptions, describeWeapon }) {
    Object.assign(this, { getNet, start, stop, practice, inspect, ownerUnlocked, describeWeapon });
    this.screen = 'home';
    this.previousSession = null;
    this.lastRoom = '';
    this.intentionalLeave = false;
    this.infoReturn = null;
    const sourceArms = $('arms-toggle').closest('.setting-row');
    sourceArms.id = 'source-arms-option';
    document.querySelector('.tuning').append(sourceArms);
    $('open-create').onclick = () => this.show('create');
    $('open-join').onclick = () => this.show('join');
    $('open-practice').onclick = () => { practice(); this.show('practice'); };
    $('nav-home').onclick = () => this.home();
    $('screen-back').onclick = () => this.home();
    $('open-owner').onclick = () => { practice(); this.show('owner'); };
    $('resume-game').onclick = () => { $('pause-dialog').close(); start(); };
    $('pause-leave').onclick = () => this.home();
    $('close-info').onclick = () => this.closeInfo();
    $('cancel-leave').onclick = () => $('leave-dialog').close();
    $('confirm-leave').onclick = () => {
      $('leave-dialog').close();
      this.leave();
      if (this.arcadeExit) location.href = '../../index.html';
    };
    $('connection-home').onclick = () => { $('connection-dialog').close(); this.show('home'); };
    $('connection-rejoin').onclick = () => {
      $('connection-dialog').close();
      this.show('join');
      $('room-code').value = this.lastRoom;
    };
    $('retry-load').onclick = () => location.reload();
    for (const [id, entries] of [['lobby-primary', weaponOptions.primaries], ['lobby-secondary', weaponOptions.secondaries]]) {
      $(id).replaceChildren(...entries.map(entry => new Option(entry.name, entry.index)));
      $(id).onchange = () => {
        const net = getNet();
        if (net?.local?.ready) this.sendReady(false);
        this.describeLoadout();
      };
    }
    this.describeLoadout();
    $('ready-button').onclick = () => this.sendReady(!getNet().local.ready);
    $('start-match').onclick = () => getNet().startMatch();
    for (const button of document.querySelectorAll('[data-open]')) button.onclick = () => this.openInfo(button.dataset.open);
    $('info-dialog').addEventListener('cancel', event => { event.preventDefault(); this.closeInfo(); });
    $('pause-dialog').addEventListener('cancel', event => { event.preventDefault(); $('resume-game').click(); });
    $('connection-dialog').addEventListener('cancel', event => event.preventDefault());
    $('leave-dialog').addEventListener('cancel', () => { this.arcadeExit = false; });
    document.querySelector('.brand').onclick = event => {
      if (!getNet()?.session) return;
      event.preventDefault();
      this.arcadeExit = true;
      this.confirmLeave();
    };
    this.show('home');
  }
  describeLoadout() {
    $('primary-summary').textContent = this.describeWeapon(Number($('lobby-primary').value));
    $('secondary-summary').textContent = this.describeWeapon(Number($('lobby-secondary').value));
  }
  sendReady(ready) {
    this.getNet().command('ready', {
      primary: Number($('lobby-primary').value),
      secondary: Number($('lobby-secondary').value),
      ready,
    });
  }
  show(screen) {
    this.screen = screen;
    $('menu').hidden = false;
    document.body.dataset.screen = screen;
    $('home-actions').hidden = screen !== 'home';
    $('home-intro').hidden = screen !== 'home';
    $('screen-heading').hidden = screen === 'home';
    $('screen-title').textContent = {
      create: 'Create a room', join: 'Join a room', lobby: 'Your lobby',
      practice: 'Practice', battle: 'Enter the Arena', owner: 'Owner tools',
    }[screen] || '';
    $('room-panel').hidden = !['create', 'join', 'lobby'].includes(screen);
    $('play-panel').hidden = !['practice','battle'].includes(screen);
    const owner = screen === 'owner';
    document.querySelector('.tuning').hidden = !owner;
    document.querySelector('.tabs').hidden = !owner || !this.ownerUnlocked();
    $('lab-panel').hidden = !owner || !this.ownerUnlocked() || !document.body.classList.contains('inspecting');
    $('sliders').hidden = !owner || !this.ownerUnlocked();
    $('source-arms-option').hidden = !owner || !this.ownerUnlocked();
    $('create-options').hidden = screen === 'join';
    $('create-room').hidden = screen !== 'create';
    $('join-room').hidden = screen !== 'join';
    $('room-code').hidden = screen === 'create';
    document.querySelector('label[for="room-code"]').hidden = screen === 'create';
    $('nav-home').hidden = screen === 'home';
    $('open-owner').hidden = Boolean(this.getNet()?.session);
    $('menu-button').hidden = !this.playSession;
    if (!this.getNet()?.session) $('status').textContent = screen === 'practice' ? 'Solo practice' : 'Ready to play';
  }
  home() {
    if (this.getNet()?.session) { this.confirmLeave(); return; }
    this.playSession = false;
    this.stop();
    this.closeInfo();
    this.practice();
    this.show('home');
  }
  confirmLeave() {
    if (!this.getNet()?.session) return;
    this.playSession=false;
    this.stop();
    $('leave-warning').textContent = this.getNet().session.host
      ? 'You are hosting. Leaving closes this room for every player.'
      : 'You will leave this battle and return home.';
    if (!$('leave-dialog').open) $('leave-dialog').showModal();
  }
  leave() {
    this.intentionalLeave = true;
    this.closeInfo();
    for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
    this.stop();
    this.playSession = false;
    this.getNet().leave();
    this.practice();
    this.show('home');
  }
  playing() {
    this.playSession = true;
    $('menu-button').hidden = false;
    $('pause-dialog').close();
    $('info-dialog').close();
  }
  paused() {
    const net = this.getNet();
    if (!this.playSession || ['waiting', 'finished'].includes(net?.snapshot?.phase)) return;
    if (['loadout-dialog', 'match-results', 'leave-dialog'].some(id => $(id).open)) return;
    $('pause-note').textContent = net?.session ? 'The battle continues while this menu is open.' : 'Your practice session is paused.';
    $('pause-leave').textContent = net?.session ? 'Leave room' : 'Return home';
    $('pause-scores').hidden = !net?.session;
    if (!$('pause-dialog').open) $('pause-dialog').showModal();
  }
  openInfo(type) {
    this.infoReturn = $('pause-dialog').open ? 'pause' : this.screen;
    if ($('pause-dialog').open) $('pause-dialog').close();
    const content = $('info-content');
    content.replaceChildren();
    $('info-title').textContent = { settings:'Settings', controls:'Controls', credits:'Credits', scoreboard:'Scoreboard' }[type];
    if (type === 'settings') {
      for (const key of ['sensitivity','fov']) content.append($('tune-' + key).closest('.slider-row'));
      const note = document.createElement('p');
      note.textContent = 'Personal camera settings. Battle gameplay uses shared defaults.';
      content.append(note);
    } else if (type === 'controls') {
      const rows = [
        ['W A S D','Move'], ['Mouse','Look'], ['Left click / F','Fire or use equipment'],
        ['Right click','Aim'], ['Space','Jump'], ['C / Ctrl','Crouch or slide'],
        ['R','Reload'], ['1–4 / wheel','Battle equipment: primary, sidearm, chair, grenade'],
        ['1–7 / wheel','Classic Duel and practice weapons'], ['V','Third-person view'], ['Esc','Pause or resume'],
      ];
      const list = document.createElement('dl');
      for (const [key, action] of rows) {
        const term = document.createElement('dt'), detail = document.createElement('dd');
        term.textContent = key; detail.textContent = action; list.append(term,detail);
      }
      content.append(list);
    } else if (type === 'credits') {
      content.textContent = 'Character and props by Kenney. Gun models by Quaternius. Source arms by wwwriks. Assets licensed CC0. Three.js and PeerJS licensed MIT.';
      const link = document.createElement('a');
      link.href = 'README.md'; link.textContent = 'Game documentation and licenses'; link.target = '_blank'; link.rel = 'noopener';
      content.append(link);
    } else {
      this.fillScores(content, this.getNet()?.snapshot);
    }
    $('info-dialog').showModal();
  }
  closeInfo() {
    for (const row of [...$('info-content').querySelectorAll('.slider-row')]) $('sliders').append(row);
    $('info-dialog').close();
    if (this.infoReturn === 'pause' && this.playSession) this.paused();
    this.infoReturn = null;
  }
  fillScores(container, snapshot) {
    container.replaceChildren();
    if (!snapshot) return;
    const table = document.createElement('table'), head = document.createElement('tr');
    for (const label of ['Player', snapshot.mode === 'duel' ? 'Rounds' : 'Eliminations']) {
      const cell = document.createElement('th'); cell.textContent = label; head.append(cell);
    }
    table.append(head);
    for (const player of snapshot.players.toSorted((a,b) => b.score-a.score)) {
      const row = document.createElement('tr');
      const name = document.createElement('td'), score = document.createElement('td');
      name.textContent = (snapshot.mode === 'teams' ? (player.team === 0 ? 'Blue · ' : 'Orange · ') : '') + player.name;
      score.textContent = player.score; row.append(name,score); table.append(row);
    }
    container.append(table);
  }
  sync() {
    const net = this.getNet(), snapshot = net.snapshot;
    const session = net.session;
    if (session) {
      this.lastRoom = session.code;
      if (snapshot?.phase === 'waiting') {
        if (this.lastPhase !== 'waiting' || this.screen !== 'lobby') {
          this.closeInfo();
          for (const id of ['pause-dialog','loadout-dialog','match-results']) $(id).close();
          if (this.playSession) { this.playSession = false; this.stop(); }
          this.show('lobby');
        }
      }
      $('lobby-preparation').hidden = snapshot?.phase !== 'waiting';
      $('create-options').hidden = !session.host;
      $('room-instructions').textContent = snapshot?.phase === 'waiting'
        ? 'Choose equipment and mark yourself ready. The host starts when everyone is ready.'
        : 'The match is underway. Use Play to enter or Resume from the pause menu.';
      const local = net.local;
      if (local) {
        $('ready-button').textContent = local.ready ? 'Not ready' : 'Ready';
        $('lobby-primary').disabled = $('lobby-secondary').disabled = local.ready;
        $('start-match').hidden = !session.host;
        const full = snapshot.players.length === snapshot.capacity;
        const allReady = full && snapshot.players.every(player => player.ready);
        $('start-match').disabled = !allReady;
        $('start-reason').textContent = !full ? `Waiting for ${snapshot.capacity - snapshot.players.length} more player(s).`
          : !allReady ? 'Waiting for everyone to mark Ready.' : session.host ? 'Everyone is ready.' : 'Waiting for the host to start.';
        $('ready-button').disabled = net.pending.some(action => action.kind === 'ready');
        $('combat-state').textContent = local.hp <= 0 ? 'ELIMINATED' : local.protectionRemaining > 0 ? 'SPAWN PROTECTION'
          : snapshot.phase === 'countdown' ? 'GET READY' : snapshot.phase === 'intermission' ? 'NEXT ROUND SHORTLY' : '';
      }
      if (this.lastPhase === 'waiting' && snapshot?.phase === 'countdown') {
        this.playSession = true;
        this.show('battle');
        $('start').textContent = 'Click to enter battle';
      }
      if ($('info-dialog').open && $('info-title').textContent === 'Scoreboard') this.fillScores($('info-content'),snapshot);
      this.lastPhase = snapshot?.phase;
    } else if (this.previousSession) {
      this.stop();
      this.playSession = false;
      this.closeInfo();
      for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
      this.show('home');
      $('status').textContent='Ready to play';
      if (!this.intentionalLeave) {
        $('connection-message').textContent = net.message;
        $('connection-rejoin').hidden = this.previousSession.host;
        $('connection-dialog').showModal();
      }
    }
    this.previousSession = session;
    this.intentionalLeave = false;
  }
}
