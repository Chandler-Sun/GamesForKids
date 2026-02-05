'use client';

import { useState, useCallback, useMemo } from 'react';
import styles from './page.module.css';

// ——— 答案类型 ———
type YNU = 'yes' | 'no' | 'unsure';
type AB = 'A' | 'B';

interface QuickConclusion {
  q1: YNU | null;
  q2: YNU | null;
  q3: YNU | null;
}

interface CoreSection {
  items: (YNU | null)[];
}

interface ChildDimension {
  evaluation: AB | null;
  motivation: AB | null;
  rhythm: AB | null;
  setback: AB | null;
}

type DilemmaChoice = 'stress' | 'slow' | 'future_risk' | 'worry_hold_back' | null;

interface Answers {
  quick: QuickConclusion;
  core1: CoreSection;
  core2: CoreSection;
  core3: CoreSection;
  childDim: ChildDimension;
  dilemma: DilemmaChoice;
  family6: CoreSection;
  family7: CoreSection;
  reTransfer: CoreSection;
  successDefine: string;
}

const defaultAnswers: Answers = {
  quick: { q1: null, q2: null, q3: null },
  core1: { items: [null, null, null] },
  core2: { items: [null, null, null] },
  core3: { items: [null, null, null] },
  childDim: { evaluation: null, motivation: null, rhythm: null, setback: null },
  dilemma: null,
  family6: { items: [null, null, null] },
  family7: { items: [null, null, null] },
  reTransfer: { items: [null, null, null] },
  successDefine: '',
};

// ——— 计分 ———
function scoreYNUItems(items: (YNU | null)[]): number {
  let sum = 0;
  for (const v of items) {
    if (v === 'yes') sum += 2;
    else if (v === 'unsure') sum += 1;
  }
  return sum;
}

function coreSectionScore(section: CoreSection): number {
  const raw = scoreYNUItems(section.items);
  if (raw >= 4) return 2;
  if (raw >= 2) return 1;
  return 0;
}

function quickConclusionFail(quick: QuickConclusion): boolean {
  const arr = [quick.q1, quick.q2, quick.q3];
  const noOrUnsure = arr.filter((x) => x === 'no' || x === 'unsure').length;
  return noOrUnsure >= 2;
}

function childDimensionScore(d: ChildDimension): number {
  const arr = [d.evaluation, d.motivation, d.rhythm, d.setback];
  const aCount = arr.filter((x) => x === 'A').length;
  const bCount = arr.filter((x) => x === 'B').length;
  if (aCount >= 3) return 2;
  if (bCount >= 3) return 0;
  return 1;
}

function dilemmaScore(d: DilemmaChoice): number {
  if (d === 'stress' || d === 'slow') return 2;
  if (d === 'future_risk') return 1;
  if (d === 'worry_hold_back') return 0;
  return 1;
}

function childMatchScore(answers: Answers): number {
  const dim = childDimensionScore(answers.childDim);
  const dil = dilemmaScore(answers.dilemma);
  return Math.round((dim + dil) / 2);
}

function familyScore(answers: Answers): number {
  const s6 = coreSectionScore(answers.family6);
  const s7 = coreSectionScore(answers.family7);
  return Math.round((s6 + s7) / 2);
}

function computeScores(answers: Answers): {
  core: number;
  child: number;
  family: number;
  total: number;
  quickFail: boolean;
} {
  const core =
    coreSectionScore(answers.core1) +
    coreSectionScore(answers.core2) +
    coreSectionScore(answers.core3);
  const child = childMatchScore(answers);
  const family = familyScore(answers);
  const total = core + child + family;
  const quickFail = quickConclusionFail(answers.quick);
  return { core, child, family, total, quickFail };
}

