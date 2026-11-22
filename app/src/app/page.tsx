import HomePage from '@/components/watch/HomePage';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ video?: string | string[] }>;
}) {
  const { video } = await searchParams;
  return <HomePage videoId={typeof video === 'string' ? video : undefined} />;
}
