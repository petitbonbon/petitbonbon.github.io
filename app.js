// =====================================================================
// Petit Bonbon — application web
// Une seule page, sans étape de build : tout est servi tel quel par
// GitHub Pages. Les données passent par Supabase (voir supabase/schema.sql).
// =====================================================================
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const C = window.PB_CONFIG || {};
const CONFIGURED = !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY && !/COLLE_ICI/.test(C.SUPABASE_URL + C.SUPABASE_ANON_KEY));
const sb = CONFIGURED ? createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY) : null;

// L'ordre compte : la base stocke l'indice (0 à 11). Ne pas réordonner, seulement ajouter à la fin (max 12).
const COMPLIMENTS = [
  'Ton énergie se ressent jusqu’ici.',
  'J’aime beaucoup ton pseudo.',
  'Ta façon de te présenter m’a fait sourire.',
  'Merci d’être là ce soir.',
  'Ton humeur du jour est contagieuse.',
  'Tu donnes envie de passer une bonne soirée.',
  'J’aime ta façon d’être là, simplement.',
  'Je te souhaite une très belle journée.',
  'Ta phrase du jour m’a fait du bien.',
  'Je suis content·e de te croiser ici.',
  'Garde cette bonne humeur, elle est précieuse.',
  'Tu rends cette ville plus douce.',
];
// Doit correspondre à la liste « allowed » de start_session dans schema.sql
const MOODS = ['Joyeux·se', 'Rêveur·se', 'Curieux·se', 'Calme', 'Timide', 'Triste', 'Pas dans mon assiette'];
// Humeurs en plus pour Premium (doit correspondre à premium_moods dans schema.sql)
const MOODS_PREMIUM = ['Inspiré·e', 'Nostalgique', 'Zen', 'Gourmand·e', 'Fêtard·e', 'Aventurier·ère'];
const CITIES = ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Montpellier', 'Strasbourg', 'Bordeaux', 'Lille', 'Rennes', 'Reims', 'Toulon', 'Saint-Étienne', 'Le Havre', 'Grenoble', 'Dijon', 'Angers', 'Nîmes', 'Clermont-Ferrand', 'Orléans', 'Tours', 'Brest', 'Limoges', 'Amiens', 'Metz', 'Perpignan', 'Besançon', 'Caen', 'Rouen', 'Nancy', 'Avignon', 'La Rochelle', 'Poitiers', 'Pau', 'Bayonne', 'Annecy', 'Bruxelles', 'Genève', 'Lausanne', 'Montréal'];
// Phrases de la mini-conversation. L'ordre compte (la base stocke le numéro, 30 max) :
// ne jamais réordonner, seulement ajouter à la fin.
const PHRASES = [
  'Coucou !',
  'Merci pour ton bonbon !',
  'Tu fais quoi de beau aujourd’hui ?',
  'J’adore ta ville !',
  'Moi aussi !',
  'Haha !',
  'Tu m’as fait sourire.',
  'Belle journée à toi !',
  'Bonne soirée !',
  'Prends soin de toi.',
  'C’était doux, merci.',
  'À une prochaine, peut-être !',
  // 12 à 23 : phrases Premium
  'Tu as illuminé ma journée ✨',
  'Quelle belle énergie !',
  'J’aime beaucoup ton humeur du jour.',
  'On se croise peut-être sans le savoir.',
  'Ta ville a de la chance.',
  'Tu as un joli pseudo.',
  'Raconte-moi un truc qui t’a fait rire.',
  'Ton coin préféré dans la ville ?',
  'Un bon café dans le coin ?',
  'J’espère que ta journée est douce.',
  'Courage pour la suite !',
  'Un dernier bonbon pour la route 🍬',
];
const PHRASES_FREE = 12; // les phrases à partir de cet indice sont réservées à Premium
// Bonbons animés (Premium) : l'indice est stocké en base (0 à 3)
const EFFECTS = ['Sans animation', 'Pluie de cœurs', 'Étoiles', 'Confettis'];
const REASONS = ['Message ou profil déplacé', 'Contenu sexuel', 'Je pense que c’est un·e mineur·e', 'Insistance ou harcèlement', 'Autre chose me met mal à l’aise'];
// Options réservées à l'abonnement Premium (pas encore disponibles)
const PREMIUM_PRICE = '2,99 € / mois';
const premiumReady = () => !!(window.PB_CONFIG || {}).PREMIUM_PAYMENT_LINK; // false = Premium grisé, « Bientôt »
const PREMIUM_FEATURES = [
  { short: 'Mon propre mot', long: 'Écrire tes propres mots (filtrés, 140 caractères)' },
  { short: 'Bonbons animés', long: 'Des bonbons qui s’ouvrent en cœurs, étoiles ou confettis' },
  { short: 'Notes vocales', long: 'Des notes vocales de 15 s au lieu de 8 s' },
  { short: 'Photos floues', long: 'Une photo qui arrive floutée et se révèle 10 secondes, une seule fois' },
  { short: 'Plus de bonbons', long: '25 bonbons à offrir par jour au lieu de 10' },
  { short: 'Plus de mots', long: '12 petites phrases en plus dans les échanges' },
  { short: 'Plus d’humeurs', long: '6 humeurs en plus, et 2 humeurs à la fois' },
  { short: 'Bio plus longue', long: 'Tes quelques mots sur 160 caractères' },
  { short: 'Avatar pixel', long: 'Un avatar en pixel art sur ton identité du jour' },
  { short: 'Thèmes', long: 'Des thèmes de couleur pour ton app' },
  { short: 'Rencontres', long: 'Tarif réduit aux rencontres live, dès qu’elles commencent' },
];
const PREMIUM_SOON = 'D’autres petites surprises arrivent bientôt.';
const PHOTO_SECONDS = 10; // durée de la révélation
const VOICE_FREE = 8, VOICE_PREMIUM = 15; // secondes
const voiceMax = () => (isPremium() ? VOICE_PREMIUM : VOICE_FREE);
// Vocal de la carte de profil : 5 s, 10 s avec Premium
const pvoiceMax = () => (isPremium() ? 10 : 5);
const LOCKED_CHIPS = ['Mon propre mot', 'Bonbon animé', 'Vocal de 15 s', 'Photo floue'];

// Avatars en pixel art (Premium). a = couleur, b = clair, c = foncé, w = blanc
const PIXEL_AVATARS = [
  null,
  { name: 'Bonbon', a: '#FF8FB8', b: '#FFC2DA', rows: ['.........', '.........', 'a..aaa..a', 'aaaabaaaa', 'aaaaabaaa', 'aaaabaaaa', 'a..aaa..a', '.........', '.........'] },
  { name: 'Cœur', a: '#FF7EA8', b: '#FFFFFF', rows: ['.........', '.aa...aa.', 'abwa.aaaa', 'aaaaaaaaa', 'aaaaaaaaa', '.aaaaaaa.', '..aaaaa..', '...aaa...', '....a....'] },
  { name: 'Étoile', a: '#F2C94C', b: '#FFF1A8', rows: ['....a....', '....a....', '...aba...', 'aaaabaaaa', '.aaaaaaa.', '..aaaaa..', '..aa.aa..', '.aa...aa.', '.........'] },
  { name: 'Sucette', a: '#7FD6B6', b: '#FFFFFF', c: '#C9A27E', rows: ['..aaaaa..', '.aabbbaa.', '.abaaaba.', '.ababbba.', '.aabaaaa.', '..aaaaa..', '....c....', '....c....', '....c....'] },
  { name: 'Chat', a: '#B9A6F0', b: '#FFC2DA', c: '#3A2D4D', rows: ['a.......a', 'aa.....aa', 'aaaaaaaaa', 'aacaaacaa', 'aaaaaaaaa', 'aaaabaaaa', 'aaaaaaaaa', '.aaaaaaa.', '.........'] },
  { name: 'Fleur', a: '#FFB38A', b: '#F2C94C', c: '#7FD6B6', rows: ['...aaa...', '.aa.a.aa.', '.aaabaaa.', 'aaabbbaaa', '.aaabaaa.', '.aa.a.aa.', '...aaa...', '....c....', '....c....'] },
];
function pixelAvatar(n, size = 32) {
  const av = PIXEL_AVATARS[n]; if (!av) return '';
  let r = '';
  av.rows.forEach((row, y) => [...row.padEnd(9, '.').slice(0, 9)].forEach((ch, x) => {
    const col = ch === 'a' ? av.a : ch === 'b' ? av.b : ch === 'c' ? av.c : ch === 'w' ? '#FFFFFF' : null;
    if (col) r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${col}"/>`;
  }));
  return `<svg class="pixel" width="${size}" height="${size}" viewBox="0 0 9 9" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
}
const THEMES = [
  { id: 'classique', name: 'Classique', color: '#ECE4FF' },
  { id: 'menthe', name: 'Menthe', color: '#C6F1DF' },
  { id: 'peche', name: 'Pêche', color: '#FFE3CC' },
  { id: 'citron', name: 'Citron', color: '#FFF1A8' },
];
function applyTheme() {
  let t = 'classique';
  try { t = localStorage.getItem('pb_theme') || 'classique'; } catch (_) {}
  if (!(S.status && S.status.premium)) t = 'classique';
  document.documentElement.dataset.theme = t;
}
const EVENTS_MSG = 'Quand nous serons plus nombreux dans ta ville, nous y organiserons une fois par mois des rencontres live entre bonbons, petits pains et autres gourmandises :)';
const AVATAR_COLORS = ['#FFE0EC', '#C6F1DF', '#FFF1A8', '#ECE4FF'];
const ERRORS = {
  PAYWALL: 'L’accès à Petit Bonbon n’est pas encore activé sur ce compte.',
  ADULT: 'Petit Bonbon est réservé aux plus de 18 ans.',
  BANNED: 'Ce compte a été suspendu suite à des signalements.',
  LIMIT: 'Tu as envoyé tous tes bonbons pour aujourd’hui. Reviens demain !',
  ALREADY: 'Tu as déjà envoyé un bonbon à cette personne aujourd’hui.',
  SLOW: 'Doucement 🍬 Laisse une petite seconde entre deux messages.',
  LIMIT_CHAT: 'Vous avez beaucoup échangé aujourd’hui. Reprenez demain !',
  PREMIUM: 'Cette option fait partie de Premium.',
  NO_VOICE: 'Cette personne préfère ne pas recevoir de notes vocales. Retire la note pour envoyer ton bonbon.',
  HEARD: 'Cette note vocale a déjà été écoutée. Elle n’existe plus.',
  NO_PHOTO: 'Cette personne préfère ne pas recevoir de photos. Retire la photo pour envoyer ton bonbon.',
  SEEN: 'Cette photo a déjà été vue. Elle n’existe plus.',
  NO_CUSTOM: 'Cette personne préfère recevoir les compliments de la liste.',
  BAD_CODE: 'Ce code ne correspond à aucun Premium. Vérifie-le et réessaie.',
  TOO_MANY: 'Trop d’essais. Réessaie dans une heure.',
  NOT_ACTIVE: 'L’abonnement lié à ce code n’est plus actif.',
  CANCEL_FIRST: 'Résilie d’abord ton abonnement Premium (Moi › Gérer mon abonnement). Tu pourras ensuite tout effacer.',
  WEEKLY: 'Tu as déjà offert plusieurs bonbons à cette personne cette semaine. Laisse-lui un peu d’air 🍬',
  BAD_TEXT: 'Ton surnom, tes quelques mots ou ta ville contient un contact (numéro, réseau social, lien) ou un mot interdit. Modifie-le pour continuer.',
  GONE: 'Cette personne n’est plus disponible.',
  ONE_CHAT: 'En gratuit, tu peux écrire librement à une seule personne par identité du jour. Avec Premium, à tout le monde 🍬',
  SAME_CITY: 'En gratuit, la conversation libre est réservée aux bonbons de ta ville.',
  BAD_MSG: 'Ton message contient un contact (numéro, réseau social, lien) ou un mot interdit. Modifie-le pour l’envoyer.',
  VOICE_LONG: 'Ta note vocale est trop longue : 8 secondes maximum en gratuit.',
  NO_SESSION: 'Ton identité du jour a expiré. Recrée-la pour continuer.',
  BAD_MOOD: 'Humeur non reconnue.',
  AUTH: 'Ta session a expiré, reconnecte-toi.',
};

// ---------- Sons -------------------------------------------------------
// Les fichiers sont dans le dossier sons/. S'il en manque un, l'app reste
// simplement silencieuse pour ce son-là.
const SOUND_FILES = { open: 'sons/ouverture.mp3', click: 'sons/clic.mp3', bonbon: 'sons/bonbon-recu.mp3' };
const SOUND_VOLUME = { open: 0.7, click: 0.4, bonbon: 0.8 };
const SOUND = {
  on: true, clicks: true, opened: false, cache: {},
  load() {
    try {
      this.on = localStorage.getItem('pb_sound') !== 'off';
      this.clicks = localStorage.getItem('pb_sound_clicks') !== 'off';
    } catch (_) {}
    Object.entries(SOUND_FILES).forEach(([k, src]) => {
      const a = new Audio(); a.preload = 'auto'; a.src = src; a.volume = SOUND_VOLUME[k];
      a.addEventListener('error', () => { this.cache[k] = null; });
      this.cache[k] = a;
    });
  },
  play(k) {
    if (!this.on || (k === 'click' && !this.clicks)) return;
    const a = this.cache[k];
    if (!a) return;
    const n = a.cloneNode(); n.volume = a.volume;   // copie : les clics rapides peuvent se chevaucher
    n.play().catch(() => {});
  },
  save() {
    try {
      localStorage.setItem('pb_sound', this.on ? 'on' : 'off');
      localStorage.setItem('pb_sound_clicks', this.clicks ? 'on' : 'off');
    } catch (_) {}
  },
};
SOUND.load();
// Les navigateurs interdisent de jouer un son avant le premier geste de la
// personne : le son d'ouverture part donc à son premier toucher de l'écran.
function playOpenOnce() {
  if (SOUND.opened) return false;
  SOUND.opened = true;
  SOUND.play('open');
  return true;
}
document.addEventListener('pointerdown', (e) => {
  if (playOpenOnce()) e.__pbOpenPlayed = true;
}, { capture: true });

// ---------- État -------------------------------------------------------
const S = {
  view: 'loading',          // setup | welcome | auth | checkmail | newpass | adult | paywall | banned | identity | main
  tab: 'discover',          // discover | send | sentok | inbox | me
  user: null, status: null,
  authMode: 'signup', error: '', busy: false,
  form: { pseudo: '', moods: [], bio: '', city: '', home: '' },
  people: [], peopleLoaded: false, inbox: [], sent: [],
  target: null, pick: 0, lastSentText: '',
  report: null,            // { bonbonId?, sessionId?, pseudo, mode?: 'block' | 'report' }
  cardMenu: null,          // carte dont le petit menu ⚠ est ouvert : 'p3' (Autour de toi) ou 'b<id>' (Reçus)
  premium: false,          // feuille « Premium » ouverte
  convs: [], chat: null, thread: [],   // mini-conversations
  custom: '', premiumMode: 'join', checkmailMsg: '', premiumCode: null,
  banner: 0, seenInbox: null,
};

// ---------- Utilitaires ------------------------------------------------
const $app = document.getElementById('app');
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const errMsg = (e) => {
  const raw = (e && (e.message || e.error_description || e.msg)) || String(e || '');
  const code = Object.keys(ERRORS).find((k) => raw.includes(k));
  if (code) return ERRORS[code];
  if (/already (been )?registered|already exists|email_exists/i.test(raw)) return 'Cette adresse a déjà un compte. Utilise « J’ai déjà un compte Premium ».';
  if (/Signups not allowed|user not found/i.test(raw)) return 'Aucun compte Premium avec cette adresse.';
  if (/not authorized/i.test(raw)) return 'L’envoi d’e-mails n’est pas encore configuré. Réessaie plus tard.';
  if (/manual linking/i.test(raw)) return 'La création de compte n’est pas encore activée. Réessaie plus tard.';
  if (/anonymous sign-ins are disabled/i.test(raw)) return 'L’entrée sans compte n’est pas encore activée. Réessaie dans quelques minutes.';
  if (/captcha/i.test(raw)) return 'Vérification anti-robot échouée. Recharge la page et réessaie.';
  if (/Invalid login credentials/i.test(raw)) return 'E-mail ou mot de passe incorrect.';
  if (/already registered|already been registered/i.test(raw)) return 'Un compte existe déjà avec cet e-mail. Connecte-toi.';
  if (/Password should be/i.test(raw)) return 'Le mot de passe doit faire au moins 8 caractères.';
  if (/rate limit|too many/i.test(raw)) return 'Trop de tentatives, réessaie dans quelques minutes.';
  if (/Failed to fetch|NetworkError/i.test(raw)) return 'Connexion impossible. Vérifie ton réseau.';
  if (/row-level security|violates row/i.test(raw)) return 'L’envoi de la note vocale a été refusé. Réessaie dans un instant.';
  if (/mime type|payload too large|maximum allowed size|exceeded the maximum/i.test(raw)) return 'Cette note vocale est trop lourde ou dans un format non pris en charge.';
  // Détail technique affiché en petit : utile pour comprendre une erreur imprévue
  try { console.error('[Petit Bonbon]', e); } catch (_) {}
  const detail = raw.replace(/\s+/g, ' ').trim().slice(0, 90);
  return 'Oups, quelque chose n’a pas marché. Réessaie.' + (detail ? ` (détail : ${detail})` : '');
};
let toastTimer;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 3600);
}
async function rpc(name, args) {
  const { data, error } = await sb.rpc(name, args || {});
  if (error) throw error;
  return data;
}
const seenKey = (sid) => 'pb_seen_' + sid;
function convUnread(c) {
  if (!c.last_at || c.last_from_me) return false;
  let seen = null; try { seen = localStorage.getItem(seenKey(c.session_id)); } catch (_) {}
  return !seen || new Date(c.last_at) > new Date(seen);
}
function markSeen(c) { if (c && c.last_at) { try { localStorage.setItem(seenKey(c.session_id), c.last_at); } catch (_) {} } }
const timeAgo = (iso) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'à l’instant';
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'hier' : `il y a ${d} jours`;
};

const ICON = {
  gear: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></svg>',
  back: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  pin: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  search: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
  inbox: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 13l3-8h10l3 8v6H4z"/><path d="M4 13h5a3 3 0 0 0 6 0h5"/></svg>',
  me: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  lockSmall: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  refresh: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>',
  warn: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5L2.5 20h19z"/><path d="M12 10v4.5"/><circle cx="12" cy="17.3" r=".6" fill="currentColor"/></svg>',
  lock: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
};
// Bonbon en pixel art (grille 22 × 12). # = papier, o = reflet, w = brillance
const CANDY_PIXELS = [
  '........######........',
  '......##########......',
  '#....####ww######....#',
  '##..####o####o####..##',
  '###.####o####o####.###',
  '########oo####oo######',
  '#########oo####oo#####',
  '###.######o####o##.###',
  '##..######o####o##..##',
  '#....############....#',
  '......##########......',
  '........######........',
];
const CANDY_COLORS = { '#C2255C': '#FF8FB8', '#1D6B5E': '#7FD6B6', '#F38BAF': '#FF9EC4', '#E2CFCB': '#D9CDE6' };
const candy = (fill, size = 88) => {
  const main = CANDY_COLORS[fill] || fill;
  let rects = '';
  CANDY_PIXELS.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      const c = ch === '#' ? main : ch === 'o' ? 'rgba(255,255,255,0.55)' : '#FFFFFF';
      rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`;
    });
  });
  return `<svg class="pixel" width="${size}" height="${Math.round(size * 12 / 22)}" viewBox="0 0 22 12" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
};
const errorBox = () => (S.error ? `<p class="error" role="alert">${esc(S.error)}</p>` : '');
const isAnon = () => !!(S.user && S.user.is_anonymous);
const isPremium = () => !!(S.status && S.status.premium);
// Un utilisateur sans compte ne se « déconnecte » pas : il perdrait ses blocages et son accès
const logoutBtn = (cls) => (isAnon() ? '' : `<button class="link muted ${cls}" data-a="logout">Me déconnecter</button>`);
const legalLinks = () => `<p class="small" style="text-align:center"><a href="securite.html">Sécurité</a> · <a href="cgu.html">CGU</a> · <a href="confidentialite.html">Confidentialité</a> · <a href="mentions-legales.html">Mentions légales</a></p>`;

// ---------- Écrans -----------------------------------------------------
const V = {};

V.setup = () => `<section class="screen center">
  ${candy('#C2255C')}
  <h2>Presque prêt</h2>
  <p class="sub">L’application n’est pas encore reliée à sa base de données. Renseigne <code>config.js</code> en suivant le README.</p>