function getVerdict(
  total: number,
  core: number,
  quickFail: boolean
): { type: 'success' | 'warning' | 'danger'; title: string; text: string } {
  if (quickFail) {
    return {
      type: 'danger',
      title: '建议：不建议转学',
      text: '在「快速结论」中，您有三项中有两项以上犹豫或否定。问卷设计者认为：若在这里已卡住，后面大概率只是理性包装。建议先厘清自己的真实承受度，再考虑转学。',
    };
  }
  if (core < 4) {
    return {
      type: 'danger',
      title: '建议：不建议转学',
      text: '核心适配度（对结果延迟、教育主权、非标准化路径）得分不足 4 分，转学后高风险。建议先提升家庭对「慢成长」的共识与耐受度。',
    };
  }
  if (total >= 8) {
    return {
      type: 'success',
      title: '可以认真推进',
      text: '总分 ≥8，核心适配、孩子匹配与家庭系统整体达标。可以在此基础上进一步了解目标学校、做访校与沟通，并保持持续观察与弹性。',
    };
  }
  if (total >= 6) {
    return {
      type: 'warning',
      title: '需要明确补救方案',
      text: '总分在 6–7 分，存在明显短板。建议针对得分较低的维度（核心适配 / 孩子匹配 / 家庭系统）制定具体补救措施，并考虑延后转学时间或先做小范围尝试。',
    };
  }
  return {
    type: 'danger',
    title: '建议：不建议转学',
    text: '总分 ≤5，转学风险较高。建议先不转学，从家庭共识、自身焦虑管理、对孩子特质的理解等方面先做功课，再重新评估。',
  };
}

// ——— 步骤配置（用于进度与导航） ———
const STEP_IDS = [
  'welcome',
  'quick',
  'core1',
  'core2',
  'core3',
  'childDim',
  'dilemma',
  'family6',
  'family7',
  'retransfer',
  'successDefine',
  'result',
] as const;

