/* LTRC Demo Site - script.js (MIT Licensed) */

// Age/grade helper for cut-off as of Sept 1, 2025 (editable in code)
const CUT_OFF = new Date('2025-09-01T00:00:00');
const THEME_KEY = 'ltrc-theme-preference';
const placementHistoryKey = 'ltrc-placement-history';
const REG_STATE_KEY = 'ltrc-registration-state';
const NAV_OPEN_CLASS = 'nav-open';

function getPlacementHistory(){
  try{
    return JSON.parse(localStorage.getItem(placementHistoryKey)) || [];
  }catch(e){
    console.warn('Failed to parse placement history', e);
    return [];
  }
}

function savePlacementHistory(history){
  localStorage.setItem(placementHistoryKey, JSON.stringify(history.slice(0,5)));
}

function renderPlacementHistory(){
  const list = document.querySelector('.placement-history__list');
  if(!list) return;
  list.innerHTML = '';
  const history = getPlacementHistory();
  if(!history.length){
    const empty = document.createElement('p');
    empty.className = 'placement-history__empty';
    empty.textContent = 'Your placement history will appear here after you run the helper.';
    list.appendChild(empty);
    return;
  }
  history.forEach(entry => {
    const item = document.createElement('li');
    item.className = 'placement-history__item';

    const meta = document.createElement('div');
    meta.className = 'placement-history__meta';
    meta.innerHTML = `<strong>${entry.result}</strong><span>${entry.date}</span>`;

    const actions = document.createElement('div');
    actions.className = 'placement-history__actions';

    const registerBtn = document.createElement('button');
    registerBtn.type = 'button';
    registerBtn.textContent = 'Register';
    registerBtn.addEventListener('click', () => window.location.href = 'registration.html');

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.classList.add('secondary');
    copyBtn.textContent = 'Copy summary';
    copyBtn.addEventListener('click', () => {
      const summary = `${entry.result} — saved ${entry.date}`;
      if(navigator.clipboard){
        navigator.clipboard.writeText(summary).catch(() => alert('Copy failed, please try again.'));
      }else{
        alert(summary);
      }
    });

    actions.append(registerBtn, copyBtn);
    item.append(meta, actions);
    list.appendChild(item);
  });
}

function clearPlacementHistory(){
  localStorage.removeItem(placementHistoryKey);
  renderPlacementHistory();
}

function recordPlacement(resultText){
  if(!resultText || resultText.toLowerCase().includes('enter a birthdate') || resultText.toLowerCase().includes('select a grade')) return;
  const history = getPlacementHistory();
  const entry = {
    result: resultText,
    date: new Date().toLocaleString([], {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'})
  };
  history.unshift(entry);
  savePlacementHistory(history);
  renderPlacementHistory();
}

function setupPlacementEmail(){
  const form = document.getElementById('placement-email-form');
  const status = document.querySelector('.placement-email-status');
  if(!form || !status) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const emailInput = form.querySelector('input[type="email"]');
    const email = emailInput?.value.trim();
    if(!email){
      status.textContent = 'Add an email address to receive your summary.';
      return;
    }
    const history = getPlacementHistory();
    const latest = history[0];
    const body = latest ? `Placement summary:%0D%0A${latest.result} (saved ${latest.date})` : 'Placement summary:%0D%0ANo placement recorded yet. Visit the homepage helper to add one!';
    status.textContent = `Launching email draft to ${email}...`;
    window.location.href = `mailto:${encodeURIComponent(email)}?subject=LTRC%20placement%20summary&body=${body}`;
    setTimeout(() => { status.textContent = 'Email draft opened in your mail client.'; }, 600);
  });
}


function setupPlacementClear(){
  const clearBtn = document.querySelector('.placement-clear');
  if(!clearBtn) return;
  clearBtn.addEventListener('click', () => {
    clearPlacementHistory();
  });
}

const defaultRegistrationState = {
  family: {
    guardianName: '',
    guardianEmail: '',
    guardianPhone: '',
    homeAddress: ''
  },
  players: [],
  waivers: {
    medical: false,
    conduct: false
  },
  discounts: {
    baseFee: 190,
    siblingCount: 1
  },
  lastSaved: null
};

