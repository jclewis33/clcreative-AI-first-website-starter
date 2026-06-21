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

const ROOMS: Room[] = [
  {
    id: "blueprint",
    name: "The Blueprint",
    subtitle: "Your Messaging Strategy",
    icon: "📐",
    description:
      "Before you build anything, you need a plan. The blueprint is the messaging strategy that tells you who you're talking to and what to say.",
    questions: [
      {
        id: "q1",
        text: "I can describe my ideal customer in one specific sentence — who they are, what they struggle with, and what they want.",
        why: "If you can't name the exact person you serve and the exact problem you solve, your marketing is talking to everyone and connecting with no one.",
      },
      {
        id: "q2",
        text: "My messaging is built around my customer's problem, not my list of services.",
        why: "People don't buy features. They buy relief from a problem. Leading with their pain and your solution is the difference between a website that converts and one that gets ignored.",
      },
      {
        id: "q3",
        text: "I have a consistent message I use across my website, social media, and sales conversations.",
        why: "If your website says one thing and your LinkedIn says another, you don't have a message. You have a collection of disconnected ideas.",
      },
    ],
  },
  {
    id: "house",
    name: "The House",
    subtitle: "Your Website",
    icon: "🏠",
    description:
      "This is where people come. It's your address. If the house isn't built on the blueprint, every room confuses the visitor.",
    questions: [
      {
        id: "q4",
        text: "When someone lands on my homepage, they can tell who I serve and what I do within 5 seconds.",
        why: "Visitors decide whether to stay or leave in seconds. If your headline is vague or clever instead of clear, they're gone.",
      },
      {
        id: "q5",
        text: "My website is designed to guide visitors toward one clear action.",
        why: "A website with six different buttons pointing in six directions creates decision paralysis. One clear path, one primary call to action.",
      },
      {
        id: "q6",
        text: "My website is built on a platform I can update myself without calling a developer for every small change.",
        why: "If you can't update your own site, it becomes a static brochure that falls behind your business.",
      },
    ],
  },
  {
    id: "porch",
    name: "The Front Porch",
    subtitle: "Your Content",
    icon: "🪴",
    description:
      "The front porch is how people find you before they're ready to walk through the front door. Content that attracts the right visitors.",
    questions: [
      {
        id: "q7",
        text: "I have blog posts or content on my website that answers the questions my ideal customers are searching for.",
        why: "When your ideal customer types a question into Google or asks ChatGPT, does your business show up? If you have zero content, you're invisible.",
      },
      {
        id: "q8",
        text: "I publish new content at least once a month.",
        why: "A website with no fresh content tells search engines and visitors the same thing: nothing is happening here.",
      },
      {
        id: "q9",
        text: "My content is written for my ideal customer, not for my industry peers.",
        why: "Writing content that impresses other people in your industry doesn't attract buyers. Writing content that answers your customer's real questions does.",
      },
    ],
  },
  {
    id: "mat",
    name: "The Welcome Mat",
    subtitle: "Your Lead Magnet",
    icon: "🪟",
    description:
      "The welcome mat is the reason someone gives you their email address. A simple offer that starts the relationship.",
    questions: [
      {
        id: "q10",
        text: "I have a free resource (checklist, guide, worksheet) that my ideal customer would actually want.",
        why: "Most visitors aren't ready to buy on the first visit. A lead magnet gives them a reason to stay connected. Without one, they leave and you never hear from them again.",
      },
      {
        id: "q11",
        text: "My lead magnet is clearly visible on my website, not buried on a page nobody visits.",
        why: "If your lead magnet exists but nobody can find it, it doesn't exist. Make it easy to find.",
      },
      {
        id: "q12",
        text: "My lead magnet directly relates to the problem I solve for my customers.",
        why: "A lead magnet that attracts the wrong people fills your list with people who will never buy.",
      },
    ],
  },
  {
    id: "mailbox",
    name: "The Mailbox",
    subtitle: "Your Newsletter & Email",
    icon: "📬",
    description:
      "How you stay in front of people who aren't ready to buy yet. Most people need multiple touchpoints before they decide.",
    questions: [
      {
        id: "q13",
        text: "I have an email list and I actually send to it on a regular basis.",
        why: "An email list you never send to is a list of people slowly forgetting you exist.",
      },
      {
        id: "q14",
        text: "I have a welcome email or short sequence that goes out automatically when someone joins my list.",
        why: "The moment someone signs up is the moment they're most interested. If they hear nothing for weeks, you've wasted the warmest moment.",
      },
      {
        id: "q15",
        text: "I know how many subscribers I have and what my open rates look like.",
        why: "If you can't answer those two questions, you're flying blind.",
      },
    ],
  },
  {
    id: "door",
    name: "The Front Door",
    subtitle: "Your Booking System",
    icon: "🚪",
    description:
      "When someone is ready to talk, the front door should be wide open. No friction. No back-and-forth emails.",
    questions: [
      {
        id: "q16",
        text: "A prospect can book a call or meeting with me directly from my website in under 30 seconds.",
        why: "Every extra step between 'I want to talk to this person' and 'I'm on their calendar' is a chance for them to change their mind.",
      },
      {
        id: "q17",
        text: "My booking system is connected to my calendar so there are no double-bookings or back-and-forth.",
        why: "If someone books a time and gets a 'sorry, that doesn't work' email, you've started the relationship with a bad experience.",
      },
      {
        id: "q18",
        text: "My booking page tells people what to expect after they book.",
        why: "Uncertainty kills conversions. 'Book a call' is vague. Telling them the length, the format, and what they'll walk away with makes it feel safe.",
      },
    ],
  },
  {
    id: "meter",
    name: "The Meter Box",
    subtitle: "Your Analytics",
    icon: "📊",
    description:
      "Every house has utility meters. Analytics tell you what's working, who's visiting, and where they drop off.",
    questions: [
      {
        id: "q19",
        text: "I have analytics installed on my website (Google Analytics, Microsoft Clarity, or similar).",
        why: "If you don't have analytics, you're making every marketing decision on gut feeling.",
      },
      {
        id: "q20",
        text: "I know how many visitors my website gets each month and where they come from.",
        why: "'I think we get some traffic' isn't a growth strategy. Knowing your numbers is the difference between guessing and growing on purpose.",
      },
      {
        id: "q21",
        text: "I can tell which pages get the most attention and which ones people leave immediately.",
        why: "Analytics shows you exactly where the leaks are so you can fix them instead of guessing.",
      },
    ],
  },
];

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
      label: "Solid Foundation",
      message:
        "Your foundation is in good shape. You have the system in place. Now it's about optimizing and scaling what's working.",
      next: "Consider a Marketing Partner to keep building on the foundation and compound your results month over month.",
    };
  if (score >= 60)
    return {
      key: "gaps",
      label: "Gaps to Fill",
      message:
        "You have some pieces, but real gaps are costing you leads and growth. The rooms that scored low are where opportunity is leaking out.",
      next: "A few strategic fixes could change everything. This is exactly the kind of situation a Marketing Foundation engagement is built for.",
    };
  if (score >= 35)
    return {
      key: "disconnected",
      label: "Disconnected Pieces",
      message:
        "Your marketing is a collection of disconnected pieces. Nothing is working together. Growth is happening by luck, not by design.",
      next: "You don't need to fix individual pieces. You need a foundation where messaging, website, content, email, and analytics are all built on the same strategy.",
    };
  return {
    key: "none",
    label: "No Foundation",
    message:
      "You're running a business without a marketing system. Every customer you've gotten has been through referrals, word of mouth, or luck. That's not sustainable.",
    next: "You need a marketing foundation. Not a website. Not an ad campaign. A complete system built around your customer.",
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
              🏠
            </div>
            <h1 className="scorecard_intro_title u-text-style-h2">
              The Marketing Foundation Scorecard
            </h1>
            <p className="scorecard_intro_text u-text-style-regular u-text-style-muted">
              How solid is your marketing foundation? Score yourself across 7
              areas in 5 minutes. You'll know exactly what's working, what's
              missing, and what you need to fix first.
            </p>
          </div>

          <div className="scorecard_rooms_card">
            <p className="scorecard_rooms_label u-text-style-eyebrow">
              You'll score 7 rooms
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
              Room {currentRoom + 1} of 7
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
              Enter your email to see your score, a room-by-room breakdown, and
              what to focus on first.
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
              Your Marketing Foundation Score
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
              Room-by-Room Breakdown
            </h3>
            <p className="scorecard_breakdown_hint u-text-style-small u-text-style-muted">
              Tap a room to see how you scored on each question.
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
              Your three weakest rooms. These are where leads and growth are
              leaking out:
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
              Fixing one room at a time doesn't work. The rooms work together or
              they don't work at all.
            </p>
            <p className="scorecard_insight_text u-text-style-small u-text-style-muted">
              A great website with no content, no lead magnet, and no email
              follow-up is a house with no front porch and no mailbox. People
              might find it, but they won't stick around. That's why we build
              the whole foundation in one engagement.
            </p>
          </blockquote>

          <div className="scorecard_cta_card">
            <p className="scorecard_cta_eyebrow u-text-style-eyebrow">
              What's next for you
            </p>
            <h3 className="scorecard_cta_heading u-text-style-h4">
              Ready to build the foundation?
            </h3>
            <p className="scorecard_cta_text u-text-style-regular">
              {tier.next}
            </p>
            <a
              href="/book-a-call"
              className="scorecard_cta_btn"
            >
              Book a Free Strategy Call
            </a>
            <p className="scorecard_cta_meta u-text-style-tiny">
              One call. We'll review your scorecard, identify the biggest gaps,
              and map out what your foundation needs.
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