</section>`;

V.welcome = () => `<section class="screen welcome">
  <div class="stack" style="gap:28px">
    ${candy('#C2255C')}
    <h1>Petit<br>Bonbon<span class="cursor" aria-hidden="true">_</span></h1>
    <p class="lead">Un inconnu, un petit mot, une nouvelle possibilité.</p>
  </div>
  <div class="stack" style="gap:16px">
    <div class="bullets">
      <div>Pas de profil à entretenir</div>
      <div>Pas d’abonnés, pas de likes</div>
      <div>Seule ta ville est partagée, jamais ta position</div>
    </div>
    <form class="stack" data-f="enter" novalidate>
      <label class="check"><input type="checkbox" name="adult"><span>J’ai 18 ans ou plus.</span></label>
      <label class="check"><input type="checkbox" name="terms"><span>J’accepte les <a href="cgu.html" target="_blank">conditions d’utilisation</a>.</span></label>
      ${errorBox()}
      <button class="btn" type="submit" ${S.busy ? 'disabled' : ''}>▶ Entrer</button>
    </form>
    <p class="small" style="text-align:center;margin:0">Sans compte, sans e-mail, sans mot de passe.</p>
    ${legalLinks()}
  </div>
</section>`;

V.auth = () => {
  const signup = S.authMode === 'signup';
  return `<section class="screen">
  <button class="link muted" data-a="goWelcome" aria-label="Retour" style="align-self:flex-start;display:flex;align-items:center">${ICON.back}</button>
  <div class="stack" style="gap:6px">
    <h2>${signup ? 'Créer mon compte' : 'Content·e de te revoir'}</h2>
    <p class="sub">${signup ? 'Ton e-mail reste privé. Personne ne le verra dans l’app.' : 'Connecte-toi pour retrouver tes bonbons.'}</p>
  </div>
  <form class="stack" data-f="auth" novalidate>
    <div class="field"><label for="email">E-mail</label><input id="email" name="email" type="email" autocomplete="email" required></div>
    <div class="field"><label for="password">Mot de passe</label><input id="password" name="password" type="password" minlength="8" autocomplete="${signup ? 'new-password' : 'current-password'}" required></div>
    ${signup ? `
    <label class="check"><input type="checkbox" name="adult" required><span>J’ai 18 ans ou plus.</span></label>
    <label class="check"><input type="checkbox" name="terms" required><span>J’accepte les <a href="cgu.html" target="_blank">conditions d’utilisation</a> et la <a href="confidentialite.html" target="_blank">politique de confidentialité</a>.</span></label>` : ''}
    ${errorBox()}
    <button class="btn" type="submit" ${S.busy ? 'disabled' : ''}>${signup ? 'Créer mon compte' : 'Me connecter'}</button>
  </form>
  <div class="stack" style="gap:0">
    <button class="link" data-a="goAuth" data-mode="${signup ? 'login' : 'signup'}">${signup ? 'J’ai déjà un compte' : 'Créer un compte'}</button>
    ${signup ? '' : '<button class="link muted" data-a="forgot">Mot de passe oublié ?</button>'}
  </div>
</section>`;
};

V.checkmail = () => `<section class="screen center">
  ${candy('#1D6B5E')}
  <h2>Vérifie ta boîte mail</h2>
  <p class="sub">${esc(S.checkmailMsg || 'On vient de t’envoyer un lien. Clique dessus, puis reviens ici.')}</p>
  <p class="small">Pense à regarder dans les indésirables.</p>
  <button class="btn ghost small" data-a="goWelcome">Retour</button>
</section>`;


V.newpass = () => `<section class="screen">
  <h2>Nouveau mot de passe</h2>
  <form class="stack" data-f="newpass">
    <div class="field"><label for="np">Mot de passe (8 caractères minimum)</label><input id="np" name="password" type="password" minlength="8" autocomplete="new-password" required></div>
    ${errorBox()}
    <button class="btn" type="submit" ${S.busy ? 'disabled' : ''}>Enregistrer</button>
  </form>
</section>`;

V.adult = () => `<section class="screen">
  <h2>Une dernière chose</h2>
  <p class="sub">Petit Bonbon met en relation des inconnus. L’application est réservée aux adultes.</p>
  <form class="stack" data-f="adult">
    <label class="check"><input type="checkbox" name="adult" required><span>J’ai 18 ans ou plus.</span></label>
    <label class="check"><input type="checkbox" name="terms" required><span>J’accepte les <a href="cgu.html" target="_blank">conditions d’utilisation</a>.</span></label>
    ${errorBox()}
    <button class="btn" type="submit" ${S.busy ? 'disabled' : ''}>Continuer</button>
  </form>
  ${logoutBtn('spacer')}
</section>`;

V.paywall = () => {
  const ready = !!C.STRIPE_PAYMENT_LINK;
  return `<section class="screen">
  ${candy('#C2255C', 72)}
  <div class="stack" style="gap:8px">
    <h2>Un petit bonbon pour entrer</h2>
    <p class="sub">L’accès à Petit Bonbon coûte <strong style="color:var(--ink)">0,99 €</strong>, une seule fois. Ce petit prix garde l’app entre vraies personnes : pas de faux comptes, pas de trolls.</p>
  </div>
  <div class="bullets">
    <div>Envoie et reçois des compliments</div>
    <div>Change d’identité quand tu veux</div>
    <div>Paiement unique, sans abonnement</div>
  </div>
  ${ready
    ? `<a class="btn" href="${esc(payLink())}" rel="noopener">Payer 0,99 €</a>`
    : '<p class="note">Le paiement ouvre très bientôt. Reviens dans quelques heures !</p>'}
  <button class="btn ghost small" data-a="checkPaid">J’ai payé, actualiser</button>
  <p class="small">Paiement sécurisé par Stripe. Petit Bonbon ne voit jamais ta carte.</p>
  ${logoutBtn('spacer')}
</section>`;
};

V.banned = () => `<section class="screen center">
  <h2>Compte suspendu</h2>
  <p class="sub">Ce compte a reçu plusieurs signalements et a été suspendu. Si tu penses qu’il s’agit d’une erreur, écris à <a href="mailto:${esc(C.CONTACT_EMAIL)}">${esc(C.CONTACT_EMAIL)}</a>.</p>
  ${logoutBtn('')}
</section>`;

V.identity = () => {
  const f = S.form;
  const canBack = !!(S.status && S.status.session);
  return `<section class="screen">
  ${canBack ? `<button class="link muted" data-a="tab" data-tab="me" aria-label="Retour" style="align-self:flex-start;display:flex;align-items:center">${ICON.back}</button>` : ''}
  <h2>Qui es-tu aujourd’hui ?</h2>
  <form class="stack" style="gap:26px" data-f="identity">
    <div class="field"><label for="pseudo">Nom ou surnom</label>
      <input id="pseudo" name="pseudo" maxlength="20" value="${esc(f.pseudo)}" placeholder="Quelqu’un de passage" data-bind="pseudo"></div>
    <div class="stack" style="gap:10px">
      <span class="label">Ton humeur</span>
      <div class="chips">${MOODS.map((m) => `<button type="button" class="chip" data-a="mood" data-mood="${esc(m)}" aria-pressed="${f.moods.includes(m)}">${esc(m)}</button>`).join('')}</div>
      <span class="label" style="margin-top:4px">${isPremium() ? 'Humeurs Premium · jusqu’à 2 humeurs' : 'Avec Premium'}</span>
      <div class="chips">${MOODS_PREMIUM.map((m) => isPremium()
        ? `<button type="button" class="chip" data-a="mood" data-mood="${esc(m)}" aria-pressed="${f.moods.includes(m)}">${esc(m)}</button>`
        : `<button type="button" class="chip locked" data-a="openPremium">${ICON.lockSmall}${esc(m)}</button>`).join('')}</div>
    </div>
    <div class="field"><label for="city">Ta ville</label>
      <input id="city" name="city" list="cities" maxlength="60" required value="${esc(f.city)}" placeholder="Ex. : Orléans" data-bind="city" autocomplete="address-level2"></div>
    <datalist id="cities">${CITIES.map((c) => `<option value="${esc(c)}">`).join('')}</datalist>
    ${errorBox()}
    <button class="btn" type="submit" ${S.busy ? 'disabled' : ''}>Let’s go !</button>
  </form>
