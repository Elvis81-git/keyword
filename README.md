# KEYWORD: Neon Typing Clash (打字對決遊戲)

一個極具視覺衝擊力、支援雙人連線與單機挑戰的網頁打字對決遊戲！擁有精美的賽博朋克霓虹風格與毛玻璃（Glassmorphism）介面，內建標準英文字母與**注音符號（大千式鍵盤佈局）**雙語系遊玩模式。

---

## 🎮 遊戲特色

1. **多語系支持**：
   - **英文模式**：掉落英文字母 `A-Z`。
   - **注音模式**：掉落注音符號 `ㄅ` 到 `ㄦ` 以及聲調。畫面提供**鍵盤指引（Keyboard Helper）**，在對應的 QWERTY 實體按鍵上標記注音對照，是學習注音輸入的絕佳工具。
2. **單機模式**：
   - 提供 Easy / Medium / Hard 三種難度。
   - 包含本地積分榜、連擊數（Combo）以及準確度即時統計。
3. **多人對決連線 (Render + Socket.io)**：
   - **雙畫面同步（Split-Screen）**：即時在右側面板看到對手的鍵盤掉落字母、剩餘血量與分數，體驗高強度的對決快感。
   - **連續技懲罰（Streak Accelerator）**：當玩家**連續答對 5 次**未失誤時，會自動傳送重力波給對手，**令對手的字母掉落速度增加 `+15%`（可疊加，最高 3x 速度）**！
   - 提供簡便的房號複製分享功能與伺服器自定義網址。

---

## 🛠️ 本地開發與執行

在本地執行非常簡單，因為後端伺服器已整合了靜態網頁託管：

1. **安裝依賴套件**：
   請在終端機執行：
   ```bash
   npm install
   ```

2. **啟動伺服器**：
   ```bash
   npm start
   ```

3. **開始遊玩**：
   開啟瀏覽器，訪問 `http://localhost:3000`。
   *若要測試多人連線，請開啟兩個瀏覽器視窗（例如一個正常視窗、一個無痕視窗），一邊建立房間，另一邊輸入房間代碼加入即可。*

---

## 🚀 部署教學 (Deployment Guide)

### 1. 部署前端至 GitHub Pages

由於前端是由靜態 HTML/CSS/JS 組成，可以直接推送到 GitHub 並開啟 Pages 功能：

1. 在 GitHub 上建立一個新的儲存庫（Repository），例如 `keyword-game`。
2. 將此專案的所有檔案推送（Push）到儲存庫中。
3. 進入該儲存庫的 **Settings** -> **Pages**。
4. 在 **Build and deployment** 下的 Source 選擇 **Deploy from a branch**。
5. Branch 選擇 `main` (或 `master`)，目錄選擇 `/ (root)`，點擊 **Save**。
6. 稍等一兩分鐘，GitHub 就會為您生成遊戲首頁網址，例如：`https://<您的帳號>.github.io/keyword-game/`。

---

### 2. 部署後端至 Render

多人連線需要執行 Node.js WebSocket 伺服器，可以使用 Render 的免費服務：

1. 登入 [Render 官網](https://render.com/)。
2. 點擊 **New +** 選擇 **Web Service**。
3. 連結您的 GitHub 帳戶並選擇剛才推送的儲存庫。
4. 填寫 Web Service 設定：
   - **Name**: `keyword-typer-backend`（或其他您喜歡的名稱）
   - **Environment**: `Node`
   - **Region**: 建議選擇靠近台灣的區域（如 `Singapore`）
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: 選擇 **Free**
5. 點擊 **Create Web Service**。
6. 部署成功後，Render 會提供一個後端網址（例如 `https://keyword-typer-backend.onrender.com`）。
7. **在遊戲中連接**：
   在您 GitHub Pages 的主選單右下角點擊 **「進階伺服器設定」**，將此 Render 網址填入，即可開始跟全世界的朋友一起玩！
   > [!NOTE]
   > Render 免費方案若 15 分鐘無人連線會進入休眠。首次點擊連線時，可能需要等待約 50 秒供伺服器重新喚醒。畫面上會顯示連線狀態，喚醒後即會轉為「Server Online」。

---

## 📂 檔案結構說明

- [index.html](file:///c:/Users/admin/Downloads/google%20antigravity/KEYWORD/index.html) - 遊戲前端主畫面 (Lobby, Arena, GameOver 面板)
- [style.css](file:///c:/Users/admin/Downloads/google%20antigravity/KEYWORD/style.css) - 精美霓虹風格、玻璃擬態 UI 樣式、粒子爆炸與震動動畫
- [game.js](file:///c:/Users/admin/Downloads/google%20antigravity/KEYWORD/game.js) - 核心遊戲引擎，控制下落物理、輸入比對與分數計算
- [zhuyin.js](file:///c:/Users/admin/Downloads/google%20antigravity/KEYWORD/zhuyin.js) - 大千式注音鍵盤佈局對照資料
- [sound.js](file:///c:/Users/admin/Downloads/google%20antigravity/KEYWORD/sound.js) - 利用 HTML5 Web Audio API 即時合成音效（免除外部資源依賴）
- [multiplayer.js](file:///c:/Users/admin/Downloads/google%20antigravity/KEYWORD/multiplayer.js) - 網路連線客戶端，同步雙方玩家面板與生命值
- [server.js](file:///c:/Users/admin/Downloads/google%20antigravity/KEYWORD/server.js) - Node.js + Express + Socket.io 伺服器
