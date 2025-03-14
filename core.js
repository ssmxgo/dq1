/****************************************
 * SweetAlert2 Helper
 ****************************************/
const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  background: '#333',
  color: '#fff'
});
function showToast(msg, icon = 'success') {
  toast.fire({ icon, title: msg });
}
function showModal(opts) {
  return Swal.fire(Object.assign({
    background: '#fff',
    color: '#000',
    confirmButtonText: 'OK'
  }, opts));
}

/****************************************
 * キーボード操作 Mix-in
 ****************************************/
const KeyOperationMixin = {
  methods: {
    handleKeyDown(e) {
      switch (e.key) {
        case 'ArrowUp':    this.move && this.move('up'); break;
        case 'ArrowDown':  this.move && this.move('down'); break;
        case 'ArrowLeft':  this.move && this.move('left'); break;
        case 'ArrowRight': this.move && this.move('right'); break;
        case 'p': case 'P': if (this.emitPropertyCheck) this.emitPropertyCheck(); break;
        case 'z': case 'Z': if (this.physicalAttack) this.physicalAttack(); break;
        case 'x': case 'X': if (this.openSpellMenu)  this.openSpellMenu(); break;
        case 'c': case 'C': if (this.runAway)        this.runAway(); break;
        case 'v': case 'V': if (this.openItemMenu)   this.openItemMenu(); break;
      }
    }
  },
  mounted() {
    window.addEventListener('keydown', this.handleKeyDown);
  },
  unmounted() {
    window.removeEventListener('keydown', this.handleKeyDown);
  }
};

/****************************************
 * FieldMap
 ****************************************/
