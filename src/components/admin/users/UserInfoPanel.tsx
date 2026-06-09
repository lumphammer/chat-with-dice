import type { User } from "#/auth/auth.ts";
import { CheckCircle, HatGlasses, XCircle } from "lucide-react";
import { memo } from "react";

const BoolField = ({ value }: { value: boolean | null | undefined }) => {
  if (value == null) return <span className="text-base-content/50">—</span>;
  return value ? (
    <CheckCircle className="text-success h-4 w-4" />
  ) : (
    <XCircle className="text-error h-4 w-4" />
  );
};

const AccountTypeField = ({
  isAnonymous,
}: {
  isAnonymous: boolean | null | undefined;
}) =>
  isAnonymous ? (
    <span className="flex items-center gap-1.5">
      <HatGlasses
        aria-hidden="true"
        className="text-primary h-4 w-4"
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
        role="img"
        aria-label="Anonymous user"
      />
      Anonymous
    </span>
  ) : (
    <span className="flex items-center gap-1.5">
      <CheckCircle
        aria-hidden="true"
        className="text-success h-4 w-4"
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
        role="img"
        aria-label="Full user"
      />
      Full
    </span>
  );

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-0.5">
    <dt
      className="text-base-content/60 text-xs font-semibold tracking-wide
        uppercase"
    >
      {label}
    </dt>
    <dd className="text-base-content text-sm">{children}</dd>
  </div>
);

export const UserInfoPanel = memo(({ user }: { user: User }) => (
  <div className="card bg-base-200">
    <div className="card-body">
      <h2 className="card-title text-base">User Info</h2>
      <dl className="grid grid-cols-2 gap-4">
        <Field label="ID">
          <span className="font-mono text-xs break-all">{user.id}</span>
        </Field>
        <Field label="Name">{user.name ?? "—"}</Field>
        <Field label="Email">{user.email}</Field>
        <Field label="Account Type">
          <AccountTypeField isAnonymous={user.isAnonymous} />
        </Field>
        <Field label="Email Verified">
          <BoolField value={user.emailVerified} />
        </Field>
        <Field label="Role">
          {user.role ?? <span className="text-base-content/50">user</span>}
        </Field>
        <Field label="Banned">
          <BoolField value={user.banned} />
        </Field>
        <Field label="Ban Reason">
          {user.banReason ?? <span className="text-base-content/50">—</span>}
        </Field>
        <Field label="Ban Expires">
          {user.banExpires ? (
            user.banExpires.toLocaleString()
          ) : (
            <span className="text-base-content/50">—</span>
          )}
        </Field>
        <Field label="Joined">{user.createdAt.toLocaleString()}</Field>
      </dl>
    </div>
  </div>
));

UserInfoPanel.displayName = "UserInfoPanel";
