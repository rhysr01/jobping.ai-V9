import Image from "next/image";
import React from "react";

type Props = {
  children: React.ReactNode; // the email preview
  className?: string;
};

export default function DeviceFrame({ children, className }: Props) {
  // iPhone 14 logical size used by our SVG: outer 390x844, inner screen 366x820 at (12,12)
  // Visual size reduced via responsive scale to avoid dominating the layout
  return (
    <div className={`inline-block origin-top scale-[0.82] sm:scale-[0.86] md:scale-[0.9] lg:scale-100 ${className ?? ""}`}>
      <div className="relative w-[390px] h-[844px]">
        {/* Device SVG as background */}
        <Image
          src="/device/iphone-14.svg"
          alt=""
          priority
          fill
          sizes="390px"
          className="pointer-events-none select-none"
        />
        {/* Screen content: align to the inner screen rect (x:12,y:12,w:366,h:820) */}
        <div
          className="absolute left-[12px] top-[12px] w-[366px] h-[820px] overflow-hidden rounded-[44px] bg-black"
          aria-hidden={false}
        >
          {/* Status bar */}
          <div className="relative z-10 px-4 pt-2">
            <Image src="/device/statusbar-dark.svg" alt="" width={366} height={20} />
          </div>
          {/* Scrollable email body */}
          <div className="relative z-10 h-[792px] overflow-y-auto pb-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
