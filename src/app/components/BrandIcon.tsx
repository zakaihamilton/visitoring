import Image from "next/image";

export function BrandIcon() {
  return (
    <Image
      src="/brand/app-icon.svg"
      alt=""
      aria-hidden="true"
      className="brandMark"
      width={25}
      height={25}
    />
  );
}
