import { authClient } from "#/utils/auth-client";
import { ChangeEmailSection } from "./ChangeEmailSection";
import { ChangeImageSection } from "./ChangeImageSection";
import { ChangeNameSection } from "./ChangeNameSection";
import { ChangePasswordSection } from "./ChangePasswordSection";

type InitialUser = {
  name: string | null;
  email: string;
  image: string | null;
};

type Props = {
  initialUser: InitialUser;
};

export function AccountSettingsForm({ initialUser }: Props) {
  const { data: sessionData } = authClient.useSession();

  const name = sessionData?.user?.name ?? initialUser.name;
  const email = sessionData?.user?.email ?? initialUser.email;
  const image = sessionData?.user?.image ?? initialUser.image;

  return (
    <div className="flex w-full max-w-lg flex-col gap-6">
      <ChangeImageSection currentImage={image} name={name} email={email} />
      <ChangeNameSection currentName={name ?? ""} />
      <ChangeEmailSection currentEmail={email} />
      <ChangePasswordSection />
    </div>
  );
}
