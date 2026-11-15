'use client';

import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

const API = '/api/inbox';

/* Model ke TTL index (30 din) se match hona chahiye */
const RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const FILTERS = [
  ['all', 'All'],
  ['unread', 'Unread'],
  ['replied', 'Replied'],
];

const ICONS = {
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  chat: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z',
  done: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12l3 3 5-6',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-6 8-6s8 2 8 6',
  layers: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5',
  message: 'M4 5h16v11H9l-5 4V5z',
  whatsapp:
    'M20 12a8 8 0 0 1-12 6.9L4 20l1.2-3.8A8 8 0 1 1 20 12zM9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2-1-1 .8c-1-.4-2-1.4-2.4-2.4l.8-1-1-2L9 8.5z',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  check: 'M5 12l5 5 9-10',
  back: 'M15 6l-6 6 6 6',
  inbox: 'M3 13l3-8h12l3 8v6H3zM3 13h5l1 3h6l1-3h5',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
};

function Icon({ name, className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

/* ---------- helpers ---------- */

const TIME = { hour: 'numeric', minute: '2-digit' };
const TONES = ['t0', 't1', 't2', 't3', 't4', 't5'];

const initialOf = (name) => (name || '?').trim().charAt(0).toUpperCase();
const toneOf = (name) => TONES[(name || '?').trim().toUpperCase().charCodeAt(0) % TONES.length];

function shortDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const time = d.toLocaleTimeString('en-US', TIME);

  if (d.toDateString() === now.toDateString()) return `Today, ${time}`;
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;

  const month = d.toLocaleString('en-US', { month: 'short' });
  return `${d.getDate()} ${month}, ${time}`;
}

function fullDate(iso) {
  const d = new Date(iso);
  const month = d.toLocaleString('en-US', { month: 'short' });
  return `${d.getDate()} ${month} ${d.getFullYear()}, ${d.toLocaleTimeString('en-US', TIME)}`;
}

function daysLeft(iso) {
  const left = Math.ceil((new Date(iso).getTime() + RETENTION_DAYS * DAY_MS - Date.now()) / DAY_MS);
  return Math.max(0, left);
}

function waNumber(contact) {
  const digits = contact.replace(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
}

function prettyPhone(contact) {
  const d = contact.replace(/\D/g, '');
  if (d.length === 10) return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
  if (d.length === 12 && d.startsWith('91')) return `+91 ${d.slice(2, 7)} ${d.slice(7)}`;
  return `+${d}`;
}

/*
 * Email reply:
 * - mobile: mailto (phone ka mail app khulta hai)
 * - desktop: Gmail compose new tab me (mailto ke liye mail app set na ho to bhi chalta hai)
 */
function openEmailReply(item) {
  const subject = `Re: ${item.offering || 'Your inquiry'}`;
  const body = `Hi ${item.name},\n\nThanks for reaching out.\n\n`;
  const enc = encodeURIComponent;

  if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    window.location.href = `mailto:${item.contact}?subject=${enc(subject)}&body=${enc(body)}`;
    return;
  }

  window.open(
    `https://mail.google.com/mail/?view=cm&fs=1&to=${enc(item.contact)}&su=${enc(subject)}&body=${enc(body)}`,
    '_blank',
    'noopener,noreferrer'
  );
}

/* Nav ke Inbox badge (layout me, server render) ko bina refresh ke update karta hai */
function syncBadge(unread) {
  document.querySelectorAll('[data-inbox-badge]').forEach((el) => {
    el.textContent = unread > 99 ? '99+' : String(unread);
    el.hidden = unread <= 0;
  });
}

const STATUS_LABEL = {
  unread: ['New Inquiry', 'is-new'],
  read: ['Read', 'is-read'],
  replied: ['Replied', 'is-replied'],
};

/* ---------- small components ---------- */

function Stat({ tone, icon, label, value }) {
  return (
    <div className={`ib-stat ${tone}`}>
      <span className="ib-stat-icon">
        <Icon name={icon} />
      </span>
      <div>
        <p className="ib-stat-label">{label}</p>
        <p className="ib-stat-value">{value}</p>
      </div>
    </div>
  );
}

const Row = memo(function Row({ item, active, onSelect }) {
  return (
    <button
      type="button"
      className={`ib-row${active ? ' is-active' : ''}${item.status === 'unread' ? ' is-unread' : ''}`}
      onClick={() => onSelect(item.id)}
    >
      <span className={`ib-avatar ${toneOf(item.name)}`}>{initialOf(item.name)}</span>
      <span className="ib-row-body">
        <span className="ib-row-top">
          <strong className="ib-row-name">{item.name}</strong>
          <time className="ib-row-time" suppressHydrationWarning>
            {shortDate(item.createdAt)}
          </time>
        </span>
        <span className="ib-row-sub">{item.offering || item.message || 'No message'}</span>
      </span>
      {item.status === 'unread' && <i className="ib-dot" aria-label="Unread" />}
    </button>
  );
});

function InfoRow({ icon, label, children }) {
  return (
    <div className="ib-info-row">
      <div className="ib-info-label">
        <Icon name={icon} />
        <span>{label}</span>
      </div>
      <div className="ib-info-value">{children}</div>
    </div>
  );
}

/* ---------- main ---------- */

export default function InboxClient({ initialItems }) {
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [error, setError] = useState('');

  const deferredQuery = useDeferredValue(query);

  const itemsRef = useRef(items);
  itemsRef.current = items;

  const lastFetch = useRef(Date.now());

  const counts = useMemo(() => {
    let unread = 0;
    let replied = 0;
    for (const i of items) {
      if (i.status === 'unread') unread++;
      else if (i.status === 'replied') replied++;
    }
    return { total: items.length, unread, replied };
  }, [items]);

  useEffect(() => {
    syncBadge(counts.unread);
  }, [counts.unread]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(''), 3500);
    return () => clearTimeout(t);
  }, [error]);

  /* Tab wapas khulne par (30s se purana ho to) ek hi API se fresh data */
  useEffect(() => {
    async function refresh() {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastFetch.current < 30000) return;
      lastFetch.current = Date.now();

      try {
        const res = await fetch(API, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (data.success) setItems(data.items);
      } catch {
        /* silent: purana data dikhta rahega */
      }
    }

    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, []);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();

    return items.filter((i) => {
      if (filter !== 'all' && i.status !== filter) return false;
      if (!q) return true;
      return `${i.name} ${i.contact} ${i.offering} ${i.message}`.toLowerCase().includes(q);
    });
  }, [items, filter, deferredQuery]);

  const selected = filtered.find((i) => i.id === selectedId) || filtered[0] || null;

  const setStatus = useCallback(async (id, status) => {
    const prev = itemsRef.current.find((i) => i.id === id);
    if (!prev || prev.status === status) return;

    setItems((list) => list.map((i) => (i.id === id ? { ...i, status } : i)));

    try {
      const res = await fetch(API, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error('failed');
    } catch {
      setItems((list) => list.map((i) => (i.id === id ? { ...i, status: prev.status } : i)));
      setError('Could not update the message. Please try again.');
    }
  }, []);

  const onSelect = useCallback(
    (id) => {
      setSelectedId(id);
      setDetailOpen(true);

      const current = itemsRef.current.find((i) => i.id === id);
      if (current?.status === 'unread') setStatus(id, 'read');
    },
    [setStatus]
  );

  const onDelete = useCallback(async (id) => {
    if (!window.confirm('Delete this message? This cannot be undone.')) return;

    const removed = itemsRef.current.find((i) => i.id === id);
    if (!removed) return;

    setItems((list) => list.filter((i) => i.id !== id));
    setDetailOpen(false);

    try {
      const res = await fetch(`${API}?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('failed');
    } catch {
      setItems((list) =>
        [removed, ...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      );
      setError('Could not delete the message. Please try again.');
    }
  }, []);

  const isPhone = selected?.contactType === 'phone';
  const left = selected ? daysLeft(selected.createdAt) : 0;

  return (
    <div className={`ib${detailOpen ? ' show-detail' : ''}`}>
      {/* ---------- header + stats ---------- */}
      <section className="ib-head">
        <div className="ib-title">
          <span className="ib-title-icon">
            <Icon name="mail" />
          </span>
          <div>
            <h1>Inbox</h1>
            <p>Messages &amp; inquiries submitted through your contact form.</p>
          </div>
        </div>

        <div className="ib-stats">
          <Stat tone="rose" icon="mail" label="Total Inquiries" value={counts.total} />
          <Stat tone="violet" icon="chat" label="Unread" value={counts.unread} />
          <Stat tone="green" icon="done" label="Responded" value={counts.replied} />
        </div>
      </section>

      <section className="ib-body">
        {/* ---------- list ---------- */}
        <div className="ib-panel ib-list-panel">
          <label className="ib-search">
            <Icon name="search" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email or keyword..."
              aria-label="Search messages"
            />
          </label>

          <div className="ib-filters" role="tablist" aria-label="Filter messages">
            {FILTERS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={filter === key}
                className={`ib-filter${filter === key ? ' is-active' : ''}`}
                onClick={() => setFilter(key)}
              >
                {label}
                <span>{key === 'all' ? counts.total : counts[key]}</span>
              </button>
            ))}
          </div>

          <div className="ib-list">
            {filtered.length === 0 ? (
              <div className="ib-empty">
                <Icon name="inbox" />
                <p>{items.length === 0 ? 'No messages yet' : 'No messages match'}</p>
                <small>
                  {items.length === 0
                    ? 'Messages from your contact form will show up here.'
                    : 'Try a different search or filter.'}
                </small>
              </div>
            ) : (
              filtered.map((item) => (
                <Row
                  key={item.id}
                  item={item}
                  active={selected?.id === item.id}
                  onSelect={onSelect}
                />
              ))
            )}
          </div>

          <p className="ib-note">
            <Icon name="clock" />
            Messages are deleted automatically after {RETENTION_DAYS} days.
          </p>
        </div>

        {/* ---------- detail ---------- */}
        <div className="ib-panel ib-detail-panel">
          {selected ? (
            <>
              <div className="ib-detail-head">
                <button
                  type="button"
                  className="ib-back"
                  onClick={() => setDetailOpen(false)}
                  aria-label="Back to messages"
                >
                  <Icon name="back" />
                </button>

                <span className={`ib-avatar ib-avatar-lg ${toneOf(selected.name)}`}>
                  {initialOf(selected.name)}
                </span>

                <div className="ib-detail-who">
                  <h2>{selected.name}</h2>
                  <time suppressHydrationWarning>
                    Submitted on {fullDate(selected.createdAt)}
                  </time>
                </div>

                <span className={`ib-status ${STATUS_LABEL[selected.status][1]}`}>
                  {STATUS_LABEL[selected.status][0]}
                </span>

                <div className="ib-detail-tools">
                  {selected.status !== 'replied' && (
                    <button
                      type="button"
                      className="ib-tool"
                      onClick={() => setStatus(selected.id, 'replied')}
                    >
                      <Icon name="check" />
                      Mark as Replied
                    </button>
                  )}
                  <button
                    type="button"
                    className="ib-tool ib-tool-danger"
                    onClick={() => onDelete(selected.id)}
                    aria-label="Delete message"
                  >
                    <Icon name="trash" />
                  </button>
                </div>
              </div>

              <div className="ib-info">
                <InfoRow icon="user" label="Name">
                  {selected.name}
                </InfoRow>

                {isPhone ? (
                  <InfoRow icon="whatsapp" label="WhatsApp">
                    {prettyPhone(selected.contact)}
                  </InfoRow>
                ) : (
                  <InfoRow icon="mail" label="Email">
                    {selected.contact}
                  </InfoRow>
                )}

                {selected.offering && (
                  <InfoRow icon="layers" label="Requirement">
                    {selected.offering}
                  </InfoRow>
                )}

                <InfoRow icon="message" label="Message">
                  {selected.message ? (
                    <p className="ib-message">{selected.message}</p>
                  ) : (
                    <span className="ib-muted">No message added.</span>
                  )}
                </InfoRow>
              </div>

              <div className="ib-foot">
                <p className="ib-expiry" suppressHydrationWarning>
                  <Icon name="clock" />
                  {left === 0
                    ? 'Auto-deletes today'
                    : `Auto-deletes in ${left} day${left === 1 ? '' : 's'}`}
                </p>

                <div className="ib-actions">
                  {isPhone ? (
                    <a
                      href={`https://wa.me/${waNumber(selected.contact)}?text=${encodeURIComponent(
                        `Hi ${selected.name}, thanks for reaching out!`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ib-btn ib-btn-wa"
                      onClick={() => setStatus(selected.id, 'replied')}
                    >
                      <Icon name="whatsapp" />
                      Reply on WhatsApp
                    </a>
                  ) : (
                    <button
                      type="button"
                      className="ib-btn ib-btn-mail"
                      onClick={() => {
                        openEmailReply(selected);
                        setStatus(selected.id, 'replied');
                      }}
                    >
                      <Icon name="mail" />
                      Reply on Email
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="ib-empty ib-empty-detail">
              <Icon name="message" />
              <p>Select a message</p>
              <small>Pick a message from the list to read it here.</small>
            </div>
          )}
        </div>
      </section>

      {error && (
        <div className="ib-toast" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}