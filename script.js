const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxvTY31n5fhLql94Z5OoTcn67sUDO4n0f-Y1tHJljbj6zWIwyq87MpHxNNBsAtWz0M6/exec";
const BANNED_KEYWORDS = [
    'ขอเงิน', 'โอนเงิน', 'บริจาค', 'รับบริจาค', 'ขอบริจาค', 'ทำบุญ', 'ร่วมบุญ', 'เลขบัญชี',
    'PromptPay', 'พร้อมเพย์', 'วอเลท', 'Wallet', 'ขอกู้', 'ขอยืม', 'ช่วยเหลือเงิน', 'เดือดร้อนเรื่องเงิน',
    'การเมือง', 'พรรค', 'เลือกตั้ง', 'รัฐบาล', 'นายก', 'ประท้วง', 'สถาบัน', 'ประชาธิปไตย', 'เผด็จการ'
];

let allPosts = [];
let latestPostId = null;
let currentPostId = null;
let activeFilter = 'all';
let selectedCat = 'พลังบวก';

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => { });
}

function toast(msg) {
    const container = document.getElementById('toastContainer');
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerText = msg;
    container.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3000);
}

function navigateToFeed() {
    window.location.hash = '';
    showView('feed');
}

function showView(view) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active', 'fade-in'));
    const active = document.getElementById(view + 'View');
    if (active) active.classList.add('active', 'fade-in');
    window.scrollTo(0, 0);
}

window.onhashchange = handleDeepLink;
function handleDeepLink() {
    const hash = window.location.hash.substring(1);
    if (hash && hash.length > 5) {
        if (allPosts.length > 0) showDetail(hash);
        else setTimeout(handleDeepLink, 500);
    } else { showView('feed'); }
}

const themeBtn = document.getElementById('themeToggle');
const applyTheme = (isDark) => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    themeBtn.innerText = isDark ? 'Lively Dark' : 'Lively Light';
    localStorage.setItem('v27-theme', isDark ? 'dark' : 'light');
}
if (themeBtn) {
    themeBtn.onclick = () => applyTheme(document.documentElement.getAttribute('data-theme') !== 'dark');
}
if (localStorage.getItem('v27-theme') === 'dark') applyTheme(true);

function openAbout() {
    showView('about');
}
function openAction() {
    document.getElementById('modalOverlay').style.display = 'flex';
    document.getElementById('actionModal').style.display = 'block';
}
function closeModals() {
    document.getElementById('modalOverlay').style.display = 'none';
    document.getElementById('actionModal').style.display = 'none';
    document.getElementById('shareModal').style.display = 'none';
}

async function fetchPosts(isPolling = false) {
    if (allPosts.length === 0) {
        const container = document.getElementById('postsContainer');
        if (container) container.innerHTML = Array(3).fill('<div class="skeleton"></div>').join('');
    }
    if (SCRIPT_URL === "YOUR_APPS_SCRIPT_URL_HERE") { renderSeed(); return; }
    try {
        console.log("Fetching posts from:", SCRIPT_URL);
        const res = await fetch(SCRIPT_URL);
        const json = await res.json();
        console.log("Response received:", json);
        
        if (json.status === 'success') {
            const newPosts = json.data;
            if (isPolling && newPosts.length > 0 && newPosts[0].ID !== latestPostId) {
                const banner = document.getElementById('newPostBanner');
                if (banner) banner.style.display = 'block';
            }
            allPosts = newPosts;
            latestPostId = allPosts.length > 0 ? allPosts[0].ID : null;
            const energyMeter = document.getElementById('energyMeter');
            if (energyMeter) energyMeter.innerText = `🌲 ${json.totalSparks || 0} Sparks`;
            updateUI();
            if (!isPolling) handleDeepLink();
        } else {
            console.error("Backend returned error:", json.message);
        }
    } catch (e) { 
        console.error("Fetch failed:", e);
        if (!isPolling) toast("ไม่สามารถโหลดข้อมูลได้ โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ตครับ 🌿");
    }
}

setInterval(() => fetchPosts(true), 60000);

function renderSeed() {
    allPosts = [
        { ID: "s1", Content: "ลองใช้กฎ 20-20-20 เมื่อจ้องจอนานๆ: ช่วยถนอมสายตาได้เยี่ยมเลย!", Category: "สุขภาพ", SparkCount: 42, missions: [{ reply: "ขอบคุณครับ", mission: "จะลองทำตามดู" }] },
        { ID: "s2", Content: "การทำงานเป็นรอบ 25 นาที (Pomodoro) ช่วยให้โฟกัสได้ดีขึ้นและลดความเครียดสะสม", Category: "การเรียนรู้", SparkCount: 15, missions: [] },
        { ID: "s3", Content: "วันนี้ลองหยุดฟังเสียงหัวใจตัวเองดูบ้างนะ... คุณทำดีที่สุดแล้ว :)", Category: "พลังบวก", SparkCount: 88, missions: [{ reply: "ใจฟูมากครับ", mission: "จะแชร์ต่อ" }] }
    ];
    const energyMeter = document.getElementById('energyMeter');
    if (energyMeter) energyMeter.innerText = "🌲 145 Sparks (Simulation)";
    updateUI();
    handleDeepLink();
}

