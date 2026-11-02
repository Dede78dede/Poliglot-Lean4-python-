/**
 * RetrievalMemory (Phase 12, Sprint 12.2, Task PL2)
 *
 * Implements experience processor memory for AX-PROVER proposal loop:
 * - Stores structured lessons learned from failed proof steps
 * - Retrieves top-3 most relevant lessons for current goal and diagnostic
 * - Deduplicates (errorClass, tacticAttempted) pairs
 * - Persists lessons across workspace declarations
 */

export interface ProposalLesson {
  readonly declarationId: string;
  readonly iteration: number;
  readonly errorClass: string;
  readonly tacticAttempted: string;
  readonly whyItFailed: string;
  readonly suggestion: string;
  readonly createdAt: string;
}

export class DefaultRetrievalMemory {
  private readonly lessons: ProposalLesson[] = [];

  public addLesson(lesson: Omit<ProposalLesson, 'createdAt'>): ProposalLesson {
    const fullLesson: ProposalLesson = {
      ...lesson,
      createdAt: new Date().toISOString(),
    };
    this.lessons.push(fullLesson);
    return fullLesson;
  }

  /**
   * Retrieves top-3 lessons relevant to the given errorClass or tactic
   * deduplicating identical (errorClass, tacticAttempted) pairs.
   */
  public query(errorClass: string, tacticAttempted?: string, limit = 3): readonly ProposalLesson[] {
    const seenKeys = new Set<string>();
    const matched: ProposalLesson[] = [];

    // Filter by errorClass or tacticAttempted
    for (let i = this.lessons.length - 1; i >= 0; i--) {
      const lesson = this.lessons[i];
      const key = `${lesson.errorClass}:${lesson.tacticAttempted}`;

      if (seenKeys.has(key)) continue;

      const isMatch =
        lesson.errorClass === errorClass ||
        (tacticAttempted && lesson.tacticAttempted.includes(tacticAttempted));

      if (isMatch) {
        seenKeys.add(key);
        matched.push(lesson);
        if (matched.length >= limit) break;
      }
    }

    // If fewer than limit, backfill with recent unique lessons
    if (matched.length < limit) {
      for (let i = this.lessons.length - 1; i >= 0; i--) {
        const lesson = this.lessons[i];
        const key = `${lesson.errorClass}:${lesson.tacticAttempted}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          matched.push(lesson);
          if (matched.length >= limit) break;
        }
      }
    }

    return Object.freeze(matched);
  }

  public getAllLessons(): readonly ProposalLesson[] {
    return Object.freeze([...this.lessons]);
  }

  public clear(): void {
    this.lessons.length = 0;
  }
}

export const retrievalMemory = new DefaultRetrievalMemory();
