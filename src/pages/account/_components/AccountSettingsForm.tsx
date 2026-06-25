import { authClient } from "#/auth/authClient.ts";
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

  return (
    <div className="flex w-full max-w-lg flex-col gap-6">
      <StorageQuotaSection />
      <ChangeImageSection currentImage={image} name={name} email={email} />
      <ChangeNameSection currentName={name ?? ""} />
      <ChangeEmailSection currentEmail={email} />
    </div>
  );
}