function loadRegistrationState(){
  try {
    const stored = JSON.parse(localStorage.getItem(REG_STATE_KEY) || '{}');
    return {
      ...JSON.parse(JSON.stringify(defaultRegistrationState)),
      ...stored,
      family: { ...defaultRegistrationState.family, ...(stored.family || {}) },
      players: Array.isArray(stored.players) ? stored.players : [],
      waivers: { ...defaultRegistrationState.waivers, ...(stored.waivers || {}) },
      discounts: { ...defaultRegistrationState.discounts, ...(stored.discounts || {}) },
      lastSaved: stored.lastSaved || null
    };
  } catch (e) {
    console.warn('Failed to parse registration state', e);
    return JSON.parse(JSON.stringify(defaultRegistrationState));
  }
}

let registrationState = loadRegistrationState();
let activeStep = 1;
let autosaveTimer;

function saveRegistrationState(){
  registrationState.lastSaved = new Date().toISOString();
  localStorage.setItem(REG_STATE_KEY, JSON.stringify(registrationState));
  const status = document.querySelector('[data-autosave]');
  if(status){
    const savedDate = new Date(registrationState.lastSaved).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'});
    status.textContent = `Autosaved at ${savedDate}.`;
  }
}

function updateFamilyFields(){
  const name = document.getElementById('guardianName');
  const email = document.getElementById('guardianEmail');
  const phone = document.getElementById('guardianPhone');
  const address = document.getElementById('homeAddress');
  if(name) name.value = registrationState.family.guardianName || '';
  if(email) email.value = registrationState.family.guardianEmail || '';
  if(phone) phone.value = registrationState.family.guardianPhone || '';
  if(address) address.value = registrationState.family.homeAddress || '';
}

function defaultPlayer(){
  const timestamp = Date.now();
  return { id: timestamp, playerName: '', birthdate: '', grade: '', division: '', waitlist: false };
}

function renderPlayers(){
  const container = document.getElementById('playerList');
  if(!container) return;
  container.innerHTML = '';
  if(!registrationState.players.length){
    const empty = document.createElement('p');
    empty.className = 'placement-history__empty';
    empty.textContent = 'Add your first player to unlock discount calculations.';
    container.appendChild(empty);
  }
  registrationState.players.forEach((player, index) => {
    const card = document.createElement('div');
    card.className = 'player-card';

    const header = document.createElement('header');
    const title = document.createElement('h4');
    title.textContent = player.playerName ? player.playerName : `Player ${index + 1}`;
    header.appendChild(title);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn btn-outline';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      registrationState.players = registrationState.players.filter(p => p.id !== player.id);
      saveRegistrationState();
      renderPlayers();
      updateDashboard();
      updateDiscountSummary();
    });
    header.appendChild(removeBtn);

    card.appendChild(header);

    const fields = document.createElement('div');
    fields.className = 'reg-fields reg-two-col';
    fields.innerHTML = `
      <div>
        <label>Player name
          <input type="text" value="${player.playerName}" data-player-field="playerName" data-player-id="${player.id}" placeholder="Player name">
        </label>
      </div>
      <div>
        <label>Birthdate
          <input type="date" value="${player.birthdate}" data-player-field="birthdate" data-player-id="${player.id}">
        </label>
      </div>
      <div>
        <label>School grade
          <input type="text" value="${player.grade}" data-player-field="grade" data-player-id="${player.id}" placeholder="e.g., 4th">
        </label>
      </div>
      <div>
        <label>Division preference
          <select data-player-field="division" data-player-id="${player.id}">
            <option value="">Select a division</option>
            <option ${player.division==='Boys Clinic 6–7'? 'selected':''}>Boys Clinic 6–7</option>
            <option ${player.division==='Boys Clinic 8'? 'selected':''}>Boys Clinic 8</option>
            <option ${player.division==='Boys 9–10 League'? 'selected':''}>Boys 9–10 League</option>
            <option ${player.division==='Girls Clinic K–1'? 'selected':''}>Girls Clinic K–1</option>
            <option ${player.division==='Girls League 5–6 (Waitlist)'? 'selected':''}>Girls League 5–6 (Waitlist)</option>
            <option ${player.division==='Girls League 7–8'? 'selected':''}>Girls League 7–8</option>
          </select>
        </label>
      </div>
    `;
    card.appendChild(fields);

    if(player.waitlist){
      const flag = document.createElement('div');
      flag.className = 'waitlist-flag';
      flag.textContent = 'Added to waitlist notification list';
      card.appendChild(flag);
    }

    container.appendChild(card);
  });

  attachPlayerFieldListeners();
}

