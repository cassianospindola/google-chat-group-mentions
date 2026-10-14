// Google Chat group mentions (Apps Script)
// Expands a Google Group alias into individual mentions, because Google Chat cannot mention groups.
//
// Setup, in the Apps Script editor:
//   1. Set DOMAIN, BOT_NAME and LANG below.
//   2. Run syncGroups once and authorize.
//   3. Run installTrigger once (hourly sync).
//   4. Optional: run measureProperties to check storage usage.

const DOMAIN   = 'example.com';  // your Workspace domain
const BOT_NAME = 'mention';      // must match the App name in the Chat API Configuration
const LANG     = 'en';           // reply language: 'en' or 'pt'

// Both command sets are always accepted, whatever LANG is.
const COMMANDS = {
  help:   ['help', 'ajuda'],
  groups: ['groups', 'list', 'grupos', 'listar'],
  who:    ['who', 'members', 'quem', 'membros'],
  mute:   ['mute', 'silenciar', 'mutar'],
  unmute: ['unmute', 'reativar', 'desmutar'],
  muted:  ['muted', 'exceptions', 'silenciados', 'excecoes', 'exceções']
};
const ALL_WORDS = ['all', 'everyone', 'tudo', 'todos', '*'];

// ---------- User-facing texts (translate here) ----------

const TEXT = {
  en: {
    help: () => [
      `In a space: *@${BOT_NAME} group* your message (more than one: finance,support).`,
      'Here, in a direct message:',
      '• *groups*: list all groups',
      '• *who group*: who is in the group',
      '• *mute group* or *mute all*: stop receiving mentions',
      '• *unmute group* or *unmute all*: receive them again',
      '• *muted*: your muted groups'
    ].join('\n'),
    sent:          'Mentions sent in the thread.',
    nobody:        'Nobody was mentioned.',
    alreadySent:   'Mentions already sent in this thread.',
    excluded:      names => 'Not notified (they muted this group): ' + names,
    notFound:      list => `Group not found: ${list}. Send *groups* to see the available ones.`,
    empty:         list => 'Empty group: ' + list,
    footer:        n => `\n_(${n} person(s) not notified by their own choice)_`,
    usageWho:      'Usage: who group',
    usageMute:     'Usage: mute group (or mute all)',
    usageUnmute:   'Usage: unmute group (or unmute all)',
    noUser:        'Could not identify your user.',
    groupNotFound: a => `Group "${a}" not found. Send *groups* to see the available ones.`,
    groupEmpty:    a => `Group "${a}" is empty.`,
    mutedAll:      'Done. No group will mention you. To undo: unmute all.',
    mutedOne:      a => `Done. The *${a}* group will not mention you. To undo: unmute ${a}.`,
    noExceptions:  'You have no muted groups.',
    unmutedAll:    'Done. Every group can mention you again.',
    unmutedOne:    a => `Done. The *${a}* group can mention you again.`,
    noneMuted:     'You have no muted groups. Every group can mention you.',
    allMuted:      'You muted all groups.',
    mutedList:     l => 'Muted groups: ' + l,
    mutedTag:      ' _(muted)_',
    groupsHeader:  'Available groups:',
    syncedAt:      w => `_Synced at ${w}_`,
    never:         'never'
  },
  pt: {
    help: () => [
      `No espaço: *@${BOT_NAME} grupo* sua mensagem (aceita mais de um: financeiro,suporte).`,
      'Aqui, em conversa privada:',
      '• *grupos*: lista todos os grupos',
      '• *quem grupo*: quem está no grupo',
      '• *silenciar grupo* ou *silenciar tudo*: parar de receber menções',
      '• *reativar grupo* ou *reativar tudo*: voltar a receber',
      '• *silenciados*: seus grupos silenciados'
    ].join('\n'),
    sent:          'Menções enviadas na thread.',
    nobody:        'Ninguém foi mencionado.',
    alreadySent:   'Menções já enviadas na thread.',
    excluded:      names => 'Não notificados (pediram para não receber deste grupo): ' + names,
    notFound:      list => `Grupo não encontrado: ${list}. Use *grupos* para ver os disponíveis.`,
    empty:         list => 'Grupo vazio: ' + list,
    footer:        n => `\n_(${n} pessoa(s) não notificada(s) por preferência própria)_`,
    usageWho:      'Uso: quem grupo',
    usageMute:     'Uso: silenciar grupo (ou silenciar tudo)',
    usageUnmute:   'Uso: reativar grupo (ou reativar tudo)',
    noUser:        'Não consegui identificar seu usuário.',
    groupNotFound: a => `Grupo "${a}" não encontrado. Use *grupos* para ver os disponíveis.`,
    groupEmpty:    a => `Grupo "${a}" está vazio.`,
    mutedAll:      'Ok. Nenhum grupo vai mencionar você. Para voltar: reativar tudo.',
    mutedOne:      a => `Ok. O grupo *${a}* não vai mais mencionar você. Para voltar: reativar ${a}.`,
    noExceptions:  'Você não tem grupos silenciados.',
    unmutedAll:    'Ok. Todos os grupos voltam a mencionar você.',
    unmutedOne:    a => `Ok. O grupo *${a}* volta a mencionar você.`,
    noneMuted:     'Você não tem grupos silenciados. Recebe menções de todos.',
    allMuted:      'Você silenciou todos os grupos.',
    mutedList:     l => 'Grupos silenciados: ' + l,
    mutedTag:      ' _(silenciado)_',
    groupsHeader:  'Grupos disponíveis:',
    syncedAt:      w => `_Sincronizado em ${w}_`,
    never:         'nunca'
  }
};

