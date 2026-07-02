# Modern React — Actions, use(), Server Components (19 / 19.2)

## Actions: the mutation pipeline

An *action* is an async function run inside a transition. React tracks its pending
state, surfaces errors, and coordinates optimistic UI. Stop hand-rolling
`isSubmitting`/`error` state around `fetch`.

### Forms with useActionState

```tsx
"use client";
import { useActionState } from "react";

type FormState = { ok: boolean; errors?: Record<string, string[]> };

function Signup({ signup }: { signup: (prev: FormState, fd: FormData) => Promise<FormState> }) {
  const [state, formAction, isPending] = useActionState(signup, { ok: false });

  return (
    <form action={formAction}>
      <label htmlFor="email">Email</label>
      <input id="email" name="email" aria-describedby="email-err" />
      {state.errors?.email && <p id="email-err">{state.errors.email[0]}</p>}
      <SubmitButton />
    </form>
  );
}
```

- Signature: `useActionState(fn, initialState)` → `[state, formAction, isPending]`;
  the action receives `(previousState, formData)`.
- Uncontrolled inputs + `name` attributes: the platform carries the data; React resets
  the form after a successful action. Progressive enhancement comes free when the
  action is a server action.

### useFormStatus — pending UI inside the form

```tsx
import { useFormStatus } from "react-dom";
function SubmitButton() {
  const { pending } = useFormStatus(); // must be rendered INSIDE the <form>
  return <button disabled={pending}>{pending ? "Saving…" : "Save"}</button>;
}
```

### useOptimistic — show the future, reconcile with the truth

```tsx
const [optimisticTodos, addOptimistic] = useOptimistic(
  todos,
  (current, newTodo: Todo) => [...current, { ...newTodo, pending: true }],
);

async function formAction(fd: FormData) {
  const todo = draftFrom(fd);
  addOptimistic(todo);        // instant UI — must run inside the action/transition
  await createTodo(todo);     // server truth replaces the optimistic state on settle
}
```

## use() — reading promises and context

`use(promise)` suspends until resolution; `use(context)` reads context — and unlike
hooks, `use` **may be called conditionally**.

```tsx
function Comments({ commentsPromise }: { commentsPromise: Promise<Comment[]> }) {
  const comments = use(commentsPromise); // suspends; nearest <Suspense> shows fallback
  return comments.map((c) => <Comment key={c.id} {...c} />);
}

// parent (Server Component): start the fetch, DON'T await — stream it
export default function Page() {
  const commentsPromise = fetchComments(); // no await: HTML streams, comments pop in
  return (
    <Suspense fallback={<Skeleton />}>
      <Comments commentsPromise={commentsPromise} />
    </Suspense>
  );
}
```

**Rule:** the promise must be *stable/cached* (created in a Server Component, a query
library, or a cache) — creating a new promise on every client render suspends forever
("uncached promise" warning). Pair every suspending subtree with an error boundary for
the rejection path.

## Server Components doctrine

- Components are **server by default** (in RSC frameworks); mark the *interactivity
  boundary* with `"use client"` — everything it imports ships to the browser.
- Keep client islands **small and low** in the tree. Don't put `"use client"` on a page
  because one button needs state — extract the button.
- **Serializable props only** across the boundary (no functions except server actions,
  no class instances, no Dates-pretending-to-be-strings surprises).
- Server code stays server-side: mark modules `import "server-only"` when they touch
  secrets; interleave server children into client shells via `children`:

```tsx
// server page composes: client shell, server content
<ClientTabs>
  <ServerRenderedPanel />  {/* rendered on the server, slotted into a client component */}
</ClientTabs>
```

## Server actions — every one is a public endpoint

`"use server"` exposes the function over HTTP. The framework hides the route; attackers
don't care. Non-negotiables, inside **every** action:

```tsx
"use server";
import { z } from "zod";

const Input = z.object({ title: z.string().min(1).max(200) });

export async function createPost(prev: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();                        // 1. authenticate
  if (!session) return { ok: false, errors: { _: ["Sign in"] } };

  const parsed = Input.safeParse(Object.fromEntries(fd)); // 2. validate
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten().fieldErrors };

  await db.post.create({                                // 3. authorize the ACTUAL data
    data: { ...parsed.data, authorId: session.user.id }, //    never trust ids from the client
  });
  revalidatePath("/posts");                             // 4. refresh caches
  return { ok: true };
}
```

Return typed results for the UI; throw only for the unexpected. Never pass secrets or
unfiltered DB rows to client components — select the fields you mean to expose.

## ref as a prop (forwardRef is legacy)

```tsx
function Input({ ref, ...props }: { ref?: Ref<HTMLInputElement> } & ComponentProps<"input">) {
  return <input ref={ref} {...props} />;
}
```

Ref callbacks may return cleanup functions (see effects.md). Migrate `forwardRef`
wrappers opportunistically.

## Activity (19.2) — keep-alive UI

`<Activity mode="visible" | "hidden">` preserves state and DOM of hidden subtrees and
defers their updates at background priority — the fix for "switching tabs loses my
scroll/form/video position":

```tsx
<Activity mode={tab === "inbox" ? "visible" : "hidden"}><Inbox /></Activity>
<Activity mode={tab === "sent" ? "visible" : "hidden"}><Sent /></Activity>
```

Hidden activities unmount their *effects* but keep their *state* — another reason
effects must have symmetric setup/cleanup.

## Metadata & resource loading

`<title>`, `<meta>`, `<link>` rendered anywhere are hoisted to `<head>` (in Next.js,
prefer its `metadata` export). For resources: `preload`/`preinit` from `react-dom`
(fonts, scripts, styles), `preconnect`/`prefetchDNS` for origins.

## Housekeeping (19)

- `<Context>` renders as its own provider — `<Ctx.Provider>` is legacy.
- Removed, do not suggest: `propTypes`, `defaultProps` on functions (use parameter
  defaults), string refs, legacy context, `findDOMNode`, `ReactDOM.render`/`hydrate`
  (use `createRoot`/`hydrateRoot`).
- Hydration mismatches print precise diffs now; fix the source (no `Date.now()`/random
  in render; gate browser-only rendering behind mount) rather than sprinkling
  `suppressHydrationWarning`.
