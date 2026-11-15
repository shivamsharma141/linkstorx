import { requireAuth } from '@/app/lib/auth/auth';
import { getInbox } from '@/app/businessLogic/inquiryBusinessLogic';
import InboxClient from './InboxClient';
import './inbox.css';

export const metadata = {
  title: 'Inbox | LinkStorX',
};

/*
 * Server component: first load ka data seedha DB se (extra API call nahi).
 * Uske baad sab updates ek hi API (/api/inbox) se hote hain.
 */
export default async function InboxPage() {
  const user = await requireAuth();
  const { items } = await getInbox(user.id);

  /* Pakka plain JSON: Server -> Client serialize error kabhi nahi aayega */
  const plainItems = JSON.parse(JSON.stringify(items));

  return <InboxClient initialItems={plainItems} />;
}