function t(key, ...args) {
  const v = (TEXT[LANG] || TEXT.en)[key];
  return typeof v === 'function' ? v(...args) : v;
}

function is(command, word) {
  return COMMANDS[command].includes(word);
}

// ---------- Install ----------

// Run once in the editor. Creates the hourly sync trigger without duplicates.
function installTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(tr => tr.getHandlerFunction() === 'syncGroups')
    .forEach(tr => ScriptApp.deleteTrigger(tr));
  ScriptApp.newTrigger('syncGroups').timeBased().everyHours(1).create();
  console.log('Hourly syncGroups trigger installed.');
}

// ---------- Sync (hourly trigger, runs as the script owner) ----------

function syncGroups() {
  const props  = PropertiesService.getScriptProperties();
  const groups = listGroups();
  const fresh  = {};

  groups.forEach(g => {
    const alias = g.email.split('@')[0].toLowerCase();
    try {
      const members = listMembers(g.email).map(m => ({ id: m.id, email: m.email }));
      const noId    = members.filter(m => !m.id);
      if (noId.length) console.warn(`${alias}: missing id for ${noId.map(m => m.email).join(', ')}`);
      fresh['group:' + alias] = JSON.stringify(members);
      console.log(`${alias}: ${members.length} members`);
    } catch (e) {
      console.error(`${alias}: ${e}`);
    }
  });

  Object.keys(props.getProperties())
    .filter(k => k.startsWith('group:') && !(k in fresh))
    .forEach(k => props.deleteProperty(k));
  props.setProperties(fresh);
  props.setProperty('synced_at', new Date().toISOString());
}

function listGroups() {
  const groups = [];
  let pageToken;
  do {
    const res = AdminDirectory.Groups.list({ customer: 'my_customer', maxResults: 200, pageToken });
    (res.groups || []).forEach(g => groups.push(g));
    pageToken = res.nextPageToken;
  } while (pageToken);
  return groups;
}

function listMembers(groupEmail) {
  const members = [];
  let pageToken;
  do {
    const res = AdminDirectory.Members.list(groupEmail, {
      includeDerivedMembership: true, // expands nested groups
      maxResults: 200,
      pageToken
    });
    (res.members || [])
      .filter(m => m.type === 'USER' && m.status !== 'SUSPENDED')
      .forEach(m => members.push(m));
    pageToken = res.nextPageToken;
  } while (pageToken);
  return members;
}

// ---------- Chat handler (runs as the user who called the bot) ----------
// Never call the Admin SDK here: the caller is usually not an admin. Read only the cache.

