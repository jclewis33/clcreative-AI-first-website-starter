import { useEffect, useRef, useState } from "react";

interface Question {
  id: string;
  text: string;
  why: string;
}

interface Room {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  description: string;
  questions: Question[];
}

// Placeholder quiz content. Replace these 7 sections (3 questions each) with
// your own. Keep the question ids unique — scoring is keyed off them.
const LOREM_QUESTION =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.";
const LOREM_WHY =
  "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";

const ROOMS: Room[] = Array.from({ length: 7 }, (_, i) => {
  const n = i + 1;
  return {
    id: `section-${n}`,
    name: `Section ${n}`,
    subtitle: "Lorem ipsum dolor",
    icon: ["①", "②", "③", "④", "⑤", "⑥", "⑦"][i],
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    questions: Array.from({ length: 3 }, (_, j) => ({
      id: `q${i * 3 + j + 1}`,
      text: LOREM_QUESTION,
      why: LOREM_WHY,
    })),
  };
});

const RATING_LABELS = [
  "Don't have this",
  "Just an idea",
  "In place, underperforming",
  "Working, but not optimized",
  "Optimized",
];

type TierKey = "solid" | "gaps" | "disconnected" | "none";

interface Tier {
  key: TierKey;
  label: string;
  message: string;
  next: string;
}

function getTier(score: number): Tier {
  if (score >= 85)
    return {
      key: "solid",
      label: "Tier One",
      message:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      next: "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    };
  if (score >= 60)
    return {
      key: "gaps",
      label: "Tier Two",
      message:
        "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
      next: "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    };
  if (score >= 35)
    return {
      key: "disconnected",
      label: "Tier Three",
      message:
        "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium totam rem.",
      next: "Aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.",
    };
  return {
    key: "none",
    label: "Tier Four",
    message:
      "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores.",
    next: "Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit sed quia non numquam.",
  };
}

function tierClass(pct: number): string {
  if (pct >= 80) return "is-good";
  if (pct >= 50) return "is-medium";
  return "is-low";
}

interface RatingButtonProps {
  value: number;
  selected: boolean;
  onClick: (v: number) => void;
}

function RatingButton({ value, selected, onClick }: RatingButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`scorecard_rating_btn${selected ? " is-selected" : ""}`}
    >
      <span className="scorecard_rating_dot" aria-hidden="true">
        {value}
      </span>
      <span className="scorecard_rating_label">{RATING_LABELS[value - 1]}</span>
    </button>
  );
}

interface ProgressBarProps {
  current: number;
  total: number;
}

