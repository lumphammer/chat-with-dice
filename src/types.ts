declare module "*.svg?react&variant=illustration" {
  import type { ComponentType, SVGProps } from "react";
  const c: ComponentType<SVGProps<SVGSVGElement>>;
  export default c;
}

declare module "*.svg?react" {
  import type { ComponentType, SVGProps } from "react";
  const c: ComponentType<SVGProps<SVGSVGElement>>;
  export default c;
}
