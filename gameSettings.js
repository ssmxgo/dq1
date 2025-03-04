/****************************************
 * IndexedDB 初期化 および ゲーム設定
 ****************************************/
const DB_NAME = 'GameDB';
const DB_VERSION = 2;
const STORE_NAME = 'gameData';
let dbInstance = null;
// DB読み込み完了フラグ
let dbLoaded = false;

function initDB() {
  const req = indexedDB.open(DB_NAME, DB_VERSION);
  req.onupgradeneeded = function(e) {
    const db = e.target.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    }
  };
  req.onsuccess = function(e) {
    dbInstance = e.target.result;
    loadGameData();
  };
  req.onerror = function(e) {
    console.error('IndexedDB error', e);
  };
}

// defaultGameData に fields と townMap の器を含める
const defaultGameData = {
  id: 'default',
  enemyData: [
    { id: "enemy001", name: "スライム", hp: 10, attack: 2, defense: 1, magicAttack: 0, magicDefense: 0,
      reward: { gold: 30, exp: 10, item: null } },
    { id: "enemy002", name: "ドラキー", hp: 15, attack: 3, defense: 2, magicAttack: 0, magicDefense: 1,
      reward: { gold: 50, exp: 15, item: null } },
    { id: "enemy003", name: "キメラ", hp: 20, attack: 5, defense: 2, magicAttack: 4, magicDefense: 2,
      reward: { gold: 80, exp: 20, item: "羽" } }
  ],
  itemData: {
    consumables: [
      { id: "item001", name: "回復薬", price: 10, effect: "smallHeal", type: "consumable" },
      { id: "item002", name: "毒消し草", price: 8, effect: "curePoison", type: "consumable" }
    ],
    weapons: [
      { id: "item003", name: "こんぼう", price: 50, power: 2, type: "weapon" },
      { id: "item004", name: "どうのつるぎ", price: 180, power: 8, type: "weapon" }
    ],
    armors: [
      { id: "item005", name: "ぬののふく", price: 20, power: 2, type: "armor" },
      { id: "item006", name: "かわのよろい", price: 70, power: 4, type: "armor" }
    ]
  },
  magicData: [
    { name: "ホイミ", mpCost: 3, type: "heal", power: 12 },
    { name: "ギラ", mpCost: 3, type: "attack", power: 7 },
    { name: "ベギラマ", mpCost: 5, type: "attack", power: 15 }
  ],
  levelUpCriteria: [10, 30, 60, 100, 150],
  // フィールド/町データの器(拡張可)
  fields: [
    {
      id: "field001", name: "草原", type: "野外",
      layout: [],  // 初回起動時に作る
      terrainProperties: {
        grass: { passable: true, encounterRate: 0.1 },
        forest: { passable: true, encounterRate: 0.3 },
        mountain: { passable: false, encounterRate: 0 },
        desert: { passable: true, encounterRate: 0.05 },
        rock: { passable: false, encounterRate: 0 }
      },
      enemySettings: {
        availableEnemies: ["スライム", "ドラキー"],
        baseEncounterRate: 0.1
      },
      events: []
    }
  ],
  // 町マップ（10×10）の器
  townMap: {
    id: "town001",
    name: "町",
    layout: []  // 初回起動時に作る
  }
};

function loadGameData() {
  if (!dbInstance) return;
  const tx = dbInstance.transaction([STORE_NAME], 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const req = store.get('default');
  req.onsuccess = function(e) {
    if (e.target.result) {
      Object.assign(defaultGameData, e.target.result);
      console.log('IndexedDBからゲームデータをロードしました');
    } else {
      saveGameData(defaultGameData);
      console.log('デフォルトのゲームデータをIndexedDBに保存しました');
    }
    // DB読み込み完了フラグをtrueに
    dbLoaded = true;
  };
}

function saveGameData(data) {
  if (!dbInstance) return;
  const tx = dbInstance.transaction([STORE_NAME], 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.put(data);
}

function resetGameData() {
  if (!dbInstance) return;
  const tx = dbInstance.transaction([STORE_NAME], 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const clearReq = store.clear();
  clearReq.onsuccess = function() {
    showToast('ゲームデータをリセットしました', 'info');
    setTimeout(() => location.reload(), 1000);
  };
}

initDB();