function ProgressBar({ current, total }: ProgressBarProps) {
  const pct = (current / total) * 100;
  return (
    <div
      className="scorecard_progress_track"
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={0}
      aria-valuemax={total}
    >
      <div className="scorecard_progress_fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

interface MarketingScorecardProps {
  /**
   * When true, the component starts in the quiz phase, skipping the built-in
   * intro screen. Use this when the page provides its own hero/intro markup
   * (e.g. marketing-scorecard.astro) and just needs the quiz + email + results
   * flow from this component.
   */
  skipIntro?: boolean;
}

export default function MarketingScorecard({
  skipIntro = false,
}: MarketingScorecardProps) {
  const [phase, setPhase] = useState<"intro" | "quiz" | "email" | "results">(
    skipIntro ? "quiz" : "intro",
  );
  const [currentRoom, setCurrentRoom] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [website, setWebsite] = useState("");
  // Honeypot — hidden from humans; the API silently drops submissions
  // where this is filled in (bot protection).
  const [company, setCompany] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [websiteError, setWebsiteError] = useState("");
  const [animating, setAnimating] = useState(false);
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
  const advanceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current !== null) {
        window.clearTimeout(advanceTimerRef.current);
      }
    };
  }, []);

  const isValidEmail = (val: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val);

  // Lenient URL check: requires something like `domain.tld`. Protocol optional.
  const isValidWebsite = (val: string) =>
    /^(https?:\/\/)?[^\s.]+(\.[^\s.]+)+\.?$/.test(val.trim());

  const normalizeWebsite = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return "";
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  };

  const emailIsValid = isValidEmail(email);
  const websiteIsValid = website.trim() === "" || isValidWebsite(website);
  const formReady =
    firstName.trim().length > 0 && emailIsValid && websiteIsValid;

  const totalQuestions = ROOMS.reduce((acc, r) => acc + r.questions.length, 0);
  const answeredCount = Object.keys(answers).length;
  const totalScore = Object.values(answers).reduce((a, b) => a + b, 0);

  function getRoomScore(roomIndex: number) {
    return ROOMS[roomIndex].questions.reduce(
      (acc, q) => acc + (answers[q.id] || 0),
      0,
    );
  }

  function handleAnswer(questionId: string, value: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function transition(callback: () => void) {
    setAnimating(true);
    window.setTimeout(() => {
      callback();
      setAnimating(false);
    }, 300);
  }

  function resetQuiz() {
    const hasProgress = Object.keys(answers).length > 0;
    if (
      hasProgress &&
      !window.confirm("Start over? Your current answers will be cleared.")
    ) {
      return;
    }
    setPhase(skipIntro ? "quiz" : "intro");
    setCurrentRoom(0);
    setCurrentQuestion(0);
    setAnswers({});
    setEmail("");
    setFirstName("");
    setWebsite("");
    setEmailError("");
    setWebsiteError("");
    setExpandedRoom(null);
  }

  function nextQuestion() {
    const room = ROOMS[currentRoom];
    if (currentQuestion < room.questions.length - 1) {
      transition(() => setCurrentQuestion(currentQuestion + 1));
    } else if (currentRoom < ROOMS.length - 1) {
      transition(() => {
        setCurrentRoom(currentRoom + 1);
        setCurrentQuestion(0);
      });
    } else {
      transition(() => setPhase("email"));
    }
  }

  // Auto-advance: clicking a rating saves it, then advances to the next
  // question after a short delay so the user sees the selection register.
  // Re-clicking before the delay elapses resets the timer (lets them change
  // their mind without auto-advancing prematurely).
  function handleRatingClick(questionId: string, value: number) {
    handleAnswer(questionId, value);
    if (advanceTimerRef.current !== null) {
      window.clearTimeout(advanceTimerRef.current);
    }
    advanceTimerRef.current = window.setTimeout(() => {
      advanceTimerRef.current = null;
      nextQuestion();
    }, 350);
  }

  function prevQuestion() {
    if (currentQuestion > 0) {
      transition(() => setCurrentQuestion(currentQuestion - 1));
    } else if (currentRoom > 0) {
      const prevRoom = ROOMS[currentRoom - 1];
      transition(() => {
        setCurrentRoom(currentRoom - 1);
        setCurrentQuestion(prevRoom.questions.length - 1);
      });
    }
  }

  async function handleEmailSubmit(e?: React.FormEvent) {
    if (e && e.preventDefault) e.preventDefault();
    if (!firstName.trim()) return;
    if (!isValidEmail(email)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    if (website.trim() && !isValidWebsite(website)) {
      setWebsiteError("Please enter a valid website (e.g. yourcompany.com).");
      return;
    }
    setEmailError("");
    setWebsiteError("");
    setSubmitting(true);

    const roomScoresData = ROOMS.map((r, i) => ({
      name: r.name,
      subtitle: r.subtitle,
      score: getRoomScore(i),
      max: r.questions.length * 5,
      questions: r.questions.map((q, qi) => {
        const rating = answers[q.id] ?? 0;
        return {
          index: qi + 1,
          text: q.text,
          rating,
          label: rating ? RATING_LABELS[rating - 1] : "Not answered",
        };
      }),
    }));

    const tier = getTier(totalScore);
    const scoreData = {
      firstName,
      email,
      website: normalizeWebsite(website),
      totalScore,
      maxScore: 105,
      tier: tier.label,
      tierMessage: tier.message,
      tierNext: tier.next,
      rooms: roomScoresData,
      answers,
      company,
    };

    try {
      await fetch("/api/scorecard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scoreData),
      });
    } catch (err) {
      // Network errors don't block the user — they still see their results.
      // Submission failures are logged on the server.
      console.error("Scorecard submission failed:", err);
    }

    setSubmitting(false);
    setPhase("results");
  }

  const room = ROOMS[currentRoom];
  const question = room?.questions[currentQuestion];
  const currentAnswer = question ? answers[question.id] : undefined;
  const isFirst = currentRoom === 0 && currentQuestion === 0;
  const tier = getTier(totalScore);

  // ---- INTRO ----
  if (phase === "intro") {
    return (
      <div className="scorecard_wrap">
        <div className="scorecard_intro_wrap">
          <div className="scorecard_intro_header">
            <div className="scorecard_intro_icon" aria-hidden="true">
              ☆
            </div>
            <h1 className="scorecard_intro_title u-text-style-h2">
              The Starter Scorecard
            </h1>
            <p className="scorecard_intro_text u-text-style-regular u-text-style-muted">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Score
              yourself across 7 sections in 5 minutes and see your results.
            </p>
          </div>

          <div className="scorecard_rooms_card">
            <p className="scorecard_rooms_label u-text-style-eyebrow">
              You'll score 7 sections
            </p>
            <ul className="scorecard_rooms_list">
              {ROOMS.map((r) => (
                <li key={r.id} className="scorecard_rooms_item">
                  <span className="scorecard_rooms_icon" aria-hidden="true">
                    {r.icon}
                  </span>
                  <span className="scorecard_rooms_name">{r.name}</span>
                  <span className="scorecard_rooms_sub u-text-style-small u-text-style-muted">
                    — {r.subtitle}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="scorecard_intro_meta u-text-style-small u-text-style-muted">
            21 questions. 5 minutes. Be honest — the value is in seeing the real
            picture.
          </p>
          {/* (Intro phase is skipped when the page passes skipIntro.) */}

          <button
            type="button"
            onClick={() => setPhase("quiz")}
            className="scorecard_primary_btn"
          >
            Start the Scorecard
          </button>
        </div>
      </div>
    );
  }

  // ---- QUIZ ----
  if (phase === "quiz" && room && question) {
    return (
      <div className="scorecard_wrap">
        <div className="scorecard_progress_wrap">
          {!isFirst && (
            <button
              type="button"
              onClick={prevQuestion}
              className="scorecard_back_btn"
              aria-label="Go back to previous question"
            >
              <svg
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="scorecard_back_btn_chevron"
              >
                <polyline points="8,2 3,6 8,10" />
              </svg>
              Back
            </button>
          )}
          <div className="scorecard_progress_meta">
            <span className="scorecard_progress_count u-text-style-tiny">
              {answeredCount} of {totalQuestions}
            </span>
            <span className="scorecard_progress_count u-text-style-tiny">
              Section {currentRoom + 1} of 7
            </span>
          </div>
          <ProgressBar current={answeredCount} total={totalQuestions} />
        </div>

        <div
          className={`scorecard_room_header${animating ? " is-animating" : ""}`}
        >
          <div className="scorecard_room_header_inner">
            <span className="scorecard_room_icon" aria-hidden="true">
              {room.icon}
            </span>
            <div className="scorecard_room_header_text">
              <h2 className="scorecard_room_name u-text-style-h4">
                {room.name}
              </h2>
              <span className="scorecard_room_subtitle u-text-style-eyebrow">
                {room.subtitle}
              </span>
            </div>
          </div>
          {currentQuestion === 0 && (
            <p className="scorecard_room_description u-text-style-regular u-text-style-muted">
              {room.description}
            </p>
          )}
        </div>

        <div
          className={`scorecard_question_wrap${animating ? " is-animating" : ""}`}
        >
          <div className="scorecard_question_card">
            <p className="scorecard_question_text u-text-style-large">
              {question.text}
            </p>
            <p className="scorecard_question_why u-text-style-small u-text-style-muted">
              {question.why}
            </p>
          </div>

          <div className="scorecard_rating_list">
            {[1, 2, 3, 4, 5].map((v) => (
              <RatingButton
                key={v}
                value={v}
                selected={currentAnswer === v}
                onClick={(val) => handleRatingClick(question.id, val)}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---- EMAIL GATE ----
  if (phase === "email") {
    return (
      <div className="scorecard_wrap">
        <div className="scorecard_email_wrap">
          <div className="scorecard_email_header">
            <div className="scorecard_email_icon" aria-hidden="true">
              📊
            </div>
            <h2 className="scorecard_email_title u-text-style-h3">
              Your scorecard is ready.
            </h2>
            <p className="scorecard_email_text u-text-style-regular u-text-style-muted">
              Enter your email to see your score, a section-by-section
              breakdown, and what to focus on first.
            </p>
          </div>

          <form
            onSubmit={handleEmailSubmit}
            className="scorecard_email_form"
            noValidate
          >
            <div className="scorecard_email_fields">
              <label className="scorecard_input_label">
                <span className="u-sr-only">First name</span>
                <input
                  type="text"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="scorecard_input"
                  autoComplete="given-name"
                />
              </label>
              <label className="scorecard_input_label">
                <span className="u-sr-only">Email address</span>
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError("");
                  }}
                  onBlur={() => {
                    if (email && !isValidEmail(email))
                      setEmailError("Please enter a valid email address.");
                  }}
                  required
                  className={`scorecard_input${emailError ? " is-error" : ""}`}
                  autoComplete="email"
                />
              </label>
              {emailError && (
                <p className="scorecard_input_error u-text-style-tiny">
                  {emailError}
                </p>
              )}
              <label className="scorecard_input_label">
                <span className="u-sr-only">Website URL (optional)</span>
                <input
                  type="text"
                  inputMode="url"
                  placeholder="Website URL (optional)"
                  value={website}
                  onChange={(e) => {
                    setWebsite(e.target.value);
                    setWebsiteError("");
                  }}
                  onBlur={() => {
                    if (website.trim() && !isValidWebsite(website))
                      setWebsiteError(
                        "Please enter a valid website (e.g. yourcompany.com).",
                      );
                  }}
                  className={`scorecard_input${websiteError ? " is-error" : ""}`}
                  autoComplete="url"
                />
              </label>
              {websiteError && (
                <p className="scorecard_input_error u-text-style-tiny">
                  {websiteError}
                </p>
              )}
              <input
                type="text"
                name="company"
                placeholder="Company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="scorecard_hp_field"
              />
            </div>
            <button
              type="submit"
              disabled={!formReady || submitting}
              className="scorecard_primary_btn"
            >
              {submitting ? "Loading your results..." : "Show My Score"}
            </button>
            <p className="scorecard_email_meta u-text-style-tiny u-text-style-muted">
              No spam. Just your results and a few follow-up emails with the
              highest-impact fixes.
            </p>
          </form>
        </div>
      </div>
    );
  }

  // ---- RESULTS ----
  if (phase === "results") {
    const roomScores = ROOMS.map((r, i) => ({
      ...r,
      score: getRoomScore(i),
      max: r.questions.length * 5,
    }));
    const top3Weak = [...roomScores]
      .sort((a, b) => a.score - b.score)
      .slice(0, 3);

    return (
      <div className="scorecard_wrap">
        <div className={`scorecard_results_wrap is-tier-${tier.key}`}>
          <div className="scorecard_score_header">
            <p className="scorecard_score_label u-text-style-eyebrow">
              Your Score
            </p>
            <div className="scorecard_score_number">{totalScore}</div>
            <p className="scorecard_score_max u-text-style-small u-text-style-muted">
              out of 105
            </p>
            <div className="scorecard_tier_badge">{tier.label}</div>
            <p className="scorecard_tier_message u-text-style-regular">
              {tier.message}
            </p>
          </div>

          <div className="scorecard_breakdown_wrap">
            <h3 className="scorecard_section_heading u-text-style-h5">
              Section-by-Section Breakdown
            </h3>
            <p className="scorecard_breakdown_hint u-text-style-small u-text-style-muted">
              Tap a section to see how you scored on each question.
            </p>
            <ul className="scorecard_breakdown_list">
              {roomScores.map((r) => {
                const pct = Math.round((r.score / r.max) * 100);
                const isExpanded = expandedRoom === r.id;
                return (
                  <li
                    key={r.id}
                    className={`scorecard_breakdown_item ${tierClass(pct)}${isExpanded ? " is-expanded" : ""}`}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedRoom(isExpanded ? null : r.id)}
                      aria-expanded={isExpanded}
                      aria-controls={`breakdown-detail-${r.id}`}
                      className="scorecard_breakdown_toggle"
                    >
                      <span
                        className="scorecard_breakdown_icon"
                        aria-hidden="true"
                      >
                        {r.icon}
                      </span>
                      <div className="scorecard_breakdown_body">
                        <div className="scorecard_breakdown_meta">
                          <span className="scorecard_breakdown_name u-text-style-small u-text-style-bold">
                            {r.name}
                          </span>
                          <span className="scorecard_breakdown_score u-text-style-tiny u-text-style-bold">
                            {r.score}/{r.max}
                          </span>
                        </div>
                        <div className="scorecard_breakdown_bar_track">
                          <div
                            className="scorecard_breakdown_bar_fill"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <span
                        className="scorecard_breakdown_caret"
                        aria-hidden="true"
                      >
                        ▾
                      </span>
                    </button>
                    {isExpanded && (
                      <ul
                        id={`breakdown-detail-${r.id}`}
                        className="scorecard_breakdown_questions"
                      >
                        {r.questions.map((q, qi) => {
                          const rating = answers[q.id] ?? 0;
                          const label = rating
                            ? RATING_LABELS[rating - 1]
                            : "Not answered";
                          return (
                            <li
                              key={q.id}
                              className="scorecard_breakdown_question"
                            >
                              <p className="scorecard_breakdown_question_text u-text-style-small">
                                <span className="scorecard_breakdown_question_index u-text-style-muted">
                                  Q{qi + 1}.
                                </span>{" "}
                                {q.text}
                              </p>
                              <p className="scorecard_breakdown_question_answer u-text-style-tiny u-text-style-muted">
                                Your answer:{" "}
                                <span className="scorecard_breakdown_question_label">
                                  {label} ({rating}/5)
                                </span>
                              </p>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="scorecard_focus_card">
            <h3 className="scorecard_section_heading u-text-style-h5">
              Where to focus first
            </h3>
            <p className="scorecard_focus_intro u-text-style-small u-text-style-muted">
              Your three weakest sections — start here:
            </p>
            <ol className="scorecard_focus_list">
              {top3Weak.map((r, i) => (
                <li key={r.id} className="scorecard_focus_item">
                  <span className="scorecard_focus_number" aria-hidden="true">
                    {i + 1}
                  </span>
                  <div className="scorecard_focus_body">
                    <p className="scorecard_focus_name u-text-style-regular u-text-style-bold">
                      <span aria-hidden="true">{r.icon} </span>
                      {r.name}
                      <span className="scorecard_focus_score u-text-style-muted">
                        {" "}
                        — {r.score}/{r.max}
                      </span>
                    </p>
                    <p className="scorecard_focus_description u-text-style-small u-text-style-muted">
                      {r.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <blockquote className="scorecard_insight">
            <p className="scorecard_insight_pull">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            </p>
            <p className="scorecard_insight_text u-text-style-small u-text-style-muted">
              Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua
              ut enim ad minim veniam, quis nostrud exercitation ullamco
              laboris nisi ut aliquip ex ea commodo consequat.
            </p>
          </blockquote>

          <div className="scorecard_cta_card">
            <p className="scorecard_cta_eyebrow u-text-style-eyebrow">
              What's next
            </p>
            <h3 className="scorecard_cta_heading u-text-style-h4">
              Ready to take the next step?
            </h3>
            <p className="scorecard_cta_text u-text-style-regular">
              {tier.next}
            </p>
            <a href="/contact" className="scorecard_cta_btn">
              Get in Touch
            </a>
            <p className="scorecard_cta_meta u-text-style-tiny">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do
              eiusmod.
            </p>
          </div>

          <button
            type="button"
            onClick={resetQuiz}
            className="scorecard_reset_link u-text-style-small u-text-style-muted"
          >
            ↻ Take the scorecard again
          </button>
        </div>
      </div>
    );
  }

  return null;
}
