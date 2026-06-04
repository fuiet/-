import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Dice5,
  Droplets,
  Medal,
  Music2,
  PawPrint,
  Plus,
  RotateCcw,
  Send,
  Settings,
  Sparkles,
  Trash2,
  Trophy,
  UserRound,
  UsersRound,
  Utensils,
  XCircle
} from 'lucide-react';
import './styles.css';
import { generatedQuestions } from './data/generatedQuestions.js';
import { importedClasses, importedStudents } from './data/importedRoster.js';

const classesSeed = importedClasses;
const studentsSeed = importedStudents;
const rosterVersion = 'attendance-roster-2026-06-04-v2';

const questionsSeed = generatedQuestions;
const questionBankSeed = Array.from(new Set(questionsSeed.map((question) => question.unit)));

const punishmentsSeed = [
  '夹子音读题干',
  '唱一句歌',
  '开合跳 10 个',
  '做一个夸张表情',
  '模仿指挥家 5 秒',
  '用“今天天气真好”开头编一段无厘头的话'
];

const tabs = [
  { id: 'classes', label: '班级' },
  { id: 'questions', label: '题库' },
  { id: 'punishments', label: '挑战' }
];

function pickRandom(items, currentId) {
  const pool = items.length > 1 ? items.filter((item) => item.id !== currentId) : items;
  return pool[Math.floor(Math.random() * pool.length)];
}