const FieldMap = {
  mixins: [KeyOperationMixin],
  props: ['initialHeroX', 'initialHeroY', 'heroStatus'],
  template: `
    <div>
      <h2 class="text-center mb-2">フィールドマップ(30×30)</h2>
      <div class="map-container" :style="containerStyle">
        <div v-for="row in viewportH" :key="row" style="display:flex;">
          <div v-for="col in viewportW" :key="col"
               :class="['tile', tileType(row-1,col-1), isHeroTile(row-1,col-1)?'hero':'']">
            {{ isHeroTile(row-1,col-1)? '勇者': tileLabel(row-1,col-1) }}
          </div>
        </div>
        <div v-if="message" class="message-window">{{message}}</div>
      </div>
      <div class="control-panel">
        <!-- 上段 -->
        <div class="control-row">
          <button class="control-btn bg-blue-500 rounded-full"
                  @touchstart.prevent="move('up')" @mousedown.prevent="move('up')">↑</button>
        </div>
        <!-- 中段 (左/プロパティ/右) -->
        <div class="control-row">
          <button class="control-btn bg-blue-500 rounded-full"
                  @touchstart.prevent="move('left')" @mousedown.prevent="move('left')">←</button>
          <button class="control-btn bg-purple-500 rounded-full"
                  @touchstart.prevent="emitPropertyCheck" @mousedown.prevent="emitPropertyCheck">Ｐ</button>
          <button class="control-btn bg-blue-500 rounded-full"
                  @touchstart.prevent="move('right')" @mousedown.prevent="move('right')">→</button>
        </div>
        <!-- 下段 -->
        <div class="control-row">
          <button class="control-btn bg-blue-500 rounded-full"
                  @touchstart.prevent="move('down')" @mousedown.prevent="move('down')">↓</button>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      worldW: defaultGameData.settings.fieldMap.width,
      worldH: defaultGameData.settings.fieldMap.height,
      viewportW: defaultGameData.settings.fieldMap.viewportWidth,
      viewportH: defaultGameData.settings.fieldMap.viewportHeight,
      heroX: this.initialHeroX || 0,
      heroY: this.initialHeroY || 0,
      mapData: [],
      message: '',
      isFrozen: false,
      dbCheckTimer: null
    }
  },
  computed: {
    offsetX() {
      let ox = this.heroX - Math.floor(this.viewportW / 2);
      if (ox < 0) ox = 0;
      if (ox > this.worldW - this.viewportW) ox = this.worldW - this.viewportW;
      return ox;
    },
    offsetY() {
      let oy = this.heroY - Math.floor(this.viewportH / 2);
      if (oy < 0) oy = 0;
      if (oy > this.worldH - this.viewportH) oy = this.worldW - this.viewportH;
      return oy;
    },
    containerStyle() {
      if (this.heroStatus && this.heroStatus.maxHp) {
        return { border: (this.heroStatus.hp / this.heroStatus.maxHp <= 0.25 ? '4px solid red' : '4px solid #fff') };
      }
      return { border: '4px solid #fff' };
    }
  },
  methods: {
    initializeMap() {
      const fieldObj = defaultGameData.fields.find(f => f.id === 'field001');
      if (fieldObj && fieldObj.layout && fieldObj.layout.length > 0) {
        this.mapData = fieldObj.layout;
        console.log('Loaded field001 layout from DB data');
      } else {
        let data = [];
        for (let y = 0; y < this.worldH; y++) {
          for (let x = 0; x < this.worldW; x++) {
            let tile = { x, y, type: 'grass', label: '' };
            const fixedTiles = defaultGameData.settings.fieldMap.fixedTiles;
            let isFixed = false;
            for (let f of fixedTiles) {
              if (x === f.x && y === f.y) {
                tile.type = f.type;
                tile.label = f.label;
                isFixed = true;
                break;
              }
            }
            if (!isFixed) {
              const p = defaultGameData.settings.fieldMap.randomTileProb;
              const r = Math.random();
              if (r < p.grass) tile.type = 'grass';
              else if (r < p.road) tile.type = 'road';
              else if (r < p.forest) tile.type = 'forest';
              else if (r < p.mountain) tile.type = 'mountain';
              else tile.type = 'water';
            }
            data.push(tile);
          }
        }
        this.mapData = data;
        fieldObj.layout = data;
        saveGameData(defaultGameData);
        console.log('Generated new field001 layout & saved to DB');
      }
    },
    tileIndex(r, c) {
      let wy = this.offsetY + r;
      let wx = this.offsetX + c;
      return wy * this.worldW + wx;
    },
    tileAt(r, c) {
      const idx = this.tileIndex(r, c);
      return this.mapData[idx];
    },
    tileType(r, c) {
      const t = this.tileAt(r, c);
      return t ? t.type : 'unknown';
    },
    tileLabel(r, c) {
      const t = this.tileAt(r, c);
      return t ? t.label : '???';
    },
    isHeroTile(r, c) {
      let wy = this.offsetY + r;
      let wx = this.offsetX + c;
      return (wx === this.heroX && wy === this.heroY);
    },
    showMessage(msg) {
      this.message = msg;
      setTimeout(() => { this.message = ''; }, 2000);
    },
    move(dir) {
      // 宿屋などのポップアップ表示中は移動させない
      if (this.$root.isPopupActive) return;

      // レベルアップ時のトースト表示は移動制御しない(= isPopupActiveを使わない)
      if (this.isFrozen) return;

      let nx = this.heroX, ny = this.heroY;
      if (dir === 'up' && ny > 0) ny--;
      if (dir === 'down' && ny < this.worldH - 1) ny++;
      if (dir === 'left' && nx > 0) nx--;
      if (dir === 'right' && nx < this.worldW - 1) nx++;

      const tile = this.mapData[ny * this.worldW + nx];
      if (!tile) return;

      if (tile.type === 'mountain' || tile.type === 'water') {
        this.showMessage('そこは通れない！');
        return;
      }
      if (tile.type === 'townGate') {
        this.heroX = nx; this.heroY = ny;
        this.$emit('update-field-position', { x: nx, y: ny });
        this.$emit('switch-scene', 'town', { x: nx, y: ny });
        return;
      }
      this.heroX = nx; this.heroY = ny;
      this.$emit('update-field-position', { x: nx, y: ny });

      // エンカウント判定
      if (tile.type === 'grass') {
        if (this.$root.repelCount && this.$root.repelCount > 0) {
          // トヘロス効果中: エンカウント抑制
        } else {
          const encounterRate = defaultGameData.settings.fieldMap.encounterRate;
          if (Math.random() < encounterRate) {
            this.isFrozen = true;
            let enemy = this.generateEnemy();
            this.showMessage(`${enemy.name}があらわれた！`);
            setTimeout(() => {
              this.$emit('switch-scene', 'battle', { x: nx, y: ny, enemy });
            }, 700);
          }
        }
      }
      if (tile.type === 'npc') {
        this.showMessage('「こんにちは、旅の人！」');
      }
    },
    generateEnemy() {
      const baseEnemies = defaultGameData.enemyData;
      let e = JSON.parse(JSON.stringify(
        baseEnemies[Math.floor(Math.random() * baseEnemies.length)]
      ));
      e.maxHp = e.hp;
      e.speed = 5;
      e.canUseMagic = (e.magicAttack > 0);
      return e;
    },
    emitPropertyCheck() {
      this.$emit('check-properties');
    },
    waitForDBThenInit() {
      if (dbLoaded) {
        this.initializeMap();
      } else {
        this.dbCheckTimer = setInterval(() => {
          if (dbLoaded) {
            clearInterval(this.dbCheckTimer);
            this.dbCheckTimer = null;
            this.initializeMap();
          }
        }, 100);
      }
    }
  },
  mounted() {
    this.waitForDBThenInit();
  },
  unmounted() {
    if (this.dbCheckTimer) {
      clearInterval(this.dbCheckTimer);
    }
  }
};

/****************************************
 * TownMap
 ****************************************/
const TownMap = {
  mixins: [KeyOperationMixin],
  props: ['fieldEntrance', 'heroStatus'],
  template: `
    <div>
      <h2 class="text-center mb-2">町 (10×10)</h2>
      <div class="map-container" :style="containerStyle">
        <div v-for="row in height" :key="row" style="display:flex;">
          <div v-for="col in width" :key="col"
               :class="['tile', tileType(row-1,col-1), isHeroTile(row-1,col-1)?'hero':'']"
               @touchstart.prevent="onTileTouch(tileAt(row-1,col-1))"
               @mousedown.prevent="onTileTouch(tileAt(row-1,col-1))">
            {{ isHeroTile(row-1,col-1)?'勇者': tileLabel(row-1,col-1) }}
          </div>
        </div>
        <div v-if="message" class="message-window">{{message}}</div>
      </div>
      <div class="control-panel">
        <div class="control-row">
          <button class="control-btn bg-blue-500 rounded-full"
                  @touchstart.prevent="move('up')" @mousedown.prevent="move('up')">↑</button>
        </div>
        <div class="control-row">
          <button class="control-btn bg-blue-500 rounded-full"
                  @touchstart.prevent="move('left')" @mousedown.prevent="move('left')">←</button>
          <button class="control-btn bg-purple-500 rounded-full"
                  @touchstart.prevent="emitPropertyCheck" @mousedown.prevent="emitPropertyCheck">Ｐ</button>
          <button class="control-btn bg-blue-500 rounded-full"
                  @touchstart.prevent="move('right')" @mousedown.prevent="move('right')">→</button>
        </div>
        <div class="control-row">
          <button class="control-btn bg-blue-500 rounded-full"
                  @touchstart.prevent="move('down')" @mousedown.prevent="move('down')">↓</button>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      width: defaultGameData.settings.townMap.width,
      height: defaultGameData.settings.townMap.height,
      heroX: 5,
      heroY: 5,
      message: '',
      townData: []
    }
  },
  computed: {
    containerStyle() {
      if (this.heroStatus && this.heroStatus.maxHp) {
        return { border: (this.heroStatus.hp / this.heroStatus.maxHp <= 0.25 ? '4px solid red' : '4px solid #fff') };
      }
      return { border: '4px solid #fff' };
    }
  },
  methods: {
    initTown() {
      if (defaultGameData.townMap && defaultGameData.townMap.layout && defaultGameData.townMap.layout.length > 0) {
        this.townData = defaultGameData.townMap.layout;
      } else {
        let arr = [];
        for (let y = 0; y < this.height; y++) {
          for (let x = 0; x < this.width; x++) {
            let tile = { x, y, type: 'pavement', label: '' };
            if (y === 0 || y === this.height - 1 || x === 0 || x === this.width - 1) {
              tile.type = defaultGameData.settings.townMap.boundaryTile;
            }
            arr.push(tile);
          }
        }
        const buildings = defaultGameData.settings.townMap.buildings;
        buildings.forEach(b => {
          const idx = b.y * this.width + b.x;
          if (arr[idx]) {
            arr[idx].type = b.type;
            arr[idx].label = b.label;
          }
        });
        this.townData = arr;
        defaultGameData.townMap.layout = arr;
        saveGameData(defaultGameData);
        console.log('Generated new town layout & saved to DB');
      }
    },
    tileIndex(r, c) {
      return (r * this.width + c);
    },
    tileAt(r, c) {
      const idx = this.tileIndex(r, c);
      return this.townData[idx];
    },
    tileType(r, c) {
      const t = this.tileAt(r, c);
      return t ? t.type : 'unknown';
    },
    tileLabel(r, c) {
      const t = this.tileAt(r, c);
      return t ? t.label : '???';
    },
    isHeroTile(r, c) {
      return (r === this.heroY && c === this.heroX);
    },
    showMessage(msg) {
      this.message = msg;
      setTimeout(() => { this.message = ''; }, 2000);
    },
    move(dir) {
      // 宿屋などのポップアップ表示中は移動不可
      if (this.$root.isPopupActive) return;

      let nx = this.heroX, ny = this.heroY;
      if (dir === 'up') ny--;
      if (dir === 'down') ny++;
      if (dir === 'left') nx--;
      if (dir === 'right') nx++;
      if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) {
        this.$emit('switch-scene', 'field', this.fieldEntrance);
        return;
      }
      const tile = this.townData[ny * this.width + nx];
      if (tile && tile.type === 'exit') {
        this.$emit('switch-scene', 'field', this.fieldEntrance);
        return;
      }
      if (tile && tile.type === 'building') {
        this.showMessage(tile.label + 'に入る');
        this.openShop(tile.label);
        return;
      }
      this.heroX = nx; this.heroY = ny;
      if (tile && tile.type === 'npc') {
        this.showMessage('「こんにちは、旅の人！」');
      }
    },
    openShop(label) {
      // ポップアップ表示開始 → 移動抑止
      this.$root.isPopupActive = true;
      let items = [];
      let shopName = label;

      if (label === '宿屋') {
        showModal({
          title: '宿屋',
          text: 'HPとMPが最大まで回復します',
          showCancelButton: true,
          cancelButtonText: '閉じる',
          confirmButtonText: '回復する'
        }).then(res => {
          this.$root.isPopupActive = false; // 閉じたので再び移動許可
          if (res.isConfirmed) {
            this.$emit("update-status", { type: "setHP", amount: this.heroStatus.maxHp });
            this.heroStatus.mp = this.heroStatus.maxMp;
            showToast('HPとMPが全回復しました', 'success');
          }
        });
        return;
      }
      else if (label === '武器屋') {
        items = defaultGameData.itemData.weapons;
      }
      else if (label === '防具屋') {
        items = defaultGameData.itemData.armors;
      }
      else if (label === '道具屋') {
        items = defaultGameData.itemData.consumables;
      }

      let html = `<p style="font-size:12px;">${shopName}の品揃え:</p>`;
      items.forEach((it, i) => {
        html += `<button id="shopitem-${i}" style="display:block;margin:3px 0;padding:5px;background:#222;color:#fff;font-size:12px;">
          ${it.name} (${it.price}G)
        </button>`;
      });
      // 道具屋：売却
      if (label === '道具屋' && this.heroStatus.inventory.length > 0) {
        html += `<hr><p style="font-size:12px;">売却(半額):</p>`;
        this.heroStatus.inventory.forEach((invItem, idx) => {
          const sellPrice = Math.floor(invItem.price / 2);
          html += `<button id="sell-${idx}" style="display:block;margin:3px 0;padding:5px;background:#2a2a2a;color:#fff;font-size:12px;">
            売却:${invItem.name} (${sellPrice}G)
          </button>`;
        });
      }
      showModal({
        title: shopName,
        html,
        showCancelButton: true,
        cancelButtonText: '閉じる',
        confirmButtonText: '何もしない'
      }).then(() => {
        // ポップアップ閉じた
        this.$root.isPopupActive = false;
      });
      setTimeout(() => {
        items.forEach((it, i) => {
          const btn = document.getElementById(`shopitem-${i}`);
          if (btn) {
            btn.addEventListener('click', () => {
              this.$emit("update-status", { type: "buy", item: it });
              showToast(`${it.name}を購入しました`);
              Swal.close();
            });
          }
        });
        if (label === '道具屋') {
          this.heroStatus.inventory.forEach((invItem, idx) => {
            const sellBtn = document.getElementById(`sell-${idx}`);
            if (sellBtn) {
              sellBtn.addEventListener('click', () => {
                this.$emit("update-status", { type: "sell", item: invItem });
                showToast(`${invItem.name}を売却しました`, 'info');
                Swal.close();
              });
            }
          });
        }
      }, 200);
    },
    onTileTouch(tile) {
      if (this.$root.isPopupActive) return;
      if (tile && tile.type === 'npc') {
        this.showMessage('「こんにちは、旅の人！」');
      }
      else if (tile && tile.type === 'building') {
        this.showMessage(tile.label + 'に入る');
        this.openShop(tile.label);
      }
    },
    emitPropertyCheck() {
      this.$emit('check-properties');
    }
  },
  mounted() {
    this.initTown();
  }
};

