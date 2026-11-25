import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Search } from 'lucide-react';
import { Avatar } from '../../ui';
import { getHostAvatarUrl } from '../../../constants/mealConstants';
import styles from './MemberPicker.module.css';

/**
 * Menù a tendina con i membri della tribù: barra di ricerca + checkbox.
 * Props:
 *  - members: [{ _id, nickname, profileImage }]
 *  - selectedIds: string[]
 *  - onChange(ids)
 *  - lists: [{ _id, name, members: string[] }] (opzionale, scorciatoie)
 *  - defaultOpen: bool
 */
function MemberPicker({ members = [], selectedIds = [], onChange, lists = [], defaultOpen = false }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(defaultOpen);
  const [query, setQuery] = useState('');

  const selected = useMemo(() => new Set(selectedIds.map(String)), [selectedIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => (m.nickname || '').toLowerCase().includes(q));
  }, [members, query]);

  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  };

  const applyList = (list) => {
    const next = new Set(selected);
    (list.members || []).forEach((id) => next.add(String(id)));
    onChange([...next]);
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every((m) => selected.has(String(m._id)));
  const toggleAllFiltered = () => {
    const next = new Set(selected);
    filtered.forEach((m) => {
      if (allFilteredSelected) next.delete(String(m._id));
      else next.add(String(m._id));
    });
    onChange([...next]);
  };

  return (
    <div className={styles.picker}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span>
          {selected.size > 0
            ? t('tribe.picker.selected', '{{count}} selezionati', { count: selected.size })
            : t('tribe.picker.placeholder', 'Scegli dalla tua tribù')}
        </span>
        <ChevronDown size={18} className={open ? styles.chevOpen : ''} aria-hidden="true" />
      </button>

      {open && (
        <div className={styles.panel}>
          <div className={styles.searchBox}>
            <Search size={15} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('tribe.picker.search', 'Cerca un contatto...')}
              aria-label={t('tribe.picker.search', 'Cerca un contatto...')}
            />
          </div>

          {lists.length > 0 && (
            <div className={styles.chips}>
              {lists.map((l) => (
                <button key={l._id} type="button" className={styles.chip} onClick={() => applyList(l)}>
                  + {l.name} ({(l.members || []).length})
                </button>
              ))}
            </div>
          )}

          {filtered.length > 0 && (
            <label className={`${styles.option} ${styles.selectAll}`}>
              <input type="checkbox" checked={allFilteredSelected} onChange={toggleAllFiltered} />
              <span>{t('tribe.picker.selectAll', 'Seleziona tutti')}</span>
            </label>
          )}

          <div className={styles.options} role="group">
            {filtered.map((m) => {
              const id = String(m._id);
              const name = m.nickname || 'Utente';
              const img = m.profileImage ? getHostAvatarUrl(m.profileImage) : '';
              return (
                <label key={id} className={styles.option}>
                  <input type="checkbox" checked={selected.has(id)} onChange={() => toggle(id)} />
                  <Avatar src={img} name={name} size="sm" tone="accent" />
                  <span className={styles.name}>{name}</span>
                </label>
              );
            })}
            {filtered.length === 0 && (
              <p className={styles.empty}>
                {members.length === 0
                  ? t('tribe.picker.noMembers', 'La tua tribù è ancora vuota.')
                  : t('tribe.picker.noResults', 'Nessun contatto trovato.')}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MemberPicker;