function App() {
  const [classes, setClasses] = useStoredState('music-history-classes', classesSeed);
  const [students, setStudents] = useStoredState('music-history-students', studentsSeed);
  const [questions, setQuestions] = useStoredState('music-history-questions-v3', questionsSeed);
  const [questionBanks, setQuestionBanks] = useStoredState('music-history-question-banks', questionBankSeed);
  const [punishments, setPunishments] = useStoredState('music-history-punishments', punishmentsSeed);
  const [currentClassId, setCurrentClassId] = useStoredState('music-history-current-class', classesSeed[0].id);
  const [currentBank, setCurrentBank] = useStoredState('music-history-current-bank', '全部题库');
  const [currentStudentId, setCurrentStudentId] = useState(1);
  const [currentQuestion, setCurrentQuestion] = useState(questions[0]);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [result, setResult] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState('classes');
  const [isDrawingStudent, setIsDrawingStudent] = useState(false);
  const [rollingName, setRollingName] = useState('');
  const [catMenuOpen, setCatMenuOpen] = useState(true);
  const [catAction, setCatAction] = useState('idle');
  const [catTarget, setCatTarget] = useState({ x: 0, y: 0 });
  const [punishment, setPunishment] = useState('');
  const [showChallengeWheel, setShowChallengeWheel] = useState(false);
  const [challengeWheelRotation, setChallengeWheelRotation] = useState(0);
  const [challengeWheelWinner, setChallengeWheelWinner] = useState('');
  const [isChallengeWheelSpinning, setIsChallengeWheelSpinning] = useState(false);
  const [classStartedAt] = useState(Date.now());
  const [elapsed, setElapsed] = useState('00:00:00');
  const challengeWheelTimer = useRef(null);
  const catTimer = useRef(null);
  const petZoneRef = useRef(null);

  useEffect(() => {
    let shouldImportRoster = true;
    try {
      shouldImportRoster = window.localStorage.getItem('music-history-roster-version') !== rosterVersion;
      if (!shouldImportRoster) return;
      window.localStorage.setItem('music-history-classes', JSON.stringify(classesSeed));
      window.localStorage.setItem('music-history-students', JSON.stringify(studentsSeed));
      window.localStorage.setItem('music-history-current-class', JSON.stringify(classesSeed[0]?.id ?? ''));
      window.localStorage.setItem('music-history-roster-version', rosterVersion);
    } catch {
      // Local storage may be unavailable in restricted browser modes.
    }
    if (!shouldImportRoster) return;
    setClasses(classesSeed);
    setStudents(studentsSeed);
    setCurrentClassId(classesSeed[0]?.id ?? '');
    setCurrentStudentId(studentsSeed[0]?.id ?? null);
  }, [setClasses, setCurrentClassId, setStudents]);

  const currentClass = classes.find((item) => item.id === currentClassId) ?? classes[0];
  const classStudents = students.filter((student) => student.classId === currentClass?.id);
  const presentStudents = classStudents.filter((student) => !student.absent);
  const currentStudent = classStudents.find((student) => student.id === currentStudentId) ?? classStudents[0] ?? null;
  const questionBankOptions = ['全部题库', ...questionBanks];
  const visibleQuestions = currentBank === '全部题库' ? questions : questions.filter((question) => question.unit === currentBank);
  const rankedStudents = [...classStudents].sort((a, b) => b.classScore - a.classScore).slice(0, 10);
  const answeredCount = result ? 1 : 0;
  const correctCount = result?.type === 'correct' ? 1 : 0;

  useEffect(() => {
    setStudents((current) =>
      current.map((student) => ({
        ...student,
        classId: student.classId || classesSeed[0].id,
        absent: Boolean(student.absent)
      }))
    );
  }, [setStudents]);

  useEffect(() => {
    if (classes.length && !classes.some((item) => item.id === currentClassId)) {
      setCurrentClassId(classes[0].id);
    }
  }, [classes, currentClassId, setCurrentClassId]);

  useEffect(() => {
    const questionUnits = Array.from(new Set(questions.map((question) => question.unit).filter(Boolean)));
    setQuestionBanks((current) => {
      const merged = [...current];
      questionUnits.forEach((unit) => {
        if (!merged.includes(unit)) merged.push(unit);
      });
      return merged.length === current.length ? current : merged;
    });
  }, [questions, setQuestionBanks]);

  useEffect(() => {
    if (currentBank !== '全部题库' && !questionBanks.includes(currentBank)) {
      setCurrentBank('全部题库');
    }
  }, [currentBank, questionBanks, setCurrentBank]);

  useEffect(() => {
    if (classStudents.length && !classStudents.some((student) => student.id === currentStudentId)) {
      setCurrentStudentId(classStudents[0].id);
    }
  }, [classStudents, currentStudentId]);

  useEffect(() => {
    const updatedQuestion = visibleQuestions.find((question) => question.id === currentQuestion?.id);
    if (updatedQuestion) {
      if (updatedQuestion !== currentQuestion) {
        setCurrentQuestion(updatedQuestion);
        setSelectedOptions((current) => current.filter((index) => index < (updatedQuestion.options?.length ?? 0)));
      }
      return;
    }

    const fallbackQuestion = visibleQuestions[0] ?? questions[0] ?? null;
    if (fallbackQuestion !== currentQuestion) {
      setCurrentQuestion(fallbackQuestion);
      setSelectedOptions([]);
      setResult(null);
    }
  }, [visibleQuestions, questions, currentQuestion]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const seconds = Math.floor((Date.now() - classStartedAt) / 1000);
      const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
      const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
      const s = String(seconds % 60).padStart(2, '0');
      setElapsed(`${h}:${m}:${s}`);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [classStartedAt]);

  useEffect(() => {
    return () => {
      if (challengeWheelTimer.current) {
        window.clearTimeout(challengeWheelTimer.current);
      }
      if (catTimer.current) {
        window.clearTimeout(catTimer.current);
      }
    };
  }, []);

  function drawStudent() {
    if (!presentStudents.length || isDrawingStudent) return;
    setResult(null);
    setSelectedOptions([]);
    setIsDrawingStudent(true);
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      const randomStudent = presentStudents[Math.floor(Math.random() * presentStudents.length)];
      setRollingName(randomStudent.name);
      if (Date.now() - startedAt >= 3000) {
        window.clearInterval(interval);
        const next = pickRandom(presentStudents, currentStudent?.id);
        setCurrentStudentId(next.id);
        setRollingName(next.name);
        window.setTimeout(() => setIsDrawingStudent(false), 260);
      }
    }, 86);
  }

  function drawQuestion() {
    if (!visibleQuestions.length) return;
    const next = pickRandom(visibleQuestions, currentQuestion?.id);
    setCurrentQuestion(next);
    setResult(null);
    setSelectedOptions([]);
    setPunishment('');
  }

  function toggleOption(index) {
    if (result) return;
    setSelectedOptions((current) =>
      current.includes(index) ? current.filter((item) => item !== index) : [...current, index]
    );
  }

  function submitAnswer() {
    if (!selectedOptions.length || !currentQuestion) return;
    const correctSet = currentQuestion.options
      .map((option, index) => (option.correct ? index : null))
      .filter((index) => index !== null);
    const normalizedSelected = [...selectedOptions].sort().join(',');
    const normalizedCorrect = [...correctSet].sort().join(',');
    const answerResult = normalizedSelected === normalizedCorrect ? 'correct' : 'wrong';
    setResult({ type: answerResult });
  }

  function updateStudent(studentId, updater) {
    setStudents((current) => current.map((student) => (student.id === studentId ? updater(student) : student)));
  }

  function addPoint() {
    if (!currentStudent) return;
    updateStudent(currentStudent.id, (student) => ({
      ...student,
      classScore: student.classScore + 1,
      totalScore: student.totalScore + 1
    }));
    setResult(null);
    setSelectedOptions([]);
  }

  function continueChallenge() {
    drawQuestion();
  }

  function drawPunishment() {
    if (!punishments.length || isChallengeWheelSpinning) return;
    setPunishment('');
    setChallengeWheelWinner('');
    setShowChallengeWheel(true);
  }

  function startChallengeWheel() {
    if (!punishments.length || isChallengeWheelSpinning || challengeWheelWinner) return;
    const winnerIndex = Math.floor(Math.random() * punishments.length);
    const segmentAngle = 360 / punishments.length;
    const targetAngle = 360 - (winnerIndex * segmentAngle + segmentAngle / 2);

    setIsChallengeWheelSpinning(true);
    setChallengeWheelRotation((current) => Math.ceil(current / 360) * 360 + 1440 + targetAngle);

    if (challengeWheelTimer.current) {
      window.clearTimeout(challengeWheelTimer.current);
    }
    challengeWheelTimer.current = window.setTimeout(() => {
      setChallengeWheelWinner(punishments[winnerIndex]);
      setPunishment(punishments[winnerIndex]);
      setIsChallengeWheelSpinning(false);
    }, 3000);
  }

  function closeChallengeWheel() {
    if (challengeWheelTimer.current) {
      window.clearTimeout(challengeWheelTimer.current);
      challengeWheelTimer.current = null;
    }
    setIsChallengeWheelSpinning(false);
    setShowChallengeWheel(false);
  }

  function scheduleCatReset(delay = 2200) {
    if (catTimer.current) {
      window.clearTimeout(catTimer.current);
    }
    catTimer.current = window.setTimeout(() => {
      setCatAction('idle');
      setCatTarget({ x: 0, y: 0 });
    }, delay);
  }

  function triggerCatReaction(action) {
    setCatAction(action);
    setCatMenuOpen(false);
    scheduleCatReset(2400);
  }

  function interactWithCat(action) {
    setCatAction(action);
    setCatMenuOpen(false);
    scheduleCatReset(action === 'play' || action === 'drink' || action === 'feed' ? 15000 : 2800);
  }

  function moveCatToy(event) {
    if (catAction !== 'play' || !petZoneRef.current) return;
    const rect = petZoneRef.current.getBoundingClientRect();
    const x = Math.min(106, Math.max(-8, event.clientX - rect.left - 74));
    const y = Math.min(22, Math.max(-92, event.clientY - rect.top - 152));
    setCatTarget({ x, y });
  }

  function openSettings(tab) {
    setSettingsTab(tab);
    setShowSettings(true);
  }

  const animatedCatTarget =
    catAction === 'play'
      ? catTarget
      : catAction === 'feed'
        ? { x: 54, y: -22 }
        : catAction === 'drink'
          ? { x: 66, y: -4 }
          : { x: 0, y: 0 };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <Music2 aria-hidden="true" />
          <span>音乐史闯关王</span>
        </div>
        <HeaderSelector
          label="当前班级："
          valueLabel={currentClass?.name ?? '未设置'}
          options={classes.map((item) => ({ label: item.name, value: item.id }))}
          selectedValue={currentClassId}
          onChange={setCurrentClassId}
        />
        <HeaderSelector
          label="题库："
          valueLabel={currentBank}
          options={questionBankOptions.map((bank) => ({ label: bank, value: bank }))}
          selectedValue={currentBank}
          onChange={setCurrentBank}
        />
        <button className="settings-button" onClick={() => openSettings('classes')}>
          <Settings size={20} />
          设置
        </button>
      </header>

      <section className="layout-grid">
        <aside className="left-rail">
          <Panel title="课堂工具">
            <div className="tool-list">
              <button className="tool-button" onClick={drawStudent}>
                <UsersRound />
                幸运点名
              </button>
              <button className="tool-button" onClick={drawQuestion}>
                <Dice5 />
                抽选题目
              </button>
            </div>
          </Panel>

          <Panel title="积分概览" subtitle="当前幸运同学">
            <div className="score-card">
              <span>课堂积分</span>
              <strong>
                <Trophy size={30} />
                {currentStudent?.classScore ?? 0}
              </strong>
              <em>分</em>
            </div>
            <div className="score-card">
              <span>长期积分</span>
              <strong>
                <Medal size={30} />
                {(currentStudent?.totalScore ?? 0).toLocaleString()}
              </strong>
              <em>分</em>
            </div>
          </Panel>

          <div
            className={`pet-zone ${catAction === 'play' ? 'is-play-mode' : ''}`}
            ref={petZoneRef}
            onMouseMove={moveCatToy}
          >
            {catAction === 'drink' || catAction === 'feed' || catAction === 'play' ? (
              <ChromaKeyVideo
                className={`cat-green-scene cat-${catAction}-scene`}
                src={
                  catAction === 'drink'
                    ? '/assets/cat-drinking-greenscreen.mp4'
                    : catAction === 'feed'
                      ? '/assets/cat-feeding-greenscreen.mp4'
                      : '/assets/cat-chasing-wand-greenscreen.mp4'
                }
                active={catAction === 'drink' || catAction === 'feed' || catAction === 'play'}
                style={catAction === 'play' ? { '--chase-x': `${catTarget.x * 0.42}px`, '--chase-y': `${catTarget.y * 0.34}px` } : undefined}
              />
            ) : (
              <button
                className={`cat-mascot cat-${catAction} ${catAction !== 'idle' ? 'is-active' : ''}`}
                style={{ '--cat-x': `${animatedCatTarget.x}px`, '--cat-y': `${animatedCatTarget.y}px` }}
                onClick={() => setCatMenuOpen((open) => !open)}
                aria-label="打开朵朵互动"
              >
                <img src="/assets/realistic-cat.png" alt="银渐层猫咪朵朵" />
              </button>
            )}
            {catAction === 'play' && (
              <div
                className="cat-wand"
                style={{
                  '--wand-x': `${catTarget.x + 100}px`,
                  '--wand-y': `${catTarget.y + 96}px`
                }}
              />
            )}
            {catMenuOpen && (
              <div className="cat-menu">
                <button onClick={() => interactWithCat('feed')}>
                  <Utensils size={16} />
                  喂食
                </button>
                <button onClick={() => interactWithCat('drink')}>
                  <Droplets size={16} />
                  喝水
                </button>
                <button onClick={() => interactWithCat('play')}>
                  <PawPrint size={16} />
                  逗猫
                </button>
              </div>
            )}
          </div>
        </aside>

        <section className="center-stage">
          <section className="student-stage">
            <div className="stage-notes" />
            <Music2 className="stage-note stage-note-left" size={22} />
            <Music2 className="stage-note stage-note-right" size={20} />
            <div className="lucky-card">
              <div className="ribbon">
                <Sparkles size={16} />
                本轮幸运同学
              </div>
              <div className="avatar">
                <UserRound size={62} />
              </div>
              <h1 className={isDrawingStudent ? 'rolling-name' : ''}>
                {isDrawingStudent ? rollingName || currentStudent?.name : currentStudent?.name ?? '暂无学生'}
              </h1>
            </div>
          </section>

          <section className="question-panel">
            <div className="question-title">
              <Music2 size={20} />
              <span>随机题目</span>
              <Music2 size={20} />
            </div>
            <h2>
              {currentQuestion?.prompt ?? '请先在设置中添加题目'}
              <small>（多选）</small>
            </h2>
            <div className="option-grid">
              {(currentQuestion?.options ?? []).map((option, index) => (
                <button
                  key={`${option.text}-${index}`}
                  className={`option ${selectedOptions.includes(index) ? 'selected' : ''}`}
                  onClick={() => toggleOption(index)}
                >
                  <span className="option-index">{index + 1}</span>
                  <span>{option.text}</span>
                  <span className="checkbox">{selectedOptions.includes(index) ? '✓' : ''}</span>
                </button>
              ))}
            </div>
            <button className="submit-button" onClick={submitAnswer}>
              <Send size={24} />
              提交答案
            </button>
          </section>
        </section>

        <aside className="right-rail">
          <Panel title="积分排行榜" subtitle="TOP 10" icon={<Trophy />}>
            <div className="leaderboard-head">
              <span>排名</span>
              <span>姓名</span>
              <span>课堂积分</span>
              <span>长期积分</span>
            </div>
            <div className="leaderboard-list">
              {rankedStudents.map((student, index) => (
                <div className="leader-row" key={student.id}>
                  <span className={`rank rank-${index + 1}`}>{index + 1}</span>
                  <strong>{student.name}</strong>
                  <span>{student.classScore}</span>
                  <span>{student.totalScore}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="课堂状态">
            <StatusRow icon={<UserRound />} label="在线人数" value={`${presentStudents.length} / ${classStudents.length}`} />
            <StatusRow icon={<UsersRound />} label="已答人数" value={answeredCount} />
            <StatusRow icon={<CheckCircle2 />} label="正确人数" value={correctCount || '--'} />
            <StatusRow icon={<Sparkles />} label="正确率" value={answeredCount ? `${Math.round((correctCount / answeredCount) * 100)}%` : '--'} />
          </Panel>
        </aside>
      </section>

      <footer className="bottom-bar">
        <span>
          <Music2 size={18} />
          小贴士：答题为多选题，少选、错选均不得分哦！
        </span>
        <span>课堂时间：{elapsed}</span>
      </footer>

      {result && (
        <ResultModal
          result={result}
          question={currentQuestion}
          onClose={() => setResult(null)}
          onAddPoint={addPoint}
          onContinue={continueChallenge}
          onPunish={drawPunishment}
          punishment={punishment}
        />
      )}

      {showChallengeWheel && (
        <ChallengeWheelModal
          punishments={punishments}
          rotation={challengeWheelRotation}
          winner={challengeWheelWinner}
          isSpinning={isChallengeWheelSpinning}
          onSpin={startChallengeWheel}
          onClose={closeChallengeWheel}
        />
      )}

      {showSettings && (
        <SettingsDrawer
          activeTab={settingsTab}
          setActiveTab={setSettingsTab}
          classes={classes}
          setClasses={setClasses}
          students={students}
          setStudents={setStudents}
          questions={questions}
          setQuestions={setQuestions}
          questionBanks={questionBanks}
          setQuestionBanks={setQuestionBanks}
          punishments={punishments}
          setPunishments={setPunishments}
          currentClassId={currentClassId}
          setCurrentClassId={setCurrentClassId}
          currentBank={currentBank}
          setCurrentBank={setCurrentBank}
          onClose={() => setShowSettings(false)}
        />
      )}
    </main>
  );
}

function useStoredState(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState];
}