</section>`;
};

const cityLabel = (s) => (s && s.session ? s.session.current_city : '');

V.main = () => {
  const s = S.status.session;
  const unread = S.inbox.filter((m) => m.status === 'open').length + S.convs.filter(convUnread).length;
  const body = (V['tab_' + S.tab] || V.tab_discover)();
  const navOn = (t) => (S.tab === t || (t === 'discover' && (S.tab === 'send' || S.tab === 'sentok')) || (t === 'inbox' && S.tab === 'chat') ? 'aria-current="page"' : '');
  return `
  <header class="topbar">
    <div class="who"><span>Aujourd’hui tu es</span><strong>${esc(s.pseudo)}</strong></div>
    <span class="pill">${ICON.pin}${esc(s.current_city)}</span>
  </header>
  ${body}
  ${S.tab === 'send' || S.tab === 'sentok' || S.tab === 'chat' ? '' : `
  <nav class="nav" aria-label="Navigation principale">
    <button data-a="tab" data-tab="discover" ${navOn('discover')}>${ICON.search}Découvrir</button>
    <button data-a="tab" data-tab="inbox" ${navOn('inbox')}>${ICON.inbox}Ma box${unread ? `<span class="count">${unread}</span>` : ''}</button>
    <button data-a="tab" data-tab="me" ${navOn('me')}>${ICON.me}Moi</button>
  </nav>`}
  ${S.banner ? `<button class="banner" data-a="openBanner">${candy('#F38BAF', 36)}<span><strong>Un petit bonbon pour toi</strong><span>${S.banner > 1 ? `${S.banner} inconnus t’ont envoyé un compliment.` : 'Un inconnu t’a envoyé un compliment.'}</span></span></button>` : ''}
  ${S.report ? V.reportSheet() : ''}
  ${S.premium ? V.premiumSheet() : ''}
  ${S.story ? V.storySheet() : ''}`;
};

V.personCard = (p, i, city) => {
    const badge = p.local
      ? `<span class="badge local">Vous êtes tous les deux à ${esc(city)}</span>`
      : `<span class="badge away">De passage · vient de ${esc(p.home_city)}</span>`;
    const photo = p.profile_photo
      ? `<div class="pcard-photo"><img src="${esc(p.profile_photo)}" alt="" draggable="false"></div>`
      : '';
    return `<article class="card has-menu pcard${p.profile_photo ? ' with-photo' : ''}" data-swipe="1">
      ${photo}
      <button class="card-warn" data-a="cardMenu" data-k="p${i}" aria-label="Bloquer ou signaler ${esc(p.pseudo)}" aria-haspopup="menu" aria-expanded="${S.cardMenu === 'p' + i}">${ICON.warn}</button>
      ${S.cardMenu === 'p' + i ? `<div class="card-menu" role="menu">
        <button role="menuitem" data-a="askBlock" data-i="${i}">Bloquer</button>
        <button role="menuitem" data-a="askReport" data-i="${i}">Signaler</button>
      </div>` : ''}
      <div class="person">
        <div class="avatar" style="--fill:${AVATAR_COLORS[i % 4]}">${p.avatar ? pixelAvatar(p.avatar, 36) : esc((p.pseudo || '?').charAt(0).toUpperCase())}</div>
        <div class="stack" style="gap:3px;min-width:0"><span class="name">${esc(p.pseudo)}</span>${p.moods && p.moods.length ? `<span class="moods">${esc(p.moods.join(' · '))}</span>` : ''}</div>
      </div>
      ${p.bio ? `<p class="bio">« ${esc(p.bio)} »</p>` : '<p class="small" style="margin:0">Pas encore de petits mots.</p>'}
      ${p.profile_voice ? `<button class="btn small soft" style="align-self:flex-start" data-a="playProfile" data-i="${i}" ${S.playingP !== undefined && S.playingP !== null ? 'disabled' : ''}>${S.playingP === i ? '🔊 Lecture…' : '🎙 Écouter sa voix'}</button>` : ''}
      <div class="card-foot">${badge}
        ${p.already_sent
          ? '<span class="small">Bonbon envoyé aujourd’hui</span>'
          : `<button class="btn small dark" data-a="pickTarget" data-i="${i}">Envoyer un bonbon</button>`}
      </div>
    </article>`;
};

V.tab_discover = () => {
  const city = cityLabel(S.status);
  const left = Math.max(0, S.status.daily_limit - S.status.sent_today);
  let list;
  if (!S.status.city_ready) list = `<div class="empty">${candy('#E2CFCB', 64)}<strong style="color:var(--ink)">Tu es la première personne à ${esc(city)} pour l’instant.</strong><span>Dès qu’une autre personne arrive, vous pourrez vous offrir des bonbons. Garde l’app ouverte ou partage-la autour de toi.</span><button class="btn small soft" data-a="share">Partager l’app</button></div>`;
  else if (!S.peopleLoaded) list = '<p class="empty">Chargement…</p>';
  else if (!S.people.length) list = `<div class="empty">${candy('#E2CFCB', 64)}<strong style="color:var(--ink)">Personne d’autre à ${esc(city)} pour l’instant.</strong><span>Reviens un peu plus tard, ou partage Petit Bonbon autour de toi.</span><button class="btn small soft" data-a="share">Partager l’app</button></div>`;
  else {
    const n = S.people.length;
    const i = Math.min(Math.max(0, S.deck || 0), n - 1);
    S.deck = i;
    list = V.personCard(S.people[i], i, city) + (n > 1 ? `<div class="deck-nav">
      <button class="btn small ghost" data-a="deckMove" data-d="-1" aria-label="Personne précédente" ${i === 0 ? 'disabled' : ''}>‹</button>
      <span class="small">${i + 1} / ${n} · fais glisser la carte</span>
      <button class="btn small ghost" data-a="deckMove" data-d="1" aria-label="Personne suivante" ${i === n - 1 ? 'disabled' : ''}>›</button>
    </div>` : '');
  }

  return `<div class="scroll">
    <div class="row" style="justify-content:space-between;padding:0 4px">
      <h2>Autour de toi</h2>
      <button class="btn small ghost" data-a="refresh" aria-label="Actualiser" style="min-width:44px;padding:0 12px">${ICON.refresh}</button>
    </div>
    ${S.hideEvents ? '' : `<div class="events">
      <span class="events-txt"><strong>Bientôt : les rencontres live 🍬</strong><span>${esc(EVENTS_MSG)}</span></span>
      <button class="events-x" data-a="hideEvents" aria-label="Masquer ce message">×</button>
    </div>`}
    <p class="small" style="margin:0 4px">${left} bonbon${left > 1 ? 's' : ''} à offrir aujourd’hui. Aucune distance n’est affichée.</p>
    ${list}
  </div>`;
};

V.tab_send = () => {
  const t = S.target;
  return `<div class="scroll">
    <button class="link muted" data-a="tab" data-tab="${t.reply_id ? 'inbox' : 'discover'}" style="display:flex;align-items:center;gap:6px;align-self:flex-start">${ICON.back}Retour</button>
    <div class="stack" style="gap:8px;padding:0 4px">
      <h2>${t.reply_id ? 'Renvoyer un bonbon à' : 'Un bonbon pour'} ${esc(t.pseudo)}</h2>
      ${t.local ? `<span class="badge local" style="align-self:flex-start">Vous êtes tous les deux à ${esc(cityLabel(S.status))}</span>` : `<span class="badge away" style="align-self:flex-start">De passage · vient de ${esc(t.home_city)}</span>`}
    </div>
    <div role="radiogroup" aria-label="Choisis un compliment" class="stack" style="gap:10px">
      ${COMPLIMENTS.map((c, i) => `<button type="button" role="radio" class="compliment" aria-checked="${S.pick === i}" data-a="pick" data-i="${i}"><span class="dot"></span><span>${esc(c)}</span></button>`).join('')}
    </div>
    ${isPremium()
      ? (t.accepts_custom === false
          ? '<p class="note" style="margin:var(--px)">Cette personne préfère recevoir les compliments de la liste.</p>'
          : `<div class="field"><label for="custom">Ou écris ton propre mot <span style="color:var(--pink-deep)">· Premium</span></label>
              <textarea id="custom" name="custom" rows="3" maxlength="140" placeholder="Il remplace le compliment choisi au-dessus">${esc(S.custom)}</textarea>
              <span class="small">140 caractères. Bienveillant, sans numéro, réseau social ni lien : il est vérifié avant d’arriver.</span></div>`)
        + (t.accepts_voice === false ? '' : V.voiceBox())
        + (t.accepts_photo === false ? '' : V.photoBox())
        + `<div class="stack" style="gap:10px">
              <span class="label" style="padding:0 4px">Animation à l’ouverture <span style="color:var(--pink-deep)">· Premium</span></span>
              <div class="chips">${EFFECTS.map((e, i) => `<button type="button" class="chip" aria-pressed="${(S.effect || 0) === i}" data-a="pickEffect" data-i="${i}">${esc(e)}</button>`).join('')}</div>
            </div>`
      : (t.accepts_voice === false ? '' : V.voiceBox()) + `<div class="stack" style="gap:10px">
      <span class="label" style="padding:0 4px">Avec Premium</span>
      <div class="chips">${LOCKED_CHIPS.map((f) => `<button type="button" class="chip locked" data-a="openPremium">${ICON.lockSmall}${esc(f)}</button>`).join('')}</div>
    </div>`}
    ${errorBox()}
    <button class="btn" data-a="send" ${S.busy ? 'disabled' : ''}>Envoyer le bonbon</button>
  </div>`;
};

// Note vocale à joindre (Premium)
V.voiceBox = () => {
  const v = S.voice || {};
  let inner;
  if (v.recording) {
    inner = `<div class="voice-row"><span class="rec-dot" aria-hidden="true"></span><span><strong>Enregistrement…</strong> <span id="rec-secs">${Math.floor((Date.now() - v.start) / 1000)}</span> / ${v.max} s</span></div>
      <button type="button" class="btn small dark" data-a="stopVoice">Arrêter</button>`;
  } else if (v.url) {
    inner = `<audio controls preload="auto" src="${v.url}" class="voice-preview"></audio>
      <div class="row"><button type="button" class="btn small ghost" data-a="recVoice">Recommencer</button><button type="button" class="link muted" data-a="dropVoice">Retirer la note</button></div>`;
  } else {
    inner = `<button type="button" class="btn small soft" data-a="recVoice" style="align-self:flex-start">🎙 Enregistrer une note vocale</button>`;
  }
  return `<div class="stack voice-box" style="gap:10px">
    <span class="label" style="padding:0 4px">Note vocale · ${voiceMax()} s max${isPremium() ? ' <span style="color:var(--pink-deep)">· Premium</span>' : ' · <button type="button" class="link" style="font-size:inherit;padding:0;min-height:0" data-a="openPremium">15 s avec Premium</button>'}</span>
    ${inner}
    <span class="small">Elle sera écoutable une seule fois, puis effacée. Bienveillante, sans numéro ni réseau social.</span>
  </div>`;
};

// Photo à joindre (Premium) : elle arrivera floutée
V.photoBox = () => {
  const ph = S.photo || {};
  let inner;
  if (ph.checking) inner = `<p class="small" style="margin:0">Vérification de la photo…</p>`;
  else if (ph.url) inner = `<div class="photo-preview"><img src="${ph.url}" alt="Ta photo" draggable="false"></div>
      <div class="row"><label class="btn small ghost" for="photo-input">Changer</label><button type="button" class="link muted" data-a="dropPhoto">Retirer la photo</button></div>`;
  else inner = `<label class="btn small soft" for="photo-input" style="align-self:flex-start">📷 Ajouter une photo</label>`;
  return `<div class="stack" style="gap:10px">
    <span class="label" style="padding:0 4px">Photo floue <span style="color:var(--pink-deep)">· Premium</span></span>
    ${inner}
    <input type="file" id="photo-input" accept="image/*" hidden>
    <span class="small">Elle arrive floutée. La personne choisit de la révéler, nette pendant ${PHOTO_SECONDS} secondes, une seule fois. Pas de nudité : chaque photo est vérifiée sur ton téléphone.</span>
  </div>`;
};

V.tab_sentok = () => `<section class="screen center">
  ${candy('#1D6B5E', 120)}
  <h2>Ton bonbon est parti</h2>
  <p class="sub" style="max-width:300px">${esc(S.target ? S.target.pseudo : '')} recevra « ${esc(S.lastSentText)} » de la part de <strong style="color:var(--ink)">${esc(S.status.session.pseudo)}</strong>. Rien d’autre.</p>
  ${S.target && S.target.reply_id
    ? '<p class="small" style="max-width:300px;margin:0">Si vous vous êtes envoyé un bonbon tous les deux, un petit échange s’ouvre dans « Ma box ».</p><button class="btn dark small" data-a="tab" data-tab="inbox">Retour à mes bonbons</button>'
    : '<button class="btn dark small" data-a="tab" data-tab="discover">Continuer à découvrir</button>'}
