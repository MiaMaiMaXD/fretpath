import type { Metadata } from 'next';
import Link from 'next/link';
import { preload } from 'react-dom';
import { TryFretboard } from '@/components/home/TryFretboard';
import { CURRICULUM, UNITS } from '@/lib/path-frets';
import { plexThai } from '@/lib/fonts';
import './home.css';

export const metadata: Metadata = {
  title: 'FretPath — เรียนกีตาร์จากศูนย์ ทีละก้าว',
};

const PAINS = [
  ['ดูคลิปสอนเยอะมาก แต่ไม่รู้ควรเริ่มอันไหนก่อน', 'บทเรียนเรียงลำดับไว้ให้แล้ว ทำตามทีละบท บทถัดไปจะเปิดเมื่อคุณพร้อม'],
  ['กดสายแล้วเจ็บนิ้ว เสียงก็บอด', 'บทที่ 3 สอนวิธีวางนิ้วให้ใช้แรงน้อยและเสียงใส ปลายนิ้วจะชินภายในสองสามสัปดาห์'],
  ['คอร์ด F ยากจนอยากเลิก', 'บทที่ 8 เริ่มจากคอร์ด F แบบง่าย 4 สายก่อน ส่วนบาร์คอร์ดเต็มรูปเก็บไว้ช่วงที่ 4 ตอนนั้นนิ้วคุณแข็งแรงพอแล้ว'],
  ['ฝึกทุกวันแต่ไม่รู้ว่าเก่งขึ้นจริงไหม', 'มีแบบทดสอบท้ายบทและบันทึกเวลาฝึก ดูความก้าวหน้าของตัวเองได้ในหน้าเดียว'],
];

/* Lessons written so far fill the first frets of the planned curriculum (lib/path-frets.ts).
   Raise this when a new content round is published. */
const OPEN_LESSONS = 15;
const UNIT_BLURBS = [
  'ตั้งสาย อ่านแท็บ คอร์ดแรก Em Am C D เปลี่ยนคอร์ดให้ลื่น และนับจังหวะ 4/4',
  'ตัวโน้ต 12 ตัว ดีดขึ้นลง คอร์ด F แบบง่ายกับเพลงแรก คอร์ด 7 / sus และบันไดเสียง C',
  'สร้างคอร์ดจากโน้ต คอร์ดในคีย์ คาโป้ เกากีตาร์ และพาวเวอร์คอร์ด',
  'บาร์คอร์ด เพนทาโทนิก เทคนิคมือซ้าย ระบบ CAGED และจังหวะแบบอื่น',
];
const TOTAL_LESSONS = CURRICULUM['guitar-basics'].length;
const STEPS = UNITS.map((u, i) => ({
  title: u.name.split(' · ')[1],
  range: `บทที่ ${u.from + 1}–${u.to + 1}`,
  open: u.to < OPEN_LESSONS,
  desc: UNIT_BLURBS[i],
}));

const FAQ = [
  ['ต้องมีกีตาร์ของตัวเองไหม', 'ต้องมีครับ แนะนำกีตาร์โปร่งสายเหล็กขนาดมาตรฐานสำหรับเริ่มต้น ไม่จำเป็นต้องเป็นรุ่นแพง ขอแค่ตั้งสายได้ตรงและสายไม่สูงจากคอจนกดยาก'],
  ['ฟรีจริงไหม', `ฟรีทุกบท ตอนนี้เปิดให้เรียนแล้ว ${OPEN_LESSONS} บท รวมแบบทดสอบและระบบบันทึกการฝึก แค่สมัครสมาชิกด้วยอีเมล`],
  ['ต้องฝึกวันละกี่นาที นานแค่ไหนถึงเล่นเพลงได้', 'วันละ 15–20 นาทีสม่ำเสมอดีกว่าฝึกนาน ๆ แค่สัปดาห์ละครั้ง ความเร็วขึ้นกับแต่ละคน หน้า Dashboard จะช่วยให้คุณเห็นว่าฝึกไปแล้วเท่าไหร่'],
  ['คนถนัดซ้ายเรียนได้ไหม', 'ได้ครับ หลักการวางนิ้วและการดีดเหมือนกัน แค่ใช้กีตาร์สำหรับคนถนัดซ้าย หรือสลับสายกีตาร์ปกติ แล้วมองภาพในบทเรียนแบบกลับด้าน'],
  ['เจ็บปลายนิ้วตอนกดสาย ทำยังไงดี', 'เป็นเรื่องปกติของสองสามสัปดาห์แรก พักเมื่อเจ็บ ฝึกสั้นแต่บ่อย และกดด้วยปลายนิ้วใกล้เฟรต จะใช้แรงน้อยลงมาก บทที่ 3 อธิบายวิธีนี้ละเอียด'],
];