function isWaitlisted(division){
  return division && division.toLowerCase().includes('waitlist');
}

function attachPlayerFieldListeners(){
  document.querySelectorAll('[data-player-field]').forEach(input => {
    input.addEventListener('input', handlePlayerFieldChange);
    input.addEventListener('change', handlePlayerFieldChange);
  });
}

function handlePlayerFieldChange(event){
  const { playerId, playerField } = event.target.dataset;
  if(!playerId || !playerField) return;
  const player = registrationState.players.find(p => String(p.id) === playerId);
  if(!player) return;
  player[playerField] = event.target.value;
  player.waitlist = isWaitlisted(player.division);
  saveRegistrationState();
  updateDashboard();
  updateDiscountSummary();
  renderPlayers();
}

function addPlayer(){
  registrationState.players.push(defaultPlayer());
  saveRegistrationState();
  renderPlayers();
  updateDashboard();
  updateDiscountSummary();
}

function updateDiscountSummary(){
  const summary = document.getElementById('discountSummary');
  if(!summary) return;
  const base = Number(document.getElementById('baseFee')?.value || 0);
  const count = Number(document.getElementById('siblingCount')?.value || 0);
  registrationState.discounts.baseFee = base;
  registrationState.discounts.siblingCount = count;
  const players = registrationState.players.length;
  if(players < 2 || count < 2){
    summary.textContent = 'Sibling discount: add at least two players to calculate savings.';
    saveRegistrationState();
    return;
  }
  const additional = Math.max(count - 1, 0);
  const discount = additional * 25;
  const subtotal = base * count;
  const total = Math.max(subtotal - discount, 0);
  summary.textContent = `Estimated total: $${total.toFixed(2)} (includes $${discount.toFixed(2)} sibling discount).`;
  saveRegistrationState();
}

function updateDashboard(){
  const familyList = document.getElementById('dashboardFamily');
  const playerList = document.getElementById('dashboardPlayers');
  const waitlistSummary = document.getElementById('waitlistSummary');
  if(familyList){
    familyList.innerHTML = '';
    const { guardianName, guardianEmail, guardianPhone } = registrationState.family;
    if(!guardianName && !guardianEmail && !guardianPhone){
      familyList.innerHTML = '<li>No guardian details yet.</li>';
    }else{
      if(guardianName) familyList.innerHTML += `<li><strong>Guardian:</strong> ${guardianName}</li>`;
      if(guardianEmail) familyList.innerHTML += `<li><strong>Email:</strong> ${guardianEmail}</li>`;
      if(guardianPhone) familyList.innerHTML += `<li><strong>Phone:</strong> ${guardianPhone}</li>`;
    }
  }
  if(playerList){
    playerList.innerHTML = '';
    if(!registrationState.players.length){
      playerList.innerHTML = '<li>No players added.</li>';
    }else{
      registrationState.players.forEach(player => {
        playerList.innerHTML += `<li>${player.playerName || 'Player'} — ${player.division || 'Select division'}</li>`;
      });
    }
  }
  if(waitlistSummary){
    const waitlisted = registrationState.players.filter(p => p.waitlist);
    if(!waitlisted.length){
      waitlistSummary.textContent = 'Divisions that are full will appear here with instructions.';
    }else{
      waitlistSummary.textContent = waitlisted.map(p => `${p.playerName || 'Player'} flagged for waitlist (${p.division}).`).join(' ');
    }
  }
}

function hydrateRegistrationForm(){
  updateFamilyFields();
  const base = document.getElementById('baseFee');
  const siblings = document.getElementById('siblingCount');
  if(base) base.value = registrationState.discounts.baseFee;
  if(siblings) siblings.value = registrationState.discounts.siblingCount;
  const medical = document.getElementById('waiverMedical');
  const conduct = document.getElementById('waiverConduct');
  if(medical) medical.checked = !!registrationState.waivers.medical;
  if(conduct) conduct.checked = !!registrationState.waivers.conduct;
  renderPlayers();
  updateDiscountSummary();
  updateDashboard();
}

