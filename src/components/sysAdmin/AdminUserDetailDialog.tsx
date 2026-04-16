import type { UserWithRole } from "better-auth/client/plugins";
import { CheckCircle, XCircle } from "lucide-react";
import { memo } from "react";

type Props = {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  user: UserWithRole | null;
};

const BoolField = ({ value }: { value: boolean | null | undefined }) => {
  if (value == null) return <span className="text-base-content/50">—</span>;
  return value ? (
    <CheckCircle className="text-success h-4 w-4" />
  ) : (
    <XCircle className="text-error h-4 w-4" />
  );
};

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-0.5">
    <dt className="text-base-content/60 text-xs font-semibold tracking-wide uppercase">
      {label}
    </dt>
    <dd className="text-base-content text-sm">{children}</dd>
  </div>
);

export const AdminUserDetailDialog = memo(({ dialogRef, user }: Props) => {
  return (
    <dialog ref={dialogRef} className="modal">
      <div className="modal-box max-w-lg">
        <h3 className="mb-4 text-lg font-bold">User Details</h3>
        {user && (
          <dl className="grid grid-cols-2 gap-4">
            <Field label="ID">
              <span className="font-mono text-xs break-all">{user.id}</span>
            </Field>
            <Field label="Name">{user.name ?? "—"}</Field>
            <Field label="Email">{user.email}</Field>
            <Field label="Email Verified">
              <BoolField value={user.emailVerified} />
            </Field>
            <Field label="Role">
              {user.role ?? (
                <span className="text-base-content/50">user</span>
              )}
            </Field>
            <Field label="Banned">
              <BoolField value={user.banned} />
            </Field>
            <Field label="Ban Reason">
              {user.banReason ?? (
                <span className="text-base-content/50">—</span>
              )}
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
        )}
        <div className="modal-action">
          <form method="dialog">
            <button className="btn">Close</button>
          </form>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
});

AdminUserDetailDialog.displayName = "AdminUserDetailDialog";
