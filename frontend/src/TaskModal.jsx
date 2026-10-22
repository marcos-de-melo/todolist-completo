import { useEffect, useState } from 'react';

export default function TaskModal({ task, onClose, onSave }) {
  const editing = Boolean(task);
  const [title, setTitle] = useState(task?.title ?? '');
  const [dueDate, setDueDate] = useState(task?.due_date ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return setError('O nome da tarefa é obrigatório.');
    setSaving(true);
    try {
      await onSave({ title: title.trim(), dueDate });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={submit} role="dialog" aria-modal="true"
        aria-labelledby="modal-title">
        <h2 id="modal-title">{editing ? 'Edit Task' : 'Create Task'}</h2>

        <label>
          Task name
          <input autoFocus value={title} maxLength={255} placeholder="What needs to be done?"
            onChange={(e) => { setTitle(e.target.value); setError(''); }} />
        </label>

        <label>
          Due date <span className="optional">(optional)</span>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>

        {error && <p className="error" role="alert">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary" disabled={saving}>
            {editing ? 'Save changes' : 'Create task'}
          </button>
        </div>
      </form>
    </div>
  );
}