/****************************************
 * BattleScene
 ****************************************/
const BattleScene = {
  mixins: [KeyOperationMixin],
  props: ['initialHeroHP', 'enemy', 'heroStatus', 'calcFinalAttack', 'calcFinalDefense'],
  template: `
    <div class="battle-container" :style="containerStyle">
      <div class="battle-top">
        <div class="battle-left">
          <h3>勇者</h3>
          <p>HP: {{ heroHP }} / {{ heroMaxHP }}</p>
          <p>MP: {{ heroStatus.mp }} / {{ heroStatus.maxMp }}</p>
          <p>攻: {{ calcFinalAttack(heroStatus) }}</p>
          <p>守: {{ calcFinalDefense(heroStatus) }}</p>
          <p>LV: {{ heroStatus.level }}</p>
          <p>EXP: {{ heroStatus.exp }}</p>
        </div>
        <div class="battle-center">
          <div style="width:120px; height:120px; background-color:#444; display:flex; align-items:center; justify-content:center;">
            <img v-if="!enemyImgError && enemy.id" :src="'/images/enemies/' + enemy.id + '.png'" @error="enemyImgError = true" style="max-width:100%; max-height:100%;">
            <span v-if="enemyImgError || !enemy.id">{{ enemy.name }}</span>
          </div>
        </div>
        <div class="battle-right">
          <h3>敵</h3>
          <p>HP: {{ enemyHP }} / {{ enemyMaxHP }}</p>
          <p>攻: {{ enemy.attack }}</p>
          <p>守: {{ enemy.defense }}</p>
          <p>魔攻: {{ enemy.magicAttack }}</p>
          <p>魔防: {{ enemy.magicDefense }}</p>
        </div>
      </div>
      <div class="battle-footer">
        <div class="message-area">
          <p v-for="(line,i) in battleMessageLines" :key="i">{{ line }}</p>
        </div>
        <div class="actions">
          <button id="attack-button" class="bg-blue-500 rounded"
                  @touchstart.prevent="physicalAttack" @mousedown.prevent="physicalAttack">攻撃</button>
          <button class="bg-indigo-500 rounded"
                  @touchstart.prevent="openSpellMenu" @mousedown.prevent="openSpellMenu">魔法</button>
          <button class="bg-yellow-500 rounded"
                  @touchstart.prevent="runAway" @mousedown.prevent="runAway">逃げる</button>
          <button class="bg-green-500 rounded"
                  @touchstart.prevent="openItemMenu" @mousedown.prevent="openItemMenu">道具</button>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      heroHP: this.initialHeroHP,
      heroMaxHP: this.heroStatus.maxHp,
      enemyHP: this.enemy.hp,
      enemyMaxHP: this.enemy.maxHp,
      messageHistory: [],
      enemyImgError: false,
      enemyAsleep: false,
      enemySilenced: false
    }
  },
  computed: {
    battleMessageLines() {
      return this.messageHistory.slice(-5).reverse();
    },
    containerStyle() {
      if (this.heroStatus && this.heroStatus.maxHp) {
        return { border: (this.heroStatus.hp / this.heroStatus.maxHp <= 0.25 ? '4px solid red' : '4px solid #fff') };
      }
      return { border: '4px solid #fff' };
    },
    heroSpells() {
      return this.heroStatus.learnedSpells
        .map(spellName => defaultGameData.magicData.find(m => m.name === spellName))
        .filter(m => m && (m.usableIn === 'battle' || m.usableIn === 'both'));
    }
  },
  methods: {
    appendMsg(line) {
      this.messageHistory.push(line);
    },
    physicalAttack() {
      if (this.enemyHP <= 0) return;
      const dmg = Math.max(0, this.calcFinalAttack(this.heroStatus) - this.enemy.defense);
      this.enemyHP -= dmg;
      this.appendMsg(`勇者の攻撃！ ${this.enemy.name}に${dmg}ダメージ`);
      this.checkEnemyStatus();
    },
    checkEnemyStatus() {
      if (this.enemyHP <= 0) {
        this.enemyHP = 0;
        this.appendMsg(`${this.enemy.name}を倒した！`);
        setTimeout(() => {
          showToast(`${this.enemy.name}を倒した！`);
          const r = this.enemy.reward || { gold: 0, exp: 0 };
          this.$emit('update-status', { type: 'reward', reward: r });
          this.$emit('switch-scene', 'field');
        }, 800);
      } else {
        setTimeout(() => { this.enemyTurn(); }, 800);
      }
    },
    enemyTurn() {
      if (this.enemyAsleep) {
        this.appendMsg(`${this.enemy.name}は眠っている…`);
        if (Math.random() < 0.3) {
          this.enemyAsleep = false;
          this.appendMsg(`${this.enemy.name}は目を覚ました！`);
        }
        return;
      }
      let dmg = 0;
      if (this.enemy.canUseMagic && !this.enemySilenced && Math.random() < 0.5) {
        dmg = Math.max(0, this.enemy.magicAttack);
        this.appendMsg(`敵の魔法攻撃！ 勇者に${dmg}ダメージ`);
      } else {
        dmg = Math.max(0, this.enemy.attack - Math.floor(this.calcFinalDefense(this.heroStatus) / 2));
        this.appendMsg(`敵の攻撃！ 勇者に${dmg}ダメージ`);
      }
      this.heroHP -= dmg;
      this.heroStatus.hp = this.heroHP;
      if (this.heroHP <= 0) {
        this.heroHP = 0;
        this.appendMsg('勇者は倒れた…');
        setTimeout(() => {
          this.$emit('update-status', { type: 'setHP', amount: this.heroMaxHP });
          this.$emit('switch-scene', 'field');
        }, 800);
      }
    },
    openSpellMenu() {
      if (this.heroSpells.length === 0) {
        showToast('使用できる魔法がない', 'info');
        return;
      }
      let html = `<p style="font-size:12px;">使う魔法を選択：</p>`;
      this.heroSpells.forEach((sp, i) => {
        html += `<button id="spell-${i}" style="display:block;width:100%;margin:3px 0;padding:5px;background:#222;color:#fff;font-size:12px;">
          ${sp.name}(MP:${sp.mpCost})
        </button>`;
      });
      showModal({
        title: '呪文',
        html,
        showCancelButton: true,
        cancelButtonText: 'やめる',
        confirmButtonText: '何もしない'
      });
      setTimeout(() => {
        this.heroSpells.forEach((sp, i) => {
          const btn = document.getElementById(`spell-${i}`);
          if (btn) {
            btn.addEventListener('click', () => {
              this.castSpell(sp);
              Swal.close();
            });
          }
        });
      }, 200);
    },
    castSpell(sp) {
      if (this.heroStatus.mp < sp.mpCost) {
        showToast('MPが足りません！', 'error');
        return;
      }
      this.heroStatus.mp -= sp.mpCost;
      this.appendMsg(`勇者は${sp.name}を唱えた！`);
      if (sp.type === 'attack') {
        let dmg = Math.max(0, sp.power - (this.enemy.magicDefense || 0));
        this.enemyHP -= dmg;
        this.appendMsg(`${this.enemy.name}に${dmg}のダメージ！`);
        this.checkEnemyStatus();
      }
      else if (sp.type === 'heal') {
        let rec = sp.power;
        this.heroHP = Math.min(this.heroHP + rec, this.heroMaxHP);
        this.heroStatus.hp = this.heroHP;
        this.appendMsg(`HPが${rec}回復！`);
      }
      else if (sp.type === 'sleep') {
        this.appendMsg(`${this.enemy.name}は眠りに落ちた…`);
        this.enemyAsleep = true;
      }
      else if (sp.type === 'silence') {
        this.appendMsg(`${this.enemy.name}の呪文を封じた！`);
        this.enemySilenced = true;
      }
      else {
        this.appendMsg(`しかし何も起こらなかった…`);
      }
    },
    runAway() {
      if (Math.random() < 0.5) {
        showToast('逃走成功', 'info');
        this.$emit('switch-scene', 'field');
      } else {
        this.appendMsg('逃走失敗！');
        setTimeout(() => { this.enemyTurn(); }, 600);
      }
    },
    openItemMenu() {
      if (this.heroStatus.inventory.length === 0) {
        showToast('道具はない', 'info');
        return;
      }
      let html = `<p style="font-size:12px;">使う道具を選択：</p>`;
      this.heroStatus.inventory.forEach((it, i) => {
        html += `<button id="item-${i}" style="display:block;width:100%;margin:3px 0;padding:5px;background:#444;color:#fff;font-size:12px;">
          ${it.name} (効果:${it.effect||"?"})
        </button>`;
      });
      showModal({
        title: '道具',
        html,
        showCancelButton: true,
        cancelButtonText: 'やめる',
        confirmButtonText: '何もしない'
      });
      setTimeout(() => {
        this.heroStatus.inventory.forEach((it, i) => {
          const btn = document.getElementById(`item-${i}`);
          if (btn) {
            btn.addEventListener('click', () => {
              this.useItem(it);
              Swal.close();
            });
          }
        });
      }, 200);
    },
    useItem(it) {
      if (it.effect === 'smallHeal') {
        this.heroHP = Math.min(this.heroHP + 10, this.heroMaxHP);
        this.heroStatus.hp = this.heroHP;
        this.appendMsg(`${it.name}を使用しHP+10`);
      } else if (it.effect === 'curePoison') {
        this.appendMsg('毒が治った！');
      }
      const idx = this.heroStatus.inventory.findIndex(x => x.name === it.name);
      if (idx >= 0) this.heroStatus.inventory.splice(idx, 1);
      setTimeout(() => { this.enemyTurn(); }, 500);
    }
  },
  mounted() {
    this.$nextTick(() => {
      const atkBtn = document.getElementById('attack-button');
      if (atkBtn) atkBtn.focus();
    });
  }
};

/****************************************
 * RootApp
 ****************************************/
const RootApp = {
  template: `
    <div>
      <component :is="currentSceneComp"
        @switch-scene="switchScene"
        @update-status="updateStatus"
        @check-properties="checkProperties"
        @update-field-position="updateFieldPos"
        :initial-hero-x="fieldPos.x"
        :initial-hero-y="fieldPos.y"
        :field-entrance="fieldEntrance"
        :hero-status="heroStatus"
        :enemy="currentEnemy"
        :calc-final-attack="calcFinalAttack"
        :calc-final-defense="calcFinalDefense"
      ></component>
    </div>
  `,
  data() {
    return {
      currentScene: 'field',
      fieldEntrance: { x: 0, y: 9 },
      fieldPos: { x: 0, y: 9 },
      // 初期ステータスをsettingsからコピー
      heroStatus: JSON.parse(JSON.stringify(defaultGameData.settings.heroInitialStatus)),
      currentEnemy: null,
      // トヘロスで弱い敵を寄せ付けない残り回数
      repelCount: 0,
      // 宿屋などポップアップ中のフラグ
      isPopupActive: false
    }
  },
  computed: {
    currentSceneComp() {
      if (this.currentScene === 'field') return FieldMap;
      else if (this.currentScene === 'town') return TownMap;
      else if (this.currentScene === 'battle') {
        return {
          render: () => Vue.h(BattleScene, {
            initialHeroHP: this.heroStatus.hp,
            enemy: this.currentEnemy,
            heroStatus: this.heroStatus,
            calcFinalAttack: this.calcFinalAttack,
            calcFinalDefense: this.calcFinalDefense
          })
        }
      }
    }
  },
  methods: {
    switchScene(scene, payload) {
      if (scene === 'field') {
        // 戦闘後の座標維持
      } else if (scene === 'town') {
        if (payload) this.fieldPos = payload;
      } else if (scene === 'battle') {
        if (payload && payload.enemy) {
          this.currentEnemy = payload.enemy;
        }
      }
      this.currentScene = scene;
    },
    updateFieldPos(pos) {
      this.fieldPos = pos;
    },
    updateStatus(payload) {
      if (payload.type === 'buy') {
        const it = payload.item;
        if (this.heroStatus.gold >= it.price) {
          this.heroStatus.gold -= it.price;
          if (it.type === 'consumable') {
            this.heroStatus.inventory.push(it);
          } else if (it.type === 'weapon') {
            if (this.heroStatus.weapon) {
              this.heroStatus.inventory.push(this.heroStatus.weapon);
            }
            this.heroStatus.weapon = it;
            showToast(`${it.name} (武器) を装備しました`, 'info');
          } else if (it.type === 'armor') {
            if (this.heroStatus.armor) {
              this.heroStatus.inventory.push(this.heroStatus.armor);
            }
            this.heroStatus.armor = it;
            showToast(`${it.name} (防具) を装備しました`, 'info');
          }
          showToast(`${it.name}を購入しました`);
        } else {
          showModal({ icon: 'error', text: 'お金が足りません' });
        }
      }
      else if (payload.type === 'sell') {
        const it = payload.item;
        if (it.type === 'weapon' && this.heroStatus.weapon && this.heroStatus.weapon.name === it.name) {
          this.heroStatus.weapon = null;
        } else if (it.type === 'armor' && this.heroStatus.armor && this.heroStatus.armor.name === it.name) {
          this.heroStatus.armor = null;
        }
        const idx = this.heroStatus.inventory.findIndex(x => x.name === it.name);
        if (idx >= 0) this.heroStatus.inventory.splice(idx, 1);
        const sp = Math.floor(it.price / 2);
        this.heroStatus.gold += sp;
        showToast(`${it.name}を売却しました`, 'info');
      }
      else if (payload.type === 'reward') {
        const r = payload.reward;
        this.heroStatus.gold += (r.gold || 0);
        this.heroStatus.exp += (r.exp || 0);
        this.checkLevelUp();
      }
      else if (payload.type === 'setHP') {
        this.heroStatus.hp = payload.amount;
      }
    },
    checkLevelUp() {
      const table = defaultGameData.levelUpCriteria;
      let leveledUp = false;
      let messages = [];
      // Lv1→2 のとき: table[0]=5
      while (this.heroStatus.level <= table.length && this.heroStatus.exp >= table[this.heroStatus.level - 1]) {
        this.heroStatus.level++;
        const inc = { hp: 5, mp: 3, attack: 2, defense: 1 };
        this.heroStatus.maxHp += inc.hp;
        // この2行を有効にするとレベルアップと同時にHP/MP全回復
        // this.heroStatus.hp = this.heroStatus.maxHp;
        // this.heroStatus.mp = this.heroStatus.maxMp;
        this.heroStatus.attack += inc.attack;
        this.heroStatus.defense += inc.defense;

        messages.push(`レベル${this.heroStatus.level}に上がりました！ [HP+${inc.hp}, MP+${inc.mp}, 攻+${inc.attack}, 守+${inc.defense}]`);

        // レベルに応じて呪文を覚える
        const spellsToLearn = defaultGameData.levelUpLearnableSpells[String(this.heroStatus.level)] || [];
        spellsToLearn.forEach(spellName => {
          if (!this.heroStatus.learnedSpells.includes(spellName)) {
            this.heroStatus.learnedSpells.push(spellName);
            messages.push(`新たに『${spellName}』を習得しました！`);
          }
        });

        leveledUp = true;
      }
      if (this.heroStatus.level <= table.length) {
        // 例えば Lv5 -> table[4], etc
        this.heroStatus.nextExp = table[this.heroStatus.level - 1];
      } else {
        this.heroStatus.nextExp = '-';
      }
      if (leveledUp) {
        // レベルアップ時はトーストを使う → 移動制御しない
        messages.forEach(m => showToast(m, 'info'));
      }
    },
    calcFinalAttack(hero) {
      let wAtk = hero.weapon ? hero.weapon.power : 0;
      return hero.attack + wAtk;
    },
    calcFinalDefense(hero) {
      let aDef = hero.armor ? hero.armor.power : 0;
      return hero.defense + aDef;
    },
    checkProperties() {
      const w = this.heroStatus.weapon ? this.heroStatus.weapon.name : '(なし)';
      const a = this.heroStatus.armor ? this.heroStatus.armor.name : '(なし)';
      const inv = (this.heroStatus.inventory.length > 0) ?
        this.heroStatus.inventory.map(i => i.name).join(', ') : '(なし)';

      let html = `<div style="position:relative;">
  <pre>
  【勇者ステータス】
  LV: ${this.heroStatus.level}
  EXP: ${this.heroStatus.exp} (次: ${this.heroStatus.nextExp || "?"})
  HP: ${this.heroStatus.hp}/${this.heroStatus.maxHp}
  MP: ${this.heroStatus.mp}/${this.heroStatus.maxMp}
  攻: ${this.calcFinalAttack(this.heroStatus)}
  守: ${this.calcFinalDefense(this.heroStatus)}
  Gold: ${this.heroStatus.gold}
  呪文: ${this.heroStatus.learnedSpells.join(", ") || "なし"}
  所持品: ${inv}
  </pre>
  <button id="resetGame"
    style="position:absolute; top:5px; right:5px; font-size: 9px; background:#900; color:#fff; border:none; border-radius:4px; padding:2px 4px; cursor:pointer;">
  リセット
  </button>
  </div>`;

      html += `<div class="modal-section">
  <h3 style="font-size:14px;">装備</h3>
  <p>武器: ${w}</p>
  <p>防具: ${a}</p>
  </div>`;

      const equippable = this.heroStatus.inventory.filter(it => it.type === 'weapon' || it.type === 'armor');
      if (equippable.length > 0) {
        html += `<div class="modal-section">
  <h3 style="font-size:14px;">装備変更(在庫)</h3>`;
        equippable.forEach((it, idx) => {
          html += `<button id="equip-${idx}" style="display:block;width:100%;margin:3px 0;padding:5px;background:#222;color:#fff;font-size:12px;">
  装備: ${it.name} (${it.type})
  </button>`;
        });
        html += `</div>`;
      }
      const consumables = this.heroStatus.inventory.filter(it => it.type === 'consumable');
      if (consumables.length > 0) {
        html += `<div class="modal-section">
  <h3 style="font-size:14px;">道具使用</h3>`;
        consumables.forEach((it, idx) => {
          html += `<button id="use-${idx}" style="display:block;width:100%;margin:3px 0;padding:5px;background:#444;color:#fff;font-size:12px;">
  使用: ${it.name} (効果:${it.effect})
  </button>`;
        });
        html += `</div>`;
      }
      if (this.currentScene !== 'battle') {
        // バトル外で使える魔法を表示
        // 回復魔法(heal)かつ usableIn=== 'both' or 'field'
        const spells = this.heroStatus.learnedSpells
          .map(spName => defaultGameData.magicData.find(m => m.name === spName))
          .filter(m => m && m.type === 'heal' && (m.usableIn === 'field' || m.usableIn === 'both'));
        if (spells.length > 0) {
          html += `<div class="modal-section">
  <h3 style="font-size:14px;">魔法使用(回復)</h3>`;
          spells.forEach((sp, idx) => {
            html += `<button id="spellprop-${idx}" style="display:block;width:100%;margin:3px 0;padding:5px;background:#666;color:#fff;font-size:12px;">
  発動: ${sp.name} (MP:${sp.mpCost})
  </button>`;
          });
          html += `</div>`;
        }
        // フィールド専用魔法(ルーラ・リレミト etc.)
        const fieldSpells = this.heroStatus.learnedSpells
          .map(spName => defaultGameData.magicData.find(m => m.name === spName))
          .filter(m => m && m.usableIn === 'field');
        if (fieldSpells.length > 0) {
          html += `<div class="modal-section">
  <h3 style="font-size:14px;">魔法使用(フィールド)</h3>`;
          fieldSpells.forEach((sp, idx) => {
            html += `<button id="fieldspell-${idx}" style="display:block;width:100%;margin:3px 0;padding:5px;background:#666;color:#fff;font-size:12px;">
  発動: ${sp.name} (MP:${sp.mpCost})
  </button>`;
          });
          html += `</div>`;
        }
      }
      showModal({
        title: '勇者のステータス',
        html,
        showCancelButton: true,
        cancelButtonText: '閉じる'
      }).then(() => { });
      setTimeout(() => {
        const resetBtn = document.getElementById('resetGame');
        if (resetBtn) {
          resetBtn.addEventListener('click', () => {
            resetGameData();
            Swal.close();
          });
        }
        equippable.forEach((it, idx) => {
          const btn = document.getElementById(`equip-${idx}`);
          if (btn) {
            btn.addEventListener('click', () => {
              this.equipItemFromProperties(it);
              Swal.close();
            });
          }
        });
        consumables.forEach((it, idx) => {
          const btn = document.getElementById(`use-${idx}`);
          if (btn) {
            btn.addEventListener('click', () => {
              this.useItemFromProperties(it);
              Swal.close();
            });
          }
        });
        if (this.currentScene !== 'battle') {
          const spells = this.heroStatus.learnedSpells
            .map(spName => defaultGameData.magicData.find(m => m.name === spName))
            .filter(m => m && m.type === 'heal' && (m.usableIn === 'field' || m.usableIn === 'both'));
          spells.forEach((sp, idx) => {
            const btn = document.getElementById(`spellprop-${idx}`);
            if (btn) {
              btn.addEventListener('click', () => {
                this.castSpellFromProperties(sp);
                Swal.close();
              });
            }
          });
          const fieldSpells = this.heroStatus.learnedSpells
            .map(spName => defaultGameData.magicData.find(m => m.name === spName))
            .filter(m => m && m.usableIn === 'field');
          fieldSpells.forEach((sp, idx) => {
            const btn = document.getElementById(`fieldspell-${idx}`);
            if (btn) {
              btn.addEventListener('click', () => {
                this.castFieldSpell(sp);
                Swal.close();
              });
            }
          });
        }
      }, 200);
    },
    equipItemFromProperties(item) {
      if (item.type === 'weapon') {
        if (this.heroStatus.weapon) {
          this.heroStatus.inventory.push(this.heroStatus.weapon);
        }
        const idx = this.heroStatus.inventory.findIndex(x => x.name === item.name);
        if (idx >= 0) this.heroStatus.inventory.splice(idx, 1);
        this.heroStatus.weapon = item;
        showToast(`${item.name} (武器) を装備しました`, 'info');
      }
      else if (item.type === 'armor') {
        if (this.heroStatus.armor) {
          this.heroStatus.inventory.push(this.heroStatus.armor);
        }
        const idx = this.heroStatus.inventory.findIndex(x => x.name === item.name);
        if (idx >= 0) this.heroStatus.inventory.splice(idx, 1);
        this.heroStatus.armor = item;
        showToast(`${item.name} (防具) を装備しました`, 'info');
      }
    },
    useItemFromProperties(item) {
      if (item.effect === 'smallHeal') {
        this.heroStatus.hp = Math.min(this.heroStatus.hp + 10, this.heroStatus.maxHp);
        showToast(`${item.name}でHPが10回復しました`, 'success');
      }
      else if (item.effect === 'curePoison') {
        showToast(`${item.name}で毒が治りました`, 'success');
      }
      else if (item.effect === 'returnTown') {
        showToast(`${item.name}で町に帰還します`, 'info');
        setTimeout(() => { this.switchScene('town', this.fieldEntrance); }, 1500);
        return;
      }
      const idx = this.heroStatus.inventory.findIndex(x => x.name === item.name);
      if (idx >= 0) this.heroStatus.inventory.splice(idx, 1);
    },
    castSpellFromProperties(sp) {
      if (this.heroStatus.mp < sp.mpCost) {
        showToast('MPが足りません！', 'error');
        return;
      }
      this.heroStatus.mp -= sp.mpCost;
      if (sp.type === 'heal') {
        let rec = sp.power;
        this.heroStatus.hp = Math.min(this.heroStatus.hp + rec, this.heroStatus.maxHp);
        showToast(`${sp.name}でHPが${rec}回復しました`, 'success');
      }
      else {
        showToast(`${sp.name}は戦闘専用か、未実装の効果です`, 'info');
      }
    },
    castFieldSpell(sp) {
      if (this.heroStatus.mp < sp.mpCost) {
        showToast('MPが足りません！', 'error');
        return;
      }
      this.heroStatus.mp -= sp.mpCost;
      if (sp.type === 'light') {
        showToast("レミーラ：洞窟を明るくする（デモ）", 'info');
      }
      else if (sp.type === 'warp') {
        showToast("ルーラ発動：町へワープ（デモ）", 'info');
        setTimeout(() => { this.switchScene('town', { x:3, y:3 }); }, 1200);
      }
      else if (sp.type === 'repel') {
        showToast("トヘロス発動：弱い敵を寄せ付けない（デモ）", 'info');
        this.repelCount = 10;
      }
      else if (sp.type === 'escape') {
        showToast("リレミト発動：ダンジョン脱出（デモ）", 'info');
        setTimeout(() => { this.switchScene('field', { x:this.fieldPos.x, y:this.fieldPos.y }); }, 1200);
      }
      else {
        showToast("何も起こらなかった…", 'info');
      }
    }
  },
  mounted() {
    window.addEventListener('keydown', e => {
      if (e.key === ' ') {
        this.checkProperties();
      }
    });
  }
};

Vue.createApp(RootApp).mount('#app');