export default function TransferSchoolCheckPage() {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>(defaultAnswers);
  const [anim, setAnim] = useState<'enter' | 'exit'>('enter');

  const currentStep = STEP_IDS[stepIndex];
  const progress = stepIndex <= 0 ? 0 : (stepIndex / (STEP_IDS.length - 1)) * 100;

  const setQuick = useCallback((key: keyof QuickConclusion, value: YNU) => {
    setAnswers((a) => ({ ...a, quick: { ...a.quick, [key]: value } }));
  }, []);

  const setCoreItem = useCallback(
    (section: 'core1' | 'core2' | 'core3', idx: number, value: YNU) => {
      setAnswers((a) => {
        const sec = a[section];
        const items = [...sec.items];
        items[idx] = value;
        return { ...a, [section]: { items } };
      });
    },
    []
  );

  const setFamilyItem = useCallback(
    (section: 'family6' | 'family7' | 'reTransfer', idx: number, value: YNU) => {
      setAnswers((a) => {
        const sec = a[section];
        const items = [...sec.items];
        items[idx] = value;
        return { ...a, [section]: { items } };
      });
    },
    []
  );

  const setChildDim = useCallback((key: keyof ChildDimension, value: AB) => {
    setAnswers((a) => ({
      ...a,
      childDim: { ...a.childDim, [key]: value },
    }));
  }, []);

  const goNext = useCallback(() => {
    if (currentStep === 'successDefine') {
      setAnim('exit');
      setTimeout(() => {
        setStepIndex(STEP_IDS.indexOf('result'));
        setAnim('enter');
      }, 320);
    } else {
      setAnim('exit');
      setTimeout(() => {
        setStepIndex((i) => Math.min(i + 1, STEP_IDS.length - 1));
        setAnim('enter');
      }, 320);
    }
  }, [currentStep]);

  const goPrev = useCallback(() => {
    setAnim('exit');
    setTimeout(() => {
      setStepIndex((i) => Math.max(0, i - 1));
      setAnim('enter');
    }, 280);
  }, []);

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 'welcome':
        return true;
      case 'quick': {
        const { q1, q2, q3 } = answers.quick;
        return q1 !== null && q2 !== null && q3 !== null;
      }
      case 'core1':
        return answers.core1.items.every((x) => x !== null);
      case 'core2':
        return answers.core2.items.every((x) => x !== null);
      case 'core3':
        return answers.core3.items.every((x) => x !== null);
      case 'childDim': {
        const d = answers.childDim;
        return (
          d.evaluation !== null &&
          d.motivation !== null &&
          d.rhythm !== null &&
          d.setback !== null
        );
      }
      case 'dilemma':
        return answers.dilemma !== null;
      case 'family6':
        return answers.family6.items.every((x) => x !== null);
      case 'family7':
        return answers.family7.items.every((x) => x !== null);
      case 'retransfer':
        return answers.reTransfer.items.every((x) => x !== null);
      case 'successDefine':
        return true;
      default:
        return true;
    }
  }, [currentStep, answers]);

  const scores = useMemo(
    () => (currentStep === 'result' ? computeScores(answers) : null),
    [currentStep, answers]
  );
  const verdict = useMemo(
    () =>
      scores
        ? getVerdict(scores.total, scores.core, scores.quickFail)
        : null,
    [scores]
  );

  return (
    <div className={styles.container}>
      <div className={styles.progressWrap}>
        <div
          className={styles.progressBar}
          style={{ width: `${progress}%` }}
        />
      </div>

      {currentStep === 'welcome' && (
        <section
          className={`${styles.slide} ${styles.slideEnter}`}
          key="welcome"
        >
          <p className={styles.sectionLabel}>转学判断检查单</p>
          <h1 className={styles.welcomeTitle}>
            在完整清单前，先确认你的真实承受度
          </h1>
          <p className={styles.welcomeDesc}>
            这是一份帮助家长自查「是否有必要给孩子转学」的自评表。请按顺序、诚实作答；完成后会得到量化得分与行动建议。答案仅用于自我梳理，不会上传或保存。
          </p>
          <button
            type="button"
            className={styles.welcomeStart}
            onClick={goNext}
          >
            开始自评
          </button>
        </section>
      )}

      {currentStep === 'quick' && (
        <section
          className={`${styles.slide} ${anim === 'enter' ? styles.slideEnter : styles.slideExit}`}
          key="quick"
        >
          <p className={styles.sectionLabel}>一、快速结论</p>
          <h2 className={styles.questionTitle}>
            以下三项中，只要有两项你犹豫或是否定的，就不建议转。
          </h2>
          <p className={styles.questionHint}>
            请逐项选择：是 / 否 / 犹豫
          </p>
          <div className={styles.cardBlock}>
            <div className={styles.cardBlockTitle}>
              我能接受孩子在 5–8 年内不进入「明确的头部赛道」
            </div>
            <div className={styles.optionTriple}>
              {(['yes', 'no', 'unsure'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`${styles.optionBtn} ${answers.quick.q1 === v ? styles.selected : ''}`}
                  onClick={() => setQuick('q1', v)}
                >
                  {v === 'yes' ? '是' : v === 'no' ? '否' : '犹豫'}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.cardBlock}>
            <div className={styles.cardBlockTitle}>
              我愿意承担比现在更多的家庭教育责任
            </div>
            <div className={styles.optionTriple}>
              {(['yes', 'no', 'unsure'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`${styles.optionBtn} ${answers.quick.q2 === v ? styles.selected : ''}`}
                  onClick={() => setQuick('q2', v)}
                >
                  {v === 'yes' ? '是' : v === 'no' ? '否' : '犹豫'}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.cardBlock}>
            <div className={styles.cardBlockTitle}>
              我能承受在亲友/同事比较中处于「解释方」
            </div>
            <div className={styles.optionTriple}>
              {(['yes', 'no', 'unsure'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`${styles.optionBtn} ${answers.quick.q3 === v ? styles.selected : ''}`}
                  onClick={() => setQuick('q3', v)}
                >
                  {v === 'yes' ? '是' : v === 'no' ? '否' : '犹豫'}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.navRow}>
            <button type="button" className={`${styles.navBtn} ${styles.navBtnPrev}`} onClick={goPrev}>
              上一步
            </button>
            <button
              type="button"
              className={`${styles.navBtn} ${styles.navBtnNext}`}
              onClick={goNext}
              disabled={!canProceed}
            >
              下一步
            </button>
          </div>
        </section>
      )}

      {currentStep === 'core1' && (
        <section
          className={`${styles.slide} ${anim === 'enter' ? styles.slideEnter : styles.slideExit}`}
          key="core1"
        >
          <p className={styles.sectionLabel}>二、核心适配度 · 1️⃣ 对「结果延迟」的真实耐受度</p>
          <h2 className={styles.questionTitle}>
            请逐条选择：是 / 否 / 不确定
          </h2>
          <p className={styles.questionHint}>
            ≥2 个「否 / 不确定」→ 高风险；≥2 个「是」→ 可继续
          </p>
          {[
            '我能接受孩子 小学阶段没有任何「亮眼标签」',
            '如果孩子到初中才显现优势，我不会认为「前面几年浪费了」',
            '我不需要通过孩子的成绩来证明自己的教育判断是对的',
          ].map((text, idx) => (
            <div className={styles.cardBlock} key={idx}>
              <div className={styles.cardBlockTitle}>{text}</div>
              <div className={styles.cardBlockOptions}>
                {(['yes', 'no', 'unsure'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={`${styles.optionBtn} ${answers.core1.items[idx] === v ? styles.selected : ''}`}
                    onClick={() => setCoreItem('core1', idx, v)}
                  >
                    {v === 'yes' ? '是' : v === 'no' ? '否' : '不确定'}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className={styles.navRow}>
            <button type="button" className={`${styles.navBtn} ${styles.navBtnPrev}`} onClick={goPrev}>
              上一步
            </button>
            <button
              type="button"
              className={`${styles.navBtn} ${styles.navBtnNext}`}
              onClick={goNext}
              disabled={!canProceed}
            >
              下一步
            </button>
          </div>
        </section>
      )}

      {currentStep === 'core2' && (
        <section
          className={`${styles.slide} ${anim === 'enter' ? styles.slideEnter : styles.slideExit}`}
          key="core2"
        >
          <p className={styles.sectionLabel}>二、核心适配度 · 2️⃣ 教育主权意识</p>
          <h2 className={styles.questionTitle}>
            家庭是否具备「教育主权意识」？请选择：是 / 否 / 不确定
          </h2>
          <p className={styles.questionHint}>
            若内心期待「学校替我把控一切」，这类学校会让你极度不安。
          </p>
          {[
            '我是否敢于与老师沟通、协商，而不是默认服从',
            '我是否能分辨「形式任务」与「真实成长」',
            '当学校给出模糊空间时，我不会焦虑要求「更明确的标准」',
          ].map((text, idx) => (
            <div className={styles.cardBlock} key={idx}>
              <div className={styles.cardBlockTitle}>{text}</div>
              <div className={styles.cardBlockOptions}>
                {(['yes', 'no', 'unsure'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={`${styles.optionBtn} ${answers.core2.items[idx] === v ? styles.selected : ''}`}
                    onClick={() => setCoreItem('core2', idx, v)}
                  >
                    {v === 'yes' ? '是' : v === 'no' ? '否' : '不确定'}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className={styles.navRow}>
            <button type="button" className={`${styles.navBtn} ${styles.navBtnPrev}`} onClick={goPrev}>
              上一步
            </button>
            <button
              type="button"
              className={`${styles.navBtn} ${styles.navBtnNext}`}
              onClick={goNext}
              disabled={!canProceed}
            >
              下一步
            </button>
          </div>
        </section>
      )}

      {currentStep === 'core3' && (
        <section
          className={`${styles.slide} ${anim === 'enter' ? styles.slideEnter : styles.slideExit}`}
          key="core3"
        >
          <p className={styles.sectionLabel}>二、核心适配度 · 3️⃣ 对「非标准化路径」的容忍度</p>
          <h2 className={styles.questionTitle}>
            请选择：是 / 否 / 不确定
          </h2>
          <p className={styles.questionHint}>
            若需要「横向对比」来获得安全感，这里会持续触发焦虑。
          </p>
          {[
            '我能接受孩子的成长轨迹 不可预测、不可对标',
            '我不会频繁用「别人家孩子」作为校准参照',
            '我更关心能力积累，而不是阶段性排名',
          ].map((text, idx) => (
            <div className={styles.cardBlock} key={idx}>
              <div className={styles.cardBlockTitle}>{text}</div>
              <div className={styles.cardBlockOptions}>
                {(['yes', 'no', 'unsure'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={`${styles.optionBtn} ${answers.core3.items[idx] === v ? styles.selected : ''}`}
                    onClick={() => setCoreItem('core3', idx, v)}
                  >
                    {v === 'yes' ? '是' : v === 'no' ? '否' : '不确定'}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className={styles.navRow}>
            <button type="button" className={`${styles.navBtn} ${styles.navBtnPrev}`} onClick={goPrev}>
              上一步
            </button>
            <button
              type="button"
              className={`${styles.navBtn} ${styles.navBtnNext}`}
              onClick={goNext}
              disabled={!canProceed}
            >
              下一步
            </button>
          </div>
        </section>
      )}

      {currentStep === 'childDim' && (
        <section
          className={`${styles.slide} ${anim === 'enter' ? styles.slideEnter : styles.slideExit}`}
          key="childDim"
        >
          <p className={styles.sectionLabel}>三、孩子个体匹配度 · 4️⃣ 心理与行为特征</p>
          <h2 className={styles.questionTitle}>
            <u>孩子</u>更符合哪一侧？选 A 或 B
          </h2>
          <table className={styles.dimensionTable}>
            <thead>
              <tr>
                <th>维度</th>
                <th>A</th>
                <th>B</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  key: 'evaluation',
                  dim: '对评价',
                  a: '不太在意排名',
                  b: '强依赖外部肯定',
                },
                {
                  key: 'motivation',
                  dim: '学习动机',
                  a: '好奇驱动',
                  b: '奖惩驱动',
                },
                {
                  key: 'rhythm',
                  dim: '自我节律',
                  a: '有自己的节奏',
                  b: '需要强外部推动',
                },
                {
                  key: 'setback',
                  dim: '挫折反应',
                  a: '可恢复',
                  b: '容易自我否定',
                },
              ].map((row) => (
                <tr key={row.key}>
                  <td className={styles.dimensionName}>{row.dim}</td>
                  <td>
                    <div className={styles.abCell}>
                      <button
                        type="button"
                        className={`${styles.abOption} ${answers.childDim[row.key as keyof ChildDimension] === 'A' ? styles.selectedA : ''}`}
                        onClick={() => setChildDim(row.key as keyof ChildDimension, 'A')}
                      >
                        A
                      </button>
                      <span style={{ fontSize: '0.875rem', color: '#64748b' }}>{row.a}</span>
                    </div>
                  </td>
                  <td>
                    <div className={styles.abCell}>
                      <button
                        type="button"
                        className={`${styles.abOption} ${answers.childDim[row.key as keyof ChildDimension] === 'B' ? styles.selectedB : ''}`}
                        onClick={() => setChildDim(row.key as keyof ChildDimension, 'B')}
                      >
                        B
                      </button>
                      <span style={{ fontSize: '0.875rem', color: '#64748b' }}>{row.b}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={styles.questionHint} style={{ marginTop: '1rem' }}>
            ≥3 个偏 A → 加分；≥3 个偏 B → 需要极强家庭支持，否则风险
          </p>
          <div className={styles.navRow}>
            <button type="button" className={`${styles.navBtn} ${styles.navBtnPrev}`} onClick={goPrev}>
              上一步
            </button>
            <button
              type="button"
              className={`${styles.navBtn} ${styles.navBtnNext}`}
              onClick={goNext}
              disabled={!canProceed}
            >
              下一步
            </button>
          </div>
        </section>
      )}

      {currentStep === 'dilemma' && (
        <section
          className={`${styles.slide} ${anim === 'enter' ? styles.slideEnter : styles.slideExit}`}
          key="dilemma"
        >
          <p className={styles.sectionLabel}>三、孩子个体匹配度 · 5️⃣ 真实困境</p>
          <h2 className={styles.questionTitle}>
            孩子当前的「真实困境」最贴近哪一项？
          </h2>
          <p className={styles.questionHint}>
          </p>
          <div className={styles.radioList}>
            {[
              { value: 'stress' as const, label: '压力过大 / 焦虑 / 抗拒学习' },
              { value: 'slow' as const, label: '节奏偏慢 / 被当前系统不断否定' },
              { value: 'future_risk' as const, label: '没明显问题，但家长预判未来风险' },
              { value: 'worry_hold_back' as const, label: '当前表现良好，主要担心「会不会被耽误」' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`${styles.radioItem} ${answers.dilemma === opt.value ? styles.selected : ''}`}
                onClick={() =>
                  setAnswers((a) => ({ ...a, dilemma: opt.value }))
                }
              >
                <span className={styles.radioDot} />
                <span className={styles.radioLabel}>{opt.label}</span>
              </button>
            ))}
          </div>
          <div className={styles.navRow}>
            <button type="button" className={`${styles.navBtn} ${styles.navBtnPrev}`} onClick={goPrev}>
              上一步
            </button>
            <button
              type="button"
              className={`${styles.navBtn} ${styles.navBtnNext}`}
              onClick={goNext}
              disabled={!canProceed}
            >
              下一步
            </button>
          </div>
        </section>
      )}

      {currentStep === 'family6' && (
        <section
          className={`${styles.slide} ${anim === 'enter' ? styles.slideEnter : styles.slideExit}`}
          key="family6"
        >
          <p className={styles.sectionLabel}>四、家庭系统稳定性 · 6️⃣ 父母立场一致（非常重要）</p>
          <h2 className={styles.questionTitle}>
            请选择：是 / 否 / 不确定
          </h2>
          <p className={styles.questionHint}>
            只要有一方明显摇摆 → 极高撕裂风险
          </p>
          {[
            '父母对「慢成长」有共识',
            '不存在一方暗中加压、一方缓冲',
            '在关键节点能对外统一口径（老师 / 亲友）',
          ].map((text, idx) => (
            <div className={styles.cardBlock} key={idx}>
              <div className={styles.cardBlockTitle}>{text}</div>
              <div className={styles.cardBlockOptions}>
                {(['yes', 'no', 'unsure'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={`${styles.optionBtn} ${answers.family6.items[idx] === v ? styles.selected : ''}`}
                    onClick={() => setFamilyItem('family6', idx, v)}
                  >
                    {v === 'yes' ? '是' : v === 'no' ? '否' : '不确定'}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className={styles.navRow}>
            <button type="button" className={`${styles.navBtn} ${styles.navBtnPrev}`} onClick={goPrev}>
              上一步
            </button>
            <button
              type="button"
              className={`${styles.navBtn} ${styles.navBtnNext}`}
              onClick={goNext}
              disabled={!canProceed}
            >
              下一步
            </button>
          </div>
        </section>
      )}

      {currentStep === 'family7' && (
        <section
          className={`${styles.slide} ${anim === 'enter' ? styles.slideEnter : styles.slideExit}`}
          key="family7"
        >
          <p className={styles.sectionLabel}>四、家庭系统稳定性 · 7️⃣ 家庭情绪管理能力</p>
          <h2 className={styles.questionTitle}>
            请选择：是 / 否 / 不确定
          </h2>
          {[
            '家长焦虑不会通过唠叨 / 额外作业转移给孩子',
            '能区分「孩子的问题」和「我的焦虑」',
            '能承受一段时间的不确定，而不急于纠偏',
          ].map((text, idx) => (
            <div className={styles.cardBlock} key={idx}>
              <div className={styles.cardBlockTitle}>{text}</div>
              <div className={styles.cardBlockOptions}>
                {(['yes', 'no', 'unsure'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={`${styles.optionBtn} ${answers.family7.items[idx] === v ? styles.selected : ''}`}
                    onClick={() => setFamilyItem('family7', idx, v)}
                  >
                    {v === 'yes' ? '是' : v === 'no' ? '否' : '不确定'}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className={styles.navRow}>
            <button type="button" className={`${styles.navBtn} ${styles.navBtnPrev}`} onClick={goPrev}>
              上一步
            </button>
            <button
              type="button"
              className={`${styles.navBtn} ${styles.navBtnNext}`}
              onClick={goNext}
              disabled={!canProceed}
            >
              下一步
            </button>
          </div>
        </section>
      )}

      {currentStep === 'retransfer' && (
        <section
          className={`${styles.slide} ${anim === 'enter' ? styles.slideEnter : styles.slideExit}`}
          key="retransfer"
        >
          <p className={styles.sectionLabel}>五、现实环境 · 8️⃣ 对「再转学」的心理准备</p>
          <h2 className={styles.questionTitle}>
            请诚实选择：是 / 否 / 不确定
          </h2>
          <p className={styles.questionHint}>
            成熟决策者的必备心态
          </p>
          {[
            '如果 2–3 年后发现不合适，我能接受再次转学',
            '我不会把「已经转了」当成沉没成本',
            '我能持续观察，而不是一次性押注',
          ].map((text, idx) => (
            <div className={styles.cardBlock} key={idx}>
              <div className={styles.cardBlockTitle}>{text}</div>
              <div className={styles.cardBlockOptions}>
                {(['yes', 'no', 'unsure'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={`${styles.optionBtn} ${answers.reTransfer.items[idx] === v ? styles.selected : ''}`}
                    onClick={() => setFamilyItem('reTransfer', idx, v)}
                  >
                    {v === 'yes' ? '是' : v === 'no' ? '否' : '不确定'}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className={styles.navRow}>
            <button type="button" className={`${styles.navBtn} ${styles.navBtnPrev}`} onClick={goPrev}>
              上一步
            </button>
            <button
              type="button"
              className={`${styles.navBtn} ${styles.navBtnNext}`}
              onClick={goNext}
              disabled={!canProceed}
            >
              下一步
            </button>
          </div>
        </section>
      )}

      {currentStep === 'successDefine' && (
        <section
          className={`${styles.slide} ${anim === 'enter' ? styles.slideEnter : styles.slideExit}`}
          key="successDefine"
        >
          <p className={styles.sectionLabel}>五、现实环境 · 9️⃣ 你对「成功」的底层定义</p>
          <h2 className={styles.questionTitle}>
            请在心里或下面填空完成这句话：
          </h2>
          <p className={styles.questionHint}>
            如果孩子 25 岁时 ________，我依然认为这次转学是值得的。
          </p>
          <div className={styles.textareaWrap}>
            <textarea
              placeholder="例如：能养活自己，愿意学习新东西 / 心理稳定，有自己的方向；或：进入头部公司"
              value={answers.successDefine}
              onChange={(e) =>
                setAnswers((a) => ({ ...a, successDefine: e.target.value }))
              }
            />
          </div>
          <p className={styles.questionHint} style={{ marginTop: '0.5rem' }}>
            选填，不影响得分，仅用于自我梳理
          </p>
          <div className={styles.navRow}>
            <button type="button" className={`${styles.navBtn} ${styles.navBtnPrev}`} onClick={goPrev}>
              上一步
            </button>
            <button
              type="button"
              className={`${styles.navBtn} ${styles.navBtnNext}`}
              onClick={goNext}
            >
              查看结果
            </button>
          </div>
        </section>
      )}

      {currentStep === 'result' && scores && verdict && (
        <section
          className={`${styles.resultSlide} ${anim === 'enter' ? styles.slideEnter : styles.slideExit}`}
          key="result"
        >
          <h1 className={styles.resultTitle}>评估结果</h1>
          <p className={styles.resultSubtitle}>
            基于你的作答生成的量化得分与建议，仅供参考。
          </p>

          <div className={styles.scoreCard}>
            <div className={styles.scoreTotalWrap}>
              <div className={styles.scoreTotalLabel}>总分（满分 10 分）</div>
              <div>
                <span className={styles.scoreTotalValue}>{scores.total}</span>
                <span className={styles.scoreTotalMax}> / 10</span>
              </div>
            </div>
            <div className={styles.scoreBars}>
              <div className={styles.scoreBarRow}>
                <span className={styles.scoreBarLabel}>核心适配</span>
                <div className={styles.scoreBarTrack}>
                  <div
                    className={`${styles.scoreBarFill} ${styles.core}`}
                    style={{ width: `${(scores.core / 6) * 100}%` }}
                  />
                </div>
                <span className={styles.scoreBarValue}>{scores.core}</span>
              </div>
              <div className={styles.scoreBarRow}>
                <span className={styles.scoreBarLabel}>孩子匹配</span>
                <div className={styles.scoreBarTrack}>
                  <div
                    className={`${styles.scoreBarFill} ${styles.child}`}
                    style={{ width: `${(scores.child / 2) * 100}%` }}
                  />
                </div>
                <span className={styles.scoreBarValue}>{scores.child}</span>
              </div>
              <div className={styles.scoreBarRow}>
                <span className={styles.scoreBarLabel}>家庭系统</span>
                <div className={styles.scoreBarTrack}>
                  <div
                    className={`${styles.scoreBarFill} ${styles.family}`}
                    style={{ width: `${(scores.family / 2) * 100}%` }}
                  />
                </div>
                <span className={styles.scoreBarValue}>{scores.family}</span>
              </div>
            </div>
          </div>

          <div className={`${styles.verdictCard} ${styles[verdict.type]}`}>
            <div className={styles.verdictTitle}>{verdict.title}</div>
            <div className={styles.verdictText}>{verdict.text}</div>
            {scores.quickFail && (
              <div className={styles.quickConclusionWarning}>
                你在「快速结论」中有两项以上犹豫或否定，问卷设计者认为此时转学决策风险较高，建议先厘清自己的真实承受度。
              </div>
            )}
          </div>

          <button
            type="button"
            className={styles.resultRestart}
            onClick={() => {
              setStepIndex(0);
              setAnswers(defaultAnswers);
            }}
          >
            重新填写
          </button>
        </section>
      )}
    </div>
  );
}