function onMessage(event) {
  const newFormat = !!(event.chat && event.chat.messagePayload);
  const message   = newFormat ? event.chat.messagePayload.message : event.message;
  const user      = newFormat ? event.chat.user : event.user;
  const space     = message && message.space ? message.space.name : null;
  const thread    = message && message.thread ? message.thread.name : null;

  const rest  = extractArguments(message || {}).trim();
  const match = rest.match(/^([\w.-]+(?:\s*,\s*[\w.-]+)*)/);
  let aliasList = [];
  if (match) {
    const candidates = match[1].split(/\s*,\s*/).map(a => a.replace(/^@/, '').toLowerCase());
    aliasList = [candidates[0]];
    for (let i = 1; i < candidates.length; i++) {
      if (load(candidates[i]) === null) break; // unknown word: it is text, not a group
      aliasList.push(candidates[i]);
    }
  }
  const command = aliasList[0] || '';
  const words   = rest.split(/\s+/).filter(Boolean);
  const arg1    = (words[1] || '').replace(/^@/, '').toLowerCase();

  // ---- queries and preferences (reply visible only to the caller) ----
  if (!command || is('help', command))  return reply(t('help'), newFormat, thread, user);
  if (is('groups', command))            return reply(groupList(), newFormat, thread, user);
  if (is('who', command))               return reply(arg1 ? groupMembers(arg1) : t('usageWho'), newFormat, thread, user);
  if (is('mute', command))              return reply(arg1 ? mute(user, arg1) : t('usageMute'), newFormat, thread, user);
  if (is('unmute', command))            return reply(arg1 ? unmute(user, arg1) : t('usageUnmute'), newFormat, thread, user);
  if (is('muted', command))             return reply(myExceptions(user), newFormat, thread, user);

  // ---- mention ----
  const result = buildMentions(aliasList);

  if (space && thread) {
    const cache = CacheService.getScriptCache();
    const key   = 'done:' + (message.name || (thread + '|' + aliasList.join(',')));
    const lock  = LockService.getScriptLock();

    try {
      lock.waitLock(15000);
      if (cache.get(key)) return reply(t('alreadySent'), newFormat, thread, user);
      cache.put(key, '1', 600); // mark BEFORE posting: Chat retries slow events
    } catch (e) {
      console.error('lock/cache: ' + e);
    } finally {
      try { lock.releaseLock(); } catch (e) {}
    }

    if (result.text) {
      try {
        postToThread(space, thread, result.text);
        return reply(privateNotice(result), newFormat, thread, user);
      } catch (e) {
        console.error('postToThread failed, replying synchronously: ' + e);
        cache.remove(key);
      }
    } else {
      return reply(privateNotice(result), newFormat, thread, user);
    }
  }

  // Fallback: synchronous reply as the app (e.g. space where only managers can post).
  const footer = result.excluded.length ? t('footer', result.excluded.length) : '';
  return reply((result.text || privateNotice(result)) + footer, newFormat, thread);
}

// Text right after the last mention of the bot, same line. Do not trust argumentText:
// when the bot is not mentioned at the start, it carries the whole message.
function extractArguments(message) {
  const text = message.text || '';
  const botMentions = (message.annotations || []).filter(a =>
    a.type === 'USER_MENTION' && a.userMention && a.userMention.user && a.userMention.user.type === 'BOT'
  );
  if (!botMentions.length) return message.argumentText || message.text || '';
  const last  = botMentions[botMentions.length - 1];
  const after = text.substring((last.startIndex || 0) + (last.length || 0));
  return after.split('\n')[0];
}

// ---------- Post through the API with the caller's token ----------
// The synchronous reply ignores messageReplyOption when the interaction did not start in the thread.

function postToThread(spaceName, threadName, text) {
  const url = `https://chat.googleapis.com/v1/${spaceName}/messages?messageReplyOption=REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD`;
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    payload: JSON.stringify({ text, thread: { name: threadName } }),
    muteHttpExceptions: true
  });
  if (res.getResponseCode() >= 300) {
    throw new Error(`Chat API ${res.getResponseCode()}: ${res.getContentText()}`);
  }
}

// ---------- Per-user opt-out ----------
// Property exceptions:<userId> = { name, email, groups: ['finance', ...] }  ('*' = all)

function userId(user) {
  return user && user.name ? user.name.replace('users/', '') : null;
}

function loadException(id) {
  const raw = PropertiesService.getScriptProperties().getProperty('exceptions:' + id);
  return raw ? JSON.parse(raw) : null;
}

function saveException(id, obj) {
  const props = PropertiesService.getScriptProperties();
  if (!obj.groups.length) props.deleteProperty('exceptions:' + id);
  else props.setProperty('exceptions:' + id, JSON.stringify(obj));
}

function mute(user, alias) {
  const id = userId(user);
  if (!id) return t('noUser');
  const all = ALL_WORDS.includes(alias);
  if (!all && load(alias) === null) return t('groupNotFound', alias);

  const current = loadException(id) || { groups: [] };
  current.name  = user.displayName || current.name || '';
  current.email = user.email || current.email || '';
  const item = all ? '*' : alias;
  if (!current.groups.includes(item)) current.groups.push(item);
  saveException(id, current);
  return all ? t('mutedAll') : t('mutedOne', alias);
}

function unmute(user, alias) {
  const id = userId(user);
  if (!id) return t('noUser');
  const current = loadException(id);
  if (!current) return t('noExceptions');
  const all = ALL_WORDS.includes(alias);
  current.groups = all ? [] : current.groups.filter(g => g !== alias);
  saveException(id, current);
  return all ? t('unmutedAll') : t('unmutedOne', alias);
}

