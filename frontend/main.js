// ========================================
// JIIT Community Hub - Main JavaScript
// ========================================

const API_BASE = 'http://127.0.0.1:8000';

let currentUser = null;
let communities = [];
let events = [];
let notifications = [];
let recruitmentResults = [];

const loginSection      = document.getElementById('login-section');
const dashboardSection  = document.getElementById('dashboard-section');
const navbar            = document.getElementById('navbar');
const loginForm         = document.getElementById('login-form');
const loginAlert        = document.getElementById('login-alert');
const emailInput        = document.getElementById('email');
const passwordInput     = document.getElementById('password');
const emailHint         = document.getElementById('email-hint');
const togglePasswordBtn = document.getElementById('toggle-password');
const userAvatar        = document.getElementById('user-avatar');
const userDropdown      = document.getElementById('user-dropdown');
const logoutBtn         = document.getElementById('logout-btn');
const joinModal         = document.getElementById('join-modal');
const closeModalBtn     = document.getElementById('close-modal');
const joinForm          = document.getElementById('join-form');
const notifBtn          = document.getElementById('notif-btn');
const notifDropdown     = document.getElementById('notif-dropdown');
const notifBadge        = document.getElementById('notif-badge');
const notifList         = document.getElementById('notif-list');
const notifMarkAll      = document.getElementById('notif-mark-all');

// ========================================
// CUSTOM CURSOR
// ========================================

const cursorDot  = document.getElementById('cursor-dot');
const cursorRing = document.getElementById('cursor-ring');
let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX; mouseY = e.clientY;
    cursorDot.style.left = mouseX + 'px';
    cursorDot.style.top  = mouseY + 'px';
});

function animateRing() {
    ringX += (mouseX - ringX) * 0.12;
    ringY += (mouseY - ringY) * 0.12;
    cursorRing.style.left = ringX + 'px';
    cursorRing.style.top  = ringY + 'px';
    requestAnimationFrame(animateRing);
}
animateRing();

document.addEventListener('mouseover', (e) => {
    if (e.target.matches('button,a,input,select,textarea,.community-card,.event-card,.glass-card,.btn-join,.btn-delete,.btn-primary,.notif-item,.dropdown-item')) {
        document.body.classList.add('cursor-hover');
    }
});
document.addEventListener('mouseout', (e) => {
    if (e.target.matches('button,a,input,select,textarea,.community-card,.event-card,.glass-card,.btn-join,.btn-delete,.btn-primary,.notif-item,.dropdown-item')) {
        document.body.classList.remove('cursor-hover');
    }
});
document.addEventListener('mousedown', () => document.body.classList.add('cursor-click'));
document.addEventListener('mouseup',   () => document.body.classList.remove('cursor-click'));

// ========================================
// LOGIN SOUND
// ========================================

function playLoginSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const playTone = (freq, startTime, duration) => {
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.18, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
            osc.start(startTime); osc.stop(startTime + duration);
        };
        const now = ctx.currentTime;
        playTone(523,  now,        0.18);
        playTone(659,  now + 0.12, 0.18);
        playTone(784,  now + 0.24, 0.28);
        playTone(1047, now + 0.4,  0.35);
    } catch (e) {}
}

// ========================================
// SCROLL ANIMATION
// ========================================

const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
}, { threshold: 0.12 });

function initScrollAnimations() {
    document.querySelectorAll('.animate-on-scroll').forEach(el => scrollObserver.observe(el));
}

// ========================================
// EMAIL VALIDATION
// ========================================

emailInput.addEventListener('input', () => {
    const email = emailInput.value.trim();
    if (email.length === 0) { emailHint.classList.add('hidden'); return; }
    emailHint.classList.remove('hidden');
    if (email.endsWith('@jiit.ac.in')) {
        emailHint.textContent = 'Looks good!';
        emailHint.className = 'input-hint success';
    } else {
        emailHint.textContent = 'Only @jiit.ac.in emails are allowed';
        emailHint.className = 'input-hint error';
    }
});

// ========================================
// PASSWORD TOGGLE
// ========================================

togglePasswordBtn.addEventListener('click', () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    document.getElementById('eye-open').classList.toggle('hidden');
    document.getElementById('eye-closed').classList.toggle('hidden');
});

