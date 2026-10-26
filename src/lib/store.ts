import {
  noteSecrets as seedSecrets,
  notes as seedNotes,
  projects as seedProjects,
  tasks as seedTasks,
} from './fixtures'
import type { DeletedProject, Note, NoteBlock, NoteRevision, Project, Task, TaskStatus } from './types'

/**
 * A writable stand-in for the server, used while `USE_FIXTURES` is on.
 *
 * The point is not to fake data — the fixtures already did that. The point is
 * that a button which cannot change anything is untestable: you cannot tell a
 * wiring bug from a backend that is not finished. With a store behind them, the
 * screens exercise the same hooks, the same cache invalidation and the same
 * optimistic paths they will use against the real API, so switching `get`/`send`
 * over to `fetch` changes one file and nothing else.
 *
 * State survives a reload because a task tracker that forgets what you typed the
 * moment you refresh cannot be evaluated by using it, which is the whole point
 * of running it locally.
 */

const KEY = 'wc.dev-store.v1'

/** A project in the local bin, with the tasks a restore would re-link. */
interface BinnedProject {
  project: Project
  deletedAt: string
  taskIds: string[]
}

interface Snapshot {
  /** Optional so a snapshot saved before the bin existed still loads. */
  deletedProjects?: BinnedProject[]
  tasks: Task[]
  projects: Project[]
  notes: Note[]
  /**
   * Field ids whose secret has been destroyed. See `vault()` — this is a list of
   * GRAVES, never of values.
   */
  purgedSecrets: string[]
}

/**
 * Secret values, held in memory for the length of the session and nowhere else.
 *
 * THE RULE: a credential value never reaches localStorage, a URL, a document
 * title, a log line or an analytics call. That is why it is not a field on the
 * note — if it were, `JSON.stringify(snapshot)` would put it in web storage the
 * first time anything changed, under a key anyone can guess.
 *
 * WHY THE VAULT IS BUILT LAZILY, AND WHY A GRAVE IS PERSISTED. The development
 * store re-seeds this map from the fixtures every time the module is evaluated —
 * which is to say every page load. An in-memory `delete` therefore held only
 * until the next refresh, and "ค่าที่ซ่อนไว้ถูกลบถาวรทันที และกู้คืนไม่ได้" was
 * false the moment a restored note was reopened in a new tab. Destruction has to
 * outlive the tab that performed it, so the ids of purged fields go into the
 * snapshot and seeding skips them.
 *
 * A purged id is safe to write down: `snapshot.notes` already carries every
 * field id in plain sight, and an id is the one thing about a secret that is not
 * a fact about its value.
 *
 * SEAM FOR THE BACKEND. There is no cryptography here and there must not be:
 * client-side encryption with a key the client also holds protects nothing. The
 * real product encrypts these server-side and hands the plaintext back only
 * after a step-up authentication that the SERVER checks. When that endpoint
 * exists, `revealSecret` becomes a POST to it and this map goes away; nothing
 * above this file has to change, because nothing above this file has ever seen
 * a secret it did not explicitly ask for.
 */
let secrets: Map<string, string> | null = null
function vault(): Map<string, string> {
  if (!secrets) {
    const graves = new Set(state().purgedSecrets)
    secrets = new Map(Object.entries(seedSecrets).filter(([id]) => !graves.has(id)))
  }
  return secrets
}

function seed(): Snapshot {
  // Deep copy: the fixtures are module-level constants and must not be mutated,
  // or a reset would hand back data the user already edited.
  return structuredClone({
    tasks: seedTasks, projects: seedProjects, notes: seedNotes, purgedSecrets: [],
  })
}

