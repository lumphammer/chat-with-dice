import { authClient } from "#/auth/authClient.ts";
import type { ClientUser } from "#/auth/clientUser.ts";
import { getRelativeTimeString } from "#/utils/getRelativeTimeString";
import { ChangeEmailSection } from "./ChangeEmailSection";
import { ChangeImageSection } from "./ChangeImageSection";
import { ChangeNameSection } from "./ChangeNameSection";
import { StorageQuotaSection } from "./StorageQuotaSection";

export function AccountSettingsForm({
  initialUser,
}: {
  initialUser: ClientUser;
}) {
  const { data: sessionData } = authClient.useSession();

  const name = sessionData?.user?.name ?? initialUser.name;
  const email = sessionData?.user?.email ?? initialUser.email;
  const image = sessionData?.user?.image ?? initialUser.image;
  const isAnonymous = sessionData?.user?.isAnonymous ?? initialUser.isAnonymous;

  return (
    <div className="flex w-full max-w-lg flex-col gap-6">
      {isAnonymous && (
        <div className="card bg-base-100 shadow-md">
          <div className="card-body prose">
            <h2 className="card-title text-lg">You're a guest, "{name}"</h2>
            <p>Create an account to keep your settings and files.</p>
            <p>
              <a href="/signup" className="btn btn-info">
                Create account
              </a>
            </p>
          </div>
        </div>
      )}
      <ChangeNameSection currentName={name ?? ""} />
      {!isAnonymous && (
        <>
          <StorageQuotaSection />
          <ChangeImageSection currentImage={image} name={name} email={email} />
          <ChangeEmailSection currentEmail={email} />
        </>
      )}
      {sessionData && (
        <div className="card bg-base-100 mb-4 shadow-md">
          <div className="card-body font-mono text-xs">
            <p>
              Logged in at {sessionData.session.createdAt.toLocaleString()} (
              {getRelativeTimeString(sessionData.session.createdAt)})
            </p>
            <p>
              Session updated at{" "}
              {sessionData.session.updatedAt.toLocaleString()} (
              {getRelativeTimeString(sessionData.session.updatedAt)})
            </p>
            <p>
              Session expires {sessionData.session.expiresAt.toLocaleString()} (
              {getRelativeTimeString(sessionData.session.expiresAt)})
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
