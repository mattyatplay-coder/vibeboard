import { Sidebar } from "@/components/layout/Sidebar";
import { SessionProvider } from "@/context/SessionContext";

export default function ProjectLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <SessionProvider>
            <div className="min-h-screen bg-black">
                <Sidebar />
                <main className="ml-64">
                    {children}
                </main>
            </div>
        </SessionProvider>
    );
}