function moveToStep(step){
  activeStep = step;
  document.querySelectorAll('.reg-step').forEach(section => {
    section.classList.toggle('hidden', Number(section.dataset.step) !== step);
  });
  document.querySelectorAll('.reg-step-pill').forEach(pill => {
    pill.classList.toggle('active', Number(pill.dataset.step) === step);
  });
  const summary = document.getElementById('reviewSummary');
  if(step === 4 && summary){
    summary.innerHTML = '';
    if(!registrationState.players.length){
      summary.innerHTML = '<p>No players added yet.</p>';
    }else{
      registrationState.players.forEach(player => {
        summary.innerHTML += `<p><strong>${player.playerName || 'Player'}</strong> — ${player.division || 'Select division'}${player.waitlist ? ' (waitlist)' : ''}</p>`;
      });
    }
  }
  const registerSection = document.getElementById('register');
  if(registerSection){
    window.scrollTo({ top: registerSection.offsetTop - 80, behavior: 'smooth' });
  }
}

function setupRegistrationFlow(){
  const form = document.getElementById('registration-flow');
  if(!form) return;
  hydrateRegistrationForm();
  form.addEventListener('input', handleRegistrationInput, true);
  form.addEventListener('change', handleRegistrationInput, true);
  form.querySelectorAll('[data-action="next"]').forEach(btn => {
    btn.addEventListener('click', () => {
      moveToStep(Math.min(4, activeStep + 1));
    });
  });
  form.querySelectorAll('[data-action="prev"]').forEach(btn => {
    btn.addEventListener('click', () => {
      moveToStep(Math.max(1, activeStep - 1));
    });
  });
  document.getElementById('addPlayer')?.addEventListener('click', addPlayer);
  document.getElementById('baseFee')?.addEventListener('input', updateDiscountSummary);
  document.getElementById('siblingCount')?.addEventListener('input', updateDiscountSummary);
  document.querySelectorAll('.reg-step-pill button').forEach(btn => {
    btn.addEventListener('click', () => moveToStep(Number(btn.dataset.target)));
  });
  document.getElementById('saveExit')?.addEventListener('click', () => {
    saveRegistrationState();
    alert('Progress saved. You can close the tab and return later.');
  });
  document.getElementById('proceedCheckout')?.addEventListener('click', (e) => {
    if(!registrationState.waivers.medical || !registrationState.waivers.conduct){
      e.preventDefault();
      alert('Please acknowledge the waivers before proceeding.');
    }
  });
}

function handleRegistrationInput(event){
  const { id, value, checked } = event.target;
  switch(id){
    case 'guardianName':
      registrationState.family.guardianName = value;
      break;
    case 'guardianEmail':
      registrationState.family.guardianEmail = value;
      break;
    case 'guardianPhone':
      registrationState.family.guardianPhone = value;
      break;
    case 'homeAddress':
      registrationState.family.homeAddress = value;
      break;
    case 'waiverMedical':
      registrationState.waivers.medical = checked;
      break;
    case 'waiverConduct':
      registrationState.waivers.conduct = checked;
      break;
    case 'baseFee':
    case 'siblingCount':
      updateDiscountSummary();
      return;
    default:
      return;
  }
  updateDashboard();
  triggerAutosave();
}

function triggerAutosave(){
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(saveRegistrationState, 800);
}

