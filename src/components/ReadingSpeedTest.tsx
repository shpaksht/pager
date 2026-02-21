"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const SAMPLE_TEXT = `The rain started just before dawn, thin and deliberate, tapping a patient rhythm against the library windows. By the time the front doors opened, the city had turned a shade quieter, as if each street had agreed to speak in a lower voice. Inside, the long oak tables held their usual arrangement of notebooks, pencils, phones turned face down, and paperbacks opened somewhere in the middle. No one looked hurried. The room carried that rare feeling of shared concentration: strangers sitting together for different reasons, moving in the same tempo.

Mara took the seat nearest the radiator and spread her things in a small, careful semicircle. She had a notebook for quotes, another for ideas, and a third for the practical details she never remembered unless she wrote them down twice. Her reading goal for the month was simple in theory and stubborn in practice: finish four books without skimming the difficult chapters. She had tried speed alone, then discipline alone, then guilt, then optimism. None had worked for long. Today she was trying a different approach. One page at a time, with full attention.

At the table across from her, a young engineer was reading a book on decision systems. Every few pages he paused, drew a tiny diagram, and crossed out half the arrows. He looked annoyed, then relieved, then annoyed again. Beside him, someone in a navy coat highlighted entire paragraphs in careful yellow lines, as if preserving light for later. Near the stairs, two students traded whispers about an exam, then went silent when the librarian looked up from her desk. The silence that followed was not strict; it was collaborative.

Mara began with a chapter she had postponed for three weeks. The first paragraph moved slowly. The second paragraph moved slower. She noticed the familiar impulse to skip forward, to hunt for the sentence that promised an easier path. Instead, she set a timer for fifteen minutes and made an agreement with herself: no skipping, no switching tabs, no checking messages. If the page stayed difficult, she would still stay with it. Five minutes passed. The sentences stopped resisting. Ten minutes passed. The argument became clear. By the end of fifteen, she had not only understood the chapter’s point; she had remembered why she started reading in the first place.

People think reading speed is a fixed trait, like eye color or height. It is not. Attention can be trained. Comprehension can be trained. Endurance can be trained. Speed follows those three. On days of low energy, progress may look small: a chapter, a few notes, one useful idea. On better days, progress compounds: difficult concepts click faster, summaries get sharper, and your eyes spend less time circling the same sentence. What matters is consistency measured in weeks, not heroics measured in hours.

Near noon, the rain intensified. Water streamed down the glass in diagonal threads and blurred the building across the street into a watercolor shape. The library lights warmed by contrast. Someone walked past with a stack of oversized art books pressed to their chest. Another reader folded a page corner, paused, and unfolded it again, choosing a proper bookmark instead. Small acts of care happened everywhere: adjusting a lamp, lending a charger, returning a chair to its place. The room was full of quiet maintenance.

Mara reached the end of the chapter and wrote three lines in her notebook: what the author argued, what evidence actually mattered, and where she disagreed. She kept the summary short on purpose. Long summaries felt productive but blurred the point; short summaries forced clarity. Then she looked at the clock and realized she had read for forty minutes without checking her phone once. That was unusual for her. It felt better than finishing quickly and forgetting everything an hour later.

In the afternoon, she switched to a novel she loved for completely different reasons. No frameworks. No diagrams. Just voice, image, and the slow expansion of another life. Her pace changed naturally. She did not force it faster. She let scenes breathe and dialogue land. Reading for understanding and reading for immersion required different kinds of time, but both benefited from the same foundation: undivided attention. The brain did not need constant novelty; it needed continuity.

By evening, the rain had stopped. The sidewalks reflected neon signs and bike lights in long trembling bands. Readers began packing up in stages: first the people with calendars full of obligations, then the students, then those who lingered because leaving would break the spell. Mara closed her books, stacked the notebooks, and checked what she had actually accomplished. Fewer pages than on some rushed days. Far better retention. Better notes. Better mood. Better chance she would come back tomorrow.

Before she left, she wrote one final line: Read in a way your future self can use. Then she underlined it once, not for emphasis, but as a small contract. Outside, the air smelled like wet stone and coffee. She walked home without headphones, repeating key ideas in her head, letting them settle into memory while the city resumed its evening noise. Progress, she thought, was often invisible while it happened. But if you returned to the page often enough, it became unmistakable.`;

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function formatSeconds(seconds: number) {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

export function ReadingSpeedTest() {
  const [isRunning, setIsRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(20);

  const wordCount = useMemo(() => countWords(SAMPLE_TEXT), []);
  const paragraphs = useMemo(
    () => SAMPLE_TEXT.split("\n\n").map((paragraph) => paragraph.trim()).filter(Boolean),
    []
  );

  useEffect(() => {
    if (!isRunning || !startedAt) return;
    const id = setInterval(() => {
      setElapsed((Date.now() - startedAt) / 1000);
    }, 100);

    return () => clearInterval(id);
  }, [isRunning, startedAt]);

  async function start() {
    setResult(null);
    setError(null);
    setElapsed(0);
    setStartedAt(Date.now());
    setIsRunning(true);
  }

  async function stop() {
    if (!startedAt) return;

    const secondsSpent = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    const wordsPerMinute = (wordCount / secondsSpent) * 60;

    setIsRunning(false);
    setResult(wordsPerMinute);
    setSaving(true);

    const response = await fetch("/api/speed-tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ textWordCount: wordCount, secondsSpent })
    });

    if (!response.ok) {
      const data = await response.json();
      setError(data.error || "Could not save reading speed result");
    }

    setSaving(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reading Speed Test</CardTitle>
        <CardDescription>
          Start reading, scroll naturally, and keep the sticky timer visible at the top.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[auto_auto_1fr]">
          <Button type="button" variant="outline" onClick={() => setFontSize((prev) => Math.max(16, prev - 2))}>
            A-
          </Button>
          <Button type="button" variant="outline" onClick={() => setFontSize((prev) => Math.min(36, prev + 2))}>
            A+
          </Button>
          <Button type="button" className="w-full" onClick={start} disabled={isRunning || saving}>
            Start
          </Button>
        </div>

        <div className="sticky top-3 z-20 rounded-sm border border-border bg-card/95 p-3 backdrop-blur">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="text-3xl tracking-widest">{formatSeconds(elapsed)}</div>
            <Button type="button" className="w-full sm:w-auto" onClick={stop} disabled={!isRunning || saving}>
              Stop
            </Button>
          </div>
        </div>

        <article className="rounded-md border border-border bg-card p-4" style={{ fontSize: `${fontSize}px`, lineHeight: 1.75 }}>
          {paragraphs.map((paragraph, index) => (
            <p key={index} className="mb-4 last:mb-0">
              {paragraph}
            </p>
          ))}
        </article>

        <Button type="button" className="w-full" onClick={stop} disabled={!isRunning || saving}>
          Stop
        </Button>

        {result !== null && (
          <p className="text-sm">
            Your reading speed: <strong>{result.toFixed(0)} words/min</strong>
            {saving ? " (saving...)" : ""}
          </p>
        )}

        <p className="text-sm text-muted-foreground">Words in sample text: {wordCount}</p>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </CardContent>
    </Card>
  );
}