// ========================================
// LOGIN
// ========================================

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email.endsWith('@jiit.ac.in')) { showAlert(loginAlert, 'Please use your @jiit.ac.in email address', 'error'); return; }

    const btn = loginForm.querySelector('.btn-primary');
    const btnText = btn.querySelector('.btn-text');
    const spinner = btn.querySelector('.spinner');
    btnText.classList.add('hidden'); spinner.classList.remove('hidden'); btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (response.ok && data.success) {
            currentUser = data;
            showAlert(loginAlert, 'Login successful! Loading your dashboard...', 'success');
            playLoginSound();
            setTimeout(() => transitionToDashboard(), 800);
        } else {
            throw new Error(data.detail || 'Invalid email or password');
        }
    } catch (error) {
        showAlert(loginAlert, error.message || 'Login failed. Please try again.', 'error');
    } finally {
        btnText.classList.remove('hidden'); spinner.classList.add('hidden'); btn.disabled = false;
    }
});

// ========================================
// TRANSITION TO DASHBOARD
// ========================================

function transitionToDashboard() {
    loginSection.classList.add('login-exit');
    setTimeout(() => {
        loginSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
        setTimeout(() => {
            dashboardSection.classList.add('dashboard-enter');
            navbar.classList.add('visible');
            initDashboard();
            dashboardSection.scrollIntoView({ behavior: 'smooth' });
        }, 50);
    }, 500);
}

// ========================================
// DASHBOARD INIT
// ========================================

async function initDashboard() {
    document.getElementById('user-name').textContent     = currentUser.name.split(' ')[0];
    document.getElementById('user-initials').textContent = getInitials(currentUser.name);
    const now = new Date();
    document.getElementById('current-date').textContent = now.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

    if (currentUser.role === 'admin') {
        document.querySelector('.admin-link').classList.remove('hidden');
        document.getElementById('admin-section').classList.remove('hidden');
    }

    initScrollAnimations();
    await Promise.all([loadCommunities(), loadEvents(), loadNotifications(), loadRecruitment()]);
    updateBadgeCounts();

    if (currentUser.role === 'admin') {
        populateCommunityDropdown();
        populateEventsTable();
        populateRecruitmentTable();
        initAdminForms();
    }

    setInterval(loadNotifications, 30000);
}

function getInitials(name) { return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2); }

// ========================================
// COMMUNITIES
// ========================================

async function loadCommunities() {
    try { const res = await fetch(`${API_BASE}/communities`); communities = await res.json(); renderCommunities(); }
    catch (e) { console.error('Failed to load communities:', e); }
}

function renderCommunities() {
    const grid = document.getElementById('communities-grid');
    grid.innerHTML = '';
    communities.forEach((community, index) => {
        const card = document.createElement('div');
        card.className = 'community-card glass-card animate-on-scroll';
        card.style.transitionDelay = `${index * 100}ms`;
        const cat = community.category.toLowerCase();
        card.innerHTML = `
            <div class="card-highlight"></div>
            <div class="community-header">
                <h3 class="community-name">${community.name}</h3>
                <span class="category-tag ${cat}">${community.category}</span>
            </div>
            <p class="community-description">${community.description}</p>
            <div class="community-footer">
                <button class="btn-join" data-community-id="${community.id}" data-community-name="${community.name}">Join <span>&rarr;</span></button>
            </div>`;
        grid.appendChild(card);
        scrollObserver.observe(card);
    });
    grid.querySelectorAll('.btn-join').forEach(btn => {
        btn.addEventListener('click', () => openJoinModal(btn.dataset.communityId, btn.dataset.communityName));
    });
    setTimeout(() => apply3DTilt('.community-card'), 100);
}

// ========================================
// EVENTS
// ========================================

async function loadEvents() {
    try { const res = await fetch(`${API_BASE}/events`); events = await res.json(); renderEvents(); }
    catch (e) { console.error('Failed to load events:', e); }
}

