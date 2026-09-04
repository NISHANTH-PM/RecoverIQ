"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  {
    href: "/",
    label: "Recovery Experience",
  },
  {
    href: "/merchant",
    label: "Merchant Intelligence",
  },
];

export default function TopNav() {
  const pathname = usePathname();

  return (
    <div className="mb-6 inline-flex rounded-full border border-gray-200 bg-white p-1 text-xs">
      {tabs.map((tab) => {
        const active =
          tab.href === "/"
            ? pathname === "/"
            : pathname?.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-full px-3 py-1.5 transition ${
              active
                ? "bg-black text-white"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}