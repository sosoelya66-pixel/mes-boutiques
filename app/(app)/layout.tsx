import { AppStateProvider } from "@/components/AppState";
import { Header } from "@/components/Header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppStateProvider>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Header />
        {children}
      </div>
    </AppStateProvider>
  );
}