function renderEvents() {
    const list = document.getElementById('events-list');
    list.innerHTML = '';
    if (events.length === 0) {
        list.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg><p>No events scheduled yet</p></div>`;
        return;
    }
    events.forEach((event, index) => {
        const card = document.createElement('div');
        card.className = `event-card glass-card status-${event.status}`;
        card.style.animationDelay = `${index * 100}ms`;
        const formattedDate = new Date(event.date).toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
        card.innerHTML = `
            <div class="card-highlight"></div>
            <div class="event-info">
                <h3 class="event-title">${event.title}</h3>
                <div class="event-meta">
                    <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>${formattedDate}</span>
                    <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>${event.timing || 'TBA'}</span>
                    <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>${event.venue || 'TBA'}</span>
                    <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>${event.community_name || 'General'}</span>
                </div>
            </div>
            <span class="event-status ${event.status}">${event.status}</span>`;
        list.appendChild(card);
    });
    setTimeout(() => apply3DTilt('.event-card'), 100);
}

function updateBadgeCounts() {
    document.getElementById('communities-count').textContent = `${communities.length} Communities`;
    document.getElementById('events-count').textContent = `${events.filter(e => e.status === 'upcoming').length} Upcoming Events`;
}

// ========================================
// RECRUITMENT
// ========================================

async function loadRecruitment() {
    try {
        const url = currentUser.role === 'admin' ? `${API_BASE}/recruitment` : `${API_BASE}/recruitment?email=${encodeURIComponent(currentUser.email)}`;
        const res = await fetch(url);
        recruitmentResults = await res.json();
        renderRecruitment();
    } catch (e) { console.error('Failed to load recruitment:', e); }
}

function renderRecruitment() {
    const list = document.getElementById('recruitment-list');
    list.innerHTML = '';
    if (recruitmentResults.length === 0) {
        list.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg><p>No recruitment results yet</p></div>`;
        return;
    }
    recruitmentResults.forEach((result, index) => {
        const card = document.createElement('div');
        card.className = `recruitment-card ${result.status}`;
        card.style.animationDelay = `${index * 80}ms`;
        const expiresDate = new Date(result.expires_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
        const announcedDate = new Date(result.announced_at).toLocaleDateString('en-US', { month:'short', day:'numeric' });
        const statusIcon = result.status === 'selected'
            ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><polyline points="20 6 9 17 4 12"></polyline></svg>`
            : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        const metaText = currentUser.role === 'admin' ? `${result.student_name} &middot; ${result.student_email}` : `Announced ${announcedDate}`;
        card.innerHTML = `
            <div class="recruit-info">
                <div class="recruit-community">${result.community_name}</div>
                <div class="recruit-meta">${metaText}</div>
                <div class="recruit-expires">Visible until ${expiresDate}</div>
            </div>
            <div class="recruit-status-badge ${result.status}">${statusIcon}${result.status === 'selected' ? 'Selected' : 'Not Selected'}</div>`;
        list.appendChild(card);
    });
}

// ========================================
// NOTIFICATIONS
// ========================================

async function loadNotifications() {
    if (!currentUser) return;
    try {
        const res = await fetch(`${API_BASE}/notifications?user_id=${currentUser.id}`);
        notifications = await res.json();
        renderNotifications();
        updateNotifBadge();
    } catch (e) { console.error('Failed to load notifications:', e); }
}

function renderNotifications() {
    if (notifications.length === 0) { notifList.innerHTML = `<div class="notif-empty">No new notifications</div>`; return; }
    notifList.innerHTML = '';
    notifications.forEach(notif => {
        const item = document.createElement('div');
        item.className = `notif-item ${notif.is_read ? '' : 'unread'}`;
        item.dataset.id = notif.id;
        item.innerHTML = `
            <div class="notif-dot ${notif.type}"></div>
            <div class="notif-content">
                <div class="notif-title">${notif.title}</div>
                <div class="notif-message">${notif.message}</div>
                <div class="notif-time">${getTimeAgo(new Date(notif.created_at))}</div>
            </div>`;
        item.addEventListener('click', () => markNotifRead(notif.id, item));
        notifList.appendChild(item);
    });
}

function updateNotifBadge() {
    const unread = notifications.filter(n => !n.is_read).length;
    if (unread > 0) { notifBadge.textContent = unread > 9 ? '9+' : unread; notifBadge.classList.remove('hidden'); }
    else { notifBadge.classList.add('hidden'); }
}

async function markNotifRead(notifId, element) {
    try {
        await fetch(`${API_BASE}/notifications/mark-read`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ notification_id: notifId }) });
        element.classList.remove('unread');
        const notif = notifications.find(n => n.id === notifId);
        if (notif) notif.is_read = 1;
        updateNotifBadge();
    } catch (e) {}
}

notifMarkAll.addEventListener('click', async () => {
    try {
        await fetch(`${API_BASE}/notifications/mark-all-read`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id: currentUser.id }) });
        notifications.forEach(n => n.is_read = 1);
        renderNotifications(); updateNotifBadge();
    } catch (e) {}
});

function getTimeAgo(date) {
    const s = Math.floor((new Date() - date) / 1000);
    if (s < 60)    return 'Just now';
    if (s < 3600)  return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
}

notifBtn.addEventListener('click', (e) => { e.stopPropagation(); notifDropdown.classList.toggle('hidden'); userDropdown.classList.add('hidden'); });

// ========================================
// USER DROPDOWN & LOGOUT
// ========================================

userAvatar.addEventListener('click', (e) => { e.stopPropagation(); userDropdown.classList.toggle('hidden'); notifDropdown.classList.add('hidden'); });
document.addEventListener('click', () => { userDropdown.classList.add('hidden'); notifDropdown.classList.add('hidden'); });

logoutBtn.addEventListener('click', () => {
    currentUser = null; communities = []; events = []; notifications = []; recruitmentResults = [];
    dashboardSection.classList.remove('dashboard-enter'); dashboardSection.classList.add('hidden');
    navbar.classList.remove('visible');
    loginSection.classList.remove('login-exit', 'hidden');
    loginForm.reset(); emailHint.classList.add('hidden'); loginAlert.classList.add('hidden');
    initScrollAnimations();
});

// ========================================
// JOIN MODAL
// ========================================

function openJoinModal(communityId, communityName) {
    document.getElementById('join-community-id').value = communityId;
    document.getElementById('modal-community-name').textContent = communityName;
    joinForm.reset();
    document.getElementById('join-form-container').classList.remove('hidden');
    document.getElementById('join-success').classList.add('hidden');
    joinModal.classList.remove('hidden');
}

closeModalBtn.addEventListener('click', closeJoinModal);
joinModal.querySelector('.modal-overlay').addEventListener('click', closeJoinModal);
function closeJoinModal() { joinModal.classList.add('hidden'); }

joinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = joinForm.querySelector('.btn-primary');
    const btnText = btn.querySelector('.btn-text'); const spinner = btn.querySelector('.spinner');
    btnText.classList.add('hidden'); spinner.classList.remove('hidden'); btn.disabled = true;
    const formData = {
        community_id:  parseInt(document.getElementById('join-community-id').value),
        full_name:     document.getElementById('join-name').value,
        enrollment_no: document.getElementById('join-enrollment').value,
        branch:        document.getElementById('join-branch').value,
        semester:      parseInt(document.getElementById('join-semester').value),
        reason:        document.getElementById('join-reason').value
    };
    try {
        const res = await fetch(`${API_BASE}/join-request`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(formData) });
        const data = await res.json();
        if (res.ok && data.success) {
            document.getElementById('join-form-container').classList.add('hidden');
            document.getElementById('join-success').classList.remove('hidden');
            setTimeout(closeJoinModal, 3000);
        } else { throw new Error(data.detail || 'Failed to submit request'); }
    } catch (error) { alert(error.message || 'Failed to submit. Please try again.'); }
    finally { btnText.classList.remove('hidden'); spinner.classList.add('hidden'); btn.disabled = false; }
});

// ========================================
// ADMIN FUNCTIONS
// ========================================

function populateCommunityDropdown() {
    ['event-community','recruit-community'].forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        select.innerHTML = '<option value="">Select community</option>';
        communities.forEach(c => { const opt = document.createElement('option'); opt.value = c.id; opt.textContent = c.name; select.appendChild(opt); });
    });
}

function populateEventsTable() {
    const tbody = document.getElementById('events-table-body');
    tbody.innerHTML = '';
    events.forEach((event, index) => {
        const tr = document.createElement('tr');
        tr.style.animationDelay = `${index * 50}ms`; tr.dataset.eventId = event.id;
        const d = new Date(event.date).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
        tr.innerHTML = `<td>${event.title}</td><td>${d}</td><td>${event.timing||'TBA'}</td><td>${event.venue||'TBA'}</td><td>${event.community_name||'-'}</td><td><span class="event-status ${event.status}">${event.status}</span></td><td><button class="btn-delete" data-event-id="${event.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button></td>`;
        tbody.appendChild(tr);
    });
    tbody.querySelectorAll('.btn-delete').forEach(btn => btn.addEventListener('click', () => deleteEvent(btn.dataset.eventId)));
}

function populateRecruitmentTable() {
    const tbody = document.getElementById('recruitment-table-body');
    if (!tbody) return; tbody.innerHTML = '';
    if (recruitmentResults.length === 0) { tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px">No active results</td></tr>`; return; }
    recruitmentResults.forEach((result, index) => {
        const tr = document.createElement('tr');
        tr.style.animationDelay = `${index * 50}ms`; tr.dataset.recruitId = result.id;
        const exp = new Date(result.expires_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
        tr.innerHTML = `<td>${result.student_name}</td><td style="font-size:0.8rem;color:var(--text-muted)">${result.student_email}</td><td>${result.community_name}</td><td><span class="event-status ${result.status==='selected'?'ongoing':'past'}">${result.status}</span></td><td style="font-size:0.8rem;color:var(--text-muted)">${exp}</td><td><button class="btn-delete" data-recruit-id="${result.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button></td>`;
        tbody.appendChild(tr);
    });
    tbody.querySelectorAll('.btn-delete').forEach(btn => btn.addEventListener('click', () => deleteRecruitment(btn.dataset.recruitId)));
}

function initAdminForms() {
    const addEventForm = document.getElementById('add-event-form');
    if (addEventForm) {
        addEventForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn=addEventForm.querySelector('.btn-primary'); const btnText=btn.querySelector('.btn-text'); const spinner=btn.querySelector('.spinner'); const alertEl=document.getElementById('add-event-alert');
            btnText.classList.add('hidden'); spinner.classList.remove('hidden'); btn.disabled=true;
            const formData = { title:document.getElementById('event-title').value, date:document.getElementById('event-date').value, timing:document.getElementById('event-timing').value, venue:document.getElementById('event-venue').value, community_id:parseInt(document.getElementById('event-community').value), status:document.getElementById('event-status').value };
            try {
                const res=await fetch(`${API_BASE}/add-event`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(formData)});
                const data=await res.json();
                if(res.ok&&data.success){showAlert(alertEl,'Event added successfully!','success');addEventForm.reset();await loadEvents();populateEventsTable();updateBadgeCounts();setTimeout(()=>alertEl.classList.add('hidden'),3000);}
                else{throw new Error(data.detail||'Failed to add event');}
            } catch(error){showAlert(alertEl,error.message||'Failed to add event','error');}
            finally{btnText.classList.remove('hidden');spinner.classList.add('hidden');btn.disabled=false;}
        });
    }

    const addRecruitForm = document.getElementById('add-recruitment-form');
    if (addRecruitForm) {
        addRecruitForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn=addRecruitForm.querySelector('.btn-primary'); const btnText=btn.querySelector('.btn-text'); const spinner=btn.querySelector('.spinner'); const alertEl=document.getElementById('add-recruitment-alert');
            btnText.classList.add('hidden'); spinner.classList.remove('hidden'); btn.disabled=true;
            const formData = { student_name:document.getElementById('recruit-name').value, student_email:document.getElementById('recruit-email').value, community_id:parseInt(document.getElementById('recruit-community').value), status:document.getElementById('recruit-status').value, expires_days:parseInt(document.getElementById('recruit-expires').value) };
            try {
                const res=await fetch(`${API_BASE}/recruitment`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(formData)});
                const data=await res.json();
                if(res.ok&&data.success){showAlert(alertEl,'Result announced and notification sent!','success');addRecruitForm.reset();await loadRecruitment();populateRecruitmentTable();setTimeout(()=>alertEl.classList.add('hidden'),3000);}
                else{throw new Error(data.detail||'Failed to add result');}
            } catch(error){showAlert(alertEl,error.message||'Failed to add result','error');}
            finally{btnText.classList.remove('hidden');spinner.classList.add('hidden');btn.disabled=false;}
        });
    }

    const sendNotifForm = document.getElementById('send-notif-form');
    if (sendNotifForm) {
        sendNotifForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn=sendNotifForm.querySelector('.btn-primary'); const btnText=btn.querySelector('.btn-text'); const spinner=btn.querySelector('.spinner'); const alertEl=document.getElementById('send-notif-alert');
            btnText.classList.add('hidden'); spinner.classList.remove('hidden'); btn.disabled=true;
            const formData = { user_id:currentUser.id, role:document.getElementById('notif-role').value, title:document.getElementById('notif-title-input').value, message:document.getElementById('notif-message-input').value, type:document.getElementById('notif-type').value, expires_days:parseInt(document.getElementById('notif-expires').value) };
            try {
                const res=await fetch(`${API_BASE}/notifications`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(formData)});
                const data=await res.json();
                if(res.ok&&data.success){showAlert(alertEl,'Notification sent!','success');sendNotifForm.reset();setTimeout(()=>alertEl.classList.add('hidden'),3000);}
                else{throw new Error(data.detail||'Failed to send');}
            } catch(error){showAlert(alertEl,error.message||'Failed to send','error');}
            finally{btnText.classList.remove('hidden');spinner.classList.add('hidden');btn.disabled=false;}
        });
    }
}