function updateUI() {
    const searchInput = document.getElementById('searchInput');
    const q = searchInput ? searchInput.value.toLowerCase() : "";
    const filtered = allPosts.filter(p => (activeFilter === 'all' || p.Category === activeFilter) && p.Content.toLowerCase().includes(q));
    renderList(filtered);
}

function renderList(posts) {
    const cont = document.getElementById('postsContainer');
    if (!cont) return;
    cont.innerHTML = posts.length ? '' : '<div class="loader" style="text-align:center; padding:50px; opacity:0.5;">ไม่มีเมล็ดพันธุ์ในหมวดนี้... เริ่มวางคนแรกสิ!</div>';
    posts.forEach(p => {
        const url = window.location.href.split('#')[0] + '#' + p.ID;
        const text = `ลองอ่านเรื่องนี้ดูครับ: "${p.Content.substring(0, 50)}..."`;
        const el = document.createElement('div');
        el.className = 'card fade-in';
        el.onclick = () => { window.location.hash = p.ID; showDetail(p.ID); };
        el.innerHTML = `
            ${p.Author === 'Care Share' ? '<div class="admin-badge">Care Share 🌿</div>' : ''}
            <div class="card-category">${p.Category}</div>
            <div class="card-content">${p.Content}</div>
            <div class="card-footer">
                <div class="meta-text">รับส่งต่อแล้ว ${p.SparkCount} ครั้ง</div>
                <div class="card-actions">
                    <div class="share-cluster">
                        <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}" target="_blank" class="btn-mini-share fb" title="Share FB">🔵</a>
                        <a href="https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}" target="_blank" class="btn-mini-share line" title="Share Line">🟢</a>
                        <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}" target="_blank" class="btn-mini-share x" title="Share X">⚫</a>
                        <div class="btn-mini-share link" onclick="event.stopPropagation(); copyDirectLink('${url}')" title="Copy Link">🔗</div>
                    </div>
                    <button class="btn-action btn-baton" onclick="event.stopPropagation(); showDetail('${p.ID}'); setTimeout(openAction, 100)">🤝 รับไม้ต่อ</button>
                </div>
            </div>
        `;
        cont.appendChild(el);
    });
}

function showDetail(id) {
    const p = allPosts.find(x => x.ID === id);
    if (!p) { navigateToFeed(); return; }
    currentPostId = id;

    const url = window.location.href.split('#')[0] + '#' + id;
    const text = `ลองอ่านเรื่องนี้ดูครับ: "${p.Content.substring(0, 50)}..."`;

    const detailContent = document.getElementById('detailContent');
    if (detailContent) {
        detailContent.innerHTML = `
            ${p.Author === 'Care Share' ? '<div class="admin-badge" style="font-size:0.8rem; padding:6px 15px; margin-bottom:20px;">Care Share 🌿</div>' : ''}
            <div class="card-category">${p.Category}</div>
            <div class="detail-title">${p.Content}</div>
            <div class="share-cluster" style="margin-top:40px; justify-content:center; border-top:1px solid var(--border); padding-top:30px;">
                <span style="font-size:0.8rem; font-weight:700; color:var(--text-sub); margin-right:10px; text-transform:uppercase; letter-spacing:1px;">ส่งต่อปัญญา:</span>
                <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}" target="_blank" class="btn-mini-share fb" title="Share FB">🔵</a>
                <a href="https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}" target="_blank" class="btn-mini-share line" title="Share Line">🟢</a>
                <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}" target="_blank" class="btn-mini-share x" title="Share X">⚫</a>
                <div class="btn-mini-share link" onclick="copyDirectLink('${url}')" title="Copy Link">🔗</div>
            </div>
        `;
    }

    const mList = document.getElementById('missionsList');
    if (mList) {
        mList.innerHTML = p.missions.length ? '' : '<div class="loader" style="text-align:center; opacity:0.5; margin-top:20px;">มาร่วมรดน้ำความดีคนแรกสิ!</div>';
        p.missions.slice().reverse().forEach(m => {
            const item = document.createElement('div');
            item.className = 'mission-item fade-in';
            item.innerHTML = `${m.reply ? `<span class="m-reply">" ${m.reply} "</span>` : ''}<div class="m-action">${m.mission}</div>`;
            mList.appendChild(item);
        });
    }
    showView('detail');
}

