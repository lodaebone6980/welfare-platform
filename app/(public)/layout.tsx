import AppSmartBanner from '@/components/layout/AppSmartBanner';
import MobileHeader from '@/components/layout/MobileHeader';
import BottomNav from '@/components/layout/BottomNav';
import ChannelTalk from '@/components/layout/ChannelTalk';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppSmartBanner />
      <MobileHeader />
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto">{children}</div>
      </main>
      <BottomNav />
      <ChannelTalk />
    </>
  );
}