function calculatePlacement(){
  const type = document.getElementById('playerType')?.value || 'boy';
  const bdayVal = document.getElementById('birthday')?.value;
  const gradeVal = document.getElementById('grade')?.value;
  const out = document.getElementById('placement-result') || document.getElementById('placementResult');
  if(!out) return;
  if(type === 'boy'){
    if(!bdayVal){ out.innerHTML = 'Enter a birthdate.'; return; }
    const bday = new Date(bdayVal + 'T00:00:00');
    let age = CUT_OFF.getFullYear() - bday.getFullYear();
    const beforeCut = (CUT_OFF.getMonth() < bday.getMonth()) || (CUT_OFF.getMonth() === bday.getMonth() && CUT_OFF.getDate() < bday.getDate());
    if(beforeCut) age -= 1;

    let group = '';
    if(age <= 5){ group = 'Not eligible yet (must be at least 6 as of Sept 1).'; }
    else if(age === 6 || age === 7){ group = 'Boys Clinic 6–7'; }
    else if(age === 8){ group = 'Boys Clinic 8'; }
    else if(age === 9 || age === 10){ group = 'Boys 9–10 League'; }
    else if(age === 11 || age === 12){ group = 'Boys 11–12 League'; }
    else if(age === 13 || age === 14){ group = 'Boys 13–14 League'; }
    else { group = 'Please contact the program for placement.'; }

    out.innerHTML = `<strong>Suggested placement:</strong> ${group} <br><small>This guide is informational; final placement follows program rules.</small>`;
    recordPlacement(out.innerText);
  }else{
    if(!gradeVal){ out.innerHTML = 'Select a grade.'; return; }
    const g = parseInt(gradeVal,10);
    let group = '';
    if(g <= 1){ group = 'Girls Clinic K–1'; }
    else if(g === 2){ group = 'Girls Clinic 2'; }
    else if(g === 3 || g === 4){ group = 'Girls 3–4 League'; }
    else if(g === 5 || g === 6){ group = 'Girls 5–6 League'; }
    else if(g === 7 || g === 8){ group = 'Girls 7–8 League'; }
    else { group = 'Please contact the program for placement.'; }

    out.innerHTML = `<strong>Suggested placement:</strong> ${group} <br><small>This guide is informational; final placement follows program rules.</small>`;
    recordPlacement(out.innerText);
  }
}

function filterFAQ(){
  const q = (document.getElementById('faqSearch')?.value || '').toLowerCase();
  const items = document.querySelectorAll('.faq-item');
  let visibleCount = 0;
  
  items.forEach(item => {
    const text = item.textContent.toLowerCase();
    const matches = text.includes(q);
    item.style.display = matches ? '' : 'none';
    if(matches) visibleCount++;
    
    // Highlight matching text
    if(q && matches){
      const title = item.querySelector('h3');
      const content = item.querySelector('p');
      if(title) highlightText(title, q);
      if(content) highlightText(content, q);
    }else{
      // Remove highlights when no search
      const highlighted = item.querySelectorAll('.search-highlight');
      highlighted.forEach(el => {
        el.outerHTML = el.textContent;
      });
    }
  });
  
  // Show no results message
  let noResults = document.getElementById('faq-no-results');
  if(!noResults && document.querySelector('.faq-container')){
    noResults = document.createElement('div');
    noResults.id = 'faq-no-results';
    noResults.className = 'callout callout-note';
    noResults.style.display = 'none';
    noResults.innerHTML = '<strong>No matches found</strong><p>Try a different search term or browse all FAQs below.</p>';
    const container = document.querySelector('.faq-container');
    const firstItem = document.querySelector('.faq-item');
    if(container && firstItem) container.insertBefore(noResults, firstItem);
  }
  
  if(noResults){
    noResults.style.display = q && visibleCount === 0 ? '' : 'none';
  }
}

function highlightText(element, searchTerm){
  const text = element.textContent;
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  const highlighted = text.replace(regex, '<span class="search-highlight">$1</span>');
  if(highlighted !== text){
    element.innerHTML = highlighted;
  }
}

function applyTheme(preference){
  const body = document.body;
  if(preference === 'dark'){
    body.classList.add('dark');
    body.classList.remove('light');
  }else if(preference === 'light'){
    body.classList.add('light');
    body.classList.remove('dark');
  }else{
    body.classList.remove('light');
    body.classList.remove('dark');
  }
}

function resolvePreferredTheme(){
  const saved = localStorage.getItem(THEME_KEY);
  if(saved === 'light' || saved === 'dark') return saved;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

function updateToggleLabel(btn, preference){
  if(!btn) return;
  if(preference === 'dark'){
    btn.setAttribute('aria-label', 'Switch to light mode');
    btn.innerHTML = '🌙 Dark mode';
  }else{
    btn.setAttribute('aria-label', 'Switch to dark mode');
    btn.innerHTML = '☀️ Light mode';
  }
}

function setupMobileNav(){
  const nav = document.querySelector('.nav-links');
  const toggle = document.querySelector('.nav-toggle');
  if(!nav || !toggle) return;
  
  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    nav.classList.toggle('nav-links--open', !expanded);
    toggle.classList.toggle('active', !expanded);
    // Prevent body scroll when menu is open
    document.body.style.overflow = !expanded ? 'hidden' : '';
  });
  
  // Close menu when clicking nav links
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('nav-links--open');
      toggle.classList.remove('active');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = ''; // Restore scroll
    });
  });
  
  // Close on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('nav-links--open')) {
      nav.classList.remove('nav-links--open');
      toggle.classList.remove('active');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = ''; // Restore scroll
    }
  });
}

