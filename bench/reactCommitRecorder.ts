/**
 * Installed into the page before any app code runs (via Playwright's
 * `addInitScript`), posing as the React DevTools global hook. React hands every
 * commit to `onCommitFiberRoot`, and we walk the committed fiber tree the same
 * way DevTools does to work out which components actually rendered.
 *
 * This function is serialised and run in the browser, so it must not close over
 * anything from this module.
 */
export const installReactCommitRecorder = () => {
  type Fiber = {
    tag: number;
    flags: number;
    type: any;
    elementType: any;
    child: Fiber | null;
    sibling: Fiber | null;
    alternate: Fiber | null;
    actualDuration?: number;
  };

  // FunctionComponent, ClassComponent, ForwardRef, MemoComponent,
  // SimpleMemoComponent
  const COMPONENT_TAGS = new Set([0, 1, 11, 14, 15]);
  // React sets this flag on any component fiber whose render function ran in
  // the commit being reported. It is set in production builds too.
  const PERFORMED_WORK = 1;

  const nameOf = (fiber: Fiber): string => {
    const candidates = [fiber.elementType, fiber.type];
    for (const candidate of candidates) {
      if (!candidate) continue;
      if (candidate.displayName) return candidate.displayName;
      const inner = candidate.type ?? candidate.render;
      if (inner?.displayName) return inner.displayName;
      if (typeof candidate === "function" && candidate.name) {
        return candidate.name;
      }
      if (inner?.name) return inner.name;
    }
    return "(anonymous)";
  };

  type CommitRecord = {
    t: number;
    durationMs: number | null;
    renders: number;
    mounts: number;
    rendered: Record<string, number>;
  };

  const commits: CommitRecord[] = [];

  const recordCommit = (root: { current: Fiber }) => {
    const record: CommitRecord = {
      t: performance.now(),
      // Only present in React's profiling build: the total time spent
      // rendering this commit's tree.
      durationMs: root.current.actualDuration ?? null,
      renders: 0,
      mounts: 0,
      rendered: {},
    };
    const stack: Fiber[] = [root.current];
    while (stack.length > 0) {
      const fiber = stack.pop()!;
      if (fiber.sibling) stack.push(fiber.sibling);
      const previous = fiber.alternate;
      const isMount = previous === null;
      if (COMPONENT_TAGS.has(fiber.tag)) {
        if (isMount) {
          record.mounts++;
        } else if ((fiber.flags & PERFORMED_WORK) === PERFORMED_WORK) {
          record.renders++;
          const name = nameOf(fiber);
          record.rendered[name] = (record.rendered[name] ?? 0) + 1;
        }
      }
      // When a subtree bails out entirely, React reuses the existing child
      // fibers rather than cloning them, so the child pointer is unchanged and
      // nothing below here took part in this commit.
      if (fiber.child && (isMount || fiber.child !== previous.child)) {
        stack.push(fiber.child);
      }
    }
    commits.push(record);
  };

  const renderers = new Map<number, unknown>();
  (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    supportsFiber: true,
    isDisabled: false,
    renderers,
    inject(renderer: unknown) {
      const id = renderers.size + 1;
      renderers.set(id, renderer);
      return id;
    },
    checkDCE() {},
    onScheduleFiberRoot() {},
    onCommitFiberRoot(_id: number, root: { current: Fiber }) {
      try {
        recordCommit(root);
      } catch (error) {
        console.error("bench: failed to record commit", error);
      }
    },
    onPostCommitFiberRoot() {},
    onCommitFiberUnmount() {},
  };

  (window as any).__bench = { commits };
};
