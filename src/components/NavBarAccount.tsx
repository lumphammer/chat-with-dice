import { authClient } from "#/utils/auth-client";
import {
  Dices,
  LogOut,
  Settings,
  Shield,
  PersonStanding,
  File,
} from "lucide-react";
import { useRef } from "react";

type UserInfo = {
  name: string | null;
  email: string;
  image: string | null;
};

export function NavBarAccount({
  initialUser,
}: {
  initialUser: UserInfo | null;
}) {
  const { data: sessionData, isPending } = authClient.useSession();
  const menuRef = useRef<HTMLDivElement>(null);

  // When no initialUser was provided (e.g. static pages), start invisible and
  // fade in once the client has resolved the session, to avoid flashing the
  // wrong state (e.g. "Sign in" briefly appearing for a logged-in user).
  const needsFade = initialUser === null;
  const revealed = !needsFade || !isPending;

  // While the client-side session is still loading, use the server-provided
  // initial state so there's no skeleton flash or layout shift.
  const user: UserInfo | null = isPending
    ? initialUser
    : sessionData?.user
      ? {
          name: sessionData.user.name ?? null,
          email: sessionData.user.email,
          image: sessionData.user.image ?? null,
        }
      : null;

  const wrapperClass = !needsFade
    ? undefined
    : revealed
      ? "animate-fadein"
      : "opacity-0";

  function closeMenu() {
    menuRef.current?.hidePopover();
  }

  async function handleLogOut() {
    closeMenu();
    await authClient.signOut();
    window.location.href = "/";
  }

  if (!user) {
    return (
      <div className={wrapperClass}>
        <a
          href={`/signin?returnUrl=${encodeURIComponent(window.location.pathname)}`}
          className="btn btn-primary btn-sm"
        >
          Sign in
        </a>
      </div>
    );
  }

  const initials = getInitials(user.name, user.email);

  return (
    <div className={wrapperClass}>
      <button
        className="btn btn-ghost btn-circle"
        popoverTarget="nav-user-menu"
        style={{ anchorName: "--nav-user-menu" } as React.CSSProperties}
      >
        <AvatarDisplay
          image={user.image}
          name={user.name}
          initials={initials}
        />
      </button>
      <div
        id="nav-user-menu"
        ref={menuRef}
        popover="auto"
        className="dropdown dropdown-end rounded-box bg-base-100 ring-base-200
          w-56 shadow-lg ring-1"
        style={{ positionAnchor: "--nav-user-menu" } as React.CSSProperties}
      >
        <div className="border-base-200 border-b px-4 py-3">
          {user.name && <p className="truncate font-semibold">{user.name}</p>}
          <p className="truncate text-xs opacity-60">{user.email}</p>
        </div>
        <ul className="menu p-2">
          {sessionData?.user.isAnonymous && (
            <li>
              <a href="/signup" onClick={closeMenu}>
                <PersonStanding size={16} />
                Create an account
              </a>
            </li>
          )}
          {!sessionData?.user.isAnonymous && (
            <li>
              <a href="/roller/rooms" onClick={closeMenu}>
                <Dices size={16} />
                Your rooms
              </a>
            </li>
          )}
          {!sessionData?.user.isAnonymous && (
            <li>
              <a href="/files" onClick={closeMenu}>
                <File size={16} />
                Your files
              </a>
            </li>
          )}
          <li>
            <a href="/account" onClick={closeMenu}>
              <Settings size={16} />
              Account Settings
            </a>
          </li>
          {sessionData?.user.role === "admin" && (
            <li>
              <a href="/sysadmin" onClick={closeMenu}>
                <Shield size={16} />
                Sysadmin
              </a>
            </li>
          )}
          <li>
            <button onClick={handleLogOut}>
              <LogOut size={16} />
              Log out
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return email[0].toUpperCase();
}

function AvatarDisplay({
  image,
  name,
  initials,
}: {
  image: string | null;
  name: string | null;
  initials: string;
}) {
  if (image) {
    return (
      <div className="avatar">
        <div className="w-10 rounded-full">
          <img src={image} alt={name ?? "User avatar"} />
        </div>
      </div>
    );
  }

  return (
    <div className="avatar avatar-placeholder">
      <div className="bg-primary text-primary-content w-10 rounded-full">
        <span className="text-sm font-semibold">{initials}</span>
      </div>
    </div>
  );
}