function myExceptions(user) {
  const current = loadException(userId(user));
  if (!current || !current.groups.length) return t('noneMuted');
  if (current.groups.includes('*')) return t('allMuted');
  return t('mutedList', current.groups.join(', '));
}

function isMuted(id, alias) {
  const exc = loadException(id);
  return !!exc && (exc.groups.includes('*') || exc.groups.includes(alias));
}

// ---------- Cache reads (Script Properties) ----------

function load(alias) {
  const raw = PropertiesService.getScriptProperties().getProperty('group:' + alias);
  return raw ? JSON.parse(raw) : null;
}

function aliases() {
  return Object.keys(PropertiesService.getScriptProperties().getProperties())
    .filter(k => k.startsWith('group:'))
    .map(k => k.replace('group:', ''))
    .sort();
}

// Returns { text, excluded: [{name, email}], notFound: [], empty: [] }
function buildMentions(aliasList) {
  const seen     = new Set();
  const mentions = [];
  const excluded = [];
  const notFound = [];
  const empty    = [];

  aliasList.forEach(alias => {
    const members = load(alias);
    if (!members) { notFound.push(alias); return; }
    if (!members.length) { empty.push(alias); return; }
    members.forEach(m => {
      const k = m.id || m.email || String(m);
      if (seen.has(k)) return;
      seen.add(k);
      if (m.id && isMuted(m.id, alias)) {
        const exc = loadException(m.id) || {};
        excluded.push({ name: exc.name || m.email, email: m.email });
        return;
      }
      mentions.push(m.id ? `<users/${m.id}>` : (m.email || String(m)));
    });
  });

  return { text: mentions.join(' '), excluded, notFound, empty };
}

function privateNotice(r) {
  const lines = [r.text ? t('sent') : t('nobody')];
  if (r.excluded.length) lines.push(t('excluded', r.excluded.map(e => e.name).join(', ')));
  if (r.notFound.length) lines.push(t('notFound', r.notFound.join(', ')));
  if (r.empty.length)    lines.push(t('empty', r.empty.join(', ')));
  return lines.join('\n');
}

function groupMembers(alias) {
  const members = load(alias);
  if (!members) return t('groupNotFound', alias);
  if (!members.length) return t('groupEmpty', alias);
  const list = members
    .map(m => (m.email || String(m)) + (m.id && isMuted(m.id, alias) ? t('mutedTag') : ''))
    .sort()
    .map(e => `• ${e}`)
    .join('\n');
  return `*${alias}@${DOMAIN}* (${members.length}):\n${list}`;
}

function groupList() {
  const props = PropertiesService.getScriptProperties();
  const lines = aliases().map(a => `• *${a}* (${load(a).length})`);
  const when  = props.getProperty('synced_at') || t('never');
  return `${t('groupsHeader')}\n${lines.join('\n')}\n\n${t('syncedAt', when)}`;
}

// Optional user: when given, the reply is visible only to that user.
function reply(text, newFormat, thread, user) {
  const msg = { text };
  if (thread) msg.thread = { name: thread };
  if (user && user.name) msg.privateMessageViewer = { name: user.name };
  if (!newFormat) return msg;
  return { hostAppDataAction: { chatDataAction: { createMessageAction: { message: msg } } } };
}

// ---------- Diagnostics (run in the editor) ----------

// Which groups an email belongs to. Edit the address and run.
function groupsOf(email) {
  email = email || 'someone@' + DOMAIN;
  const props = PropertiesService.getScriptProperties().getProperties();
  const found = Object.keys(props)
    .filter(k => k.startsWith('group:'))
    .filter(k => JSON.parse(props[k]).some(m => (m.email || '').toLowerCase() === email.toLowerCase()))
    .map(k => k.replace('group:', ''))
    .sort();
  console.log(`${email}: ${found.join(', ') || 'none'}`);
  return found;
}

// Storage usage against the Script Properties limits (~500 KB total, ~9 KB per value).
function measureProperties() {
  const p = PropertiesService.getScriptProperties().getProperties();
  let total = 0, groups = 0, largest = { k: '', b: 0 };
  Object.keys(p).forEach(k => {
    const b = Utilities.newBlob(k + p[k]).getBytes().length;
    total += b;
    if (k.startsWith('group:')) groups++;
    if (b > largest.b) largest = { k, b };
  });
  console.log(`groups: ${groups} | total: ${(total / 1024).toFixed(1)} KB of ~500 KB | ` +
              `largest: ${largest.k} (${(largest.b / 1024).toFixed(1)} KB of ~9 KB)`);
}
