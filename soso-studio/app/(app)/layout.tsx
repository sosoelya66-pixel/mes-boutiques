import { Header } from "@/components/Header";
import { StudioProvider } from "@/components/Studio";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <StudioProvider>
      <div className="pt-safe mx-auto max-w-7xl px-4 pb-28 sm:px-6 sm:pt-8 md:pb-10 lg:px-8">
        <Header />
        {children}
      </div>
    </StudioProvider>
  );
}
