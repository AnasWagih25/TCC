const retryOrderEmails = async () => {
  const origin = process.env.URL;
  const secret = process.env.ORDER_EMAIL_RETRY_SECRET;
  if (!origin || !secret) return new Response('Order email retry is not configured.', { status: 503 });
  return fetch(new URL('/api/internal/order-emails', origin), { method: 'POST', headers: { Authorization: `Bearer ${secret}` } });
};
export default retryOrderEmails;
export const config = { schedule: '*/5 * * * *' };
