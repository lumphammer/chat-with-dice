import { authClient } from "#/auth/authClient.ts";
import type { ClientUser } from "#/auth/clientUser.ts";
import { isAdminOrBetter } from "#/utils/roleHelpers.ts";
import {
  Contact,
  Cookie,
  Dices,
  File,
  Info,
  LogIn,
  LogOut,
  Menu,
  PaintRoller,
  PersonStanding,
  ScrollText,
  Settings,
  Shield,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export function NavBarAccount({
  initialUser,
}: {
  initialUser: ClientUser | null;
}) {
  const { data: sessionData, isPending } = authClient.useSession();
  const menuRef = useRef<HTMLDivElement>(null);
  const [signInHref, setSignInHref] = useState("/signin");

  // When no initialUser was provided (e.g. static/prerendered pages), start
  // invisible and fade in once the client has resolved the session, to avoid
  // flashing the wrong state — e.g. a logged-in user briefly seeing the menu
  // (hamburger) icon before their avatar appears.
  const needsFade = initialUser === null;
  const revealed = !needsFade || !isPending;

  useEffect(() => {
    setSignInHref(
      `/signin?returnUrl=${encodeURIComponent(window.location.pathname)}`,
    );
  }, []);

  // While the client-side session is still loading, use the server-provided
  // initial state so there's no skeleton flash or layout shift.
  const user: ClientUser | null = useMemo(
    () =>
      isPending
        ? initialUser
        : sessionData?.user
          ? {
              name: sessionData.user.name ?? null,
              email: sessionData.user.email,
              image: sessionData.user.image ?? null,
              isAnonymous: sessionData.user.isAnonymous ?? false,
            }
          : null,
    [sessionData, isPending, initialUser],
  );

  function closeMenu() {
    menuRef.current?.hidePopover();
  }

  async function handleLogOut() {
    closeMenu();
    await authClient.signOut();
    window.location.href = "/";
  }

  const initials = user ? getInitials(user.name, user.email) : null;

  const wrapperClass = !needsFade
    ? undefined
    : revealed
      ? "animate-fadein"
      : "opacity-0";

  return (
    <div className={wrapperClass}>
      <button
        className="btn btn-ghost btn-circle"
        popoverTarget="nav-user-menu"
        style={{ anchorName: "--nav-user-menu" } as React.CSSProperties}
        aria-label={user ? "Open account menu" : "Open site menu"}
      >
        {user && initials ? (
          <AvatarDisplay
            image={user.image}
            name={user.name}
            initials={initials}
          />
        ) : (
          <Menu aria-hidden="true" />
        )}
      </button>
      <div
        id="nav-user-menu"
        ref={menuRef}
        popover="auto"
        className="dropdown dropdown-end rounded-box bg-base-100 ring-base-200
          w-fit shadow-lg ring-1"
        style={{ positionAnchor: "--nav-user-menu" } as React.CSSProperties}
      >
        {user && (
          <div className="border-base-200 border-b px-4 py-3">
            {user.name && <p className="truncate font-semibold">{user.name}</p>}
            <p className="truncate opacity-70">
              {user.isAnonymous ? "Anonymous user" : user.email}
            </p>
          </div>
        )}
        <ul className="menu p-2">
          {user && (
            <>
              {user.isAnonymous && (
                <li>
                  <a href="/signup" onClick={closeMenu}>
                    <PersonStanding size={16} />
                    Create an account
                  </a>
                </li>
              )}
              <li>
                <a href="/rooms" onClick={closeMenu}>
                  <Dices size={16} />
                  Your rooms
                </a>
              </li>
              {!user.isAnonymous && (
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
              {isAdminOrBetter(sessionData?.user.role) && (
                <li>
                  <a href="/admin" onClick={closeMenu}>
                    <Shield size={16} />
                    Admin
                  </a>
                </li>
              )}
              {isAdminOrBetter(sessionData?.user.role) && (
                <li>
                  <a href="/style-demo" onClick={closeMenu}>
                    <PaintRoller size={16} />
                    Style Demo
                  </a>
                </li>
              )}
              <li
                className="border-base-200 my-1 border-t"
                aria-hidden="true"
              />
            </>
          )}
          <li>
            <a href="/about" onClick={closeMenu}>
              <Info size={16} />
              About
            </a>
          </li>
          <li>
            <a href="/terms" onClick={closeMenu}>
              <ScrollText size={16} />
              Terms of service
            </a>
          </li>
          <li>
            <a href="/contact" onClick={closeMenu}>
              <Contact size={16} />
              Contact
            </a>
          </li>
          <li>
            <a href="/cookie-policy" onClick={closeMenu}>
              <Cookie size={16} />
              Cookie policy
            </a>
          </li>
          <li className="border-base-200 my-1 border-t" aria-hidden="true" />
          {user ? (
            <li>
              <button onClick={handleLogOut}>
                <LogOut size={16} />
                Log out
              </button>
            </li>
          ) : (
            <li>
              <a href={signInHref} onClick={closeMenu}>
                <LogIn size={16} />
                Sign in
              </a>
            </li>
          )}
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