const postBtn = document.getElementById('postBtn');
if (postBtn) {
    postBtn.onclick = async () => {
        const postInput = document.getElementById('postInput');
        const val = postInput ? postInput.value.trim() : "";
        if (!val) return;

        postBtn.disabled = true;
        postBtn.style.opacity = '0.5';
        toast("กำลังปรึกษาผู้พิทักษ์สวน... โปรดรอสักครู่นะครับ 🌿");

        try {
            if (SCRIPT_URL !== "YOUR_APPS_SCRIPT_URL_HERE") {
                const res = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    mode: 'cors',
                    body: JSON.stringify({ 
                        action: 'addPost', 
                        content: val, 
                        category: selectedCat,
                        author: '' 
                    })
                });
                const result = await res.json();

                if (result.status === 'success') {
                    toast("เมล็ดพันธุ์ของคุณถูกวางลงในสวนแล้ว! ✨");
                    if (postInput) postInput.value = '';
                    fetchPosts();
                    showView('feed');
                } else {
                    console.warn("Post rejected:", result.message);
                    const wisdomText = document.getElementById('wisdomText');
                    if (wisdomText) wisdomText.innerText = result.message || "เมล็ดพันธุ์นี้อาจยังไม่เหมาะกับสวนในตอนนี้ ลองแชร์เรื่องราวอื่นดูไหมครับ?";
                    showView('wisdom');
                }
            } else {
                toast("จำลองการโพสต์สำเร็จ");
                if (postInput) postInput.value = '';
                fetchPosts();
            }
        } catch (err) {
            console.error(err);
            toast("ระบบขัดข้องชั่วคราว ลองกลับมาแชร์ใหม่ภายหลังนะครับ 🌿");
        } finally {
            postBtn.disabled = false;
            postBtn.style.opacity = '1';
        }
    }
}

const fabChain = document.getElementById('fabChain');
if (fabChain) {
    fabChain.onclick = openAction;
}

const confirmBtn = document.getElementById('confirmBtn');
if (confirmBtn) {
    confirmBtn.onclick = async () => {
        const rInput = document.getElementById('replyText');
        const kInput = document.getElementById('kindnessText');
        const r = rInput ? rInput.value.trim() : "";
        const k = kInput ? kInput.value.trim() : "";
        if (!k) { toast("บอกเราหน่อยว่าจะทำความดีอะไร :)"); return; }
        confirmBtn.disabled = true;
        confirmBtn.style.opacity = '0.5';

        try {
            if (SCRIPT_URL !== "YOUR_APPS_SCRIPT_URL_HERE") {
                await fetch(SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    body: JSON.stringify({ action: 'incrementSpark', id: currentPostId, replyText: r, missionText: k })
                });
                closeModals();
                toast("ความดีของคุณงอกงามแล้ว 🌿");
                setTimeout(fetchPosts, 3000);
                setTimeout(() => showDetail(currentPostId), 3500);
            } else {
                toast("จำลองการรับไม้ต่อสำเร็จ");
                closeModals();
                fetchPosts();
            }
        } catch (err) {
            console.error(err);
            toast("ไม่สามารถเชื่อมต่อได้");
        } finally {
            confirmBtn.disabled = false;
            confirmBtn.style.opacity = '1';
        }
    }
}

let pendingShareUrl = "";
function shareIt(id) {
    const p = allPosts.find(x => x.ID === id);
    const url = window.location.href.split('#')[0] + '#' + id;
    const text = p ? `ลองอ่านเรื่องนี้ดูครับ: "${p.Content.substring(0, 50)}..."` : "มีความรู้ดีๆ มาฝากครับ";
    pendingShareUrl = url;

    const shareFB = document.getElementById('shareFB');
    const shareLine = document.getElementById('shareLine');
    const shareX = document.getElementById('shareX');
    if (shareFB) shareFB.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    if (shareLine) shareLine.href = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`;
    if (shareX) shareX.href = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;

    const overlay = document.getElementById('modalOverlay');
    const shareModal = document.getElementById('shareModal');
    const actionModal = document.getElementById('actionModal');
    if (overlay) overlay.style.display = 'flex';
    if (shareModal) shareModal.style.display = 'block';
    if (actionModal) actionModal.style.display = 'none';
}

function copyCurrentLink() {
    navigator.clipboard.writeText(pendingShareUrl);
    toast("คัดลอกลิงก์เรียบร้อย 🔗");
    closeModals();
}

function copyDirectLink(url) {
    navigator.clipboard.writeText(url);
    toast("คัดลอกลิงก์เรียบร้อย 🔗");
}

const filters = document.getElementById('filters');
if (filters) {
    filters.onclick = (e) => {
        const b = e.target.closest('.filter-btn'); if (!b) return;
        document.querySelectorAll('.filter-btn').forEach(x => x.classList.remove('active'));
        b.classList.add('active'); activeFilter = b.dataset.cat; updateUI();
    }
}

const catPicker = document.getElementById('catPicker');
if (catPicker) {
    catPicker.onclick = (e) => {
        const s = e.target.closest('.cat-sel'); if (!s) return;
        document.querySelectorAll('.cat-sel').forEach(x => x.classList.remove('active'));
        s.classList.add('active'); selectedCat = s.dataset.cat;
    }
}

const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.oninput = updateUI;
}

fetchPosts();