function setupThemeToggle(){
  const toggle = document.querySelector('.theme-toggle');
  if(!toggle) return;
  
  const sunIcon = toggle.querySelector('.sun-icon');
  const moonIcon = toggle.querySelector('.moon-icon');
  const preference = localStorage.getItem('theme') || 'light';
  
  // Set initial state
  if(preference === 'dark'){
    document.body.classList.add('dark');
    sunIcon.style.display = 'none';
    moonIcon.style.display = 'block';
    toggle.setAttribute('aria-label', 'Switch to light mode');
  }
  
  toggle.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    if(isDark){
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'block';
      toggle.setAttribute('aria-label', 'Switch to light mode');
    } else {
      sunIcon.style.display = 'block';
      moonIcon.style.display = 'none';
      toggle.setAttribute('aria-label', 'Switch to dark mode');
    }
  });
}

// Enhance navigation and portal helpers
window.addEventListener('DOMContentLoaded', () => {
  const registerLinks = document.querySelectorAll('a[href="registration.html"], a[href="https://example.com/registration"]');
  registerLinks.forEach(link => {
    link.setAttribute('href', 'registration.html');
  });

  const pathname = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(link => {
    const href = link.getAttribute('href');
    if(!href) return;
    const file = href.split('/').pop();
    if(file && file === pathname){
      link.setAttribute('aria-current', 'page');
    }else if(!file && pathname === 'index.html'){
      link.setAttribute('aria-current', 'page');
    }
  });

  const navLinks = document.querySelector('.nav-links');
  if(navLinks){
    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'theme-toggle';

    const initial = resolvePreferredTheme();
    applyTheme(initial);
    updateToggleLabel(toggleBtn, initial);

    toggleBtn.addEventListener('click', () => {
      const current = document.body.classList.contains('dark') ? 'dark' : 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      updateToggleLabel(toggleBtn, next);
      localStorage.setItem(THEME_KEY, next);
    });

    navLinks.appendChild(toggleBtn);

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
      const saved = localStorage.getItem(THEME_KEY);
      if(saved) return;
      const next = event.matches ? 'dark' : 'light';
      applyTheme(next);
      updateToggleLabel(toggleBtn, next);
    });
  }else{
    applyTheme(resolvePreferredTheme());
  }

  renderPlacementHistory();
  setupPlacementEmail();
  setupPlacementClear();
  setupRegistrationFlow();
  setupMobileNav();
  setupThemeToggle();

  const faqInput = document.getElementById('faqSearch');
  if(faqInput){
    faqInput.addEventListener('input', filterFAQ);
    document.getElementById('faq-search-form')?.addEventListener('submit', e => {
      e.preventDefault();
      filterFAQ();
    });
  }
  
  // FAQ accordion behavior
  document.querySelectorAll('.faq-item').forEach(item => {
    item.addEventListener('click', () => {
      item.classList.toggle('expanded');
    });
  });

  document.querySelectorAll('[data-copy-target]').forEach(btn => {
    const original = btn.textContent.trim();
    btn.addEventListener('click', () => {
      const selector = btn.getAttribute('data-copy-target');
      const contentEl = selector ? document.querySelector(selector) : null;
      if(!contentEl) return;
      const text = contentEl.textContent.trim();
      const fallbackCopy = () => {
        const temp = document.createElement('textarea');
        temp.value = text;
        temp.setAttribute('readonly', '');
        temp.style.position = 'absolute';
        temp.style.left = '-9999px';
        document.body.appendChild(temp);
        temp.select();
        try{ document.execCommand('copy'); }catch(e){ console.error('Copy failed', e); }
        document.body.removeChild(temp);
      };
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(text).catch(fallbackCopy);
      }else{
        fallbackCopy();
      }
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = original; }, 2000);
    });
  });
});