function HeaderSelector({ label, valueLabel, options, selectedValue, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectorRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    function closeOnOutsideClick(event) {
      if (!selectorRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    window.addEventListener('mousedown', closeOnOutsideClick);
    return () => window.removeEventListener('mousedown', closeOnOutsideClick);
  }, [isOpen]);

  return (
    <div className="selector select-field" ref={selectorRef}>
      <span>{label}</span>
      <strong>{valueLabel}</strong>
      <button
        className={`selector-arrow ${isOpen ? 'is-open' : ''}`}
        type="button"
        aria-label={`展开${label.replace('：', '')}`}
        onClick={() => setIsOpen((open) => !open)}
      >
        <ChevronDown size={18} />
      </button>
      {isOpen && (
        <div className="select-menu">
          {options.map((option) => (
            <button
              className={option.value === selectedValue ? 'active' : ''}
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Panel({ title, subtitle, icon, children }) {
  return (
    <section className="panel">
      <div className="panel-title">
        <span>
          {icon}
          {title}
        </span>
        {subtitle && <strong>{subtitle}</strong>}
      </div>
      {children}
    </section>
  );
}

function StatusRow({ icon, label, value }) {
  return (
    <div className="status-row">
      <span>
        {icon}
        {label}
      </span>
      <strong>{value}</strong>
    </div>
  );
}

function ChromaKeyVideo({ src, active, className, style }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!active || !video || !canvas) return undefined;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    let disposed = false;

    function drawFrame() {
      if (disposed || video.paused || video.ended) return;
      const width = video.videoWidth || 720;
      const height = video.videoHeight || 1280;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      context.drawImage(video, 0, 0, width, height);
      const frame = context.getImageData(0, 0, width, height);
      const data = frame.data;

      for (let index = 0; index < data.length; index += 4) {
        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];
        const greenDominance = green - Math.max(red, blue);

        if (green > 92 && greenDominance > 28) {
          const alpha = Math.max(0, 255 - greenDominance * 5.8);
          data[index + 3] = alpha;
          if (alpha < 80) {
            data[index] = Math.min(255, red + 18);
            data[index + 1] = Math.max(0, green - 42);
            data[index + 2] = Math.min(255, blue + 18);
          }
        }
      }

      context.putImageData(frame, 0, 0);
      frameRef.current = window.requestAnimationFrame(drawFrame);
    }

    async function startVideo() {
      video.currentTime = 0;
      video.muted = true;
      video.playsInline = true;
      try {
        await video.play();
        frameRef.current = window.requestAnimationFrame(drawFrame);
      } catch {
        // If autoplay is blocked, the hidden video still stays ready for a user-triggered replay.
      }
    }

    startVideo();

    return () => {
      disposed = true;
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
      video.pause();
    };
  }, [active, src]);

  return (
    <div className={className} style={style} aria-hidden="true">
      <video ref={videoRef} src={src} muted playsInline preload="auto" />
      <canvas ref={canvasRef} />
    </div>
  );
}

function ResultModal({ result, question, onClose, onAddPoint, onContinue, onPunish, punishment }) {
  const correctOptions = question.options
    .map((option, index) => (option.correct ? { number: index + 1, text: option.text } : null))
    .filter(Boolean);
  const correctOptionNumbers = correctOptions.map((option) => option.number).join('、');
  const isCorrect = result.type === 'correct';

  return (
    <div className="modal-backdrop">
      <section className="result-modal">
        <button className="close-button" onClick={onClose}>×</button>
        <div className={`modal-cat ${isCorrect ? 'modal-cat-happy' : 'modal-cat-sad'}`} aria-hidden="true">
          <img src="/assets/realistic-cat.png" alt="" />
          {isCorrect ? (
            <>
              <span className="modal-cat-note note-one">♪</span>
              <span className="modal-cat-note note-two">★</span>
            </>
          ) : (
            <span className="modal-cat-tear" />
          )}
        </div>
        <div className={`result-icon ${isCorrect ? 'correct' : 'wrong'}`}>
          {isCorrect ? <CheckCircle2 /> : <XCircle />}
        </div>
        <h2>{isCorrect ? '答对！' : '答错了'}</h2>
        {isCorrect ? (
          <>
            <p>本轮答对，老师可确认是否为 {question.concept} 本题加 1 分。</p>
            <div className="modal-actions">
              <button className="gold-action" onClick={onAddPoint}>确认加分</button>
              <button className="teal-action" onClick={onContinue}>继续挑战</button>
            </div>
          </>
        ) : (
          <>
            <div className="answer-box">
              <strong>正确答案：{correctOptionNumbers}</strong>
              <div className="correct-answer-list">
                {correctOptions.map((option) => (
                  <p key={option.number}>
                    <span>{option.number}.</span>
                    {option.text}
                  </p>
                ))}
              </div>
              <strong>解析</strong>
              <p>{question.explanation}</p>
            </div>
            <button className="danger-action" onClick={onPunish}>挑战盲盒</button>
            {punishment && <div className="punishment-result">盲盒挑战：{punishment}</div>}
          </>
        )}
      </section>
    </div>
  );
}

function ChallengeWheelModal({ punishments, rotation, winner, isSpinning, onSpin, onClose }) {
  const colors = ['#0a7781', '#dfa940', '#12a6a6', '#ef514f', '#7ecdc6', '#f2c66a', '#0b5360', '#f08c7e'];
  const count = Math.max(punishments.length, 1);
  const gradient = punishments
    .map((_, index) => {
      const start = (index / count) * 100;
      const end = ((index + 1) / count) * 100;
      return `${colors[index % colors.length]} ${start}% ${end}%`;
    })
    .join(', ');

  return (
    <div className="challenge-wheel-backdrop">
      <section className="challenge-wheel-modal">
        <button className="close-button" onClick={onClose}>×</button>
        <h2>
          <Sparkles size={26} />
          挑战盲盒
        </h2>
        <p>每一个挑战项目概率相同，点击中间“挑战”后转盘开始转动。</p>
        <div className="challenge-wheel-area">
          <div className="wheel-pointer" />
          <div
            className="wheel-disc"
            style={{
              '--wheel-rotation': `${rotation}deg`,
              '--wheel-gradient': gradient
            }}
          >
            <button
              className="wheel-center"
              type="button"
              onClick={onSpin}
              disabled={isSpinning || Boolean(winner)}
            >
              {isSpinning ? '抽取中' : '挑战'}
            </button>
            {punishments.map((item, index) => {
              const angle = (360 / count) * index + 180 / count;
              return (
                <span
                  className="wheel-label"
                  key={`${item}-${index}`}
                  style={{ transform: `rotate(${angle}deg) translateY(-112px)` }}
                >
                  <span className="wheel-label-text">{item}</span>
                </span>
              );
            })}
          </div>
        </div>
        <div className={`wheel-result ${winner ? 'is-visible' : ''}`}>
          <span>本次挑战</span>
          <strong>{winner || (isSpinning ? '转盘正在选择...' : '点击中间开始')}</strong>
        </div>
        <button className="teal-action wheel-confirm" onClick={onClose} disabled={isSpinning}>
          确定
        </button>
      </section>
    </div>
  );
}

function SettingsDrawer(props) {
  const {
    activeTab,
    setActiveTab,
    classes,
    setClasses,
    students,
    setStudents,
    questions,
    setQuestions,
    questionBanks,
    setQuestionBanks,
    punishments,
    setPunishments,
    currentClassId,
    setCurrentClassId,
    currentBank,
    setCurrentBank,
    onClose
  } = props;

  return (
    <div className="settings-backdrop" onClick={onClose}>
      <aside className="settings-drawer settings-drawer-wide" onClick={(event) => event.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>
        <h2>
          <Settings />
          设置
        </h2>
        <div className="settings-shell">
          <nav className="settings-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={activeTab === tab.id ? 'active' : ''}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <section className="settings-content">
            {activeTab === 'classes' && (
              <ClassSettings
                classes={classes}
                setClasses={setClasses}
                students={students}
                setStudents={setStudents}
                currentClassId={currentClassId}
                setCurrentClassId={setCurrentClassId}
              />
            )}
            {activeTab === 'questions' && (
              <QuestionSettings
                questions={questions}
                setQuestions={setQuestions}
                questionBanks={questionBanks}
                setQuestionBanks={setQuestionBanks}
                currentBank={currentBank}
                setCurrentBank={setCurrentBank}
              />
            )}
            {activeTab === 'punishments' && (
              <PunishmentSettings punishments={punishments} setPunishments={setPunishments} />
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

function ClassSettings({ classes, setClasses, students, setStudents, currentClassId, setCurrentClassId }) {
  const [className, setClassName] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const selectedClass = classes.find((item) => item.id === currentClassId) ?? classes[0];
  const classStudents = students.filter((student) => student.classId === selectedClass?.id);
  const selectedCount = selectedStudentIds.length;
  const allSelected = classStudents.length > 0 && classStudents.every((student) => selectedStudentIds.includes(student.id));

  useEffect(() => {
    setSelectedStudentIds([]);
  }, [currentClassId]);

  function addClass() {
    const trimmed = className.trim();
    if (!trimmed) return;
    if (classes.some((item) => item.name === trimmed)) return;
    const newClass = { id: `class-${Date.now()}`, name: trimmed };
    setClasses((current) => [...current, newClass]);
    setCurrentClassId(newClass.id);
    setClassName('');
  }

  function removeClass(classId) {
    const remainingClasses = classes.filter((item) => item.id !== classId);
    setClasses(remainingClasses);
    setStudents((current) => current.filter((student) => student.classId !== classId));
    setSelectedStudentIds([]);
    if (currentClassId === classId) {
      setCurrentClassId(remainingClasses[0]?.id ?? '');
    }
  }

  function addStudent() {
    const trimmed = studentName.trim();
    if (!trimmed || !selectedClass) return;
    setStudents((current) => [
      ...current,
      {
        id: Date.now(),
        classId: selectedClass.id,
        name: trimmed,
        number: Number(studentNumber) || classStudents.length + 1,
        absent: false,
        classScore: 0,
        totalScore: 0
      }
    ]);
    setStudentName('');
    setStudentNumber('');
  }

  function removeStudent(studentId) {
    setStudents((current) => current.filter((student) => student.id !== studentId));
    setSelectedStudentIds((current) => current.filter((id) => id !== studentId));
  }

  function toggleStudentSelection(studentId) {
    setSelectedStudentIds((current) =>
      current.includes(studentId) ? current.filter((id) => id !== studentId) : [...current, studentId]
    );
  }

  function toggleAllStudents() {
    setSelectedStudentIds(allSelected ? [] : classStudents.map((student) => student.id));
  }

  function removeSelectedStudents() {
    if (!selectedStudentIds.length) return;
    const selected = new Set(selectedStudentIds);
    setStudents((current) => current.filter((student) => !selected.has(student.id)));
    setSelectedStudentIds([]);
  }

  function setSelectedAttendance(absent) {
    if (!selectedStudentIds.length) return;
    const selected = new Set(selectedStudentIds);
    setStudents((current) =>
      current.map((student) => (selected.has(student.id) ? { ...student, absent } : student))
    );
  }

  function adjust(studentId, field, delta) {
    setStudents((current) =>
      current.map((student) =>
        student.id === studentId ? { ...student, [field]: Math.max(0, student[field] + delta) } : student
      )
    );
  }

  function resetClassScores() {
    if (!selectedClass) return;
    setStudents((current) =>
      current.map((student) => (student.classId === selectedClass.id ? { ...student, classScore: 0 } : student))
    );
  }

  function resetTotalScores() {
    if (!selectedClass) return;
    setStudents((current) =>
      current.map((student) => (student.classId === selectedClass.id ? { ...student, totalScore: 0 } : student))
    );
  }

  return (
    <div className="settings-section class-manager">
      <div className="class-list-pane">
        <h3>班级设置</h3>
        <p>点击班级后，在右侧管理该班学生名单和积分。</p>
        <div className="choice-grid class-choice-grid">
          {classes.map((item) => (
            <div
              key={item.id}
              className={`class-choice-row ${item.id === currentClassId ? 'active' : ''}`}
            >
              <button className="class-select-button" onClick={() => setCurrentClassId(item.id)}>
                <strong>{item.name}</strong>
                <span>{students.filter((student) => student.classId === item.id).length} 人</span>
              </button>
              <div className="class-row-actions">
                <button className="class-delete-button" onClick={() => removeClass(item.id)}>
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="inline-form class-create-form">
          <input value={className} onChange={(event) => setClassName(event.target.value)} placeholder="输入班级名称" />
          <button onClick={addClass}>
            <Plus size={16} />
            新增班级
          </button>
        </div>
      </div>

      <div className="class-detail-pane">
        <div className="class-detail-head">
          <div>
            <h3>{selectedClass?.name ?? '未选择班级'}</h3>
            <p>学生名单与积分详情</p>
          </div>
          <div className="reset-actions">
            <button className="reset-button" onClick={resetClassScores}>
              <RotateCcw size={16} />
              重置课堂积分
            </button>
            <button className="reset-button reset-total-button" onClick={resetTotalScores}>
              <RotateCcw size={16} />
              重置长期积分
            </button>
          </div>
        </div>
        <div className="inline-form">
          <input value={studentName} onChange={(event) => setStudentName(event.target.value)} placeholder="学生姓名" />
          <input value={studentNumber} onChange={(event) => setStudentNumber(event.target.value)} placeholder="学号" />
          <button onClick={addStudent}>
            <Plus size={16} />
            添加学生
          </button>
        </div>
        <div className="student-bulk-bar">
          <label className="select-all-control">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAllStudents}
              disabled={!classStudents.length}
            />
            <span>全选</span>
          </label>
          <span className="bulk-count">已选择 {selectedCount} 人</span>
          <button onClick={() => setSelectedAttendance(true)} disabled={!selectedCount}>
            批量设为缺勤
          </button>
          <button onClick={() => setSelectedAttendance(false)} disabled={!selectedCount}>
            恢复到课
          </button>
          <button className="bulk-danger" onClick={removeSelectedStudents} disabled={!selectedCount}>
            批量删除
          </button>
        </div>
        <div className="settings-table class-student-table">
          {classStudents.map((student) => (
            <div className={`score-edit-row class-score-row ${student.absent ? 'is-absent' : ''}`} key={student.id}>
              <strong className="student-identity">
                <input
                  type="checkbox"
                  checked={selectedStudentIds.includes(student.id)}
                  onChange={() => toggleStudentSelection(student.id)}
                  aria-label={`选择 ${student.name}`}
                />
                <span className="student-number">{student.number}.</span>
                <span className="student-name">{student.name}</span>
              </strong>
              <span className={`attendance-badge ${student.absent ? 'is-absent' : ''}`}>
                {student.absent ? '缺勤' : '到课'}
              </span>
              <div className="score-adjust">
                <span>课堂 {student.classScore}</span>
                <button onClick={() => adjust(student.id, 'classScore', -1)}>-1</button>
                <button onClick={() => adjust(student.id, 'classScore', 1)}>+1</button>
              </div>
              <div className="score-adjust">
                <span>长期 {student.totalScore}</span>
                <button onClick={() => adjust(student.id, 'totalScore', -1)}>-1</button>
                <button onClick={() => adjust(student.id, 'totalScore', 1)}>+1</button>
              </div>
              <button className="icon-danger" onClick={() => removeStudent(student.id)}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuestionSettings({ questions, setQuestions, questionBanks, setQuestionBanks, currentBank, setCurrentBank }) {
  const [newBankName, setNewBankName] = useState('');
  const [selectedBank, setSelectedBank] = useState(questionBanks[0] ?? '');
  const [concept, setConcept] = useState('');
  const [expandedQuestionId, setExpandedQuestionId] = useState(null);
  const bankQuestions = questions.filter((question) => question.unit === selectedBank);

  useEffect(() => {
    if (!questionBanks.length) {
      setSelectedBank('');
      return;
    }
    if (!selectedBank || !questionBanks.includes(selectedBank)) {
      setSelectedBank(questionBanks[0]);
    }
  }, [questionBanks, selectedBank]);

  function addBank() {
    const trimmed = newBankName.trim();
    if (!trimmed || trimmed === '全部题库' || questionBanks.includes(trimmed)) return;
    setQuestionBanks((current) => [...current, trimmed]);
    setSelectedBank(trimmed);
    setNewBankName('');
    setExpandedQuestionId(null);
  }

  function removeBank(bank) {
    setQuestionBanks((current) => current.filter((item) => item !== bank));
    setQuestions((current) => current.filter((question) => question.unit !== bank));
    if (currentBank === bank) setCurrentBank('全部题库');
    setExpandedQuestionId(null);
  }

  function selectBank(bank) {
    setSelectedBank(bank);
    setExpandedQuestionId(null);
    setConcept('');
  }

  function addQuestion() {
    const trimmed = concept.trim();
    if (!trimmed || !selectedBank) return;
    const newQuestion = {
      id: Date.now(),
      concept: trimmed,
      unit: selectedBank,
      prompt: `以下哪些描述属于“${trimmed}”？`,
      explanation: '这是手动新增的题目，请在这里补充正确答案依据和解析。',
      options: [
        { text: `${trimmed} 的正确关键词 1`, correct: true },
        { text: `${trimmed} 的正确关键词 2`, correct: true },
        { text: '错误干扰项 1', correct: false },
        { text: '错误干扰项 2', correct: false },
        { text: '正确关键词 3', correct: true },
        { text: '错误干扰项 3', correct: false },
        { text: '正确关键词 4', correct: true },
        { text: '错误干扰项 4', correct: false }
      ]
    };
    setQuestions((current) => [...current, newQuestion]);
    setExpandedQuestionId(newQuestion.id);
    setConcept('');
  }

  function removeQuestion(questionId) {
    setQuestions((current) => current.filter((question) => question.id !== questionId));
    setExpandedQuestionId((current) => (current === questionId ? null : current));
  }

  function updateQuestion(questionId, patch) {
    setQuestions((current) =>
      current.map((question) => (question.id === questionId ? { ...question, ...patch } : question))
    );
  }

  function updateQuestionOption(questionId, optionIndex, patch) {
    setQuestions((current) =>
      current.map((question) =>
        question.id === questionId
          ? {
              ...question,
              options: question.options.map((option, index) =>
                index === optionIndex ? { ...option, ...patch } : option
              )
            }
          : question
      )
    );
  }

  function addQuestionOption(questionId) {
    setQuestions((current) =>
      current.map((question) =>
        question.id === questionId
          ? {
              ...question,
              options: [...question.options, { text: '新选项', correct: false }]
            }
          : question
      )
    );
  }

  function removeQuestionOption(questionId, optionIndex) {
    setQuestions((current) =>
      current.map((question) =>
        question.id === questionId
          ? {
              ...question,
              options: question.options.filter((_, index) => index !== optionIndex)
            }
          : question
      )
    );
  }

  return (
    <div className="settings-section question-manager">
      <h3>题库设置</h3>
      <p>先管理题库；点击一个题库后，进入该题库的题目列表，再新增、编辑或删除题目。</p>

      <div className="bank-management">
        <div className="bank-management-head">
          <strong>题库管理</strong>
          <span>{questionBanks.length} 个题库</span>
        </div>
        <div className="bank-list">
          {questionBanks.map((bank) => {
            const count = questions.filter((question) => question.unit === bank).length;
            return (
              <div className={`bank-item ${bank === selectedBank ? 'active' : ''}`} key={bank}>
                <button className="bank-select-button" onClick={() => selectBank(bank)}>
                  <strong>{bank}</strong>
                  <span>{count} 道题</span>
                </button>
                <button className="icon-danger" onClick={() => removeBank(bank)} aria-label={`删除题库 ${bank}`}>
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
        <div className="inline-form bank-create-form">
          <input value={newBankName} onChange={(event) => setNewBankName(event.target.value)} placeholder="新增题库名称" />
          <button onClick={addBank}>
            <Plus size={16} />
            新增题库
          </button>
        </div>
      </div>

      {selectedBank ? (
        <div className="bank-question-pane">
          <div className="bank-question-head">
            <div>
              <h4>{selectedBank}</h4>
              <p>当前题库共 {bankQuestions.length} 道题。</p>
            </div>
          </div>
          <div className="inline-form question-create-form">
            <input value={concept} onChange={(event) => setConcept(event.target.value)} placeholder="题目名称，如：经文歌" />
            <button onClick={addQuestion}>
              <Plus size={16} />
              新增题目
            </button>
          </div>
          <div className="settings-table question-settings-list">
            {bankQuestions.map((question) => (
              <div className="question-edit-card" key={question.id}>
                <div className="settings-row question-summary-row">
                  <span>{question.unit}</span>
                  <strong>{question.concept}</strong>
                  <em>
                    {question.options.filter((option) => option.correct).length} 个正确项 / {question.options.length} 个选项
                  </em>
                  <button
                    className="question-edit-toggle"
                    onClick={() => setExpandedQuestionId((current) => (current === question.id ? null : question.id))}
                  >
                    {expandedQuestionId === question.id ? '收起' : '编辑'}
                  </button>
                  <button className="icon-danger" onClick={() => removeQuestion(question.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>

                {expandedQuestionId === question.id && (
                  <div className="question-editor">
                    <div className="question-editor-grid">
                      <label>
                        <span>题目名称</span>
                        <input
                          value={question.concept}
                          onChange={(event) => updateQuestion(question.id, { concept: event.target.value })}
                        />
                      </label>
                      <label>
                        <span>所属题库</span>
                        <select
                          value={question.unit}
                          onChange={(event) => {
                            updateQuestion(question.id, { unit: event.target.value });
                            setSelectedBank(event.target.value);
                          }}
                        >
                          {questionBanks.map((bank) => (
                            <option key={bank} value={bank}>{bank}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label className="wide-editor-field">
                      <span>题干</span>
                      <textarea
                        value={question.prompt}
                        onChange={(event) => updateQuestion(question.id, { prompt: event.target.value })}
                      />
                    </label>
                    <label className="wide-editor-field">
                      <span>答案解析</span>
                      <textarea
                        value={question.explanation}
                        onChange={(event) => updateQuestion(question.id, { explanation: event.target.value })}
                      />
                    </label>

                    <div className="option-editor-head">
                      <strong>选项管理</strong>
                      <span>勾选“正确答案”后，学生必须选中这些选项才算答对。</span>
                    </div>
                    <div className="option-editor-list">
                      {question.options.map((option, index) => (
                        <div className="option-edit-row" key={`${question.id}-${index}`}>
                          <span className="option-edit-index">{index + 1}</span>
                          <label className="option-correct-control">
                            <input
                              type="checkbox"
                              checked={option.correct}
                              onChange={(event) =>
                                updateQuestionOption(question.id, index, { correct: event.target.checked })
                              }
                            />
                            正确答案
                          </label>
                          <input
                            value={option.text}
                            onChange={(event) => updateQuestionOption(question.id, index, { text: event.target.value })}
                          />
                          <button
                            className="icon-danger"
                            onClick={() => removeQuestionOption(question.id, index)}
                            disabled={question.options.length <= 1}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="question-editor-footer">
                      <button className="question-add-option" onClick={() => addQuestionOption(question.id)}>
                        <Plus size={16} />
                        新增选项
                      </button>
                      {!question.options.some((option) => option.correct) && (
                        <span className="question-warning">请至少设置一个正确答案。</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {!bankQuestions.length && (
              <div className="empty-bank-tip">这个题库还没有题目，可以先新增一道题。</div>
            )}
          </div>
        </div>
      ) : (
        <div className="empty-bank-tip">请先新增一个题库。</div>
      )}
    </div>
  );
}

function PunishmentSettings({ punishments, setPunishments }) {
  const [text, setText] = useState('');

  function addPunishment() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setPunishments((current) => [...current, trimmed]);
    setText('');
  }

  function removePunishment(index) {
    setPunishments((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <div className="settings-section">
      <h3>挑战盲盒设置</h3>
      <p>答错并看完解析后，点击“挑战盲盒”会从这里随机抽取一个课堂互动任务。</p>
      <div className="inline-form">
        <input value={text} onChange={(event) => setText(event.target.value)} placeholder="新增挑战任务" />
        <button onClick={addPunishment}>
          <Plus size={16} />
          添加
        </button>
      </div>
      <div className="settings-table">
        {punishments.map((item, index) => (
          <div className="settings-row" key={`${item}-${index}`}>
            <span>{index + 1}</span>
            <strong>{item}</strong>
            <em>盲盒任务</em>
            <button className="icon-danger" onClick={() => removePunishment(index)}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
