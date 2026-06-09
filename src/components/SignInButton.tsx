import { useEffect, useState } from "react";

export const SignInButton = ({
  wrapperClass,
}: {
  wrapperClass: string | undefined;
}) => {
  const [href, setHref] = useState("/");

  useEffect(() => {
    setHref(
      `/signin?returnUrl=${encodeURIComponent(window.location.pathname)}`,
    );
  }, []);

  return (
    <div className={wrapperClass}>
      <a href={href} className="btn btn-primary btn-sm">
        Sign in
      </a>
    </div>
  );
};
