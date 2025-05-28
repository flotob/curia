'use client'; // Marking as client component as FeedList uses client-side hooks

import { FeedList } from '@/components/voting/FeedList';

export default function HomePage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">
          Community Posts
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Discover and upvote the most relevant needs and issues from our community.
        </p>
      </header>
      <main>
        <FeedList />
      </main>
    </div>
  );
}