function read(): Snapshot {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return seed()
    const parsed = JSON.parse(raw) as Snapshot
    if (!Array.isArray(parsed.tasks) || !Array.isArray(parsed.projects)) return seed()
    // Notes arrived after the first snapshots were written. Grafting the seed on
    // rather than resetting means an existing user does not lose the tasks they
    // typed just because the shape grew a field.
    if (!Array.isArray(parsed.notes)) parsed.notes = structuredClone(seedNotes)
    // Same grafting rule for the graves: a snapshot written before this field
    // existed has destroyed nothing yet.
    if (!Array.isArray(parsed.purgedSecrets)) parsed.purgedSecrets = []
    return parsed
  } catch {
    // Private windows, cleared site data, storage disabled. Not worth failing over.
    return seed()
  }
}

function write(next: Snapshot): Snapshot {
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Nothing to do: the in-memory copy is still correct for this session.
  }
  return next
}

let snapshot: Snapshot | null = null
function state(): Snapshot {
  if (!snapshot) snapshot = read()
  return snapshot
}
function commit(next: Snapshot): Snapshot {
  snapshot = write(next)
  return snapshot
}

function id(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

/**
 * A note's content with every credentials block removed.
 *
 * Used for anything that keeps a copy — version history today, an export
 * tomorrow. Even though a credentials block carries no plaintext, its field
 * labels are a map of which secrets exist, and version history has no business
 * holding onto that: "เก็บเฉพาะเนื้อหาทั่วไป ไม่เก็บค่าที่ซ่อนไว้".
 */
function contentOnly(blocks: NoteBlock[]): NoteBlock[] {
  return structuredClone(blocks.filter((b) => b.kind !== 'credentials'))
}

export const store = {
  tasks(): Task[] {
    return state().tasks
  },

  task(taskId: string): Task | undefined {
    return state().tasks.find((t) => t.id === taskId)
  },

  projects(): Project[] {
    return state().projects
  },

  createTask(input: {
    title: string
    dueAt?: string | null
    projectId?: string
    priority?: Task['priority']
    status?: TaskStatus
    requester?: string
    description?: string
  }): Task {
    const s = state()
    const task: Task = {
      id: id('t'),
      title: input.title.trim(),
      description: input.description,
      // The server's rule: a deadline or a project is the triage the inbox is
      // waiting for, so a task that arrives with either skips it.
      status: input.status ?? (input.dueAt || input.projectId ? 'TODO' : 'INBOX'),
      priority: input.priority ?? 'MEDIUM',
      dueAt: input.dueAt ?? null,
      project: s.projects.find((p) => p.id === input.projectId),
      requester: input.requester,
      source: 'เพิ่มเอง',
      createdAt: new Date().toISOString(),
    }
    commit({ ...s, tasks: [task, ...s.tasks] })
    return task
  },

  updateTask(taskId: string, patch: Partial<Task> & { projectId?: string }): Task {
    const s = state()
    const i = s.tasks.findIndex((t) => t.id === taskId)
    if (i < 0) throw new Error(`ไม่พบงาน ${taskId}`)

    const { projectId, ...rest } = patch
    const next: Task = { ...s.tasks[i], ...rest }

    if (projectId !== undefined) {
      next.project = s.projects.find((p) => p.id === projectId)
    }
    // The server's triage rule: an inbox task that gains a deadline or a
    // project leaves the inbox, unless the same edit names a status itself.
    if (rest.status === undefined && next.status === 'INBOX' && (rest.dueAt || projectId)) {
      next.status = 'TODO'
    }
    // Any edit is somebody having looked at the draft, as on the server.
    if (Object.keys(patch).some((k) => k !== 'subtasks' && k !== 'attachments' && k !== 'links')) next.parseConfidence = undefined
    // completedAt is derived from status, never set by the caller: two sources
    // for one fact is how a task ends up marked done with no completion time.
    if (rest.status !== undefined) {
      next.completedAt = rest.status === 'DONE' ? new Date().toISOString() : null
    }

    const tasks = [...s.tasks]
    tasks[i] = next
    commit({ ...s, tasks })
    return next
  },

  /** Restores a whole task, for undo. Position is not preserved; order is derived. */
  restoreTask(task: Task): Task {
    const s = state()
    const tasks = s.tasks.some((t) => t.id === task.id)
      ? s.tasks.map((t) => (t.id === task.id ? task : t))
      : [task, ...s.tasks]
    commit({ ...s, tasks })
    return task
  },

  deleteTask(taskId: string): void {
    const s = state()
    commit({ ...s, tasks: s.tasks.filter((t) => t.id !== taskId) })
  },

  /* ----------------------------------------------------------------- notes -- */

  /** Live notes. Soft-deleted ones are held for undo and must not show in a list. */
  notes(): Note[] {
    return state().notes.filter((n) => !n.deletedAt)
  },

  /**
   * What is in the bin — Figma 219:28.
   *
   * Newest first: the note you are looking for is almost always the one you just
   * deleted and then walked away from.
   */
  deletedNotes(): Note[] {
    return state()
      .notes.filter((n) => !!n.deletedAt)
      .sort((a, b) => (b.deletedAt ?? '').localeCompare(a.deletedAt ?? ''))
  },

  note(noteId: string): Note | undefined {
    return state().notes.find((n) => n.id === noteId)
  },

  createNote(input: {
    title: string
    category?: Note['category']
    tags?: string[]
    projectId?: string
    taskIds?: string[]
    blocks?: NoteBlock[]
  }): Note {
    const s = state()
    const now = new Date().toISOString()
    const note: Note = {
      id: id('kn'),
      title: input.title.trim(),
      category: input.category ?? 'WORKFLOW',
      tags: input.tags ?? [],
      projectId: input.projectId,
      taskIds: input.taskIds ?? [],
      blocks: input.blocks ?? [],
      pinned: false,
      reviewAt: null,
      version: 1,
      updatedAt: now,
      revisions: [
        { version: 1, summary: 'สร้างบันทึก', at: now, title: input.title.trim(), blocks: contentOnly(input.blocks ?? []) },
      ],
    }
    commit({ ...s, notes: [note, ...s.notes] })
    return note
  },

  /**
   * `summary` is what the version row will say. It is optional because ticking a
   * checklist item is not an edit worth a version — pass it only for a real save
   * from the editor, and the history stays readable instead of filling up with
   * "แก้ไขบันทึก" forty times.
   */
  updateNote(noteId: string, patch: Partial<Note>, summary?: string): Note {
    const s = state()
    const i = s.notes.findIndex((n) => n.id === noteId)
    if (i < 0) throw new Error(`ไม่พบบันทึก ${noteId}`)

    const prev = s.notes[i]
    const now = new Date().toISOString()
    const next: Note = { ...prev, ...patch, updatedAt: now }

    if (summary) {
      next.version = prev.version + 1
      const revision: NoteRevision = {
        version: next.version,
        summary,
        at: now,
        title: next.title,
        // FR-KN-13, and the design's own line: "เก็บเฉพาะเนื้อหาทั่วไป ไม่เก็บค่าที่ซ่อนไว้".
        blocks: contentOnly(next.blocks),
      }
      next.revisions = [revision, ...prev.revisions]
    }

    const notes = [...s.notes]
    notes[i] = next
    commit({ ...s, notes })
    return next
  },

  /**
   * FR-KN-13's ย้อนกลับ. Restoring is itself a save, so it lands as a new version
   * rather than rewinding the counter — the history of what happened stays true.
   *
   * A revision with no captured content cannot be restored. The shipped fixture
   * history has none: those rows show what the panel looks like on a note with a
   * past, and real snapshots start accumulating the first time you save one.
   */
  revertNote(noteId: string, version: number): Note {
    const s = state()
    const note = s.notes.find((n) => n.id === noteId)
    if (!note) throw new Error(`ไม่พบบันทึก ${noteId}`)
    const target = note.revisions.find((r) => r.version === version)
    if (!target || target.blocks.length === 0) {
      throw new Error('เวอร์ชันนี้ไม่มีเนื้อหาที่เก็บไว้ จึงย้อนกลับไม่ได้')
    }
    // Credentials are not in a revision, so a revert must leave the block that is
    // on the note alone rather than dropping it.
    const credentials = note.blocks.filter((b) => b.kind === 'credentials')
    return this.updateNote(
      noteId,
      { title: target.title, blocks: [...structuredClone(target.blocks), ...credentials] },
      `ย้อนกลับไปเวอร์ชัน ${version}`,
    )
  },

  /**
   * Soft delete — 30 days in the bin. Linked tasks are deliberately untouched.
   *
   * The credential values are the exception: they are destroyed now, not in 30
   * days, and undo does not bring them back. A secret sitting in a recoverable
   * bin is a secret that is still live, and the confirmation says this out loud
   * before the press — Figma 235:1697, and again on the bin itself, 219:28:
   * "การกู้คืนจะได้เนื้อหาทั่วไปกลับมา แต่ต้องกรอกข้อมูลเข้าสู่ระบบใหม่".
   *
   * The grave is written to the snapshot in the same commit as the deletion, so
   * the destruction survives the reload that re-seeds the vault. Without it the
   * warning was true only until the next refresh.
   */
  deleteNote(noteId: string): void {
    const s = state()
    const note = s.notes.find((n) => n.id === noteId)
    const purged = new Set(s.purgedSecrets)
    for (const b of note?.blocks ?? []) {
      if (b.kind === 'credentials') {
        for (const f of b.fields) {
          vault().delete(f.id)
          if (f.secret) purged.add(f.id)
        }
      }
    }
    commit({
      ...s,
      purgedSecrets: [...purged],
      notes: s.notes.map((n) =>
        n.id === noteId ? { ...n, deletedAt: new Date().toISOString() } : n,
      ),
    })
  },

  /**
   * Forgotten unlock-code reset. Credentials are deliberately destroyed while
   * their note blocks remain: only the owner who knew the old code could have
   * read them, and a reset must not become a way around that fact.
   */
  purgeAllSecrets(): void {
    const s = state()
    const purged = new Set(s.purgedSecrets)
    for (const note of s.notes) {
      for (const block of note.blocks) {
        if (block.kind !== 'credentials') continue
        for (const field of block.fields) {
          vault().delete(field.id)
          purged.add(field.id)
        }
      }
    }
    commit({ ...s, purgedSecrets: [...purged] })
  },

  /** The undo half. Position is not preserved; order is derived. */
  restoreNote(note: Note): Note {
    const s = state()
    const restored: Note = { ...note, deletedAt: null }
    const notes = s.notes.some((n) => n.id === note.id)
      ? s.notes.map((n) => (n.id === note.id ? restored : n))
      : [restored, ...s.notes]
    commit({ ...s, notes })
    return restored
  },

  /**
   * The only door to a credential value.
   *
   * Callers must already have passed the step-up confirmation; this function
   * cannot check that, and pretending otherwise would be the kind of client-side
   * "security" that reads as a control and is not one. The real check belongs on
   * the server — see the note on `secrets` above.
   *
   * The return value must not be logged, put in a URL or written to storage.
   */
  revealSecret(fieldId: string): string | undefined {
    return vault().get(fieldId)
  },

  /**
   * Writes a secret to the in-memory vault only. Never persisted by this client.
   *
   * It also digs the grave, whatever the value is, and that is not a mistake:
   * the grave means "the shipped fixture for this id is dead", and typing over a
   * field kills it just as surely as deleting the note did. Leaving it alive
   * would mean a refresh replaced what the user typed with the demo password —
   * a resurrection, and of exactly the value they meant to get rid of.
   *
   * So the value itself lasts one session, as this whole map does, and the id
   * never goes back to the seed. Reading it after a reload gets nothing, which
   * the credentials block renders as "— ไม่มีค่าที่เก็บไว้".
   */
  setSecret(fieldId: string, value: string): void {
    if (value === '') vault().delete(fieldId)
    else vault().set(fieldId, value)

    const s = state()
    if (!s.purgedSecrets.includes(fieldId)) {
      commit({ ...s, purgedSecrets: [...s.purgedSecrets, fieldId] })
    }
  },

  /* -------------------------------------------------------------- projects -- */

  createProject(input: { name: string; color: Project['color'] }): Project {
    const s = state()
    const project: Project = { id: id('p'), name: input.name.trim(), color: input.color }
    commit({ ...s, projects: [...s.projects, project] })
    return project
  },

  /**
   * Rename, archive, un-archive — Figma 141:2 and 46:729.
   *
   * `archivedAt` is a date rather than a flag because the card says WHEN a
   * project was put away, and a boolean cannot answer that. Tasks are untouched:
   * archiving means the project takes no new work, not that its work vanished.
   */
  updateProject(projectId: string, patch: Partial<Omit<Project, 'id'>>): Project {
    const s = state()
    const i = s.projects.findIndex((p) => p.id === projectId)
    if (i < 0) throw new Error(`ไม่พบโปรเจกต์ ${projectId}`)

    const next: Project = { ...s.projects[i], ...patch }
    if (typeof next.name === 'string') next.name = next.name.trim()
    const projects = [...s.projects]
    projects[i] = next

    // A task carries a copy of its project, so a rename that only touched the
    // project list would leave every task row saying the old name until reload.
    const tasks = s.tasks.map((t) => (t.project?.id === projectId ? { ...t, project: next } : t))
    commit({ ...s, projects, tasks })
    return next
  },

  /**
   * Deleting a project unlinks its work; it never deletes it — Figma 141:2 says
   * so before the press ("งานและบันทึกที่อยู่ในโปรเจกต์นี้จะไม่ถูกลบ") and the
   * backend enforces the same rule. A tidy-up that silently took twelve tasks
   * with it would be the most expensive misread button in the product.
   */
  deleteProject(projectId: string): void {
    const s = state()
    const project = s.projects.find((p) => p.id === projectId)
    const binned: BinnedProject[] = project
      ? [{
        project,
        deletedAt: new Date().toISOString(),
        taskIds: s.tasks.filter((t) => t.project?.id === projectId).map((t) => t.id),
      }]
      : []
    commit({
      ...s,
      deletedProjects: [...binned, ...(s.deletedProjects ?? [])],
      projects: s.projects.filter((p) => p.id !== projectId),
      tasks: s.tasks.map((t) => (t.project?.id === projectId ? { ...t, project: undefined } : t)),
      notes: s.notes.map((n) => (n.projectId === projectId ? { ...n, projectId: undefined } : n)),
    })
  },

  /** The local bin, shaped like GET /api/projects/trash. */
  deletedProjects(): DeletedProject[] {
    const s = state()
    return (s.deletedProjects ?? []).map((b) => ({
      id: b.project.id,
      name: b.project.name,
      color: b.project.color,
      deletedAt: b.deletedAt,
      purgeAt: new Date(Date.parse(b.deletedAt) + 30 * 86_400_000).toISOString(),
      taskCount: s.tasks.filter((t) => b.taskIds.includes(t.id) && !t.project).length,
    }))
  },

  /**
   * Out of the bin, and its tasks back under it — the ones still unfiled. A
   * task filed somewhere else in the meantime stays where it was put, as on
   * the server.
   */
  restoreProject(projectId: string): Project {
    const s = state()
    const binned = (s.deletedProjects ?? []).find((b) => b.project.id === projectId)
    if (!binned) throw new Error(`ไม่พบโปรเจกต์ ${projectId} ในถัง`)
    commit({
      ...s,
      deletedProjects: (s.deletedProjects ?? []).filter((b) => b.project.id !== projectId),
      projects: [...s.projects, binned.project],
      tasks: s.tasks.map((t) => (binned.taskIds.includes(t.id) && !t.project ? { ...t, project: binned.project } : t)),
    })
    return binned.project
  },

  /** Back to the shipped fixtures. Used by the settings screen and by tests. */
  reset(): void {
    // Drop the cached vault too: a reset is meant to hand back the shipped
    // fixtures, graves included, and a stale map would keep the holes.
    secrets = null
    commit(seed())
  },
}
