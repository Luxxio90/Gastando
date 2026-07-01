import { SharedFooterNav } from '@/components/shared/shared-footer-nav'

export default function SharedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SharedFooterNav />
    </>
  )
}
