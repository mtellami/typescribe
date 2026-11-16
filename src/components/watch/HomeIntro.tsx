'use client';

import { BookOpen, Captions, Headphones, Keyboard, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImportVideoForm } from './ImportVideoForm';

export function HomeIntro({
  onSelect,
  onBrowse,
}: {
  onSelect: (id: string) => void;
  onBrowse: () => void;
}) {
  return (
    <div className="home-intro">
      <section className="home-hero">
        <div className="home-copy min-w-0">
          <p className="text-primary flex items-center gap-2 text-[10px] font-medium tracking-[0.14em] uppercase sm:text-xs">
            <span className="bg-primary size-1.5 rounded-full" /> A little
            practice. A little progress.
          </p>
          <h1 className="max-w-xl text-[clamp(2rem,4.5vw,3rem)] leading-[1.12] font-semibold tracking-tight">
            Good videos.
            <br />
            Better <span className="text-primary">typing.</span>
          </h1>
          <p className="text-muted-foreground max-w-md text-sm leading-relaxed sm:text-base">
            Turn something you love watching into a moment of practice. Listen,
            type the captions, and find your rhythm.
          </p>
          <div className="home-features text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-xs">
            <span className="flex items-center gap-2">
              <Headphones className="size-3.5" /> Listen closely
            </span>
            <span className="flex items-center gap-2">
              <Keyboard className="size-3.5" /> Type naturally
            </span>
            <span className="flex items-center gap-2">
              <Captions className="size-3.5" /> One line at a time
            </span>
          </div>
          <Button variant="outline" onClick={onBrowse} className="w-fit">
            <BookOpen className="size-4" /> Browse library
          </Button>
        </div>
        <div className="home-import border-border bg-card min-w-0 rounded-2xl border p-4 sm:p-6">
          <div className="home-import-icon bg-primary/10 text-primary mb-5 hidden size-10 items-center justify-center rounded-xl sm:flex">
            <Video className="size-5" />
          </div>
          <ImportVideoForm onSelect={onSelect} />
        </div>
      </section>

      <aside className="home-steps grid grid-cols-3 gap-3 border-t pt-4 sm:gap-5 sm:pt-6">
        {[
          [
            '01',
            'Find something interesting',
            'A talk, a lesson, or your favorite creator.',
          ],
          [
            '02',
            'Make it your own',
            'Type every word, fill blanks, or write by ear.',
          ],
          [
            '03',
            'Settle into your rhythm',
            'Replay a line and practice at your own pace.',
          ],
        ].map(([number, title, description]) => (
          <div key={number} className="flex min-w-0 gap-2 sm:gap-3">
            <span className="text-primary/70 pt-0.5 font-mono text-xs">
              {number}
            </span>
            <div>
              <h3 className="text-[11px] font-medium sm:text-sm">{title}</h3>
              <p className="text-muted-foreground mt-1 hidden text-xs leading-5 sm:block">
                {description}
              </p>
            </div>
          </div>
        ))}
      </aside>
    </div>
  );
}
