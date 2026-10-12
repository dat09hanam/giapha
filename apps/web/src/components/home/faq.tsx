'use client';

import { ChevronDown, MessageCircleQuestion, PhoneCall } from 'lucide-react';
import { useId, useState, type CSSProperties } from 'react';

import { ContactLink } from '@/components/social/contact-link';

import styles from './home.module.css';

type Question = { q: string; a: string };

/** Keep in sync with the `.faqBook` breakpoint in home.module.css. */
const ACCORDION_QUERY = '(max-width: 900px)';

const pad =(n: number) => String(n).padStart(2, '0');

/**
 * Index and answer page: numbered questions on the left, the chosen answer on a paper
 * sheet on the right. Each answer follows its question in the DOM, so on narrow screens
 * the same markup reads as an accordion, and every answer stays in the page for search.
 */
export function Faq({ questions }: { questions: readonly Question[] }) {
  const [open, setOpen] = useState(0);
  const id = useId();

  return (
    <div className={styles.faqBook} style={{ '--count': questions.length } as CSSProperties}>
      {questions.map(({ q, a }, index) => {
        const isOpen = index === open;
        const panelId = `${id}-answer-${index}`;
        return (
          <div key={q} className={styles.faqEntry}>
            <button
              type="button"
              className={styles.faqQuestion}
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => {
                // Only the accordion (narrow screens) may close; the wide layout always shows an answer.
                const accordion = window.matchMedia(ACCORDION_QUERY).matches;
                setOpen(isOpen && accordion ? -1 : index);
              }}
            >
              <span className={styles.faqNumber}>{pad(index + 1)}</span>
              <span className={styles.faqQuestionText}>{q}</span>
              <ChevronDown size={18} aria-hidden="true" />
            </button>
            <div id={panelId} className={styles.faqAnswer} hidden={!isOpen}>
              <span className={styles.faqAnswerMark} aria-hidden="true">
                <MessageCircleQuestion size={22} />
                Hỏi đáp {pad(index + 1)} / {pad(questions.length)}
              </span>
              <p className={styles.faqAnswerTitle}>{q}</p>
              <p className={styles.faqAnswerText}>{a}</p>
              <p className={styles.faqAnswerMore}>
                Vẫn còn thắc mắc?
                <ContactLink className={styles.faqContact}>
                  <PhoneCall size={15} aria-hidden="true" /> Hỏi trực tiếp chúng tôi
                </ContactLink>
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