async function deleteEvent(eventId) {
    if (!confirm('Delete this event?')) return;
    const row = document.querySelector(`tr[data-event-id="${eventId}"]`);
    if (row) row.classList.add('row-exit');
    try {
        const res=await fetch(`${API_BASE}/delete-event`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:parseInt(eventId)})});
        const data=await res.json();
        if(res.ok&&data.success){setTimeout(async()=>{await loadEvents();populateEventsTable();updateBadgeCounts();},300);}
        else{if(row)row.classList.remove('row-exit');}
    } catch(e){if(row)row.classList.remove('row-exit');alert('Failed to delete event');}
}

async function deleteRecruitment(recruitId) {
    if (!confirm('Remove this recruitment result?')) return;
    const row = document.querySelector(`tr[data-recruit-id="${recruitId}"]`);
    if (row) row.classList.add('row-exit');
    try {
        const res=await fetch(`${API_BASE}/recruitment/${recruitId}`,{method:'DELETE'});
        const data=await res.json();
        if(res.ok&&data.success){setTimeout(async()=>{await loadRecruitment();populateRecruitmentTable();renderRecruitment();},300);}
        else{if(row)row.classList.remove('row-exit');}
    } catch(e){if(row)row.classList.remove('row-exit');alert('Failed to delete result');}
}

// ========================================
// 3D TILT
// ========================================

function apply3DTilt(selector) {
    document.querySelectorAll(selector).forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect=card.getBoundingClientRect();
            const rotateX=((e.clientY-rect.top-rect.height/2)/rect.height*2)*-7;
            const rotateY=((e.clientX-rect.left-rect.width/2)/rect.width*2)*7;
            card.style.transform=`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(8px)`;
        });
        card.addEventListener('mouseleave', () => { card.style.transition='transform 0.5s ease'; card.style.transform='perspective(1000px) rotateX(0) rotateY(0) translateZ(0)'; });
        card.addEventListener('mouseenter', () => { card.style.transition='transform 0.1s ease'; });
    });
}

// ========================================
// UTILITY
// ========================================

function showAlert(element, message, type) { element.textContent=message; element.className=`alert ${type}`; element.classList.remove('hidden'); }

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        const href=link.getAttribute('href');
        if(href&&href.startsWith('#')){e.preventDefault();const target=document.querySelector(href);if(target)target.scrollIntoView({behavior:'smooth'});document.querySelectorAll('.nav-link').forEach(l=>l.classList.remove('active'));link.classList.add('active');}
    });
});

document.addEventListener('DOMContentLoaded', () => { initScrollAnimations(); });