import SessionProvider from "@/components/SessionProvider";
import Sidebar from "@/components/Sidebar";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="flex h-full">
        <Sidebar />
        <main className="flex-1 ml-60 overflow-y-auto">
          <div className="p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </SessionProvider>
  );
}
