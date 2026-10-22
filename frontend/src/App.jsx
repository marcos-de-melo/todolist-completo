import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import TaskModal from './TaskModal.jsx';

function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const todayStr = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const formatDate = (s) =>
  new Date(`${s}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });

const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);
const SearchIcon = (p) => <Icon {...p} d={<><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>} />;
const PlusIcon = (p) => <Icon {...p} d={<path d="M12 5v14M5 12h14" />} />;
const EditIcon = (p) => <Icon {...p} d={<><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>} />;
const CloseIcon = (p) => <Icon {...p} d={<path d="M18 6 6 18M6 6l12 12" />} />;
const CheckIcon = (p) => <Icon {...p} d={<path d="M20 6 9 17l-5-5" />} />;

function Logo() {
  return (
    <div className="logo">
      <svg width="38" height="38" viewBox="0 0 40 40" aria-hidden="true">
        <defs>
          <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#22d3a6" />
            <stop offset=".5" stopColor="#3b82f6" />
            <stop offset="1" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <ellipse cx="20" cy="20" rx="16" ry="11" transform="rotate(-28 20 20)"
          fill="none" stroke="url(#ring)" strokeWidth="7" />
      </svg>
      <span>to<b>do.</b></span>
    </div>
  );
}

export default function App() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [tasks, setTasks] = useState([]);
  const [totals, setTotals] = useState({ total: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null); // null | { task?: Task }

  const load = useCallback(async (term, signal) => {
    try {
      const data = await api.list(term, signal);
      setTasks(data.tasks);
      setTotals({ total: data.total, completed: data.completed });
      setError('');
    } catch (e) {
      if (e.name !== 'AbortError') setError('Não foi possível carregar as tarefas. Verifique se o servidor está rodando.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  // Dispara a busca somente após o usuário parar de digitar (debounce)
  useEffect(() => {
    const ctrl = new AbortController();
    load(debouncedSearch.trim(), ctrl.signal);
    return () => ctrl.abort();
  }, [debouncedSearch, load]);

  const refresh = () => load(debouncedSearch.trim());

  const run = async (action) => {
    try {
      await action();
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  };

  const toggle = (t) => run(() => api.update(t.id, { completed: !t.completed }));
  const remove = (t) => run(() => api.remove(t.id));

  const save = async ({ title, dueDate }) => {
    if (modal.task) await api.update(modal.task.id, { title, dueDate: dueDate || null });
    else await api.create(title, dueDate || null);
    setModal(null);
    await refresh();
  };

  const today = todayStr();
  const isSearching = debouncedSearch.trim() !== '';

  return (
    <main className="page">
      <header className="hero">
        <Logo />
        <p>Organize and complete your pending tasks easily.</p>
      </header>

      <section className="panel">
        <h1>Your tasks</h1>

        <form className="search" role="search" onSubmit={(e) => e.preventDefault()}>
          <label className="search-field">
            <SearchIcon />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks" aria-label="Search tasks" />
          </label>
          <button type="submit" className="search-btn" aria-label="Search"><SearchIcon /></button>
        </form>

        <div className="counters">
          <span>Total tasks: <em className="pill">{totals.total}</em></span>
          <span>Completed <em className="pill">{totals.completed} de {totals.total}</em></span>
        </div>

        {error && <p className="error" role="alert">{error}</p>}

        {!loading && tasks.length === 0 && !error ? (
          <div className="empty">
            <button className="empty-plus" onClick={() => setModal({})} aria-label="Create task">
              <PlusIcon size={26} />
            </button>
            {isSearching ? (
              <>
                <p>No tasks found.</p>
                <small>Try a different search term.</small>
              </>
            ) : (
              <>
                <p>You have no pending tasks.</p>
                <small>Create one to get started.</small>
              </>
            )}
          </div>
        ) : (
          <ul className="list">
            {tasks.map((t) => {
              const done = Boolean(t.completed);
              const overdue = !done && t.due_date && t.due_date < today;
              return (
                <li key={t.id} className={`task ${done ? 'done' : ''} ${overdue ? 'overdue' : ''}`}>
                  <button className="check" onClick={() => toggle(t)} role="checkbox"
                    aria-checked={done} aria-label={done ? 'Mark as pending' : 'Mark as completed'}>
                    {done && <CheckIcon size={13} />}
                  </button>
                  <span className="title">{t.title}</span>
                  {overdue && <span className="badge">Em atraso</span>}
                  {t.due_date && <time className="date">{formatDate(t.due_date)}</time>}
                  <div className="actions">
                    <button onClick={() => setModal({ task: t })} aria-label="Edit task"><EditIcon /></button>
                    <button onClick={() => remove(t)} aria-label="Delete task"><CloseIcon /></button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <button className="fab" onClick={() => setModal({})} aria-label="Create task"><PlusIcon size={20} /></button>
      </section>

      {modal && <TaskModal task={modal.task} onClose={() => setModal(null)} onSave={save} />}
    </main>
  );
}
