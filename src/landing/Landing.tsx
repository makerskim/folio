import { useEffect, useRef, useState, type DragEvent } from 'react';
import { ACCEPT, handOff } from '../lib/handoff';
import './landing.css';

const TOOLS: { name: string; text: string; art: string }[] = [
  { name: '정리', text: '페이지를 끌어서 순서를 바꾸고, 돌리고, 지우고, 복제해요. 여러 장을 한꺼번에 골라서 해도 돼요.', art: 'arrange' },
  { name: '합치기', text: '여러 PDF와 사진을 한 번에 올리면 한 문서로 이어져요. 어느 파일에서 온 페이지인지 색으로 보여요.', art: 'merge' },
  { name: '나누기', text: '“1-3, 4-8, 9-” 처럼 범위로, N페이지씩, 또는 한 장씩 나눠서 ZIP으로 받아요.', art: 'split' },
  { name: '골라 만들기', text: '두 개 이상의 PDF를 나란히 펼쳐 놓고, 필요한 페이지만 눌러서 새 PDF를 만들어요.', art: 'pick' },
  { name: 'PPTX로 바꾸기', text: '페이지마다 슬라이드 한 장. 모양이 그대로 옮겨지고, 페이지 글자는 발표자 노트에 넣을 수 있어요.', art: 'pptx' },
  { name: '이미지로 저장', text: '모든 페이지를 PNG나 JPG로 한 번에 받아요. 페이지 번호를 넣은 PDF로도 저장할 수 있어요.', art: 'image' },
];

const FAQ: { q: string; a: string }[] = [
  { q: '정말 파일이 서버로 올라가지 않나요?', a: 'Folio는 화면 파일만 내려받는 정적 사이트예요. PDF를 읽고, 그리고, 새로 만드는 일이 전부 이 브라우저 안에서 일어나요. 탭을 닫으면 메모리에서 사라지고 어디에도 남지 않아요. 인터넷을 끊은 뒤에도 이미 열린 페이지에서는 그대로 편집돼요.' },
  { q: '어떤 파일을 열 수 있나요?', a: 'PDF와 사진(JPG · PNG · WebP · GIF)을 열 수 있어요. 사진은 한 장이 한 페이지가 돼요. 암호가 걸린 PDF는 열 수 없어요.' },
  { q: 'PPTX로 바꾸면 글자를 고칠 수 있나요?', a: '슬라이드에는 페이지가 고화질 이미지로 들어가서 원본과 똑같이 보여요. 대신 글자를 바로 고칠 수는 없어서, 필요하면 “발표자 노트에 글자 넣기”를 켜고 노트의 글을 복사해 쓰세요.' },
  { q: '큰 파일도 되나요?', a: '컴퓨터 메모리가 허락하는 만큼 돼요. 수백 페이지짜리도 썸네일은 화면에 보이는 것부터 그려서 바로 편집할 수 있어요. 휴대폰에서는 100MB 아래를 권해요.' },
  { q: '무료인가요? 가입해야 하나요?', a: '무료이고 가입도 없어요. 광고나 추적 코드도 넣지 않았어요.' },
];

const USES: { title: string; text: string; tools: string[]; hue: number; art: 'cut' | 'rotate' | 'slides' | 'photos' | 'pick' | 'split' }[] = [
  { title: '스캔본이 옆으로 누웠을 때', text: '누운 페이지만 골라서 R 한 번. 여러 장이면 모두 골라서 한꺼번에 돌려요.', tools: ['정리', '회전'], hue: 214, art: 'rotate' },
  { title: '영수증 사진을 PDF 하나로', text: '휴대폰 사진 여러 장을 한 번에 올리면 한 장씩 페이지가 되어 이어져요.', tools: ['합치기', '이미지'], hue: 32, art: 'photos' },
  { title: '강의 자료를 발표 슬라이드로', text: 'PDF 페이지마다 슬라이드 한 장. 글자는 발표자 노트로 따라와요.', tools: ['PPTX'], hue: 268, art: 'slides' },
  { title: '계약서에서 한 장만 빼기', text: '필요 없는 페이지를 지우고, 서명할 페이지만 따로 저장해요.', tools: ['정리', '고른 페이지 저장'], hue: 340, art: 'cut' },
  { title: '두 보고서에서 필요한 장만', text: '두 PDF를 나란히 펼쳐 놓고 눌러 담으면 새 문서가 돼요.', tools: ['골라 만들기'], hue: 152, art: 'pick' },
  { title: '두꺼운 문서를 장별로', text: '“1-12, 13-30, 31-” 처럼 적으면 파일 세 개로 나눠 ZIP으로 받아요.', tools: ['나누기'], hue: 190, art: 'split' },
];