export default function Home() {
  // The hero photo is a CSS background; preload it so it is not discovered late (LCP).
  preload('/images/hero-guitar.jpg', { as: 'image', fetchPriority: 'high' });

  return (
    <div className={`fp-home ${plexThai.variable}`}>
      <header className="site-header">
        <div className="wrap">
          <Link href="/" className="logo" data-testid="home-logo" aria-label="FretPath หน้าแรก">
            <svg viewBox="0 0 26 26" aria-hidden="true">
              <path d="M13 2 4 9.5v9L13 24l9-5.5v-9z" fill="none" stroke="#e38b12" strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M9 11h8M9 15h8" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            </svg>
            FretPath
          </Link>
          <nav className="nav" aria-label="เมนูหลัก">
            <a href="#path">เส้นทางการเรียน</a>
            <a href="#how">เรียนยังไง</a>
            <a href="#faq">คำถามที่พบบ่อย</a>
          </nav>
          <div className="header-actions">
            <Link href="/login" className="login" data-testid="header-login">
              เข้าสู่ระบบ
            </Link>
            <Link href="/signup" className="btn btn-primary" data-testid="header-signup">
              สมัครฟรี
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="banner">
            <div className="wrap">
              <div className="hero-text">
                <h1 id="hero-title">
                  ไม่เคยจับกีตาร์มาก่อน?
                  <br />
                  ดีเลย เริ่มจากศูนย์ไปด้วยกัน
                </h1>
                <p className="lede">
                  5 บทเรียน ตั้งแต่จับกีตาร์ครั้งแรก จนเล่นเพลงแรกได้จบเพลง ฝึกวันละ 15 นาที
                  มีแบบทดสอบบอกว่าพร้อมไปบทถัดไปหรือยัง
                </p>
                <div className="hero-ctas">
                  <Link href="/signup" className="btn btn-primary" data-testid="hero-signup">
                    สมัครฟรี เริ่มบทที่ 1
                  </Link>
                  <a href="#path" className="btn btn-ghost" data-testid="hero-see-path">
                    ดูเส้นทางการเรียน
                  </a>
                </div>
                <ul className="assurances">
                  <li>ฟรีทั้งหมด</li>
                  <li>เรียนบนมือถือได้</li>
                  <li>ไม่ต้องอ่านโน้ตเป็น</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="wrap">
            <div className="try" data-testid="try-fretboard">
              <div className="try-head">
                <h2 id="try-title">ลองดีดดูก่อนเลย</h2>
                <p>แตะที่สายเพื่อดีดทีละสาย หรือเลือกคอร์ดแล้วกดดีด</p>
              </div>
              <TryFretboard labelledBy="try-title" />
            </div>
          </div>
        </section>

        <section className="block" aria-labelledby="pains-title">
          <div className="wrap">
            <h2 id="pains-title">เคยเป็นแบบนี้ไหม</h2>
            <p className="intro">ครูเจอคำถามเหล่านี้จากมือใหม่แทบทุกคน และนี่คือเหตุผลที่บทเรียนเรียงมาแบบนี้</p>
            <div className="pains">
              {PAINS.map(([q, a]) => (
                <div className="pain" key={q}>
                  <q>{q}</q>
                  <p>{a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="block path-sec" id="path" aria-labelledby="path-title">
          <div className="wrap">
            <h2 id="path-title">จากศูนย์ ถึงเล่นทั่วคอกีตาร์ ใน {TOTAL_LESSONS} บท</h2>
            <p className="intro">
              แบ่งเป็น 4 ช่วง เปิดให้เรียนแล้ว {OPEN_LESSONS} บท แต่ละบทจบด้วยแบบทดสอบสั้น ๆ ทำได้ 60% ขึ้นไป
              บทถัดไปจะเปิดให้ทันที สอบใหม่ได้ไม่จำกัด
            </p>
            <ol className="path" data-testid="learning-path">
              {STEPS.map((step, i) => (
                <li className={step.open ? 'step' : 'step soon'} key={step.title}>
                  <span className="dot">{i + 1}</span>
                  <h3>{step.title}</h3>
                  <span className="range">
                    {step.range} · {step.open ? 'เปิดแล้ว' : 'เร็ว ๆ นี้'}
                  </span>
                  <p>{step.desc}</p>
                </li>
              ))}
              <li className="step goal">
                <span className="dot" aria-hidden="true">
                  ♪
                </span>
                <h3>เล่นเพลงเต็มเพลงได้เอง</h3>
                <p>เป้าหมายของคอร์สนี้</p>
              </li>
            </ol>
          </div>
        </section>

        <section className="block" id="how" aria-labelledby="how-title">
          <div className="wrap">
            <h2 id="how-title">เรียน ทดสอบ แล้วฝึก</h2>
            <p className="intro">ทุกบทใช้จังหวะเดียวกัน คุณจะรู้เสมอว่าตอนนี้อยู่ตรงไหน และต้องทำอะไรต่อ</p>
            <div className="how">
              <figure>
                <div className="shot" aria-hidden="true">
                  <div className="vid" />
                  <div className="sk" style={{ width: '70%' }} />
                  <div className="sk" style={{ width: '90%' }} />
                </div>
                <figcaption>
                  <h3>เรียนจากวิดีโอและภาพ</h3>
                  <p>ดูครูสาธิตช้า ๆ อ่านสรุปสั้น และกดฟังเสียงคอร์ดจากหน้าบทเรียนได้เลย</p>
                </figcaption>
              </figure>
              <figure>
                <div className="shot" aria-hidden="true">
                  <div className="sk title" style={{ width: '60%' }} />
                  <div className="opt">G</div>
                  <div className="opt ok">✓ Em</div>
                  <div className="opt">Am</div>
                </div>
                <figcaption>
                  <h3>ทำแบบทดสอบท้ายบท</h3>
                  <p>รู้คะแนนทันที พร้อมคำอธิบายทุกข้อ ตอบผิดก็เข้าใจว่าผิดเพราะอะไร</p>
                </figcaption>
              </figure>
              <figure>
                <div className="shot" aria-hidden="true">
                  <div className="sk title" style={{ width: '45%' }} />
                  <div className="bars">
                    {[35, 55, 40, 70, 60, 85, 75].map((h, i) => (
                      <span key={i} style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
                <figcaption>
                  <h3>บันทึกการฝึก ดูความก้าวหน้า</h3>
                  <p>จับเวลาฝึกในเว็บ แล้วดูกราฟนาทีฝึกกับคะแนนแต่ละบทใน Dashboard</p>
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        {/* Teacher section and learner quotes are held back until real, approved content exists. */}

        <section className="block faq-sec" id="faq" aria-labelledby="faq-title">
          <div className="wrap">
            <h2 id="faq-title">คำถามที่พบบ่อย</h2>
            <div className="faq" data-testid="faq">
              {FAQ.map(([q, a]) => (
                <details key={q}>
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="final" aria-labelledby="final-title">
          <div className="wrap">
            <h2 id="final-title">กีตาร์ของคุณรออยู่</h2>
            <p>สมัครวันนี้ แล้วเริ่มบทที่ 1 ได้ทันที</p>
            <Link href="/signup" className="btn btn-primary" data-testid="final-signup">
              สมัครฟรี เริ่มบทที่ 1
            </Link>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <a href="#path">เส้นทางการเรียน</a>
          <a href="#faq">คำถามที่พบบ่อย</a>
          <span className="copy">FretPath · โปรเจกต์จบการศึกษา</span>
        </div>
      </footer>
    </div>
  );
}