</section>`;

V.tab_inbox = () => {
  const city = cityLabel(S.status);
  const rec = S.inbox.length ? S.inbox.map((m) => `<article class="card${m.status !== 'reported' ? ' has-menu' : ''}">
      ${m.status !== 'reported' ? `<button class="card-warn" data-a="cardMenu" data-k="b${esc(m.id)}" aria-label="Bloquer ou signaler ${esc(m.sender_pseudo)}" aria-haspopup="menu" aria-expanded="${S.cardMenu === 'b' + m.id}">${ICON.warn}</button>
      ${S.cardMenu === 'b' + m.id ? `<div class="card-menu" role="menu">
        <button role="menuitem" data-a="askBlock" data-id="${esc(m.id)}">Bloquer</button>
        <button role="menuitem" data-a="askReport" data-id="${esc(m.id)}">Signaler</button>
      </div>` : ''}` : ''}
      <span class="context">${m.local ? 'Vous êtes dans la même ville, mais vous ne vous connaissez pas.' : `Un inconnu de passage à ${esc(city)}, venu de ${esc(m.sender_home_city)}.`}</span>
      <p class="quote">« ${esc(m.custom_text || COMPLIMENTS[m.compliment_id] || '')} »</p>
      <span class="small">— ${esc(m.sender_pseudo)} · ${timeAgo(m.created_at)}${m.is_reply ? ' · <strong>en réponse à ton bonbon</strong>' : ''}${m.custom_text ? ' · mot personnalisé' : ''}</span>
      ${m.has_photo && m.status !== 'reported' ? (!m.photo_seen && m.photo_thumb
        ? `<button class="photo-blur" data-a="revealPhoto" data-id="${esc(m.id)}" ${S.revealing ? 'disabled' : ''}><img src="${esc(m.photo_thumb)}" alt="" draggable="false"><span>${S.revealing === m.id ? 'Ouverture…' : `👁 Révéler la photo · ${PHOTO_SECONDS} s`}</span></button>`
        : '<span class="small">📷 Photo vue (elle n’existe plus)</span>') : ''}
      ${m.has_voice && m.status !== 'reported' ? (m.voice_heard
        ? '<span class="small">🎙 Note vocale écoutée (elle n’existe plus)</span>'
        : `<button class="btn small dark" style="align-self:flex-start" data-a="playVoice" data-id="${esc(m.id)}" ${S.playing ? 'disabled' : ''}>${S.playing === m.id ? '🎙 Lecture en cours…' : '🎙 Écouter la note vocale · une seule fois'}</button>`) : ''}
      ${m.status !== 'reported' ? `<div class="row">
          ${m.can_reply ? `<button class="btn small" data-a="replyBonbon" data-id="${esc(m.id)}">Renvoyer un bonbon</button>` : ''}
          ${m.status === 'open' ? `<button class="btn small soft" data-a="thank" data-id="${esc(m.id)}">Dire merci</button>` : ''}
          <button class="btn small ghost" data-a="storyOpen" data-id="${esc(m.id)}" ${S.storyBusy ? 'disabled' : ''}>📸 En story</button>
        </div>` : ''}
      ${m.replied ? '<span class="small" style="color:var(--accent-deep);font-weight:700">Tu lui as renvoyé un bonbon.</span>' : ''}
      ${m.status === 'thanked' && !m.replied ? '<span class="small" style="color:var(--accent-deep);font-weight:700">Merci envoyé.</span>' : ''}
      ${m.status === 'reported' ? '<span class="small">Signalé et bloqué. Cette personne ne peut plus t’écrire, quel que soit son pseudo.</span>' : ''}
    </article>`).join('')
    : `<div class="empty">${candy('#E2CFCB', 64)}<span>Pas encore de bonbon. Garde l’app ouverte, on te prévient dès qu’un compliment arrive.</span></div>`;
  const sent = S.sent.length ? `<h3 style="margin:12px 4px 0">Tes bonbons envoyés</h3>` + S.sent.map((m) => `<div class="card" style="gap:6px;padding:14px 16px">
      <span style="font-size:15px">« ${esc(m.custom_text || COMPLIMENTS[m.compliment_id] || '')} » à <strong>${esc(m.recipient_pseudo)}</strong></span>
      <span class="small">${timeAgo(m.created_at)}${m.has_voice ? (m.voice_heard ? ' · 🎙 note écoutée' : ' · 🎙 note pas encore écoutée') : ''}${m.has_photo ? (m.photo_seen ? ' · 📷 photo vue' : ' · 📷 photo pas encore vue') : ''}${m.thanked ? ' · <strong style="color:var(--accent-deep)">Merci reçu</strong>' : ''}</span>
    </div>`).join('') : '';
  const convs = S.convs.length ? `<h3 style="margin:0 4px">Vos petits échanges</h3>` + S.convs.map((c) => `<button class="card conv" data-a="openChat" data-sid="${esc(c.session_id)}">
      <span class="row" style="justify-content:space-between;width:100%"><strong style="font-size:18px">${esc(c.pseudo)}</strong>${convUnread(c) ? '<span class="dot-new" aria-label="Nouveau message"></span>' : ''}</span>
      <span class="small">${(c.last_phrase === null || c.last_phrase === undefined) && !c.last_body ? 'Vous vous êtes envoyé un bonbon : dites-vous un petit mot !' : (c.last_from_me ? 'Toi : ' : '') + esc(c.last_body || PHRASES[c.last_phrase] || '')}</span>
    </button>`).join('') : '';
  return `<div class="scroll">${convs}<h2 style="margin:${S.convs.length ? '12px' : '0'} 4px 0">Tes petits bonbons</h2>${rec}${sent}</div>`;
};

V.tab_chat = () => {
  const c = S.chat || {};
  const msgs = S.thread.length
    ? S.thread.map((m) => `<div class="bubble ${m.mine ? 'mine' : ''}">${esc(m.body || PHRASES[m.phrase_id] || '')}</div>`).join('')
    : `<p class="small" style="text-align:center;margin:20px 0">Vous vous êtes envoyé un bonbon tous les deux. Écris-lui ou choisis un petit mot ci-dessous 🍬</p>`;
  return `<div class="scroll chat">
    <div class="row" style="justify-content:space-between">
      <button class="link muted" data-a="tab" data-tab="inbox" style="display:flex;align-items:center;gap:6px">${ICON.back}Retour</button>
      <span class="warn-wrap">
        <button class="card-warn" data-a="cardMenu" data-k="chat" aria-label="Bloquer ou signaler ${esc(c.pseudo || '')}" aria-haspopup="menu" aria-expanded="${S.cardMenu === 'chat'}">${ICON.warn}</button>
        ${S.cardMenu === 'chat' ? `<div class="card-menu" role="menu">
          <button role="menuitem" data-a="askBlock" data-chat="1">Bloquer</button>
          <button role="menuitem" data-a="askReport" data-chat="1">Signaler</button>
        </div>` : ''}
      </span>
    </div>
    <div class="stack" style="gap:4px;padding:0 4px">
      <h2>${esc(c.pseudo || '')}</h2>
      <span class="small">${c.moods && c.moods.length ? esc(c.moods.join(' · ')) + ' · ' : ''}disparaît avec vos identités du jour</span>
    </div>
    <div class="bubbles" id="bubbles">${msgs}</div>
    <div class="phrases" role="group" aria-label="Choisis un petit mot">
      ${PHRASES.map((ph, i) => (i < PHRASES_FREE || isPremium()
        ? `<button type="button" class="chip" data-a="sendPhrase" data-i="${i}">${esc(ph)}</button>`
        : `<button type="button" class="chip locked" data-a="openPremium">${ICON.lockSmall}${esc(ph)}</button>`)).join('')}
      <form class="chat-input" data-f="chatText" novalidate>
        <input name="chatmsg" maxlength="200" autocomplete="off" placeholder="Écris un petit message…" aria-label="Ton message">
        <button class="btn small" type="submit" ${S.busy ? 'disabled' : ''}>Envoyer</button>
      </form>
      <span class="small" style="width:100%">${isPremium() ? 'Bienveillant, sans numéro, réseau social ni lien.' : 'Gratuit avec une personne de ta ville. Bienveillant, sans numéro, réseau social ni lien.'}</span>
    </div>
  </div>`;
};

// ---------- Moi : mon profil (ma carte) + paramètres ---------------------
// Ma carte telle que les autres la voient dans « Découvrir », avec de quoi la modifier
V.tab_me = () => (S.meSettings ? V.meSettings() : V.meProfile());

V.meProfile = () => {
  const st = S.status, s = st.session, pv = S.pvoice || {};
  const avatar = `<div class="avatar" style="--fill:${AVATAR_COLORS[0]}">${s.avatar && isPremium() ? pixelAvatar(s.avatar, 36) : esc((s.pseudo || '?').charAt(0).toUpperCase())}</div>`;
  let voice;
  if (pv.recording) voice = `<div class="voice-row"><span class="rec-dot" aria-hidden="true"></span><span><strong>Enregistrement…</strong> <span id="rec-secs">0</span> / ${pv.max} s</span></div>
      <button type="button" class="btn small dark" style="align-self:flex-start" data-a="stopPVoice">Arrêter</button>`;
  else if (pv.url) voice = `<audio controls preload="auto" src="${pv.url}" class="voice-preview"></audio>
      <div class="row"><button type="button" class="btn small" data-a="savePVoice" ${S.busy ? 'disabled' : ''}>Mettre sur ma carte</button><button type="button" class="btn small ghost" data-a="recPVoice">Recommencer</button><button type="button" class="link muted" data-a="dropPVoice">Annuler</button></div>`;
  else voice = `<div class="row"><button type="button" class="btn small soft" data-a="recPVoice">🎙 ${st.profile_voice ? 'Changer ma voix' : 'Ajouter ma voix'} · ${pvoiceMax()} s</button>${st.profile_voice ? '<button type="button" class="link muted" data-a="removePVoice">Retirer</button>' : ''}</div>`;
  const bio = S.editBio ? `<form class="stack" style="gap:10px" data-f="bio">
        <div class="field"><label for="bio">Quelques mots sur toi</label>
          <textarea id="bio" name="bio" rows="${isPremium() ? 3 : 2}" maxlength="${isPremium() ? 160 : 80}" placeholder="Ex. : je cherche le meilleur croissant du quartier">${esc(s.bio || '')}</textarea>
          <span class="small">${isPremium() ? '160' : '80'} caractères. Pas de numéro, de réseau social ni de lien.${isPremium() ? '' : ' <button type="button" class="link" style="font-size:inherit;padding:0;min-height:0" data-a="openPremium">160 avec Premium</button>'}</span></div>
        ${errorBox()}
        <div class="row"><button class="btn small" type="submit" ${S.busy ? 'disabled' : ''}>Enregistrer</button><button class="link muted" type="button" data-a="cancelBio">Annuler</button></div>
      </form>`
    : `${s.bio ? `<p class="bio">« ${esc(s.bio)} »</p>` : '<p class="small" style="margin:0">Pas encore de petits mots.</p>'}
       <button class="link" data-a="editBio" style="align-self:flex-start;min-height:32px">${s.bio ? 'Modifier mes quelques mots' : '+ Ajouter quelques mots'}</button>`;
  return `<div class="scroll">
    <div class="row" style="justify-content:space-between;padding:0 4px">
      <h2>Mon profil</h2>
      <button class="btn small ghost" data-a="meSettings" aria-label="Paramètres" style="min-width:44px;padding:0 12px">${ICON.gear} Paramètres</button>
    </div>
    <p class="small" style="margin:0 4px">C’est ta carte dans « Découvrir ». Photo et voix sont facultatives.</p>
    <article class="card pcard${st.profile_photo ? ' with-photo' : ''}">
      ${st.profile_photo ? `<div class="pcard-photo"><img src="${esc(st.profile_photo)}" alt="Ta photo floue" draggable="false"></div>` : ''}
      <div class="person">${avatar}
        <div class="stack" style="gap:3px;min-width:0"><span class="name">${esc(s.pseudo)}</span><span class="moods">${s.moods && s.moods.length ? esc(s.moods.join(' · ')) : 'Pas d’humeur affichée'}</span></div>
      </div>
      ${bio}
      <span class="small">Identité du jour · expire à ${new Date(s.expires_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
    </article>
    <div class="card" style="gap:12px">
      <span class="small">📷 Ma photo floue</span>
      <div class="row">
        <label class="btn small soft" for="pphoto-input">${S.pphotoBusy ? 'Vérification…' : st.profile_photo ? 'Changer la photo' : 'Ajouter une photo'}</label>
        ${st.profile_photo ? '<button type="button" class="link muted" data-a="removePPhoto">Retirer</button>' : ''}
        <input type="file" id="pphoto-input" accept="image/*" hidden>
      </div>
      <span class="small">Elle reste toujours floue : on n’y devine que des couleurs et une ambiance. Seul un minuscule aperçu quitte ton téléphone. Pas de nudité.</span>
    </div>
    <div class="card" style="gap:12px">
      <span class="small">🎙 Ma voix</span>
      ${voice}
      <span class="small">Elle s’écoute seulement si quelqu’un de ta ville appuie dessus. Bienveillante, sans numéro ni réseau social.${isPremium() ? '' : ' <button type="button" class="link" style="font-size:inherit;padding:0;min-height:0" data-a="openPremium">10 s avec Premium</button>'}</span>
    </div>
  </div>`;
};

V.meSettings = () => {
  const st = S.status;
  const tg = (key, label, hint) => `<button class="toggle" role="switch" aria-checked="${!!st[key]}" data-a="toggle" data-key="${key}"><span class="txt"><strong>${label}</strong><span>${hint}</span></span><span class="track"></span></button>`;
  return `<div class="scroll">
    <div class="row" style="justify-content:space-between">
      <button class="link muted" data-a="meProfile" style="display:flex;align-items:center;gap:6px">${ICON.back}Mon profil</button>
    </div>
    <h2 style="margin:0 4px">Paramètres</h2>
    <div class="card" style="gap:6px">
      <span class="small">Identité du jour</span>
      <button class="link" data-a="editIdentity" style="align-self:flex-start">Changer de pseudo, d’humeur ou de ville</button>
    </div>
    <div class="card" style="padding:6px 18px;gap:0">
      <span class="small" style="padding-top:12px">Ce que je reçois</span>
      ${tg('receive_on', 'Recevoir des bonbons', 'Si c’est coupé, tu n’apparais plus dans « Découvrir ».')}
      ${tg('accept_custom', 'Recevoir des mots personnalisés', 'Écrits par des membres Premium, vérifiés avant d’arriver.')}
      ${tg('accept_voice', 'Recevoir des notes vocales', '8 s (15 s pour les membres Premium), écoutables une seule fois.')}
      ${tg('accept_photo', 'Recevoir des photos floues', 'Envoyées par des membres Premium, révélées 10 secondes si tu le choisis.')}
    </div>
    <div class="card" style="padding:6px 18px;gap:0">
      <span class="small" style="padding-top:12px">Sons</span>
      <button class="toggle" role="switch" aria-checked="${SOUND.on}" data-a="toggleSound" data-key="on"><span class="txt"><strong>Sons de l’app</strong><span>Ouverture et bonbon reçu.</span></span><span class="track"></span></button>
      <button class="toggle" role="switch" aria-checked="${SOUND.on && SOUND.clicks}" data-a="toggleSound" data-key="clicks" ${SOUND.on ? '' : 'disabled'}><span class="txt"><strong>Sons des clics</strong><span>Un petit bruit à chaque appui.</span></span><span class="track"></span></button>
    </div>
    ${isPremium() ? V.premiumCard() : `<div class="premium${premiumReady() ? '' : ' soon'}">
      <span class="kicker">PREMIUM · ${premiumReady() ? PREMIUM_PRICE : 'BIENTÔT'}</span>
      <h3>Tes propres mots, des bonbons animés, plus de bonbons chaque jour</h3>
      <p>${premiumReady() ? 'L’app de base reste gratuite. ' + esc(PREMIUM_SOON) : 'Bientôt… En attendant, toute l’app est gratuite 🍬'}</p>
      <button class="btn small" style="align-self:flex-start" data-a="openPremium">${premiumReady() ? 'Découvrir' : 'Voir ce qui arrive'}</button>
    </div>`}
    <div class="events"><span class="events-txt"><strong>Les rencontres live 🍬</strong><span>${esc(EVENTS_MSG)}</span></span></div>
    <button class="btn ghost" data-a="leave">Partir sans laisser de trace</button>
    <div class="stack" style="gap:0">
      <button class="link muted" data-a="share">Partager Petit Bonbon</button>
      ${logoutBtn('')}
      <button class="link muted" data-a="deleteAccount">${isAnon() ? 'Effacer toutes mes données de cet appareil' : 'Supprimer mon compte et mes données'}</button>
    </div>
    ${legalLinks()}
  </div>`;
};

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '');
function portalLink() {
  let u; try { u = new URL(C.PREMIUM_PORTAL_LINK); } catch (_) { return '#'; }
  if (S.user && S.user.email) u.searchParams.set('prefilled_email', S.user.email);
  return u.toString();
}
function subscribeLink() {
  let u; try { u = new URL(C.PREMIUM_PAYMENT_LINK); } catch (_) { return '#'; }
  if (S.user) u.searchParams.set('client_reference_id', S.user.id);
  return u.toString();
}

V.premiumCard = () => {
  const st = S.status, s = st.session || {};
  const end = st.sub_period_end ? (st.sub_cancel_at_end ? `Se termine le ${fmtDate(st.sub_period_end)}` : `Renouvellement le ${fmtDate(st.sub_period_end)}`) : 'Abonnement actif';
  return `<div class="premium">
    <span class="kicker">PREMIUM ACTIF</span>
    <span class="small">${esc(end)}</span>
    <span class="label">Ton code Premium</span>
    <div class="code-box"><strong>${esc(S.premiumCode || '…')}</strong><button class="btn small ghost" data-a="copyCode">Copier</button></div>
    <span class="small">Note-le précieusement : il te permet de retrouver Premium sur un autre téléphone, ou si tu vides ton navigateur.</span>
    <span class="label">Ton avatar</span>
    <div class="chips">
      <button type="button" class="chip" aria-pressed="${!s.avatar}" data-a="setAvatar" data-n="0">Initiale</button>
      ${PIXEL_AVATARS.map((av, n) => (av ? `<button type="button" class="chip avatar-chip" aria-pressed="${s.avatar === n}" aria-label="${esc(av.name)}" data-a="setAvatar" data-n="${n}">${pixelAvatar(n, 28)}</button>` : '')).join('')}
    </div>
    <span class="label">Ton thème</span>
    <div class="chips">${THEMES.map((t) => `<button type="button" class="chip" aria-pressed="${document.documentElement.dataset.theme === t.id}" data-a="setTheme" data-theme="${t.id}"><span class="swatch" style="background:${t.color}"></span>${esc(t.name)}</button>`).join('')}</div>
    <p>${esc(PREMIUM_SOON)}</p>
    ${C.PREMIUM_PORTAL_LINK ? `<a class="btn small ghost" style="align-self:flex-start" href="${esc(portalLink())}" target="_blank" rel="noopener">Gérer / résilier mon abonnement</a>
    <span class="small">Stripe te demandera l’e-mail utilisé au paiement et t’enverra un lien.</span>` : ''}
  </div>`;
};

// ---------- Carte story (Instagram, Snapchat, WhatsApp…) ----------------
// 1er appui : l'image est dessinée et affichée en aperçu.
// 2e appui : « Partager » ouvre le menu du téléphone (Instagram › Story…).
// Deux temps, car iPhone n'autorise le partage que juste après un appui.
const APP_URL = 'petitbonbon.github.io';
V.storySheet = () => `<div class="sheet-back" data-a="storyClose">
  <div class="sheet" role="dialog" aria-modal="true" aria-label="Partager en story" data-stop="1">
    <h3 style="margin:0">Ton bonbon en story 🍬</h3>
    <img class="story-preview" src="${esc(S.story.url)}" alt="Aperçu de la story : « ${esc(S.story.text)} »">
    <p class="small" style="margin:0">Dans Instagram, ajoute le sticker <strong>Lien 🔗</strong> avec ${APP_URL} pour que tes amis trouvent l’app.</p>
    ${navigator.canShare && navigator.canShare({ files: [S.story.file] }) ? '<button class="btn" data-a="storyShare">Partager</button>' : ''}
    <a class="btn ghost" href="${esc(S.story.url)}" download="petit-bonbon.png">Enregistrer l’image</a>
    <button class="link muted" data-a="storyClose">Fermer</button>
  </div>
</div>`;

function wrapLines(g, text, maxW) {
  const lines = []; let line = '';
  text.split(/[ \t\n]+/).forEach((w) => {
    const t = line ? line + ' ' + w : w;
    if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  });
  if (line) lines.push(line);
  return lines;
}
// Bloc aux coins crantés + ombre en aplat, comme dans l'app
function pixelBox(g, x, y, w, h, fill, shade, u) {
  g.fillStyle = shade;
  g.fillRect(x + u, y + 2 * u, w - 2 * u, h); g.fillRect(x, y + 3 * u, w, h - 4 * u);
  g.fillStyle = fill;
  g.fillRect(x + u, y, w - 2 * u, h); g.fillRect(x, y + u, w, h - 2 * u);
}
async function storyImage(text, city) {
  const W = 1080, H = 1920;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  try { await Promise.all([document.fonts.load('700 70px "Pixelify Sans"'), document.fonts.load('30px "Press Start 2P"')]); } catch (_) {}
  // Fond crème à pois
  g.fillStyle = '#FFF8F0'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#F6E7D6';
  for (let y = 24; y < H; y += 48) for (let x = 24; x < W; x += 48) g.fillRect(x - 3, y - 3, 6, 6);
  // Bonbon pixel
  const px = 24, cx = (W - 22 * px) / 2, cy = 300;
  CANDY_PIXELS.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    g.fillStyle = ch === '#' ? '#FF9EC4' : ch === 'o' ? 'rgba(255,255,255,0.55)' : '#FFFFFF';
    g.fillRect(cx + x * px, cy + y * px, px, px);
  }));
  // Phrase du compliment, dans une bulle lilas
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  // La taille du texte s'adapte pour que les mots longs (Premium) tiennent
  let size = 70, lines, lh;
  for (;;) {
    g.font = `700 ${size}px "Pixelify Sans", system-ui, sans-serif`;
    lines = wrapLines(g, '«\u00a0' + text.replace(/ ([!?:;»])/g, '\u00a0$1') + '\u00a0»', 760); lh = Math.round(size * 1.3);
    if (200 + lines.length * lh + 110 <= 720 || size <= 36) break;
    size -= 6;
  }
  const boxH = 200 + lines.length * lh;
  const boxTop = Math.round(660 + (720 - boxH - 110) / 2);
  pixelBox(g, 110, boxTop, 860, boxH, '#ECE4FF', '#CDBDF2', 12);
  g.fillStyle = '#B0245A'; g.font = '26px "Press Start 2P", monospace';
  g.fillText('UN·E INCONNU·E M’A DIT', W / 2, boxTop + 90);
  g.fillStyle = '#3A2D4D'; g.font = `700 ${size}px "Pixelify Sans", system-ui, sans-serif`;
  lines.forEach((l, i) => g.fillText(l, W / 2, boxTop + 110 + lh * 0.9 + i * lh));
  if (city) {
    g.font = '500 48px "Pixelify Sans", system-ui, sans-serif'; g.fillStyle = '#6E6280';
    g.fillText("📍 " + city, W / 2, boxTop + boxH + 95);
  }
  // Signature et lien (au-dessus de la zone des boutons Instagram)
  g.fillStyle = '#3A2D4D'; g.font = '40px "Press Start 2P", monospace';
  g.fillText('PETIT BONBON', W / 2, 1480);
  g.font = '500 42px "Pixelify Sans", system-ui, sans-serif'; g.fillStyle = '#6E6280';
  g.fillText('Des inconnus. Des compliments.', W / 2, 1552);
  pixelBox(g, 230, 1600, 620, 104, '#FF9EC4', '#F07DAA', 10);
  g.fillStyle = '#3A2D4D'; g.font = '700 46px "Pixelify Sans", system-ui, sans-serif';
  g.fillText(APP_URL, W / 2, 1668);
  const blob = await new Promise((ok) => c.toBlob(ok, 'image/png'));
  return blob;
}

V.premiumSheet = () => {
  const ready = !!C.PREMIUM_PAYMENT_LINK;
  const head = `<span class="small" style="font-weight:700;letter-spacing:1px;color:var(--pink-deep)">PREMIUM · ${ready ? PREMIUM_PRICE.toUpperCase() : 'BIENTÔT'}</span>
    <h3>Offre plus qu’un bonbon</h3>
    <div class="bullets" style="margin:6px 0">${PREMIUM_FEATURES.map((f) => `<div>${esc(f.long)}</div>`).join('')}</div>
    <p class="small" style="margin:0">${esc(PREMIUM_SOON)}</p>`;
  let body;
  if (!ready) {
    body = `<p class="note" style="margin:0">Premium arrive très bientôt. En attendant, toute l’app de base est gratuite.</p>
      <button class="btn" data-a="closePremium">D’accord</button>`;
  } else if (S.premiumMode === 'code') {
    body = `<p class="note" style="margin:0">Bienvenue dans Premium 🍬 Voici ton code. Note-le : il te permet de retrouver Premium sur un autre téléphone.</p>
      <div class="code-box"><strong>${esc(S.premiumCode || '…')}</strong><button class="btn small ghost" data-a="copyCode">Copier</button></div>
      <button class="btn" data-a="closePremium">C’est noté</button>`;
  } else if (isPremium()) {
    body = `<p class="note" style="margin:0">Tu es Premium. Merci 🍬 Tout se règle dans l’onglet « Moi ».</p>
      <button class="btn" data-a="closePremium">Super</button>`;
  } else if (S.premiumMode === 'restore') {
    body = `<form class="stack" data-f="restore" novalidate>
        <div class="field"><label for="code">Ton code Premium</label><input id="code" name="code" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="BONBON-XXXX-XXXX-XXXX"></div>
        ${errorBox()}
        <button class="btn" type="submit" ${S.busy ? 'disabled' : ''}>Retrouver mon Premium</button>
      </form>
      <p class="small" style="margin:0">Code perdu ? Écris à ${esc(C.CONTACT_EMAIL || '')} avec ton reçu de paiement Stripe.</p>
      <button class="link muted" data-a="premiumMode" data-mode="join">Retour</button>`;
  } else {
    body = `<p class="small" style="margin:0">Pas de compte à créer : Premium est lié à ce téléphone, et tu recevras un <strong>code</strong> pour le retrouver ailleurs.</p>
      <form class="stack" data-f="subscribe" novalidate>
        <label class="check"><input type="checkbox" name="terms"><span>J’accepte les <a href="cgu.html#premium" target="_blank">conditions de l’abonnement</a> : ${PREMIUM_PRICE}, sans engagement, résiliable à tout moment en ligne.</span></label>
        <label class="check"><input type="checkbox" name="waive"><span>Je veux accéder à Premium tout de suite. Si je me rétracte dans les 14 jours, je paierai seulement la part déjà utilisée.</span></label>
        ${errorBox()}
        <button class="btn" type="submit">S’abonner · ${PREMIUM_PRICE}</button>
      </form>
      <p class="small" style="margin:0">Paiement sécurisé par Stripe (carte, Apple Pay, Google Pay, PayPal). Petit Bonbon ne voit jamais ta carte. Ton reçu t’est envoyé par Stripe.</p>
      <button class="link muted" data-a="premiumMode" data-mode="restore">J’ai déjà Premium sur un autre appareil</button>`;
  }
  return `<div class="sheet-back" data-a="closePremium">
  <div class="sheet" role="dialog" aria-modal="true" aria-label="Premium" data-stop="1">${head}${body}</div>
</div>`;
};

V.reportSheet = () => {
  const r = S.report;
  if (r.mode === 'block') return `<div class="sheet-back" data-a="closeReport">
  <div class="sheet" role="dialog" aria-modal="true" aria-label="Bloquer" data-stop="1">
    <h3 style="margin-bottom:4px">Bloquer ${esc(r.pseudo)} ?</h3>
    <p class="small" style="margin:0">Vous ne vous verrez plus et ne pourrez plus vous écrire. Personne n’est prévenu.</p>
    <button class="btn" data-a="blockOnly">Bloquer</button>
    <button class="link muted" style="align-self:center" data-a="closeReport">Annuler</button>
  </div>
</div>`;
  if (r.mode === 'report') return `<div class="sheet-back" data-a="closeReport">
  <div class="sheet" role="dialog" aria-modal="true" aria-label="Signaler" data-stop="1">
    <h3 style="margin-bottom:4px">Signaler ${esc(r.pseudo)}</h3>
    <p class="small" style="margin:0 0 6px">Qu’est-ce qui ne va pas ? La personne est bloquée et notre équipe est prévenue.</p>
    ${REASONS.map((x) => `<button class="reason" data-a="confirmReport" data-reason="${esc(x)}">${esc(x)}</button>`).join('')}
    <button class="link muted" style="align-self:center" data-a="closeReport">Annuler</button>
  </div>
</div>`;
  return `<div class="sheet-back" data-a="closeReport">
  <div class="sheet" role="dialog" aria-modal="true" aria-label="Signaler" data-stop="1">
    <h3 style="margin-bottom:4px">${esc(S.report.pseudo)}</h3>
    <button class="btn ghost" data-a="blockOnly">Bloquer, sans signaler</button>
    <p class="small" style="margin:0">Vous ne vous verrez plus et ne pourrez plus vous écrire. Personne n’est prévenu.</p>
    <h3 style="margin:14px 0 2px">Ou signaler un problème</h3>
    <p class="small" style="margin:0 0 6px">La personne est bloquée et notre équipe est prévenue.</p>
    ${REASONS.map((r) => `<button class="reason" data-a="confirmReport" data-reason="${esc(r)}">${esc(r)}</button>`).join('')}
    <button class="link muted" style="align-self:center" data-a="closeReport">Annuler</button>
  </div>
</div>`;
};

// ---------- Rendu ------------------------------------------------------
let lastView = null;
function render() {
  const fn = V[S.view] || V.welcome;
  // Garde ce que la personne a déjà tapé quand l'écran se redessine (ex. après une erreur)
  const keep = {};
  if (lastView === S.view) {
    $app.querySelectorAll('input[name], textarea[name]').forEach((el) => {
      keep[el.name] = el.type === 'checkbox' ? el.checked : el.value;
    });
  }
  $app.innerHTML = fn();
  lastView = S.view;
  if (S.view === 'main' && S.tab === 'inbox') playNewEffects();
  Object.keys(keep).forEach((name) => {
    const el = $app.querySelector(`[name="${name}"]`);
    if (!el || el.dataset.bind) return; // les champs liés à S.form ont déjà la bonne valeur
    if (el.type === 'checkbox') el.checked = keep[name];
    else if (!el.value) el.value = keep[name];
  });
  document.title = S.banner ? `(${S.banner}) Petit Bonbon` : 'Petit Bonbon';
}

function payLink() {
  let u;
  try { u = new URL(C.STRIPE_PAYMENT_LINK); } catch (_) { return '#'; }
  if (S.user) {
    u.searchParams.set('client_reference_id', S.user.id);
    if (S.user.email) u.searchParams.set('prefilled_email', S.user.email);
  }
  return u.toString();
}

// ---------- Logique ----------------------------------------------------
async function route() {
  S.error = '';
  if (!CONFIGURED) { S.view = 'setup'; return render(); }
  if (!S.user) { if (!['auth', 'checkmail'].includes(S.view)) S.view = 'welcome'; return render(); }
  try {
    S.status = await rpc('my_status');
  } catch (e) {
    S.view = 'welcome'; S.error = errMsg(e); return render();
  }
  const st = S.status;
  applyTheme();
  if (st.banned) S.view = 'banned';
  else if (!st.adult) S.view = 'adult';
  else if (st.paywall && !st.paid) S.view = 'paywall';
  else if (!st.session || S.view === 'identity') S.view = 'identity';
  else { S.view = 'main'; }
  render();
  if (S.view === 'main') { loadData(); cleanupVoices(false); }
}

async function loadPremiumCode() {
  if (!isPremium()) { S.premiumCode = null; return; }
  try { S.premiumCode = await rpc('my_premium_code'); } catch (_) {}
}

async function loadData() {
  try {
    const [people, inbox, sent, convs] = await Promise.all([rpc('discover'), rpc('inbox'), rpc('sent'), rpc('conversations')]);
    S.people = people || []; S.peopleLoaded = true;
    noteInbox(inbox || []);
    S.sent = sent || [];
    noteConvs(convs || []);
    if (isPremium() && !S.premiumCode) await loadPremiumCode();
    if (S.view === 'main') render();
  } catch (e) { toast(errMsg(e)); }
}

function noteInbox(list) {
  const ids = new Set(list.map((m) => m.id));
  if (S.seenInbox) {
    const fresh = list.filter((m) => !S.seenInbox.has(m.id) && m.status === 'open').length;
    if (fresh) SOUND.play('bonbon');
    if (fresh && S.tab !== 'inbox') S.banner += fresh;
  }
  S.seenInbox = ids;
  S.inbox = list;
}

// ---------- Notes vocales (Premium) ------------------------------------
// Enregistrées sur le téléphone (15 s max), déposées dans un espace privé,
// écoutables une seule fois par le destinataire, puis effacées.
const SILENT = 'data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YSADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';
function dropVoiceNow(key = 'voice') {
  const v = S[key];
  if (v) {
    if (v.recording) { v.cancel = true; try { v.recorder.stop(); } catch (_) {} }
    if (v.url) URL.revokeObjectURL(v.url);
    clearInterval(v.timer);
  }
  S[key] = null;
}
async function startRecording(key = 'voice', max = voiceMax()) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
    return toast('Ton navigateur ne permet pas d’enregistrer de note vocale.');
  }
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
  catch (_) { return toast('Le micro est refusé. Autorise-le pour Petit Bonbon dans les réglages du navigateur.'); }
  dropVoiceNow(key);
  const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
    .find((t) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t));
  let rec;
  try { rec = new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: 48000 } : { audioBitsPerSecond: 48000 }); }
  catch (_) { rec = new MediaRecorder(stream); }
  const chunks = [];
  const v = { recording: true, recorder: rec, start: Date.now(), stream, max };
  S[key] = v;
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  rec.onstop = () => {
    stream.getTracks().forEach((t) => t.stop());
    clearInterval(v.timer);
    if (v.cancel || S[key] !== v) return;
    const blob = new Blob(chunks, { type: (rec.mimeType || type || 'audio/webm').split(';')[0] });
    if (blob.size < 1500) { S[key] = null; toast('La note est trop courte, réessaie.'); return render(); }
    S[key] = { blob, url: URL.createObjectURL(blob) };
    render();
  };
  rec.start(250);
  v.timer = setInterval(() => {
    const secs = Math.floor((Date.now() - v.start) / 1000);
    const el = document.getElementById('rec-secs');
    if (el) el.textContent = String(Math.min(secs, v.max));
    if (Date.now() - v.start >= v.max * 1000) stopRecording(key);
  }, 200);
  render();
}
function stopRecording(key = 'voice') {
  const v = S[key];
  if (v && v.recording && v.recorder.state !== 'inactive') { v.recording = false; v.recorder.stop(); }
}
async function uploadVoice(blob, prefix = '') {
  const base = (blob.type || 'audio/webm').split(';')[0];
  const ext = /mp4|m4a|aac/.test(base) ? 'm4a' : /ogg/.test(base) ? 'ogg' : /mpeg/.test(base) ? 'mp3' : 'webm';
  const path = `${S.user.id}/${prefix}${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from('vocaux').upload(path, blob, { contentType: base, upsert: false });
  if (error) throw error;
  return path;
}
function playVoiceOnce(id) {
  if (S.playing) return;
  // Sur iPhone, le son doit démarrer dans le geste : on « réveille » le lecteur tout de suite
  const audio = new Audio();
  audio.src = SILENT;
  audio.play().catch(() => {});
  S.playing = id; render();
  let url = null;
  const finish = (heard) => {
    if (url) URL.revokeObjectURL(url);
    const m = S.inbox.find((x) => x.id === id);
    if (m && heard) m.voice_heard = true;
    S.playing = null; render();
    cleanupVoices(true);
  };
  (async () => {
    try {
      const path = await rpc('open_voice', { p_bonbon_id: id });
      const { data, error } = await sb.storage.from('vocaux').download(path);
      if (error) throw error;
      url = URL.createObjectURL(data);
      audio.onended = () => finish(true);
      audio.onerror = () => { toast('Cette note ne peut pas être lue sur ce téléphone.'); finish(true); };
      audio.src = url;
      await audio.play();
    } catch (e) {
      toast(errMsg(e));
      finish(/HEARD/.test((e && e.message) || ''));
    }
  })();
}
// Demande au serveur d'effacer les vocaux écoutés ou expirés (au plus toutes les 10 min, sauf après une écoute)
function cleanupVoices(force) {
  if (!sb) return;
  let last = 0; try { last = +localStorage.getItem('pb_voice_clean') || 0; } catch (_) {}
  if (!force && Date.now() - last < 10 * 60 * 1000) return;
  try { localStorage.setItem('pb_voice_clean', String(Date.now())); } catch (_) {}
  const run = () => sb.functions.invoke('nettoyage-vocaux').catch(() => {});
  if (force) setTimeout(run, 6 * 60 * 1000); // juste après la fenêtre d'écoute de 5 min
  else run();
}

// ---------- Photos floues (Premium) -----------------------------------
// La photo est réduite et ré-encodée sur le téléphone (ce qui retire sa position GPS
// et ses autres métadonnées), vérifiée par un filtre anti-nudité qui tourne sur le
// téléphone, puis envoyée avec un aperçu minuscule qui ne montre que des couleurs.
let nsfwModel = null;
function loadNsfw() {
  if (nsfwModel) return nsfwModel;
  nsfwModel = new Promise((resolve, reject) => {
    const go = () => window.nsfwjs.load('./vendor/nsfw/model/model.json').then(resolve, reject);
    if (window.nsfwjs) return go();
    const sc = document.createElement('script');
    sc.src = './vendor/nsfw/nsfwjs.min.js';
    sc.onload = go; sc.onerror = () => reject(new Error('NSFW_LOAD'));
    document.head.appendChild(sc);
  }).catch((e) => { nsfwModel = null; throw e; });
  return nsfwModel;
}
function dropPhotoNow() {
  if (S.photo && S.photo.url) URL.revokeObjectURL(S.photo.url);
  S.photo = null;
}
const canvasBlob = (c, q) => new Promise((res) => c.toBlob(res, 'image/jpeg', q));
async function decodeImage(file) {
  if (window.createImageBitmap) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (_) {}
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    return img;
  } finally { URL.revokeObjectURL(url); }
}
async function handlePhoto(file) {
  if (!isPremium()) return A.openPremium();
  if (!/^image\//.test(file.type || 'image/')) return toast('Choisis une image.');
  dropPhotoNow();
  const mine = { checking: true };
  S.photo = mine; render();
  try {
    const img = await decodeImage(file);
    const w0 = img.width, h0 = img.height, k = Math.min(1, 1280 / Math.max(w0, h0));
    const c = document.createElement('canvas');
    c.width = Math.round(w0 * k); c.height = Math.round(h0 * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    // Filtre anti-nudité (sur le téléphone, rien n'est envoyé pour la vérification)
    let preds;
    try { preds = await (await loadNsfw()).classify(c); }
    catch (_) { throw new Error('La vérification de la photo n’a pas pu se faire. Vérifie ta connexion et réessaie.'); }
    const p = Object.fromEntries(preds.map((x) => [x.className, x.probability]));
    if ((p.Porn || 0) + (p.Hentai || 0) > 0.4 || (p.Sexy || 0) > 0.6) {
      throw new Error('Cette photo ne peut pas être envoyée : pas de nudité ni de photo suggestive sur Petit Bonbon.');
    }
    const blob = await canvasBlob(c, 0.82);
    // Aperçu flou : 16 pixels de large, on n'y devine que des couleurs
    const t = document.createElement('canvas');
    t.width = 16; t.height = Math.max(1, Math.round(16 * c.height / c.width));
    t.getContext('2d').drawImage(c, 0, 0, t.width, t.height);
    const thumb = t.toDataURL('image/jpeg', 0.5);
    if (S.photo !== mine) return;
    S.photo = { blob, url: URL.createObjectURL(blob), thumb };
  } catch (e) {
    if (S.photo === mine) S.photo = null;
    toast(e && e.message && !/^[A-Z_]+$/.test(e.message) ? e.message : 'Cette photo ne peut pas être utilisée.');
  }
  render();
}
async function handleProfilePhoto(file) {
  if (!/^image\//.test(file.type || 'image/')) return toast('Choisis une image.');
  if (S.pphotoBusy) return;
  S.pphotoBusy = true; render();
  try {
    const img = await decodeImage(file);
    const w0 = img.width, h0 = img.height, k = Math.min(1, 1280 / Math.max(w0, h0));
    const c = document.createElement('canvas');
    c.width = Math.round(w0 * k); c.height = Math.round(h0 * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    let preds;
    try { preds = await (await loadNsfw()).classify(c); }
    catch (_) { throw new Error('La vérification de la photo n’a pas pu se faire. Vérifie ta connexion et réessaie.'); }
    const p = Object.fromEntries(preds.map((x) => [x.className, x.probability]));
    if ((p.Porn || 0) + (p.Hentai || 0) > 0.4 || (p.Sexy || 0) > 0.6) {
      throw new Error('Cette photo ne peut pas être utilisée : pas de nudité ni de photo suggestive sur Petit Bonbon.');
    }
    // 24 pixels de large : impossible d'y reconnaître un visage
    const t = document.createElement('canvas');
    t.width = 24; t.height = Math.max(1, Math.min(48, Math.round(24 * c.height / c.width)));
    t.getContext('2d').drawImage(c, 0, 0, t.width, t.height);
    S.status = await rpc('set_profile_photo', { p_thumb: t.toDataURL('image/jpeg', 0.6) });
    toast('Ta photo floue est sur ta carte 🍬');
  } catch (e) {
    toast(e && e.message && !/^[A-Z_]+$/.test(e.message) && !/function|schema/i.test(e.message) ? e.message : errMsg(e));
  }
  S.pphotoBusy = false; render();
}
// Écouter le vocal d'une carte (sur appui seulement)
function playProfileVoice(i) {
  const p = S.people[i];
  if (!p || !p.profile_voice || (S.playingP !== undefined && S.playingP !== null)) return;
  const audio = new Audio();
  audio.src = SILENT; audio.play().catch(() => {});   // iPhone : le son démarre dans le geste
  S.playingP = i; render();
  let url = null;
  const finish = () => { if (url) URL.revokeObjectURL(url); S.playingP = null; render(); };
  (async () => {
    try {
      const { data, error } = await sb.storage.from('vocaux').download(p.profile_voice);
      if (error) throw error;
      url = URL.createObjectURL(data);
      audio.onended = finish;
      audio.onerror = () => { toast('Cette voix ne peut pas être lue sur ce téléphone.'); finish(); };
      audio.src = url;
      await audio.play();
    } catch (e) { toast('Cette voix n’est plus disponible.'); finish(); }
  })();
}

async function uploadPhoto(blob) {
  const path = `${S.user.id}/${crypto.randomUUID()}.jpg`;
  const { error } = await sb.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  return path;
}
async function revealPhotoOnce(id) {
  if (S.revealing) return;
  S.revealing = id; render();
  let url = null;
  try {
    const path = await rpc('open_photo', { p_bonbon_id: id });
    const { data, error } = await sb.storage.from('photos').download(path);
    if (error) throw error;
    url = URL.createObjectURL(data);
  } catch (e) {
    toast(errMsg(e));
    S.revealing = null;
    if (/SEEN/.test((e && e.message) || '')) { const m = S.inbox.find((x) => x.id === id); if (m) m.photo_seen = true; }
    return render();
  }
  const view = document.createElement('div');
  view.className = 'photo-view';
  view.setAttribute('role', 'dialog');
  view.setAttribute('aria-label', 'Photo, visible ' + PHOTO_SECONDS + ' secondes');
  view.innerHTML = `<img src="${url}" alt="Photo reçue" draggable="false"><div class="photo-count"><span id="photo-secs">${PHOTO_SECONDS}</span><small>Touche pour fermer</small></div>`;
  document.body.appendChild(view);
  const t0 = Date.now();
  let closed = false;
  const close = () => {
    if (closed) return; closed = true;
    clearInterval(tick);
    document.removeEventListener('visibilitychange', onHide);
    view.remove(); URL.revokeObjectURL(url);
    const m = S.inbox.find((x) => x.id === id);
    if (m) { m.photo_seen = true; m.photo_thumb = null; }
    S.revealing = null; render();
    cleanupVoices(true);
  };
  const onHide = () => { if (document.hidden) close(); };   // quitter l'app referme la photo
  document.addEventListener('visibilitychange', onHide);
  view.addEventListener('click', close);
  const tick = setInterval(() => {
    const left = PHOTO_SECONDS - Math.floor((Date.now() - t0) / 1000);
    const el = document.getElementById('photo-secs'); if (el) el.textContent = String(Math.max(0, left));
    if (left <= 0) close();
  }, 200);
}

// ---------- Bonbons animés (Premium) -----------------------------------
// Des petites formes en pixel art qui jaillissent à l'ouverture d'un bonbon.
const FX_SHAPES = {
  heart: ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'],
  star: ['..#..', '..#..', '#####', '.###.', '.#.#.'],
  dot: ['##', '##'],
};
const FX_COLORS = {
  1: ['#FF9EC4', '#F07DAA', '#B0245A', '#FFE0EC'],
  2: ['#FFC93C', '#F5A623', '#FF9EC4', '#E8B400'],
  3: ['#FF9EC4', '#C6F1DF', '#FFF1A8', '#ECE4FF', '#FFE3CC', '#9EDCC3'],
};
const fxSvg = (shape, color, size) => {
  const g = FX_SHAPES[shape], w = g[0].length, h = g.length;
  let r = '';
  g.forEach((row, y) => [...row].forEach((c, x) => { if (c === '#') r += `<rect x="${x}" y="${y}" width="1.02" height="1.02"/>`; }));
  return `<svg width="${size}" height="${Math.round(size * h / w)}" viewBox="0 0 ${w} ${h}" fill="${color}" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
};
function playEffect(effect) {
  if (!effect || !FX_COLORS[effect] || !document.body.animate) return;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const layer = document.createElement('div');
  layer.className = 'fx-layer';
  document.body.appendChild(layer);
  const W = window.innerWidth, H = window.innerHeight;
  const shape = effect === 1 ? 'heart' : effect === 2 ? 'star' : 'dot';
  const colors = FX_COLORS[effect];
  const n = reduce ? 1 : (effect === 3 ? 46 : 26);
  let done = 0;
  for (let i = 0; i < n; i++) {
    const el = document.createElement('div');
    el.className = 'fx-bit';
    const size = reduce ? 64 : (effect === 3 ? 8 + Math.random() * 6 : 16 + Math.random() * 18);
    el.innerHTML = fxSvg(shape, colors[i % colors.length], size);
    layer.appendChild(el);
    let frames, opts;
    if (reduce) {
      el.style.left = `${W / 2 - 32}px`; el.style.top = `${H / 2 - 32}px`;
      frames = [{ opacity: 0, transform: 'scale(.8)' }, { opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1)' }];
      opts = { duration: 1200, easing: 'ease-out' };
    } else if (effect === 3) {
      // confettis : tombent du haut en tournoyant
      const x = Math.random() * W, drift = (Math.random() - 0.5) * 160, rot = (Math.random() - 0.5) * 900;
      el.style.left = `${x}px`; el.style.top = '-20px';
      frames = [{ transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
                { transform: `translate(${drift}px, ${H * 0.7}px) rotate(${rot}deg)`, opacity: 1, offset: 0.8 },
                { transform: `translate(${drift * 1.2}px, ${H + 40}px) rotate(${rot * 1.2}deg)`, opacity: 0 }];
      opts = { duration: 1800 + Math.random() * 1200, delay: Math.random() * 400, easing: 'cubic-bezier(.25,.6,.4,1)' };
    } else {
      // cœurs et étoiles : jaillissent du centre, puis s'envolent ou retombent
      const a = Math.random() * Math.PI * 2, d = 90 + Math.random() * Math.min(W, H) * 0.35;
      const dx = Math.cos(a) * d, dy = Math.sin(a) * d * 0.8;
      const end = effect === 1 ? -H * 0.35 - Math.random() * 120 : 140 + Math.random() * 120;
      el.style.left = `${W / 2 - size / 2}px`; el.style.top = `${H * 0.45}px`;
      frames = [{ transform: 'translate(0,0) scale(.2)', opacity: 0 },
                { transform: `translate(${dx}px, ${dy}px) scale(1)`, opacity: 1, offset: 0.35 },
                { transform: `translate(${dx * 1.15}px, ${dy + end}px) scale(${effect === 2 ? 0.5 : 0.9})`, opacity: 0 }];
      opts = { duration: 1700 + Math.random() * 900, delay: Math.random() * 250, easing: 'cubic-bezier(.2,.7,.3,1)' };
    }
    const anim = el.animate(frames, { ...opts, fill: 'both' });
    anim.onfinish = () => { if (++done >= n) layer.remove(); };
  }
  setTimeout(() => layer.remove(), 5000); // filet de sécurité
}
// Joue l'animation d'un bonbon reçu la première fois qu'on ouvre « Ma box »
function playNewEffects() {
  let played = [];
  try { played = JSON.parse(localStorage.getItem('pb_fx_played') || '[]'); } catch (_) {}
  const todo = (S.inbox || []).filter((m) => m.effect && m.status !== 'reported' && !played.includes(m.id));
  if (!todo.length) return;
  played = played.concat(todo.map((m) => m.id)).slice(-200);
  try { localStorage.setItem('pb_fx_played', JSON.stringify(played)); } catch (_) {}
  setTimeout(() => playEffect(todo[0].effect), 250);
}

function noteConvs(list) {
  const before = new Map(S.convs.map((c) => [c.session_id, c.last_at]));
  const fresh = list.some((c) => !c.last_from_me && c.last_at && before.has(c.session_id) && before.get(c.session_id) !== c.last_at
    && !(S.tab === 'chat' && S.chat && S.chat.session_id === c.session_id));
  const opened = S.convs.length && list.some((c) => !before.has(c.session_id));
  if (fresh || opened) SOUND.play('open');
  if (opened && S.tab !== 'chat') toast('Un petit échange vient de s’ouvrir dans « Ma box » 🍬');
  S.convs = list;
}

async function loadThread(scroll) {
  if (!S.chat) return;
  try {
    const t = await rpc('thread', { p_session_id: S.chat.session_id });
    const changed = (t || []).length !== S.thread.length;
    S.thread = t || [];
    const c = S.convs.find((x) => x.session_id === S.chat.session_id);
    if (c) markSeen(c);
    if (S.tab === 'chat' && (changed || scroll)) { render(); const b = document.getElementById('bubbles'); if (b) b.lastElementChild && b.lastElementChild.scrollIntoView({ block: 'end' }); }
  } catch (e) {
    if (S.tab === 'chat') { toast('Cet échange est terminé.'); S.chat = null; S.tab = 'inbox'; render(); loadData(); }
  }
}
setInterval(() => { if (S.view === 'main' && S.tab === 'chat' && !document.hidden) loadThread(false); }, 5000);

async function poll() {
  if (S.view !== 'main' || document.hidden) return;
  try {
    const [inbox, status, convs] = await Promise.all([rpc('inbox'), rpc('my_status'), rpc('conversations')]);
    if (!status.session) { S.status = status; return route(); }
    const before = S.banner;
    const wasReady = S.status && S.status.city_ready;
    S.status = status;
    noteInbox(inbox || []);
    const convBefore = S.convs.map((c) => c.last_at).join();
    noteConvs(convs || []);
    if (status.city_ready !== wasReady && S.tab === 'discover') { render(); loadData(); return; }
    if (convBefore !== S.convs.map((c) => c.last_at).join() && S.tab !== 'chat') render();
    if (S.banner !== before || S.tab === 'inbox') render();
  } catch (_) { /* silencieux : on réessaiera */ }
}
setInterval(poll, 20000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });

// Qui bloquer ou signaler : une personne d'« Autour de toi » (d.i) ou l'auteur d'un bonbon reçu (d.id)
function reportTarget(d) {
  if (d.chat && S.chat) return { sessionId: S.chat.session_id, pseudo: S.chat.pseudo, fromChat: true };
  if (d.id) { const m = S.inbox.find((x) => x.id === d.id); return { bonbonId: d.id, pseudo: m ? m.sender_pseudo : 'Cette personne' }; }
  const p = S.people[+d.i]; return { sessionId: p.session_id, pseudo: p.pseudo };
}

const A = {
  goWelcome() { S.view = 'welcome'; S.error = ''; render(); },
  goAuth(d) { S.view = 'auth'; S.authMode = d.mode; S.error = ''; render(); },
  async forgot() {
    const email = (document.getElementById('email') || {}).value || '';
    if (!email) { S.error = 'Indique ton e-mail ci-dessus, puis clique à nouveau sur « Mot de passe oublié ».'; return render(); }
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    if (error) { S.error = errMsg(error); return render(); }
    toast('Si un compte existe, un lien de réinitialisation vient d’être envoyé.');
  },
  async logout() { await sb.auth.signOut(); S.user = null; S.status = null; S.seenInbox = null; S.view = 'welcome'; render(); },
  async checkPaid() {
    S.busy = true;
    for (let i = 0; i < 3; i++) {
      await route();
      if (S.view !== 'paywall') break;
      await new Promise((r) => setTimeout(r, 2000));
    }
    S.busy = false;
    if (S.view === 'paywall') toast('Paiement pas encore reçu. Ça peut prendre une minute, réessaie.');
  },
  mood(d) {
    const m = d.mood;
    if (S.form.moods.includes(m)) S.form.moods = S.form.moods.filter((x) => x !== m);
    else if (isPremium()) S.form.moods = S.form.moods.concat(m).slice(-2);   // Premium : 2 humeurs
    else S.form.moods = [m];                                                  // gratuit : une seule
    render();
  },
  tab(d) {
    if (d.tab === 'me') S.meSettings = false;   // « Moi » ouvre toujours sur le profil
    S.tab = d.tab; S.error = '';
    if (S.view === 'identity') S.view = 'main';
    if (d.tab === 'inbox') S.banner = 0;
    render();
    if (d.tab === 'discover' || d.tab === 'inbox') loadData();
  },
  refresh() { S.cardMenu = null; S.peopleLoaded = false; render(); loadData(); },
  pickTarget(d) { dropVoiceNow(); dropPhotoNow(); S.target = S.people[+d.i]; S.pick = 0; S.custom = ''; S.error = ''; S.tab = 'send'; render(); window.scrollTo(0, 0); },
  pick(d) { S.pick = +d.i; render(); },
  recVoice() { startRecording(); },
  meSettings() { S.meSettings = true; S.cardMenu = null; render(); window.scrollTo(0, 0); },
  meProfile() { S.meSettings = false; render(); window.scrollTo(0, 0); },
  recPVoice() { startRecording('pvoice', pvoiceMax()); },
  stopPVoice() { stopRecording('pvoice'); },
  dropPVoice() { dropVoiceNow('pvoice'); render(); },
  async savePVoice() {
    const pv = S.pvoice;
    if (!pv || !pv.blob || S.busy) return;
    S.busy = true; render();
    try {
      const path = await uploadVoice(pv.blob, 'profil-');
      S.status = await rpc('set_profile_voice', { p_path: path });
      dropVoiceNow('pvoice'); toast('Ta voix est sur ta carte 🍬');
    } catch (e) { toast(/VOICE_LONG/.test((e && e.message) || '') ? `Ta voix est trop longue : ${pvoiceMax()} secondes maximum.` : errMsg(e)); }
    S.busy = false; render();
  },
  async removePVoice() {
    try { S.status = await rpc('set_profile_voice', { p_path: null }); } catch (e) { toast(errMsg(e)); }
    render();
  },
  async removePPhoto() {
    try { S.status = await rpc('set_profile_photo', { p_thumb: null }); } catch (e) { toast(errMsg(e)); }
    render();
  },
  playProfile(d) { playProfileVoice(+d.i); },
  deckMove(d) {
    const n = S.people.length;
    S.deck = Math.min(Math.max(0, (S.deck || 0) + (+d.d)), Math.max(0, n - 1));
    S.cardMenu = null; render();
  },
  stopVoice() { stopRecording(); },
  dropVoice() { dropVoiceNow(); render(); },
  playVoice(d) { playVoiceOnce(d.id); },
  dropPhoto() { dropPhotoNow(); render(); },
  revealPhoto(d) { revealPhotoOnce(d.id); },
  pickEffect(d) { S.effect = +d.i; render(); if (S.effect) playEffect(S.effect); },
  replyBonbon(d) {
    const m = S.inbox.find((x) => x.id === d.id); if (!m) return;
    dropVoiceNow(); dropPhotoNow();
    S.target = { pseudo: m.sender_pseudo, local: m.local, home_city: m.sender_home_city, reply_id: m.id };
    S.pick = 0; S.custom = ''; S.error = ''; S.tab = 'send'; render(); window.scrollTo(0, 0);
  },
  openChat(d) {
    const c = S.convs.find((x) => x.session_id === d.sid); if (!c) return;
    S.chat = c; S.thread = []; S.tab = 'chat'; markSeen(c); render(); loadThread(true);
  },
  async sendPhrase(d) {
    if (!S.chat || S.busy) return;
    S.busy = true;
    const i = +d.i;
    S.thread = S.thread.concat({ mine: true, phrase_id: i, created_at: new Date().toISOString() });
    render(); { const b = document.getElementById('bubbles'); if (b && b.lastElementChild) b.lastElementChild.scrollIntoView({ block: 'end' }); }
    try { await rpc('send_phrase', { p_session_id: S.chat.session_id, p_phrase: i }); }
    catch (e) { toast(errMsg(e)); }
    S.busy = false; loadThread(true);
  },
  reportChat() { if (S.chat) { S.report = { sessionId: S.chat.session_id, pseudo: S.chat.pseudo, fromChat: true }; render(); } },
  async send() {
    S.busy = true; S.error = ''; render();
    try {
      const custom = isPremium() && S.custom.trim() ? S.custom.trim() : null;
      const effect = isPremium() ? (S.effect || 0) : 0;
      if (S.voice && S.voice.recording) stopRecording();
      if (S.photo && S.photo.checking) throw new Error('Attends la fin de la vérification de la photo.');
      const voice = S.voice && S.voice.blob ? await uploadVoice(S.voice.blob) : null;
      let photo = null;
      try { photo = isPremium() && S.photo && S.photo.blob ? await uploadPhoto(S.photo.blob) : null; }
      catch (e) { if (voice) sb.storage.from('vocaux').remove([voice]).catch(() => {}); throw e; }
      const thumb = photo ? S.photo.thumb : null;
      try {
        const extra = { p_custom: custom, p_effect: effect, p_voice: voice, p_photo: photo, p_photo_thumb: thumb };
        if (S.target.reply_id) await rpc('reply_bonbon', { p_bonbon_id: S.target.reply_id, p_compliment: S.pick, ...extra });
        else await rpc('send_bonbon', { p_session_id: S.target.session_id, p_compliment: S.pick, ...extra });
      } catch (e) {
        if (voice) sb.storage.from('vocaux').remove([voice]).catch(() => {});
        if (photo) sb.storage.from('photos').remove([photo]).catch(() => {});
        throw e;
      }
      if (voice) dropVoiceNow();
      if (photo) dropPhotoNow();
      if (effect) setTimeout(() => playEffect(effect), 150);
      S.lastSentText = custom || COMPLIMENTS[S.pick];
      S.custom = '';
      S.status.sent_today += 1;
      S.target.already_sent = true;
      S.tab = 'sentok';
    } catch (e) { S.error = errMsg(e); }
    S.busy = false; render();
  },
  async thank(d) {
    try {
      await rpc('thank_bonbon', { p_id: d.id });
      const m = S.inbox.find((x) => x.id === d.id); if (m) m.status = 'thanked';
      render(); toast('Un « merci » est parti. Pas besoin d’en dire plus.');
    } catch (e) { toast(errMsg(e)); }
  },
  reportBonbon(d) { const m = S.inbox.find((x) => x.id === d.id); S.report = { bonbonId: d.id, pseudo: m ? m.sender_pseudo : 'Cette personne' }; render(); },
  reportSession(d) { const p = S.people[+d.i]; S.report = { sessionId: p.session_id, pseudo: p.pseudo }; render(); },
  cardMenu(d) { S.cardMenu = S.cardMenu === d.k ? null : d.k; render(); },
  askBlock(d) { S.cardMenu = null; S.report = { ...reportTarget(d), mode: 'block' }; render(); },
  askReport(d) { S.cardMenu = null; S.report = { ...reportTarget(d), mode: 'report' }; render(); },
  closeReport() { S.report = null; render(); },
  async blockOnly() {
    const r = S.report; S.report = null;
    if (r.fromChat) { S.chat = null; S.tab = 'inbox'; }
    try {
      await rpc('block_only', { p_bonbon_id: r.bonbonId || null, p_session_id: r.sessionId || null });
      toast('C’est fait. Vous ne vous verrez plus.');
      await loadData();
    } catch (e) { toast(errMsg(e)); }
    render();
  },
  editBio() { S.editBio = true; S.error = ''; render(); const t = document.getElementById('bio'); if (t) t.focus(); },
  cancelBio() { S.editBio = false; S.error = ''; render(); },
  toggleSound(d) {
    if (d.key === 'on') SOUND.on = !SOUND.on; else SOUND.clicks = !SOUND.clicks;
    SOUND.save(); render();
  },
  hideEvents() { S.hideEvents = true; try { localStorage.setItem('pb_hide_events', '1'); } catch (_) {} render(); },
  openPremium() { S.premium = true; S.error = ''; S.premiumMode = 'join'; render(); },
  closePremium() { S.premium = false; S.error = ''; render(); },
  premiumMode(d) { S.premiumMode = d.mode; S.error = ''; if (d.reset && S.user) S.user = { ...S.user, new_email: null }; render(); },
  async copyCode() {
    try { await navigator.clipboard.writeText(S.premiumCode || ''); toast('Code copié.'); } catch (_) { toast('Sélectionne le code pour le copier.'); }
  },
  async setAvatar(d) {
    try { S.status = await rpc('set_avatar', { p_avatar: +d.n }); render(); } catch (e) { toast(errMsg(e)); }
  },
  setTheme(d) { try { localStorage.setItem('pb_theme', d.theme); } catch (_) {} applyTheme(); render(); },
  async checkPremium() {
    for (let i = 0; i < 8; i++) {
      try { S.status = await rpc('my_status'); } catch (_) {}
      if (isPremium()) { applyTheme(); await loadPremiumCode(); S.premium = true; S.premiumMode = 'code'; render(); return; }
      await new Promise((r) => setTimeout(r, 2500));
    }
    toast('Paiement reçu ? Premium s’activera dans un instant. Recharge la page dans une minute.');
  },
  async confirmReport(d) {
    const r = S.report; S.report = null;
    if (r.fromChat) { S.chat = null; S.tab = 'inbox'; }
    try {
      await rpc('report', { p_reason: d.reason, p_bonbon_id: r.bonbonId || null, p_session_id: r.sessionId || null });
      toast('Signalement envoyé. Cette personne ne pourra plus te voir ni t’écrire.');
      await loadData();
    } catch (e) { toast(errMsg(e)); }
    render();
  },
  async toggle(d) {
    const key = d.key, val = !S.status[key];
    S.status[key] = val; render();
    try {
      await rpc('update_settings', { p_receive_on: key === 'receive_on' ? val : null, p_same_city_only: key === 'same_city_only' ? val : null, p_accept_custom: key === 'accept_custom' ? val : null, p_accept_voice: key === 'accept_voice' ? val : null, p_accept_photo: key === 'accept_photo' ? val : null });
    } catch (e) { S.status[key] = !val; render(); toast(errMsg(e)); }
  },
  editIdentity() {
    const s = S.status.session;
    S.form = { pseudo: s.pseudo === 'Quelqu’un de passage' || s.pseudo === "Quelqu'un de passage" ? '' : s.pseudo, moods: (s.moods || []).slice(), bio: s.bio || '', city: s.current_city, home: s.home_city === s.current_city ? '' : s.home_city };
    S.view = 'identity'; S.error = ''; render();
  },
  async leave() {
    try { await rpc('end_session'); } catch (_) {}
    S.form = { pseudo: '', moods: [], bio: '', city: S.form.city, home: '' };
    S.status.session = null; S.people = []; S.peopleLoaded = false; S.tab = 'discover';
    S.view = 'identity'; render();
    toast('Identité effacée. À une prochaine fois, sous un autre nom.');
  },
  async deleteAccount() {
    if (!confirm(isAnon() ? 'Effacer définitivement toutes tes données (identité, bonbons, réglages) ?' : 'Supprimer définitivement ton compte et toutes tes données ?')) return;
    try { await rpc('delete_account'); } catch (e) { return toast(errMsg(e)); }
    await sb.auth.signOut();
    S.user = null; S.status = null; S.view = 'welcome'; render();
    toast('Toutes tes données ont été effacées.');
  },
  openBanner() { S.banner = 0; S.tab = 'inbox'; render(); loadData(); },
  async storyOpen(d) {
    const m = S.inbox.find((x) => x.id === d.id);
    if (!m || S.storyBusy) return;
    const text = m.custom_text || COMPLIMENTS[m.compliment_id] || '';
    S.storyBusy = true; render();
    try {
      const blob = await storyImage(text, cityLabel(S.status));
      if (S.story) URL.revokeObjectURL(S.story.url);
      S.story = { text, file: new File([blob], 'petit-bonbon.png', { type: 'image/png' }), url: URL.createObjectURL(blob) };
    } catch (_) { toast('Impossible de créer l’image. Réessaie.'); }
    S.storyBusy = false; render();
  },
  async storyShare() {
    if (!S.story) return;
    try { await navigator.share({ files: [S.story.file] }); }
    catch (e) { if (e && e.name !== 'AbortError') toast('Partage impossible : enregistre l’image puis ajoute-la à ta story.'); }
  },
  storyClose() { if (S.story) URL.revokeObjectURL(S.story.url); S.story = null; render(); },
  async share() {
    const data = { title: 'Petit Bonbon', text: 'Des inconnus. Des compliments. Aucune pression.', url: location.origin + location.pathname };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(data.url); toast('Lien copié !'); }
    } catch (_) {}
  },
};

const F = {
  async chatText(form) {
    const input = form.querySelector('[name="chatmsg"]');
    const body = String(input.value || '').trim();
    if (!body || !S.chat || S.busy) return;
    S.busy = true;
    S.thread = S.thread.concat({ mine: true, body, created_at: new Date().toISOString() });
    input.value = '';
    render(); { const b = document.getElementById('bubbles'); if (b && b.lastElementChild) b.lastElementChild.scrollIntoView({ block: 'end' }); }
    try { await rpc('send_text', { p_session_id: S.chat.session_id, p_body: body }); }
    catch (e) {
      const m = errMsg(e); toast(/BAD_TEXT/.test((e && e.message) || '') ? ERRORS.BAD_MSG : m);
      const again = document.querySelector('[name="chatmsg"]'); if (again && !again.value) again.value = body;
    }
    S.busy = false; loadThread(true);
  },
  async restore(form) {
    const code = String(new FormData(form).get('code') || '').trim();
    if (code.replace(/[^A-Za-z0-9]/g, '').length < 12) { S.error = 'Recopie ton code en entier (BONBON-XXXX-XXXX-XXXX).'; return render(); }
    S.busy = true; S.error = ''; render();
    try {
      S.status = await rpc('restore_premium', { p_code: code });
      await loadPremiumCode(); applyTheme();
      S.premium = false; toast('Premium est de retour sur ce téléphone 🍬');
    } catch (e) { S.error = errMsg(e); }
    S.busy = false; render();
  },
  subscribe(form) {
    const fd = new FormData(form);
    if (!fd.get('terms') || !fd.get('waive')) { S.error = 'Coche les deux cases pour continuer.'; return render(); }
    location.href = subscribeLink();
  },
  async bio(form) {
    const bio = String(new FormData(form).get('bio') || '');
    S.busy = true; S.error = ''; render();
    try {
      S.status = await rpc('update_bio', { p_bio: bio });
      S.editBio = false;
      toast(bio.trim() ? 'Tes quelques mots sont visibles.' : 'Tes quelques mots ont été retirés.');
    } catch (e) { S.error = errMsg(e); }
    S.busy = false; render();
  },
  // Entrée sans compte : identifiant anonyme invisible, lié à cet appareil
  async enter(form) {
    const fd = new FormData(form);
    if (!fd.get('adult')) { S.error = 'Petit Bonbon est réservé aux plus de 18 ans.'; return render(); }
    if (!fd.get('terms')) { S.error = 'Merci d’accepter les conditions d’utilisation.'; return render(); }
    S.busy = true; S.error = ''; render();
    try {
      const { data, error } = await sb.auth.signInAnonymously();
      if (error) throw error;
      S.user = data.user;
      await rpc('confirm_adult');
      S.busy = false; S.view = 'loading'; await route();
    } catch (e) { S.busy = false; S.error = errMsg(e); render(); }
  },
  async auth(form) {
    const fd = new FormData(form);
    const email = String(fd.get('email') || '').trim(), password = String(fd.get('password') || '');
    if (!email || !password) { S.error = 'Indique ton e-mail et ton mot de passe.'; return render(); }
    if (S.authMode === 'signup') {
      if (!fd.get('adult')) { S.error = 'Petit Bonbon est réservé aux plus de 18 ans.'; return render(); }
      if (!fd.get('terms')) { S.error = 'Merci d’accepter les conditions d’utilisation.'; return render(); }
      if (password.length < 8) { S.error = 'Le mot de passe doit faire au moins 8 caractères.'; return render(); }
    }
    S.busy = true; S.error = ''; render();
    try {
      if (S.authMode === 'signup') {
        const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } });
        if (error) throw error;
        if (!data.session) { S.busy = false; S.view = 'checkmail'; return render(); }
        S.user = data.user;
        await rpc('confirm_adult');
      } else {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        S.user = data.user;
      }
      S.busy = false; S.view = 'loading'; await route();
    } catch (e) { S.busy = false; S.error = errMsg(e); render(); }
  },
  async newpass(form) {
    const pw = String(new FormData(form).get('password') || '');
    if (pw.length < 8) { S.error = 'Le mot de passe doit faire au moins 8 caractères.'; return render(); }
    S.busy = true; render();
    const { error } = await sb.auth.updateUser({ password: pw });
    S.busy = false;
    if (error) { S.error = errMsg(error); return render(); }
    toast('Mot de passe mis à jour.'); S.view = 'loading'; route();
  },
  async adult(form) {
    const fd = new FormData(form);
    if (!fd.get('adult') || !fd.get('terms')) { S.error = 'Merci de cocher les deux cases pour continuer.'; return render(); }
    S.busy = true; render();
    try { await rpc('confirm_adult'); S.busy = false; await route(); } catch (e) { S.busy = false; S.error = errMsg(e); render(); }
  },
  async identity() {
    const f = S.form;
    if (!f.city.trim()) { S.error = 'Indique la ville où tu te trouves.'; return render(); }
    S.busy = true; S.error = ''; render();
    try {
      S.status = await rpc('start_session', { p_pseudo: f.pseudo, p_moods: f.moods.filter((m) => isPremium() || MOODS.includes(m)).slice(0, isPremium() ? 2 : 1), p_bio: '', p_current_city: f.city, p_home_city: '' });
      try { localStorage.setItem('pb_city', f.city); } catch (_) {}
      S.busy = false; S.view = 'main'; S.tab = 'discover'; S.peopleLoaded = false; S.seenInbox = null;
      render(); loadData();
    } catch (e) { S.busy = false; S.error = errMsg(e); render(); }
  },
};

// ---------- Événements -------------------------------------------------
document.addEventListener('click', (e) => {
  const tap = e.target.closest('button, a, .chip, .compliment, .reason, input[type=checkbox]');
  if (tap && !e.__pbOpenPlayed) SOUND.play('click');
  const el = e.target.closest('[data-a]');
  // un clic en dehors du petit menu ⚠ le referme
  if (S.cardMenu !== null && !e.target.closest('.card-menu, .card-warn')) {
    S.cardMenu = null;
    if (!el) return render();
  }
  if (!el) return;
  // un clic dans la feuille ne doit pas la fermer
  if (el.classList.contains('sheet-back') && e.target.closest('[data-stop]')) return;
  const fn = A[el.dataset.a];
  if (fn) { e.preventDefault(); fn(el.dataset, el); }
});
document.addEventListener('submit', (e) => {
  const form = e.target.closest('[data-f]');
  if (!form) return;
  e.preventDefault();
  const fn = F[form.dataset.f];
  if (fn) fn(form);
});
let swipe = null;
document.addEventListener('pointerdown', (e) => {
  const card = e.target.closest && e.target.closest('[data-swipe]');
  if (!card || e.target.closest('button, a, label, input, textarea')) { swipe = null; return; }
  swipe = { x: e.clientX, y: e.clientY, card };
});
document.addEventListener('pointermove', (e) => {
  if (!swipe) return;
  const dx = e.clientX - swipe.x;
  if (Math.abs(dx) > Math.abs(e.clientY - swipe.y)) swipe.card.style.transform = `translateX(${dx * 0.6}px) rotate(${dx / 40}deg)`;
});
const endSwipe = (e) => {
  if (!swipe) return;
  const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
  swipe.card.style.transform = '';
  swipe = null;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) A.deckMove({ d: dx < 0 ? 1 : -1 });
};
document.addEventListener('pointerup', endSwipe);
document.addEventListener('pointercancel', () => { if (swipe) { swipe.card.style.transform = ''; swipe = null; } });

document.addEventListener('change', (e) => {
  if (e.target.id === 'photo-input' && e.target.files && e.target.files[0]) { const f = e.target.files[0]; e.target.value = ''; handlePhoto(f); }
  if (e.target.id === 'pphoto-input' && e.target.files && e.target.files[0]) { const f = e.target.files[0]; e.target.value = ''; handleProfilePhoto(f); }
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'custom') S.custom = e.target.value;
  const k = e.target.dataset && e.target.dataset.bind;
  if (k) S.form[k] = e.target.value;
});
// ---------- Discrétion ----------------------------------------------
// Une page web ne peut pas bloquer les captures d'écran. On limite seulement
// ce qui peut l'être : contenu flouté quand l'app passe en arrière-plan
// (aperçu du sélecteur d'apps), pas de copie ni de menu sur les cartes.
const veil = (on) => document.body.classList.toggle('veiled', on);
document.addEventListener('visibilitychange', () => veil(document.hidden));
window.addEventListener('blur', () => veil(true));
window.addEventListener('focus', () => veil(false));
window.addEventListener('pagehide', () => veil(true));
window.addEventListener('pageshow', () => veil(false));
document.addEventListener('contextmenu', (e) => { if (e.target.closest('.card, .quote, .bio, .photo-view')) e.preventDefault(); });
document.addEventListener('copy', (e) => { if (window.getSelection && e.target.closest && e.target.closest('.card')) e.preventDefault(); });

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && S.story) { A.storyClose(); return; }
  if (e.key === 'Escape' && (S.report || S.premium || S.cardMenu !== null)) { S.report = null; S.premium = false; S.cardMenu = null; render(); }
});

// ---------- Démarrage --------------------------------------------------
async function start() {
  try { S.form.city = localStorage.getItem('pb_city') || ''; S.hideEvents = localStorage.getItem('pb_hide_events') === '1'; } catch (_) {}
  if (!CONFIGURED) return route();
  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') { S.user = session && session.user; S.view = 'newpass'; render(); return; }
    if (event === 'SIGNED_OUT') { S.user = null; }
    if ((event === 'USER_UPDATED' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
      const was = S.user && S.user.is_anonymous;
      S.user = session.user;
      if (S.premium || (was && !S.user.is_anonymous)) render();
    }
  });
  const { data } = await sb.auth.getSession();
  S.user = data.session ? data.session.user : null;
  if (S.view === 'newpass') return;
  await route();
  const qs = new URLSearchParams(location.search);
  if (qs.has('paid') && S.view === 'paywall') A.checkPaid();
  if (qs.get('premium') === '1') A.checkPremium();
  if (qs.has('premium') || qs.has('paid')) history.replaceState(null, '', location.pathname);
}
start();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {});
}