const STEPS = [
  { title: '열기', text: 'PDF나 사진을 위의 빈칸에 끌어다 놓거나 눌러서 골라요. 여러 개도 한 번에.' },
  { title: '편집', text: '페이지를 끌어서 옮기고, 골라서 돌리거나 지워요. 실수해도 ⌘Z.' },
  { title: '저장', text: 'PDF · 나눈 PDF · PPTX · 이미지 중 하나로 내려받아요.' },
];

export default function Landing() {
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = 'Folio — 브라우저에서 끝내는 PDF 편집';
  }, []);

  // 화면에 들어오는 부분부터 차례로 나타나요
  useEffect(() => {
    const els = root.current?.querySelectorAll('[data-reveal]');
    if (!els) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const open = () => input.current?.click();
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    if (e.dataTransfer.files.length) handOff(Array.from(e.dataTransfer.files));
  };

  return (
    <div
      ref={root}
      className={`lp${drag ? ' is-drag' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setDrag(false)}
      onDrop={onDrop}
    >
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={(e) => e.target.files?.length && handOff(Array.from(e.target.files))}
      />

      <header className="lp-nav">
        <a href="#/" className="lp-logo" aria-label="Folio 처음으로">
          <Mark /> Folio
        </a>
        <nav>
          <a href="#tools" onClick={scrollTo('tools')}>기능</a>
          <a href="#uses" onClick={scrollTo('uses')}>이럴 때</a>
          <a href="#faq" onClick={scrollTo('faq')}>자주 묻는 질문</a>
        </nav>
        <div className="lp-nav-ctas">
          <a className="lp-nav-ghost" href="#/studio">
            빈 편집기<span className="lp-hide-sm">로 시작</span>
          </a>
          <button className="lp-nav-cta" onClick={open}>PDF 열기</button>
        </div>
      </header>

      <section className="lp-hero">
        <div className="lp-glow" aria-hidden>
          <i /><i /><i />
        </div>
        <h1 className="lp-title">
          <span>PDF를</span>
          <span>종이처럼.</span>
        </h1>
        <p className="lp-lede">
          끌어서 옮기고, 돌리고, 빼고, 합치고, 나눠요.
          <br />
          파일은 이 브라우저 밖으로 한 번도 나가지 않아요.
        </p>

        <button className="lp-tray" onClick={open} aria-label="PDF나 사진 파일 고르기">
          <span className="lp-tray-slots" aria-hidden>
            <i /><i /><i />
          </span>
          <span className="lp-tray-text">
            <strong>{drag ? '놓으면 바로 열려요' : 'PDF를 여기에 끌어다 놓으세요'}</strong>
            <small>또는 눌러서 파일 고르기 · PDF, JPG, PNG · 여러 개를 한 번에</small>
          </span>
          <span className="lp-tray-btn" aria-hidden>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M7 9l5-5 5 5M5 20h14" /></svg>
            파일 고르기
          </span>
        </button>

        <Shuffle />
      </section>

      <section className="lp-claim" aria-label="개인정보" data-reveal>
        <p>
          올리기 버튼은 있지만,
          <br />
          <em>업로드는 없어요.</em>
        </p>
        <div className="lp-claim-facts">
          <div>
            <strong>0 바이트</strong>
            <span>서버로 보내는 내 파일</span>
          </div>
          <div>
            <strong>가입 없음</strong>
            <span>열자마자 바로 편집</span>
          </div>
          <div>
            <strong>무료</strong>
            <span>광고 · 추적 코드 없음</span>
          </div>
        </div>
      </section>

      <Billboard />

      <Row onPick={open} />

      <section className="lp-how" id="how" data-reveal>
        <h2 className="lp-h2">세 단계면 끝나요.</h2>
        <ol>
          {STEPS.map((st, i) => (
            <li key={st.title} style={{ ['--d' as string]: `${i * 120}ms` }}>
              <b aria-hidden>{i + 1}</b>
              <div>
                <h3>{st.title}</h3>
                <p>{st.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="lp-faq" id="faq" data-reveal>
        <h2 className="lp-h2">자주 묻는 질문</h2>
        <div>
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>
                {f.q}
                <i aria-hidden />
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="lp-foot" data-reveal>
        <div className="lp-sign">
          <span className="lp-sign-by">Designed &amp; built by</span>
          <a className="lp-sign-name" href="https://github.com/makerskim" target="_blank" rel="noreferrer">
            makerskim
          </a>
        </div>
        <div className="lp-foot-row">
          <span><Mark /> Folio</span>
          <span>© {new Date().getFullYear()} makerskim · 모든 처리는 내 기기 안에서 · pdf.js · pdf-lib · PptxGenJS</span>
        </div>
      </footer>

      <div className="lp-dropveil" aria-hidden>
        <div>놓으면 바로 열려요</div>
      </div>
    </div>
  );
}

/* 넷플릭스 첫 화면처럼 기능이 저절로 넘어가요. 누르면 그 기능에 멈춰요 */
function Billboard() {
  const [on, setOn] = useState(0);
  const [paused, setPaused] = useState(false);
  const [seen, setSeen] = useState(false);
  const box = useRef<HTMLElement>(null);

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.3 });
    if (box.current) io.observe(box.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (paused || !seen) return;
    const t = setTimeout(() => setOn((v) => (v + 1) % TOOLS.length), 5200);
    return () => clearTimeout(t);
  }, [on, paused, seen]);

  return (
    <section className="lp-bill" id="tools" ref={box} data-reveal>
      <h2 className="lp-h2">필요한 건 다 있어요.</h2>
      <div className="lp-bill-grid" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <ul className="lp-bill-tabs" role="tablist" aria-label="기능">
          {TOOLS.map((t, i) => (
            <li key={t.name}>
              <button
                role="tab"
                aria-selected={on === i}
                className={on === i ? 'is-on' : ''}
                onClick={() => {
                  setOn(i);
                  setPaused(true);
                }}
              >
                <span className="lp-bill-name">{t.name}</span>
                <span className="lp-bill-text">{t.text}</span>
                <span className="lp-bill-bar" aria-hidden>
                  <i key={on === i ? `${i}-${paused}-${seen}` : i} className={on === i && !paused && seen ? 'is-run' : ''} />
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="lp-bill-stage" aria-live="polite">
          {TOOLS.map((t, i) => (
            <div key={t.name} className={`lp-bill-panel${on === i ? ' is-on' : ''}`} aria-hidden={on !== i}>
              <ToolArt kind={t.art} />
              <span className="lp-bill-caption">{t.name}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="lp-tools-more">되돌리기와 다시 하기, 빈 페이지 넣기, 순서 뒤집기, 홀수 · 짝수 페이지 고르기, 키보드 단축키까지.</p>
    </section>
  );
}

/* 넷플릭스 줄처럼 옆으로 넘기고, 올리면 카드가 커지면서 자세히 보여요 */
function Row({ onPick }: { onPick: () => void }) {
  const track = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const update = () => {
    const el = track.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
  };
  useEffect(update, []);
  const go = (dir: number) => {
    const el = track.current;
    el?.scrollBy({ left: dir * el.clientWidth * 0.86, behavior: 'smooth' });
  };
  return (
    <section className="lp-row" id="uses" data-reveal>
      <h2 className="lp-h2">이럴 때 써요.</h2>
      <div className="lp-row-wrap">
        <button className="lp-row-arrow is-prev" onClick={() => go(-1)} disabled={edge.start} aria-label="이전">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <div className="lp-row-track" ref={track} onScroll={update}>
          {USES.map((u, i) => (
            <article key={u.title} className="lp-card" style={{ ['--h' as string]: u.hue, ['--d' as string]: `${i * 70}ms` }} tabIndex={0}>
              <div className={`lp-card-poster is-${u.art}`} aria-hidden>
                <span /><span /><span />
              </div>
              <h3>{u.title}</h3>
              <div className="lp-card-more">
                <p>{u.text}</p>
                <div className="lp-card-foot">
                  <span className="lp-card-tags">
                    {u.tools.map((t) => (
                      <em key={t}>{t}</em>
                    ))}
                  </span>
                  <button onClick={onPick} aria-label={`${u.title} — PDF 열기`}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden><path d="M7 4.5v15l12-7.5z" /></svg>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
        <button className="lp-row-arrow is-next" onClick={() => go(1)} disabled={edge.end} aria-label="다음">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </section>
  );
}

const scrollTo = (id: string) => (e: React.MouseEvent) => {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
};

export function Mark() {
  return (
    <svg className="mark" viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <rect x="8" y="3" width="11" height="15" rx="2" fill="currentColor" opacity=".35" transform="rotate(10 13 10)" />
      <rect x="5" y="5" width="11" height="15" rx="2" fill="currentColor" />
    </svg>
  );
}

/* 히어로의 종이 다발: 페이지가 한 번 섞였다가 제자리를 찾아가요 */
const SHEETS = [
  { hue: 214, n: 1, s: 4 },
  { hue: 340, n: 2, s: 0 },
  { hue: 214, n: 3, s: 6 },
  { hue: 152, n: 4, s: 2 },
  { hue: 340, n: 5, s: 5 },
  { hue: 32, n: 6, s: 1 },
  { hue: 152, n: 7, s: 3 },
];

function Shuffle() {
  return (
    <div className="lp-stage" aria-hidden>
      <div className="lp-sheets">
        {SHEETS.map((s, i) => (
          <div key={i} className="lp-sheet" style={{ ['--i' as string]: i, ['--s' as string]: s.s, ['--h' as string]: s.hue }}>
            <span className="lp-sheet-band" />
            <span className="lp-sheet-l w1" />
            <span className="lp-sheet-l w2" />
            <span className="lp-sheet-l w3" />
            <span className="lp-sheet-box" />
            <span className="lp-sheet-l w2" />
            <span className="lp-sheet-l w1" />
            <span className="lp-sheet-n">{s.n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ToolArt({ kind }: { kind: string }) {
  const sheet = (h: number, extra = '') => <span className={`ta-s ${extra}`} style={{ ['--h' as string]: h }} />;
  return (
    <div className={`ta ta-${kind}`} aria-hidden>
      {kind === 'arrange' && (
        <>
          {sheet(214)}
          {sheet(214, 'ta-rot')}
          {sheet(214, 'ta-lift')}
          {sheet(214, 'ta-gone')}
        </>
      )}
      {kind === 'merge' && (
        <>
          <div className="ta-col">{sheet(214)}{sheet(214)}</div>
          <span className="ta-plus">+</span>
          <div className="ta-col">{sheet(340)}{sheet(340)}</div>
          <span className="ta-eq">=</span>
          <div className="ta-col">{sheet(214)}{sheet(214)}{sheet(340)}{sheet(340)}</div>
        </>
      )}
      {kind === 'split' && (
        <>
          <div className="ta-col">{sheet(152)}{sheet(152)}</div>
          <span className="ta-cut" />
          <div className="ta-col">{sheet(152)}{sheet(152)}{sheet(152)}</div>
        </>
      )}
      {kind === 'pick' && (
        <>
          <div className="ta-col ta-dim">{sheet(214)}{sheet(214, 'ta-on')}{sheet(214)}</div>
          <div className="ta-col ta-dim">{sheet(32, 'ta-on')}{sheet(32)}{sheet(32, 'ta-on')}</div>
        </>
      )}
      {kind === 'pptx' && (
        <>
          {sheet(268)}
          <span className="ta-arrow" />
          <span className="ta-slide"><i /></span>
        </>
      )}
      {kind === 'image' && (
        <>
          {sheet(190)}
          <span className="ta-arrow" />
          <span className="ta-photo" />
          <span className="ta-photo" />
        </>
      )}
    </div>
  );
}
